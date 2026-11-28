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

  it('9. CREDIT NOTES: Should create credit note and return paginated credit note listing', async () => {
    let createdNote: any = null;
    const mockInvoice = {
      id: 'inv-cn-1',
      studentId: 'stu-cn-1',
      status: InvoiceStatus.ISSUED,
    };

    const mockPrisma = {
      profileEmployee: { findUnique: async () => mockEmployeeProfile },
      invoice: {
        findUnique: async () => mockInvoice,
      },
      $transaction: async (cb: any) => {
        const tx = {
          creditNote: {
            count: async () => 3,
            create: async ({ data }: any) => {
              createdNote = {
                ...data,
                id: 'cn-uuid-1',
                createdAt: new Date(),
                invoice: { invoiceNumber: 'INV-2026-00001' },
                student: { fullName: 'Student Test', studentCode: 'SEG-26-0001' },
              };
              return createdNote;
            },
          },
        };
        return cb(tx);
      },
      creditNote: {
        count: async () => 1,
        findMany: async () => [
          {
            id: 'cn-uuid-1',
            creditNoteNumber: 'CN-2026-00004',
            invoiceId: 'inv-cn-1',
            studentId: 'stu-cn-1',
            amount: 5000,
            currency: 'INR',
            reason: 'Scholarship adjustment',
            status: 'ISSUED',
            issuedAt: new Date(),
            createdAt: new Date(),
            invoice: { id: 'inv-cn-1', invoiceNumber: 'INV-2026-00001', totalAmount: 50000, status: 'ISSUED' },
            student: { id: 'stu-cn-1', fullName: 'Student Test', studentCode: 'SEG-26-0001', email: 'stu@test.com' },
            issuedBy: { user: { fullName: 'Finance Officer' } },
          },
        ],
      },
    };

    const service = new BillingService(mockPrisma as any, mockAuditService as any);

    const result = await service.createCreditNote(
      'inv-cn-1',
      { amount: 5000, reason: 'Scholarship adjustment' },
      financeActor,
    );

    assert.equal(result.creditNoteNumber, `CN-${new Date().getFullYear()}-00004`);
    assert.equal(result.amount, 5000);

    const list = await service.getCreditNotes({ page: 1, limit: 10 });
    assert.equal(list.meta.total, 1);
    assert.equal(list.data[0].creditNoteNumber, 'CN-2026-00004');
  });

  it('10. DEBIT NOTES: Should reject debit note on draft invoice and succeed on finalized invoice', async () => {
    let createdDebitNote: any = null;
    const mockDraftInvoice: { id: string; studentId: string; status: InvoiceStatus } = {
      id: 'inv-draft-1',
      studentId: 'stu-dn-1',
      status: InvoiceStatus.DRAFT,
    };
    const mockFinalizedInvoice: { id: string; studentId: string; status: InvoiceStatus } = {
      id: 'inv-final-1',
      studentId: 'stu-dn-1',
      status: InvoiceStatus.ISSUED,
    };

    let currentInvoice = mockDraftInvoice;

    const mockPrisma = {
      profileEmployee: { findUnique: async () => mockEmployeeProfile },
      invoice: {
        findUnique: async () => currentInvoice,
      },
      $transaction: async (cb: any) => {
        const tx = {
          debitNote: {
            count: async () => 0,
            create: async ({ data }: any) => {
              createdDebitNote = {
                ...data,
                id: 'dn-uuid-1',
                createdAt: new Date(),
                invoice: { invoiceNumber: 'INV-2026-00002' },
                student: { fullName: 'Student Test 2', studentCode: 'SEG-26-0002' },
              };
              return createdDebitNote;
            },
          },
        };
        return cb(tx);
      },
      debitNote: {
        count: async () => 1,
        findMany: async () => [
          {
            id: 'dn-uuid-1',
            debitNoteNumber: 'DN-2026-00001',
            invoiceId: 'inv-final-1',
            studentId: 'stu-dn-1',
            amount: 2500,
            currency: 'INR',
            reason: 'Lab fee surcharge',
            status: 'ISSUED',
            issuedAt: new Date(),
            createdAt: new Date(),
            invoice: { id: 'inv-final-1', invoiceNumber: 'INV-2026-00002', totalAmount: 40000, status: 'ISSUED' },
            student: { id: 'stu-dn-1', fullName: 'Student Test 2', studentCode: 'SEG-26-0002', email: 'stu2@test.com' },
            issuedBy: { user: { fullName: 'Finance Officer' } },
          },
        ],
      },
    };

    const service = new BillingService(mockPrisma as any, mockAuditService as any);

    // Draft rejection
    await assert.rejects(
      async () => {
        await service.createDebitNote(
          'inv-draft-1',
          { amount: 2500, reason: 'Lab fee surcharge' },
          financeActor,
        );
      },
      /Debit notes can only be issued against finalized, active invoices/,
    );

    // Switch to active invoice
    currentInvoice = mockFinalizedInvoice;
    const res = await service.createDebitNote(
      'inv-final-1',
      { amount: 2500, reason: 'Lab fee surcharge' },
      financeActor,
    );

    assert.equal(res.debitNoteNumber, `DN-${new Date().getFullYear()}-00001`);
    assert.equal(res.amount, 2500);

    const list = await service.getDebitNotes({ page: 1, limit: 10 });
    assert.equal(list.meta.total, 1);
    assert.equal(list.data[0].debitNoteNumber, 'DN-2026-00001');
  });

  it('11. REFUNDS LISTING: Should return paginated refunds with mapped payment and invoice relationships', async () => {
    const mockPrisma = {
      refund: {
        count: async () => 1,
        findMany: async () => [
          {
            id: 'ref-uuid-1',
            refundNumber: 'REF-2026-00001',
            paymentId: 'pay-1',
            invoiceId: 'inv-1',
            amount: 5000,
            currency: 'INR',
            reason: 'Partial tuition refund',
            status: 'PROCESSED',
            idempotencyKey: 'idemp-ref-test',
            processedAt: new Date(),
            createdAt: new Date(),
            invoice: {
              id: 'inv-1',
              invoiceNumber: 'INV-2026-00001',
              totalAmount: 50000,
              paidAmount: 25000,
              status: 'PARTIALLY_PAID',
              student: { fullName: 'Student Test', studentCode: 'SEG-26-0001' },
            },
            payment: {
              id: 'pay-1',
              paymentNumber: 'PAY-2026-00001',
              amount: 25000,
              method: 'UPI',
              status: 'PARTIALLY_REFUNDED',
            },
            processedBy: {
              user: { fullName: 'Finance Officer' },
            },
          },
        ],
      },
    };

    const service = new BillingService(mockPrisma as any, mockAuditService as any);
    const result = await service.getRefunds({ page: 1, limit: 10 });

    assert.equal(result.meta.total, 1);
    assert.equal(result.data[0].refundNumber, 'REF-2026-00001');
    assert.equal(result.data[0].amount, 5000);
    assert.equal(result.data[0].invoice?.invoiceNumber, 'INV-2026-00001');
    assert.equal(result.data[0].payment?.paymentNumber, 'PAY-2026-00001');
  });

  it('12. SEQUENTIAL PAYMENTS: Multiple sequential partial payments accumulate and transition invoice to PAID', async () => {
    let currentPaid = 0;
    let currentStatus: any = InvoiceStatus.ISSUED;

    const mockInvoice: any = {
      id: 'inv-seq-1',
      invoiceNumber: 'INV-2026-00099',
      studentId: 'stu-1',
      totalAmount: 10000,
      currency: 'INR',
      status: InvoiceStatus.ISSUED,
      isFinalized: true,
      paidAmount: 0,
      student: { id: 'stu-1', email: 'stu@test.com' },
      payments: [],
    };

    const mockPrisma: any = {
      profileEmployee: {
        findUnique: async () => ({
          id: 'emp-fin-1',
          userId: financeActor.userId,
          user: { id: financeActor.userId, fullName: financeActor.fullName, email: financeActor.email, role: financeActor.role },
        }),
      },
      invoice: {
        findUnique: async () => ({
          ...mockInvoice,
          paidAmount: currentPaid,
          status: currentStatus,
        }),
      },
      payment: {
        findUnique: async () => null,
      },
      $transaction: async (cb: any) => {
        const tx = {
          payment: {
            findUnique: async () => null,
            count: async () => 1,
            create: async ({ data }: any) => {
              currentPaid += Number(data.amount);
              if (currentPaid >= 10000) {
                currentStatus = InvoiceStatus.PAID;
              } else {
                currentStatus = InvoiceStatus.PARTIALLY_PAID;
              }
              return {
                id: `pay-${Date.now()}`,
                paymentNumber: 'PAY-2026-00001',
                ...data,
                invoice: {
                  id: 'inv-seq-1',
                  invoiceNumber: 'INV-2026-00099',
                  totalAmount: 10000,
                  paidAmount: currentPaid,
                  status: currentStatus,
                },
                student: { id: 'stu-1', studentCode: 'SEG-26-0001', fullName: 'Test', email: 'stu@test.com' },
                createdAt: new Date(),
              };
            },
          },
          invoice: {
            update: async ({ data }: any) => {
              currentStatus = data.status;
              return { ...mockInvoice, paidAmount: currentPaid, status: currentStatus };
            },
          },
        };
        return cb(tx);
      },
    };

    const service = new BillingService(mockPrisma as any, mockAuditService as any);

    // Payment 1: 3000 (Partial)
    const p1 = await service.recordPayment(
      'inv-seq-1',
      { amount: 3000, method: PaymentMethod.UPI, idempotencyKey: 'idemp-seq-1' },
      financeActor,
      { ipAddress: '127.0.0.1' },
    );
    assert.equal(currentPaid, 3000);
    assert.equal(currentStatus, InvoiceStatus.PARTIALLY_PAID);

    // Payment 2: 4000 (Partial)
    const p2 = await service.recordPayment(
      'inv-seq-1',
      { amount: 4000, method: PaymentMethod.BANK_TRANSFER, idempotencyKey: 'idemp-seq-2' },
      financeActor,
      { ipAddress: '127.0.0.1' },
    );
    assert.equal(currentPaid, 7000);
    assert.equal(currentStatus, InvoiceStatus.PARTIALLY_PAID);

    // Payment 3: 3000 (Reaches exactly 10,000 -> PAID)
    const p3 = await service.recordPayment(
      'inv-seq-1',
      { amount: 3000, method: PaymentMethod.CREDIT_CARD, idempotencyKey: 'idemp-seq-3' },
      financeActor,
      { ipAddress: '127.0.0.1' },
    );
    assert.equal(currentPaid, 10000);
    assert.equal(currentStatus, InvoiceStatus.PAID);
  });
});
