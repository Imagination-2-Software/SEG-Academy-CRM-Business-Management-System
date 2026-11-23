# SEG CRM — Part 5, Step 6: CORS Configuration & HTTP Security Headers Report

**Document Date:** November 17, 2026  
**Module:** `apps/api` (`@seg/api`)  
**Shared Workspaces:** `packages/database`, `packages/types`, `apps/web`  
**Database Engine:** PostgreSQL 17.12 (Local Staging) / Supabase compatible  
**Security Standard:** OWASP Top 10 API Security / ASVS Level 2+ / Secure Header Standard  
**Status / Verdict:** **PASS (All 108 Tests Passing across 21 Suites, Zero Type Errors, Clean Production Build Across All Workspaces)**

---

## 1. Master Requirements Alignment

The SEG Academy CRM Master Requirements and Architecture (`docs/ARCHITECTURE.md`) stipulate a secure, production-grade Modular Monolith REST API serving Next.js client applications, administrative interfaces, and webhooks under an Ubuntu VPS reverse-proxy architecture (Nginx).

Under Part 5, Step 6, we implemented **Centralized CORS Configuration and Comprehensive HTTP Security Headers**:
1. **Explicit Origin Restraint**: Disallows wildcard (`*`) origins when credentials are enabled. Validates incoming `Origin` against parsed, validated environment variables (`CORS_ORIGIN`).
2. **Same-Origin & Native Client Compatibility**: Accommodates non-browser and same-origin requests (e.g. mobile apps, curl, Postman, internal health probes) where `Origin` is undefined.
3. **HTTP Methods & Headers Whitelisting**: Explicitly permits `GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS` and whitelists authorized headers (e.g. `Authorization`, `Content-Type`, `X-Correlation-ID`).
4. **Header Exposure**: Safely exposes tracking and rate-limiting headers (`X-Correlation-ID`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`) to front-end consumers.
5. **OWASP Security Headers**: Delivers defense-in-depth HTTP headers (Content Security Policy, anti-clickjacking Frameguard, MIME sniffing prevention, Referrer Policy, modern XSS protection, and restrictive Permissions Policy).
6. **Production HSTS**: Strict-Transport-Security (`max-age=31536000; includeSubDomains; preload`) is applied in production environments without breaking local development or testing over HTTP.
7. **Swagger UI Compatibility**: Configured Content-Security-Policy allows Swagger UI assets without compromising REST API security.

---

## 2. Files Created or Modified

| File | Status | Description |
| :--- | :--- | :--- |
| `apps/api/src/common/security/cors.config.ts` | **Created** | Centralized CORS builder (`buildCorsOptions`), whitelisting methods, request headers, exposed response headers, preflight cache duration (24h), and origin matching. |
| `apps/api/src/common/security/security-headers.middleware.ts` | **Created** | Native OWASP-compliant security headers middleware injecting CSP, HSTS (in production), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy. |
| `apps/api/src/common/security/index.ts` | **Created** | Barrel export for security configuration. |
| `apps/api/src/common/security/__tests__/security.spec.ts` | **Created** | Automated unit tests verifying origin validation, rejection of malicious origins, preflight settings, development vs. production security headers, and HSTS. |
| `apps/api/src/common/config/env.validation.ts` | **Modified** | Added optional `ENABLE_HSTS` and verified type-safe configuration. |
| `apps/api/src/common/index.ts` | **Modified** | Re-exported security utilities from common index. |
| `apps/api/src/main.ts` | **Modified** | Registered `securityHeadersMiddleware` and `buildCorsOptions` in bootstrap pipeline with environment logging. |
| `apps/api/package.json` | **Modified** | Included security test suite in test runner script. |
| `docs/PART_5_STEP_6_CORS_SECURITY_HEADERS_REPORT.md` | **Created** | Master engineering and verification report. |

---

## 3. CORS Policy Configuration

### A. Origin Validation Strategy
- **Configuration Variable**: `CORS_ORIGIN` (defaults to `http://localhost:3000`).
- **Multiple Origins**: Comma-separated entries are trimmed, lowercase-normalized, and checked for exact matches (e.g. `http://localhost:3000,https://crm.segacademy.com`).
- **Credentials**: Enabled (`credentials: true`), strictly paired with explicit origins to prevent credentialed CSRF exploitation. Wildcard `*` is prohibited with credentials.
- **Same-Origin Requests**: Requests with absent `Origin` headers (server-side calls, mobile applications, container health probes) are permitted.
- **Untrusted Origins**: Untrusted cross-origin requests are rejected by callback with `CORS origin '<origin>' is not authorized by SEG CRM CORS policy.`

### B. Preflight & Cache Optimization
- **Methods**: `GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS`
- **Allowed Headers**: `Authorization`, `Content-Type`, `Accept`, `X-Correlation-ID`, `x-correlation-id`, `Origin`, `X-Requested-With`
- **Exposed Headers**: `X-Correlation-ID`, `x-correlation-id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`, `Content-Disposition`
- **Preflight Cache**: `maxAge: 86400` (24 hours) to minimize unnecessary preflight OPTIONS traffic.

---

## 4. HTTP Security Headers Configuration

The `securityHeadersMiddleware` injects the following response headers across all API routes:

| Header | Configured Value | Security Objective |
| :--- | :--- | :--- |
| `X-Content-Type-Options` | `nosniff` | Prevents browsers from MIME-sniffing away from declared `Content-Type`. |
| `X-Frame-Options` | `DENY` | Prevents UI redressing / clickjacking by blocking embedding in `<frame>`, `<iframe>`, or `<object>`. |
| `X-XSS-Protection` | `0` | Disables legacy buggy browser reflective XSS filter in favor of CSP (OWASP standard). |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Protects sensitive URL path leaks to external origins while preserving origin for analytics. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Disables access to sensitive browser device hardware APIs. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates browser browsing context against cross-origin cross-window attacks. |
| `Cross-Origin-Resource-Policy`| `cross-origin` | Permits legitimate frontend and Swagger UI assets to load backend resources. |
| `Content-Security-Policy` | Tailored REST API & Swagger UI Policy | Restricts script, style, and object execution sources: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: validator.swagger.io; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforces HTTPS exclusively for 1 year with subdomain inclusion and HSTS preload eligibility (**Active only in Production**). |

---

## 5. Deployment & Reverse Proxy Assumptions

1. **Reverse Proxy (Nginx) Architecture**:
   - The SEG CRM backend is designed to run behind an Nginx reverse proxy or cloud load balancer terminating TLS/HTTPS.
   - Nginx handles TLS certificate negotiation (Let's Encrypt / Cloudflare) and forwards `X-Forwarded-For` and `X-Forwarded-Proto`.
   - When deployed behind Nginx, `TRUST_PROXY=true` must be set in the production environment file to enable authentic client IP resolution in the rate-limiting guard (`RateLimiterGuard`).
2. **HSTS Safety**:
   - In local development (`NODE_ENV=development`) and unit testing (`NODE_ENV=test`), `Strict-Transport-Security` is omitted so developers are not locked out on `http://localhost`.

---

## 6. Automated Test Results

### Test Suite Execution
- **Command**: `npm --prefix apps/api test`
- **Output**:
  ```
  ▶ CORS Configuration (buildCorsOptions)
    ✔ should allow configured allowed origins (1.73ms)
    ✔ should allow requests with no origin (e.g. server-to-server, curl, Postman) (0.43ms)
    ✔ should reject unauthorized origins with a descriptive error (0.54ms)
    ✔ should include all necessary HTTP methods, headers, and credentials flag (0.94ms)
  ✔ CORS Configuration (buildCorsOptions) (6.50ms)
  ▶ Security Headers Middleware (securityHeadersMiddleware)
    ✔ should set standard OWASP security headers in development (1.61ms)
    ✔ should set Strict-Transport-Security (HSTS) in production (0.47ms)
  ✔ Security Headers Middleware (securityHeadersMiddleware) (2.66ms)
  ...
  ℹ tests 108
  ℹ suites 21
  ℹ pass 108
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ```
- **Total Test Suites**: 21
- **Total Passing Tests**: 108 (Zero failures, zero regressions across all modules).

---

## 7. Type-Check and Build Results

| Workspace / Target | Command | Result |
| :--- | :--- | :--- |
| `apps/api` (Type-Check) | `npm --prefix apps/api run type-check` | **PASS** (0 errors) |
| `apps/api` (Production Build) | `npm --prefix apps/api run build` | **PASS** (Exit Code 0) |
| `apps/web` (Type-Check) | `npm --prefix apps/web run type-check` | **PASS** (0 errors) |
| `packages/database` (Type-Check) | `npm --prefix packages/database run type-check` | **PASS** (0 errors) |
| `packages/types` (Type-Check) | `npm --prefix packages/types run type-check` | **PASS** (0 errors) |

---

## 8. Database Impact
- **Prisma Schema**: Unmodified (`packages/database/prisma/schema.prisma` intact).
- **Database Migrations**: No migrations created or executed.
- **Database Mutative Operations**: Zero database mutations performed.

---

## 9. Known Limitations
- When operating in environments with multiple frontends (e.g. staging preview URLs, separate admin dashboard origins), all valid origins must be explicitly added to `CORS_ORIGIN` as comma-separated values, since dynamic regex matching or wildcard origins with credentials are intentionally prohibited for security reasons.

---

## 10. Final Verdict

**STATUS: PASS**  
Part 5, Step 6 (CORS Configuration & HTTP Security Headers) has been fully implemented, verified with automated tests, and confirmed across all workspace builds without regressions. Execution stopped in accordance with guidelines.
