# Part 8 – Billing & Invoice Management: Audit Report

**Date:** 2026-11-26
**Auditor:** Antigravity AI Assistant
**Repository:** SEG Academy CRM & Business Management System
**Status:** Read-Only Audit Completed

---

## 1. Executive Summary

This audit assesses the billing, invoicing, line item accounting, and payment reconciliation subsystems of the SEG Academy CRM.

### High-Level Findings:
1. **Industry-Grade Database & Trigger Foundations:** The database layer (`packages/database/prisma/migrations/20261125000001_financial_triggers/migration.sql`) implements hardened PostgreSQL triggers and functions that guarantee financial integrity:
   - `enforce_invoice_finalization()` blocks deletion and direct monetary alteration (`subtotal`, `taxAmount`, `discountAmount`, `totalAmount`) of finalized invoices.
   - `enforce_invoice_item_immutability()` blocks adding, modifying, or deleting line items once an invoice is finalized (`isFinalized = true`).
   - `reconcile_invoice_financials()` automatically computes `paidAmount` and transitions invoice statuses (`ISSUED` -> `PARTIALLY_PAID` -> `PAID` / `REFUNDED`) via strict row-level lock ordering (`FOR UPDATE`).
   - `enforce_payment_immutability()` blocks deletion and alteration of confirmed payments.
2. **Robust Backend Business Logic (`BillingService`):**
   - Atomic invoice generation with monotonic, collision-resistant invoice numbering (`INV-YYYY-XXXXX`).
   - Strict monetary calculation validation (`quantity * unitPrice == amount`, `sum(items) == subtotal`, `(subtotal - discount) + tax == totalAmount`) rejecting any floating-point or client-side tampering exceeding ±0.05.
   - Explicit lifecycle management (`finalizeInvoice`, `cancelInvoice`).
   - Cryptographic payment idempotency using SHA-256 canonical payload hashing.
3. **Frontend Implementation Discrepancies & Flaws:**
   - **Client-Side Pagination on Directory (`apps/web/src/app/invoices/page.tsx`):** The invoices directory queries `billingService.getInvoices()` without passing pagination parameters, receives a default single page, and then performs `.slice()` client-side. Invoices beyond the default limit are unreachable.
   - **Static/Mock Fallbacks in Invoice Creation (`apps/web/src/app/invoices/create/page.tsx`):** Contains hardcoded mock students (`defaultStudents`) and mock courses fallback instead of cleanly handling loading/empty states from `studentsService` and `academicService`.
   - **Missing Invoice Edit Workflow:** While draft invoices can theoretically be modified before finalization, there is **no Edit Invoice page or modal** in the frontend.
   - **Missing Native PDF Generation:** The invoice detail page relies exclusively on browser `window.print()` rather than dedicated, downloadable PDF generation.
4. **Backend Unit Test Coverage Gaps:**
   - Existing unit tests (`apps/api/src/billing/__tests__/billing.service.spec.ts`) cover invoice creation validation, finalization, cancellation rejection on paid invoices, and payment idempotency (8 tests total).
   - There is **zero test coverage** for:
     - `getInvoices()` (search by student code/name/invoice number, status filtering including overdue computation, pagination bounds, metrics calculation).
     - `getInvoiceById()` (retrieval with student, course items, payment ledger, and 404 handling).
     - Tax and discount mathematical edge cases.
     - Cancellation of pure draft/unpaid invoices.

---

## 2. Backend Audit

### 2.1 Prisma Models & Relations
Located in `packages/database/prisma/schema.prisma`:
- **`Invoice`**:
  - Columns: `id`, `invoiceNumber` (unique), `studentId`, `enrolmentId` (optional), `issueDate`, `dueDate`, `subtotal` (Decimal 12,2), `taxAmount` (Decimal 12,2), `discountAmount` (Decimal 12,2), `totalAmount` (Decimal 12,2), `paidAmount` (Decimal 12,2), `currency` (default "INR"), `status` (`InvoiceStatus` enum: `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`, `REFUNDED`), `version` (Int), `isFinalized` (Boolean), `notes` (String?), `createdAt`, `updatedAt`.
  - Relations: `student` (`ProfileStudent`), `enrolment` (`Enrolment?`), `items` (`InvoiceItem[]`), `payments` (`Payment[]`), `refunds` (`Refund[]`), `creditNotes` (`CreditNote[]`), `debitNotes` (`DebitNote[]`).
  - Indexes: `studentId`, `enrolmentId`, `status`, `invoiceNumber`.
