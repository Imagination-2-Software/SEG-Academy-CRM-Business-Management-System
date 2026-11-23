-- SEG CRM PRODUCTION DATABASE MIGRATION SCRIPT
-- Version: 7.0.0 (Remediated Financial & Security Blueprint)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ROLE PRE-FLIGHT (Idempotent Role Creation for Supabase)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'seg_api_app') THEN
    CREATE ROLE seg_api_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'seg_api_webhook') THEN
    CREATE ROLE seg_api_webhook WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. GENERATED DDL: SCHEMA, 17 ENUMS, 26 TABLES, INDEXES & 45 FOREIGN KEYS
-- ------------------------------------------------------------------------------
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'INVITED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateEnum
CREATE TYPE "InternshipStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('TRANSCRIPT', 'ID_PROOF', 'PASSPORT', 'VISA', 'CERTIFICATE', 'RESUME', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EnrolmentStatus" AS ENUM ('APPLIED', 'ENROLLED', 'ON_HOLD', 'GRADUATED', 'DROPPED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'APPLIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DebitNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'APPLIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'CASH', 'ONLINE_GATEWAY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'UNDER_REVIEW', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LATE', 'RESUBMISSION_REQUESTED', 'GRADED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "roleId" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "avatarUrl" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "departmentId" TEXT,
    "teamId" TEXT,
    "managerId" TEXT,
    "joinDate" TIMESTAMP(3) NOT NULL,
    "exitDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intern_details" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "mentorId" TEXT,
    "status" "InternshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "collegeName" TEXT,
    "academicDegree" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intern_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "nationality" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "emergencyContact" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "guardianEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_documents" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentName" TEXT NOT NULL,
    "fileStorageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationWeeks" INTEGER NOT NULL,
    "totalCredits" INTEGER,
    "baseFee" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "capacity" INTEGER NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'UPCOMING',
    "instructorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrolments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "enrolmentNumber" TEXT NOT NULL,
    "enrolmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EnrolmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "finalGrade" TEXT,
    "completionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrolments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrolmentId" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "courseId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" TEXT NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "reason" TEXT NOT NULL,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debit_notes" (
    "id" TEXT NOT NULL,
    "debitNoteNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "reason" TEXT NOT NULL,
    "status" "DebitNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionReference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "idempotencyPayloadHash" TEXT,
    "gatewayProvider" TEXT,
    "gatewayOrderId" TEXT,
    "paidAt" TIMESTAMP(3),
    "recordedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "refundNumber" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "idempotencyKey" TEXT NOT NULL,
    "idempotencyPayloadHash" TEXT,
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "departmentId" TEXT,
    "teamId" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalMarks" DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "submissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentUrl" TEXT,
    "notes" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_reviews" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "feedback" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "payload" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "teams_code_key" ON "teams"("code");

-- CreateIndex
CREATE UNIQUE INDEX "teams_departmentId_name_key" ON "teams"("departmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeCode_key" ON "employees"("employeeCode");

-- CreateIndex
CREATE INDEX "employees_departmentId_idx" ON "employees"("departmentId");

-- CreateIndex
CREATE INDEX "employees_teamId_idx" ON "employees"("teamId");

-- CreateIndex
CREATE INDEX "employees_managerId_idx" ON "employees"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "intern_details_employeeId_key" ON "intern_details"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "students_studentCode_key" ON "students"("studentCode");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE INDEX "students_email_idx" ON "students"("email");

-- CreateIndex
CREATE INDEX "students_studentCode_idx" ON "students"("studentCode");

-- CreateIndex
CREATE UNIQUE INDEX "student_documents_fileStorageKey_key" ON "student_documents"("fileStorageKey");

-- CreateIndex
CREATE INDEX "student_documents_studentId_idx" ON "student_documents"("studentId");

-- CreateIndex
CREATE INDEX "student_documents_verificationStatus_idx" ON "student_documents"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");

-- CreateIndex
CREATE INDEX "courses_code_idx" ON "courses"("code");

-- CreateIndex
CREATE INDEX "courses_isActive_idx" ON "courses"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batchCode_key" ON "batches"("batchCode");

-- CreateIndex
CREATE INDEX "batches_courseId_idx" ON "batches"("courseId");

-- CreateIndex
CREATE INDEX "batches_instructorId_idx" ON "batches"("instructorId");

-- CreateIndex
CREATE INDEX "batches_status_idx" ON "batches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "enrolments_enrolmentNumber_key" ON "enrolments"("enrolmentNumber");

-- CreateIndex
CREATE INDEX "enrolments_studentId_idx" ON "enrolments"("studentId");

-- CreateIndex
CREATE INDEX "enrolments_batchId_idx" ON "enrolments"("batchId");

-- CreateIndex
CREATE INDEX "enrolments_status_idx" ON "enrolments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "enrolments_studentId_batchId_key" ON "enrolments"("studentId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_studentId_idx" ON "invoices"("studentId");

-- CreateIndex
CREATE INDEX "invoices_enrolmentId_idx" ON "invoices"("enrolmentId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_creditNoteNumber_key" ON "credit_notes"("creditNoteNumber");

-- CreateIndex
CREATE INDEX "credit_notes_invoiceId_idx" ON "credit_notes"("invoiceId");

-- CreateIndex
CREATE INDEX "credit_notes_studentId_idx" ON "credit_notes"("studentId");

-- CreateIndex
CREATE INDEX "credit_notes_status_idx" ON "credit_notes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "debit_notes_debitNoteNumber_key" ON "debit_notes"("debitNoteNumber");

-- CreateIndex
CREATE INDEX "debit_notes_invoiceId_idx" ON "debit_notes"("invoiceId");

-- CreateIndex
CREATE INDEX "debit_notes_studentId_idx" ON "debit_notes"("studentId");

-- CreateIndex
CREATE INDEX "debit_notes_status_idx" ON "debit_notes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentNumber_key" ON "payments"("paymentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_studentId_idx" ON "payments"("studentId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_idempotencyKey_idx" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "payments_id_invoiceId_key" ON "payments"("id", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refundNumber_key" ON "refunds"("refundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_idempotencyKey_key" ON "refunds"("idempotencyKey");

-- CreateIndex
CREATE INDEX "refunds_paymentId_idx" ON "refunds"("paymentId");

-- CreateIndex
CREATE INDEX "refunds_invoiceId_idx" ON "refunds"("invoiceId");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "refunds_idempotencyKey_idx" ON "refunds"("idempotencyKey");

-- CreateIndex
CREATE INDEX "tasks_assignedToId_idx" ON "tasks"("assignedToId");

-- CreateIndex
CREATE INDEX "tasks_createdById_idx" ON "tasks"("createdById");

-- CreateIndex
CREATE INDEX "tasks_departmentId_idx" ON "tasks"("departmentId");

-- CreateIndex
CREATE INDEX "tasks_teamId_idx" ON "tasks"("teamId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "assignments_batchId_idx" ON "assignments"("batchId");

-- CreateIndex
CREATE INDEX "assignments_createdById_idx" ON "assignments"("createdById");

-- CreateIndex
CREATE INDEX "submissions_assignmentId_idx" ON "submissions"("assignmentId");

-- CreateIndex
CREATE INDEX "submissions_studentId_idx" ON "submissions"("studentId");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_assignmentId_studentId_key" ON "submissions"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "submission_reviews_submissionId_idx" ON "submission_reviews"("submissionId");

-- CreateIndex
CREATE INDEX "submission_reviews_reviewerId_idx" ON "submission_reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intern_details" ADD CONSTRAINT "intern_details_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intern_details" ADD CONSTRAINT "intern_details_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_enrolmentId_fkey" FOREIGN KEY ("enrolmentId") REFERENCES "enrolments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_invoiceId_fkey" FOREIGN KEY ("paymentId", "invoiceId") REFERENCES "payments"("id", "invoiceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_reviews" ADD CONSTRAINT "submission_reviews_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_reviews" ADD CONSTRAINT "submission_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------------------------
-- 4. RESTRICTED FUNCTION: Online Payment Confirmation (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_online_payment(
  p_payment_id TEXT,
  p_gateway_order_id TEXT,
  p_transaction_reference TEXT,
  p_paid_at TIMESTAMP(3)
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_method "PaymentMethod";
  v_status "PaymentStatus";
BEGIN
  -- Strict caller verification (Inspect SESSION_USER because inside SECURITY DEFINER, CURRENT_USER switches to owner)
  IF SESSION_USER NOT IN ('seg_api_webhook', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Access Denied: Session user % is not authorized to execute payment confirmation.', SESSION_USER;
  END IF;

  -- Pessimistic row lock
  SELECT "method", "status"
  INTO v_method, v_status
  FROM public."payments"
  WHERE "id" = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial Security: Payment % not found.', p_payment_id;
  END IF;

  IF v_status <> 'PENDING' THEN
    RAISE EXCEPTION 'Financial Security: Payment % is not in PENDING status (current status: %).', p_payment_id, v_status;
  END IF;

  -- Record confirmation
  UPDATE public."payments"
  SET "status" = 'CONFIRMED',
      "gatewayOrderId" = p_gateway_order_id,
      "transactionReference" = p_transaction_reference,
      "paidAt" = p_paid_at,
      "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = p_payment_id;
END;
$$;

-- Revoke default PUBLIC privileges
REVOKE ALL ON FUNCTION public.confirm_online_payment(TEXT, TEXT, TEXT, TIMESTAMP(3)) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_online_payment(TEXT, TEXT, TEXT, TIMESTAMP(3)) TO seg_api_webhook;
GRANT EXECUTE ON FUNCTION public.confirm_online_payment(TEXT, TEXT, TEXT, TIMESTAMP(3)) TO postgres;

-- ------------------------------------------------------------------------------
-- 5. FUNCTION: Reconcile Invoice Financials (Hierarchical Lock Order)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reconcile_invoice_financials(p_invoice_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_payments DECIMAL(12,2);
  v_total_refunds DECIMAL(12,2);
  v_net_paid DECIMAL(12,2);
  v_total_amount DECIMAL(12,2);
  v_current_status "InvoiceStatus";
  v_new_status "InvoiceStatus";
BEGIN
  -- Step 1: Lock invoice row first (Top of hierarchy)
  SELECT "totalAmount", "status"
  INTO v_total_amount, v_current_status
  FROM public."invoices"
  WHERE "id" = p_invoice_id
  FOR UPDATE;

  -- Step 2: Sum confirmed payments
  SELECT COALESCE(SUM("amount"), 0.00)
  INTO v_total_payments
  FROM public."payments"
  WHERE "invoiceId" = p_invoice_id
    AND "status" IN ('CONFIRMED', 'PARTIALLY_REFUNDED', 'REFUNDED');

  -- Step 3: Sum processed refunds
  SELECT COALESCE(SUM("amount"), 0.00)
  INTO v_total_refunds
  FROM public."refunds"
  WHERE "invoiceId" = p_invoice_id
    AND "status" = 'PROCESSED';

  v_net_paid := v_total_payments - v_total_refunds;
  IF v_net_paid < 0.00 THEN
    v_net_paid := 0.00;
  END IF;

  -- Step 4: Determine reconciled invoice status
  IF v_current_status NOT IN ('CANCELLED', 'DRAFT') THEN
    IF v_net_paid >= v_total_amount THEN
      v_new_status := 'PAID';
    ELSIF v_net_paid > 0.00 THEN
      v_new_status := 'PARTIALLY_PAID';
    ELSIF v_net_paid = 0.00 AND v_total_refunds > 0.00 THEN
      v_new_status := 'REFUNDED';
    ELSE
      v_new_status := 'ISSUED';
    END IF;
  ELSE
    v_new_status := v_current_status;
  END IF;

  -- Step 5: Update invoice
  UPDATE public."invoices"
  SET "paidAmount" = v_net_paid,
      "status" = v_new_status,
      "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = p_invoice_id;
END;
$$;

-- Revoke execution from PUBLIC to prevent unauthorized manual balance recalculation
-- (Trigger functions enforce_payment_immutability and enforce_refund_immutability execute as SECURITY DEFINER owned by postgres)
REVOKE ALL ON FUNCTION public.reconcile_invoice_financials(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_invoice_financials(TEXT) TO postgres;

-- ------------------------------------------------------------------------------
-- 6. TRIGGERS: Payment Immutability & Reconciliation
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_payment_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inv_finalized BOOLEAN;
  v_inv_status "InvoiceStatus";
  v_recorder_role TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" IN ('CONFIRMED', 'PARTIALLY_REFUNDED', 'REFUNDED') THEN
      RAISE EXCEPTION 'Financial Security: Confirmed or refunded payments cannot be deleted (Payment ID: %).', OLD."id";
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW."amount" <= 0 THEN
      RAISE EXCEPTION 'Financial Security: Payment amount must be greater than zero.';
    END IF;

    IF NEW."method" IN ('ONLINE_GATEWAY', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI') AND NEW."status" = 'CONFIRMED' THEN
      RAISE EXCEPTION 'Financial Security: Online gateway payments cannot be initialized as CONFIRMED.';
    END IF;

    IF NEW."status" = 'CONFIRMED' THEN
      IF NEW."recordedById" IS NULL OR NEW."transactionReference" IS NULL OR NEW."paidAt" IS NULL THEN
        RAISE EXCEPTION 'Financial Security: Confirmed manual payments require recordedById, transactionReference, and paidAt.';
      END IF;

      SELECT r."code" INTO v_recorder_role
      FROM public."employees" e
      JOIN public."users" u ON e."userId" = u."id"
      JOIN public."roles" r ON u."roleId" = r."id"
      WHERE e."id" = NEW."recordedById";

      IF v_recorder_role NOT IN ('FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER') THEN
        RAISE EXCEPTION 'Financial Security: Employee % is not authorized to record confirmed payments.', NEW."recordedById";
      END IF;
    END IF;

    IF NEW."status" NOT IN ('PENDING', 'CONFIRMED') THEN
      RAISE EXCEPTION 'Financial Security: New payments must initiate as PENDING or CONFIRMED.';
    END IF;

    SELECT "isFinalized", "status" INTO v_inv_finalized, v_inv_status
    FROM public."invoices" WHERE "id" = NEW."invoiceId";

    IF v_inv_finalized = false OR v_inv_status IN ('DRAFT', 'CANCELLED') THEN
      RAISE EXCEPTION 'Financial Security: Payments cannot be recorded against draft, non-finalized, or cancelled invoices.';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Direct DML check: Prevent application role from confirming online payments directly
    IF OLD."status" = 'PENDING' AND NEW."status" = 'CONFIRMED' THEN
      IF NEW."method" IN ('ONLINE_GATEWAY', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI') THEN
        IF SESSION_USER NOT IN ('seg_api_webhook', 'postgres', 'supabase_admin') THEN
          RAISE EXCEPTION 'Financial Security: Online gateway payments cannot be confirmed via direct DML by %. Webhook execution via confirm_online_payment() is required.', SESSION_USER;
        END IF;
      ELSE
        IF NEW."recordedById" IS NULL THEN
          RAISE EXCEPTION 'Financial Security: Manual payment confirmation requires recordedById.';
        END IF;

        SELECT r."code" INTO v_recorder_role
        FROM public."employees" e
        JOIN public."users" u ON e."userId" = u."id"
        JOIN public."roles" r ON u."roleId" = r."id"
        WHERE e."id" = NEW."recordedById";

        IF v_recorder_role NOT IN ('FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER') THEN
          RAISE EXCEPTION 'Financial Security: Employee % is not authorized to confirm manual payments.', NEW."recordedById";
        END IF;
      END IF;
    END IF;

    -- Financial immutability once confirmed
    IF OLD."status" IN ('CONFIRMED', 'PARTIALLY_REFUNDED', 'REFUNDED') THEN
      IF NEW."amount" IS DISTINCT FROM OLD."amount" OR
         NEW."invoiceId" IS DISTINCT FROM OLD."invoiceId" OR
         NEW."studentId" IS DISTINCT FROM OLD."studentId" OR
         NEW."currency" IS DISTINCT FROM OLD."currency" OR
         NEW."method" IS DISTINCT FROM OLD."method" OR
         NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey" OR
         NEW."idempotencyPayloadHash" IS DISTINCT FROM OLD."idempotencyPayloadHash" OR
         NEW."gatewayProvider" IS DISTINCT FROM OLD."gatewayProvider" OR
         NEW."gatewayOrderId" IS DISTINCT FROM OLD."gatewayOrderId" OR
         NEW."paidAt" IS DISTINCT FROM OLD."paidAt" OR
         NEW."transactionReference" IS DISTINCT FROM OLD."transactionReference" OR
         NEW."recordedById" IS DISTINCT FROM OLD."recordedById" THEN
        RAISE EXCEPTION 'Financial Security: Core financial attributes of confirmed/refunded payments are strictly immutable.';
      END IF;

      IF OLD."status" = 'CONFIRMED' AND NEW."status" NOT IN ('CONFIRMED', 'PARTIALLY_REFUNDED', 'REFUNDED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from CONFIRMED to %.', NEW."status";
      END IF;

      IF OLD."status" = 'PARTIALLY_REFUNDED' AND NEW."status" NOT IN ('PARTIALLY_REFUNDED', 'REFUNDED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from PARTIALLY_REFUNDED to %.', NEW."status";
      END IF;

      IF OLD."status" = 'REFUNDED' AND NEW."status" IS DISTINCT FROM OLD."status" THEN
        RAISE EXCEPTION 'Financial Security: Cannot change status of fully REFUNDED payment.';
      END IF;
    END IF;

    IF OLD."status" IN ('FAILED', 'CANCELLED') AND NEW."status" IS DISTINCT FROM OLD."status" THEN
      RAISE EXCEPTION 'Financial Security: Terminal payment state % cannot be revived.', OLD."status";
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public."payments"
FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_immutability();

CREATE OR REPLACE FUNCTION public.trg_sync_payment_to_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.reconcile_invoice_financials(OLD."invoiceId");
  ELSE
    PERFORM public.reconcile_invoice_financials(NEW."invoiceId");
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_payment_reconciliation
AFTER INSERT OR UPDATE OF "status", "amount" OR DELETE ON public."payments"
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_payment_to_invoice();

-- ------------------------------------------------------------------------------
-- 7. TRIGGERS: Refund Immutability, Anti-Spoofing & Reconciliation
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_refund_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pmt_status "PaymentStatus";
  v_pmt_amount DECIMAL(12,2);
  v_reserved_refunds DECIMAL(12,2);
  v_available_balance DECIMAL(12,2);
  v_processor_role TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" = 'PROCESSED' THEN
      RAISE EXCEPTION 'Financial Security: Processed refunds cannot be deleted (Refund ID: %).', OLD."id";
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW."amount" <= 0 THEN
      RAISE EXCEPTION 'Financial Security: Refund amount must be greater than zero.';
    END IF;

    -- Strict Lock Hierarchy: Lock invoice first, then payment
    PERFORM 1 FROM public."invoices" WHERE "id" = NEW."invoiceId" FOR UPDATE;

    SELECT "status", "amount"
    INTO v_pmt_status, v_pmt_amount
    FROM public."payments"
    WHERE "id" = NEW."paymentId"
    FOR UPDATE;

    IF v_pmt_status NOT IN ('CONFIRMED', 'PARTIALLY_REFUNDED') THEN
      RAISE EXCEPTION 'Financial Security: Refunds can only be requested against CONFIRMED or PARTIALLY_REFUNDED payments.';
    END IF;

    SELECT COALESCE(SUM("amount"), 0.00)
    INTO v_reserved_refunds
    FROM public."refunds"
    WHERE "paymentId" = NEW."paymentId"
      AND "status" IN ('REQUESTED', 'APPROVED', 'PROCESSED')
      AND ("id" IS DISTINCT FROM NEW."id");

    v_available_balance := v_pmt_amount - v_reserved_refunds;

    IF NEW."status" IN ('REQUESTED', 'APPROVED', 'PROCESSED') THEN
      IF NEW."amount" > v_available_balance THEN
        RAISE EXCEPTION 'Financial Security: Refund amount (%) exceeds available refundable balance (%).', NEW."amount", v_available_balance;
      END IF;
    END IF;

    -- Actor Presence & Role Authorization Check
    -- (Identity authentication is enforced at the NestJS JWT boundary where processedById is strictly bound to req.user.employeeId)
    IF NEW."status" IN ('APPROVED', 'PROCESSED') THEN
      IF NEW."processedById" IS NULL THEN
        RAISE EXCEPTION 'Financial Security: Approving or processing a refund requires processedById.';
      END IF;

      -- Verify that the actor referenced in processedById possesses an authorized role
      SELECT r."code" INTO v_processor_role
      FROM public."employees" e
      JOIN public."users" u ON e."userId" = u."id"
      JOIN public."roles" r ON u."roleId" = r."id"
      WHERE e."id" = NEW."processedById";

      IF v_processor_role NOT IN ('FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER') THEN
        RAISE EXCEPTION 'Financial Security: Employee % (role %) is not authorized to approve or process refunds.', NEW."processedById", v_processor_role;
      END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
      IF NEW."status" <> 'REQUESTED' THEN
        RAISE EXCEPTION 'Financial Security: New refunds must initiate strictly with REQUESTED status (attempted: %).', NEW."status";
      END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
      IF OLD."status" = 'PROCESSED' THEN
        IF NEW."amount" IS DISTINCT FROM OLD."amount" OR
           NEW."paymentId" IS DISTINCT FROM OLD."paymentId" OR
           NEW."invoiceId" IS DISTINCT FROM OLD."invoiceId" OR
           NEW."currency" IS DISTINCT FROM OLD."currency" OR
           NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey" OR
           NEW."idempotencyPayloadHash" IS DISTINCT FROM OLD."idempotencyPayloadHash" OR
           NEW."processedById" IS DISTINCT FROM OLD."processedById" OR
           NEW."processedAt" IS DISTINCT FROM OLD."processedAt" OR
           NEW."status" IS DISTINCT FROM OLD."status" THEN
          RAISE EXCEPTION 'Financial Security: Processed refunds are strictly immutable.';
        END IF;
      END IF;

      IF OLD."status" = 'REQUESTED' AND NEW."status" NOT IN ('REQUESTED', 'APPROVED', 'REJECTED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from REQUESTED to %.', NEW."status";
      END IF;

      IF OLD."status" = 'APPROVED' AND NEW."status" NOT IN ('APPROVED', 'PROCESSED', 'REJECTED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from APPROVED to %.', NEW."status";
      END IF;

      IF OLD."status" = 'REJECTED' AND NEW."status" IS DISTINCT FROM OLD."status" THEN
        RAISE EXCEPTION 'Financial Security: Cannot change status of REJECTED refund.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_refund_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public."refunds"
FOR EACH ROW EXECUTE FUNCTION public.enforce_refund_immutability();

CREATE OR REPLACE FUNCTION public.trg_sync_refund_to_payment_and_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_payment_id TEXT;
  v_target_invoice_id TEXT;
  v_pmt_amount DECIMAL(12,2);
  v_total_processed DECIMAL(12,2);
  v_new_pmt_status "PaymentStatus";
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target_payment_id := OLD."paymentId";
    v_target_invoice_id := OLD."invoiceId";
  ELSE
    v_target_payment_id := NEW."paymentId";
    v_target_invoice_id := NEW."invoiceId";
  END IF;

  -- Lock hierarchy: invoices first, then payments
  PERFORM 1 FROM public."invoices" WHERE "id" = v_target_invoice_id FOR UPDATE;

  SELECT "amount" INTO v_pmt_amount
  FROM public."payments" WHERE "id" = v_target_payment_id FOR UPDATE;

  SELECT COALESCE(SUM("amount"), 0.00) INTO v_total_processed
  FROM public."refunds"
  WHERE "paymentId" = v_target_payment_id AND "status" = 'PROCESSED';

  IF v_total_processed >= v_pmt_amount THEN
    v_new_pmt_status := 'REFUNDED';
  ELSIF v_total_processed > 0.00 THEN
    v_new_pmt_status := 'PARTIALLY_REFUNDED';
  ELSE
    v_new_pmt_status := 'CONFIRMED';
  END IF;

  UPDATE public."payments"
  SET "status" = v_new_pmt_status, "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = v_target_payment_id AND "status" <> v_new_pmt_status;

  PERFORM public.reconcile_invoice_financials(v_target_invoice_id);

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_refund_reconciliation
AFTER INSERT OR UPDATE OF "status", "amount" OR DELETE ON public."refunds"
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_refund_to_payment_and_invoice();

-- ------------------------------------------------------------------------------
-- 8. TRIGGERS: Invoice Finalization & Line Item Immutability
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_invoice_finalization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."isFinalized" = true OR OLD."status" NOT IN ('DRAFT', 'CANCELLED') THEN
      RAISE EXCEPTION 'Financial Security: Finalized or active invoices cannot be deleted (Invoice ID: %).', OLD."id";
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW."subtotal" < 0 OR NEW."totalAmount" < 0 OR NEW."taxAmount" < 0 OR NEW."discountAmount" < 0 OR NEW."paidAmount" < 0 THEN
      RAISE EXCEPTION 'Financial Security: Invoice monetary amounts cannot be negative.';
    END IF;

    IF NEW."status" = 'DRAFT' AND NEW."isFinalized" = true THEN
      RAISE EXCEPTION 'Financial Security: A DRAFT invoice cannot be initialized as finalized.';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD."isFinalized" = true AND NEW."isFinalized" = false THEN
      RAISE EXCEPTION 'Financial Security: Finalized invoices cannot be un-finalized or reopened.';
    END IF;

    IF OLD."isFinalized" = true AND NEW."status" = 'DRAFT' THEN
      RAISE EXCEPTION 'Financial Security: Finalized invoices cannot revert to DRAFT status.';
    END IF;

    IF OLD."status" = 'DRAFT' THEN
      IF NEW."status" NOT IN ('DRAFT', 'ISSUED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from DRAFT to %.', NEW."status";
      END IF;
      IF NEW."status" = 'ISSUED' AND NEW."isFinalized" = false THEN
        RAISE EXCEPTION 'Financial Security: Invoices transitioning to ISSUED must have isFinalized = true.';
      END IF;

    ELSIF OLD."status" = 'ISSUED' THEN
      IF NEW."status" NOT IN ('ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from ISSUED to %.', NEW."status";
      END IF;

    ELSIF OLD."status" = 'PARTIALLY_PAID' THEN
      IF NEW."status" NOT IN ('PARTIALLY_PAID', 'PAID', 'REFUNDED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from PARTIALLY_PAID to %.', NEW."status";
      END IF;

    ELSIF OLD."status" = 'PAID' THEN
      IF NEW."status" NOT IN ('PAID', 'PARTIALLY_PAID', 'REFUNDED') THEN
        RAISE EXCEPTION 'Financial Security: Invalid status transition from PAID to %.', NEW."status";
      END IF;

    ELSIF OLD."status" = 'CANCELLED' THEN
      IF NEW."status" IS DISTINCT FROM OLD."status" THEN
        RAISE EXCEPTION 'Financial Security: CANCELLED invoices are terminal and cannot change status.';
      END IF;

    ELSIF OLD."status" = 'REFUNDED' THEN
      IF NEW."status" IS DISTINCT FROM OLD."status" THEN
        RAISE EXCEPTION 'Financial Security: REFUNDED invoices are terminal and cannot change status.';
      END IF;
    END IF;

    IF OLD."isFinalized" = true THEN
      IF NEW."totalAmount" IS DISTINCT FROM OLD."totalAmount" OR
         NEW."subtotal" IS DISTINCT FROM OLD."subtotal" OR
         NEW."taxAmount" IS DISTINCT FROM OLD."taxAmount" OR
         NEW."discountAmount" IS DISTINCT FROM OLD."discountAmount" OR
         NEW."studentId" IS DISTINCT FROM OLD."studentId" OR
         NEW."enrolmentId" IS DISTINCT FROM OLD."enrolmentId" OR
         NEW."currency" IS DISTINCT FROM OLD."currency" OR
         NEW."issueDate" IS DISTINCT FROM OLD."issueDate" THEN
        RAISE EXCEPTION 'Financial Security: Finalized invoices cannot be directly edited. Adjustments must be issued via Credit/Debit Notes.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_finalization
BEFORE INSERT OR UPDATE OR DELETE ON public."invoices"
FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_finalization();

CREATE OR REPLACE FUNCTION public.enforce_invoice_item_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_finalized BOOLEAN;
  v_target_invoice_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target_invoice_id := OLD."invoiceId";
  ELSE
    v_target_invoice_id := NEW."invoiceId";
  END IF;

  SELECT "isFinalized" INTO v_is_finalized
  FROM public."invoices"
  WHERE "id" = v_target_invoice_id;

  IF v_is_finalized = true THEN
    RAISE EXCEPTION 'Financial Security: Cannot add, modify, or delete line items on a finalized invoice (Invoice ID: %).', v_target_invoice_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW."quantity" <= 0 THEN
      RAISE EXCEPTION 'Financial Security: Line item quantity must be greater than zero.';
    END IF;
    IF NEW."unitPrice" < 0 OR NEW."amount" < 0 THEN
      RAISE EXCEPTION 'Financial Security: Line item prices cannot be negative.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW."invoiceId" IS DISTINCT FROM OLD."invoiceId" THEN
    RAISE EXCEPTION 'Financial Security: Cannot reassign an invoice item to a different invoice.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_item_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public."invoice_items"
FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_item_immutability();

-- ------------------------------------------------------------------------------
-- 9. LEAST-PRIVILEGE ROLE GRANTS & PERMISSIONS
-- ------------------------------------------------------------------------------
-- Runtime Application Role (seg_api_app)
GRANT USAGE ON SCHEMA public TO seg_api_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO seg_api_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO seg_api_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO seg_api_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO seg_api_app;

-- Webhook Confirmation Role (seg_api_webhook)
GRANT USAGE ON SCHEMA public TO seg_api_webhook;
GRANT SELECT ON public."payments", public."invoices" TO seg_api_webhook;
GRANT EXECUTE ON FUNCTION public.confirm_online_payment(TEXT, TEXT, TEXT, TIMESTAMP(3)) TO seg_api_webhook;

COMMIT;
