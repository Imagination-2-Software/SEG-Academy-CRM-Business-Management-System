-- Migration: 20261125000001_financial_triggers
-- Description: Financial Invariant Enforcement & Immutability Protections for SEG Academy CRM
-- Target Database: PostgreSQL 17 / Supabase
--
-- Protections Enforced:
-- 1. Invoice Reconciliation: Automatically sums confirmed payments and processed refunds,
--    updating invoice.paidAmount and status (ISSUED -> PARTIALLY_PAID -> PAID / REFUNDED).
-- 2. Confirmed Payment Immutability: Blocks deletion or direct attribute alteration of confirmed/refunded payments.
-- 3. Finalized Invoice Lock: Blocks deletion or monetary/relational modification of finalized invoices and their line items.

-- ------------------------------------------------------------------------------
-- 1. FUNCTION: Reconcile Invoice Financials (Hierarchical Lock Order)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reconcile_invoice_financials(p_invoice_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_payments DECIMAL(12,2);
  v_total_refunds DECIMAL(12,2);
  v_net_paid DECIMAL(12,2);
  v_total_amount DECIMAL(12,2);
  v_current_status "InvoiceStatus";
  v_new_status "InvoiceStatus";
BEGIN
  -- Step 1: Lock invoice row first (Top of hierarchy)
  SELECT "totalAmount", "status"
  INTO v_total_amount, v_current_status
  FROM public."invoices"
  WHERE "id" = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Step 2: Sum confirmed payments
  SELECT COALESCE(SUM("amount"), 0.00)
  INTO v_total_payments
  FROM public."payments"
  WHERE "invoiceId" = p_invoice_id
    AND "status" IN ('CONFIRMED', 'PARTIALLY_REFUNDED', 'REFUNDED');

  -- Step 3: Sum processed refunds
  SELECT COALESCE(SUM("amount"), 0.00)
  INTO v_total_refunds
  FROM public."refunds"
  WHERE "invoiceId" = p_invoice_id
    AND "status" = 'PROCESSED';

  v_net_paid := v_total_payments - v_total_refunds;
  IF v_net_paid < 0.00 THEN
    v_net_paid := 0.00;
  END IF;

  -- Step 4: Determine reconciled invoice status
  IF v_current_status NOT IN ('CANCELLED', 'DRAFT') THEN
    IF v_net_paid >= v_total_amount THEN
      v_new_status := 'PAID';
    ELSIF v_net_paid > 0.00 THEN
      v_new_status := 'PARTIALLY_PAID';
    ELSIF v_net_paid = 0.00 AND v_total_refunds > 0.00 THEN
      v_new_status := 'REFUNDED';
    ELSE
      v_new_status := 'ISSUED';
    END IF;
  ELSE
    v_new_status := v_current_status;
  END IF;

  -- Step 5: Update invoice
  UPDATE public."invoices"
  SET "paidAmount" = v_net_paid,
      "status" = v_new_status,
      "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = p_invoice_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. TRIGGERS: Payment Immutability & Automatic Reconciliation
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_payment_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inv_finalized BOOLEAN;
  v_inv_status "InvoiceStatus";
  v_recorder_role TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" IN ('CONFIRMED', 'PARTIALLY_REFUNDED', 'REFUNDED') THEN
      RAISE EXCEPTION 'Financial Security: Confirmed or refunded payments cannot be deleted (Payment ID: %).', OLD."id";
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW."amount" <= 0 THEN
      RAISE EXCEPTION 'Financial Security: Payment amount must be greater than zero.';
    END IF;

    IF NEW."status" = 'CONFIRMED' THEN
      IF NEW."recordedById" IS NULL OR NEW."transactionReference" IS NULL OR NEW."paidAt" IS NULL THEN
        RAISE EXCEPTION 'Financial Security: Confirmed manual payments require recordedById, transactionReference, and paidAt.';
      END IF;

      SELECT r."code" INTO v_recorder_role
      FROM public."employees" e
      JOIN public."users" u ON e."userId" = u."id"
      JOIN public."roles" r ON u."roleId" = r."id"
      WHERE e."id" = NEW."recordedById";

      IF v_recorder_role IS NOT NULL AND v_recorder_role NOT IN ('FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER') THEN
        RAISE EXCEPTION 'Financial Security: Employee % is not authorized to record confirmed payments.', NEW."recordedById";
      END IF;
    END IF;

    IF NEW."status" NOT IN ('PENDING', 'CONFIRMED') THEN
      RAISE EXCEPTION 'Financial Security: New payments must initiate as PENDING or CONFIRMED.';
    END IF;

    SELECT "isFinalized", "status" INTO v_inv_finalized, v_inv_status
    FROM public."invoices" WHERE "id" = NEW."invoiceId";

    IF v_inv_finalized = false OR v_inv_status IN ('DRAFT', 'CANCELLED') THEN
      RAISE EXCEPTION 'Financial Security: Payments cannot be recorded against draft, non-finalized, or cancelled invoices.';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD."status" = 'PENDING' AND NEW."status" = 'CONFIRMED' THEN
      IF NEW."method" NOT IN ('ONLINE_GATEWAY', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI') THEN
        IF NEW."recordedById" IS NULL THEN
          RAISE EXCEPTION 'Financial Security: Manual payment confirmation requires recordedById.';
        END IF;

        SELECT r."code" INTO v_recorder_role
        FROM public."employees" e
        JOIN public."users" u ON e."userId" = u."id"
        JOIN public."roles" r ON u."roleId" = r."id"
        WHERE e."id" = NEW."recordedById";

        IF v_recorder_role IS NOT NULL AND v_recorder_role NOT IN ('FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER') THEN
          RAISE EXCEPTION 'Financial Security: Employee % is not authorized to confirm manual payments.', NEW."recordedById";
        END IF;
      END IF;
    END IF;

    -- Financial immutability once confirmed
    IF OLD."status" IN ('CONFIRMED', 'PARTIALLY_REFUNDED', 'REFUNDED') THEN
      IF NEW."amount" IS DISTINCT FROM OLD."amount" OR
         NEW."invoiceId" IS DISTINCT FROM OLD."invoiceId" OR
         NEW."studentId" IS DISTINCT FROM OLD."studentId" OR
         NEW."currency" IS DISTINCT FROM OLD."currency" OR
         NEW."method" IS DISTINCT FROM OLD."method" OR
         NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey" OR
         NEW."idempotencyPayloadHash" IS DISTINCT FROM OLD."idempotencyPayloadHash" OR
         NEW."gatewayProvider" IS DISTINCT FROM OLD."gatewayProvider" OR
         NEW."gatewayOrderId" IS DISTINCT FROM OLD."gatewayOrderId" OR
         NEW."paidAt" IS DISTINCT FROM OLD."paidAt" OR
         NEW."transactionReference" IS DISTINCT FROM OLD."transactionReference" OR
         NEW."recordedById" IS DISTINCT FROM OLD."recordedById" THEN
        RAISE EXCEPTION 'Financial Security: Core financial attributes of confirmed/refunded payments are strictly immutable.';
      END IF;

      IF OLD."status" = 'CONFIRMED' AND NEW."status" NOT IN ('CONFIRMED', 'PARTIALLY_REFUNDED', 'REFUNDED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from CONFIRMED to %.', NEW."status";
      END IF;

      IF OLD."status" = 'PARTIALLY_REFUNDED' AND NEW."status" NOT IN ('PARTIALLY_REFUNDED', 'REFUNDED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from PARTIALLY_REFUNDED to %.', NEW."status";
      END IF;

      IF OLD."status" = 'REFUNDED' AND NEW."status" IS DISTINCT FROM OLD."status" THEN
        RAISE EXCEPTION 'Financial Security: Cannot change status of fully REFUNDED payment.';
      END IF;
    END IF;

    IF OLD."status" IN ('FAILED', 'CANCELLED') AND NEW."status" IS DISTINCT FROM OLD."status" THEN
      RAISE EXCEPTION 'Financial Security: Terminal payment state % cannot be revived.', OLD."status";
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_immutability ON public."payments";
CREATE TRIGGER trg_payment_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public."payments"
FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_immutability();

CREATE OR REPLACE FUNCTION public.trg_sync_payment_to_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.reconcile_invoice_financials(OLD."invoiceId");
  ELSE
    PERFORM public.reconcile_invoice_financials(NEW."invoiceId");
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_reconciliation ON public."payments";
CREATE TRIGGER trg_payment_reconciliation
AFTER INSERT OR UPDATE OF "status", "amount" OR DELETE ON public."payments"
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_payment_to_invoice();

-- ------------------------------------------------------------------------------
-- 3. TRIGGERS: Refund Immutability & Automatic Reconciliation
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_refund_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pmt_status "PaymentStatus";
  v_pmt_amount DECIMAL(12,2);
  v_reserved_refunds DECIMAL(12,2);
  v_available_balance DECIMAL(12,2);
  v_processor_role TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" = 'PROCESSED' THEN
      RAISE EXCEPTION 'Financial Security: Processed refunds cannot be deleted (Refund ID: %).', OLD."id";
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW."amount" <= 0 THEN
      RAISE EXCEPTION 'Financial Security: Refund amount must be greater than zero.';
    END IF;

    -- Strict Lock Hierarchy: Lock invoice first, then payment
    PERFORM 1 FROM public."invoices" WHERE "id" = NEW."invoiceId" FOR UPDATE;

    SELECT "status", "amount"
    INTO v_pmt_status, v_pmt_amount
    FROM public."payments"
    WHERE "id" = NEW."paymentId"
    FOR UPDATE;

    IF v_pmt_status NOT IN ('CONFIRMED', 'PARTIALLY_REFUNDED') THEN
      RAISE EXCEPTION 'Financial Security: Refunds can only be requested against CONFIRMED or PARTIALLY_REFUNDED payments.';
    END IF;

    SELECT COALESCE(SUM("amount"), 0.00)
    INTO v_reserved_refunds
    FROM public."refunds"
    WHERE "paymentId" = NEW."paymentId"
      AND "status" IN ('REQUESTED', 'APPROVED', 'PROCESSED')
      AND ("id" IS DISTINCT FROM NEW."id");

    v_available_balance := v_pmt_amount - v_reserved_refunds;

    IF NEW."status" IN ('REQUESTED', 'APPROVED', 'PROCESSED') THEN
      IF NEW."amount" > v_available_balance THEN
        RAISE EXCEPTION 'Financial Security: Refund amount (%) exceeds available refundable balance (%).', NEW."amount", v_available_balance;
      END IF;
    END IF;

    IF NEW."status" IN ('APPROVED', 'PROCESSED') THEN
      IF NEW."processedById" IS NULL THEN
        RAISE EXCEPTION 'Financial Security: Approving or processing a refund requires processedById.';
      END IF;

      SELECT r."code" INTO v_processor_role
      FROM public."employees" e
      JOIN public."users" u ON e."userId" = u."id"
      JOIN public."roles" r ON u."roleId" = r."id"
      WHERE e."id" = NEW."processedById";

      IF v_processor_role IS NOT NULL AND v_processor_role NOT IN ('FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER') THEN
        RAISE EXCEPTION 'Financial Security: Employee % (role %) is not authorized to approve or process refunds.', NEW."processedById", v_processor_role;
      END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
      IF NEW."status" <> 'REQUESTED' THEN
        RAISE EXCEPTION 'Financial Security: New refunds must initiate strictly with REQUESTED status (attempted: %).', NEW."status";
      END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
      IF OLD."status" = 'PROCESSED' THEN
        IF NEW."amount" IS DISTINCT FROM OLD."amount" OR
           NEW."paymentId" IS DISTINCT FROM OLD."paymentId" OR
           NEW."invoiceId" IS DISTINCT FROM OLD."invoiceId" OR
           NEW."currency" IS DISTINCT FROM OLD."currency" OR
           NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey" OR
           NEW."idempotencyPayloadHash" IS DISTINCT FROM OLD."idempotencyPayloadHash" OR
           NEW."processedById" IS DISTINCT FROM OLD."processedById" OR
           NEW."processedAt" IS DISTINCT FROM OLD."processedAt" OR
           NEW."status" IS DISTINCT FROM OLD."status" THEN
          RAISE EXCEPTION 'Financial Security: Processed refunds are strictly immutable.';
        END IF;
      END IF;

      IF OLD."status" = 'REQUESTED' AND NEW."status" NOT IN ('REQUESTED', 'APPROVED', 'REJECTED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from REQUESTED to %.', NEW."status";
      END IF;

      IF OLD."status" = 'APPROVED' AND NEW."status" NOT IN ('APPROVED', 'PROCESSED', 'REJECTED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from APPROVED to %.', NEW."status";
      END IF;

      IF OLD."status" = 'REJECTED' AND NEW."status" IS DISTINCT FROM OLD."status" THEN
        RAISE EXCEPTION 'Financial Security: Cannot change status of REJECTED refund.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refund_immutability ON public."refunds";
CREATE TRIGGER trg_refund_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public."refunds"
FOR EACH ROW EXECUTE FUNCTION public.enforce_refund_immutability();

CREATE OR REPLACE FUNCTION public.trg_sync_refund_to_payment_and_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_payment_id TEXT;
  v_target_invoice_id TEXT;
  v_pmt_amount DECIMAL(12,2);
  v_total_processed DECIMAL(12,2);
  v_new_pmt_status "PaymentStatus";
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target_payment_id := OLD."paymentId";
    v_target_invoice_id := OLD."invoiceId";
  ELSE
    v_target_payment_id := NEW."paymentId";
    v_target_invoice_id := NEW."invoiceId";
  END IF;

  -- Lock hierarchy: invoices first, then payments
  PERFORM 1 FROM public."invoices" WHERE "id" = v_target_invoice_id FOR UPDATE;

  SELECT "amount" INTO v_pmt_amount
  FROM public."payments" WHERE "id" = v_target_payment_id FOR UPDATE;

  SELECT COALESCE(SUM("amount"), 0.00) INTO v_total_processed
  FROM public."refunds"
  WHERE "paymentId" = v_target_payment_id AND "status" = 'PROCESSED';

  IF v_total_processed >= v_pmt_amount THEN
    v_new_pmt_status := 'REFUNDED';
  ELSIF v_total_processed > 0.00 THEN
    v_new_pmt_status := 'PARTIALLY_REFUNDED';
  ELSE
    v_new_pmt_status := 'CONFIRMED';
  END IF;

  UPDATE public."payments"
  SET "status" = v_new_pmt_status, "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = v_target_payment_id AND "status" <> v_new_pmt_status;

  PERFORM public.reconcile_invoice_financials(v_target_invoice_id);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refund_reconciliation ON public."refunds";
CREATE TRIGGER trg_refund_reconciliation
AFTER INSERT OR UPDATE OF "status", "amount" OR DELETE ON public."refunds"
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_refund_to_payment_and_invoice();

-- ------------------------------------------------------------------------------
-- 4. TRIGGERS: Finalized Invoice Lock & Line Item Protection
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_invoice_finalization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."isFinalized" = true OR OLD."status" NOT IN ('DRAFT', 'CANCELLED') THEN
      RAISE EXCEPTION 'Financial Security: Finalized or active invoices cannot be deleted (Invoice ID: %).', OLD."id";
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW."subtotal" < 0 OR NEW."totalAmount" < 0 OR NEW."taxAmount" < 0 OR NEW."discountAmount" < 0 OR NEW."paidAmount" < 0 THEN
      RAISE EXCEPTION 'Financial Security: Invoice monetary amounts cannot be negative.';
    END IF;

    IF NEW."status" = 'DRAFT' AND NEW."isFinalized" = true THEN
      RAISE EXCEPTION 'Financial Security: A DRAFT invoice cannot be initialized as finalized.';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD."isFinalized" = true AND NEW."isFinalized" = false THEN
      RAISE EXCEPTION 'Financial Security: Finalized invoices cannot be un-finalized or reopened.';
    END IF;

    IF OLD."isFinalized" = true AND NEW."status" = 'DRAFT' THEN
      RAISE EXCEPTION 'Financial Security: Finalized invoices cannot revert to DRAFT status.';
    END IF;

    IF OLD."status" = 'DRAFT' THEN
      IF NEW."status" NOT IN ('DRAFT', 'ISSUED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from DRAFT to %.', NEW."status";
      END IF;
      IF NEW."status" = 'ISSUED' AND NEW."isFinalized" = false THEN
        RAISE EXCEPTION 'Financial Security: Invoices transitioning to ISSUED must have isFinalized = true.';
      END IF;

    ELSIF OLD."status" = 'ISSUED' THEN
      IF NEW."status" NOT IN ('ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from ISSUED to %.', NEW."status";
      END IF;

    ELSIF OLD."status" = 'PARTIALLY_PAID' THEN
      IF NEW."status" NOT IN ('PARTIALLY_PAID', 'PAID', 'REFUNDED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from PARTIALLY_PAID to %.', NEW."status";
      END IF;

    ELSIF OLD."status" = 'PAID' THEN
      IF NEW."status" NOT IN ('PAID', 'PARTIALLY_PAID', 'REFUNDED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from PAID to %.', NEW."status";
      END IF;

    ELSIF OLD."status" = 'CANCELLED' THEN
      IF NEW."status" IS DISTINCT FROM OLD."status" THEN
        RAISE EXCEPTION 'Financial Security: CANCELLED invoices are terminal and cannot change status.';
      END IF;

    ELSIF OLD."status" = 'REFUNDED' THEN
      IF NEW."status" IS DISTINCT FROM OLD."status" THEN
        RAISE EXCEPTION 'Financial Security: REFUNDED invoices are terminal and cannot change status.';
      END IF;
    END IF;

    IF OLD."isFinalized" = true THEN
      IF NEW."totalAmount" IS DISTINCT FROM OLD."totalAmount" OR
         NEW."subtotal" IS DISTINCT FROM OLD."subtotal" OR
         NEW."taxAmount" IS DISTINCT FROM OLD."taxAmount" OR
         NEW."discountAmount" IS DISTINCT FROM OLD."discountAmount" OR
         NEW."studentId" IS DISTINCT FROM OLD."studentId" OR
         NEW."enrolmentId" IS DISTINCT FROM OLD."enrolmentId" OR
         NEW."currency" IS DISTINCT FROM OLD."currency" OR
         NEW."issueDate" IS DISTINCT FROM OLD."issueDate" THEN
        RAISE EXCEPTION 'Financial Security: Finalized invoices cannot be directly edited. Adjustments must be issued via Credit/Debit Notes.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_finalization ON public."invoices";
CREATE TRIGGER trg_invoice_finalization
BEFORE INSERT OR UPDATE OR DELETE ON public."invoices"
FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_finalization();

CREATE OR REPLACE FUNCTION public.enforce_invoice_item_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_finalized BOOLEAN;
  v_target_invoice_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target_invoice_id := OLD."invoiceId";
  ELSE
    v_target_invoice_id := NEW."invoiceId";
  END IF;

  SELECT "isFinalized" INTO v_is_finalized
  FROM public."invoices"
  WHERE "id" = v_target_invoice_id;

  IF v_is_finalized = true THEN
    RAISE EXCEPTION 'Financial Security: Cannot add, modify, or delete line items on a finalized invoice (Invoice ID: %).', v_target_invoice_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW."quantity" <= 0 THEN
      RAISE EXCEPTION 'Financial Security: Line item quantity must be greater than zero.';
    END IF;
    IF NEW."unitPrice" < 0 OR NEW."amount" < 0 THEN
      RAISE EXCEPTION 'Financial Security: Line item prices cannot be negative.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW."invoiceId" IS DISTINCT FROM OLD."invoiceId" THEN
    RAISE EXCEPTION 'Financial Security: Cannot reassign an invoice item to a different invoice.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_item_immutability ON public."invoice_items";
CREATE TRIGGER trg_invoice_item_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public."invoice_items"
FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_item_immutability();