- **`InvoiceItem`**:
  - Columns: `id`, `invoiceId`, `courseId` (optional), `description`, `quantity` (Int, default 1), `unitPrice` (Decimal 12,2), `amount` (Decimal 12,2), `createdAt`, `updatedAt`.
  - Relations: `invoice` (`Invoice`), `course` (`Course?`).

### 2.2 Controller & RBAC
In `apps/api/src/billing/billing.controller.ts`:
- `GET /invoices`: Protected by `@Permissions('invoices:read')`. Accepts `QueryInvoicesDto`. Returns paginated invoices and aggregated metrics.
- `GET /invoices/:id`: Protected by `@Permissions('invoices:read')`. Accepts ID or invoice number.
- `POST /invoices`: Protected by `@Permissions('invoices:create')`. Validates `CreateInvoiceDto`.
- `PATCH /invoices/:id/finalize`: Protected by `@Permissions('invoices:update')`. Locks invoice as `ISSUED`.
- `PATCH /invoices/:id/cancel`: Protected by `@Permissions('invoices:update')`. Cancels unpaid invoices.

### 2.3 Business Logic & Invariant Enforcement
In `apps/api/src/billing/billing.service.ts`:
1. **Mathematical Validation:**
   - Every item: `| (quantity * unitPrice) - amount | <= 0.05`.
   - Subtotal: `| sum(item.amount) - subtotal | <= 0.05`.
   - Total Amount: `| ((subtotal - discountAmount) + taxAmount) - totalAmount | <= 0.05`.
   - Prevents client-side manipulation of financial totals.
2. **Atomic Monotonic Numbering:**
   - Inside `$transaction`, computes `count(starts_with: INV-YYYY-)` and formats `INV-YYYY-XXXXX`.
   - Collision detection logic auto-appends randomized sequence upon collision.
3. **Immutability & Finalization:**
   - `finalizeInvoice()` flips `isFinalized = true` and `status = ISSUED`.
   - PostgreSQL trigger `enforce_invoice_finalization()` subsequently rejects any direct SQL updates or Prisma updates to monetary columns.
4. **Cancellation Safeguard:**
   - Invoices with `paidAmount > 0` cannot be cancelled. Throws `BadRequestException`.

---

## 3. Frontend Audit

### 3.1 Invoice Directory (`apps/web/src/app/invoices/page.tsx`)
- Displays KPI metric cards: Total Invoiced, Total Collected, Outstanding Balance, Overdue Invoices.
- Table listing: Invoice #, Student Name & Code, Issue & Due Dates, Total Amount, Paid Amount, Balance, Status Badge.
- **Defects & Limitations:**
  - Client-side pagination: Fetches `billingService.getInvoices({ search, status })` without `page` and `limit`, receiving default 20 records, and slices locally (`pageSize = 8`). Any invoices beyond the first 20 records from the backend are inaccessible.
  - Search trigger requires form submission rather than debounced live querying.
  - Quick action to record payment exists, but no quick action to finalize or cancel draft invoices from the list.

### 3.2 Invoice Creation (`apps/web/src/app/invoices/create/page.tsx`)
- Form with fields: Student selection, Enrolment/Batch linking, Issue Date, Due Date, Dynamic Line Items (description, quantity, unit price, tax rate), Discount amount, and Notes.
- Calculates subtotal, tax breakdown, and grand total in real-time.
- **Defects & Limitations:**
  - Fallback mock students array (`defaultStudents: StudentReference[]`) hardcoded into the component.
  - Lacks course selector dropdown to populate line item description and unit price from the actual course catalog.
  - Lacks toggle to create as `DRAFT` vs immediately `ISSUED` (`isFinalized: true`).

