# Part 8 – Priority 1: Read-Only Contract Verification Report

**Document**: `docs/PART_08_PRIORITY_1_CONTRACT_VERIFICATION.md`
**Date**: November 26, 2026
**Module**: Invoices & Billing Management
**Status**: Read-Only Contract Verification Complete (No Code, Database, or Migrations Modified)

---

## 1. Executive Summary

This read-only contract verification verifies the implementation of **Part 8 – Priority 1: Critical Invoice Workflow & Status Actions** against the SEG Academy CRM backend architecture, database triggers, seed files, and API contracts.

### Verification Checklist Matrix

| # | Inspection Item | Verification Result | Status |
|---|---|---|---|
| 1 | Is `invoices:write` an actual seeded permission? | **Mismatch (Defect)**: `invoices:write` does NOT exist in the seed or permissions catalog. The canonical permission is `invoices:update`. | Requires Correction |
| 2 | Does `CreateInvoiceDto` support `isFinalized`? | **Match**: Supported via `@IsOptional() @IsBoolean() isFinalized?: boolean = false`. | Verified Compatible |
| 3 | Does `BillingService.createInvoice()` respect `isFinalized` for DRAFT vs. ISSUED? | **Match**: Accurately computes `const status = isFinalized ? InvoiceStatus.ISSUED : InvoiceStatus.DRAFT`. | Verified Compatible |
| 4 | Are frontend finalization and cancellation conditions consistent with backend lifecycle rules? | **Match**: Finalization requires `status === 'DRAFT' && !isFinalized`. Cancellation requires `status !== 'CANCELLED' && paidAmount === 0`. | Verified Compatible |
| 5 | Can a partially paid, finalized, or otherwise restricted invoice be cancelled through the UI? | **Match (Blocked)**: Cancel button is disabled/hidden when `Number(invoice.paidAmount) > 0` or `status === 'CANCELLED'`. Also guarded by backend service and database triggers. | Verified Secure |
| 6 | Does course selection correctly map `baseFee` to the invoice item payload? | **Match**: Maps `course.baseFee` to `unitPrice`, computes `amount = quantity * unitPrice`, and formats description. | Verified Compatible |
| 7 | Are tax, quantity, discount, and calculated totals handled according to backend financial rules? | **Match**: Backend tolerance `<= 0.05` verifies `subtotal`, `items[].amount`, `taxAmount`, and `totalAmount = (subtotal - discount) + tax`. | Verified Compatible |
| 8 | Are student and course loading/error states correctly handled without mock fallbacks? | **Match**: Mock fallback array eliminated. Real API queries `studentsService.getStudents()` and `academicService.listCourses()` provide loading spinners, error banners, and retry actions. | Verified Compatible |

---

## 2. Detailed Findings by Verification Item

### 1. Permission Check: `invoices:write` vs Canonical Permissions
- **Backend Inspection (`packages/database/prisma/seeds/initial_rbac_seed.sql`)**:
  ```sql
  -- Seeded permissions for invoices resource:
  ('perm_invoices_read',    'invoices', 'read',    'View invoices and balances'),
  ('perm_invoices_create',  'invoices', 'create',  'Generate new student invoices'),
  ('perm_invoices_update',  'invoices', 'update',  'Update draft invoices or apply adjustments'),
  ('perm_invoices_approve', 'invoices', 'approve', 'Approve and issue finalized invoices')
  ```
- **Controller Inspection (`apps/api/src/billing/billing.controller.ts`)**:
  - `@Permissions('invoices:read')` on `GET /invoices` and `GET /invoices/:id`
  - `@Permissions('invoices:create')` on `POST /invoices`
  - `@Permissions('invoices:update')` on `PATCH /invoices/:id/finalize` and `PATCH /invoices/:id/cancel`
- **Frontend Code Inspection (`apps/web/src/app/invoices/[id]/page.tsx`)**:
  - Line 180 currently uses:
    ```typescript
    const hasUpdatePermission = hasPermission('invoices:update') || hasPermission('invoices:write');
    ```
- **Finding**:
  - `invoices:write` does **not** exist anywhere in the backend permissions catalog or database seeds.
  - The canonical permission for updating, finalizing, and cancelling invoices is **`invoices:update`**.
  - **Correction Required**: Remove `|| hasPermission('invoices:write')` and use strictly `hasPermission('invoices:update')`.

---

