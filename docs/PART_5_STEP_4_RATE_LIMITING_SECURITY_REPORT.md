# SEG CRM — Part 5, Step 4: API Rate Limiting & Brute-Force Protection Report

**Document Date:** November 17, 2026  
**Module:** `apps/api` (`@seg/api`)  
**Shared Workspaces:** `packages/database`, `packages/types`, `apps/web`  
**Database Engine:** PostgreSQL 17.12 (Local Staging) / Supabase compatible  
**Security Standard:** OWASP Top 10 API Security (API4:2023 Unrestricted Resource Consumption, API2:2023 Broken Authentication)  
**Status / Verdict:** **PASS (All 99 Tests Passing across 18 Suites, Zero Type Errors, Clean Production Build Across All Workspaces)**

---

## 1. Master Requirements Alignment

The SEG Academy CRM Master Requirements and System Architecture (`docs/ARCHITECTURE.md`) define a high-security, enterprise-ready modular monolith REST API serving Next.js and external integrations. 

Under Part 5, Step 4, we implemented **API Rate Limiting and Brute-Force Protection** adhering strictly to master requirements:
1. **Unrestricted Resource Consumption Mitigation**: Global rate limiting guards against Denial of Service (DoS) attacks and high-volume resource exhaustion.
2. **Credential Stuffing & Brute-Force Defense**: Strict per-route throttles protect sensitive endpoints: `/api/v1/auth/login`, `/api/v1/auth/forgot-password`, `/api/v1/auth/reset-password`, `/api/v1/auth/verify-email`, and `/api/v1/auth/resend-verification`.
3. **No Infrastructure Creep**: Built without adding unapproved external infrastructure dependencies (such as standalone Redis clusters) prior to architectural sign-off, utilizing an in-memory sliding fixed-window algorithm with proactive interval cleanup.
4. **Zero Account Enumeration or Denial-of-Service-by-Proxy**: Rate limits are keyed against verified client identifiers without permanently locking out user accounts or disclosing account presence.
5. **Architectural Consistency**: Fully integrated with the Step 1 Global Exception Filter (`GlobalExceptionFilter`), Step 1 Response Interceptor (`ResponseInterceptor`), Step 2 Correlation ID Middleware (`CorrelationIdMiddleware`), Step 2 Request Logging Interceptor (`RequestLoggingInterceptor`), and Step 3 Environment Validation (`validateEnvironment`).

---

## 2. Files Created or Modified

| File | Status | Description |
| :--- | :--- | :--- |
| `apps/api/src/common/rate-limiting/rate-limit.decorator.ts` | **Created** | Custom decorators `@RateLimit({ limit, ttlSeconds, name, keyPrefix })` and `@SkipRateLimit()`. |
| `apps/api/src/common/rate-limiting/rate-limiter-storage.service.ts` | **Created** | In-memory atomic rate-limiting bucket storage with active expired-record sweeper preventing memory exhaustion. |
| `apps/api/src/common/rate-limiting/client-ip.util.ts` | **Created** | Secure client IP extractor with anti-spoofing protection and `TRUST_PROXY` awareness. |
| `apps/api/src/common/rate-limiting/rate-limiter.guard.ts` | **Created** | Global NestJS guard enforcing global and per-endpoint rate limits, populating standard RFC headers, and throwing HTTP 429. |
| `apps/api/src/common/rate-limiting/index.ts` | **Created** | Barrel export for rate-limiting module. |
| `apps/api/src/common/rate-limiting/__tests__/rate-limiter.guard.spec.ts` | **Created** | 7 comprehensive unit tests verifying rate limits, HTTP 429 formatting, proxy security, memory cleanup, and bypass decorators. |
| `apps/api/src/common/config/env.validation.ts` | **Modified** | Added `THROTTLE_LIMIT` (default 100), `THROTTLE_TTL` (default 60), and `TRUST_PROXY` (default false) with type-safe validation. |
| `apps/api/src/app.module.ts` | **Modified** | Registered `RateLimiterStorageService` and `RateLimiterGuard` as `APP_GUARD` (executing before authentication). |
| `apps/api/src/app.controller.ts` | **Modified** | Decorated `/health`, `/health/live`, and `/health/ready` with `@SkipRateLimit()`. |
| `apps/api/src/auth/auth.controller.ts` | **Modified** | Applied strict `@RateLimit` rules to login (5/min), refresh (10/min), forgot-password (3/min), reset-password (5/min), verify-email (5/min), and resend-verification (3/min). |
| `apps/api/src/common/index.ts` | **Modified** | Re-exported rate-limiting utilities from common index. |
| `apps/api/package.json` | **Modified** | Added rate-limiting test suite to test runner script. |
| `docs/PART_5_STEP_4_RATE_LIMITING_SECURITY_REPORT.md` | **Created** | Master engineering and verification report. |

