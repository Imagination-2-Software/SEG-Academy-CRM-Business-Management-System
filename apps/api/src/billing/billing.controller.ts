import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';
import {
  CreateInvoiceDto,
  QueryInvoicesDto,
  RecordPaymentDto,
  QueryPaymentsDto,
  CreateCreditNoteDto,
  QueryCreditNotesDto,
  CreateDebitNoteDto,
  QueryDebitNotesDto,
  CreateRefundDto,
  QueryRefundsDto,
} from './dto';
import { Permissions, CurrentUser, AuthenticatedUser } from '../auth';

@ApiTags('Billing, Invoicing & Payments')
@ApiBearerAuth('bearer-jwt')
@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ==========================================
  // INVOICES
  // ==========================================

  @Permissions('invoices:read')
  @Get('invoices')
  @ApiOperation({ summary: 'List tax invoices with search, status filters and metrics' })
  @ApiResponse({ status: 200, description: 'Paginated tax invoices' })
  async getInvoices(@Query() query: QueryInvoicesDto) {
    return this.billingService.getInvoices(query);
  }

  @Permissions('invoices:read')
  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get detailed tax invoice with line items and payment ledger' })
  @ApiResponse({ status: 200, description: 'Tax invoice record' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoiceById(@Param('id') id: string) {
    return this.billingService.getInvoiceById(id);
  }

  @Permissions('invoices:create')
  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tax invoice with line items' })
  @ApiResponse({ status: 201, description: 'Invoice generated successfully' })
  @ApiResponse({ status: 400, description: 'Monetary calculation mismatch or invalid reference' })
  async createInvoice(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.billingService.createInvoice(dto, actor, clientMeta);
  }

  @Permissions('invoices:update')
  @Patch('invoices/:id/finalize')
  @ApiOperation({ summary: 'Finalize and lock a draft invoice' })
  @ApiResponse({ status: 200, description: 'Invoice finalized and issued' })
  @ApiResponse({ status: 409, description: 'Invoice already finalized' })
  async finalizeInvoice(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.billingService.finalizeInvoice(id, actor, clientMeta);
  }

  @Permissions('invoices:update')
  @Patch('invoices/:id/cancel')
  @ApiOperation({ summary: 'Cancel an unpaid invoice' })
  @ApiResponse({ status: 200, description: 'Invoice cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel invoice with paid amount' })
  async cancelInvoice(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.billingService.cancelInvoice(id, actor, clientMeta);
  }

  // ==========================================
  // PAYMENTS
  // ==========================================

  @Permissions('payments:create')
  @Post('invoices/:id/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record payment transaction against an invoice with idempotency check' })
  @ApiResponse({ status: 201, description: 'Payment recorded and invoice automatically reconciled' })
  @ApiResponse({ status: 409, description: 'Duplicate payment tampering detected' })
  async recordPayment(
    @Param('id') invoiceId: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.billingService.recordPayment(invoiceId, dto, actor, clientMeta);
  }

  @Permissions('payments:read')
  @Get('payments')
  @ApiOperation({ summary: 'List all payment transactions with filters and search' })
  @ApiResponse({ status: 200, description: 'Paginated payment transactions' })
  async getPayments(@Query() query: QueryPaymentsDto) {
    return this.billingService.getPayments(query);
  }

  @Permissions('payments:read')
  @Get('payments/:id')
  @ApiOperation({ summary: 'Get official payment receipt record by ID' })
  @ApiResponse({ status: 200, description: 'Payment receipt record' })
  @ApiResponse({ status: 404, description: 'Payment receipt not found' })
  async getPaymentById(@Param('id') id: string) {
    return this.billingService.getPaymentById(id);
  }

  // ==========================================
  // CREDIT NOTES
  // ==========================================

  @Permissions('invoices:read')
  @Get('credit-notes')
  @ApiOperation({ summary: 'List all credit note adjustments with search and filters' })
  @ApiResponse({ status: 200, description: 'Paginated credit notes' })
  async getCreditNotes(@Query() query: QueryCreditNotesDto) {
    return this.billingService.getCreditNotes(query);
  }

  @Permissions('invoices:create')
  @Post('invoices/:id/credit-notes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue an official credit note adjustment against an invoice' })
  @ApiResponse({ status: 201, description: 'Credit note issued' })
  async createCreditNote(
    @Param('id') invoiceId: string,
    @Body() dto: CreateCreditNoteDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.billingService.createCreditNote(invoiceId, dto, actor, clientMeta);
  }

  // ==========================================
  // DEBIT NOTES
  // ==========================================

  @Permissions('invoices:read')
  @Get('debit-notes')
  @ApiOperation({ summary: 'List all debit note adjustments with search and filters' })
  @ApiResponse({ status: 200, description: 'Paginated debit notes' })
  async getDebitNotes(@Query() query: QueryDebitNotesDto) {
    return this.billingService.getDebitNotes(query);
  }

  @Permissions('invoices:create')
  @Post('invoices/:id/debit-notes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue an official debit note adjustment against an invoice' })
  @ApiResponse({ status: 201, description: 'Debit note issued' })
  async createDebitNote(
    @Param('id') invoiceId: string,
    @Body() dto: CreateDebitNoteDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.billingService.createDebitNote(invoiceId, dto, actor, clientMeta);
  }

  // ==========================================
  // REFUNDS
  // ==========================================

  @Permissions('refunds:read')
  @Get('refunds')
  @ApiOperation({ summary: 'List all tuition refunds with filters and search' })
  @ApiResponse({ status: 200, description: 'Paginated refunds' })
  async getRefunds(@Query() query: QueryRefundsDto) {
    return this.billingService.getRefunds(query);
  }

  @Permissions('refunds:create')
  @Post('invoices/:id/payments/:pmtId/refunds')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Process or request a refund against a confirmed payment' })
  @ApiResponse({ status: 201, description: 'Refund processed, payment and invoice reconciled' })
  @ApiResponse({ status: 400, description: 'Refund amount exceeds refundable balance' })
  async createRefund(
    @Param('id') invoiceId: string,
    @Param('pmtId') paymentId: string,
    @Body() dto: CreateRefundDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.billingService.createRefund(invoiceId, paymentId, dto, actor, clientMeta);
  }
}
