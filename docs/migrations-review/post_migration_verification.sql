-- ==============================================================================
-- SEG CRM POST-MIGRATION VERIFICATION SUITE
-- Target Database: seg_crm_staging (PostgreSQL 17.12)
-- Classification: READ-ONLY VALIDATION SCRIPT
-- ==============================================================================

\set ON_ERROR_STOP on
\timing on

-- ------------------------------------------------------------------------------
-- 1. VERIFY ALL 26 EXPECTED TABLES
-- ------------------------------------------------------------------------------
SELECT '1. TABLE COUNT AND EXISTENCE CHECK' AS check_name;

WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'users', 'refresh_tokens', 'roles', 'permissions', 'role_permissions',
    'departments', 'teams', 'employees', 'intern_details', 'students',
    'student_documents', 'courses', 'batches', 'enrolments', 'invoices',
    'invoice_items', 'credit_notes', 'debit_notes', 'payments', 'refunds',
    'tasks', 'assignments', 'submissions', 'submission_reviews', 'notifications',
    'audit_logs'
  ]) AS table_name
),
actual_tables AS (
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
)
SELECT 
  e.table_name,
  CASE WHEN a.table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status
FROM expected_tables e
LEFT JOIN actual_tables a ON e.table_name = a.table_name
ORDER BY e.table_name;

SELECT count(*) AS total_tables_found,
       CASE WHEN count(*) = 26 THEN 'PASS' ELSE 'FAIL (Expected 26)' END AS verdict
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- ------------------------------------------------------------------------------
-- 2. VERIFY ALL 17 EXPECTED ENUM TYPES
-- ------------------------------------------------------------------------------
SELECT '2. ENUM TYPES CHECK' AS check_name;

WITH expected_enums AS (
  SELECT unnest(ARRAY[
    'AccountStatus', 'EmploymentType', 'InternshipStatus', 'DocumentType',
    'DocumentVerificationStatus', 'BatchStatus', 'EnrolmentStatus', 'InvoiceStatus',
    'CreditNoteStatus', 'DebitNoteStatus', 'PaymentMethod', 'PaymentStatus',
    'RefundStatus', 'TaskPriority', 'TaskStatus', 'SubmissionStatus', 'NotificationChannel'
  ]) AS enum_name
),
actual_enums AS (
  SELECT t.typname AS enum_name
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typtype = 'e'
)
SELECT 
  e.enum_name,
  CASE WHEN a.enum_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status
FROM expected_enums e
LEFT JOIN actual_enums a ON e.enum_name = a.enum_name
ORDER BY e.enum_name;

SELECT count(*) AS total_enums_found,
       CASE WHEN count(*) = 17 THEN 'PASS' ELSE 'FAIL (Expected 17)' END AS verdict
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typtype = 'e';

-- ------------------------------------------------------------------------------
-- 3. VERIFY ALL 8 EXPECTED FUNCTIONS AND SECURITY ATTRIBUTES
-- ------------------------------------------------------------------------------
SELECT '3. FUNCTIONS AND SECURITY DEFINER CHECK' AS check_name;

SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS is_security_definer,
  p.proconfig AS runtime_config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'confirm_online_payment',
    'reconcile_invoice_financials',
    'enforce_payment_immutability',
    'trg_sync_payment_to_invoice',
    'enforce_refund_immutability',
    'trg_sync_refund_to_payment_and_invoice',
    'enforce_invoice_finalization',
    'enforce_invoice_item_immutability'
  )
ORDER BY p.proname;

-- ------------------------------------------------------------------------------
-- 4. VERIFY ALL EXPECTED TRIGGERS ARE ENABLED
-- ------------------------------------------------------------------------------
SELECT '4. TRIGGERS AND STATUS CHECK' AS check_name;

SELECT 
  trigger_name,
  event_object_table AS target_table,
  event_manipulation AS event,
  action_timing AS timing,
  action_orientation AS orientation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ------------------------------------------------------------------------------
-- 5. VERIFY FOREIGN KEYS AND INDEXES
-- ------------------------------------------------------------------------------
SELECT '5. CONSTRAINTS AND INDEXES COUNT' AS check_name;

SELECT count(*) AS total_foreign_keys,
       CASE WHEN count(*) = 45 THEN 'PASS' ELSE 'FAIL (Expected 45)' END AS fk_verdict
FROM information_schema.table_constraints
WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';

SELECT count(*) AS total_indexes,
       CASE WHEN count(*) >= 85 THEN 'PASS' ELSE 'FAIL (Expected >= 85)' END AS index_verdict
FROM pg_indexes
WHERE schemaname = 'public';

-- ------------------------------------------------------------------------------
-- 6. VERIFY ROLES: seg_api_app AND seg_api_webhook ATTRIBUTES
-- ------------------------------------------------------------------------------
SELECT '6. ROLE ATTRIBUTES CHECK' AS check_name;

SELECT 
  rolname,
  rolsuper AS is_superuser,
  rolinherit AS inherits,
  rolcreaterole AS can_create_role,
  rolcreatedb AS can_create_db,
  rolcanlogin AS can_login,
  rolbypassrls AS can_bypass_rls
FROM pg_roles
WHERE rolname IN ('seg_api_app', 'seg_api_webhook', 'postgres');

-- ------------------------------------------------------------------------------
-- 7. VERIFY seg_api_webhook HAS NO DML ON PAYMENTS OR INVOICES
-- ------------------------------------------------------------------------------
SELECT '7. WEBHOOK PRIVILEGE BOUNDARY CHECK' AS check_name;

SELECT 
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'seg_api_webhook' AND table_schema = 'public'
ORDER BY table_name, privilege_type;

-- ------------------------------------------------------------------------------
-- 8. VERIFY PUBLIC EXECUTE IS REVOKED ON SENSITIVE SECURITY DEFINER FUNCTIONS
-- ------------------------------------------------------------------------------
SELECT '8. PUBLIC FUNCTION PRIVILEGE REVOCATION CHECK' AS check_name;

SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('confirm_online_payment', 'reconcile_invoice_financials')
ORDER BY routine_name, grantee;