### 3.3 Invoice Dossier & Printable View (`apps/web/src/app/invoices/[id]/page.tsx`)
- Displays formal tax invoice layout: SEG Academy branding, invoice number, status badge, dates, student billing address, itemized line items table, subtotal/tax/discount/total breakdown, payment history ledger.
- Action toolbar: Record Payment modal, Print invoice (`window.print()`).
- Responsive print CSS (`@media print`) hides navigation shell and action buttons for clean paper/PDF printing.
- **Defects & Limitations:**
  - Does not support finalizing a draft invoice directly from the dossier (`PATCH /invoices/:id/finalize`).
  - Does not support cancelling an unpaid invoice directly from the dossier (`PATCH /invoices/:id/cancel`).
  - Lacks dedicated backend PDF download (relies on browser print-to-PDF).

---

## 4. Financial Integrity & Integration Status

| Invariant / Integration Point | Backend Mechanism | Database Trigger | Frontend Status | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Monetary Calculation Integrity** | Validated in `createInvoice` | None (Checked in app) | Live auto-calculation in form | **Verified & Secure** |
| **Issued Invoice Immutability** | Rejected in service if finalized | `enforce_invoice_finalization` | Finalized invoices show read-only view | **Verified & Secure** |
| **Line Item Protection** | No update API for items on finalized invoices | `enforce_invoice_item_immutability` | Line items cannot be edited post-issuance | **Verified & Secure** |
| **Automatic Balance Reconciliation** | Payment creation updates invoice | `reconcile_invoice_financials` | Dossier shows live balance from invoice | **Verified & Secure** |
| **Cancellation of Paid Invoices** | Blocked with `BadRequestException` | `enforce_invoice_finalization` | UI hides cancel when paid | **Verified & Secure** |
| **Payment Idempotency** | SHA-256 payload hash verification | Unique `idempotencyKey` | Payment modal sends idempotency key | **Verified & Secure** |
| **Refund & Credit Note Integration** | Processed through `BillingService` | Triggers sync payment & invoice | Viewable in invoice ledger | **Verified & Secure** |

---

## 5. Testing Coverage Gaps

In `apps/api/src/billing/__tests__/billing.service.spec.ts`:
- **Existing Coverage (8 tests):**
  1. Missing student rejection.
  2. Line item amount calculation mismatch rejection.
  3. Atomic invoice creation & sequence formatting.
  4. Invoice finalization lock.
  5. Paid invoice cancellation rejection.
  6. Payment idempotency safe retry.
  7. Payment idempotency altered payload rejection.
  8. Refund exceeding payment balance rejection.
- **Missing Backend Unit Test Coverage:**
  - `getInvoices()`: Default pagination, custom `page`/`limit`, search by student code/name/invoice number, status filter (`DRAFT`, `ISSUED`, `PAID`, `CANCELLED`), overdue filter calculation (`dueDate < now`), summary metrics aggregation.
  - `getInvoiceById()`: Successful lookup by UUID or invoice number with student, items, and payments; `NotFoundException` handling.
  - `createInvoice()`: Validation of student enrolment relationship (`enrolmentId` must belong to `studentId`), discount and tax calculation edge cases, zero line items validation.
  - `cancelInvoice()`: Successful cancellation of draft/unpaid invoice and audit log recording.
  - `finalizeInvoice()`: Rejection of already finalized invoice (`ConflictException`) and cancelled invoice (`BadRequestException`).

---

## 6. Prioritized Implementation Roadmap

### Priority 1: Critical Financial Workflow & Status Actions
**Goal:** Complete the invoice lifecycle by enabling authorized financial actors to finalize drafts and cancel unpaid invoices from the UI, removing static mock fallbacks.
1. Update `apps/web/src/app/invoices/[id]/page.tsx`:
   - Add **Finalize & Issue Invoice** action for `invoices:update` on draft invoices (`PATCH /invoices/:id/finalize`).
   - Add **Cancel Invoice** action for `invoices:update` on unpaid invoices (`PATCH /invoices/:id/cancel`).
