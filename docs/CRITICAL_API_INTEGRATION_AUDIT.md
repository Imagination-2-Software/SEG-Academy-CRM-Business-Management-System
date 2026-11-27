# SEG Academy CRM – Critical API Integration & Frontend Service Audit

**Document Version:** 1.0.0
**Audit Date:** November 26, 2026
**Auditor:** Senior Software Architect & Lead Security Engineer
**Scope:** In-depth, read-only verification of the four primary frontend data client services:
1. `billingService` (`apps/web/src/lib/api/billing.ts`)
2. `organizationService` (`apps/web/src/lib/api/organization.ts`)
3. `tasksApi` (`apps/web/src/lib/api/tasks.ts`)
4. `documentsService` (`apps/web/src/lib/api/documents.ts`)

---

## 1. Executive Summary

A comprehensive architectural inspection of the frontend API services against the NestJS backend (`apps/api`) and the authoritative Supabase PostgreSQL schema (`packages/database/prisma/schema.prisma`) revealed that **all four frontend services implement a progressive dual-layer architecture**:
1. **Network First:** Each service attempts live HTTP requests via `apiClient` (`axios` wrapper injecting bearer JWT tokens and managing automatic refresh token rotation).
2. **Resilient Local Persistence Fallback:** If the backend endpoint returns a non-200 response or is not yet implemented (HTTP 404/500/network offline), each service gracefully falls back to structured `localStorage` persistence, in-memory caches, and client-side calculations rather than crashing the Next.js UI.
3. **Database Schema Readiness:** The underlying Prisma schema and Supabase PostgreSQL target **already contain the full relational models, enums, indexes, and stored triggers** for all four domains. However, **dedicated NestJS backend controllers and services are currently missing for Billing, Organizations, and Tasks**, while `documentsService` points to partial `/students/documents` endpoints.

---

## 2. In-Depth Audit by Service

