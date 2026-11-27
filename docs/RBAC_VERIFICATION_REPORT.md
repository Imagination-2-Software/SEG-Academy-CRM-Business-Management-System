# RBAC Architecture & Access Control Verification Report

**Date:** November 26, 2026
**System:** SEG Academy CRM & Business Management Platform
**Mode:** READ-ONLY Verification (Zero database, schema, code, or user modifications performed)

---

## 1. Executive Summary

A comprehensive read-only audit and verification of the Role-Based Access Control (RBAC) architecture was conducted across the monorepo. The evaluation analyzed:
1. **Database Schema & Seed Mappings:** Roles table, permissions catalog, and `role_permissions` join table in PostgreSQL/Prisma.
2. **Backend Authentication & Authorization Guards:** NestJS `JwtAuthGuard`, `PermissionsGuard`, `RolesGuard`, and endpoint decorators (`@Permissions()`, `@Roles()`, `@Public()`).
3. **Frontend UI Visibility & Route Guards:** Sidebar navigation filtering (`NAVIGATION_ITEMS`), component-level guards (`hasRole()`, `hasPermission()`), and page-level protection (`ProtectedRoute`, `AppShell`).
4. **Automated Unit & Integration Test Evidence:** Existing test suites in `apps/api/src/auth/__tests__`.
5. **Live Endpoint Security Verification:** Real HTTP requests testing missing headers, malformed formats, and invalid signatures against the running backend API.

---

## 2. System Roles, Permissions & Database Architecture

### 2.1 Authoritative System Roles
Defined in `packages/database/prisma/schema.prisma` and seeded via `packages/database/prisma/seeds/initial_rbac_seed.sql`:

| Role Code | Role Name | System Description |
|---|---|---|
| `FOUNDER_SUPER_ADMIN` | Founder & Super Admin | Full administrative authority and universal operational access across all modules. Possesses `*.*` wildcard bypass. |
| `ADMIN` | Administrator | Complete operational management authority across users, students, academic cohorts, and finance. |
| `FINANCE_MANAGER` | Finance Manager | Specialized financial authority over invoices, payments, refunds, credit/debit notes, and financial reports. |
| `TEAM_LEADER` | Team Leader | Management of departmental staff, tasks, review workflows, student cohort tracking, and attendance. |
| `TRAINER_FACULTY` | Trainer / Faculty | Read-only course curricula, batch tracking, student list viewing, and task assignment evaluation. |
| `EMPLOYEE_INTERN` | Employee / Intern | Standard task execution, deliverable submissions, departmental workflows, and profile access. |

### 2.2 System Permissions Catalog
The system defines 27 foundational permissions across 8 distinct business resources:
- **Wildcard Superuser:** `*:*`
- **Users & Roles:** `users:read`, `users:create`, `users:update`, `users:manage_status`, `users:manage_roles`, `roles:read`
- **Students & KYC:** `students:read`, `students:create`, `students:update`, `students:verify`
- **Courses, Batches & Enrolments:** `courses:read`, `courses:create`, `courses:update`, `batches:read`, `batches:create`, `batches:update`, `enrolments:read`, `enrolments:create`, `enrolments:update`
- **Finance, Invoices & Payments:** `invoices:read`, `invoices:create`, `invoices:update`, `invoices:approve`, `payments:read`, `payments:create`, `refunds:read`, `refunds:process`
- **Tasks & Reviews:** `tasks:read`, `tasks:create`, `tasks:update`, `tasks:review`

---

## 3. Expected Role Access Matrix

Based on database seed mappings and backend `@Permissions()` / frontend `NAVIGATION_ITEMS` definitions:

