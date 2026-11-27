# Architecture Audit & Implementation Plan: Documents Module
**SEG Academy CRM & Business Management System**
**Document Reference:** `docs/DOCUMENTS_MODULE_BACKEND_IMPLEMENTATION_PLAN.md`
**Date:** November 26, 2026
**Status:** Architecture Specification & Implementation Plan (Read-Only Review)

---

## 1. Executive Summary & Audit Context

### 1.1 Objective
This architectural audit examines the document management, KYC verification, storage architecture, and global document directory workflows within the SEG Academy CRM monorepo. It details:
1. Current status of student document storage and KYC verification in `apps/api/src/students`.
2. Existing route mismatches between `apps/web/src/lib/api/documents.ts`, `apps/web/src/app/documents/page.tsx`, and the backend.
3. Supabase Private Bucket storage requirements and secure time-limited signed URL streaming.
4. The exact endpoints, DTOs, and services needed to unify document management across the monorepo.

### 1.2 Core Architectural Findings
1. **Per-Student Document Endpoints Already Exist:**
   - `apps/api/src/students/students.controller.ts` already has:
     - `POST /api/v1/students/:id/documents` — Attaches document metadata record.
     - `PATCH /api/v1/students/:id/documents/:docId/verify` — Updates KYC status (`VERIFIED` or `REJECTED`), sets `verifiedById` and `verifiedAt`, records audit log.
     - `GET /api/v1/students/:id/documents/:docId/download` — Returns signed access URL descriptor (15-minute expiry).
2. **Missing Global Directory Endpoints & Frontend Route Mismatches:**
   - In `apps/web/src/lib/api/documents.ts`, the frontend attempts to call:
     - `GET /api/v1/students/documents?status=...&type=...&search=...` (Cross-student central document directory).
     - `PATCH /api/v1/students/documents/:id/verify`.
   - **Route Mismatch:** The backend only exposes per-student endpoints (`/api/v1/students/:studentId/documents`), not global `/api/v1/students/documents` or `/api/v1/documents`. As a result, the central Documents page (`/documents`) fails silently and returns an empty list `[]`.
   - **Type Mismatch:**
     - Prisma enum `DocumentType` has: `TRANSCRIPT`, `ID_PROOF`, `PASSPORT`, `VISA`, `CERTIFICATE`, `RESUME`, `OTHER`.
     - Frontend `StudentDocumentItem['documentType']` uses: `GOVERNMENT_ID`, `ACADEMIC_TRANSCRIPT`, `ENROLMENT_AGREEMENT`, `FEE_RECEIPT`, `OTHER`.
     - These enum values must be mapped cleanly in the backend or normalized.
3. **Storage Security & File Ingestion:**
   - Currently, document upload stores metadata in the PostgreSQL `student_documents` table (`documentName`, `fileStorageKey`, `mimeType`, `fileSizeBytes`, `verificationStatus`).
   - The private storage key points to Supabase storage (`students/<studentId>/<filename>`).
   - Secure signed URL streaming (`GET /api/v1/students/:id/documents/:docId/download`) generates a 15-minute time-limited URL and never exposes root service-role credentials to the client.

---

## 2. Existing Functionality vs. Missing Functionality

| Capability | Frontend Status (`apps/web`) | Backend Status (`apps/api`) | Database Status (`packages/database`) | Evaluation & Status |
| :--- | :--- | :--- | :--- | :--- |
| **Per-Student Document Listing** | Completed on `/students/[id]` | Implemented in `StudentsService.getStudentById` | Completed (`student_documents`) | Fully functional. |
| **Per-Student Document Upload** | Form in `/students/[id]` | `POST /students/:id/documents` | Completed (`student_documents`) | Functional for metadata and storage key linking. |
| **KYC Approve/Reject (Per-Student)** | Completed buttons in `/students/[id]` | `PATCH /students/:id/documents/:docId/verify` | Completed (`verificationStatus`, `verifiedById`) | Functional; records audit log. |
| **Secure Signed Download URL** | Implemented on `/students/[id]` | `GET /students/:id/documents/:docId/download` | Completed (`fileStorageKey`) | Functional (15-min descriptor). |
| **Global Document Directory** | Completed UI on `/documents` | **Missing** | Completed (`student_documents` with student relation) | **GAP:** No endpoint exists for cross-student document search & listing. |
| **Direct KYC Verification by docId**| `documentsService.verifyDocument(id)`| **Missing** | Completed | **GAP:** Backend requires `:studentId` in route path. |
| **Document Type Alignment** | Uses `GOVERNMENT_ID`, `ACADEMIC_TRANSCRIPT` | Uses `ID_PROOF`, `TRANSCRIPT`, `PASSPORT` | Prisma Enum `DocumentType` | **GAP:** Enum mapping layer needed in response serialization. |

---

## 3. Database Schema & Relations Review

From `packages/database/prisma/schema.prisma`:
```prisma
enum DocumentType {
  TRANSCRIPT
  ID_PROOF
  PASSPORT
  VISA
  CERTIFICATE
  RESUME
  OTHER
}

enum DocumentVerificationStatus {
  PENDING
  VERIFIED
  REJECTED
}

model StudentDocument {
  id                 String                     @id @default(uuid())
  studentId          String
  documentType       DocumentType
  documentName       String
  fileStorageKey     String                     @unique // Supabase Private Bucket storage path
  mimeType           String
  fileSizeBytes      Int
  verificationStatus DocumentVerificationStatus @default(PENDING)
  verifiedById       String?
  verifiedAt         DateTime?
  rejectionReason    String?
  createdAt          DateTime                   @default(now())
  updatedAt          DateTime                   @updatedAt

  student    ProfileStudent   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  verifiedBy ProfileEmployee? @relation("DocumentVerifier", fields: [verifiedById], references: [id], onDelete: SetNull)

  @@index([studentId])
  @@index([verificationStatus])
  @@map("student_documents")
}
```

