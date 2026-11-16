# SEG CRM — Phase 2D.2.10: Local Staging Environment Template Harmonization Report

**Document Version:** 1.0.0  
**Project Path:** `C:\Users\thei2s\OneDrive\문서\Desktop\Seg-CRM`  
**Classification:** DEVOPS & INFRASTRUCTURE HARMONIZATION AUDIT  

---

## 1. Summary of Changes

The staging environment example files have been updated and harmonized with the exact variable keys expected natively by Prisma 6.19.3 and NestJS 10.x.

### Modified Files:
1. **[`packages/database/.env.staging.example`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/packages/database/.env.staging.example):**
   - Replaced custom keys `STAGING_DIRECT_URL` and `STAGING_DATABASE_URL` with native Prisma keys `DIRECT_URL` and `DATABASE_URL`.
   - `DIRECT_URL`: Bound to local superuser `postgres` on port 5432 (`postgresql://postgres:[LOCAL_POSTGRES_PASSWORD]@127.0.0.1:5432/seg_crm_staging`).
   - `DATABASE_URL`: Bound to local runtime role `seg_api_app` on port 5432 (`postgresql://seg_api_app:[LOCAL_SEG_API_APP_PASSWORD]@127.0.0.1:5432/seg_crm_staging`).
   - Added explicit usage notes and credential protection instructions.
2. **[`.env.staging.example`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/.env.staging.example):**
   - Replaced custom keys with `DIRECT_URL` and `DATABASE_URL`.
   - Documented auxiliary staging configuration variables:
     - `PORT=4000`
     - `NODE_ENV=staging`
     - `CORS_ORIGIN=http://localhost:3000`
     - `JWT_SECRET=your-local-staging-jwt-secret-placeholder-min-32-chars`
     - `JWT_REFRESH_SECRET=your-local-staging-refresh-secret-placeholder`
     - Mock/local SMTP and storage configurations for isolated offline staging testing.

---

## 2. Verification of Prisma & NestJS Environment Compatibility

| Target Consumer | Expected Key | Harmonized Value Pattern in Template | Role / Privilege Bound | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Prisma CLI** (`migrate`, `push`, `diff`) | `DIRECT_URL` | `postgresql://postgres:[PWD]@127.0.0.1:5432/seg_crm_staging` | `postgres` (Superuser / Schema Owner) | **HARMONIZED** |
| **Prisma Client Runtime** (`@prisma/client`) | `DATABASE_URL` | `postgresql://seg_api_app:[PWD]@127.0.0.1:5432/seg_crm_staging` | `seg_api_app` (Least-Privilege DML Role) | **HARMONIZED** |
| **NestJS Server Port** | `PORT` | `4000` | Port Binding | **HARMONIZED** |
| **Node Environment** | `NODE_ENV` | `staging` | Process Mode | **HARMONIZED** |
| **JWT Access Secret** | `JWT_SECRET` | Placeholder (min 32 chars) | Cryptographic Token Hash | **HARMONIZED** |
| **JWT Refresh Secret** | `JWT_REFRESH_SECRET` | Placeholder | Refresh Token Hash | **HARMONIZED** |

---

## 3. NestJS `ConfigModule` Staging Loading Analysis & Recommendation

### Current Configuration:
In `apps/api/src/app.module.ts`:
```typescript
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ['.env.local', '.env'],
})
```

### Analysis of Loading Behavior:
1. NestJS checks `envFilePath` array elements in order: `.env.local` first, then `.env`.
2. Existing system environment variables (`process.env`) take precedence over `.env` files unless `ignoreEnvVars: true` is configured.
3. `.env.staging` is **NOT** in the default `envFilePath` list.

### Recommended Safe Loading Strategies:
- **Strategy A (Zero Code Change - Recommended for Local Testing):**
  When running local staging rehearsal, the developer copies `.env.staging` to `apps/api/.env.local`.  
  Because `.env.local` is evaluated first and is strictly Git-ignored ([`.gitignore:22:.env*.local`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/.gitignore#L22)), it cleanly overrides `.env` for local testing without modifying application code or impacting production.
- **Strategy B (Environment-Driven NestJS Config - Optional Future Enhancement):**
  Update `envFilePath` dynamically based on `NODE_ENV`:
  ```typescript
  envFilePath: [
    `.env.${process.env.NODE_ENV || 'development'}.local`,
    `.env.${process.env.NODE_ENV || 'development'}`,
    '.env.local',
    '.env',
  ]
  ```
  *Recommendation:* Use **Strategy A** for the current migration rehearsal phase to maintain 100% application code invariance.

---

## 4. Git Ignore Verification

Git-ignore rules were verified using `git check-ignore -v`:
- `.gitignore:25:.env.staging .env.staging` — **IGNORED**
- `.gitignore:25:.env.staging packages/database/.env.staging` — **IGNORED**
- `.gitignore:25:.env.staging apps/api/.env.staging` — **IGNORED**
- `.gitignore:22:.env*.local .env.local` — **IGNORED**
- `.gitignore:22:.env*.local apps/api/.env.local` — **IGNORED**

Real staging credentials and `.local` override files are strictly prevented from entering Git history.

---

## 5. Configuration Risks & Guardrails

1. **Accidental Production Targeting:**  
   If a developer runs `prisma migrate dev` without setting `DIRECT_URL` to local staging, Prisma CLI defaults to whatever is configured in `packages/database/.env` (which points to Supabase).  
   *Guardrail:* Keep staging connection variables explicitly loaded in `packages/database/.env.local` or directly in `packages/database/.env` during the rehearsal window.
2. **Credential Leakage in Templates:**  
   *Guardrail:* Verified that both `.env.staging.example` files contain strictly sanitized placeholder strings (`[LOCAL_POSTGRES_PASSWORD]`, `[LOCAL_SEG_API_APP_PASSWORD]`) and zero actual credentials.

---

## 6. Single Next Recommended Action

**Verify that the local PostgreSQL 17 Windows service is started, connect via `psql -U postgres -p 5432`, and execute `CREATE DATABASE seg_crm_staging;` to prepare the clean target database for migration rehearsal.**
