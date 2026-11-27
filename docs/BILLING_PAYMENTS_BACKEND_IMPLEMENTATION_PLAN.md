# Complete Architecture Audit & Implementation Plan: Billing & Payments Module
**SEG Academy CRM & Business Management System**
**Document Reference:** `docs/BILLING_PAYMENTS_BACKEND_IMPLEMENTATION_PLAN.md`
**Date:** November 26, 2026
**Status:** Read-Only Architecture Audit & Implementation Specification

---

## 1. Executive Summary & Audit Context

### 1.1 Objective
This document provides a comprehensive, read-only architectural audit of the SEG Academy CRM Billing, Invoicing, and Payments subsystem. It establishes an exact technical specification for implementing the backend module (`apps/api/src/billing`), transitioning `apps/web/src/lib/api/billing.ts` from mock/localStorage state to live NestJS endpoints, and ensuring strict compliance with PostgreSQL 17 / Supabase database-level financial invariant triggers.

### 1.2 Key Architectural Discoveries
1. **Database-Level Financial Engine Already Exists:**
   - In migration `20261125000001_financial_triggers`, robust PostgreSQL triggers and stored functions are already deployed on the database.
   - **`reconcile_invoice_financials(p_invoice_id)`:** Automatically sums confirmed payments and processed refunds, locks the invoice row with `FOR UPDATE` (hierarchical lock order), and updates `invoices.paidAmount` and `invoices.status` (`ISSUED` $\rightarrow$ `PARTIALLY_PAID` $\rightarrow$ `PAID` / `REFUNDED`).
   - **`enforce_payment_immutability()`:** Blocks deletion or mutation of core financial fields of confirmed payments. Enforces role verification (`FOUNDER_SUPER_ADMIN`, `ADMIN`, `FINANCE_MANAGER`) directly inside the database trigger.
   - **`enforce_refund_immutability()`:** Enforces strict reserve validation, prevents refund amounts from exceeding refundable balance, and maintains payment-to-refund reconciliation.
   - **`enforce_invoice_finalization()`:** Disallows line item mutation or deletion once an invoice is finalized (`isFinalized = true`).
2. **Backend Architecture Rule (CRITICAL):**
   - **DO NOT duplicate calculation of `paidAmount` or status transitions in the backend NestJS service.** The database triggers automatically compute and update `paidAmount` and `status` when rows in `payments` or `refunds` are inserted/updated.
   - The backend service must query and return the database-reconciled record after committing the transaction.
3. **Frontend Compatibility:**
   - The frontend (`apps/web/src/lib/api/billing.ts`) is currently in a hybrid state: it makes calls to `/invoices` and `/payments`, but catches failures and falls back to browser `localStorage`.
   - The invoice print screen (`apps/web/src/app/invoices/[id]/page.tsx`) and payment receipt (`apps/web/src/app/payments/[id]/page.tsx`) already have high-fidelity UI templates expecting standard RESTful models.

---

## 2. Existing vs. Missing Functionality Audit