---

## 4. Security, RBAC & Storage Architecture

### 4.1 RBAC Permissions
- **`students:read`**: View student documents and global document directory list.
- **`students:update`**: Upload and attach new document metadata.
- **`students:verify`**: Approve or reject KYC documents (`VERIFIED`, `REJECTED`).
  - Gated to: `FOUNDER_SUPER_ADMIN`, `ADMIN`, `TEAM_LEADER`.
  - Reviewer identity (`verifiedById`) is automatically resolved from JWT `req.user.employeeId` (or DB lookup).

### 4.2 Supabase Private Storage & Signed Streaming
- Raw files are stored in private Supabase bucket `crm-documents` or `crm-private-assets`.
- Storage path standard: `students/<studentId>/<documentType>/<timestamp>_<uuid>.pdf`.
- Storage URLs must never be public.
- The backend produces a 15-minute signed URL or streams the file directly using Supabase Storage API (`supabase.storage.from(bucket).createSignedUrl(path, 900)`).

---

## 5. Required Endpoints, DTOs & Service Design

### 5.1 Endpoints Specification

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/students/documents` | `students:read` | **Central Document Directory:** Lists documents across all students with pagination, search, status filter (`PENDING`, `VERIFIED`, `REJECTED`), and type filter. |
| `PATCH` | `/api/v1/students/documents/:docId/verify` | `students:verify` | **Direct KYC Verification:** Verifies/rejects a document directly by document ID without requiring `studentId` in the path. |
| `GET` | `/api/v1/students/:id/documents` | `students:read` | Lists all documents for a specific student. |
| `POST` | `/api/v1/students/:id/documents` | `students:update` | Attaches a document to a student profile. |
| `PATCH` | `/api/v1/students/:id/documents/:docId/verify` | `students:verify` | Verifies/rejects document in student context. |
| `GET` | `/api/v1/students/:id/documents/:docId/download` | `students:read` | Generates secure signed download URL. |

### 5.2 DTO Definitions

#### `query-documents.dto.ts`
```typescript
export class QueryGlobalDocumentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(DocumentVerificationStatus)
  status?: DocumentVerificationStatus;

  @IsOptional()
  @IsString()
  type?: string;
}

export class DirectVerifyDocumentDto {
  @IsEnum(DocumentVerificationStatus)
  @IsNotEmpty()
  status: DocumentVerificationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
```

### 5.3 Service Query Implementation
In `StudentsService`:
```typescript
async getGlobalDocuments(query: QueryGlobalDocumentsDto) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.StudentDocumentWhereInput = {};

  if (query.status) {
    where.verificationStatus = query.status;
  }

  if (query.type && query.type !== 'ALL') {
    // Map frontend types to Prisma DocumentType
    where.documentType = mapToPrismaDocType(query.type);
  }

  if (query.search && query.search.trim()) {
    const s = query.search.trim();
    where.OR = [
      { documentName: { contains: s, mode: 'insensitive' } },
      { student: { fullName: { contains: s, mode: 'insensitive' } } },
      { student: { studentCode: { contains: s, mode: 'insensitive' } } },
      { student: { email: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const [total, records] = await Promise.all([
    this.prisma.studentDocument.count({ where }),
    this.prisma.studentDocument.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentCode: true,
            email: true,
          },
        },
        verifiedBy: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
    }),
  ]);

  return {
    data: records.map(r => this.mapDocumentToResponse(r)),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}
```

---

## 6. Frontend Service Integration & Route Alignment

Update `apps/web/src/lib/api/documents.ts`:
1. Align with backend response structure: extract `res.data` or `res.data.data`.
2. Support `documentType` mapping (e.g. `ID_PROOF` $\leftrightarrow$ `GOVERNMENT_ID`).
3. Ensure KYC verification calls `apiClient.patch('/students/documents/${id}/verify', { status, rejectionReason })`.
4. Connect download button in `/documents` to call `/students/${studentId}/documents/${docId}/download`.

---

## 7. Recommended Implementation Sequence

```
Step 1: Backend Endpoint & DTO Enhancements (apps/api/src/students)
  ├── 1.1: Add QueryGlobalDocumentsDto and DirectVerifyDocumentDto in apps/api/src/students/dto
  ├── 1.2: Implement getGlobalDocuments() and directVerifyDocument() in StudentsService
  ├── 1.3: Add GET /students/documents and PATCH /students/documents/:docId/verify in StudentsController
  └── 1.4: Add unit tests in students.service.spec.ts for global listing, direct KYC verification, and audit logging

Step 2: Frontend Service & Page Integration (apps/web)
  ├── 2.1: Update apps/web/src/lib/api/documents.ts to handle paginated backend response envelope
  ├── 2.2: Update apps/web/src/app/documents/page.tsx to pass pagination, search, and hook download button
  └── 2.3: Verify Next.js production build (npm run build --workspace=apps/web)

Step 3: Verification & Test Execution
  ├── 3.1: Run backend test runner (npm test --workspace=apps/api)
  └── 3.2: Verify zero regression across all 27 existing test suites
```
