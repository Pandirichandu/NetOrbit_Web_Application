import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { Subscriber, SubscriberStatus } from '../subscribers/entities/subscriber.entity';
import { Package, BillingCycle } from '../packages/entities/package.entity';
import { PaymentTransaction, PaymentStatus, PaymentGateway } from '../payments/entities/payment-transaction.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { AuditService } from '../../core/audit/audit.service';


describe('BillingService', () => {
  let service: BillingService;

  const mockInvoiceRepo = {
    findOne: vi.fn(),
    count: vi.fn().mockResolvedValue(4),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((inv) => Promise.resolve({ id: 'inv-123', ...inv })),
    createQueryBuilder: vi.fn().mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([
        [
          {
            id: 'inv-123',
            invoiceNumber: 'ISP-INV-2026-00005',
            totalAmount: 118.0,
            status: InvoiceStatus.PENDING,
            tenantId: 'tenant-1',
          },
        ],
        1,
      ]),
    }),
  };

  const mockSubscriberRepo = {
    findOne: vi.fn(),
    save: vi.fn().mockImplementation((sub) => Promise.resolve(sub)),
  };

  const mockPackageRepo = {
    findOne: vi.fn(),
  };

  const mockPaymentRepo = {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((tx) => Promise.resolve({ id: 'tx-123', ...tx })),
  };

  const mockTenantRepo = {
    findOne: vi.fn().mockResolvedValue({ id: 'tenant-1', name: 'ISP Alpha' }),
  };

  const mockAuditService = {
    log: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: getRepositoryToken(Invoice), useValue: mockInvoiceRepo },
        { provide: getRepositoryToken(Subscriber), useValue: mockSubscriberRepo },
        { provide: getRepositoryToken(Package), useValue: mockPackageRepo },
        { provide: getRepositoryToken(PaymentTransaction), useValue: mockPaymentRepo },
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should create an invoice with calculated taxes and sequential number', async () => {
    const invoice = await service.create(
      {
        billingCycle: BillingCycle.MONTHLY,
        dueDate: '2026-11-01',
        items: [
          { description: 'Broadband 100M', quantity: 1, unitPrice: 100.0, amount: 100.0 },
        ],
        taxRate: 18.0,
        discountAmount: 0.0,
      },
      'tenant-1',
      'user-1',
      'admin@isp.com',
    );

    expect(invoice).toBeDefined();
    expect(invoice.subtotal).toBe(100.0);
    expect(invoice.taxAmount).toBe(18.0);
    expect(invoice.totalAmount).toBe(118.0);
    expect(invoice.invoiceNumber).toBe('ISP-INV-2026-00005');
    expect(mockAuditService.log).toHaveBeenCalled();
  });

  it('should recharge subscriber and extend expiry date', async () => {
    mockSubscriberRepo.findOne.mockResolvedValue({
      id: 'sub-1',
      tenantId: 'tenant-1',
      status: SubscriberStatus.EXPIRED,
      expiryDate: new Date('2026-01-01'),
    });

    mockPackageRepo.findOne.mockResolvedValue({
      id: 'pkg-1',
      tenantId: 'tenant-1',
      name: 'Turbo Fiber',
      price: 50.0,
      billingCycle: BillingCycle.MONTHLY,
    });

    const result = await service.recharge(
      {
        subscriberId: 'sub-1',
        packageId: 'pkg-1',
        paymentGateway: PaymentGateway.MANUAL,
      },
      'tenant-1',
      'user-1',
    );

    expect(result.subscriber.status).toBe(SubscriberStatus.ACTIVE);
    expect(result.invoice.status).toBe(InvoiceStatus.PAID);
    expect(result.transaction.status).toBe(PaymentStatus.SUCCESS);
    expect(mockAuditService.log).toHaveBeenCalled();
  });

  it('should void an unpaid invoice', async () => {
    mockInvoiceRepo.findOne.mockResolvedValue({
      id: 'inv-123',
      tenantId: 'tenant-1',
      status: InvoiceStatus.PENDING,
      invoiceNumber: 'INV-001',
    });

    const result = await service.voidInvoice('inv-123', 'tenant-1');
    expect(result.status).toBe(InvoiceStatus.VOID);
    expect(mockAuditService.log).toHaveBeenCalled();
  });
});
