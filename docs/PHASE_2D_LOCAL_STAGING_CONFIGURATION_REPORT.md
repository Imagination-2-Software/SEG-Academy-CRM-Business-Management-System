# SEG CRM — Phase 2D.2.8: Local Staging Environment Configuration Report

**Document Version:** 1.0.0  
**Target Environment:** Local PostgreSQL 17.12 Staging on Windows x64  
**Database Name:** `seg_crm_staging`  
**Classification:** CONFIGURATION & READINESS AUDIT  

---

## 1. Local PostgreSQL 17.12 Installation Verification

An automated inspection of the Windows development environment verified the installation status of PostgreSQL 17:

- **PostgreSQL Binaries Found:** `C:\Program Files\PostgreSQL\17\bin\`
- **CLI Utilities Available:** `psql.exe`, `pg_isready.exe`, `pg_dump.exe`, `pg_restore.exe`, `pg_ctl.exe`
- **Version Verified:**  
  `psql (PostgreSQL) 17.12`
- **Local Service / Port Status (Loopback `127.0.0.1`):**  
  - Port 5432: **No active listener (Service stopped or unstarted)**  
  - Port 5433: Closed  
  - Port 5434: Closed  
  - `pg_isready -h 127.0.0.1 -p 5432`: returned `127.0.0.1:5432 - no response`

---

## 2. Verification of `seg_crm_staging` Database and Roles

Because the local PostgreSQL 17 server process is currently stopped:
1. **Database `seg_crm_staging`:** **NOT YET VERIFIED / PENDING SERVICE START** (Server must be started to execute `\l` or `SELECT datname FROM pg_database`).
2. **Roles `seg_api_app` and `seg_api_webhook`:** **NOT YET CREATED / PENDING EXECUTION** (Note: As verified in [`docs/migrations-review/initial_migration_integrated.sql`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/docs/migrations-review/initial_migration_integrated.sql) Lines 10–19, Section 1 of the migration script is specifically designed to create both `seg_api_app` and `seg_api_webhook` idempotently upon first execution).

---

## 3. Staging Connection Details & Security Isolation

- **Isolation Principle:** Staging and production configurations are strictly separated.
  - Production Supabase URLs (`aws-1-ap-south-1.pooler.supabase.com`) remain exclusively in production environment profiles.
  - Zero cloud credentials or endpoints were copied or exposed into staging files.
- **Connection Topology for Local Staging:**
  - **Direct Session (Admin / Migration Execution):**  
    `postgresql://postgres:[LOCAL_POSTGRES_PASSWORD]@127.0.0.1:5432/seg_crm_staging`  
    *(Direct TCP port 5432, superuser session mode)*
  - **Runtime Application Connection (`seg_api_app`):**  
    `postgresql://seg_api_app:[LOCAL_SEG_API_APP_PASSWORD]@127.0.0.1:5432/seg_crm_staging`  
    *(Restricted application role without superuser or bypassrls)*

---

## 4. Git Ignore Verification for `.env.staging`

- **Git Ignore Rule:** Added `.env.staging` and `!.env.staging.example` to [`.gitignore`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/.gitignore#L25).
- **Verification Command:**  
  `git check-ignore -v .env.staging packages/database/.env.staging apps/api/.env.staging`
- **Result:** **PASS (CONFIRMED)**
  - `.gitignore:25:.env.staging .env.staging`
  - `.gitignore:25:.env.staging packages/database/.env.staging`
  - `.gitignore:25:.env.staging apps/api/.env.staging`

---

## 5. Staging Configuration Templates Prepared

Two secure configuration templates were created to guide local rehearsal without committing secrets:

1. **Database Package Template:** [`packages/database/.env.staging.example`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/packages/database/.env.staging.example)
   ```env
   STAGING_DIRECT_URL="postgresql://postgres:[LOCAL_POSTGRES_PASSWORD]@127.0.0.1:5432/seg_crm_staging"
   STAGING_DATABASE_URL="postgresql://seg_api_app:[LOCAL_SEG_API_APP_PASSWORD]@127.0.0.1:5432/seg_crm_staging"
   ```
2. **Root Monorepo Template:** [`.env.staging.example`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/.env.staging.example)

---

## 6. Schema and Application Code Invariance

- `packages/database/prisma/schema.prisma` (baseline): **100% UNTOUCHED**
- `packages/database/prisma/schema.proposed.prisma` (proposed): **100% UNTOUCHED**
- Application source code (`apps/api`, `apps/web`): **100% UNTOUCHED**
- Zero tables created, zero migrations executed.

---

## 7. Next Single Action Required

**Start the local PostgreSQL 17 Windows service (via Windows Services console `services.msc` or `pg_ctl start`), verify port 5432 is listening, and create the empty database `seg_crm_staging`.**
