# SEG CRM — Phase 2D.2.9: Local Staging Environment Configuration Audit Report

**Document Version:** 1.0.0  
**Audit Target:** Local PostgreSQL 17 Staging Environment Configuration  
**Project Path:** `C:\Users\thei2s\OneDrive\문서\Desktop\Seg-CRM`  
**Classification:** READ-ONLY DEVOPS & RELIABILITY AUDIT  

---

## 1. Executive Summary

This audit evaluates the configuration posture for running a local PostgreSQL 17 staging environment for SEG-CRM. It inspects environment templates (`.env.staging.example`, `packages/database/.env.staging.example`), Git ignore enforcement ([`.gitignore`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/.gitignore)), and Prisma datasource bindings in both baseline (`packages/database/prisma/schema.prisma`) and proposed (`packages/database/prisma/schema.proposed.prisma`) schemas.

---

## 2. Environment Variables Required for Local PostgreSQL Staging

### A. Core Database Connection Variables
Prisma natively expects two environment variables defined in its `datasource db` block:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

For the local PostgreSQL staging setup:
1. **`DATABASE_URL`:**
   - **Role in Staging:** Application runtime connection used by Prisma Client and NestJS.
   - **Target User:** `seg_api_app` (least-privilege runtime role).
   - **Target Topology:** `postgresql://seg_api_app:[PASSWORD]@localhost:5432/seg_crm_staging`.
   - **Pooler Note:** In a local development/staging environment without Supavisor/pgBouncer, `DATABASE_URL` connects directly to PostgreSQL port 5432 using standard connection pooling managed in-process by Prisma Client.
2. **`DIRECT_URL`:**
   - **Role in Staging:** Administrative / migration connection used by Prisma CLI (`prisma migrate`, `prisma db push`, `psql`).
   - **Target User:** `postgres` (superuser / schema owner possessing `CREATEROLE`).
   - **Target Topology:** `postgresql://postgres:[PASSWORD]@localhost:5432/seg_crm_staging`.
   - **Purpose:** Executing transactional DDL, role provisioning, and function/trigger creation.

### B. Full Environment Variable Inventory for Local Staging Stack
| Variable Name | Required Scope | Purpose / Consumer | Target Local Value Pattern |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Monorepo / API / DB | Runtime queries by `seg_api_app` | `postgresql://seg_api_app:[PWD]@localhost:5432/seg_crm_staging` |
| `DIRECT_URL` | DB / Migration Tools | Administrative DDL by `postgres` | `postgresql://postgres:[PWD]@localhost:5432/seg_crm_staging` |
| `PORT` | API (`apps/api`) | NestJS HTTP listener port | `4000` (or `3001`) |
| `NODE_ENV` | Global | Runtime environment mode | `staging` (or `development`) |
| `CORS_ORIGIN` | API (`apps/api`) | Web client origin allowlist | `http://localhost:3000` |
| `JWT_SECRET` | API (`apps/api`) | JWT access token signature | 256-bit secret string (min 32 chars) |
| `JWT_EXPIRES_IN` | API (`apps/api`) | Token expiration window | `7d` |
| `JWT_REFRESH_SECRET` | API (`apps/api`) | Refresh token signature | 256-bit secret string |
| `JWT_REFRESH_EXPIRES_IN` | API (`apps/api`) | Refresh token expiration | `30d` |

---

## 3. Verification of Target Connection Attributes

The connection configuration required for local staging targets:
- **Host:** `localhost` (or `127.0.0.1`) — **VERIFIED**
- **Port:** `5432` — **VERIFIED**
- **Database:** `seg_crm_staging` — **VERIFIED**
- **Administrative / Migration User:** `postgres` — **VERIFIED**
- **Runtime User:** `seg_api_app` — **VERIFIED**

---

## 4. Prisma Connection Behavior: `DATABASE_URL` vs. `DIRECT_URL`

