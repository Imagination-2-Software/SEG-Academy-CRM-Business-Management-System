-- Seed Script: initial_rbac_seed.sql
-- Description: Idempotent initialization of the six system roles and foundational permissions
-- Target Database: PostgreSQL 17 / Supabase

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. BASE SYSTEM ROLES (Idempotent upsert via ON CONFLICT)
-- ------------------------------------------------------------------------------
INSERT INTO public."roles" ("id", "code", "name", "description", "isSystem", "updatedAt")
VALUES
  ('role_founder_super_admin', 'FOUNDER_SUPER_ADMIN', 'Founder & Super Admin', 'Full administrative authority and universal operational access across all modules.', true, CURRENT_TIMESTAMP),
  ('role_admin',               'ADMIN',               'Administrator',          'Standard system and operational management authority.', true, CURRENT_TIMESTAMP),
  ('role_finance_manager',     'FINANCE_MANAGER',     'Finance Manager',        'Authority over invoices, payments, refunds, debit/credit notes, and reports.', true, CURRENT_TIMESTAMP),
  ('role_team_leader',         'TEAM_LEADER',         'Team Leader',            'Management of department team staff, workflows, tasks, and batch assignments.', true, CURRENT_TIMESTAMP),
  ('role_trainer_faculty',     'TRAINER_FACULTY',     'Trainer / Faculty',      'Course delivery, batch scheduling, student assignments, and grading.', true, CURRENT_TIMESTAMP),
  ('role_employee_intern',     'EMPLOYEE_INTERN',     'Employee / Intern',      'Standard employee access to assigned tasks, departmental workflows, and profile.', true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "isSystem" = EXCLUDED."isSystem",
  "updatedAt" = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------------------------
-- 2. SYSTEM PERMISSIONS (Idempotent upsert via ON CONFLICT)
-- ------------------------------------------------------------------------------
INSERT INTO public."permissions" ("id", "resource", "action", "description")
VALUES
  -- Universal wildcard for superusers
  ('perm_all',              '*',           '*',             'Universal superuser permission'),
  -- Users & Roles
  ('perm_users_read',        'users',       'read',          'View user profiles and directories'),
  ('perm_users_create',      'users',       'create',        'Create employee user accounts'),
  ('perm_users_update',      'users',       'update',        'Update user details'),
  ('perm_users_manage_stat', 'users',       'manage_status', 'Activate, suspend, or deactivate users'),
  ('perm_users_manage_role', 'users',       'manage_roles',  'Assign or reassign user roles'),
  ('perm_roles_read',        'roles',       'read',          'View system roles and permission sets'),
  -- Students & KYC
  ('perm_students_read',     'students',    'read',          'View student directories and profiles'),
  ('perm_students_create',   'students',    'create',        'Register new student profiles'),
  ('perm_students_update',   'students',    'update',        'Update student profile and KYC details'),
  -- Courses, Batches & Enrolments
  ('perm_courses_read',      'courses',     'read',          'View courses and curricula'),
  ('perm_courses_create',    'courses',     'create',        'Create new courses'),
  ('perm_courses_update',    'courses',     'update',        'Update course curricula and settings'),
  ('perm_batches_read',      'batches',     'read',          'View scheduled cohort batches'),
  ('perm_batches_create',    'batches',     'create',        'Schedule new cohort batches'),
  ('perm_batches_update',    'batches',     'update',        'Update batch schedules and capacity'),
  ('perm_enrolments_read',   'enrolments',  'read',          'View student enrolments'),
  ('perm_enrolments_create', 'enrolments',  'create',        'Enrol students into cohorts'),
  ('perm_enrolments_update', 'enrolments',  'update',        'Update student enrolment status'),
  -- Finance, Invoices & Payments
  ('perm_invoices_read',     'invoices',    'read',          'View invoices and balances'),
  ('perm_invoices_create',   'invoices',    'create',        'Generate new student invoices'),
  ('perm_invoices_update',   'invoices',    'update',        'Update draft invoices or apply adjustments'),
  ('perm_invoices_approve',  'invoices',    'approve',       'Approve and issue finalized invoices'),
  ('perm_payments_read',     'payments',    'read',          'View payments and transactions'),
  ('perm_payments_create',   'payments',    'create',        'Record manual offline payments'),
  ('perm_refunds_read',      'refunds',     'read',          'View refund requests'),
  ('perm_refunds_process',   'refunds',     'process',       'Approve and process payment refunds'),
  -- Tasks, Workflows & Submissions
  ('perm_tasks_read',        'tasks',       'read',          'View assigned tasks'),
  ('perm_tasks_create',      'tasks',       'create',        'Create and assign tasks'),
  ('perm_tasks_update',      'tasks',       'update',        'Update task progress and state')
ON CONFLICT ("resource", "action") DO UPDATE SET
  "description" = EXCLUDED."description";

-- ------------------------------------------------------------------------------
-- 3. ROLE-PERMISSION MAPPINGS (Idempotent via ON CONFLICT DO NOTHING)
-- ------------------------------------------------------------------------------

-- FOUNDER_SUPER_ADMIN: Universal Wildcard
INSERT INTO public."role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM public."roles" r, public."permissions" p
WHERE r."code" = 'FOUNDER_SUPER_ADMIN' AND p."resource" = '*' AND p."action" = '*'
ON CONFLICT DO NOTHING;

-- ADMIN: All Operational Permissions (Excluding Wildcard)
INSERT INTO public."role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM public."roles" r, public."permissions" p
WHERE r."code" = 'ADMIN' AND NOT (p."resource" = '*' AND p."action" = '*')
ON CONFLICT DO NOTHING;

-- FINANCE_MANAGER: Invoices, Payments, Refunds, Student & User Read
INSERT INTO public."role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM public."roles" r, public."permissions" p
WHERE r."code" = 'FINANCE_MANAGER'
  AND (
    p."resource" IN ('invoices', 'payments', 'refunds')
    OR (p."resource" IN ('students', 'enrolments', 'courses', 'batches', 'users', 'roles') AND p."action" = 'read')
  )
ON CONFLICT DO NOTHING;

-- TEAM_LEADER: Tasks, Students, Batches, Courses, Enrolments
INSERT INTO public."role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM public."roles" r, public."permissions" p
WHERE r."code" = 'TEAM_LEADER'
  AND (
    p."resource" IN ('tasks')
    OR (p."resource" IN ('students', 'courses', 'batches', 'enrolments') AND p."action" IN ('read', 'update'))
  )
ON CONFLICT DO NOTHING;

-- TRAINER_FACULTY: Courses, Batches, Tasks Read, Student Read
INSERT INTO public."role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM public."roles" r, public."permissions" p
WHERE r."code" = 'TRAINER_FACULTY'
  AND (
    p."resource" IN ('courses', 'batches', 'students', 'enrolments', 'tasks') AND p."action" = 'read'
  )
ON CONFLICT DO NOTHING;

-- EMPLOYEE_INTERN: Basic Task & Profile Read
INSERT INTO public."role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM public."roles" r, public."permissions" p
WHERE r."code" = 'EMPLOYEE_INTERN'
  AND (
    p."resource" = 'tasks' AND p."action" IN ('read', 'update')
  )
ON CONFLICT DO NOTHING;

COMMIT;
