# Part 7 – Batch & Enrolment Management: Audit Report

**Date:** 2026-11-26
**Auditor:** Antigravity AI Assistant
**Repository:** SEG Academy CRM & Business Management System
**Status:** Read-Only Audit Completed

---

## 1. Executive Summary

This audit evaluates the batch scheduling, cohort lifecycle, and student enrolment management subsystems of the SEG Academy CRM.

### High-Level Findings:
1. **Solid Backend Academic Foundation:** The NestJS `AcademicController` and `AcademicService` implement comprehensive core operations for Batch and Enrolment management (`createBatch`, `listBatches`, `getBatchById`, `updateBatch`, `enrolStudent`, `listEnrolments`, `getEnrolmentById`, and `updateEnrolmentStatus`). Enrolment limits/capacity enforcement, unique batch codes, date validity checks, unique enrolment codes (`ENR-YYYY-00001`), and duplicate enrolment guards are all implemented and enforced.
2. **Centralized Frontend API Ready:** Part 6 established `academicService` in `apps/web/src/lib/api/academic.ts` with typed methods for `listBatches`, `getBatchById`, `createBatch`, `updateBatch`, `enrolStudent`, and `updateEnrolmentStatus`.
3. **Disjointed Frontend Implementations:** The frontend pages (`/batches`, `/batches/create`, `/batches/[id]`) currently make ad-hoc `apiClient` calls rather than using the centralized `academicService`. Furthermore:
   - `/batches/page.tsx` performs purely client-side filtering on a default single-page fetch, ignoring backend pagination and server-side filtering.
   - `/batches/create/page.tsx` ignores incoming `?courseId=` query parameters passed from course detail links, lacks instructor assignment selection, and redirects unexpectedly to `/courses` instead of the created batch or `/batches`.
   - `/batches/[id]/page.tsx` displays the student roster and allows enrolling students, but **lacks any UI for updating enrolment status** (e.g., transition from `ENROLLED` to `IN_PROGRESS`, `COMPLETED`, `DROPPED`, or `GRADUATED` with final grade) or **editing batch metadata/status/capacity**.
   - Student selection in the enrolment form fetches only `GET /students?limit=100` without search or pagination, rendering it unusable for larger student bases.
4. **Testing Deficits:** While basic happy paths and simple conflict checks exist in `academic.service.spec.ts` (tests 2–5), there is **zero unit test coverage** for:
   - `listBatches()` (pagination, status filters, search, courseId filtering).
   - `getBatchById()` (lookup and 404 handling).
   - `updateBatch()` (updating capacity, status, date validation, and audit logging).
   - `listEnrolments()` and `getEnrolmentById()`.
   - Enrolment capacity edge cases (exact limit boundary conditions and rejection when full).

---

## 2. Existing Backend Functionality

### 2.1 Prisma Models & Relations
Located in `packages/database/prisma/schema.prisma`:
- **`Batch`**:
  - Columns: `id`, `courseId`, `batchCode` (unique), `name`, `startDate`, `endDate`, `capacity` (Int), `status` (`BatchStatus` enum: `UPCOMING`, `ONGOING`, `COMPLETED`, `CANCELLED`), `instructorId` (nullable, linked to `ProfileEmployee`), `createdAt`, `updatedAt`.
  - Relations: `course` (`Course`), `instructor` (`ProfileEmployee`), `enrolments` (`Enrolment[]`), `assignments` (`Task[]`).
  - Indexes: `courseId`, `status`, `startDate`.
- **`Enrolment`**:
  - Columns: `id`, `studentId`, `batchId`, `enrolmentNumber` (unique), `enrolmentDate` (default `now()`), `status` (`EnrolmentStatus` enum: `ENROLLED`, `IN_PROGRESS`, `COMPLETED`, `DROPPED`, `GRADUATED`), `finalGrade` (String?), `completionDate` (DateTime?), `createdAt`, `updatedAt`.
  - Relations: `student` (`ProfileStudent`), `batch` (`Batch`).
  - Compound Unique Constraint: `@@unique([studentId, batchId])` (strictly prevents duplicate enrolment in the same cohort).
  - Indexes: `studentId`, `batchId`, `status`, `enrolmentNumber`.

