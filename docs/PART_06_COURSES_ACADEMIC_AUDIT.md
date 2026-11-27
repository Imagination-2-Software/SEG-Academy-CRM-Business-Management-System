# Part 6 – Courses & Academic Management Audit

**Date & Time**: 2026-11-26 15:30:00 UTC+05:30
**Scope**: Complete read-only audit of Course and Academic Operations across NestJS backend (`apps/api`), Next.js frontend (`apps/web`), and Supabase PostgreSQL schema (`packages/database`).

---

## 1. Executive Summary

The Course and Academic Management feature set represents the central educational catalog of SEG Academy CRM. It manages academic curriculum offerings, durations, credit points, and tuition fees, and links them down to scheduled cohorts (Batches) and student admissions (Enrolments).

The backend NestJS `AcademicModule` provides endpoints for Courses, Batches, and Enrolments with Argon2id-authenticated sessions and RBAC guards (`courses:create`, `courses:read`, `courses:update`, `batches:create`, `batches:read`, etc.). However, on the frontend:
1. There is **no dedicated centralized API client** for Academic/Courses (similar to `apps/web/src/lib/api/students.ts` or `users.ts`). Frontends make direct, fragmented calls to `apiClient.get('/courses')` and `/batches`.
2. **Course Editing and Status Toggle** is completely absent on the frontend. The backend implements `PATCH /api/v1/courses/:id`, but the frontend `CourseDetailsPage` (`apps/web/src/app/courses/[id]/page.tsx`) only displays details in read-only mode with no edit modal or active/inactive toggle.
3. **Frontend fallback searching**: `CourseDetailsPage` contains a fragile workaround where if `GET /courses/:id` fails, it falls back to fetching the entire catalog (`/courses`) and searching in-memory.
4. **Pagination & Server-side filtering**: The frontend courses catalog (`apps/web/src/app/courses/page.tsx`) fetches unpaginated data and filters in-memory on the client rather than passing query parameters (`page`, `limit`, `search`, `isActive`).
5. **Academic Relationships**: The schema defines `Course -> Batch -> Enrolment -> Student`, with links to `InvoiceItem` and `Assignment`. These database relationships are well-structured with foreign key cascade restrictions (`onDelete: Restrict`).

---

## 2. Feature-by-Feature Classification

| Feature | Classification | Description |
| :--- | :--- | :--- |
| **Prisma Course Model & Schema** | **Completed and verified** | `Course` table with `code` (unique), `title`, `description`, `durationWeeks`, `totalCredits`, `baseFee`, `currency`, `isActive`, and relations to `batches` and `invoiceItems`. |
| **Course Creation (Backend)** | **Completed and verified** | `POST /api/v1/courses` with code uniqueness check, upper-case normalization, audit logging (`COURSE_CREATED`), and `courses:create` permission guard. |
| **Course Details & Listing (Backend)** | **Completed and verified** | `GET /api/v1/courses` with search, `isActive` filter, pagination, and `GET /api/v1/courses/:id` returning batches with enrolment counts. |
| **Course Update & Status (Backend)** | **Implemented but not verified** | `PATCH /api/v1/courses/:id` exists with audit logging (`COURSE_UPDATED`), but is untested in the unit test suite and has no frontend interface. |
| **Course Catalog Page (Frontend)** | **Partially implemented** | `/courses` displays course cards and batch tabs, but fetches unpaginated lists and filters client-side without URL query synchronization. |
| **Course Creation Page (Frontend)** | **Completed and verified** | `/courses/create` validates mandatory fields, posts to `/courses`, and redirects back to catalog. |
| **Course Details Dossier (Frontend)** | **Partially implemented** | `/courses/[id]` displays course overview and associated batches, but lacks course editing, curriculum updates, status toggles, and contains mock fallbacks. |
| **Course API Client Service** | **Not implemented** | No `apps/web/src/lib/api/academic.ts` exists. Pages call `apiClient.get('/courses')` directly with inline `any` types. |
| **Course Modules / Learning Outcomes** | **Not implemented** | Course model supports `description` text, but has no dedicated relational schema for structured syllabus modules or outcomes (out of current schema scope). |
| **Batch Management & Scheduling** | **Completed and verified** | Full backend CRUD for `Batch` (`batches:create`, `batches:read`, `batches:update`), frontend `/batches`, `/batches/create`, `/batches/[id]`, and student enrolment. |

---

## 3. Database Schema & Academic Relationships

From `packages/database/prisma/schema.prisma`:
```prisma
model Course {
  id            String   @id @default(uuid())
  code          String   @unique
  title         String
  description   String?
  durationWeeks Int
  totalCredits  Int?
  baseFee       Decimal  @db.Decimal(12, 2)
  currency      String   @default("INR")
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  batches      Batch[]
  invoiceItems InvoiceItem[]

  @@index([code])
  @@index([isActive])
  @@map("courses")
}
```

### Academic Dependencies
1. **Course to Batch**: `Batch.courseId` references `Course.id` with `onDelete: Restrict`. A course cannot be deleted if scheduled batches exist.
2. **Batch to Enrolment**: `Enrolment.batchId` references `Batch.id` with `onDelete: Restrict`.
3. **Enrolment to Student**: `Enrolment.studentId` references `ProfileStudent.id` with `@@unique([studentId, batchId])` ensuring a student cannot be double-enrolled into the same cohort.
4. **Course to Billing**: `InvoiceItem.courseId` links direct tuition fees to an issued student invoice.

---

## 4. Backend Implementation Analysis (`apps/api/src/academic`)