| Feature Area | Frontend Status (`apps/web`) | Backend Status (`apps/api`) | Database Status (`packages/database`) | Assessment & Gap Analysis |
| :--- | :--- | :--- | :--- | :--- |
| **Invoice Listing & Search** | Completed UI (`/invoices`), pagination, status tabs, search filter | **Missing** (No controller or service) | Complete (`invoices`, indexes on `status`, `studentId`, `invoiceNumber`) | Need `GET /api/v1/invoices` with pagination and summary metrics. |
| **Invoice Creation** | Completed form (`/invoices/create`), line items, GST, discounts | **Missing** | Complete (`invoices`, `invoice_items`) | Need `POST /api/v1/invoices` with transaction (Invoice + Line Items). |
| **Invoice Details & Print** | Completed UI (`/invoices/[id]`), printable tax invoice layout | **Missing** | Complete (relates to student, items, payments, creditNotes) | Need `GET /api/v1/invoices/:id`. |
| **Invoice Status Automation** | Handled in mock state | Handled via DB Trigger | **Active Trigger** (`reconcile_invoice_financials`) | Backend must NOT duplicate calculation logic; let DB trigger reconcile. |
| **Payment Recording** | Completed modal (`RecordPaymentModal`) | **Missing** | Complete (`payments`, trigger `trg_payment_immutability`) | Need `POST /api/v1/invoices/:id/payments` with DB idempotency. |
| **Payment History & Receipts** | Completed UI (`/payments`, `/payments/[id]`) | **Missing** | Complete (`payments`, composite FK `[id, invoiceId]`) | Need `GET /api/v1/payments` and `GET /api/v1/payments/:id`. |
| **Payment Idempotency** | Generates temporary key in UI | **Missing** (No validation) | Complete (`idempotencyKey` unique constraint & hash) | Backend must compute SHA-256 payload hash and verify idempotency. |
| **Credit Notes & Debit Notes** | Type interfaces present in `billing.ts` | **Missing** | Complete (`credit_notes`, `debit_notes` models) | Need endpoints for issuance and querying of notes. |
| **Refund Processing** | Basic types | **Missing** | Complete (`refunds`, trigger `trg_refund_immutability`) | Need `POST /api/v1/invoices/:id/payments/:pmtId/refunds`. |

---

## 3. Database Schema, Relations & Financial Triggers Review

### 3.1 Existing Prisma Schema Models
```prisma
model Invoice {
  id             String        @id @default(uuid())
  invoiceNumber  String        @unique
  studentId      String
  enrolmentId    String?
  issueDate      DateTime
  dueDate        DateTime
  subtotal       Decimal       @db.Decimal(12, 2)
  taxAmount      Decimal       @default(0.00) @db.Decimal(12, 2)
  discountAmount Decimal       @default(0.00) @db.Decimal(12, 2)
  totalAmount    Decimal       @db.Decimal(12, 2)
  paidAmount     Decimal       @default(0.00) @db.Decimal(12, 2)
  currency       String        @default("INR")
  status         InvoiceStatus @default(DRAFT)
  version        Int           @default(1)
  isFinalized    Boolean       @default(false)
  notes          String?
  ...
}

model InvoiceItem {
  id          String   @id @default(uuid())
  invoiceId   String
  courseId    String?
  description String
  quantity    Int      @default(1)
  unitPrice   Decimal  @db.Decimal(12, 2)
  amount      Decimal  @db.Decimal(12, 2)
  ...
}

model Payment {
  id                     String        @id @default(uuid())
  paymentNumber          String        @unique
  invoiceId              String
  studentId              String
  amount                 Decimal       @db.Decimal(12, 2)
  currency               String        @default("INR")
  method                 PaymentMethod
  status                 PaymentStatus @default(PENDING)
  transactionReference   String?
  idempotencyKey         String        @unique
  idempotencyPayloadHash String?
  gatewayProvider        String?
  paidAt                 DateTime?
  recordedById           String?
  ...
}

model Refund {
  id                     String       @id @default(uuid())
  refundNumber           String       @unique
  paymentId              String
  invoiceId              String
  amount                 Decimal      @db.Decimal(12, 2)
  currency               String       @default("INR")
  reason                 String
  status                 RefundStatus @default(REQUESTED)
  idempotencyKey         String       @unique
  idempotencyPayloadHash String?
  processedById          String?
  processedAt            DateTime?
  ...
}
```

### 3.2 SQL Triggers in Effect
1. **`trg_payment_immutability` (BEFORE INSERT/UPDATE/DELETE on `payments`):**
   - Validates payment `amount > 0`.
   - Prevents recording payments on unfinalized or cancelled invoices.
   - If `status = 'CONFIRMED'`, requires `recordedById`, `transactionReference`, and `paidAt`.
   - Validates that `recordedById` belongs to an employee whose role is `FOUNDER_SUPER_ADMIN`, `ADMIN`, or `FINANCE_MANAGER`.
   - Confirmed payment records are strictly immutable.
