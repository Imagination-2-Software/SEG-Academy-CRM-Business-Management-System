# SEG CRM — Part 4: Step 3: Role & Permission Authorization Guards Report

**Document Version:** 1.0.0  
**Target Module:** [`apps/api/src/auth/`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/apps/api/src/auth/)  
**ORM / Database Binding:** `@seg/database` (Prisma Client v6.19.3)  
**Security Standard:** Zero-Trust Authorization & Least-Privilege Role/Permission Enforcement  
**Classification:** PRODUCTION AUTHORIZATION IMPLEMENTATION REPORT  

---

## 1. Executive Summary

In Step 3 of Part 4 (Authentication & RBAC), the authorization layer for SEG CRM was fully implemented across the NestJS API application (`apps/api`). The implementation establishes:
1. Declarative authorization decorators (`@Roles()`, `@Permissions()`, `@Public()`, and `@CurrentUser()`).
2. Robust, zero-trust authorization guards (`JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`) registered globally across the application.
3. Authoritative database lookup of user status, role, and fine-grained permissions via Prisma, defeating client-side JWT tampering and claim manipulation.
4. Clean separation of concerns with a typed, non-sensitive `AuthenticatedUser` context that never exposes credentials or security tokens.
5. Demonstration and diagnostic endpoints in [`test-access.controller.ts`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/apps/api/src/test-access.controller.ts).
6. Comprehensive automated test coverage (29 passing tests across 4 test suites).

---

## 2. Implemented Architecture & Component Inventory

```
apps/api/src/
├── app.module.ts                                 # Registers JwtAuthGuard, RolesGuard, PermissionsGuard as APP_GUARD
├── test-access.controller.ts                     # Diagnostic controller demonstrating @Public, @Roles, @Permissions, @CurrentUser
└── auth/
    ├── index.ts                                  # Barrel export of decorators, guards, and services
    ├── decorators/
    │   └── auth.decorators.ts                    # @Public(), @Roles(), @Permissions(), @CurrentUser()
    ├── guards/
    │   ├── jwt-auth.guard.ts                     # Token validation, zero-trust DB user fetch, active status check
    │   ├── roles.guard.ts                        # Enforces allowed roles (with FOUNDER_SUPER_ADMIN superuser bypass)
    │   └── permissions.guard.ts                  # Enforces required "resource:action" permissions (AND logic)
    └── __tests__/
        ├── authorization.guards.spec.ts          # Comprehensive unit tests for JWT, Roles, and Permissions guards
        ├── auth.service.spec.ts                  # Login, rotation, replay attack detection tests
        ├── password.service.spec.ts              # Argon2id hashing & CSPRNG tests
        └── token.service.spec.ts                 # JWT signing & verification tests
```

---

## 3. Detailed Authorization Design Decisions

### A. Zero-Trust Database Role & Permission Resolution (`JwtAuthGuard`)
- **The Threat:** Attackers or compromised clients modifying JWT payload claims (e.g. altering `roleCode: "FINANCE_MANAGER"` to `"FOUNDER_SUPER_ADMIN"`).
- **The Defense:** `JwtAuthGuard` uses the cryptographically validated JWT `sub` (User ID) exclusively as an identity pointer. It immediately queries the database via Prisma:
  ```typescript
  const userRecord = await this.prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
      employee: { select: { id: true } },
    },
  });
  ```
- **Real-Time Revocation & Status Check:**
  - If the user was deleted: Throws `UnauthorizedException('User account no longer exists.')`.
  - If the user was suspended or deactivated (`status !== 'ACTIVE'`): Throws `UnauthorizedException('User account is inactive or suspended.')`.
- **Result:** Role and permission assignments are strictly authoritative and real-time. Modifying JWT payload claims grants zero access.

### B. Typed, Sanitized User Context (`@CurrentUser()`)
- `request.user` is populated with `AuthenticatedUser`:
  ```typescript
  export interface AuthenticatedUser {
    userId: string;
    email: string;
    fullName: string;
    role: { id: string; code: string; name: string };
    roles: string[];           // e.g. ['ADMIN']
    permissions: string[];     // e.g. ['students:read', 'invoices:approve']
    employeeId?: string;
  }
  ```
- **Sensitive Field Shielding:** `passwordHash`, refresh tokens, and internal audit fields are never attached to `request.user`.

### C. Hierarchical Role Enforcement (`RolesGuard`)
- Reads metadata set by `@Roles('ADMIN', 'FINANCE_MANAGER')`.
- Allows access if the user's authoritative role matches any of the required roles (OR logic).
- **Superuser Privilege:** `FOUNDER_SUPER_ADMIN` is granted universal access across all role-protected endpoints.
- Unauthenticated or non-matching requests are rejected with **HTTP 403 Forbidden**.

### D. Fine-Grained Permission Enforcement (`PermissionsGuard`)
- Reads metadata set by `@Permissions('students:read', 'invoices:approve')` or object formats `{ resource: 'students', action: 'read' }`.
- Evaluates against the user's flattened permission array (`resource:action`).
- Enforces strict conjunction (AND logic): the user must possess **all** declared permissions.
- `FOUNDER_SUPER_ADMIN` possesses universal permission access.
- Missing permissions trigger **HTTP 403 Forbidden** with an explicit list of missing requirements.