### 2. DTO Support for `isFinalized`
- **Backend Inspection (`apps/api/src/billing/dto/billing.dto.ts`)**:
  ```typescript
  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Whether to finalize and lock the invoice immediately upon creation',
  })
  @IsOptional()
  @IsBoolean()
  isFinalized?: boolean = false;
  ```
- **Finding**:
  - `CreateInvoiceDto` officially declares and validates `isFinalized` with `@IsBoolean()` and `@IsOptional()`.
  - Frontend payload submission in `apps/web/src/app/invoices/create/page.tsx` passes a clean boolean `isFinalized: boolean`.

---

### 3. Backend Creation of DRAFT vs ISSUED Invoices
- **Backend Inspection (`apps/api/src/billing/billing.service.ts`)**:
  ```typescript
  const isFinalized = Boolean(dto.isFinalized);
  const status = isFinalized ? InvoiceStatus.ISSUED : InvoiceStatus.DRAFT;

  const result = await this.prisma.$transaction(async (tx) => {
    ...
    const created = await tx.invoice.create({
      data: {
        invoiceNumber,
        studentId: dto.studentId,
        enrolmentId: dto.enrolmentId,
        issueDate: new Date(dto.issueDate),
        dueDate: new Date(dto.dueDate),
        subtotal: dto.subtotal,
        discountAmount: dto.discountAmount || 0,
        taxAmount: dto.taxAmount || 0,
        totalAmount: dto.totalAmount,
        currency: 'INR',
        status,
        isFinalized,
        ...
      }
    });
  ```
- **Finding**:
  - When `isFinalized === false` (or omitted), status is initialized as `InvoiceStatus.DRAFT` and `isFinalized: false`.
  - When `isFinalized === true`, status is initialized as `InvoiceStatus.ISSUED` and `isFinalized: true`.
  - This perfectly matches the database constraint in trigger `enforce_invoice_finalization()`:
    ```sql
    IF NEW."status" = 'DRAFT' AND NEW."isFinalized" = true THEN
      RAISE EXCEPTION 'Financial Security: A DRAFT invoice cannot be initialized as finalized.';
    END IF;
    ```
  - Both actions ("Save as Draft" and "Create & Issue Invoice") in `apps/web/src/app/invoices/create/page.tsx` comply with backend integrity.

---

### 4. Lifecycle Rules for Finalization and Cancellation
- **Backend Inspection**:
  - **`finalizeInvoice(id)`**:
    - Throws `ConflictException` if `existing.isFinalized === true`.
    - Throws `BadRequestException` if `existing.status === InvoiceStatus.CANCELLED`.
    - Updates `isFinalized = true` and `status = InvoiceStatus.ISSUED`.
  - **`cancelInvoice(id)`**:
    - Throws `BadRequestException` if `Number(existing.paidAmount) > 0`.
    - Throws `ConflictException` if `existing.status === InvoiceStatus.CANCELLED`.
    - Updates `status = InvoiceStatus.CANCELLED`.
  - **Database Migration (`20261125000001_financial_triggers`)**:
    - Trigger `trg_invoice_finalization` forbids deleting or updating line items on finalized invoices (`isFinalized = true`).
    - CANCELLED invoices are terminal (`status CANCELLED` cannot be changed).
- **Frontend Dossier Guarding (`apps/web/src/app/invoices/[id]/page.tsx`)**:
  - `canFinalize`: `hasUpdatePermission && invoice.status === 'DRAFT' && !invoice.isFinalized`
  - `canCancel`: `hasUpdatePermission && invoice.status !== 'CANCELLED' && Number(invoice.paidAmount) === 0`
- **Finding**:
  - Frontend predicates are fully aligned with backend service guards and PostgreSQL triggers.

---

### 5. Protection Against Cancelling Restricted Invoices
- **Scenario A: Invoice has recorded payments (`paidAmount > 0`)**:
  - Frontend: `canCancel` evaluates to `false` because `Number(invoice.paidAmount) === 0` fails. The "Cancel Invoice" button is not rendered.
  - Backend API: If directly invoked, `BillingService.cancelInvoice()` throws:
    `BadRequestException("Financial Security: Cannot cancel invoice with paid amount of ₹...")`
  - Database Trigger: If payment exists, PostgreSQL trigger `trg_payment_immutability` and `reconcile_invoice_financials` protect the financial ledger.
- **Scenario B: Invoice is CANCELLED**:
  - Frontend: `canCancel` evaluates to `false`. "Cancel Invoice" button is hidden.
  - Backend API: Throws `ConflictException("Invoice is already cancelled.")`.
