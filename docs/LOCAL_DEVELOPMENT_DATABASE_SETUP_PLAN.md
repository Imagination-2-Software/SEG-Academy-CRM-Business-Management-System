# SEG Academy CRM – Local Development Database Setup Plan

## Executive Summary

Currently, local execution of both the frontend (Next.js port 3000) and backend (NestJS port 4000) connects directly to the **live production Supabase PostgreSQL database** (`aws-1-ap-south-1.pooler.supabase.com` and `db.hlpurduzwwhyiugmoyax.supabase.co`).

Running tests, executing seed scripts, applying schema migrations, or developing features against this environment carries significant risk of data corruption, schema conflicts, or test residue appearing in production records.

This plan details the safest, non-destructive architecture to configure a completely isolated development database and storage environment while guaranteeing zero interference with production.

---

## 1. Current Architecture vs. Target Isolated Architecture

```mermaid
flowchart TD
    subgraph Current_State["Current State (Direct to Production)"]
        LocalDevApp["Local Dev Server (Ports 3000 & 4000)"]
        ProdEnv[".env (Root & Packages)"]
        ProdSupabaseDB[("Live Production Supabase DB\nhlpurduzwwhyiugmoyax")]
        ProdStorage["Production Supabase Storage\n(seg-crm-documents)"]

        LocalDevApp --> ProdEnv
        ProdEnv --> ProdSupabaseDB
        ProdEnv --> ProdStorage
    end

    subgraph Proposed_State["Recommended Isolated State"]
        DevApp["Local Dev Server (Ports 3000 & 4000)"]
        DevEnv[".env.local (Git Ignored)"]
        DevSupabaseDB[("Isolated Supabase Dev DB\n(Dedicated Project)")]
        DevStorage["Isolated Dev Storage Bucket\n(seg-crm-documents-dev)"]

        ProdServer["CI / Production Deployment"]
        ProdEnvProd[".env / Platform Secrets"]
        ProdDB[("Live Production Supabase DB\nhlpurduzwwhyiugmoyax")]
        ProdStorageTarget["Production Supabase Storage\n(seg-crm-documents)"]

        DevApp --> DevEnv
        DevEnv --> DevSupabaseDB
        DevEnv --> DevStorage

        ProdServer --> ProdEnvProd
        ProdEnvProd --> ProdDB
        ProdEnvProd --> ProdStorageTarget
    end
```

---

## 2. Key Findings & Inspection Results

### 2.1 Prisma Datasource
- **Schema Location:** `packages/database/prisma/schema.prisma`
- **Configured Datasource:**
  ```prisma
  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
  }
  ```
- **Connection Mechanics:**
  - `DATABASE_URL`: Session/transaction connection pooling via Supabase Supavisor pooler (port 5432 or 6543).
  - `DIRECT_URL`: Direct PostgreSQL connection required by Prisma CLI for migrations (`prisma migrate dev` / `prisma migrate deploy`) because poolers in transaction mode do not support advisory locking and DDL transactions.

### 2.2 Environment Variable Loading Order
- **Backend (`apps/api/src/app.module.ts`):**
  ```ts
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: ['.env.local', '.env'],
    validate: validateEnvironment,
  })
  ```
  > [!IMPORTANT]
  > NestJS `ConfigModule` checks `envFilePath` in order: `.env.local` has precedence over `.env`. If `.env.local` exists, variables defined there override the ones in `.env`.
- **Frontend (`apps/web`):**
  - Next.js natively loads `.env.local` with the highest priority in development.
- **Prisma CLI (`packages/database`):**
  - Prisma CLI automatically loads `.env` located in the root or in `packages/database/`.
  - When running Prisma commands with custom environments, `dotenv-cli` or explicit environment injection is required so Prisma targets `.env.local` rather than default `.env`.

### 2.3 Storage Architecture (`apps/api/src/students/document-storage.service.ts`)
- Configured variables:
  - `STORAGE_PROVIDER`: `supabase`
  - `STORAGE_BUCKET`: `seg-crm-documents`
  - `STORAGE_ENDPOINT`: `https://<project-ref>.supabase.co/storage/v1`
  - `STORAGE_ACCESS_KEY` & `STORAGE_SECRET_KEY`
- Current behavior: KYC document uploads directly write to the remote Supabase storage bucket under the production project reference.

---

## 3. Recommended Isolation Strategy

### Option Comparison

| Feature | Option A: Dedicated Cloud Supabase Project (Recommended) | Option B: Local Docker / Supabase CLI |
| :--- | :--- | :--- |
| **Parity** | 100% identical PostgreSQL version, Supabase Auth/Storage APIs, and networking | High, but requires local Docker daemon |
| **Prerequisites** | None on host OS (no Docker or WSL required) | Docker Desktop / Engine must be running |
| **Host System Check** | Tested: `docker` and `supabase` CLI are currently **not installed** on this Windows host | Would fail immediately without installing Docker |
| **Maintenance** | Managed cloud infrastructure; zero local CPU/RAM overhead | Consumes ~2GB local RAM and disk |
| **Safety** | Complete physical database separation | Complete local separation |

