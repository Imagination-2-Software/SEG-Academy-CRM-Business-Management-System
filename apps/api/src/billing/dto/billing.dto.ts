import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus, PaymentMethod } from '@seg/database';

export class CreateInvoiceItemDto {
  @ApiProperty({
    example: 'Executive Program in AI & Data Science - Tuition Fee',
    description: 'Detailed description of the course or service line item',
  })
  @IsString({ message: 'Description must be a string.' })
  @IsNotEmpty({ message: 'Description is required.' })
  description!: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'Optional Course UUID if linked to a course',
  })
  @IsOptional()
  @IsUUID('all', { message: 'courseId must be a valid UUID.' })
  courseId?: string;

  @ApiProperty({
    example: 1,
    default: 1,
    description: 'Quantity of items or enrollments',
  })
  @IsInt({ message: 'quantity must be an integer.' })
  @Min(1, { message: 'quantity must be at least 1.' })
  quantity: number = 1;

  @ApiProperty({
    example: 50000,
    description: 'Unit price per quantity in INR',
  })
  @IsNumber({}, { message: 'unitPrice must be a valid number.' })
  @Min(0, { message: 'unitPrice cannot be negative.' })
  unitPrice!: number;

  @ApiPropertyOptional({
    example: 18,
    description: 'GST rate percentage (e.g. 18 for 18% GST)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'taxRate must be a number.' })
  @Min(0, { message: 'taxRate cannot be negative.' })
  taxRate?: number;

  @ApiProperty({
    example: 50000,
    description: 'Line item total amount (quantity * unitPrice)',
  })
  @IsNumber({}, { message: 'amount must be a number.' })
  @Min(0, { message: 'amount cannot be negative.' })
  amount!: number;
}

export class CreateInvoiceDto {
  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000002',
    description: 'UUID of the student receiving the invoice',
  })
  @IsUUID('all', { message: 'studentId must be a valid UUID.' })
  @IsNotEmpty({ message: 'studentId is required.' })
  studentId!: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000003',
    description: 'Optional batch enrolment UUID',
  })
  @IsOptional()
  @IsUUID('all', { message: 'enrolmentId must be a valid UUID.' })
  enrolmentId?: string;

  @ApiProperty({
    example: '2026-11-26',
    description: 'Date of invoice issuance (ISO-8601)',
  })
  @IsDateString({}, { message: 'issueDate must be a valid date string.' })
  @IsNotEmpty({ message: 'issueDate is required.' })
  issueDate!: string;

  @ApiProperty({
    example: '2026-12-10',
    description: 'Due date for invoice settlement (ISO-8601)',
  })
  @IsDateString({}, { message: 'dueDate must be a valid date string.' })
  @IsNotEmpty({ message: 'dueDate is required.' })
  dueDate!: string;

  @ApiProperty({
    type: [CreateInvoiceItemDto],
    description: 'List of line items on the invoice',
  })
  @IsArray({ message: 'items must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  @ArrayMinSize(1, { message: 'Invoice must contain at least one line item.' })
  items!: CreateInvoiceItemDto[];

  @ApiProperty({
    example: 50000,
    description: 'Subtotal sum of all line item amounts',
  })
  @IsNumber({}, { message: 'subtotal must be a number.' })
  @Min(0, { message: 'subtotal cannot be negative.' })
  subtotal!: number;

  @ApiPropertyOptional({
    example: 5000,
    default: 0,
    description: 'Discount amount subtracted from subtotal',
  })
  @IsOptional()
  @IsNumber({}, { message: 'discountAmount must be a number.' })
  @Min(0, { message: 'discountAmount cannot be negative.' })
  discountAmount?: number = 0;

  @ApiPropertyOptional({
    example: 8100,
    default: 0,
    description: 'Total tax / GST amount',
  })
  @IsOptional()
  @IsNumber({}, { message: 'taxAmount must be a number.' })
  @Min(0, { message: 'taxAmount cannot be negative.' })
  taxAmount?: number = 0;

  @ApiProperty({
    example: 53100,
    description: 'Grand total payable amount: (subtotal - discount) + tax',
  })
  @IsNumber({}, { message: 'totalAmount must be a number.' })
  @Min(0, { message: 'totalAmount cannot be negative.' })
  totalAmount!: number;

  @ApiPropertyOptional({
    example: 'Payable via NEFT/UPI within 15 days.',
    description: 'Optional notes or terms on the invoice',
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string.' })
  notes?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Whether to finalize and lock the invoice immediately upon creation',
  })
  @IsOptional()
  @IsBoolean()
  isFinalized?: boolean = false;
}

export class QueryInvoicesDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    enum: InvoiceStatus,
    description: 'Filter by invoice status (e.g. DRAFT, ISSUED, PARTIALLY_PAID, PAID, CANCELLED)',
  })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by student UUID',
  })
  @IsOptional()
  @IsUUID('all')
  studentId?: string;

  @ApiPropertyOptional({
    description: 'Search string across invoice number, student name, email or code',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class RecordPaymentDto {
  @ApiProperty({
    example: 25000,
    description: 'Payment amount in INR',
  })
  @IsNumber({}, { message: 'amount must be a number.' })
  @Min(0.01, { message: 'Payment amount must be greater than zero.' })
  amount!: number;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER,
    description: 'Payment method',
  })
  @IsEnum(PaymentMethod, {
    message: 'method must be one of: BANK_TRANSFER, CREDIT_CARD, DEBIT_CARD, UPI, CASH, ONLINE_GATEWAY',
  })
  @IsNotEmpty({ message: 'method is required.' })
  method!: PaymentMethod;

  @ApiPropertyOptional({
    example: 'NEFT/HDFC/20261126/987654',
    description: 'Bank or gateway transaction reference number',
  })
  @IsOptional()
  @IsString({ message: 'transactionReference must be a string.' })
  transactionReference?: string;

  @ApiPropertyOptional({
    example: 'idemp-20261126-pay-01',
    description: 'Unique client idempotency key to prevent duplicate payment requests',
  })
  @IsOptional()
  @IsString({ message: 'idempotencyKey must be a string.' })
  idempotencyKey?: string;

  @ApiPropertyOptional({
    example: '2026-11-26T12:00:00.000Z',
    description: 'Timestamp when payment was realized (ISO-8601)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'paidAt must be a valid date string.' })
  paidAt?: string;

  @ApiPropertyOptional({
    example: 'First installment received via corporate NEFT.',
    description: 'Optional internal notes',
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string.' })
  notes?: string;

  @ApiPropertyOptional({
    example: 'RAZORPAY',
    description: 'Gateway or channel provider',
  })
  @IsOptional()
  @IsString({ message: 'gatewayProvider must be a string.' })
  gatewayProvider?: string;
}

export class QueryPaymentsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Search string across payment number, transaction reference, invoice number or student name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Filter by payment method',
  })
  @IsOptional()
  method?: string;

  @ApiPropertyOptional({
    description: 'Filter by payment status',
  })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by invoice UUID',
  })
  @IsOptional()
  @IsUUID('all')
  invoiceId?: string;
}