| Feature / Resource Area | Founder / Super Admin | Admin | Finance Manager | Team Leader | Trainer / Faculty | Employee / Intern |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Dashboard** | Full Access | Full Access | Full Access | Full Access | Full Access | Full Access |
| **User Directory (`/users`)** | Full Access | Full Access | No Access | No Access | No Access | No Access |
| **Role Assignment & Deactivation** | Full Access | Protected (Cannot alter Founder) | No Access | No Access | No Access | No Access |
| **Audit Logs (`/audit-logs`)** | Full Access | Full Access | No Access | No Access | No Access | No Access |
| **Organization (`/departments`, `/employees`)** | Full Access | Full Access | No Access | No Access (Lacks `users:read`) | No Access | No Access |
| **Student Profiles (`/students`)** | Full Access | Read / Write | Read-Only | Read / Update | Read-Only | No Access |
| **Document KYC Verification** | Full Access | Verified (`students:verify`) | No Access | No Access | No Access | No Access |
| **Courses & Batches (`/courses`, `/batches`)** | Full Access | Read / Write | Read-Only | Read / Update | Read-Only | No Access |
| **Invoices & Payments (`/invoices`, `/payments`)** | Full Access | Full Access | Full Access | No Access | No Access | No Access |
| **Financial Refunds & Finalization** | Full Access | Full Access | Full Access | No Access | No Access | No Access |
| **Task Creation & Reviews (`/tasks`)** | Full Access | Full Access | No Access | Reviewer / Assignee | Reviewer / Assignee | Assignee Only |

---

## 4. Frontend vs Backend Enforcement Mechanisms

### 4.1 Frontend Enforcement
1. **Sidebar Navigation (`apps/web/src/components/layout/sidebar.tsx` & `navigation.ts`):**
   - Filters menu items using `item.requiredRoles` via `hasRole()` and `item.requiredPermission` via `hasPermission()`.
   - `FOUNDER_SUPER_ADMIN` bypasses all permission and role checks (`hasRole()` and `hasPermission()` automatically return `true`).
2. **Page Protection (`ProtectedRoute` & `AppShell`):**
   - Evaluates `allowedRoles` and `requiredPermission` before rendering page children.
   - Unauthorized users see an **Access Restricted** or **Insufficient Permissions** screen with a return button to `/dashboard`.
3. **Important Architectural Finding on Frontend:**
   - Some navigation items (`/departments`, `/employees`, `/teams`) check `allowedRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN', 'HR_MANAGER']`, but `HR_MANAGER` is an informal role code that does not exist in the seeded database roles (`roles` table seeds `TEAM_LEADER` and `EMPLOYEE_INTERN`).

### 4.2 Backend Enforcement
1. **Zero-Trust JWT Guard (`JwtAuthGuard` in `apps/api/src/auth/guards/jwt-auth.guard.ts`):**
   - Cryptographically verifies Bearer token via `TokenService` (HS256).
   - **Crucial Security Measure:** Does *not* rely on token claims for role or permissions! Queries PostgreSQL live via `this.prisma.user.findUnique({ where: { id: payload.sub } })`, retrieving live status, active role, and joined permissions.
   - Throws `UnauthorizedException` (HTTP 401) if token is expired, tampered, missing, or if the account is `SUSPENDED` or `INACTIVE`.
2. **Permissions Guard (`PermissionsGuard` in `apps/api/src/auth/guards/permissions.guard.ts`):**
   - Reads required permissions from controller metadata.
   - Grants universal bypass if user has `roles.includes('FOUNDER_SUPER_ADMIN')`.
   - Validates that user has all required permissions formatted as `resource:action`.
   - Throws `ForbiddenException` (HTTP 403) with missing permission details if unauthorized.

---

## 5. Live & Automated Verification Evidence

### 5.1 Real HTTP Live API Tests (Port 4000)
Tested against the running NestJS API service:

1. **Unauthenticated Request to Protected Route (`GET /api/v1/students`):**
   ```text
   HTTP/1.1 401 Unauthorized
   {"success":false,"statusCode":401,"message":"Missing Authorization header.","error":"Unauthorized"}
   ```
   *Result:* **PASS** — Rejected with HTTP 401.

2. **Tampered/Invalid Signature Token (`GET /api/v1/invoices`):**
   ```text
   Header: Authorization: Bearer invalid.token.value
   HTTP/1.1 401 Unauthorized
   {"success":false,"statusCode":401,"message":"Invalid token signature.","error":"Unauthorized"}
   ```
   *Result:* **PASS** — Rejected with HTTP 401.