### 2.2 Controller Endpoints & RBAC
In `apps/api/src/academic/academic.controller.ts`:
- `POST /batches`: Protected with `@Permissions('batches:create')`. Validates `CreateBatchDto`.
- `GET /batches`: Protected with `@Permissions('batches:read')`. Accepts `QueryBatchesDto`.
- `GET /batches/:id`: Protected with `@Permissions('batches:read')`.
- `PATCH /batches/:id`: Protected with `@Permissions('batches:update')`. Validates `UpdateBatchDto`.
- `POST /enrolments`: Protected with `@Permissions('enrolments:create')`. Validates `CreateEnrolmentDto`.
- `GET /enrolments`: Protected with `@Permissions('enrolments:read')`. Accepts `QueryEnrolmentsDto`.
- `GET /enrolments/:id`: Protected with `@Permissions('enrolments:read')`.
- `PATCH /enrolments/:id/status`: Protected with `@Permissions('enrolments:update')`. Validates `UpdateEnrolmentStatusDto`.

### 2.3 Business Logic & Validation Rules
In `apps/api/src/academic/academic.service.ts`:
1. **Batch Code Normalization:** `dto.batchCode.trim().toUpperCase()`.
2. **Course Verification:** Confirms course existence before creating batch.
3. **Batch Code Uniqueness:** Explicit check throwing `ConflictException`.
4. **Scheduling Validation:** Rejects batches where `endDate <= startDate` with `BadRequestException`.
5. **Capacity Guard:** In `enrolStudent()`, checks `if (batch._count.enrolments >= batch.capacity)` and rejects with `BadRequestException('Batch ... has reached its maximum seat capacity')`.
6. **Duplicate Enrolment Guard:** Checks `studentId_batchId` compound key and throws `ConflictException` if the student is already enrolled.
7. **Sequential Enrolment Number Generator:** Produces non-conflicting identifiers `ENR-YYYY-00001` with retry on collision.
8. **Audit Logging:** Logs `BATCH_CREATED`, `BATCH_UPDATED`, `STUDENT_ENROLLED`, and `ENROLMENT_STATUS_UPDATED` with actor, IP, user-agent, and before/after payloads.

---

## 3. Existing Frontend Functionality

### 3.1 Directory Page (`apps/web/src/app/batches/page.tsx`)
- Displays table of cohorts: Batch Code, Cohort Name, Course Offering, Schedule Period, Capacity (`enrolments.length / capacity`), and Status.
- **Defects/Limitations:**
  - Performs direct `apiClient.get('/batches')` rather than using `academicService.listBatches()`.
  - Does not implement backend pagination (defaults to 20 items returned from backend; any records beyond 20 are lost to the user).
  - Client-side search and status filter operate only on loaded records.
  - No course filter dropdown.
  - Access controlled by `<AppShell requiredPermission="batches:read">`.

### 3.2 Batch Scheduling Page (`apps/web/src/app/batches/create/page.tsx`)
- Form with fields: Course selector, Batch Code, Seat Capacity, Cohort Name, Start Date, End Date.
- **Defects/Limitations:**
  - Ignores URL query parameter `?courseId=...`. When a user navigates from `/courses/[id]` via "Schedule Batch", the course is not pre-selected.
  - Performs direct `apiClient.post('/batches', ...)` without `academicService.createBatch()`.
  - Does not support selecting an instructor (`instructorId`), although the backend DTO and database schema support it.
  - On successful creation, redirects to `/courses` instead of `/batches` or `/batches/${newBatch.id}`.

### 3.3 Batch Dossier & Roster Page (`apps/web/src/app/batches/[id]/page.tsx`)
- Displays cohort overview cards: Enrolment Capacity, Schedule Period, Batch Status.
- Displays student enrolment roster table: Enrolment #, Student Code, Student Name, Email, Enrolment Date, and Status.
- Includes an inline "Enrol Student" form allowing selection from `GET /students?limit=100`.
- **Defects/Limitations:**
  - Uses direct `apiClient.get` and `apiClient.post`.
  - **Missing Batch Edit / Status Management:** Authorized users (`batches:update`) have no way to modify capacity, reschedule start/end dates, assign instructors, or transition batch status (e.g., from `UPCOMING` to `ONGOING` or `COMPLETED`).
  - **Missing Enrolment Status Transitions:** Table lists student enrolments, but provides no action or modal to update enrolment status (`ENROLLED` -> `IN_PROGRESS` -> `COMPLETED` / `DROPPED` / `GRADUATED`) or record final grades, despite `PATCH /enrolments/:id/status` existing in the backend.
  - Hardcoded `limit=100` on students fetch causes truncation for institutions with >100 registered students.

