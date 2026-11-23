# SEG CRM — Phase 2D: Focused Row-Level Security (RLS) Security Audit Report

**Document Version:** 1.0.0  
**Target Migration Script:** [`docs/migrations-review/initial_migration_integrated.sql`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/docs/migrations-review/initial_migration_integrated.sql)  
**Target Schemas:** [`packages/database/prisma/schema.proposed.prisma`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/packages/database/prisma/schema.proposed.prisma)  
**Architecture Context:** [`docs/DATABASE_ARCHITECTURE.md`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/docs/DATABASE_ARCHITECTURE.md)  
**Classification:** DATA ACCESS SECURITY & AUTHORIZATION BOUNDARY AUDIT  

---

## 1. Executive Summary & Core Architectural Finding

This audit inspects the security model and authorization boundaries across SEG CRM's database tier, evaluating whether PostgreSQL Row-Level Security (RLS) is required for local PostgreSQL staging, how application-layer RBAC interacts with database permissions, and the distinct security implications of running on a private local PostgreSQL instance versus public-facing Supabase infrastructure.

### Primary Architectural Conclusion:
1. **The Three-Tier Architecture Model:** SEG CRM is an **Internal Enterprise Application** using a classic three-tier architecture:
   $$\text{Browser / Client} \xrightarrow[\text{HTTPS / JWT}]{\text{Encrypted REST API}} \text{NestJS Backend (AuthZ / RBAC)} \xrightarrow[\text{Direct TCP Session}]{\text{Prisma ORM}} \text{PostgreSQL 17}$$
2. **Authorization Trust Boundary:** All human authentication (Argon2id password verification, cryptographic JWT tokens), tenant isolation, role-based access control (RBAC), and permission checking reside within the NestJS API layer (`@seg/api`).
3. **Database Connection Model:** The application does **NOT** use Supabase PostgREST (direct client-to-database queries via `@supabase/supabase-js`). The database is accessed exclusively by backend services connecting with dedicated system roles (`seg_api_app`, `seg_api_webhook`).
4. **Current RLS State in Migration Script:** There are currently **NO `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` statements and NO `CREATE POLICY` statements** in `initial_migration_integrated.sql`.

---

## 2. In-Depth Security Verification Across Key Areas

### A. Is RLS Required for the Local PostgreSQL Deployment?
- **Finding:** **NO, RLS is NOT strictly required for local PostgreSQL staging.**
- **Technical Justification:**
  - In a local development or private staging environment, the PostgreSQL instance listens on loopback (`127.0.0.1:5432`) or an internal private network.
  - End users and external clients have zero direct network reachability to PostgreSQL port 5432.
  - All database queries originate from the NestJS application container via `@prisma/client`.
  - Adding PostgreSQL RLS to a pure Prisma/NestJS stack without passing user session context into database session variables (`current_setting()`) would either:
    1. Filter out all rows if policies require an authenticated Supabase JWT context (`auth.uid()`), OR
    2. Require extensive overhead setting transactional GUC variables on every connection checkout from the Prisma connection pool.

---

### B. Is Application Authorization Enforced Through NestJS Backend RBAC?
- **Finding:** **YES, 100% of fine-grained user and role authorization is enforced at the NestJS backend boundary.**
- **Evidence & Verification:**
  - As established in [`docs/DATABASE_ARCHITECTURE.md`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/docs/DATABASE_ARCHITECTURE.md) and confirmed in the Phase 2D.1.8/2D.1.9 audits:
    - User authentication verifies cryptographically signed JWTs (`req.user.employeeId`).
    - RBAC guards verify role permissions against the 5 system roles (`FOUNDER_SUPER_ADMIN`, `ADMIN`, `FINANCE_MANAGER`, `COUNSELOR`, `BRANCH_HEAD`).
    - Client requests cannot spoof actor identity (e.g. `processedById` on refunds is derived strictly from `req.user.employeeId`, never accepted from client payloads).
  - Database triggers provide **defense-in-depth safety invariants** (e.g., verifying that the referenced employee in `processedById` possesses an authorized role in `employees` $\rightarrow$ `users` $\rightarrow$ `roles`), but the primary access control enforcement point is NestJS.

---

### C. Do Any Tables Require PostgreSQL RLS Policies?
- **Finding:** **For the local/staging deployment, NO tables require RLS.**
- **Nuanced Production Consideration (Supabase Direct Exposure):**
  - If SEG CRM's cloud Supabase project ever enables the Supabase Data API (PostgREST) on `public` schema tables, any table without RLS enabled would be exposed to anonymous or authenticated Supabase client keys (`anon` / `service_role`).
  - **Critical Mitigation:** In SEG CRM, the entire Supabase Data API / PostgREST should be disabled, or the `anon` and `authenticated` roles in Supabase must have all privileges revoked on schema `public`.
  - If PostgREST cannot be disabled in Supabase, an explicit defense-in-depth blanket policy `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` (with zero permissive policies for `anon`/`authenticated`) must be applied across all 26 tables.