> [!TIP]
> **Recommendation:** **Option A (Dedicated Supabase Development Project)**. Since Docker is not installed on this host, a separate free-tier Supabase project provides an exact replica of Supabase PostgreSQL triggers, extensions, and Storage S3 APIs without requiring local virtualization.

---

## 4. Architectural Details

### 4.1 Production vs. Development Separation

1. **Production Project (Unchanged):**
   - Reference: `hlpurduzwwhyiugmoyax`
   - Region: `ap-south-1` (Mumbai)
   - Stored in production deployment environment (Vercel, Railway, Render, etc.).
   - `.env` in the repository will continue acting as the baseline configuration template.

2. **Development Project (New Isolated Project):**
   - Reference: `<NEW_DEV_PROJECT_REF>` (e.g. `seg-crm-dev-xxxx`)
   - Region: `ap-south-1` (Mumbai)
   - Direct connection: `db.<NEW_DEV_PROJECT_REF>.supabase.co:5432`
   - Pooler connection: `aws-1-ap-south-1.pooler.supabase.com:5432` (or port 6543)
   - S3/Storage Bucket: `seg-crm-documents-dev`

### 4.2 Local Environment Variable Precedence (`.env.local`)
Create `.env.local` in the project root (and symlink or mirror to `packages/database/.env.local`). `.env.local` is already ignored in `.gitignore`:

```ini
# ==============================================================================
# SEG ACADEMY CRM - LOCAL DEVELOPMENT ISOLATED OVERRIDES (.env.local)
# DO NOT COMMIT TO VERSION CONTROL
# ==============================================================================

PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Isolated Dev Supabase Project
DATABASE_URL="postgresql://postgres.[DEV_REF]:[DEV_PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[DEV_PASSWORD]@db.[DEV_REF].supabase.co:5432/postgres"

# Isolated Dev Storage
STORAGE_PROVIDER=supabase
STORAGE_BUCKET=seg-crm-documents-dev
STORAGE_ENDPOINT=https://[DEV_REF].supabase.co/storage/v1
STORAGE_ACCESS_KEY=[DEV_STORAGE_KEY]
STORAGE_SECRET_KEY=[DEV_STORAGE_SECRET]

# Local URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### 4.3 Prisma Migration Workflow & Guardrails

To prevent accidental migrations against production:

1. **Package Scripts Enhancement (`packages/database/package.json`):**
   ```json
   {
     "scripts": {
       "migrate:dev": "dotenv -e ../../.env.local -- prisma migrate dev",
       "migrate:deploy": "dotenv -e ../../.env.local -- prisma migrate deploy",
       "db:push": "dotenv -e ../../.env.local -- prisma db push",
       "db:seed": "dotenv -e ../../.env.local -- ts-node prisma/seed.ts"
     }
   }
   ```
2. **Safety Check in Migration Scripts:**
   Add a pre-check script verifying that `DATABASE_URL` does NOT contain `hlpurduzwwhyiugmoyax` (the production reference) before allowing destructive migrations or seeding.

---

## 5. Implementation Roadmap (When Authorized)

```mermaid
flowchart LR
    Step1["1. Create Dev Supabase Project & Bucket"] --> Step2["2. Populate .env.local with Dev Credentials"]
    Step2 --> Step3["3. Apply Prisma Migrations to Dev DB"]
    Step3 --> Step4["4. Run RBAC & Foundation Seeds in Dev DB"]
    Step4 --> Step5["5. Restart Backend & Verify Isolation"]
```

### Step 1: Provision Isolated Cloud Resources
- Create a dedicated development project in Supabase (e.g. `seg-academy-crm-dev`).
- In Supabase Storage, create a bucket named `seg-crm-documents-dev` with private access.

### Step 2: Configure Local Environment
- Create `.env.local` containing the development project's pooled `DATABASE_URL`, direct `DIRECT_URL`, and storage keys.
- Confirm `.env.local` is present in `.gitignore`.

### Step 3: Initialize Database Schema
- Run `prisma migrate deploy` against the dev database to apply:
  - `20261125000000_init` (Core tables, roles, enums)
  - `20261125000001_financial_triggers` (Ledger, invoice, payment balance triggers)

### Step 4: Seed Test Personas
- Run `packages/database/prisma/seeds/initial_rbac_seed.sql` to populate foundational roles and permissions.
- Create synthetic test accounts for development.

### Step 5: Verification & Runtime Assertion
- Start API: `npm --prefix apps/api run start:dev`.
- Verify log output: Confirm backend connects to the dev project host.
- Verify KYC document upload: Confirm files land in `seg-crm-documents-dev`, leaving production storage untouched.

---

## 6. Pre-flight Verification Checklist

- [x] Confirmed production project reference (`hlpurduzwwhyiugmoyax`) is not touched.
- [x] Confirmed no credentials or passwords are exposed or hardcoded.
- [x] Confirmed `.gitignore` already ignores `.env.local`.
- [x] Verified host OS environment (Windows, no Docker installed).
- [x] Verified NestJS `ConfigModule` env precedence (`.env.local` over `.env`).
