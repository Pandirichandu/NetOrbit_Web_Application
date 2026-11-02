import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentProcessorService } from './payment-processor.service';
import { PaymentTransaction, PaymentStatus, PaymentGateway } from './entities/payment-transaction.entity';
import { Invoice, InvoiceStatus } from '../billing/entities/invoice.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { AuditService } from '../../core/audit/audit.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPaymentRepo = {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((tx) => Promise.resolve({ id: 'tx-123', ...tx })),
    createQueryBuilder: vi.fn().mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([
        [
          {
            id: 'tx-123',
            gateway: PaymentGateway.RAZORPAY,
            amount: 100,
            status: PaymentStatus.SUCCESS,
            tenantId: 'tenant-1',
          },
        ],
        1,
      ]),
    }),
  };

  const mockInvoiceRepo = {
    findOne: vi.fn(),
    save: vi.fn().mockImplementation((inv) => Promise.resolve(inv)),
  };

  const mockSubscriberRepo = {
    findOne: vi.fn(),
    save: vi.fn().mockImplementation((sub) => Promise.resolve(sub)),
  };

  const mockPaymentProcessor = {
    createGatewayOrder: vi.fn().mockResolvedValue({
      gatewayOrderId: 'order_test_123',
      amount: 100,
      currency: 'USD',
      gateway: PaymentGateway.RAZORPAY,
    }),
    verifyGatewaySignature: vi.fn().mockReturnValue(true),
  };

  const mockAuditService = {
    log: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(PaymentTransaction), useValue: mockPaymentRepo },
        { provide: getRepositoryToken(Invoice), useValue: mockInvoiceRepo },
        { provide: getRepositoryToken(Subscriber), useValue: mockSubscriberRepo },
        { provide: PaymentProcessorService, useValue: mockPaymentProcessor },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should create payment order and pending transaction', async () => {
    mockInvoiceRepo.findOne.mockResolvedValue({
      id: 'inv-1',
      tenantId: 'tenant-1',
      status: InvoiceStatus.PENDING,
      currency: 'USD',
      invoiceNumber: 'INV-001',
    });

    const result = await service.createPayment(
      {
        invoiceId: 'inv-1',
        amount: 100,
        gateway: PaymentGateway.RAZORPAY,
      },
      'tenant-1',
      'user-1',
    );

    expect(result.transaction).toBeDefined();
    expect(result.checkoutDetails.gatewayOrderId).toBe('order_test_123');
    expect(mockPaymentProcessor.createGatewayOrder).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalled();
  });

  it('should verify payment signature and reconcile invoice balance', async () => {
    mockPaymentRepo.findOne.mockResolvedValue({
      id: 'tx-123',
      tenantId: 'tenant-1',
      invoiceId: 'inv-1',
      gateway: PaymentGateway.RAZORPAY,
      gatewayOrderId: 'order_test_123',
      amount: 100,
      status: PaymentStatus.PENDING,
    });

    mockInvoiceRepo.findOne.mockResolvedValue({
      id: 'inv-1',
      tenantId: 'tenant-1',
      totalAmount: 100,
      paidAmount: 0,
      balanceAmount: 100,
      status: InvoiceStatus.PENDING,
    });

    const result = await service.verifyPayment(
      {
        transactionId: 'tx-123',
        gatewayTransactionId: 'pay_test_999',
        gatewaySignature: 'sig_mock',
      },
      'tenant-1',
      'user-1',
    );

    expect(result.success).toBe(true);
    expect(result.transaction.status).toBe(PaymentStatus.SUCCESS);
    expect(mockInvoiceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: InvoiceStatus.PAID,
        paidAmount: 100,
        balanceAmount: 0,
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalled();
  });
});