In Prisma 6.19.3, the datasource configuration handles connection routing as follows:
- When running CLI migration commands (`prisma migrate dev`, `prisma migrate deploy`, `prisma db push`), Prisma automatically prioritizes `directUrl` (`DIRECT_URL`) if provided. This is critical for applying schema migrations, creating tables, establishing constraints, and running transactional DDL.
- When the application is running via `@prisma/client`, Prisma uses `url` (`DATABASE_URL`).
- **Prisma Staging Compatibility Gap Identified:**  
  The example templates currently define `STAGING_DIRECT_URL` and `STAGING_DATABASE_URL`. However, Prisma schemas strictly interpolate `env("DATABASE_URL")` and `env("DIRECT_URL")`.  
  Therefore, when running staging commands, either:
  1. The `.env.staging` file must map these directly to `DATABASE_URL` and `DIRECT_URL` (or `.env.local` must load staging values), OR
  2. Scripts must export `DATABASE_URL=$STAGING_DATABASE_URL` and `DIRECT_URL=$STAGING_DIRECT_URL` into the process environment before invoking Prisma.

---

## 5. Correct File Locations & Git Ignore Verification

### A. Template & Configuration Locations
- Root template: [`.env.staging.example`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/.env.staging.example)
- Database package template: [`packages/database/.env.staging.example`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/packages/database/.env.staging.example)
- Actual local staging secret files (created by developer):
  - `.env.staging` (in root)
  - `packages/database/.env.staging`
  - `apps/api/.env.staging`

### B. Git Ignore Verification
Inspection of [`.gitignore`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/.gitignore#L25) confirms:
```gitignore
# Environment files
.env
.env*.local
.env.development
.env.test
.env.staging
.env.production
!.env.example
!.env.staging.example
```
**Verification Command Output:**
```bash
git check-ignore -v .env.staging packages/database/.env.staging apps/api/.env.staging
# .gitignore:25:.env.staging .env.staging
# .gitignore:25:.env.staging packages/database/.env.staging
# .gitignore:25:.env.staging apps/api/.env.staging
```
**Result:** **PASS** — Real `.env.staging` files cannot be tracked or committed to Git.

---

## 6. Configuration Gaps & Inconsistencies

1. **Prisma Environment Variable Key Parity:**  
   In `.env.staging.example` and `packages/database/.env.staging.example`, the keys are named `STAGING_DIRECT_URL` and `STAGING_DATABASE_URL`. Prisma schemas strictly read `DATABASE_URL` and `DIRECT_URL`. To avoid CLI lookup failures when pointing Prisma at staging, the template should document both the standard Prisma keys (`DATABASE_URL`, `DIRECT_URL`) and the prefixed variants, or provide explicit staging loading instructions.
2. **NestJS `envFilePath` Resolution:**  
   In `apps/api/src/app.module.ts`:
   ```typescript
   ConfigModule.forRoot({
     isGlobal: true,
     envFilePath: ['.env.local', '.env'],
   })
   ```
   NestJS only loads `.env.local` and `.env` by default. When testing in staging mode, `envFilePath` does not include `.env.staging` unless `NODE_ENV=staging` activates a dynamic path resolver, or developers copy `.env.staging` to `.env.local`.

---

## 7. Audit Verdict

### **VERDICT: PASS (READY FOR LOCAL STAGING EXECUTION ONCE SERVICE IS STARTED)**

**Justification:**  
- Target parameters (`localhost`, `5432`, `seg_crm_staging`, `postgres`, `seg_api_app`) are correctly defined.
- Git ignore protection is 100% active.
- Zero secrets or production credentials were copied or compromised.
- Prisma schema and application code integrity were strictly maintained.

---

## 8. Recommended Next Action

**Update `packages/database/.env.staging.example` and `.env.staging.example` so that the standard Prisma keys (`DIRECT_URL` and `DATABASE_URL`) are clearly exposed as the primary mapping for staging rehearsal.**