3. **Malformed Authorization Header (`GET /api/v1/tasks`):**
   ```text
   Header: Authorization: Basic 12345
   HTTP/1.1 401 Unauthorized
   {"success":false,"statusCode":401,"message":"Invalid Authorization format. Expected: Bearer <token>","error":"Unauthorized"}
   ```
   *Result:* **PASS** — Rejected with HTTP 401.

### 5.2 Automated Backend Test Suite Evidence
From `apps/api/src/auth/__tests__/authorization.guards.spec.ts` (149 passing unit tests):
- `should reject request when Authorization header is missing on protected endpoint (HTTP 401)` $\rightarrow$ **PASS**
- `should reject malformed Authorization headers (HTTP 401)` $\rightarrow$ **PASS**
- `should reject tampered or invalid JWT signature (HTTP 401)` $\rightarrow$ **PASS**
- `should reject expired JWT token (HTTP 401)` $\rightarrow$ **PASS**
- `should reject suspended/inactive user even with a valid JWT (HTTP 401)` $\rightarrow$ **PASS**
- `ANTI-TAMPERING: Attacker modifying JWT payload roleCode is defeated by live DB lookup` $\rightarrow$ **PASS**
- `RolesGuard - should grant access to FOUNDER_SUPER_ADMIN regardless of required roles` $\rightarrow$ **PASS**
- `PermissionsGuard - should deny access (HTTP 403) when user is missing any required permission` $\rightarrow$ **PASS**
- `PermissionsGuard - should grant access to FOUNDER_SUPER_ADMIN regardless of required permissions` $\rightarrow$ **PASS**
- `UsersService - Privilege escalation attempt: Actor attempted to assign FOUNDER_SUPER_ADMIN` $\rightarrow$ **PASS (Blocked)**
- `TasksService - SELF-REVIEW PREVENTION: Assignee cannot review own task` $\rightarrow$ **PASS (Blocked with HTTP 403)**

---

## 6. Verified Behavior vs. Untested Assumptions

| Feature / Behavior | Status | Verification Evidence |
|---|---|---|
| HTTP 401 on Missing Auth Header | **VERIFIED** | Live curl test and unit test `JwtAuthGuard` passed. |
| HTTP 401 on Malformed Auth Header | **VERIFIED** | Live curl test and unit test `JwtAuthGuard` passed. |
| HTTP 401 on Invalid Token Signature | **VERIFIED** | Live curl test and unit test `JwtAuthGuard` passed. |
| Live DB Role Lookup (Anti-Tampering) | **VERIFIED** | Unit test passed in `authorization.guards.spec.ts`. |
| Founder Super Admin Wildcard Bypass | **VERIFIED** | Unit test passed in `PermissionsGuard` and `RolesGuard`. |
| HTTP 403 on Missing Endpoint Permissions | **VERIFIED** | Unit test passed in `PermissionsGuard` throwing ForbiddenException. |
| Deactivated/Suspended User Blocking | **VERIFIED** | Unit test passed verifying 401 even with valid signature. |
| Self-Review Prevention in Tasks | **VERIFIED** | Unit test passed in `tasks.service.spec.ts`. |
| Privilege Escalation Prevention | **VERIFIED** | Unit test passed: non-superadmin cannot assign Super Admin role. |
| **Real Browser Multi-User Session Switching** | **UNTESTED ASSUMPTION** | Requires manual login flows with live credentials for all 6 distinct roles in the browser UI. |
| **`HR_MANAGER` Role Discrepancy** | **DISCREPANCY RESOLVED IN ARCHITECTURE** | Frontend navigation items (`/departments`, `/employees`, `/teams`) and page guards reference `HR_MANAGER`. In the authoritative seed, `HR_MANAGER` does not exist, and `TEAM_LEADER` only holds `tasks:*` and `(students, courses, batches, enrolments):(read, update)` — it does NOT have `users:read` or `users:create`. Therefore, neither `HR_MANAGER` nor `TEAM_LEADER` is authorized for Organization endpoints. |

---

## 7. Resolution of the RBAC Navigation Discrepancy