2. Update `apps/web/src/app/invoices/create/page.tsx`:
   - Remove hardcoded mock students fallback; wire cleanly to `studentsService.getStudents({ limit: 100 })`.
   - Add Course catalog integration allowing selection of registered courses to auto-fill description and base tuition fee.
   - Allow choosing whether to save as `DRAFT` or issue immediately as `ISSUED`.

### Priority 2: Server-Side Invoicing Search, Filtering & Pagination
**Goal:** Eliminate data truncation and ensure complete access to all historical invoices.
1. Update `apps/web/src/app/invoices/page.tsx`:
   - Migrate from client-side `.slice()` pagination to backend-driven pagination using `QueryInvoicesDto` (`page`, `limit`).
   - Add debounced search matching invoice number and student details.
   - Support page size selection: `10, 20, 50, 100`.
   - Connect live total records and page navigation to backend metadata.

### Priority 3: Invoice Document Export & Usability
**Goal:** Enhance professional export capabilities and document presentation.
1. Enhance printable view styling on `/invoices/[id]` with optimized print stylesheets, high-resolution branding, and formal payment instructions.
2. Add CSV/Excel export for filtered invoice sets on `/invoices/page.tsx`.

### Priority 4: Comprehensive Backend Billing Service Unit Tests
**Goal:** Achieve complete unit test coverage across all invoicing methods.
1. Update `apps/api/src/billing/__tests__/billing.service.spec.ts`:
   - Add tests for `getInvoices()` with pagination, search, status, and overdue filters.
   - Add tests for `getInvoiceById()` with relations and 404 handling.
   - Add tests for `createInvoice()` enrolment verification and monetary calculations.
   - Add tests for `finalizeInvoice()` and `cancelInvoice()`.
2. Run backend test suite and TypeScript verification.

---

## 7. Exact Files Likely to Require Changes

### Backend:
- `apps/api/src/billing/dto/billing.dto.ts` (Ensure `QueryInvoicesDto` has optional `page?: number` and `limit?: number`).
- `apps/api/src/billing/__tests__/billing.service.spec.ts` (Add comprehensive invoice unit tests).

### Frontend:
- `apps/web/src/app/invoices/page.tsx` (Implement backend pagination, debounced search, and status filtering).
- `apps/web/src/app/invoices/create/page.tsx` (Remove mock fallback, integrate course picker, support draft/finalized choice).
- `apps/web/src/app/invoices/[id]/page.tsx` (Add Finalize and Cancel actions, verify payment recording).
- `apps/web/src/lib/api/billing.ts` (Ensure centralized methods for `finalizeInvoice` and `cancelInvoice` are properly exposed and typed).

---

## 8. Risks & Dependencies

1. **Database Trigger Invariants:** The PostgreSQL triggers (`enforce_invoice_finalization`, `enforce_invoice_item_immutability`) strictly reject direct updates to finalized invoices. The frontend must never attempt to mutate finalized line items or monetary amounts.
2. **Student & Course Dependencies:** Generating an invoice requires a valid `studentId` from `ProfileStudent`. Adding course line items requires referencing valid `Course.id` values.
3. **Cancellation Constraints:** Invoices with any recorded payment (`paidAmount > 0`) cannot be cancelled; attempting to cancel them raises an error from both the service and the database trigger. Refunds or credit notes must be used instead.

---

## 9. Audit Conclusion

The backend architecture and database triggers for Part 8 represent the most secure and financially robust subsystem in the CRM, with strict immutability, automated payment reconciliation, and mathematical integrity checks. The primary gaps reside in the frontend (client-side pagination truncating historical records, hardcoded mock student fallbacks, and missing UI buttons for finalizing and cancelling invoices) and backend unit test coverage for `getInvoices`, `getInvoiceById`, and invoice lifecycle endpoints. Implementing the four prioritized steps will bring Part 8 to complete production readiness.