2. **`trg_payment_reconciliation` (AFTER INSERT/UPDATE/DELETE on `payments`):**
   - Calls `reconcile_invoice_financials(invoiceId)`.
   - Recalculates `net_paid = total_payments - total_refunds`.
   - Auto-updates `invoice.status` to `PAID` if `net_paid >= totalAmount`, `PARTIALLY_PAID` if `net_paid > 0`, or `ISSUED` if `0`.
3. **`trg_refund_immutability` & `trg_refund_reconciliation` (on `refunds`):**
   - Acquires `FOR UPDATE` on invoice first, then payment (prevents deadlocks).
   - Validates that refund amount $\le$ remaining refundable balance.
   - Reconciles payment status (`PARTIALLY_REFUNDED`, `REFUNDED`) and triggers invoice re-reconciliation.
4. **`trg_invoice_finalization` & `trg_invoice_item_immutability`:**
   - Blocks addition, modification, or deletion of line items on finalized invoices (`isFinalized = true`).
   - Blocks direct manipulation of monetary amounts on finalized invoices.

---

## 4. RBAC & Financial Security Architecture

### 4.1 Permitted Roles & Hierarchy
All financial operations must be strictly gated to authorized roles:
- **Allowed Roles:** `FOUNDER_SUPER_ADMIN`, `ADMIN`, `FINANCE_MANAGER`.
- **System Permissions:**
  - `invoices:read` — View invoice lists, details, and metrics.
  - `invoices:create` — Create and issue new invoices.
  - `invoices:update` — Finalize or cancel invoices.
  - `payments:read` — View payment records and receipts.
  - `payments:create` — Record manual or gateway payments.
  - `refunds:create` — Request refunds.
  - `refunds:process` — Approve or process refunds.

### 4.2 Idempotency & Tamper-Proof Payloads
- **Mechanism:**
  1. Client sends a unique `Idempotency-Key` HTTP header (or `idempotencyKey` field in JSON payload).
  2. The backend hashes the canonical payload: `SHA256(JSON.stringify({ invoiceId, amount, method, studentId }))`.
  3. The backend checks for an existing payment record with that `idempotencyKey`:
     - If matching record exists AND hash matches: Return existing payment record (safe retry, HTTP 200).
     - If matching record exists AND hash differs: Throw `ConflictException` (tampering detected, HTTP 409).
     - If no record exists: Proceed with insert.
  4. The unique index in PostgreSQL ensures that concurrent requests with identical keys are rejected at the database engine level.

---

## 5. Required Endpoints, DTOs & Service Contracts

### 5.1 Endpoints Specification