---

### D. Do Current `GRANT` Permissions Expose Data if the Backend Is Bypassed?
- **Inspection of SQL Grants (Lines 1488–1497):**
  ```sql
  -- Runtime Application Role (seg_api_app)
  GRANT USAGE ON SCHEMA public TO seg_api_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO seg_api_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO seg_api_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO seg_api_app;

  -- Webhook Confirmation Role (seg_api_webhook)
  GRANT USAGE ON SCHEMA public TO seg_api_webhook;
  GRANT SELECT ON public."payments", public."invoices" TO seg_api_webhook;
  GRANT EXECUTE ON FUNCTION public.confirm_online_payment(TEXT, TEXT, TEXT, TIMESTAMP(3)) TO seg_api_webhook;
  ```
- **Risk Assessment:**
  1. **If Backend is Bypassed via Direct Credentials:**
     - If an attacker obtains the credentials for `seg_api_app`, they can query and mutate tables directly over TCP port 5432.
     - However, database triggers actively restrict what `seg_api_app` can do:
       - Confirmed payments and finalized invoices cannot be edited or deleted.
       - Online payments cannot be directly confirmed via DML (Lines 1085–1090).
       - Refunds cannot be directly created in `CONFIRMED` status.
  2. **Webhook Role (`seg_api_webhook`):**
     - Completely isolated. Holds **zero** `INSERT`, `UPDATE`, or `DELETE` privileges.
     - Can only invoke the restricted `confirm_online_payment()` function.
  3. **Residual Exposure:**
     - In the absence of RLS, whoever holds `seg_api_app` credentials can read all rows (`SELECT`) across all tables. This is standard and expected for a dedicated application connection pooler user in a three-tier architecture.

---

### E. Supabase-Specific RLS Requirements vs. Local PostgreSQL

| Dimension | Local PostgreSQL 17 Staging | Cloud Supabase Production |
| :--- | :--- | :--- |
| **Network Exposure** | Loopback / Private Docker network (`127.0.0.1:5432`) | Publicly resolvable cloud endpoint (`aws-1-ap-south-1.pooler.supabase.com`) |
| **API Gateway Layer** | None. Pure PostgreSQL TCP daemon. | Supabase PostgREST, Realtime, and Storage APIs co-exist on the project ref. |
| **Default PostgREST Behavior**| N/A | Exposes schema `public` over HTTPS if `anon` key is enabled and tables lack RLS. |
| **Supabase Security Linter** | N/A | Flags `WARN: RLS Disabled on Public Table` in Supabase Studio. |
| **Recommendation** | Keep RLS disabled to maximize query performance and avoid connection pooler overhead. | Enable RLS with **deny-all default** on `anon`/`authenticated` to prevent accidental PostgREST exposure, while allowing `seg_api_app` to operate via direct connection. |

---

## 3. Comprehensive Table-Wise RLS & Security Findings