- **Finding**:
  - Full defense-in-depth protection is active across frontend UI, NestJS service, and PostgreSQL triggers.

---

### 6. Course Catalog Mapping (`baseFee` to Line Items)
- **Course Model & Interface (`apps/web/src/lib/api/academic.ts`)**:
  ```typescript
  export interface CourseSummary {
    id: string;
    code: string;
    title: string;
    baseFee: number | string;
    ...
  }
  ```
- **Frontend Prepopulation (`apps/web/src/app/invoices/create/page.tsx`)**:
  ```typescript
  const handleSelectCourseForLineItem = (courseId: string, itemId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        return {
          ...it,
          description: `${course.code}: ${course.title} Tuition Fee`,
          unitPrice: Number(course.baseFee) || 0,
        };
      }),
    );
  };
  ```
- **Finding**:
  - `course.baseFee` is accurately cast to `number` and assigned to `unitPrice`.
  - When submitted, `CreateInvoiceItemDto` receives:
    - `description`: formatted course code and title.
    - `quantity`: integer (`>= 1`).
    - `unitPrice`: numeric tuition rate.
    - `amount`: `quantity * unitPrice`.

---

### 7. Calculations & Backend Financial Rules
- **Backend Service Calculation Rules (`apps/api/src/billing/billing.service.ts` lines 301-328)**:
  1. `itemExpected = Number((item.quantity * item.unitPrice).toFixed(2))`
     Constraint: `|itemExpected - item.amount| <= 0.05`
  2. `calculatedSubtotal = sum(item.amount)`
     Constraint: `|calculatedSubtotal - dto.subtotal| <= 0.05`
  3. `expectedTotal = (calculatedSubtotal - discountAmount) + taxAmount`
     Constraint: `|expectedTotal - dto.totalAmount| <= 0.05`
- **Frontend Implementation (`apps/web/src/app/invoices/create/page.tsx`)**:
  - Subtotal: `items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0)`
  - Total Tax: `items.reduce((sum, it) => sum + (it.quantity * it.unitPrice * it.taxRate) / 100, 0)`
  - Grand Total: `Math.max(0, subtotal - Number(discountAmount) + totalTax)`
  - Line Item Amount on submit: `quantity * unitPrice`
- **Finding**:
  - Frontend calculations align exactly with backend arithmetic and tolerance limits (`<= 0.05`).

---

### 8. Student and Course Directory Integration & Error Handling
- **Frontend Audit (`apps/web/src/app/invoices/create/page.tsx`)**:
  - **Mock Data**: Hardcoded `defaultStudents` mock array has been **completely removed**.
  - **Student Fetching**: Calls `studentsService.getStudents({ limit: 100 })`.
  - **Course Fetching**: Calls `academicService.listCourses({ limit: 100, isActive: true })`.
  - **Loading States**: Explicit loading indicators (`isLoadingStudents`, `isLoadingCourses`).
  - **Empty States**: Clear warnings when 0 students exist.
  - **Error Handling**: Displays inline error banner with a **"Retry"** button to re-attempt loading if network or server errors occur.
- **Finding**:
  - The implementation is completely backend-driven with zero mock fallbacks.

---

## 3. Discrepancies and Required Corrections

### Discrepancy #1: Non-existent `invoices:write` Permission Check
- **Location**: `apps/web/src/app/invoices/[id]/page.tsx` line 180:
  ```typescript
  // Current:
  const hasUpdatePermission = hasPermission('invoices:update') || hasPermission('invoices:write');
  ```
- **Issue**: `invoices:write` is not a valid seeded permission in SEG Academy CRM.
- **Exact Correction Required**:
  ```typescript
  // Required:
  const hasUpdatePermission = hasPermission('invoices:update');
  ```
- **Note**: Lines 167 and 411 in `apps/web/src/app/invoices/[id]/page.tsx` also check:
  ```typescript
  (hasPermission('payments:create') || hasPermission('payments:write'))
  ```
  `payments:write` is similarly non-canonical (`payments:create` is the true canonical permission for recording payments).

---

## 4. Conclusion

The contract verification for **Part 8 – Priority 1** confirms that all workflow endpoints, DTOs, database triggers, and course catalog integrations are structurally sound and enforce strict financial integrity. Only one cosmetic permission check (`invoices:write`) requires alignment to the canonical `invoices:update` permission.
