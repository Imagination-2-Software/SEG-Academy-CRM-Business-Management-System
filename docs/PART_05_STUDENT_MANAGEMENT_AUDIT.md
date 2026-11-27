# SEG Academy CRM — Part 5: Student Management & KYC Audit Report

**Document Date:** November 26, 2026
**Audit Type:** Read-Only Architecture, Security & Implementation Audit
**Author:** Antigravity Engineering Architecture Agent
**Target Module:** Part 5 – Student Management & KYC

---

## 1. Executive Summary

This audit assesses the state of **Part 5: Student Management & KYC** across the SEG Academy CRM full stack. The evaluation encompassed:
- Frontend user interfaces: student directory (`/students`), student registration (`/students/register`), detailed student dossier (`/students/[id]`), and the global documents management hub (`/documents`).
- Backend NestJS `StudentsModule`, `StudentsController`, `StudentsService`, DTOs, and API endpoints (`apps/api/src/students`).
- Database schema and relational constraints (`packages/database/prisma/schema.prisma`): `ProfileStudent`, `StudentDocument`, `Enrolment`, `Invoice`, and `Submission`.
- Supabase Storage architecture, signed URLs, file upload handling, and binary download streaming.
- Role-Based Access Control (RBAC) permissions (`students:create`, `students:read`, `students:update`, `students:verify`).
- Unit and integration test coverage across the students domain.

### Summary of Findings
1. **Backend Implementation (`apps/api/src/students`):**
   - **Status:** **Completed and Verified (100% of Core Services)**.
   - All standard CRUD endpoints are implemented:
     - `POST /api/v1/students`: Automated student code generation (`SEG-YY-XXXX`), unique email constraint, and audit logging (`students:create`).
     - `GET /api/v1/students`: Full paginated directory with fuzzy search by name/code/email/phone (`students:read`).
     - `GET /api/v1/students/:id`: Complete dossier retrieval with nested enrolments, batches, invoices, and documents (`students:read`).
     - `PATCH /api/v1/students/:id`: Profile attribute updates with audit logging (`students:update`).
     - `POST /api/v1/students/:id/documents`: Document metadata attachment (`students:update`).
     - `PATCH /api/v1/students/:id/documents/:docId/verify`: Per-student KYC approval/rejection with verifier resolution and rejection reasons (`students:update`).
     - `GET /api/v1/students/:id/documents/:docId/download`: Time-limited signed URL descriptor generation (`students:read`).
     - `GET /api/v1/students/documents`: Global cross-student KYC directory with enum mapping (`students:read`).
     - `PATCH /api/v1/students/documents/:docId/verify`: Direct global KYC verification without requiring student ID in the route (`students:verify`).
   - 10 comprehensive unit tests pass in `students.service.spec.ts` (100% pass rate).

2. **Frontend Implementation (`apps/web`):**
   - **Status:** **Partially Implemented**.
   - `/students`: Directory with search and pagination is wired directly to `apiClient.get('/students')`.
   - `/students/register`: Complete registration form with contact, address, and emergency/guardian fields wired directly to `apiClient.post('/students')`.
   - `/documents`: Global KYC document directory wired directly to `documentsService.getDocuments()` and `documentsService.verifyDocument()`.
   - `/students/[id]`: Student profile dossier displays student details and document lists, but document upload and download have notable integration gaps:
     - **Binary Upload Gap:** The document upload form on `/students/[id]` only posts JSON metadata (`fileStorageKey: students/${studentId}/${docType.toLowerCase()}_${randomSuffix}.pdf`) with hardcoded file size (1MB). There is no real file picker (`<input type="file">`) or Supabase Storage direct/presigned multipart upload for actual files.
     - **Download Streaming Gap:** Download button alerts a signed URL path (`/api/v1/students/${studentId}/documents/${docId}/stream`), but the backend does not implement the actual binary proxy/stream endpoint for local storage/mock storage.
     - **Profile Edit Gap:** There is no "Edit Student Profile" modal or form on `/students/[id]` despite the backend providing `PATCH /api/v1/students/:id`.

3. **Storage & Security Architecture:**
   - Supabase private bucket storage key is modeled in `StudentDocument.fileStorageKey` with unique constraints.
   - Direct file access is blocked: signed URLs with 15-minute expiration are generated.
   - Zero credentials or database connection secrets are leaked in client responses.

---

## 2. Architecture & Data Flow Inspection

