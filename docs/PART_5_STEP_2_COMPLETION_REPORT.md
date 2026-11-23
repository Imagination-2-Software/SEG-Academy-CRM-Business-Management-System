# SEG CRM — Part 5, Step 2: Request Correlation ID Tracking & Structured Audit Interceptor Report

**Document Date:** November 17, 2026  
**Module:** `apps/api` (`@seg/api`)  
**Shared Workspaces:** `packages/database`, `packages/types`, `apps/web`  
**Database Engine:** PostgreSQL 17.12 (Local Staging) / Supabase compatible  
**Security Standard:** OWASP Top 10 API Security / ASVS Level 2+  
**Status / Verdict:** **PASS (All 83 Tests Passing, Zero Type Errors, Clean Production Build Across All Workspaces)**

---

## 1. Exact Roadmap Task Identified

In Part 5 Step 1, the centralized success response envelope (`ResponseInterceptor`) and centralized error response envelope (`GlobalExceptionFilter`) were established.

To complete the foundational observability, distributed tracing, and request audit architecture across the modular monolith, **Part 5, Step 2: Request Correlation ID Tracking & Structured Request Logging Foundation** was implemented. This directly completes:
1. Universal request correlation (`X-Correlation-ID`) across incoming HTTP requests and outgoing responses.
2. Direct propagation of `correlationId` into the standard API success envelopes and standard error envelopes.
3. Injection of `correlationId` into `AuditLog` database payloads for end-to-end audit traceability.
4. Structured HTTP request logging interceptor (`RequestLoggingInterceptor`) capturing method, URL, status code, latency (ms), IP address, and user agent without leaking sensitive authentication credentials.

---

## 2. Master Requirement Alignment

1. **`docs/ARCHITECTURE.md`:**
   - Adheres to the Modular Monolith structure.
   - Enforces strict security boundaries (correlation ID propagates through headers and logs without exposing database connection details or secrets).
2. **`docs/DATABASE_ARCHITECTURE.md`:**
   - Correlates user and system actions directly to the `AuditLog` model (`audit_logs` table), enabling full administrative visibility into security events and financial transactions.
3. **`packages/database/prisma/schema.prisma`:**
   - Integrates with the existing `AuditLog` model (`payload: Json?`) by embedding the `correlationId` safely into the metadata snapshot.
4. **Preservation of Completed Work:**
   - Preserves all 79 existing tests from Parts 1–4 and Part 5 Step 1.
   - No modifications to database schema or migrations.

---

## 3. Files Created and Modified

| File | Status | Description |
| :--- | :--- | :--- |
| `apps/api/src/common/middleware/correlation-id.middleware.ts` | **Created** | NestJS middleware extracting or generating UUIDv4 `x-correlation-id` and attaching it to Express request and response headers. |
| `apps/api/src/common/interceptors/request-logging.interceptor.ts` | **Created** | Global HTTP interceptor logging structured request execution metrics with correlation ID and latency. |
| `apps/api/src/common/middleware/__tests__/correlation-id.middleware.spec.ts` | **Created** | Unit tests verifying UUIDv4 generation, header propagation, and custom client tracer preservation. |
| `apps/api/src/common/interceptors/__tests__/request-logging.interceptor.spec.ts` | **Created** | Unit tests verifying structured logging across successful and failed request executions. |
| `apps/api/src/common/interceptors/response.interceptor.ts` | **Modified** | Updated to include `correlationId` in the standard response envelope. |
| `apps/api/src/common/filters/global-exception.filter.ts` | **Modified** | Updated to include `correlationId` in the standard error response envelope. |
| `apps/api/src/audit/audit.service.ts` | **Modified** | Added optional `correlationId` to `AuditLogData`, persisting it into `payload` for traceability. |
| `apps/api/src/common/index.ts` | **Modified** | Barrel exports for middleware and interceptors. |
| `apps/api/src/app.module.ts` | **Modified** | Registered `CorrelationIdMiddleware` for all routes and `RequestLoggingInterceptor` as a global interceptor. |
| `apps/api/package.json` | **Modified** | Updated test runner script to include middleware and logging interceptor tests. |
| `docs/PART_5_STEP_2_COMPLETION_REPORT.md` | **Created** | Formal engineering completion report. |

---

## 4. Implementation Details