export class CreateCreditNoteDto {
  @ApiProperty({
    example: 5000,
    description: 'Credit note adjustment amount in INR',
  })
  @IsNumber({}, { message: 'amount must be a number.' })
  @Min(0.01, { message: 'Credit note amount must be greater than zero.' })
  amount!: number;

  @ApiProperty({
    example: 'Fee waiver approved under merit scholarship program',
    description: 'Reason for credit note issuance',
  })
  @IsString({ message: 'reason must be a string.' })
  @IsNotEmpty({ message: 'reason is required.' })
  reason!: string;

  @ApiPropertyOptional({
    example: 'Approved by Managing Director.',
    description: 'Optional internal remarks',
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string.' })
  notes?: string;
}

export class QueryCreditNotesDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Search string across credit note number, reason, invoice number or student name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by invoice UUID',
  })
  @IsOptional()
  @IsUUID('all')
  invoiceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by student UUID',
  })
  @IsOptional()
  @IsUUID('all')
  studentId?: string;
}

export class CreateDebitNoteDto {
  @ApiProperty({
    example: 2500,
    description: 'Debit note adjustment amount in INR',
  })
  @IsNumber({}, { message: 'amount must be a number.' })
  @Min(0.01, { message: 'Debit note amount must be greater than zero.' })
  amount!: number;

  @ApiProperty({
    example: 'Additional lab fee adjustment',
    description: 'Reason for debit note issuance',
  })
  @IsString({ message: 'reason must be a string.' })
  @IsNotEmpty({ message: 'reason is required.' })
  reason!: string;

  @ApiPropertyOptional({
    example: 'Authorized by Academic Director.',
    description: 'Optional internal remarks',
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string.' })
  notes?: string;
}

export class QueryDebitNotesDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Search string across debit note number, reason, invoice number or student name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by invoice UUID',
  })
  @IsOptional()
  @IsUUID('all')
  invoiceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by student UUID',
  })
  @IsOptional()
  @IsUUID('all')
  studentId?: string;
}

export class CreateRefundDto {
  @ApiProperty({
    example: 10000,
    description: 'Refund amount in INR',
  })
  @IsNumber({}, { message: 'amount must be a number.' })
  @Min(0.01, { message: 'Refund amount must be greater than zero.' })
  amount!: number;

  @ApiProperty({
    example: 'Course withdrawal within standard refund window',
    description: 'Reason for refund request',
  })
  @IsString({ message: 'reason must be a string.' })
  @IsNotEmpty({ message: 'reason is required.' })
  reason!: string;

  @ApiPropertyOptional({
    example: 'idemp-refund-001',
    description: 'Unique client idempotency key for refund request',
  })
  @IsOptional()
  @IsString({ message: 'idempotencyKey must be a string.' })
  idempotencyKey?: string;
}

export class QueryRefundsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Search string across refund number, reason, payment number, or invoice number',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by invoice UUID',
  })
  @IsOptional()
  @IsUUID('all')
  invoiceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by payment UUID',
  })
  @IsOptional()
  @IsUUID('all')
  paymentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by refund status (e.g. REQUESTED, APPROVED, PROCESSED, REJECTED)',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
