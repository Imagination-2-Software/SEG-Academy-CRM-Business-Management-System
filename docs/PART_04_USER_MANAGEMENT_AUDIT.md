# SEG Academy CRM — Part 4: User Management & Permissions Audit Report

**Document Date:** November 26, 2026
**Audit Type:** Read-Only Technical Architecture & Implementation Audit
**Author:** Antigravity Engineering Architecture Agent
**Target Module:** Part 4 – User Management & Permissions

---

## 1. Executive Summary

This audit assesses the state of **Part 4: User Management & Permissions** across the full stack of the SEG Academy CRM Business Management System. The inspection examined:
- Frontend pages, client hooks, and API services (`apps/web`).
- Backend NestJS modules, controllers, services, security guards, interceptors, and DTOs (`apps/api`).
- PostgreSQL schema models, relational constraints, and RBAC seeds (`packages/database`).
- Authentication lifecycle, password hashing (Argon2id), session management, and rate limiting.
- Automated unit and integration test coverage across the users and roles domain.

### Summary of Findings
1. **Backend Implementation (`apps/api/src/users` & `apps/api/src/roles`):**
   - **Status:** **Completed and Verified (100%)**.
   - Fully implemented with robust enterprise-grade security: Argon2id password hashing, strict RBAC permissions guard (`users:read`, `users:create`, `users:update`, `users:manage_status`, `users:manage_roles`), privilege escalation guards (non-superadmins cannot assign `FOUNDER_SUPER_ADMIN`), self-deactivation prevention, self-role modification prevention, atomic session revocation upon status change or role reassignment, and immutable audit logging.
   - All 14 unit tests in `users.service.spec.ts` and role tests pass with zero failures (149/149 total suite passes).
2. **Organization Employee Integration (`apps/api/src/organization`):**
   - **Status:** **Completed and Verified**.
   - Atomic onboarding via Prisma transaction creating `User` + `ProfileEmployee` (+ `InternDetails` if intern) with employee code generation.
3. **Frontend Implementation (`apps/web`):**
   - **Status:** **Partially Implemented**.
   - `apps/web/src/app/users/page.tsx` is built with search, filtering, and status toggle UI, protected with `allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN']}` and `requiredPermission="users:read"`.
   - **Gaps Identified:**
     - `apps/web/src/lib/api/users.ts` implements a fallback to `localStorage` when backend responses fail or return empty arrays, rather than providing robust error toasts or handling pagination metadata.
     - Role editing / role assignment modal is missing in `apps/web/src/app/users/page.tsx` (the backend endpoint `PUT /api/v1/users/:id/roles` is available but not wired up to a modal on the frontend).
     - User invitation/creation modal is not present on `/users` (creation is currently routed through `/organization/employees/create`).
     - Profile change password in `apps/web/src/app/profile/page.tsx` is currently mock/client-side state only and not hooked to an authenticated backend change-password endpoint.

---

## 2. Architecture & Data Flow Inspection

### 2.1 Database Schema & Relational Integrity (`packages/database/prisma/schema.prisma`)
The PostgreSQL schema adheres strictly to the RBAC and user profile model:
- `User`: Primary identity table (`id`, `email`, `passwordHash`, `fullName`, `phoneNumber`, `status`, `roleId`, `avatarUrl`, `lastLoginAt`, timestamps).
- `ProfileEmployee`: 1-to-1 relation with `User` (`userId`), containing HR metadata, department/team foreign keys, designation, and employment status.
- `Role`: 6 authoritative roles seeded (`FOUNDER_SUPER_ADMIN`, `ADMIN`, `TEAM_LEADER`, `TRAINER_FACULTY`, `FINANCE_MANAGER`, `EMPLOYEE_INTERN`).
- `Permission` & `RolePermission`: Many-to-many join model establishing granular string permissions (e.g. `users:read`, `users:create`, `users:update`, `users:manage_status`, `users:manage_roles`).
- `RefreshToken`: Cryptographic SHA-256 hashed refresh tokens with device metadata, expiry timestamp, and `isRevoked` flag for replay detection.
- `AuditLog`: Immutable audit trail capturing `actorUserId`, `action`, `resource`, `resourceId`, `payload`, IP address, and user agent.