| # | Table Name | Business Sensitivity | Application AuthZ Control | Direct DML Protection in SQL Triggers | RLS Requirement (Local Staging) | RLS Recommendation (Cloud Supabase) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **1** | `users` | **Critical** (Credentials/Auth) | NestJS AuthGuard | None (Protected by app) | **Not Required** | Enable Deny-All for PostgREST |
| **2** | `refresh_tokens` | **Critical** (Sessions) | NestJS Token Service | Cascade delete on user | **Not Required** | Enable Deny-All for PostgREST |
| **3** | `roles` | **High** (System RBAC) | NestJS RolesGuard | Static seed data | **Not Required** | Enable Deny-All for PostgREST |
| **4** | `permissions` | **High** (System RBAC) | NestJS RolesGuard | Static seed data | **Not Required** | Enable Deny-All for PostgREST |
| **5** | `role_permissions` | **High** (RBAC Mapping) | NestJS RolesGuard | Static seed data | **Not Required** | Enable Deny-All for PostgREST |
| **6** | `departments` | Medium | NestJS AdminGuard | FK Restrict on delete | **Not Required** | Enable Deny-All for PostgREST |
| **7** | `teams` | Medium | NestJS AdminGuard | FK Restrict on delete | **Not Required** | Enable Deny-All for PostgREST |
| **8** | `employees` | **High** (PII / Payroll) | NestJS EmployeeService | Referenced in triggers | **Not Required** | Enable Deny-All for PostgREST |
| **9** | `intern_details` | Medium (PII) | NestJS EmployeeService | FK Cascade on employee | **Not Required** | Enable Deny-All for PostgREST |
| **10** | `students` | **Critical** (PII) | NestJS CounselorGuard | FK Restrict on delete | **Not Required** | Enable Deny-All for PostgREST |
| **11** | `student_documents` | **Critical** (Private Files) | NestJS DocumentService | Storage key abstraction | **Not Required** | Enable Deny-All for PostgREST |
| **12** | `courses` | Low (Catalog) | Public within app | FK Restrict on delete | **Not Required** | Enable Deny-All for PostgREST |
| **13** | `batches` | Medium (Schedules) | NestJS AcademicGuard | FK Restrict on delete | **Not Required** | Enable Deny-All for PostgREST |
| **14** | `enrolments` | **High** (Academic) | NestJS Counselor/Admin | FK Restrict on delete | **Not Required** | Enable Deny-All for PostgREST |
| **15** | `invoices` | **Critical** (Financial) | NestJS FinanceGuard | **`trg_invoice_finalization`** | **Not Required** | Enable Deny-All for PostgREST |
| **16** | `invoice_items` | **Critical** (Financial) | NestJS FinanceGuard | **`trg_invoice_item_immutability`**| **Not Required** | Enable Deny-All for PostgREST |
| **17** | `credit_notes` | **Critical** (Financial) | NestJS FinanceGuard | Financial adjustments | **Not Required** | Enable Deny-All for PostgREST |
| **18** | `debit_notes` | **Critical** (Financial) | NestJS FinanceGuard | Financial adjustments | **Not Required** | Enable Deny-All for PostgREST |
| **19** | `payments` | **Critical** (Financial) | NestJS Finance/Webhook | **`trg_payment_immutability`** | **Not Required** | Enable Deny-All for PostgREST |
| **20** | `refunds` | **Critical** (Financial) | NestJS FinanceManager | **`trg_refund_immutability`** | **Not Required** | Enable Deny-All for PostgREST |
| **21** | `tasks` | Medium (Operational) | NestJS TaskGuard | FK Restrict on delete | **Not Required** | Enable Deny-All for PostgREST |
| **22** | `assignments` | Medium (Academic) | NestJS AcademicGuard | FK Cascade on batch | **Not Required** | Enable Deny-All for PostgREST |
| **23** | `submissions` | Medium (Academic) | NestJS AcademicGuard | FK Cascade on delete | **Not Required** | Enable Deny-All for PostgREST |
| **24** | `submission_reviews`| Medium (Academic) | NestJS AcademicGuard | FK Restrict on reviewer | **Not Required** | Enable Deny-All for PostgREST |
| **25** | `notifications` | Low | NestJS NotificationService | Cascade delete on user | **Not Required** | Enable Deny-All for PostgREST |
| **26** | `audit_logs` | **Critical** (Security) | NestJS AuditInterceptor | Immutable audit trail | **Not Required** | Enable Deny-All for PostgREST |

---

## 4. Risks & Concrete Recommendations

### Risk 1: Accidental Supabase Data API Exposure (Cloud Only)
- **Risk:** In Supabase, if the project is deployed with PostgREST active and RLS disabled, anyone holding the public `anon` key could query table endpoints (e.g. `GET https://[PROJECT-REF].supabase.co/rest/v1/invoices`).
- **Severity:** High (in Cloud Supabase production if PostgREST is exposed). Zero risk in local PostgreSQL.
- **Recommended Remediation:**
  1. Revoke PostgREST access on the `public` schema for `anon` and `authenticated` roles in Supabase:
     ```sql
     REVOKE ALL ON SCHEMA public FROM anon, authenticated;
     ```
  2. Or, during cloud deployment preparation, add defense-in-depth table locks:
     ```sql
     DO $$
     DECLARE
       tbl text;
     BEGIN
       FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
         EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
       END LOOP;
     END $$;
     ```
     *(Because no permissive policies are created for `anon` or `authenticated`, PostgREST returns empty / 401, while `seg_api_app` continues unrestricted when connected directly via session port 5432).*

### Risk 2: Application Credential Compromise
- **Risk:** If the `.env` file containing `seg_api_app`'s password is leaked, an attacker can connect via `psql` and view all data.
- **Mitigation:**
  - `seg_api_app` is stripped of `SUPERUSER`, `BYPASSRLS`, `ALTER TABLE`, and trigger administration privileges.
  - Core financial integrity remains enforced even under compromised application credentials: confirmed payments, finalized invoices, and processed refunds cannot be altered or deleted.
  - Keep production database credentials in secure secrets storage (AWS Secrets Manager / Vault) rather than plain-text filesystem files on production servers.

---

## 5. Audit Verdict

### **AUDIT VERDICT: PASS FOR LOCAL STAGING (NO RLS BLOCKERS)**

- **Local PostgreSQL 17 Staging:** RLS is **not required**. The three-tier NestJS backend architecture fully enforces authorization, tenant boundaries, and actor identity.
- **Cloud Deployment Prerequisite:** When transitioning to Supabase production, explicitly revoke `anon`/`authenticated` schema permissions or enable defense-in-depth RLS on all 26 tables to silence the Supabase security linter and neutralize PostgREST exposure.
