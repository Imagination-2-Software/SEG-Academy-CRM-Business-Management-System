# SEG CRM — Phase 2D: Post-Migration Local Staging Verification Report

**Document Version:** 1.0.0  
**Target Environment:** Local PostgreSQL 17.12 (`127.0.0.1:5432`)  
**Target Database:** `seg_crm_staging`  
**Classification:** POST-MIGRATION ACCEPTANCE & ROLE PRIVILEGE AUDIT  

---

## 1. Executive Environment Status

Before running the post-migration verification suite, loopback network probes were dispatched against PostgreSQL port 5432:
- **CLI Probe (`pg_isready -h 127.0.0.1 -p 5432`):** Returned `127.0.0.1:5432 - no response`.
- **Socket Probe (`net.createConnection(5432)`):** Port closed on loopback.
- **Service Status:** The local PostgreSQL 17 Windows service (`postgresql-x64-17`) is currently stopped.

> [!IMPORTANT]
> To execute this automated verification suite immediately upon starting the PostgreSQL service and applying `initial_migration_integrated.sql`, an authoritative read-only SQL verification script has been prepared:  
> [`docs/migrations-review/post_migration_verification.sql`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/docs/migrations-review/post_migration_verification.sql).

---

## 2. Comprehensive Verification Item Checklist & SQL Probes

### Item 1: Confirm All 26 Expected Tables Exist
- **SQL Probe:**
  ```sql
  SELECT count(*) FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  ```
- **Expected Result:** Exactly **26 tables**:  
  `users`, `refresh_tokens`, `roles`, `permissions`, `role_permissions`, `departments`, `teams`, `employees`, `intern_details`, `students`, `student_documents`, `courses`, `batches`, `enrolments`, `invoices`, `invoice_items`, `credit_notes`, `debit_notes`, `payments`, `refunds`, `tasks`, `assignments`, `submissions`, `submission_reviews`, `notifications`, `audit_logs`.
- **Target Status:** **PENDING SERVICE RUN**

---

### Item 2: Confirm All 17 Expected Enum Types Exist
- **SQL Probe:**
  ```sql
  SELECT count(*) FROM pg_type t 
  JOIN pg_namespace n ON n.oid = t.typnamespace 
  WHERE n.nspname = 'public' AND t.typtype = 'e';
  ```
- **Expected Result:** Exactly **17 enums**:  
  `AccountStatus`, `EmploymentType`, `InternshipStatus`, `DocumentType`, `DocumentVerificationStatus`, `BatchStatus`, `EnrolmentStatus`, `InvoiceStatus`, `CreditNoteStatus`, `DebitNoteStatus`, `PaymentMethod`, `PaymentStatus`, `RefundStatus`, `TaskPriority`, `TaskStatus`, `SubmissionStatus`, `NotificationChannel`.
- **Target Status:** **PENDING SERVICE RUN**

---

### Item 3: Confirm All 8 Expected Functions & Security Attributes
- **SQL Probe:**
  ```sql
  SELECT proname, pg_get_function_identity_arguments(oid), pg_get_function_result(oid), prosecdef, proconfig
  FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
  ```
- **Expected Specifications:**
  1. `confirm_online_payment(TEXT, TEXT, TEXT, TIMESTAMP(3))`: `RETURNS VOID`, `prosecdef = true`, `proconfig = {search_path=public,pg_temp}`.
  2. `reconcile_invoice_financials(TEXT)`: `RETURNS VOID`, `prosecdef = true`, `proconfig = {search_path=public,pg_temp}`.
  3. `enforce_payment_immutability()`: `RETURNS TRIGGER`, `prosecdef = true`, `proconfig = {search_path=public,pg_temp}`.
  4. `trg_sync_payment_to_invoice()`: `RETURNS TRIGGER`, `prosecdef = true`, `proconfig = {search_path=public,pg_temp}`.
  5. `enforce_refund_immutability()`: `RETURNS TRIGGER`, `prosecdef = true`, `proconfig = {search_path=public,pg_temp}`.
  6. `trg_sync_refund_to_payment_and_invoice()`: `RETURNS TRIGGER`, `prosecdef = true`, `proconfig = {search_path=public,pg_temp}`.
  7. `enforce_invoice_finalization()`: `RETURNS TRIGGER`, `prosecdef = true`, `proconfig = {search_path=public,pg_temp}`.
  8. `enforce_invoice_item_immutability()`: `RETURNS TRIGGER`, `prosecdef = true`, `proconfig = {search_path=public,pg_temp}`.
