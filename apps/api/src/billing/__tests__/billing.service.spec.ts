import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { BillingService } from '../billing.service';
import { AuthenticatedUser } from '../../auth/decorators/auth.decorators';
import { InvoiceStatus, PaymentMethod, PaymentStatus, RefundStatus } from '@seg/database';

describe('BillingService Financial & Invariant Unit Tests', () => {
  const financeActor: AuthenticatedUser = {
    userId: 'usr-fin-1',
    email: 'finance@segacademy.com',
    fullName: 'Finance Manager',
    role: { id: 'role-fin', code: 'FINANCE_MANAGER', name: 'Finance Manager' },
    roles: ['FINANCE_MANAGER'],
    permissions: ['invoices:read', 'invoices:create', 'invoices:update', 'payments:read', 'payments:create', 'refunds:create'],
  };

  const mockEmployeeProfile = {
    id: 'emp-fin-profile',
    userId: 'usr-fin-1',
    employeeCode: 'FIN-001',
    jobTitle: 'Finance Officer',
    user: {
      id: 'usr-fin-1',
      fullName: 'Finance Manager',
      email: 'finance@segacademy.com',
      role: { code: 'FINANCE_MANAGER', name: 'Finance Manager' },
    },
  };

  const mockAuditService = {
    log: async () => {},
  };

  it('1. should throw BadRequestException if student does not exist', async () => {
    const mockPrisma = {
      profileStudent: { findUnique: async () => null },
    };

    const service = new BillingService(mockPrisma as any, mockAuditService as any);

    await assert.rejects(
      async () => {
        await service.createInvoice(
          {
            studentId: 'missing-student',
            issueDate: '2026-11-26',
            dueDate: '2026-12-10',
            subtotal: 1000,
            totalAmount: 1000,
            items: [{ description: 'Test', quantity: 1, unitPrice: 1000, amount: 1000 }],
          },
          financeActor,
        );
      },
      (err: any) => err instanceof BadRequestException,
    );
  });

  it('2. should reject invoice with monetary calculation mismatch', async () => {
    const mockPrisma = {
      profileStudent: { findUnique: async () => ({ id: 'stu-1' }) },
    };

    const service = new BillingService(mockPrisma as any, mockAuditService as any);

    await assert.rejects(
      async () => {
        // Line item quantity 2 * 1000 = 2000, but amount passed as 1500
        await service.createInvoice(
          {
            studentId: 'stu-1',
            issueDate: '2026-11-26',
            dueDate: '2026-12-10',
            subtotal: 2000,
            totalAmount: 2000,
            items: [{ description: 'Course A', quantity: 2, unitPrice: 1000, amount: 1500 }],
          },
          financeActor,
        );
      },
      /Line item 'Course A' amount mismatch/,
    );
  });

  it('3. should create invoice atomically and generate collision-resistant serial code', async () => {
    let createdInvoiceData: any = null;
    const mockPrisma = {
      profileStudent: { findUnique: async () => ({ id: 'stu-1', fullName: 'Aarav' }) },
      $transaction: async (cb: any) => {
        const tx = {
          invoice: {
            count: async () => 41,
            findUnique: async () => null,
            create: async ({ data }: any) => {
              createdInvoiceData = data;
              return {
                id: 'inv-uuid-1',
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
                student: { id: 'stu-1', fullName: 'Aarav', studentCode: 'SEG-26-0001' },
                items: data.items.create,
                payments: [],
              };
            },
          },
        };
        return cb(tx);
      },
    };

    const service = new BillingService(mockPrisma as any, mockAuditService as any);

    const result = await service.createInvoice(
      {
        studentId: 'stu-1',
        issueDate: '2026-11-26',
        dueDate: '2026-12-10',
        subtotal: 50000,
        discountAmount: 5000,
        taxAmount: 8100,
        totalAmount: 53100,
        items: [{ description: 'AI Program', quantity: 1, unitPrice: 50000, amount: 50000 }],
      },
      financeActor,
    );

    assert.equal(result.invoiceNumber.startsWith('INV-2026-'), true);
    assert.equal(result.totalAmount, 53100);
    assert.equal(result.status, InvoiceStatus.DRAFT);
  });

  it('4. should finalize draft invoice and lock from modification', async () => {
    const mockInvoice = {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-00001',
      isFinalized: false,
      status: InvoiceStatus.DRAFT,
      totalAmount: 50000,
      paidAmount: 0,
      issueDate: new Date(),
      dueDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrisma = {
      invoice: {
        findUnique: async () => mockInvoice,
        update: async ({ data }: any) => ({
          ...mockInvoice,
          ...data,
          student: null,
          items: [],
          payments: [],
        }),
      },
    };

    const service = new BillingService(mockPrisma as any, mockAuditService as any);

    const result = await service.finalizeInvoice('inv-1', financeActor);
    assert.equal(result.isFinalized, true);
    assert.equal(result.status, InvoiceStatus.ISSUED);
  });

  it('5. should reject cancellation of invoice if paid amount > 0', async () => {
    const mockInvoice = {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-00001',
      isFinalized: true,
      status: InvoiceStatus.PARTIALLY_PAID,
      totalAmount: 50000,
      paidAmount: 25000, // partially paid
    };

    const mockPrisma = {
      invoice: {
        findUnique: async () => mockInvoice,
      },
    };

    const service = new BillingService(mockPrisma as any, mockAuditService as any);

    await assert.rejects(
      async () => {
        await service.cancelInvoice('inv-1', financeActor);
      },
      /Cannot cancel invoice.*with paid amount/,
    );
  });

  it('6. PAYMENT IDEMPOTENCY: Should return existing payment on safe retry without duplicate charge', async () => {
    const mockInvoice = {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-00001',
      isFinalized: true,
      status: InvoiceStatus.ISSUED,
      studentId: 'stu-1',
      totalAmount: 50000,
      paidAmount: 0,
    };

    const service = new BillingService({} as any, mockAuditService as any);
    const expectedHash = service.computePayloadHash({
      invoiceId: 'inv-1',
      amount: 25000,
      method: PaymentMethod.UPI,
      studentId: 'stu-1',
    });

    const mockExistingPayment = {
      id: 'pay-uuid-existing',
      paymentNumber: 'PAY-2026-00001',
      invoiceId: 'inv-1',
      studentId: 'stu-1',
      amount: 25000,
      method: PaymentMethod.UPI,
      status: PaymentStatus.CONFIRMED,
      idempotencyKey: 'idemp-key-1',
      idempotencyPayloadHash: expectedHash,
      createdAt: new Date(),
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2026-00001', totalAmount: 50000, paidAmount: 25000, status: InvoiceStatus.PARTIALLY_PAID },
      student: { id: 'stu-1', studentCode: 'SEG-26-0001', fullName: 'Aarav', email: 'aarav@example.com' },
    };

    const mockPrisma = {
      profileEmployee: { findUnique: async () => mockEmployeeProfile },
      invoice: { findUnique: async () => mockInvoice },
      payment: {
        findUnique: async ({ where }: any) => {
          if (where.idempotencyKey === 'idemp-key-1') return mockExistingPayment;
          return null;
        },
      },
    };

    const billingServiceWithPrisma = new BillingService(mockPrisma as any, mockAuditService as any);

    const result = await billingServiceWithPrisma.recordPayment(
      'inv-1',
      {
        amount: 25000,
        method: PaymentMethod.UPI,
        idempotencyKey: 'idemp-key-1',
      },
      financeActor,
    );

    assert.equal(result.id, 'pay-uuid-existing');
    assert.equal(result.paymentNumber, 'PAY-2026-00001');
  });

  it('7. PAYMENT IDEMPOTENCY: Should throw ConflictException if idempotency key is reused with altered payload', async () => {
    const mockInvoice = {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-00001',
      isFinalized: true,
      status: InvoiceStatus.ISSUED,
      studentId: 'stu-1',
    };

    const mockExistingPayment = {
      id: 'pay-uuid-existing',
      idempotencyKey: 'idemp-key-1',
      idempotencyPayloadHash: 'original-hash-123456',
    };

    const mockPrisma = {
      profileEmployee: { findUnique: async () => mockEmployeeProfile },
      invoice: { findUnique: async () => mockInvoice },
      payment: {
        findUnique: async () => mockExistingPayment,
      },
    };

    const service = new BillingService(mockPrisma as any, mockAuditService as any);

    await assert.rejects(
      async () => {
        await service.recordPayment(
          'inv-1',
          {
            amount: 99999, // Altered amount with same key
            method: PaymentMethod.UPI,
            idempotencyKey: 'idemp-key-1',
          },
          financeActor,
        );
      },
      (err: any) => err instanceof ConflictException,
    );
  });

  it('8. REFUNDS: Should reject refund request exceeding refundable payment balance', async () => {
    const mockPayment = {
      id: 'pay-1',
      invoiceId: 'inv-1',
      amount: 25000,
      status: PaymentStatus.CONFIRMED,
      refunds: [
        { id: 'ref-1', amount: 20000, status: RefundStatus.PROCESSED }, // 20k already refunded out of 25k
      ],
    };

    const mockPrisma = {
      profileEmployee: { findUnique: async () => mockEmployeeProfile },
      payment: {
        findUnique: async () => mockPayment,
      },
    };

    const service = new BillingService(mockPrisma as any, mockAuditService as any);

    await assert.rejects(
      async () => {
        // Remaining balance is only 5,000, but requesting 10,000
        await service.createRefund(
          'inv-1',
          'pay-1',
          { amount: 10000, reason: 'Drop out' },
          financeActor,
        );
      },
      /exceeds available refundable balance/,
    );
  });
});