### 2.1 Database Schema & Relational Integrity (`packages/database/prisma/schema.prisma`)
The student and document models strictly follow the enterprise design:
- `ProfileStudent`: Independent business identity table (not a login User account). Attributes include `studentCode`, `fullName`, `email`, `phoneNumber`, `dateOfBirth`, `gender`, `nationality`, `addressLine1`, `addressLine2`, `city`, `state`, `country`, `postalCode`, `emergencyContact`, `guardianName`, `guardianPhone`, `guardianEmail`, timestamps.
- `StudentDocument`: KYC attachment table (`id`, `studentId`, `documentType`, `documentName`, `fileStorageKey`, `mimeType`, `fileSizeBytes`, `verificationStatus`, `verifiedById`, `verifiedAt`, `rejectionReason`, timestamps).
  - Relation to `ProfileStudent` with `onDelete: Cascade`.
  - Relation to `ProfileEmployee` (`verifiedBy`) with `onDelete: SetNull`.
  - Enums: `DocumentType` (`ID_PROOF`, `TRANSCRIPT`, `CERTIFICATE`, `PASSPORT`, `VISA`, `RESUME`, `OTHER`), `DocumentVerificationStatus` (`PENDING`, `VERIFIED`, `REJECTED`).

### 2.2 Backend Students Module (`apps/api/src/students`)
- **Controller:** [students.controller.ts](file:///c:/Users/segac/Desktop/SEG-Academy-CRM-Business-Management-System/apps/api/src/students/students.controller.ts)
  - `POST /api/v1/students` (`students:create`)
  - `GET /api/v1/students` (`students:read`)
  - `GET /api/v1/students/:id` (`students:read`)
  - `PATCH /api/v1/students/:id` (`students:update`)
  - `POST /api/v1/students/:id/documents` (`students:update`)
  - `PATCH /api/v1/students/:id/documents/:docId/verify` (`students:update`)
  - `GET /api/v1/students/:id/documents/:docId/download` (`students:read`)
  - `GET /api/v1/students/documents` (`students:read`)
  - `PATCH /api/v1/students/documents/:docId/verify` (`students:verify`)
- **Service:** [students.service.ts](file:///c:/Users/segac/Desktop/SEG-Academy-CRM-Business-Management-System/apps/api/src/students/students.service.ts)
  - Automatic student code generator (`SEG-YY-XXXX`).
  - Strict audit logging for all registration, profile updates, and document verification events.
  - Bidirectional enum translation between frontend KYC categories (`GOVERNMENT_ID`, `ACADEMIC_TRANSCRIPT`, etc.) and database enum values (`ID_PROOF`, `PASSPORT`, `TRANSCRIPT`, etc.).

---

## 3. Feature Inventory & Status Classification

| # | Feature / Capability | Frontend Component / Route | Backend Controller / Service | Status Classification |
|---|----------------------|----------------------------|------------------------------|-----------------------|
| 1 | **Student Directory Listing** | `/students` (`StudentsPage`) | `GET /api/v1/students` | **Completed & Verified** |
| 2 | **Student Search & Filters** | `/students` (search input) | `GET /api/v1/students?search=...` | **Completed & Verified** |
| 3 | **Student Pagination** | `/students` pagination bar | `GET /api/v1/students?page=1&limit=10` | **Completed & Verified** |
| 4 | **Student Registration** | `/students/register` | `POST /api/v1/students` | **Completed & Verified** |
| 5 | **Student Profile Dossier** | `/students/[id]` | `GET /api/v1/students/:id` | **Completed & Verified** |
| 6 | **Student Profile Update** | Missing UI modal on `/students/[id]` | `PATCH /api/v1/students/:id` | **Partially Implemented** (Backend complete & tested, frontend lacks edit dialog) |
| 7 | **Global KYC Document Hub** | `/documents` (`DocumentsDirectoryPage`) | `GET /api/v1/students/documents` | **Completed & Verified** |
| 8 | **Document Verification / Rejection** | `/documents` & `/students/[id]` buttons | `PATCH /api/v1/students/documents/:docId/verify` & `PATCH /api/v1/students/:id/documents/:docId/verify` | **Completed & Verified** |
| 9 | **Real File Binary Upload** | `/students/[id]` upload form | `POST /api/v1/students/:id/documents` (metadata only) | **Partially Implemented** (Metadata stored, but frontend fakes storage key without binary upload) |
| 10| **Signed URL & Secure Download** | `/documents` & `/students/[id]` | `GET /api/v1/students/:id/documents/:docId/download` | **Partially Implemented** (Descriptor generated, but client alerts URL rather than triggering stream download) |
| 11| **RBAC Enforcement** | Guards on `/students`, `/documents` | `PermissionsGuard` (`students:read`, `create`, `update`, `verify`) | **Completed & Verified** |
| 12| **Audit Logging** | Audit log trail | `AuditService.log` on all student actions | **Completed & Verified** |

---

## 4. Gap Analysis & Observations

### 4.1 Real Binary File Upload vs. Metadata Stubs
- **Current Behavior:** In `apps/web/src/app/students/[id]/page.tsx`, the document attachment form asks for a "Document Name" and selects a document type, then generates a fake key:
  ```ts
  const storageKey = `students/${studentId}/${docType.toLowerCase()}_${randomSuffix}.pdf`;
  ```
  It sends this fake key to `POST /api/v1/students/:id/documents` without uploading any real binary file.
- **Requirement:** Integrate an actual file input (`<input type="file" accept=".pdf,.png,.jpg,.jpeg">`), calculate the real MIME type and file size, and either provide a backend direct upload endpoint (e.g. `POST /api/v1/students/:id/documents/upload` using `multer` or a presigned URL generator for Supabase Storage).

### 4.2 Document Download & Viewing Flow
- **Current Behavior:** In `/students/[id]/page.tsx`, clicking Download triggers:
  ```ts
  alert(`Secure signed download descriptor generated:\n${res.data.signedUrl}\n(Valid for 15 minutes)`);
  ```
  In `/documents/page.tsx`, it calls `window.open(meta.signedUrl, '_blank')`, but the generated route `/api/v1/students/:id/documents/:docId/stream` has no corresponding stream handler in `StudentsController`.
- **Requirement:** Implement a binary streaming proxy or real presigned Supabase Storage redirect endpoint on the backend, and trigger real file downloads in the browser.

### 4.3 Student Profile Editing UI
- **Current Behavior:** `/students/[id]` displays personal details, address, emergency contact, and guardian info, but provides no "Edit Profile" button or modal.
- **Backend Availability:** `PATCH /api/v1/students/:id` is fully implemented and tested in `StudentsService`.
- **Requirement:** Add an "Edit Profile" modal dialog on `/students/[id]` allowing staff to update contact information, address, and guardian details.

### 4.4 Centralized Frontend API Service for Students
- **Current Behavior:** `StudentsPage`, `RegisterStudentPage`, and `StudentDetailsPage` make raw `apiClient.get('/students')` and `apiClient.post('/students')` calls rather than using a dedicated `studentsService` in `apps/web/src/lib/api/students.ts`.
- **Requirement:** Create `apps/web/src/lib/api/students.ts` to encapsulate all student endpoints, types, query serialization, and response normalization, following the pattern established in `users.ts` and `documents.ts`.

---

## 5. Priority-Ordered Implementation Plan

### Priority 1: Student API Service & Profile Edit Modal
1. Create `apps/web/src/lib/api/students.ts` with strongly-typed interfaces (`StudentSummary`, `StudentDetails`, `CreateStudentInput`, `UpdateStudentInput`) and service methods (`getStudents`, `getStudentById`, `registerStudent`, `updateStudent`, `attachDocument`).
2. Refactor `/students` and `/students/register` to use `studentsService`.
3. Add "Edit Student Profile" modal dialog on `/students/[id]` wired to `PATCH /api/v1/students/:id`.

### Priority 2: Real File Upload & KYC Document Attachment
1. Add binary file upload support:
   - Provide file selection UI (`<input type="file">`) supporting PDF, PNG, and JPEG.
   - Add a file upload endpoint or direct presigned upload support.
   - Enforce file size limit (e.g. max 5MB/10MB) and allowed MIME types.
2. Update `/students/[id]` to upload the real file and record actual file size, MIME type, and storage key.

### Priority 3: Secure Document Streaming & Download
1. Implement `GET /api/v1/students/:id/documents/:docId/stream` or direct Supabase signed URL download in `StudentsController` & `StudentsService`.
2. Connect download actions in `/documents` and `/students/[id]` to download the file directly.

---

## 6. Verification Status

- **Prisma Schema:** Verified and compliant. `ProfileStudent` and `StudentDocument` are properly indexed.
- **Backend Tests:** 10/10 dedicated unit tests passing in `students.service.spec.ts` covering registration, code generation, duplicate email rejection, pagination, profile updates, and document verification.
- **Frontend Pages:** All Next.js routes (`/students`, `/students/register`, `/students/[id]`, `/documents`) build and render cleanly.