---

## 3. Rate-Limiting Strategy & Configuration

### A. Core Architecture
- **Algorithm**: Sliding Fixed-Window Rate Limiting with atomic bucket consumption.
- **Header Standards**: In accordance with IETF Draft RateLimit Specifications:
  - `X-RateLimit-Limit`: Maximum requests allowed in current window.
  - `X-RateLimit-Remaining`: Remaining request allowance.
  - `X-RateLimit-Reset`: Unix timestamp (in seconds) when window resets.
  - `Retry-After`: Seconds to wait before retrying (sent on HTTP 429).

### B. Default Global Limits
- **Requests**: 100 requests per 60 seconds per IP (configurable via `THROTTLE_LIMIT` and `THROTTLE_TTL`).
- **Scope**: Applied to all incoming API routes by default unless explicitly overridden or skipped.
- **Probe Exemption**: Infrastructure health probes (`/api/v1/health`, `/api/v1/health/live`, `/api/v1/health/ready`) are decorated with `@SkipRateLimit()` so container orchestrators (e.g. Kubernetes, AWS ECS, Docker) never fail health checks due to probe frequency.

---

## 4. Authentication Protection & Brute-Force Defense

Stricter rate limits are applied to sensitive authentication and credential endpoints:

| Endpoint | Method | Rate Limit | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | `POST` | **5 req / 60 sec** | Mitigates credential stuffing and brute-force password guessing. |
| `/api/v1/auth/refresh` | `POST` | **10 req / 60 sec** | Protects token rotation endpoints while accommodating legitimate multi-tab refreshes. |
| `/api/v1/auth/forgot-password` | `POST` | **3 req / 60 sec** | Prevents email bombarding and SMTP quota exhaustion. |
| `/api/v1/auth/reset-password` | `POST` | **5 req / 60 sec** | Prevents automated token brute-forcing on reset links. |
| `/api/v1/auth/verify-email` | `POST` | **5 req / 60 sec** | Prevents automated token brute-forcing on email links. |
| `/api/v1/auth/resend-verification` | `POST` | **3 req / 60 sec** | Prevents verification email flooding and user harassment. |

### Protection Integrity
- **No Account Enumeration**: Exceeding rate limits throws a standard HTTP 429 with `Too many requests. Please try again after X seconds.` without disclosing whether the targeted email or user exists.
- **No Permanent Account Lockouts**: Unlike aggressive permanent account lockout policies (which allow attackers to DoS legitimate users simply by failing passwords intentionally), IP-based rate limiting with window expiration protects the account while allowing the legitimate user to log in after the cooldown.
- **Replay Protection Intact**: Refresh token replay detection (established in Part 4) remains active and independent of rate limits.

---

## 5. Proxy & Deployment Considerations

### A. Anti-Spoofing IP Resolution (`client-ip.util.ts`)
- Client-supplied headers like `X-Forwarded-For` or `X-Real-IP` are **untrusted by default**.
- If `TRUST_PROXY=false` (default), the guard binds solely to the underlying socket IP (`req.ip` / `req.socket.remoteAddress`), preventing malicious actors from bypassing rate limits by cycling random `X-Forwarded-For` spoofed headers.
- If `TRUST_PROXY=true` (enabled when deployed behind an authentic Nginx / Cloudflare reverse proxy):
  - Extracts the genuine client IP (the leftmost non-empty IP in `X-Forwarded-For: <client>, <proxy1>, <proxy2>`).
  - Validates IPv4 / IPv6 structure and strips IPv4-mapped IPv6 prefixes (`::ffff:`).