### Endpoints
- `POST /api/v1/courses` (`courses:create`): Creates course with validated DTO (`code`, `title`, `durationWeeks`, `baseFee`, `currency`).
- `GET /api/v1/courses` (`courses:read`): Paginated course list with query filters `search` and `isActive`.
- `GET /api/v1/courses/:id` (`courses:read`): Retrieves course details with batch schedules and active enrolment counts.
- `PATCH /api/v1/courses/:id` (`courses:update`): Updates course title, description, duration, credits, base fee, and active status.
- `POST /api/v1/batches` (`batches:create`): Schedules a batch for a course.
- `GET /api/v1/batches` (`batches:read`): Lists batches with course filters.
- `GET /api/v1/batches/:id` (`batches:read`): Retrieves batch roster and student enrolments.
- `PATCH /api/v1/batches/:id` (`batches:update`): Updates batch dates, capacity, status.
- `POST /api/v1/enrolments` (`enrolments:create`): Enrols student into batch; auto-generates `ENR-YY-XXXX`.
- `PATCH /api/v1/enrolments/:id/status` (`enrolments:update`): Updates enrolment status and records final grade.

### Security & RBAC
- Authenticated via `JwtAuthGuard` and `PermissionsGuard`.
- Roles authorized for academic operations: `FOUNDER_SUPER_ADMIN`, `ADMIN`, `TEAM_LEADER` (read), `TRAINER_FACULTY` (read/grading).
- Audit service records `COURSE_CREATED`, `COURSE_UPDATED`, `BATCH_CREATED`, `BATCH_UPDATED`, `STUDENT_ENROLLED`, and `ENROLMENT_STATUS_UPDATED`.

---

## 5. Frontend Implementation Analysis (`apps/web`)

### Existing Pages
1. **`apps/web/src/app/courses/page.tsx`**:
   - Contains Course Catalog and Batches tab.
   - Client-side search filtering over pre-fetched lists.
   - Missing server-side pagination controls (only displays whatever the first page returned).
2. **`apps/web/src/app/courses/create/page.tsx`**:
   - Clean form collecting course code, title, duration, credits, and base tuition fee.
   - Handles API validation errors cleanly.
3. **`apps/web/src/app/courses/[id]/page.tsx`**:
   - Displays course metadata, duration, tuition fee, and scheduled batch table.
   - **Issues Identified**:
     - No "Edit Course" action or modal.
     - No "Toggle Active/Inactive" action.
     - Contains fallback fetching logic that dumps entire `/courses` if direct lookup fails.
4. **Batches Pages (`/batches`, `/batches/create`, `/batches/[id]`)**:
   - Supports batch creation and enrolling students from the student directory.

---

## 6. Bugs, Gaps & Security Observations

1. **Missing Centralized Academic API Client**:
   - All frontend pages call `apiClient.get('/courses')` and `apiClient.post('/courses')` directly with raw untyped payloads.
2. **Course Update Feature Absent in UI**:
   - Admins cannot edit course descriptions, update base fees, or deactivate courses through the UI even though `PATCH /api/v1/courses/:id` is fully supported by the backend.
3. **Backend Unit Test Coverage Gap**:
   - `apps/api/src/academic/__tests__/academic.service.spec.ts` only tests `createCourse`, `createBatch`, `enrolStudent`, and `updateEnrolmentStatus`. It has **0 tests** for `listCourses`, `getCourseById`, and `updateCourse`.
4. **Client-side Filtering vs. Server Pagination**:
   - When the course catalog grows beyond 20 entries, the current frontend UI will only search the first 20 records because `page` and `limit` are hardcoded/defaulted.

---

## 7. Priority-Ordered Implementation Plan

### Priority 1: Centralized Academic API Client Service (`academic.ts`)
- Create `apps/web/src/lib/api/academic.ts` with complete TypeScript interfaces: `CourseSummary`, `BatchSummary`, `EnrolmentSummary`, `CreateCoursePayload`, `UpdateCoursePayload`, `CreateBatchPayload`.
- Standardize response un-enveloping and query parameter passing.
- Export from `apps/web/src/lib/api/index.ts`.
- Refactor `/courses/page.tsx`, `/courses/create/page.tsx`, and `/courses/[id]/page.tsx` to use the typed service.

### Priority 2: Course Edit & Status Management Modal
- Update `apps/web/src/app/courses/[id]/page.tsx`.
- Add an "Edit Course" button guarded by `hasPermission('courses:update')`.
- Build an Edit Course modal allowing authorized staff to update:
  - Title
  - Description
  - Duration (Weeks)
  - Total Credits
  - Base Fee (₹)
  - Active Status Toggle (Active / Inactive)
- Connect submission to `PATCH /api/v1/courses/:id`.
- Add success notifications, validation error handling, and instant refresh.

### Priority 3: Course Pagination, Search & Server Filtering
- Enhance `/courses` with server-driven search and status filter (`All`, `Active`, `Inactive`).
- Integrate real pagination controls (page navigation, total count, limit selector).
- Connect tab switching cleanly between Courses and Batches.

### Priority 4: Comprehensive Backend Unit Test Coverage
- Update `apps/api/src/academic/__tests__/academic.service.spec.ts` to add test cases for:
  - `listCourses` with search queries and `isActive` filter.
  - `getCourseById` returning course and batches, or throwing `NotFoundException`.
  - `updateCourse` updating fields, preserving unchanged fields, and logging audit events.

---

## 8. Exact Files Likely to Require Changes

1. `apps/web/src/lib/api/academic.ts` *(new)*
2. `apps/web/src/lib/api/index.ts`
3. `apps/web/src/app/courses/page.tsx`
4. `apps/web/src/app/courses/create/page.tsx`
5. `apps/web/src/app/courses/[id]/page.tsx`
6. `apps/api/src/academic/__tests__/academic.service.spec.ts`
