# SEG CRM — Part 4: Step 2: Authentication Core Implementation Report

**Document Version:** 1.0.0  
**Target Module:** [`apps/api/src/auth/`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/apps/api/src/auth/)  
**ORM / Database Binding:** `@seg/database` (Prisma Client v6.19.3)  
**Security Standard:** OWASP Password Storage & ASVS Session Management Guidelines  
**Classification:** PRODUCTION AUTHENTICATION & SECURITY IMPLEMENTATION REPORT  

---

## 1. Executive Summary

In Step 2 of Part 4 (Authentication & RBAC), the core authentication engine for SEG CRM was fully implemented within the NestJS API application (`apps/api`). The implementation establishes enterprise-grade credential validation, Argon2id password hashing, constant-time verification, HMAC-SHA256 JWT access token signing, cryptographically secure opaque refresh tokens stored exclusively as SHA-256 hashes, automatic replay attack detection with immediate session invalidation, and graceful error handling that prevents user enumeration.

---

## 2. Architecture & File Structure

```
apps/api/src/
├── app.module.ts                         # Registers PrismaModule and AuthModule
├── prisma/
│   ├── prisma.module.ts                  # Global NestJS Prisma wrapper module
│   └── prisma.service.ts                 # PrismaClient lifecycle & logging management
└── auth/
    ├── auth.module.ts                    # NestJS AuthModule definition & exports
    ├── auth.controller.ts                # REST endpoints: /api/v1/auth/login, refresh, logout
    ├── auth.service.ts                   # Core business logic: login, rotation, replay detection, logout
    ├── password.service.ts               # Argon2id hashing & verification, token generation, SHA-256 hashing
    ├── token.service.ts                  # HMAC-SHA256 JWT signing, constant-time verification, TTL parsing
    ├── dto/
    │   └── auth.dto.ts                   # LoginDto, RefreshTokenDto, LogoutDto with class-validator
    └── __tests__/
        ├── password.service.spec.ts      # Unit tests for Argon2id hashing, verification, CSPRNG
        ├── token.service.spec.ts         # Unit tests for JWT issuance, tampering detection, signature checks
        └── auth.service.spec.ts          # Unit tests for login, token rotation, replay attack revocation
```

---

## 3. Detailed Security Implementation Decisions

### A. Argon2id Password Hashing (`password.service.ts`)
- **Algorithm:** `@node-rs/argon2` configured strictly with **Argon2id** (hybrid approach providing maximum defense against side-channel timing attacks and GPU/ASIC brute-forcing).
- **OWASP Recommended Parameters:**
  - Memory cost: `65,536 KiB` (64 MiB)
  - Time cost / iterations: `3`
  - Parallelism: `4` threads
- **Side-Channel Mitigation:** If a non-existent email is queried during login, `AuthService` executes a dummy Argon2id hash verification to ensure equal response latency, defeating timing-based user enumeration.

### B. Access Token Management (`token.service.ts`)
- **Signature Algorithm:** HMAC-SHA256 (`HS256`) using native Node.js `crypto` with constant-time buffer comparison (`crypto.timingSafeEqual`) to prevent timing attacks.
- **Configurable Secrets:** Strictly loaded from `ConfigService.get('JWT_SECRET')`. Fails at startup if secret is missing or shorter than 32 characters.
- **Configurable TTL:** Parsed from `JWT_EXPIRES_IN` (e.g. `15m` default), ensuring access tokens remain short-lived.
- **Claims Included:**
  ```typescript
  interface JwtPayload {
    sub: string;         // User ID (UUID)
    email: string;       // User Email
    roleCode: string;    // Authoritative system Role code (e.g., ADMIN, FINANCE_MANAGER)
    fullName: string;    // Employee/User display name
    employeeId?: string; // Bound Employee Profile ID
  }
  ```

### C. Opaque Refresh Tokens & Replay Defense (`auth.service.ts`)
- **Opaque Token Generation:** Generated via `crypto.randomBytes(32).toString('hex')` (256 bits of cryptographically secure entropy).
- **Hashing Before Storage:** Plaintext refresh tokens are **never** stored in the database. Only deterministic SHA-256 hashes (`tokenHash`) are persisted in the `RefreshToken` table.
- **Token Rotation:** On every `/api/v1/auth/refresh` invocation:
  1. The presented refresh token is verified by its SHA-256 hash.
  2. If active, its record is marked `isRevoked: true`.
  3. A brand-new refresh token and access token are issued.