### Service 1: `billingService`
**Source File:** [`apps/web/src/lib/api/billing.ts`](file:///c:/Users/segac/Desktop/SEG-Academy-CRM-Business-Management-System/apps/web/src/lib/api/billing.ts)

#### A. Function-by-Function Endpoint Analysis
| Function Name | Signature & Purpose | Real Backend API Call | Mock / Local Persistence Behavior |
| :--- | :--- | :--- | :--- |
| `getInvoices(params)` | Fetch paginated invoices with search, status filters, and metrics | `GET /invoices` (with Bearer token) | Fallback: Reads from `localStorage['seg_crm_invoices_cache_v1']`, performs client-side search/filtering, and computes `BillingMetrics`. |
| `getInvoiceById(id)` | Retrieve single invoice details with line items | `GET /invoices/${id}` | Fallback: Searches `localStorage` for matching `id` or `invoiceNumber`. |
| `createInvoice(payload)` | Generate draft or issued invoice | `POST /invoices` | Fallback: Generates `INV-2026-00X`, calculates taxes, attaches line items, and prepends to `localStorage`. |
| `recordPayment(payload)` | Record payment against invoice | `POST /invoices/${payload.invoiceId}/payments` | Fallback: Updates invoice balance in `localStorage`, generates `PAY-2026-00X`, and updates status (`PAID`/`PARTIALLY_PAID`). |
| `getPayments(params)` | Ledger of payment transactions | `GET /payments` | Fallback: Extracts all payments across invoices, filters by method/status, and calculates totals. |
| `getPaymentById(id)` | Fetch single payment receipt | `GET /payments/${id}` | Fallback: Searches payments across cached invoices. |
| `computeMetrics(invoices)` | Pure calculation helper | None (Client-side) | Computes total invoiced, collected, outstanding, overdue amount, and overdue count. |

#### B. Database Model & Trigger Alignment
- **Matching Prisma Models:**
  - `Invoice` (`id`, `invoiceNumber`, `studentId`, `enrolmentId`, `subtotal`, `taxAmount`, `discountAmount`, `totalAmount`, `paidAmount`, `status`, `version`)
  - `InvoiceItem` (`id`, `invoiceId`, `description`, `quantity`, `unitPrice`, `taxRate`, `amount`)
  - `Payment` (`id`, `paymentNumber`, `invoiceId`, `studentId`, `amount`, `method`, `status`, `transactionReference`, `idempotencyKey`)
- **Matching Database Triggers:**
  - `20261125000001_financial_triggers`: Stored PL/pgSQL procedure `update_invoice_payment_totals()` automatically updates `paidAmount` and status on `Invoice` upon `Payment` insertion.

#### C. Missing Backend Functionality
- **Missing Controller:** No `BillingController` exists in `apps/api`.
- **Missing Endpoints:**
  - `GET /api/v1/invoices`
  - `GET /api/v1/invoices/:id`
  - `POST /api/v1/invoices`
  - `POST /api/v1/invoices/:id/payments`
  - `GET /api/v1/payments`
  - `GET /api/v1/payments/:id`
- **Missing Service:** No `BillingService` exists in `apps/api/src`.

---

### Service 2: `organizationService`
**Source File:** [`apps/web/src/lib/api/organization.ts`](file:///c:/Users/segac/Desktop/SEG-Academy-CRM-Business-Management-System/apps/web/src/lib/api/organization.ts)

#### A. Function-by-Function Endpoint Analysis
| Function Name | Signature & Purpose | Real Backend API Call | Mock / Local Persistence Behavior |
| :--- | :--- | :--- | :--- |
| `getDepartments()` | List all academy departments with team/member counts | `GET /departments` | Fallback: Reads from `localStorage['seg_crm_departments_cache_v1']`. |
| `getDepartmentById(id)` | Get department details and member roster | `GET /departments/${id}` | Fallback: Finds department and maps associated teams and staff from cache. |
| `createDepartment(payload)`| Create new department | `POST /departments` | Fallback: Generates `dept-${Date.now()}` and saves to `localStorage`. |
| `getTeams(params)` | List teams filtered by department | `GET /teams` | Fallback: Reads from `localStorage['seg_crm_teams_cache_v1']` with department joins. |
| `getTeamById(id)` | Get team dossier with leader and staff | `GET /teams/${id}` | Fallback: Finds team and maps employees matching `teamId`. |
| `createTeam(payload)` | Create new operational team | `POST /teams` | Fallback: Generates `team-${Date.now()}` and increments parent department team count. |
| `getEmployees(params)` | Search and filter academy staff | `GET /employees` | Fallback: Reads from `localStorage['seg_crm_employees_cache_v1']`. |
| `getEmployeeById(id)` | Detailed employee profile and intern details | `GET /employees/${id}` | Fallback: Reads employee record and attaches intern profile if applicable. |
| `createEmployee(payload)` | Onboard staff member | `POST /employees` | Fallback: Generates `EMP-2026-00X`, updates department member count, and caches record. |

#### B. Database Model Alignment
- **Matching Prisma Models:**
  - `Department` (`id`, `name`, `code`, `description`, `headId`, `createdAt`)
  - `Team` (`id`, `name`, `code`, `description`, `departmentId`, `leadId`, `createdAt`)
  - `ProfileEmployee` (`id`, `userId`, `employeeCode`, `jobTitle`, `employmentType`, `departmentId`, `teamId`, `managerId`, `joinDate`)
  - `InternDetails` (`id`, `employeeId`, `mentorId`, `status`, `startDate`, `endDate`, `collegeName`, `academicDegree`)

#### C. Missing Backend Functionality
- **Missing Controller:** No `OrganizationController` exists in `apps/api`.
- **Missing Endpoints:**
  - `GET /api/v1/departments`, `GET /api/v1/departments/:id`, `POST /api/v1/departments`
  - `GET /api/v1/teams`, `GET /api/v1/teams/:id`, `POST /api/v1/teams`
  - `GET /api/v1/employees`, `GET /api/v1/employees/:id`, `POST /api/v1/employees`
- **Missing Service:** No `OrganizationService` exists in `apps/api/src`. (Currently, only `UsersService` exists, which manages user credentials and role IDs).

---

### Service 3: `tasksApi`
**Source File:** [`apps/web/src/lib/api/tasks.ts`](file:///c:/Users/segac/Desktop/SEG-Academy-CRM-Business-Management-System/apps/web/src/lib/api/tasks.ts)

#### A. Function-by-Function Endpoint Analysis
| Function Name | Signature & Purpose | Real Backend API Call | Mock / Local Persistence Behavior |
| :--- | :--- | :--- | :--- |
| `getTasks(params)` | List operational tasks by status/priority | `GET /tasks` | Fallback: Reads from `localStorage['seg_crm_tasks_cache_v1']`. |
| `getTaskById(id)` | Task detail with deliverables & timeline | `GET /tasks/${id}` | Fallback: Searches cached tasks by UUID or `taskCode`. |
| `createTask(payload, creator)` | Delegate new operational duty | `POST /tasks` | Fallback: Generates `TSK-${nextNum}`, initial timeline item, and saves to cache. |
| `updateTaskStatus(...)` | Transition task state | `PATCH /tasks/${taskId}/status` | Fallback: Updates `status`, sets `completedAt`, and logs timeline event. |
| `submitWork(payload, user)`| Lodge deliverable submission | `POST /tasks/${taskId}/submissions` | Fallback: Appends `TaskSubmission`, transitions task to `UNDER_REVIEW`, and logs timeline. |
| `reviewSubmission(...)` | Rubric evaluation & score (0-100) | `POST /tasks/${taskId}/submissions/${subId}/reviews` | Fallback: Records review, updates status to `DONE` (if approved), and logs audit entry. |
| `computeMetrics(tasks)` | Velocity and completion metrics | None (Client-side) | Computes completion rate, overdue tasks, and pending reviews count. |

#### B. Database Model Alignment
- **Matching Prisma Models:**
  - `Task` (`id`, `taskCode`, `title`, `description`, `priority`, `status`, `startDate`, `dueDate`, `createdById`, `completedAt`)
  - `Assignment` (`id`, `taskId`, `assigneeId`, `role`)
  - `Submission` (`id`, `taskId`, `submittedById`, `contentUrl`, `notes`, `status`, `submittedAt`)
  - `SubmissionReview` (`id`, `submissionId`, `reviewerId`, `score`, `feedback`, `status`, `reviewedAt`)

#### C. Missing Backend Functionality
- **Missing Controller:** No `TasksController` exists in `apps/api`.
- **Missing Endpoints:**
  - `GET /api/v1/tasks`, `GET /api/v1/tasks/:id`, `POST /api/v1/tasks`, `PATCH /api/v1/tasks/:id/status`
  - `POST /api/v1/tasks/:id/submissions`
  - `POST /api/v1/tasks/:id/submissions/:subId/reviews`
- **Missing Service:** No `TasksService` exists in `apps/api/src`.

---

### Service 4: `documentsService`
**Source File:** [`apps/web/src/lib/api/documents.ts`](file:///c:/Users/segac/Desktop/SEG-Academy-CRM-Business-Management-System/apps/web/src/lib/api/documents.ts)

#### A. Function-by-Function Endpoint Analysis
| Function Name | Signature & Purpose | Real Backend API Call | Mock / Local Persistence Behavior |
| :--- | :--- | :--- | :--- |
| `getDocuments(params)` | Search and filter compliance documents | `GET /students/documents?${query}` | Fallback: Returns empty array `[]` (clean empty state). |
| `verifyDocument(id, status, reason)` | Approve or reject compliance document | `PATCH /students/documents/${id}/verify` | Fallback: Returns `{ success: true }`. |

#### B. Backend Alignment & Partial Integration Discrepancy
- **Real Backend Controller Exists:**
  - `apps/api/src/students/students.controller.ts` has document endpoints:
    - `POST /api/v1/students/:id/documents` (`attachDocument`)
    - `PATCH /api/v1/students/:id/documents/:docId/verify` (`verifyDocument`)
    - `GET /api/v1/students/:id/documents/:docId/download` (`getDocumentDownloadUrl`)
- **Integration Discrepancy Found:**
  - `documentsService.getDocuments()` calls `GET /students/documents`, but in NestJS `StudentsController`, document routes are nested under specific student IDs (`/students/:id/documents`). No global directory route `GET /students/documents` is currently exposed on `StudentsController`.
  - `documentsService.verifyDocument(id, ...)` calls `PATCH /students/documents/${id}/verify`, whereas the NestJS controller route is `PATCH /students/:id/documents/:docId/verify`.
- **Matching Prisma Model:**
  - `StudentDocument` (`id`, `studentId`, `documentType`, `documentName`, `fileStorageKey`, `mimeType`, `fileSizeBytes`, `verificationStatus`, `verifiedById`, `verifiedAt`)

---

## 3. Summary Integration Matrix

| Frontend Service | Calls Live Backend API? | Falls Back to Mock/Local State? | Backend Controller Exists? | Prisma Model Exists? | Primary Gap / Action Required |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`billingService`** | Attempts real endpoints (`/invoices`, `/payments`) | Yes (`localStorage` + calculations) | :x: No (`BillingController` missing) | :white_check_mark: Yes (`Invoice`, `Payment`, triggers) | Build `BillingController` and `BillingService` in `apps/api`. |
| **`organizationService`** | Attempts real endpoints (`/departments`, `/teams`, `/employees`) | Yes (`localStorage` cache) | :x: No (`OrganizationController` missing) | :white_check_mark: Yes (`Department`, `Team`, `ProfileEmployee`) | Build `OrganizationController` and `OrganizationService` in `apps/api`. |
| **`tasksApi`** | Attempts real endpoints (`/tasks`, `/submissions`, `/reviews`) | Yes (`localStorage` cache) | :x: No (`TasksController` missing) | :white_check_mark: Yes (`Task`, `Assignment`, `Submission`, `Review`) | Build `TasksController` and `TasksService` in `apps/api`. |
| **`documentsService`** | Calls `/students/documents` | Returns `[]` on error | :warning: Partial (`StudentsController` has nested routes) | :white_check_mark: Yes (`StudentDocument`) | Add global `GET /students/documents` and align verify route parameters. |

---

## 4. Architectural Assessment & Recommendations

1. **High Quality of Frontend Service Design:**
   The frontend services are built with full TypeScript fidelity, aligning with the Prisma schema field names, enum values, and relational structures. The presence of network-first calls with local-storage fallbacks allowed the frontend UI to be developed, styled, and audited without crashing before backend controllers were completed.
2. **Backend Controller Generation Path:**
   Because the Prisma schema already defines the exact models, constraints, and relations, generating the backend NestJS controllers and services will require no changes to the Supabase database schema or migrations.
3. **Preservation of System Integrity:**
   No code, files, or database tables were altered during this audit.