| Endpoint | Method | Permission | Role Requirement | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/invoices` | `GET` | `invoices:read` | Admin / Finance | Paginated invoice list with search, status filters, and summary metrics. |
| `/api/v1/invoices/:id` | `GET` | `invoices:read` | Admin / Finance | Detailed invoice with line items, student, payments, credit notes. |
| `/api/v1/invoices` | `POST` | `invoices:create` | Admin / Finance | Create new invoice with items inside atomic Prisma transaction. |
| `/api/v1/invoices/:id/finalize` | `PATCH` | `invoices:update` | Admin / Finance | Finalizes invoice (`isFinalized: true`, `status: 'ISSUED'`). Triggers lock. |
| `/api/v1/invoices/:id/cancel` | `PATCH` | `invoices:update` | Admin / Finance | Cancels an unpaid invoice. |
| `/api/v1/invoices/:id/payments` | `POST` | `payments:create` | Admin / Finance | Records payment against invoice with idempotency check. |
| `/api/v1/payments` | `GET` | `payments:read` | Admin / Finance | Paginated payment transactions with search and method filters. |
| `/api/v1/payments/:id` | `GET` | `payments:read` | Admin / Finance | Payment receipt with invoice and student references. |
| `/api/v1/invoices/:id/credit-notes` | `POST` | `invoices:create` | Admin / Finance | Issues a credit note against an invoice. |
| `/api/v1/invoices/:id/payments/:pmtId/refunds` | `POST` | `refunds:create` | Admin / Finance | Initiates refund request against confirmed payment. |

### 5.2 DTO Definitions

#### `create-invoice.dto.ts`
```typescript
export class CreateInvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsUUID('all')
  courseId?: string;

  @IsInt()
  @Min(1)
  quantity: number = 1;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number; // e.g. 18 for 18% GST

  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateInvoiceDto {
  @IsUUID('all')
  @IsNotEmpty()
  studentId: string;

  @IsOptional()
  @IsUUID('all')
  enrolmentId?: string;

  @IsDateString()
  @IsNotEmpty()
  issueDate: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  @ArrayMinSize(1)
  items: CreateInvoiceItemDto[];

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount: number = 0;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isFinalized?: boolean = false;
}
```

#### `record-payment.dto.ts`
```typescript
export class RecordPaymentDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  transactionReference?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  gatewayProvider?: string;
}
```

---

## 6. Calculation Invariants & Service Logic Specification

### 6.1 Subtotal, Tax, and Grand Total Validation
In `BillingService.createInvoice()`:
- Recalculate line amounts: `item.amount = item.quantity * item.unitPrice`.
- Verify `subtotal = SUM(item.amount)`.
- If `taxRate` is provided, calculate GST: `taxAmount = (subtotal - discountAmount) * (taxRate / 100)`.
- Verify `totalAmount = (subtotal - discountAmount) + taxAmount`.
- If client-submitted amounts diverge from backend calculations by more than $\pm0.01$ (rounding tolerance), throw `BadRequestException('Monetary calculation mismatch')`.

### 6.2 Number Sequence Generation
- **Invoices:** `INV-YYYY-XXXXX` (e.g., `INV-2026-00042`).
- **Payments:** `PAY-YYYY-XXXXX` (e.g., `PAY-2026-00109`).
- **Credit Notes:** `CN-YYYY-XXXXX` (e.g., `CN-2026-00007`).
- **Debit Notes:** `DN-YYYY-XXXXX` (e.g., `DN-2026-00003`).
- **Refunds:** `REF-YYYY-XXXXX` (e.g., `REF-2026-00001`).

Sequential counters should be queried and verified inside an atomic transaction.

---

## 7. Recommended Implementation Sequence

To ensure stable, zero-downtime integration without regressing existing database constraints:

```
Phase 1: Backend Billing Module Infrastructure
  ├── Step 1.1: Create DTOs (Invoice, Items, Payment, Refund, Notes, Filters) in apps/api/src/billing/dto
  ├── Step 1.2: Implement BillingService with calculation validations, sequential code generation, and DB trigger reliance
  ├── Step 1.3: Implement BillingController with @Permissions() and @CurrentUser() resolvers
  ├── Step 1.4: Register BillingModule in apps/api/src/app.module.ts
  └── Step 1.5: Write comprehensive unit tests (billing.service.spec.ts) covering calculations, immutability, and idempotency

Phase 2: Frontend Service Integration
  ├── Step 2.1: Update apps/web/src/lib/api/billing.ts to direct all calls to /api/v1/invoices and /api/v1/payments
  ├── Step 2.2: Remove localStorage fallback persistence for successfully integrated billing operations
  └── Step 2.3: Verify Next.js production build (apps/web) and confirm route compilation

Phase 3: Automated Verification & Security Audit
  ├── Step 3.1: Run all backend tests (npm test --workspace=apps/api)
  └── Step 3.2: Verify payment receipt & printable tax invoice generation in browser
```
