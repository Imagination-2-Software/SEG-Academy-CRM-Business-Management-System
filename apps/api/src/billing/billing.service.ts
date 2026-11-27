import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/decorators/auth.decorators';
import {
  CreateInvoiceDto,
  QueryInvoicesDto,
  RecordPaymentDto,
  QueryPaymentsDto,
  CreateCreditNoteDto,
  CreateRefundDto,
} from './dto';
import {
  InvoiceStatus,
  PaymentStatus,
  CreditNoteStatus,
  RefundStatus,
  Prisma,
} from '@seg/database';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics?: any;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Resolves the ProfileEmployee entity for the authenticated financial actor.
   * Ensures financial transactions are recorded only by valid employees.
   */
  async resolveEmployeeProfile(actor: AuthenticatedUser) {
    const profile = await this.prisma.profileEmployee.findUnique({
      where: { userId: actor.userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!profile) {
      throw new ForbiddenException(
        'Financial Security: Authenticated user is not linked to an active employee profile.',
      );
    }
    return profile;
  }

  /**
   * Hashes a payment request payload canonical representation with SHA-256
   * to ensure cryptographic tamper resistance upon retries.
   */
  computePayloadHash(data: Record<string, any>): string {
    const canonical = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  // ==========================================
  // INVOICES
  // ==========================================

  async getInvoices(query: QueryInvoicesDto): Promise<PaginatedResult<any>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};

    if (query.studentId) {
      where.studentId = query.studentId;
    }

    if (query.status && query.status !== 'ALL') {
      if (query.status === 'OVERDUE') {
        where.status = { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED] };
        where.dueDate = { lt: new Date() };
      } else if (Object.values(InvoiceStatus).includes(query.status as InvoiceStatus)) {
        where.status = query.status as InvoiceStatus;
      }
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
        { student: { fullName: { contains: s, mode: 'insensitive' } } },
        { student: { email: { contains: s, mode: 'insensitive' } } },
        { student: { studentCode: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, records, allInvoicesForMetrics] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              studentCode: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              addressLine1: true,
              city: true,
              state: true,
              postalCode: true,
            },
          },
          items: true,
          payments: {
            orderBy: { createdAt: 'desc' },
          },
          creditNotes: true,
          debitNotes: true,
          enrolment: {
            include: {
              batch: {
                include: {
                  course: true,
                },
              },
            },
          },
        },
      }),
      // Query aggregation for summary metrics
      this.prisma.invoice.findMany({
        select: {
          totalAmount: true,
          paidAmount: true,
          status: true,
          dueDate: true,
        },
      }),
    ]);

    // Calculate billing metrics
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let paidInvoicesCount = 0;
    let pendingInvoicesCount = 0;
    const now = new Date();

    for (const inv of allInvoicesForMetrics) {
      if (inv.status === InvoiceStatus.CANCELLED) continue;
      const totalAmt = Number(inv.totalAmount) || 0;
      const paidAmt = Number(inv.paidAmount) || 0;
      const balance = Math.max(0, totalAmt - paidAmt);

      totalInvoiced += totalAmt;
      totalCollected += paidAmt;
      totalOutstanding += balance;

      if (inv.status === InvoiceStatus.PAID) {
        paidInvoicesCount++;
      } else {
        pendingInvoicesCount++;
      }

      if (balance > 0 && inv.dueDate < now) {
        overdueAmount += balance;
        overdueCount++;
      }
    }

    const data = records.map((inv) => this.mapInvoiceToResponse(inv));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      metrics: {
        totalInvoiced,
        totalCollected,
        totalOutstanding,
        overdueAmount,
        overdueCount,
        paidInvoicesCount,
        pendingInvoicesCount,
      },
    };
  }

  async getInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        OR: [{ id }, { invoiceNumber: id }],
      },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
        items: {
          include: {
            course: true,
          },
        },
        payments: {
          include: {
            recordedBy: {
              include: {
                user: { select: { fullName: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        creditNotes: true,
        debitNotes: true,
        enrolment: {
          include: {
            batch: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Tax Invoice '${id}' not found.`);
    }

    return this.mapInvoiceToResponse(invoice);
  }

  async createInvoice(
    dto: CreateInvoiceDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    // 1. Verify student exists
    const student = await this.prisma.profileStudent.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new BadRequestException(`Student '${dto.studentId}' not found.`);
    }

    // 2. Validate enrolment if provided
    if (dto.enrolmentId) {
      const enrolment = await this.prisma.enrolment.findUnique({
        where: { id: dto.enrolmentId },
      });
      if (!enrolment || enrolment.studentId !== dto.studentId) {
        throw new BadRequestException(`Enrolment '${dto.enrolmentId}' does not belong to student '${dto.studentId}'.`);
      }
    }

    // 3. Monetary calculation integrity checks
    let calculatedSubtotal = 0;
    for (const item of dto.items) {
      const itemExpected = Number((item.quantity * item.unitPrice).toFixed(2));
      if (Math.abs(itemExpected - item.amount) > 0.05) {
        throw new BadRequestException(
          `Line item '${item.description}' amount mismatch. Expected: ${itemExpected}, provided: ${item.amount}`,
        );
      }
      calculatedSubtotal += item.amount;
    }
    calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));

    if (Math.abs(calculatedSubtotal - dto.subtotal) > 0.05) {
      throw new BadRequestException(
        `Invoice subtotal calculation mismatch. Sum of line items: ${calculatedSubtotal}, provided: ${dto.subtotal}`,
      );
    }

    const calculatedTax = Number(dto.taxAmount || 0);
    const calculatedDiscount = Number(dto.discountAmount || 0);
    const expectedTotal = Number(((calculatedSubtotal - calculatedDiscount) + calculatedTax).toFixed(2));

    if (Math.abs(expectedTotal - dto.totalAmount) > 0.05) {
      throw new BadRequestException(
        `Grand total mismatch. Expected: ${expectedTotal}, provided: ${dto.totalAmount}`,
      );
    }

    // 4. Generate next invoice sequence safely inside an atomic transaction
    const year = new Date().getFullYear();
    const isFinalized = Boolean(dto.isFinalized);
    const status = isFinalized ? InvoiceStatus.ISSUED : InvoiceStatus.DRAFT;

    const result = await this.prisma.$transaction(async (tx) => {
      // Find count of invoices created this year to establish monotonic serial
      const count = await tx.invoice.count({
        where: {
          invoiceNumber: {
            startsWith: `INV-${year}-`,
          },
        },
      });

      const serial = (count + 1).toString().padStart(5, '0');
      let invoiceNumber = `INV-${year}-${serial}`;

      // Guarantee collision resistance
      let collision = await tx.invoice.findUnique({ where: { invoiceNumber } });
      if (collision) {
        invoiceNumber = `INV-${year}-${(count + Math.floor(Math.random() * 1000) + 1).toString().padStart(5, '0')}`;
      }

      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          studentId: dto.studentId,
          enrolmentId: dto.enrolmentId || null,
          issueDate: new Date(dto.issueDate),
          dueDate: new Date(dto.dueDate),
          subtotal: dto.subtotal,
          taxAmount: dto.taxAmount || 0,
          discountAmount: dto.discountAmount || 0,
          totalAmount: dto.totalAmount,
          paidAmount: 0,
          currency: 'INR',
          status,
          isFinalized,
          notes: dto.notes?.trim() || null,
          items: {
            create: dto.items.map((item) => ({
              description: item.description.trim(),
              courseId: item.courseId || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
            })),
          },
        },
        include: {
          student: true,
          items: true,
          payments: true,
        },
      });

      return created;
    });

    await this.auditService.log({
      actorUserId: actor.userId,
      action: 'INVOICE_CREATE',
      resource: 'invoices',
      resourceId: result.id,
      payload: {
        invoiceNumber: result.invoiceNumber,
        totalAmount: result.totalAmount,
        studentId: result.studentId,
        isFinalized: result.isFinalized,
      },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return this.mapInvoiceToResponse(result);
  }

  async finalizeInvoice(
    id: string,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const existing = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Invoice '${id}' not found.`);
    }

    if (existing.isFinalized) {
      throw new ConflictException(`Invoice '${existing.invoiceNumber}' is already finalized.`);
    }

    if (existing.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cancelled invoices cannot be finalized.');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        isFinalized: true,
        status: InvoiceStatus.ISSUED,
      },
      include: {
        student: true,
        items: true,
        payments: true,
      },
    });

    await this.auditService.log({
      actorUserId: actor.userId,
      action: 'INVOICE_FINALIZE',
      resource: 'invoices',
      resourceId: id,
      payload: { invoiceNumber: updated.invoiceNumber },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return this.mapInvoiceToResponse(updated);
  }

  async cancelInvoice(
    id: string,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const existing = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Invoice '${id}' not found.`);
    }

    if (Number(existing.paidAmount) > 0) {
      throw new BadRequestException(
        `Financial Security: Cannot cancel invoice '${existing.invoiceNumber}' with paid amount of ₹${existing.paidAmount}. Issue credit note or refund instead.`,
      );
    }

    if (existing.status === InvoiceStatus.CANCELLED) {
      throw new ConflictException(`Invoice '${existing.invoiceNumber}' is already cancelled.`);
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELLED,
      },
      include: {
        student: true,
        items: true,
        payments: true,
      },
    });

    await this.auditService.log({
      actorUserId: actor.userId,
      action: 'INVOICE_CANCEL',
      resource: 'invoices',
      resourceId: id,
      payload: { invoiceNumber: updated.invoiceNumber },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return this.mapInvoiceToResponse(updated);
  }

  // ==========================================
  // PAYMENTS & IDEMPOTENCY
  // ==========================================

  async recordPayment(
    invoiceId: string,
    dto: RecordPaymentDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const recorder = await this.resolveEmployeeProfile(actor);

    // 1. Verify invoice exists
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice '${invoiceId}' not found.`);
    }

    if (!invoice.isFinalized || invoice.status === InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Financial Security: Payments can only be recorded against finalized/issued invoices.',
      );
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Financial Security: Cannot record payments against cancelled invoices.');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Financial Security: Invoice is already fully settled.');
    }

    // 2. Cryptographic Idempotency verification
    const idempotencyKey = dto.idempotencyKey || `idemp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const payloadHash = this.computePayloadHash({
      invoiceId,
      amount: dto.amount,
      method: dto.method,
      studentId: invoice.studentId,
    });

    const existingIdemp = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
      include: {
        invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, status: true } },
        student: { select: { id: true, studentCode: true, fullName: true, email: true } },
      },
    });

    if (existingIdemp) {
      // Check payload hash for tampering detection
      if (existingIdemp.idempotencyPayloadHash && existingIdemp.idempotencyPayloadHash !== payloadHash) {
        throw new ConflictException(
          'Financial Security Alert: Idempotency key reuse with mismatched payment payload detected.',
        );
      }
      // Safe idempotent retry: return existing record
      return this.mapPaymentToResponse(existingIdemp);
    }

    // 3. Generate sequential payment number safely inside transaction
    const year = new Date().getFullYear();
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const transactionReference = dto.transactionReference?.trim() || `TXN/${dto.method}/${Date.now()}`;

    // Execute atomic payment recording
    // NOTE: In PostgreSQL, trg_payment_reconciliation will automatically calculate and update
    // invoice.paidAmount and invoice.status!
    const result = await this.prisma.$transaction(async (tx) => {
      const count = await tx.payment.count({
        where: {
          paymentNumber: {
            startsWith: `PAY-${year}-`,
          },
        },
      });

      const serial = (count + 1).toString().padStart(5, '0');
      let paymentNumber = `PAY-${year}-${serial}`;

      let collision = await tx.payment.findUnique({ where: { paymentNumber } });
      if (collision) {
        paymentNumber = `PAY-${year}-${(count + Math.floor(Math.random() * 1000) + 1).toString().padStart(5, '0')}`;
      }

      const createdPayment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId,
          studentId: invoice.studentId,
          amount: dto.amount,
          currency: 'INR',
          method: dto.method,
          status: PaymentStatus.CONFIRMED,
          transactionReference,
          idempotencyKey,
          idempotencyPayloadHash: payloadHash,
          gatewayProvider: dto.gatewayProvider?.trim() || dto.method,
          paidAt,
          recordedById: recorder.id,
          notes: dto.notes?.trim() || null,
        },
        include: {
          invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, status: true } },
          student: { select: { id: true, studentCode: true, fullName: true, email: true } },
        },
      });

      return createdPayment;
    });

    // Query refreshed invoice state reconciled by database trigger
    const reconciledInvoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { paidAmount: true, status: true },
    });

    if (reconciledInvoice) {
      result.invoice.paidAmount = reconciledInvoice.paidAmount;
      result.invoice.status = reconciledInvoice.status;
    }

    await this.auditService.log({
      actorUserId: actor.userId,
      action: 'PAYMENT_RECORD',
      resource: 'payments',
      resourceId: result.id,
      payload: {
        paymentNumber: result.paymentNumber,
        invoiceId,
        amount: result.amount,
        method: result.method,
        idempotencyKey,
      },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return this.mapPaymentToResponse(result);
  }

  async getPayments(query: QueryPaymentsDto): Promise<PaginatedResult<any>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};

    if (query.invoiceId) {
      where.invoiceId = query.invoiceId;
    }

    if (query.method && query.method !== 'ALL') {
      where.method = query.method as any;
    }

    if (query.status && query.status !== 'ALL') {
      where.status = query.status as any;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { paymentNumber: { contains: s, mode: 'insensitive' } },
        { transactionReference: { contains: s, mode: 'insensitive' } },
        { invoice: { invoiceNumber: { contains: s, mode: 'insensitive' } } },
        { student: { fullName: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, records] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              paidAmount: true,
              status: true,
            },
          },
          student: {
            select: {
              id: true,
              studentCode: true,
              fullName: true,
              email: true,
            },
          },
          recordedBy: {
            include: {
              user: { select: { fullName: true } },
            },
          },
        },
      }),
    ]);

    const data = records.map((p) => this.mapPaymentToResponse(p));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPaymentById(id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [{ id }, { paymentNumber: id }],
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
            issueDate: true,
            dueDate: true,
          },
        },
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            addressLine1: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
        recordedBy: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment transaction '${id}' not found.`);
    }

    return this.mapPaymentToResponse(payment);
  }

  // ==========================================
  // CREDIT NOTES
  // ==========================================

  async createCreditNote(
    invoiceId: string,
    dto: CreateCreditNoteDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const issuer = await this.resolveEmployeeProfile(actor);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice '${invoiceId}' not found.`);
    }

    if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.DRAFT) {
      throw new BadRequestException('Credit notes can only be issued against finalized, active invoices.');
    }

    const year = new Date().getFullYear();

    const note = await this.prisma.$transaction(async (tx) => {
      const count = await tx.creditNote.count({
        where: {
          creditNoteNumber: {
            startsWith: `CN-${year}-`,
          },
        },
      });

      const serial = (count + 1).toString().padStart(5, '0');
      const creditNoteNumber = `CN-${year}-${serial}`;

      return tx.creditNote.create({
        data: {
          creditNoteNumber,
          invoiceId,
          studentId: invoice.studentId,
          amount: dto.amount,
          currency: 'INR',
          reason: dto.reason.trim(),
          status: CreditNoteStatus.ISSUED,
          issuedById: issuer.id,
          issuedAt: new Date(),
          notes: dto.notes?.trim() || null,
        },
        include: {
          invoice: { select: { invoiceNumber: true } },
          student: { select: { fullName: true, studentCode: true } },
        },
      });
    });

    await this.auditService.log({
      actorUserId: actor.userId,
      action: 'CREDIT_NOTE_ISSUE',
      resource: 'credit_notes',
      resourceId: note.id,
      payload: { creditNoteNumber: note.creditNoteNumber, amount: note.amount },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return {
      id: note.id,
      creditNoteNumber: note.creditNoteNumber,
      invoiceId: note.invoiceId,
      studentId: note.studentId,
      amount: Number(note.amount),
      currency: note.currency,
      reason: note.reason,
      status: note.status,
      issuedAt: note.issuedAt?.toISOString(),
      notes: note.notes,
      createdAt: note.createdAt.toISOString(),
      invoice: note.invoice,
      student: note.student,
    };
  }

  // ==========================================
  // REFUNDS
  // ==========================================

  async createRefund(
    invoiceId: string,
    paymentId: string,
    dto: CreateRefundDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const processor = await this.resolveEmployeeProfile(actor);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { refunds: true },
    });

    if (!payment || payment.invoiceId !== invoiceId) {
      throw new NotFoundException(`Payment '${paymentId}' not found on invoice '${invoiceId}'.`);
    }

    if (payment.status !== PaymentStatus.CONFIRMED && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new BadRequestException('Refunds can only be requested against CONFIRMED or PARTIALLY_REFUNDED payments.');
    }

    const totalRefunded = payment.refunds
      .filter((r) => r.status === RefundStatus.PROCESSED || r.status === RefundStatus.APPROVED || r.status === RefundStatus.REQUESTED)
      .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const available = Number(payment.amount) - totalRefunded;
    if (dto.amount > available) {
      throw new BadRequestException(
        `Refund amount (₹${dto.amount}) exceeds available refundable balance (₹${available.toFixed(2)}).`,
      );
    }

    const idempotencyKey = dto.idempotencyKey || `idemp-ref-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const payloadHash = this.computePayloadHash({
      paymentId,
      invoiceId,
      amount: dto.amount,
      reason: dto.reason,
    });

    const year = new Date().getFullYear();

    // In PostgreSQL, trg_refund_reconciliation will automatically calculate and update
    // payment.status and invoice.paidAmount!
    const refund = await this.prisma.$transaction(async (tx) => {
      const count = await tx.refund.count({
        where: {
          refundNumber: {
            startsWith: `REF-${year}-`,
          },
        },
      });

      const serial = (count + 1).toString().padStart(5, '0');
      const refundNumber = `REF-${year}-${serial}`;

      return tx.refund.create({
        data: {
          refundNumber,
          paymentId,
          invoiceId,
          amount: dto.amount,
          currency: 'INR',
          reason: dto.reason.trim(),
          status: RefundStatus.PROCESSED,
          idempotencyKey,
          idempotencyPayloadHash: payloadHash,
          processedById: processor.id,
          processedAt: new Date(),
        },
      });
    });

    await this.auditService.log({
      actorUserId: actor.userId,
      action: 'REFUND_PROCESS',
      resource: 'refunds',
      resourceId: refund.id,
      payload: { refundNumber: refund.refundNumber, amount: refund.amount },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return {
      id: refund.id,
      refundNumber: refund.refundNumber,
      paymentId: refund.paymentId,
      invoiceId: refund.invoiceId,
      amount: Number(refund.amount),
      currency: refund.currency,
      reason: refund.reason,
      status: refund.status,
      processedAt: refund.processedAt?.toISOString(),
      createdAt: refund.createdAt.toISOString(),
    };
  }

  // ==========================================
  // SERIALIZATION MAPPERS
  // ==========================================

  private mapInvoiceToResponse(inv: any) {
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      studentId: inv.studentId,
      enrolmentId: inv.enrolmentId,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      subtotal: Number(inv.subtotal),
      taxAmount: Number(inv.taxAmount),
      discountAmount: Number(inv.discountAmount),
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      currency: inv.currency,
      status: inv.status,
      version: inv.version,
      isFinalized: inv.isFinalized,
      notes: inv.notes,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
      student: inv.student
        ? {
            id: inv.student.id,
            studentCode: inv.student.studentCode,
            fullName: inv.student.fullName,
            email: inv.student.email,
            phoneNumber: inv.student.phoneNumber,
            address: [inv.student.addressLine1, inv.student.city, inv.student.state, inv.student.postalCode]
              .filter(Boolean)
              .join(', '),
          }
        : null,
      batch: inv.enrolment?.batch
        ? {
            id: inv.enrolment.batch.id,
            name: inv.enrolment.batch.name,
            code: inv.enrolment.batch.code,
            course: inv.enrolment.batch.course
              ? {
                  id: inv.enrolment.batch.course.id,
                  name: inv.enrolment.batch.course.name,
                  code: inv.enrolment.batch.course.code,
                }
              : undefined,
          }
        : undefined,
      items: (inv.items || []).map((it: any) => ({
        id: it.id,
        courseId: it.courseId,
        description: it.description,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        amount: Number(it.amount),
      })),
      payments: (inv.payments || []).map((p: any) => this.mapPaymentToResponse(p)),
      creditNotes: (inv.creditNotes || []).map((cn: any) => ({
        id: cn.id,
        creditNoteNumber: cn.creditNoteNumber,
        amount: Number(cn.amount),
        currency: cn.currency,
        reason: cn.reason,
        status: cn.status,
      })),
    };
  }

  private mapPaymentToResponse(p: any) {
    return {
      id: p.id,
      paymentNumber: p.paymentNumber,
      invoiceId: p.invoiceId,
      studentId: p.studentId,
      amount: Number(p.amount),
      currency: p.currency,
      method: p.method,
      status: p.status,
      transactionReference: p.transactionReference,
      idempotencyKey: p.idempotencyKey,
      gatewayProvider: p.gatewayProvider,
      paidAt: p.paidAt ? p.paidAt.toISOString() : undefined,
      recordedById: p.recordedById,
      recordedByName: p.recordedBy?.user?.fullName,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
      invoice: p.invoice
        ? {
            id: p.invoice.id,
            invoiceNumber: p.invoice.invoiceNumber,
            totalAmount: Number(p.invoice.totalAmount),
            paidAmount: Number(p.invoice.paidAmount),
            status: p.invoice.status,
          }
        : undefined,
      student: p.student
        ? {
            id: p.student.id,
            studentCode: p.student.studentCode,
            fullName: p.student.fullName,
            email: p.student.email,
          }
        : undefined,
    };
  }
}
