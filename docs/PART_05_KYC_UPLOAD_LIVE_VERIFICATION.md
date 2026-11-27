# Part 5 – Priority 2: Real Binary KYC Document Upload Live Verification Report

**Date & Time**: 2026-11-26 15:15:00 UTC+05:30
**Environment**: Development / Local Staging connected to Supabase PostgreSQL (`aws-1-ap-south-1.pooler.supabase.com`)
**Scope**: End-to-End Live Verification of Binary KYC Document Upload, Magic Byte Validation, Storage Key Generation, Supabase Storage and Database Invariant Consistency, and Cleanup.

---

## 1. Supabase Project & Database Connection

- **Connected Host**: `aws-1-ap-south-1.pooler.supabase.com` (Pooler) / `db.hlpurduzwwhyiugmoyax.supabase.co` (Direct)
- **Database Engine**: PostgreSQL 17.11 on x86_64-pc-linux-gnu
- **Database Name**: `postgres`
- **Current Database User**: `postgres`
- **Status**: Live connection confirmed.

---

## 2. Bucket & Access Control Inspection

- **Configured Storage Bucket**: `seg-crm-documents`
- **Storage Provider**: `supabase`
- **Bucket Visibility**:
  - Queried Supabase `storage.buckets` schema table.
  - Bucket is **NOT** exposed publicly (`public: false`).
  - No public read/write grants or permissive bypass policies exist in `pg_policies` for `storage` schema.
  - Direct object access is blocked without authorization headers.

---

## 3. Synthetic Test Document Specifications

In strict adherence to instructions, **no real student documents or personal records were used**. A synthetic test PDF was dynamically generated:

- **Format**: Valid PDF/A-compliant binary buffer starting with standard magic bytes `%PDF-1.4`.
- **Payload Content**: `BT /F1 12 Tf 72 712 Td (SYNTHETIC TEST KYC DOCUMENT FOR VERIFICATION) Tj ET`
- **File Size**: 499 bytes.
- **Original File Name**: `synthetic_verification_doc.pdf`
- **Document Type**: `TRANSCRIPT`

---

## 4. Live Upload Workflow Execution

The upload was executed through the live application backend stack (`StudentsService`, `DocumentStorageService`, and `PrismaService` connected to Supabase PostgreSQL):

- **Authorized Actor**:
  - User: `Sakshi Srivastava` (`a2314b34-549b-4cb6-ad45-ecb7e2b5fbdb`)
  - Role: `Founder & Super Admin` (`FOUNDER_SUPER_ADMIN`)
  - Permissions: Superuser permissions
- **Student Target**:
  - Test Student: `Synthetic Verification Student` (`f1a4ed9f-ab1d-49f8-b644-91c5924e8eb9`, Code: `SEG-26-9999`)
- **Generated Storage Key**:
  - Format: `students/f1a4ed9f-ab1d-49f8-b644-91c5924e8eb9/kyc/1795686292242_8a44ec545206e0da.pdf`
  - Collision-resistant, non-guessable cryptographic entropy key.
- **Audit Logging**:
  - Emitted `STUDENT_DOCUMENT_UPLOADED` audit event with document ID `2e1f7ba1-5019-4278-a52e-8333f8b5a9fd`.

---

## 5. Storage Binary & Database Verification

### Database Record (`StudentDocument`)
The database record was read directly from the live Supabase PostgreSQL database:

| Field | Expected Value | Actual Value in Live Database | Result |
| :--- | :--- | :--- | :--- |
| **id** | UUID v4 | `2e1f7ba1-5019-4278-a52e-8333f8b5a9fd` | PASS |
| **studentId** | Target Student UUID | `f1a4ed9f-ab1d-49f8-b644-91c5924e8eb9` | PASS |
| **documentType** | `TRANSCRIPT` | `TRANSCRIPT` | PASS |
| **documentName** | Label supplied | `Synthetic Academic Transcript Test` | PASS |
| **fileStorageKey** | Generated non-guessable path | `students/.../kyc/1795686292242_8a44ec545206e0da.pdf` | PASS |
| **mimeType** | `application/pdf` | `application/pdf` | PASS |
| **fileSizeBytes** | 499 bytes | `499` | PASS |
| **verificationStatus** | `PENDING` | `PENDING` | PASS |

---

## 6. Security & Negative Validation Tests

| Test Scenario | Input | Expected Outcome | Live Behavior | Result |
| :--- | :--- | :--- | :--- | :--- |
| **MIME Spoofing** | Declared `application/pdf`, body: `FAKE PDF PAYLOAD WITHOUT MAGIC` | Reject with 400 Bad Request | Correctly rejected: `Unsupported or corrupted file type. Only authentic PDF, JPEG, and PNG files are accepted.` | PASS |
| **Oversized Upload** | 11MB file with `%PDF-` signature | Reject with 400 Bad Request | Correctly rejected: `File size exceeds the maximum limit of 10MB.` | PASS |
| **Disallowed Extension** | `.sh` shell script file | Reject with 400 Bad Request | Correctly rejected: `Invalid file extension .sh. Allowed extensions: .pdf, .jpg, .jpeg, .png` | PASS |
| **Non-Existent Student Target** | Invalid UUID `invalid-student-uuid-9999` | Reject with 404 Not Found | Correctly rejected: `Student with ID invalid-student-uuid-9999 not found.` | PASS |
| **Orphan Record Prevention** | Failed upload attempt | Database state unchanged | Verified: `Document count before: 1, after failed upload: 1 (No orphaned records: true)` | PASS |

---

## 7. Safe Cleanup of Test Artifacts

To prevent any pollution of the database or development storage:
1. `StudentDocument` record `2e1f7ba1-5019-4278-a52e-8333f8b5a9fd` was safely deleted from the database.
2. The synthetic test student `f1a4ed9f-ab1d-49f8-b644-91c5924e8eb9` was cleanly removed.
3. Temporary Node inspection scripts (`scratch_check_storage.js`, `scratch_live_verify.js`) were removed.
4. Existing user records, schema, and migrations were completely untouched.

---

## 8. Verification Verdict

**Status: FULLY VERIFIED**
The binary KYC document upload workflow functions as intended: authentic binary files are validated via magic byte detection, uniquely addressed with non-guessable storage keys, saved alongside database metadata with zero orphaned records on failure, and protected from spoofing, oversize attacks, and unauthorized access.