- **Automatic Replay Attack Detection & Breach Invalidation:**
  - If a client presents a refresh token that has **already been marked revoked** (`isRevoked === true`), `AuthService` immediately flags an active replay / token-theft attack:
    ```typescript
    await this.prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId },
      data: { isRevoked: true },
    });
    throw new ForbiddenException('Suspicious session activity detected. Please log in again.');
    ```
  - All active sessions for that compromised user are terminated in a single transaction.

### D. Secure Endpoint Exposure (`auth.controller.ts`)
1. **`POST /api/v1/auth/login`:**
   - Accepts `LoginDto` (`email`, `password` min 8 chars).
   - Returns user details (excluding `passwordHash`) and initial token pair.
   - Extracts `userAgent` and `ipAddress` for session auditing.
2. **`POST /api/v1/auth/refresh`:**
   - Accepts `RefreshTokenDto` (`refreshToken`).
   - Rotates token and returns new token pair.
3. **`POST /api/v1/auth/logout`:**
   - Accepts `LogoutDto` (`refreshToken`).
   - Immediately marks the session as revoked.

---

## 4. Automated Unit Testing Results

All 15 unit tests executed and passed cleanly via Node.js native test runner:

```bash
> @seg/api@0.1.0 test
> tsc -p tsconfig.json --outDir dist-test && node --test dist-test/auth/__tests__/*.spec.js

▶ AuthService Rotation & Revocation Unit Tests
  ✔ should authenticate valid credentials and issue tokens (144.42ms)
  ✔ should reject invalid credentials with generic message (81.63ms)
  ✔ should rotate refresh token and revoke the previous token (69.61ms)
  ✔ SECURITY REPLAY ATTACK: Reusing an already-revoked refresh token must revoke ALL user tokens and throw ForbiddenException (62.65ms)
  ✔ should logout and revoke the presented refresh token (60.83ms)
✔ AuthService Rotation & Revocation Unit Tests (421.20ms)

▶ PasswordService Unit Tests
  ✔ should hash password using Argon2id format ($argon2id$...) with OWASP parameters (118.10ms)
  ✔ should successfully verify correct password against Argon2id hash (263.41ms)
  ✔ should reject incorrect password (246.60ms)
  ✔ should handle malformed or empty inputs gracefully without throwing uncaught exceptions (3.45ms)
  ✔ should generate cryptographically random 32-byte hex refresh tokens (5.21ms)
  ✔ should hash tokens deterministically using SHA-256 (1.74ms)
✔ PasswordService Unit Tests (642.93ms)

▶ TokenService Unit Tests
  ✔ should sign and verify valid JWT access tokens with correct payload (3.24ms)
  ✔ should reject tampered or modified JWT tokens (1.19ms)
  ✔ should reject tokens with invalid secrets (0.53ms)
  ✔ should calculate refresh token expiry in future (0.26ms)
✔ TokenService Unit Tests (7.05ms)

ℹ tests 15
ℹ suites 3
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2509.32
```

---

## 5. Type-Checking & Compiler Verification

- **TypeScript Type-Check:** `npm --prefix apps/api run type-check` $\rightarrow$ **0 errors**.
- **NestJS Build:** `npm --prefix apps/api run build` (`nest build`) $\rightarrow$ **Compiled successfully into `dist/`**.
- **Database Safety Guard:** Zero migrations executed; no tables or schemas modified.

---

## 6. Result & Next Step Recommendation

### **STEP 2 RESULT: COMPLETE & CERTIFIED**

The authentication core is fully operational, verified, and ready to support route protection.

**Recommended Next Action (Part 4 — Step 3):**  
Implement the JWT Authentication Guard (`JwtAuthGuard`), Current User Decorator (`@CurrentUser()`), and Role/Permission Authorization Guards (`RolesGuard`, `PermissionsGuard`) to enforce backend RBAC across API routes.