### B. In-Memory Storage & Multi-Instance Note
- The rate limiter runs in-process via `RateLimiterStorageService`.
- **Memory Guard**: Expired keys are automatically purged every 60 seconds (`setInterval` with `.unref()`), bounding memory usage.
- **Multi-Instance Limitation**: When deploying multiple horizontal instances behind a load balancer without sticky sessions, each container maintains its own bucket. For distributed enterprise multi-node clusters, a centralized Redis store adapter can be plugged into `RateLimiterStorageService` without altering application guards or controller interfaces.

---

## 6. Security Considerations & Error Sanitization

1. **No Sensitive Data Logging**:
   Rate limit rejection logging captures only:
   `[<correlationId>] Rate limit exceeded for IP: <sanitizedIp> on [<method>] <url> (Rule: <rule>, Limit: <limit>/<ttl>s, Retry-After: <sec>s)`
   Passwords, emails, bearer tokens, and request bodies are strictly excluded from logs.
2. **Standard API Envelope Compatibility**:
   When HTTP 429 is thrown, it is intercepted by `GlobalExceptionFilter` and formatted consistently:
   ```json
   {
     "success": false,
     "statusCode": 429,
     "message": "Too many requests. Please try again after 58 seconds.",
     "error": "Too Many Requests",
     "timestamp": "2026-11-17T07:44:39.123Z",
     "path": "/api/v1/auth/login",
     "correlationId": "test-corr-id-1234"
   }
   ```

---

## 7. Automated Test Results

### Test Suite Execution
- **Command**: `npm --prefix apps/api test`
- **Output**:
  ```
  ▶ RateLimiterGuard & RateLimiterStorageService
    ✔ should allow requests within configured global rate limit (8.63ms)
    ✔ should block 6th request with HTTP 429 when global limit is exceeded (5.25ms)
    ✔ should enforce endpoint-specific stricter rate limits (e.g. login 3 attempts) (2.02ms)
    ✔ should skip rate limiting when @SkipRateLimit is applied (e.g. health checks) (1.65ms)
    ✔ should not trust spoofed X-Forwarded-For headers when TRUST_PROXY is false (1.98ms)
    ✔ should respect trusted X-Forwarded-For when TRUST_PROXY is true (2.94ms)
    ✔ storage service cleans up expired entries (36.00ms)
  ✔ RateLimiterGuard & RateLimiterStorageService (63.70ms)
  ...
  ℹ tests 99
  ℹ suites 18
  ℹ pass 99
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ```
- **Total Test Suites**: 18
- **Total Passing Tests**: 99 (Zero failures, zero regressions across Auth, Users, Roles, Interceptors, Filters, Middleware, Config, and Health).

---

## 8. Type-Check and Build Results

| Workspace / Target | Command | Result |
| :--- | :--- | :--- |
| `apps/api` (Type-Check) | `npm --prefix apps/api run type-check` | **PASS** (0 errors) |
| `apps/api` (Production Build) | `npm --prefix apps/api run build` | **PASS** (Exit Code 0) |
| `apps/web` (Type-Check) | `npm --prefix apps/web run type-check` | **PASS** (0 errors) |
| `packages/database` (Type-Check) | `npm --prefix packages/database run type-check` | **PASS** (0 errors) |
| `packages/types` (Type-Check) | `npm --prefix packages/types run type-check` | **PASS** (0 errors) |

---

## 9. Database Impact
- **Prisma Schema**: Unmodified (`packages/database/prisma/schema.prisma` intact).
- **Database Migrations**: No migrations created or executed.
- **Database Mutative Operations**: Zero database mutations performed.

---

## 10. Known Limitations
- The storage implementation operates in-memory. In horizontally scaled environments across multiple container replicas, rate limits apply per container unless sticky sessions or an external cache (e.g. Redis) is deployed. This is documented and prepared for adapter substitution when multi-node deployment is required.

---

## 11. Final Verdict

**STATUS: PASS**  
Part 5, Step 4 (API Rate Limiting & Brute-Force Protection) has been fully implemented, rigorously tested, and verified with zero regressions. Execution stopped in accordance with guidelines.