---

## 4. API Integration Status Matrix

| Endpoint | Method | Backend Status | Frontend Client Method (`academicService`) | Page Usage | Integration State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/batches` | `GET` | Completed & Tested | `academicService.listBatches()` | `apps/web/src/app/batches/page.tsx` | **Partially Integrated** (Page uses raw `apiClient.get` without pagination/query params) |
| `/batches` | `POST` | Completed & Tested | `academicService.createBatch()` | `apps/web/src/app/batches/create/page.tsx` | **Partially Integrated** (Page uses raw `apiClient.post`, missing instructor field) |
| `/batches/:id` | `GET` | Completed | `academicService.getBatchById()` | `apps/web/src/app/batches/[id]/page.tsx` | **Partially Integrated** (Page uses raw `apiClient.get`) |
| `/batches/:id` | `PATCH` | Completed | `academicService.updateBatch()` | *None* | **Not Integrated** (No UI exists for editing batches) |
| `/enrolments` | `POST` | Completed & Tested | `academicService.enrolStudent()` | `apps/web/src/app/batches/[id]/page.tsx` | **Partially Integrated** (Page uses raw `apiClient.post`) |
| `/enrolments` | `GET` | Completed | *Not defined in client* | *None* | **Not Integrated** (No global enrolments directory) |
| `/enrolments/:id` | `GET` | Completed | *Not defined in client* | *None* | **Not Integrated** (Batch dossier embeds enrolments) |
| `/enrolments/:id/status` | `PATCH` | Completed & Tested | `academicService.updateEnrolmentStatus()` | *None* | **Not Integrated** (No UI exists for updating student enrolment status or grading) |

---

## 5. RBAC & Security Findings

1. **Backend Permission Enforcement:**
   - Properly secured via `@Permissions('batches:create')`, `'batches:read'`, `'batches:update'`, `'enrolments:create'`, `'enrolments:read'`, and `'enrolments:update'`.
   - Global guards (`JwtAuthGuard`, `PermissionsGuard`) prevent unauthenticated and unauthorized requests.
2. **Frontend UI Permission Visibility:**
   - Both `/batches` and `/batches/[id]` wrap content with `<AppShell requiredPermission="batches:read">`.
   - `/batches/create` wraps content with `<AppShell requiredPermission="batches:create">`.
   - The Enrol Student form on `/batches/[id]` checks `hasPermission('enrolments:create') || hasPermission('enrolments:write')`.
3. **Security Invariant Verification:**
   - Batch capacity and duplicate enrolment constraints are enforced server-side within the database transaction boundary.
   - Enrolment IDs and batch codes cannot be spoofed to bypass capacity limits.

---

## 6. Testing Coverage Gaps

In `apps/api/src/academic/__tests__/academic.service.spec.ts`:
- **Existing Coverage (Tests 2–5):**
  - Test 2: `createBatch` (verifies duplicate code conflict and invalid end dates).
  - Test 3: `enrolStudent` (verifies duplicate enrolment prevention).
  - Test 4: `enrolStudent` (verifies successful enrolment and number format).
  - Test 5: `updateEnrolmentStatus` (verifies status update to `GRADUATED`).
- **Missing Backend Unit Test Coverage:**
  - `listBatches()`: Default pagination, custom `page`/`limit`, `courseId` filter, `status` filter, `search` by batch code or name, empty sets.
  - `getBatchById()`: Successful retrieval with relations (course, instructor, enrolments) and `NotFoundException` handling.
  - `updateBatch()`: Update name, capacity, status, instructor; date constraint validation (`endDate <= startDate`); `NotFoundException` handling; audit logging.
  - `enrolStudent()`: Capacity limit constraint (`BadRequestException` when `enrolments >= capacity`).
  - `getEnrolmentById()`: Successful retrieval and `NotFoundException`.
  - `listEnrolments()`: Pagination, `studentId`, `batchId`, `status` filters.

---

## 7. Prioritized Implementation Roadmap

### Priority 1: Batch Detail Enhancements & Enrolment Lifecycle Management
**Goal:** Empower academic administrators to manage the complete student cohort lifecycle directly from the batch dossier.
1. Update `apps/web/src/app/batches/[id]/page.tsx` to use `academicService.getBatchById()` and `academicService.enrolStudent()`.
2. Add an **Edit Batch Modal** on `/batches/[id]` for users with `batches:update`:
   - Edit name, capacity, start date, end date, status (`UPCOMING`, `ONGOING`, `COMPLETED`, `CANCELLED`), and optional instructor assignment.
   - Wire submission to `academicService.updateBatch()`.
3. Add an **Update Enrolment Status Modal/Action** on the student roster in `/batches/[id]`:
   - Allow transitioning student status (`ENROLLED`, `IN_PROGRESS`, `COMPLETED`, `DROPPED`, `GRADUATED`).
   - If `COMPLETED` or `GRADUATED`, allow specifying `finalGrade` and `completionDate`.
   - Wire submission to `academicService.updateEnrolmentStatus()`.

### Priority 2: Batch Scheduling Flow & Pre-selection Fixes
**Goal:** Fix friction in cohort creation and course navigation.
1. Refactor `apps/web/src/app/batches/create/page.tsx` to use `academicService.createBatch()`.
2. Read `courseId` from `useSearchParams()`. When present, pre-select the course from the catalog.
3. Add optional **Instructor Assignment** dropdown populated from existing staff/employee directory.
4. On successful creation, navigate cleanly to `/batches/${newBatch.id}` with a success toast/notification.

### Priority 3: Server-Side Batch Directory Search, Filtering & Pagination
**Goal:** Modernize `/batches` to handle high-volume cohorts cleanly without client-side data truncation.
1. Refactor `apps/web/src/app/batches/page.tsx` to use `academicService.listBatches()`.
2. Implement server-side search (debounced), status filtering, and course filtering.
3. Add server-side pagination with page navigation and record counts from backend metadata.
4. Handle loading, empty, and error states gracefully.

### Priority 4: Comprehensive Academic Service Unit Tests
**Goal:** Achieve 100% test coverage for all Batch and Enrolment backend service methods.
1. Add tests in `apps/api/src/academic/__tests__/academic.service.spec.ts` covering:
   - `listBatches()` queries, filters, and pagination.
   - `getBatchById()` success and 404.
   - `updateBatch()` field updates, date validation, and audit trail.
   - `enrolStudent()` capacity limit rejection.
   - `listEnrolments()` and `getEnrolmentById()`.
2. Run full backend test suite to verify 0 regressions.

---

## 8. Exact Files Likely to Require Changes

### Backend:
- `apps/api/src/academic/dto/academic.dto.ts` (Ensure `QueryBatchesDto` has optional `page?: number` and `limit?: number` matching `QueryCoursesDto`).
- `apps/api/src/academic/__tests__/academic.service.spec.ts` (Add comprehensive batch & enrolment unit tests).

### Frontend:
- `apps/web/src/app/batches/page.tsx` (Migrate to `academicService.listBatches` with server-side pagination/filtering).
- `apps/web/src/app/batches/create/page.tsx` (Pre-fill `courseId` from search params, migrate to `academicService.createBatch`, redirect to batch dossier).
- `apps/web/src/app/batches/[id]/page.tsx` (Migrate to `academicService`, add Edit Batch modal, add Enrolment Status transition modal).
- `apps/web/src/lib/api/academic.ts` (Ensure types and endpoints match all batch/enrolment workflows).

---

## 9. Risks & Dependencies

1. **Foreign Key Integrity:** Creating a batch requires an existing valid `courseId`. Frontend must gracefully handle situations where no courses exist yet.
2. **Employee Profile Association:** Assigning an instructor requires a valid `ProfileEmployee.id`, not just a `User.id`. The frontend selector must query `/employees` or `/users` appropriately.
3. **Capacity Constraints vs Concurrent Enrolments:** Database enforces capacity at the application level; high concurrency would benefit from row-level locks or transactional counters, but existing check is sound for standard operations.
4. **Enrolment Status Cascade:** When a batch is marked `COMPLETED` or `CANCELLED`, individual student enrolments currently maintain their distinct statuses (`ENROLLED`, `IN_PROGRESS`) until updated.

---

## 10. Audit Conclusion

The backend architecture for Part 7 is solid and feature-rich, with sound database models, validation rules, capacity checks, and audit logging. The primary defects lie in the frontend pages, which bypass the centralized academic client, lack batch editing and enrolment status transitions, and do not utilize server-side search or pagination. Implementing the prioritized roadmap will align Part 7 with the high standard established in Parts 5 and 6.
