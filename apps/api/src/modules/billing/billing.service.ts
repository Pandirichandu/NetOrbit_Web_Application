import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { Subscriber, SubscriberStatus } from '../subscribers/entities/subscriber.entity';
import { Package, BillingCycle } from '../packages/entities/package.entity';
import { PaymentTransaction, PaymentStatus, PaymentGateway } from '../payments/entities/payment-transaction.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { CreateInvoiceDto, RechargeDto, InvoiceQueryDto } from './dto/billing.dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { AuditService } from '../../core/audit/audit.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
    @InjectRepository(Package)
    private readonly packageRepo: Repository<Package>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentRepo: Repository<PaymentTransaction>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    query: InvoiceQueryDto,
    tenantId: string | null,
    isSuperAdmin: boolean,
    subscriberIdFilter?: string,
  ): Promise<PaginatedResult<Invoice>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.invoiceRepo
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.subscriber', 'subscriber');

    if (!isSuperAdmin || tenantId) {
      if (!tenantId) {
        throw new ForbiddenException('Tenant context is required for invoice operations');
      }
      qb.andWhere('invoice.tenantId = :tenantId', { tenantId });
    }

    if (subscriberIdFilter) {
      qb.andWhere('invoice.subscriberId = :subscriberIdFilter', { subscriberIdFilter });
    } else if (query.subscriberId) {
      qb.andWhere('invoice.subscriberId = :subId', { subId: query.subscriberId });
    }

    if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(invoice.invoiceNumber ILIKE :search OR subscriber.username ILIKE :search OR subscriber.firstName ILIKE :search OR subscriber.lastName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('invoice.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return paginate(data, total, query);
  }

  async findOne(id: string, tenantId: string | null, isSuperAdmin: boolean): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id },
      relations: ['subscriber', 'tenant'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${id}' not found`);
    }

    if (!isSuperAdmin && invoice.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant invoice access denied');
    }

    return invoice;
  }

  async create(
    dto: CreateInvoiceDto,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<Invoice> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required to generate invoice');
    }

    // Verify subscriber if provided
    let subscriber: Subscriber | null = null;
    if (dto.subscriberId) {
      subscriber = await this.subscriberRepo.findOne({
        where: { id: dto.subscriberId, tenantId },
      });
      if (!subscriber) {
        throw new NotFoundException('Subscriber not found within this tenant');
      }
    }

    // Calculate amounts
    const subtotal = dto.items.reduce((acc, item) => acc + (Number(item.amount) || Number(item.unitPrice) * item.quantity), 0);
    const taxRate = dto.taxRate ?? 18.0;
    const discountAmount = Number(dto.discountAmount || 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
    const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));
    const balanceAmount = totalAmount;

    // Generate unique sequential invoice number
    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    const invoice = this.invoiceRepo.create({
      tenantId,
      subscriberId: dto.subscriberId || null,
      invoiceNumber,
      billingCycle: dto.billingCycle || BillingCycle.MONTHLY,
      status: InvoiceStatus.PENDING,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      totalAmount,
      paidAmount: 0.00,
      balanceAmount,
      currency: dto.currency || 'USD',
      issueDate: new Date(),
      dueDate: new Date(dto.dueDate),
      items: dto.items,
      notes: dto.notes || null,
    });

    const saved = await this.invoiceRepo.save(invoice);

    this.auditService.log({
      action: 'invoice:create',
      resourceType: 'invoices',
      resourceId: saved.id,
      tenantId,
      userId,
      userEmail,
      details: {
        invoiceNumber: saved.invoiceNumber,
        totalAmount: saved.totalAmount,
        subscriberId: saved.subscriberId,
      },
    });

    return saved;
  }

  async voidInvoice(
    id: string,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot void a paid invoice');
    }

    invoice.status = InvoiceStatus.VOID;
    const updated = await this.invoiceRepo.save(invoice);

    this.auditService.log({
      action: 'invoice:void',
      resourceType: 'invoices',
      resourceId: updated.id,
      tenantId,
      userId,
      userEmail,
      details: {
        invoiceNumber: updated.invoiceNumber,
      },
    });

    return updated;
  }

  async recharge(
    dto: RechargeDto,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<{ subscriber: Subscriber; invoice: Invoice; transaction: PaymentTransaction }> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required for recharge');
    }

    // Idempotency check if key provided
    if (dto.idempotencyKey) {
      const existingTx = await this.paymentRepo.findOne({
        where: { tenantId, idempotencyKey: dto.idempotencyKey },
        relations: ['invoice', 'subscriber'],
      });
      if (existingTx && existingTx.invoice && existingTx.subscriber) {
        return {
          subscriber: existingTx.subscriber,
          invoice: existingTx.invoice,
          transaction: existingTx,
        };
      }
    }

    const subscriber = await this.subscriberRepo.findOne({
      where: { id: dto.subscriberId, tenantId },
    });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber with ID '${dto.subscriberId}' not found`);
    }

    const pkg = await this.packageRepo.findOne({
      where: { id: dto.packageId, tenantId },
    });
    if (!pkg) {
      throw new NotFoundException(`Package with ID '${dto.packageId}' not found`);
    }

    const planPrice = Number(pkg.price);
    const taxRate = 18.0;
    const taxAmount = Number(((planPrice * taxRate) / 100).toFixed(2));
    const totalAmount = Number((planPrice + taxAmount).toFixed(2));

    // Calculate new expiration date
    const now = new Date();
    const currentExpiry = subscriber.expiryDate ? new Date(subscriber.expiryDate) : null;
    const baseDate = (currentExpiry && currentExpiry > now && subscriber.status === SubscriberStatus.ACTIVE)
      ? currentExpiry
      : now;

    let daysToAdd = 30;
    if (pkg.billingCycle === BillingCycle.DAILY) daysToAdd = 1;
    else if (pkg.billingCycle === BillingCycle.QUARTERLY) daysToAdd = 90;
    else if (pkg.billingCycle === BillingCycle.SEMI_ANNUAL) daysToAdd = 180;
    else if (pkg.billingCycle === BillingCycle.ANNUAL) daysToAdd = 365;

    const newExpiryDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    // 1. Create PAID Invoice
    const invoiceNumber = await this.generateInvoiceNumber(tenantId);
    const invoice = this.invoiceRepo.create({
      tenantId,
      subscriberId: subscriber.id,
      invoiceNumber,
      billingCycle: pkg.billingCycle,
      status: InvoiceStatus.PAID,
      subtotal: planPrice,
      taxRate,
      taxAmount,
      discountAmount: 0.00,
      totalAmount,
      paidAmount: totalAmount,
      balanceAmount: 0.00,
      currency: pkg.currency || 'USD',
      issueDate: now,
      dueDate: now,
      paidAt: now,
      items: [
        {
          description: `Plan Recharge: ${pkg.name} (${daysToAdd} days)`,
          quantity: 1,
          unitPrice: planPrice,
          amount: planPrice,
        },
      ],
      notes: dto.notes || `Recharge via ${dto.paymentGateway || PaymentGateway.MANUAL}`,
    });
    const savedInvoice = await this.invoiceRepo.save(invoice);

    // 2. Create Payment Transaction
    const transaction = this.paymentRepo.create({
      tenantId,
      invoiceId: savedInvoice.id,
      subscriberId: subscriber.id,
      gateway: dto.paymentGateway || PaymentGateway.MANUAL,
      amount: totalAmount,
      currency: pkg.currency || 'USD',
      status: PaymentStatus.SUCCESS,
      paymentMethod: dto.paymentMethod || 'cash',
      idempotencyKey: dto.idempotencyKey || null,
      gatewayTransactionId: `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      gatewayResponse: {
        rechargeSuccess: true,
        package: pkg.name,
        appliedDays: daysToAdd,
      },
      notes: dto.notes || 'Recharge automated transaction',
    });
    const savedTransaction = await this.paymentRepo.save(transaction);

    // 3. Update Subscriber
    subscriber.packageId = pkg.id;
    subscriber.status = SubscriberStatus.ACTIVE;
    subscriber.expiryDate = newExpiryDate;
    const updatedSubscriber = await this.subscriberRepo.save(subscriber);

    // 4. Audit Log
    this.auditService.log({
      action: 'subscriber:recharge',
      resourceType: 'subscribers',
      resourceId: subscriber.id,
      tenantId,
      userId,
      userEmail,
      details: {
        packageId: pkg.id,
        packageName: pkg.name,
        invoiceNumber: savedInvoice.invoiceNumber,
        transactionId: savedTransaction.id,
        newExpiryDate: newExpiryDate.toISOString(),
      },
    });

    return {
      subscriber: updatedSubscriber,
      invoice: savedInvoice,
      transaction: savedTransaction,
    };
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.invoiceRepo.count({
      where: { tenantId },
    });
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const prefix = tenant ? tenant.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'ISP') : 'INV';
    const seq = String(count + 1).padStart(5, '0');
    return `${prefix}-INV-${year}-${seq}`;
  }
}