- **Target Status:** **PENDING SERVICE RUN**

---

### Item 4: Confirm All Triggers Exist & Are Enabled
- **SQL Probe:**
  ```sql
  SELECT trigger_name, event_object_table, event_manipulation, action_timing 
  FROM information_schema.triggers WHERE trigger_schema = 'public';
  ```
- **Expected Triggers:**
  - `trg_payment_immutability`: `BEFORE INSERT OR UPDATE OR DELETE ON public.payments`
  - `trg_payment_reconciliation`: `AFTER INSERT OR UPDATE OF "status", "amount" OR DELETE ON public.payments`
  - `trg_refund_immutability`: `BEFORE INSERT OR UPDATE OR DELETE ON public.refunds`
  - `trg_refund_reconciliation`: `AFTER INSERT OR UPDATE OF "status", "amount" OR DELETE ON public.refunds`
  - `trg_invoice_finalization`: `BEFORE INSERT OR UPDATE OR DELETE ON public.invoices`
  - `trg_invoice_item_immutability`: `BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_items`
- **Target Status:** **PENDING SERVICE RUN**

---

### Item 5: Foreign-Key Constraints & Indexes Parity
- **SQL Probe:**
  ```sql
  SELECT count(*) FROM information_schema.table_constraints 
  WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';
  
  SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';
  ```
- **Expected Counts:** Exactly **45 Foreign Keys** and **85+ Indexes** (including PKs and `@unique` constraints).
- **Target Status:** **PENDING SERVICE RUN**

---

### Item 6: Role Attributes for `seg_api_app` and `seg_api_webhook`
- **SQL Probe:**
  ```sql
  SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolbypassrls
  FROM pg_roles WHERE rolname IN ('seg_api_app', 'seg_api_webhook');
  ```
- **Expected Role Invariants:**
  - `rolsuper = false` (No superuser)
  - `rolcreaterole = false` (Cannot create roles)
  - `rolcreatedb = false` (Cannot create databases)
  - `rolbypassrls = false` (Cannot bypass row-level security)
  - `rolcanlogin = true` (Can connect to database)
- **Target Status:** **PENDING SERVICE RUN**

---

### Item 7: Verify `seg_api_webhook` Has NO Direct DML on Payments or Invoices
- **SQL Probe:**
  ```sql
  SELECT table_name, privilege_type 
  FROM information_schema.role_table_grants 
  WHERE grantee = 'seg_api_webhook' AND table_schema = 'public';
  ```
- **Expected Privileges:**
  - **`SELECT`** on `public.payments`
  - **`SELECT`** on `public.invoices`
  - **ZERO `INSERT`, `UPDATE`, or `DELETE`** privileges on any table.
- **Target Status:** **PENDING SERVICE RUN**

---

### Item 8: Verify `PUBLIC` Cannot Execute Restricted Security-Definer Functions
- **SQL Probe:**
  ```sql
  SELECT routine_name, grantee, privilege_type
  FROM information_schema.routine_privileges
  WHERE routine_schema = 'public' 
    AND routine_name IN ('confirm_online_payment', 'reconcile_invoice_financials')
    AND grantee = 'PUBLIC';
  ```
- **Expected Privileges:** **Zero rows returned** (execution revoked from `PUBLIC`).
  - `confirm_online_payment()` granted strictly to `seg_api_webhook` and `postgres`.
  - `reconcile_invoice_financials()` granted strictly to `postgres`.
- **Target Status:** **PENDING SERVICE RUN**

---

## 3. Single Action Required to Complete Verification

Once the PostgreSQL 17 service is started and the migration script has run:
```powershell
$env:PGPASSWORD = "[YOUR_LOCAL_POSTGRES_PASSWORD]"

& "C:\Program Files\PostgreSQL\17\bin\psql.exe" `
  -h 127.0.0.1 `
  -p 5432 `
  -U postgres `
  -d seg_crm_staging `
  -f "C:\Users\thei2s\OneDrive\문서\Desktop\Seg-CRM\docs\migrations-review\post_migration_verification.sql"
```
*(Expected Output: All 8 checks return PASS with zero errors).*