### 2.2 Backend Users Module (`apps/api/src/users`)
- **Controller:** [users.controller.ts](file:///c:/Users/segac/Desktop/SEG-Academy-CRM-Business-Management-System/apps/api/src/users/users.controller.ts)
  - `GET /api/v1/users`: Paginated search and filtering by status and role (`users:read`).
  - `GET /api/v1/users/:id`: Single user profile resolution without leaking `passwordHash` (`users:read`).
  - `POST /api/v1/users`: Employee user account creation with Argon2id hash and privilege escalation check (`users:create`).
  - `PATCH /api/v1/users/:id`: Safe non-sensitive attribute update (`users:update`).
  - `PATCH /api/v1/users/:id/status`: Account activation/suspension/deactivation with self-deactivation guard and session revocation (`users:manage_status`).
  - `PUT /api/v1/users/:id/roles`: Atomic role replacement with superuser protection and session invalidation (`users:manage_roles`).
  - `GET /api/v1/users/:id/roles`: Resolves assigned roles and permissions list (`users:read`).
- **Service:** [users.service.ts](file:///c:/Users/segac/Desktop/SEG-Academy-CRM-Business-Management-System/apps/api/src/users/users.service.ts)
  - Enforces `toSafeUser()` transformation to guarantee zero leakage of password hashes or internal sensitive secrets.
  - Implements complete privilege checks preventing elevation to `FOUNDER_SUPER_ADMIN` unless the caller is already a `FOUNDER_SUPER_ADMIN`.
  - Atomically marks `RefreshToken.isRevoked = true` whenever a user's account is suspended or role is modified, instantly terminating compromised sessions.

### 2.3 Backend Roles Module (`apps/api/src/roles`)
- **Controller:** [roles.controller.ts](file:///c:/Users/segac/Desktop/SEG-Academy-CRM-Business-Management-System/apps/api/src/roles/roles.controller.ts)
  - `GET /api/v1/roles`: Lists all authoritative system roles with their assigned permission strings (`roles:read` / `users:read`).

---

## 3. Feature Inventory & Status Classification

| # | Feature / Capability | Frontend Component / Route | Backend Controller / Service | Status Classification |
|---|----------------------|----------------------------|------------------------------|-----------------------|
| 1 | **User Directory & Listing** | `/users` (`UsersDirectoryPage`) | `GET /api/v1/users` (`UsersController.listUsers`) | **Completed & Verified** (Backend) / **Partially Implemented** (Frontend uses localStorage fallback) |
| 2 | **User Details Inspection** | Modal / Navigation links | `GET /api/v1/users/:id` (`UsersController.getUserById`) | **Completed & Verified** (Backend) / **Not Implemented** (Frontend lacks detail drawer/view modal) |
| 3 | **User Creation / Onboarding** | `/organization/employees/create` | `POST /api/v1/users` & `POST /api/v1/organization/employees` | **Completed & Verified** (Backend & Org Frontend) |
| 4 | **User Status Toggle (Active / Suspend)** | `/users` status toggle button | `PATCH /api/v1/users/:id/status` (`UsersController.updateUserStatus`) | **Completed & Verified** (Backend) / **Implemented but Not Verified** (Frontend wired to call API, but falls back to localStorage silently) |
| 5 | **RBAC Role Assignment & Reassignment** | Missing UI on `/users` | `PUT /api/v1/users/:id/roles` (`UsersController.replaceUserRoles`) | **Completed & Verified** (Backend) / **Not Implemented** (Frontend UI modal missing) |
| 6 | **Roles & Permissions Listing** | Profile badge & Filter dropdown | `GET /api/v1/roles` (`RolesController.listRoles`) | **Completed & Verified** (Backend) / **Partially Implemented** (Frontend uses hardcoded role dropdowns) |
| 7 | **Password Management (Forgot / Reset)** | `/forgot-password`, `/reset-password` | `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password` | **Completed & Verified** (Backend & Frontend pages exist) |
| 8 | **Authenticated Password Change (Profile)**| `/profile?tab=security` | Missing dedicated authenticated `POST /api/v1/auth/change-password` | **Partially Implemented** (Frontend form is client-side mock; backend has reset flow but no authenticated self-change endpoint) |
| 9 | **Privilege Escalation Protection** | Navigation & Page Guards | `users.service.ts` (Superuser protection rules) | **Completed & Verified** (Both frontend guards & backend guards strictly enforce rules) |
| 10| **Session Revocation on Deactivation/Role Change**| Automatic trigger on 401/refresh | `RefreshToken.isRevoked` in transaction | **Completed & Verified** |

---

## 4. Gap Analysis & Observations

### 4.1 Frontend API Wiring (`apps/web/src/lib/api/users.ts`)
- **Current Behavior:** `usersService.getUsers()` calls `apiClient.get('/users')`. If it catches an error or if data is empty, it silently falls back to `getStoredUsers()` from `localStorage`.
- **Recommendation:** Remove `localStorage` fallback in favor of clean error notifications and direct consumption of the paginated API envelope (`data` and `meta`).

### 4.2 Missing Role Management Modal on `/users`
- **Current Behavior:** The `/users` page displays the role badge for each user, but administrators have no button or dialog to change a user's role.
- **Backend Availability:** `PUT /api/v1/users/:id/roles` is fully implemented, guarded with `users:manage_roles`, and validated.
- **Recommendation:** Add a "Change Role" dropdown or modal dialog on `/users` that fetches available roles from `GET /api/v1/roles` and submits to `PUT /api/v1/users/:id/roles`.

### 4.3 Authenticated Password Change
- **Current Behavior:** `apps/web/src/app/profile/page.tsx` has a "Change Account Password" form in the Security tab, but submitting only sets a client-side success message.
- **Backend Availability:** The auth module has public forgot/reset password flows, but lacks a dedicated `POST /api/v1/auth/change-password` endpoint accepting `{ currentPassword, newPassword }` for authenticated sessions.
- **Recommendation:** Add `POST /api/v1/auth/change-password` in `AuthController` and wire it to the `/profile` Security tab.

---

## 5. Priority-Ordered Implementation Plan

### Priority 1: Frontend User Management Wiring & Role Reassignment Dialog
1. **Remove localStorage Fallback in `apps/web/src/lib/api/users.ts`:**
   - Connect directly to `apiClient.get('/users', { params: query })`.
   - Update `UserSummary` typing to align with backend `SafeUser`.
   - Implement `usersService.replaceUserRoles(id, roleIds)`.
2. **Add Role Reassignment Modal in `apps/web/src/app/users/page.tsx`:**
   - Load available system roles dynamically from `GET /api/v1/roles`.
   - Add a "Manage Role" button in the table row actions for `FOUNDER_SUPER_ADMIN` and `ADMIN` users.
   - Enforce frontend confirmation modal before changing a user's role.

### Priority 2: Authenticated Password Change Flow
1. **Backend Endpoint:**
   - Create `ChangePasswordDto` (`currentPassword`, `newPassword`) with strong complexity rules.
   - Add `POST /api/v1/auth/change-password` in `AuthController` with `@CurrentUser()` decorator.
   - Verify `currentPassword` against `user.passwordHash` using Argon2id.
   - Hash new password, update user record, and revoke all active refresh tokens except current session (or all sessions).
   - Record `USER_PASSWORD_CHANGED` in `AuditLog`.
2. **Frontend Wiring:**
   - Hook the password change form in `apps/web/src/app/profile/page.tsx` to `apiClient.post('/auth/change-password')`.
   - Display real validation errors and success toast.

### Priority 3: User Details Drawer / Modal
1. Add an expandable slide-over drawer on `/users` to view complete user metadata, audit events, linked employee details, and active session count.

---

## 6. Verification Status

- **Prisma Schema & Relational Integrity:** Verified. Untouched and compliant.
- **Backend Unit Tests:** 149/149 passing across all test suites, including 14 dedicated tests for `UsersService` covering:
  - Non-disclosure of password hashes.
  - Self-deactivation prevention.
  - Non-superadmin assignment protection for `FOUNDER_SUPER_ADMIN`.
  - Transactional session revocation on status/role modifications.
- **RBAC Matrix:** Authoritative and seeded in Supabase PostgreSQL.
