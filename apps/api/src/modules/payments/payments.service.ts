import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction, PaymentStatus } from './entities/payment-transaction.entity';
import { Invoice, InvoiceStatus } from '../billing/entities/invoice.entity';
import { Subscriber, SubscriberStatus } from '../subscribers/entities/subscriber.entity';
import { CreatePaymentDto, VerifyPaymentDto, PaymentQueryDto } from './dto/payments.dto';
import { PaymentProcessorService } from './payment-processor.service';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { AuditService } from '../../core/audit/audit.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentRepo: Repository<PaymentTransaction>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
    private readonly paymentProcessor: PaymentProcessorService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    query: PaymentQueryDto,
    tenantId: string | null,
    isSuperAdmin: boolean,
    subscriberIdFilter?: string,
  ): Promise<PaginatedResult<PaymentTransaction>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.paymentRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.invoice', 'invoice')
      .leftJoinAndSelect('tx.subscriber', 'subscriber');

    if (!isSuperAdmin || tenantId) {
      if (!tenantId) {
        throw new ForbiddenException('Tenant context is required for payment operations');
      }
      qb.andWhere('tx.tenantId = :tenantId', { tenantId });
    }

    if (subscriberIdFilter) {
      qb.andWhere('tx.subscriberId = :subscriberIdFilter', { subscriberIdFilter });
    } else if (query.subscriberId) {
      qb.andWhere('tx.subscriberId = :subId', { subId: query.subscriberId });
    }

    if (query.invoiceId) {
      qb.andWhere('tx.invoiceId = :invId', { invId: query.invoiceId });
    }

    if (query.gateway) {
      qb.andWhere('tx.gateway = :gateway', { gateway: query.gateway });
    }

    if (query.status) {
      qb.andWhere('tx.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(tx.gatewayTransactionId ILIKE :search OR tx.gatewayOrderId ILIKE :search OR invoice.invoiceNumber ILIKE :search OR subscriber.username ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('tx.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return paginate(data, total, query);
  }

  async findOne(id: string, tenantId: string | null, isSuperAdmin: boolean): Promise<PaymentTransaction> {
    const tx = await this.paymentRepo.findOne({
      where: { id },
      relations: ['invoice', 'subscriber', 'tenant'],
    });

    if (!tx) {
      throw new NotFoundException(`Payment transaction '${id}' not found`);
    }

    if (!isSuperAdmin && tx.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant payment transaction access denied');
    }

    return tx;
  }

  async createPayment(
    dto: CreatePaymentDto,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<{ transaction: PaymentTransaction; checkoutDetails: any }> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required to initiate payment');
    }

    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.paymentRepo.findOne({
        where: { tenantId, idempotencyKey: dto.idempotencyKey },
        relations: ['invoice', 'subscriber'],
      });
      if (existing) {
        return {
          transaction: existing,
          checkoutDetails: {
            gatewayOrderId: existing.gatewayOrderId,
            amount: existing.amount,
            currency: existing.currency,
            gateway: existing.gateway,
            alreadyExists: true,
          },
        };
      }
    }

    let invoice: Invoice | null = null;
    let subscriberId = dto.subscriberId || null;

    if (dto.invoiceId) {
      invoice = await this.invoiceRepo.findOne({
        where: { id: dto.invoiceId, tenantId },
        relations: ['subscriber'],
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found within this tenant');
      }
      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException('Invoice is already fully paid');
      }
      if (!subscriberId && invoice.subscriberId) {
        subscriberId = invoice.subscriberId;
      }
    }

    const amount = Number(dto.amount);
    const currency = dto.currency || (invoice ? invoice.currency : 'USD');
    const receiptId = invoice ? invoice.invoiceNumber : `REC-${Date.now()}`;

    // Create Gateway Order via approved provider adapter
    const orderResult = await this.paymentProcessor.createGatewayOrder(
      dto.gateway,
      amount,
      currency,
      receiptId,
    );

    const transaction = this.paymentRepo.create({
      tenantId,
      invoiceId: invoice ? invoice.id : null,
      subscriberId,
      gateway: dto.gateway,
      gatewayOrderId: orderResult.gatewayOrderId,
      amount,
      currency,
      status: PaymentStatus.PENDING,
      paymentMethod: dto.paymentMethod || null,
      idempotencyKey: dto.idempotencyKey || null,
      notes: dto.notes || null,
      gatewayResponse: orderResult.metadata || {},
    });

    const savedTx = await this.paymentRepo.save(transaction);

    this.auditService.log({
      action: 'payment:create',
      resourceType: 'payments',
      resourceId: savedTx.id,
      tenantId,
      userId,
      userEmail,
      details: {
        gateway: savedTx.gateway,
        amount: savedTx.amount,
        gatewayOrderId: savedTx.gatewayOrderId,
        invoiceId: savedTx.invoiceId,
      },
    });

    return {
      transaction: savedTx,
      checkoutDetails: orderResult,
    };
  }

  async verifyPayment(
    dto: VerifyPaymentDto,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<{ success: boolean; transaction: PaymentTransaction }> {
    const tx = await this.paymentRepo.findOne({
      where: { id: dto.transactionId, tenantId },
      relations: ['invoice'],
    });

    if (!tx) {
      throw new NotFoundException(`Payment transaction '${dto.transactionId}' not found`);
    }

    // Idempotent: already success
    if (tx.status === PaymentStatus.SUCCESS) {
      return { success: true, transaction: tx };
    }

    // Verify cryptographic signature
    const isValid = this.paymentProcessor.verifyGatewaySignature({
      gateway: tx.gateway,
      gatewayOrderId: dto.gatewayOrderId || tx.gatewayOrderId || undefined,
      gatewayTransactionId: dto.gatewayTransactionId,
      gatewaySignature: dto.gatewaySignature,
      gatewayResponse: dto.gatewayResponse,
      amount: Number(tx.amount),
    });

    if (!isValid) {
      tx.status = PaymentStatus.FAILED;
      tx.gatewayResponse = {
        ...(tx.gatewayResponse || {}),
        verificationError: 'Signature mismatch or gateway rejection',
      };
      await this.paymentRepo.save(tx);

      this.auditService.log({
        action: 'payment:failed',
        resourceType: 'payments',
        resourceId: tx.id,
        tenantId,
        userId,
        userEmail,
        details: {
          gateway: tx.gateway,
          reason: 'Verification failed',
        },
      });

      return { success: false, transaction: tx };
    }

    // Update Transaction to SUCCESS
    tx.status = PaymentStatus.SUCCESS;
    if (dto.gatewayTransactionId) {
      tx.gatewayTransactionId = dto.gatewayTransactionId;
    }
    if (dto.gatewayResponse) {
      tx.gatewayResponse = { ...(tx.gatewayResponse || {}), ...dto.gatewayResponse };
    }
    const updatedTx = await this.paymentRepo.save(tx);

    // Reconcile Invoice if linked
    if (tx.invoiceId) {
      const invoice = await this.invoiceRepo.findOne({
        where: { id: tx.invoiceId, tenantId },
      });
      if (invoice) {
        invoice.paidAmount = Number((Number(invoice.paidAmount) + Number(tx.amount)).toFixed(2));
        invoice.balanceAmount = Math.max(0, Number((Number(invoice.totalAmount) - Number(invoice.paidAmount)).toFixed(2)));

        if (invoice.balanceAmount <= 0) {
          invoice.status = InvoiceStatus.PAID;
          invoice.paidAt = new Date();
        } else {
          invoice.status = InvoiceStatus.PARTIALLY_PAID;
        }

        await this.invoiceRepo.save(invoice);

        // If subscriber associated, check if they need renewal/activation
        if (invoice.subscriberId) {
          const sub = await this.subscriberRepo.findOne({
            where: { id: invoice.subscriberId, tenantId },
          });
          if (sub && sub.status === SubscriberStatus.SUSPENDED) {
            sub.status = SubscriberStatus.ACTIVE;
            await this.subscriberRepo.save(sub);
          }
        }
      }
    }

    this.auditService.log({
      action: 'payment:success',
      resourceType: 'payments',
      resourceId: updatedTx.id,
      tenantId,
      userId,
      userEmail,
      details: {
        gateway: updatedTx.gateway,
        amount: updatedTx.amount,
        gatewayTransactionId: updatedTx.gatewayTransactionId,
        invoiceId: updatedTx.invoiceId,
      },
    });

    return { success: true, transaction: updatedTx };
  }
}