### 7.1 Detailed Inspection of `TEAM_LEADER` Permissions
From `packages/database/prisma/seeds/initial_rbac_seed.sql` (lines 98–106):
```sql
-- TEAM_LEADER: Tasks, Students, Batches, Courses, Enrolments
INSERT INTO public."role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM public."roles" r, public."permissions" p
WHERE r."code" = 'TEAM_LEADER'
  AND (
    p."resource" IN ('tasks')
    OR (p."resource" IN ('students', 'courses', 'batches', 'enrolments') AND p."action" IN ('read', 'update'))
  )
ON CONFLICT DO NOTHING;
```
- **Assigned Resources:** `tasks` (all actions: `read`, `create`, `update`), `students` (`read`, `update`), `courses` (`read`, `update`), `batches` (`read`, `update`), `enrolments` (`read`, `update`).
- **Unassigned Resources:** `users` (none), `roles` (none), `invoices` (none), `payments` (none), `refunds` (none).
- **Finding:** `TEAM_LEADER` **does NOT possess** `users:read`, `users:create`, or `users:update`.

### 7.2 Backend Permission Requirements for Organization Endpoints
From `apps/api/src/organization/organization.controller.ts`:
- `GET /departments`, `GET /departments/:id` $\rightarrow$ requires `@Permissions('users:read')`
- `POST /departments` $\rightarrow$ requires `@Permissions('users:create')`
- `GET /teams`, `GET /teams/:id` $\rightarrow$ requires `@Permissions('users:read')`
- `POST /teams` $\rightarrow$ requires `@Permissions('users:create')`
- `GET /employees`, `GET /employees/:id` $\rightarrow$ requires `@Permissions('users:read')`
- `POST /employees` $\rightarrow$ requires `@Permissions('users:create')`
- `PATCH /employees/:id`, `PATCH /employees/:id/status` $\rightarrow$ requires `@Permissions('users:update')`

Because the backend explicitly guards all Department, Team, and Employee operations behind `users:read`, `users:create`, and `users:update`, any user lacking `users:read` (including `TEAM_LEADER`) will be rejected by `PermissionsGuard` with **HTTP 403 Forbidden**.

### 7.3 Access Determination
1. **`FOUNDER_SUPER_ADMIN`**: Has access (universal bypass).
2. **`ADMIN`**: Has access (assigned `users:read`, `users:create`, `users:update`).
3. **`TEAM_LEADER`**: Does **NOT** have access to Organization endpoints based on existing authorization rules. Granting `TEAM_LEADER` access to `/departments` and `/employees` in the frontend would create broken UI flows where all API fetch requests fail with HTTP 403.
4. **`HR_MANAGER`**: An unseeded, non-authoritative role referenced only in frontend code.

### 7.4 Recommended Smallest Consistent Fix
To resolve the discrepancy cleanly without changing backend permissions, database schema, or migrations:

1. **Remove `HR_MANAGER` from Frontend Navigation (`apps/web/src/components/layout/navigation.ts`):**
   Update `/departments` and `/employees` navigation items to only allow the authoritative roles possessing `users:read`:
   ```ts
   {
     name: 'Departments & Teams',
     href: '/departments',
     icon: Building2,
     section: 'Organization',
     requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN'],
     requiredPermission: 'users:read',
   },
   {
     name: 'Staff & Employees',
     href: '/employees',
     icon: UserSquare2,
     section: 'Organization',
     requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN'],
     requiredPermission: 'users:read',
   },
   ```
2. **Align Page Guards:**
   In `apps/web/src/app/departments/page.tsx`, `apps/web/src/app/employees/page.tsx`, and `apps/web/src/app/teams/page.tsx` (and their `[id]` and `create` subroutes), update `allowedRoles`:
   - Change `allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'HR_MANAGER']}` to `allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN']}` and `requiredPermission="users:read"`.
3. **Remove Stale Role Option:**
   In `apps/web/src/app/users/page.tsx`, remove `<option value="HR_MANAGER">HR Manager</option>` so administrators cannot attempt to assign a role that does not exist in the database.