### 4.1 Correlation ID Middleware (`CorrelationIdMiddleware`)
- **Header:** `x-correlation-id` (`CORRELATION_ID_HEADER`).
- **Behavior:**
  - If the client supplies an `x-correlation-id` header (e.g. from the Next.js frontend or an API gateway), it is sanitized and reused.
  - If omitted, a cryptographically secure UUIDv4 is generated via Node.js `crypto.randomUUID()`.
- **Propagation:**
  - Attached to `req.correlationId`.
  - Set on the response header via `res.setHeader('x-correlation-id', correlationId)` so the caller can track the request.

### 4.2 Standard API Envelope Integration
Both success and error envelopes now include the request's unique `correlationId`:

**Success Envelope Example:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Request completed successfully",
  "data": { ... },
  "timestamp": "2026-11-17T07:25:35.000Z",
  "path": "/api/v1/users",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Envelope Example:**
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Missing Authorization header.",
  "error": "Unauthorized",
  "timestamp": "2026-11-17T07:25:35.000Z",
  "path": "/api/v1/users",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 4.3 Structured Request Logging (`RequestLoggingInterceptor`)
Logs high-signal structured output:
```
[Nest] LOG [HTTP] [550e8400-e29b-41d4-a716-446655440000] GET /api/v1/health 200 - 3ms [127.0.0.1] "Mozilla/5.0..."
[Nest] WARN [HTTP] [550e8400-e29b-41d4-a716-446655440000] POST /api/v1/auth/login 401 - 12ms [127.0.0.1] "Mozilla/5.0..." (Failed: Invalid email or password)
```

---

## 5. Security & Business-Rule Considerations

1. **No Sensitive Data Exposure:** Request bodies, passwords, refresh tokens, and database secrets are never logged in HTTP tracing.
2. **Audit Log Correlation:** Security events (`USER_LOGIN`, `PASSWORD_RESET_COMPLETED`, `USER_ROLE_REASSIGNED`) can now be tied back to exact HTTP requests and gateway logs via `correlationId`.
3. **Fail-Safe Execution:** The middleware and logging interceptor do not block requests or swallow exceptions.

---

## 6. Automated Test Results

Executed via Node.js native test runner:
```bash
npm --prefix apps/api test
```

### Complete Test Results (83 Tests Across 15 Test Suites — 100% Passing):
1. **CorrelationIdMiddleware Unit Tests (2/2 PASSED):**
   - Generates a new UUIDv4 correlation ID when none is provided.
   - Preserves and propagates existing client-supplied correlation ID.
2. **RequestLoggingInterceptor Unit Tests (2/2 PASSED):**
   - Logs successful request execution with correlation ID and duration.
   - Logs failed request execution safely without breaking error flow.
3. **ResponseInterceptor Unit Tests (5/5 PASSED)**
4. **GlobalExceptionFilter Unit Tests (11/11 PASSED)**
5. **Part 4 Step 6 Auth Integration Tests (8/8 PASSED)**
6. **AuthService Rotation & Revocation Tests (5/5 PASSED)**
7. **Authorization Guards (JwtAuthGuard, RolesGuard, PermissionsGuard) Tests (14/14 PASSED)**
8. **PasswordResetService & EmailVerification Tests (11/11 PASSED)**
9. **PasswordService (Argon2id & Token Hashing) Tests (6/6 PASSED)**
10. **TokenService (JWT Signing & Verifying) Tests (4/4 PASSED)**
11. **RolesService Tests (1/1 PASSED)**
12. **UsersService & Role Assignment Tests (14/14 PASSED)**

**Grand Total:** **83 passed, 0 failed, 0 skipped** (Execution time: ~8.0s)

---

## 7. Type-Check and Build Results

- **`apps/api` Type Check:** Passed (`tsc --noEmit` &rarr; 0 errors).
- **`apps/api` Build:** Passed (`nest build` &rarr; clean compilation to `dist/`).
- **`apps/web` Type Check:** Passed (0 errors).
- **`packages/database` Type Check:** Passed (0 errors).
- **`packages/types` Type Check:** Passed (0 errors).

---

## 8. Database / Schema Impact

- **Schema Changes:** 0 modifications to `packages/database/prisma/schema.prisma`.
- **Database Migrations:** 0 migrations run.
- **SQL Execution:** 0 queries executed against staging or production.

---

## 9. Final Verdict

### **Verdict: PASS**
Part 5, Step 2 is fully implemented, verified, and active across the SEG CRM API.

*Step 2 complete. Stopped per instructions. Do not start Step 3 without authorization.*