### E. Global Guard Pipeline in `AppModule`
Configured via NestJS `APP_GUARD` providers:
1. **`JwtAuthGuard` (First):** Validates credentials for all routes, bypassed only when marked with `@Public()`.
2. **`RolesGuard` (Second):** Evaluates role restrictions if `@Roles()` is present.
3. **`PermissionsGuard` (Third):** Evaluates permission restrictions if `@Permissions()` is present.
- Public routes (`/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, `/api/v1/test-access/public`) bypass all three guards seamlessly.

---

## 4. Test Access Diagnostic Controller

A sample controller ([`test-access.controller.ts`](file:///c:/Users/thei2s/OneDrive/문서/Desktop/Seg-CRM/apps/api/src/test-access.controller.ts)) was implemented to demonstrate the authorization layers:
- `GET /api/v1/test-access/public`: Publicly accessible (`@Public()`).
- `GET /api/v1/test-access/authenticated`: Requires valid JWT access token.
- `GET /api/v1/test-access/admin-only`: Restricted to `@Roles('ADMIN', 'FOUNDER_SUPER_ADMIN')`.
- `GET /api/v1/test-access/finance-only`: Restricted to `@Roles('FINANCE_MANAGER')`.
- `GET /api/v1/test-access/students-read`: Restricted to `@Permissions('students:read')`.
- `GET /api/v1/test-access/invoices-multi-perm`: Restricted to `@Permissions('invoices:approve', 'invoices:read')`.

---

## 5. Automated Unit Test Verification

The test suite was executed using Node.js's native test runner (`node --test`), verifying all 29 tests across 7 test suites:

```bash
> @seg/api@0.1.0 test
> tsc -p tsconfig.json --outDir dist-test && node --test dist-test/auth/__tests__/*.spec.js

▶ AuthService Rotation & Revocation Unit Tests
  ✔ should authenticate valid credentials and issue tokens (185.76ms)
  ✔ should reject invalid credentials with generic message (189.36ms)
  ✔ should rotate refresh token and revoke the previous token (113.40ms)
  ✔ SECURITY REPLAY ATTACK: Reusing an already-revoked refresh token must revoke ALL user tokens and throw ForbiddenException (112.48ms)
  ✔ should logout and revoke the presented refresh token (106.33ms)
✔ AuthService Rotation & Revocation Unit Tests (710.08ms)

▶ Authorization Guards Comprehensive Unit Tests
  ▶ JwtAuthGuard
    ✔ should allow access to public endpoints without Authorization header (12.33ms)
    ✔ should reject request when Authorization header is missing on protected endpoint (HTTP 401) (0.89ms)
    ✔ should reject malformed Authorization headers (HTTP 401) (0.29ms)
    ✔ should reject tampered or invalid JWT signature (HTTP 401) (1.80ms)
    ✔ should reject expired JWT token (HTTP 401) (114.37ms)
    ✔ should reject suspended/inactive user even with a valid JWT (HTTP 401) (2.48ms)
    ✔ should successfully authenticate valid user and populate typed request.user context (2.43ms)
    ✔ ANTI-TAMPERING: Attacker modifying JWT payload roleCode is defeated by live DB lookup (0.87ms)
  ✔ JwtAuthGuard (137.60ms)
  ▶ RolesGuard
    ✔ should allow access when user role matches one of the required roles (0.77ms)
    ✔ should deny access (HTTP 403) when user role is not in allowed list (1.01ms)
    ✔ should grant access to FOUNDER_SUPER_ADMIN regardless of required roles (Superuser bypass) (0.38ms)
  ✔ RolesGuard (2.67ms)
  ▶ PermissionsGuard
    ✔ should allow access when user possesses all required permissions (0.67ms)
    ✔ should deny access (HTTP 403) when user is missing any required permission (0.57ms)
    ✔ should grant access to FOUNDER_SUPER_ADMIN regardless of required permissions (0.21ms)
  ✔ PermissionsGuard (1.73ms)
✔ Authorization Guards Comprehensive Unit Tests (143.32ms)

▶ PasswordService Unit Tests
  ✔ should hash password using Argon2id format ($argon2id$...) with OWASP parameters (108.03ms)
  ✔ should successfully verify correct password against Argon2id hash (258.07ms)
  ✔ should reject incorrect password (252.29ms)
  ✔ should handle malformed or empty inputs gracefully without throwing uncaught exceptions (3.97ms)
  ✔ should generate cryptographically random 32-byte hex refresh tokens (7.06ms)
  ✔ should hash tokens deterministically using SHA-256 (1.38ms)
✔ PasswordService Unit Tests (635.23ms)

▶ TokenService Unit Tests
  ✔ should sign and verify valid JWT access tokens with correct payload (4.18ms)
  ✔ should reject tampered or modified JWT tokens (1.34ms)
  ✔ should reject tokens with invalid secrets (0.49ms)
  ✔ should calculate refresh token expiry in future (0.25ms)
✔ TokenService Unit Tests (8.21ms)

ℹ tests 29
ℹ suites 7
ℹ pass 29
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3704.57ms
```

---

## 6. Type-Checking and Build Status

- **Type-Check:** `npm --prefix apps/api run type-check` $\rightarrow$ **0 errors**.
- **Production Build:** `npm --prefix apps/api run build` $\rightarrow$ **`nest build` completed successfully**.
- **Database & Production Invariance:** Zero migrations run, zero tables altered, zero Git commits or pushes.

---

## 7. Result & Completion Status

### **STEP 3 RESULT: COMPLETE & CERTIFIED**

The role and permission authorization subsystem is fully operational, hardened with zero-trust database resolution, and verified by comprehensive automated testing.

*(Per instructions: Stopping after completing Step 3. Do not start Step 4).*
