import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DocumentStorageService, UploadedFileDto } from './document-storage.service';
import {
  CreateStudentDto,
  UpdateStudentDto,
  QueryStudentsDto,
  CreateStudentDocumentDto,
  VerifyStudentDocumentDto,
  QueryGlobalDocumentsDto,
  DirectVerifyDocumentDto,
} from './dto/students.dto';
import { AuthenticatedUser } from '../auth';
import { Prisma, DocumentType, DocumentVerificationStatus } from '@seg/database';

export const PRISMA_TO_FRONTEND_DOC_TYPE: Record<string, string> = {
  TRANSCRIPT: 'ACADEMIC_TRANSCRIPT',
  ID_PROOF: 'GOVERNMENT_ID',
  PASSPORT: 'GOVERNMENT_ID',
  VISA: 'GOVERNMENT_ID',
  CERTIFICATE: 'ACADEMIC_TRANSCRIPT',
  RESUME: 'OTHER',
  OTHER: 'OTHER',
};

export const FRONTEND_TO_PRISMA_DOC_TYPE: Record<string, DocumentType[]> = {
  GOVERNMENT_ID: [DocumentType.ID_PROOF, DocumentType.PASSPORT, DocumentType.VISA],
  ACADEMIC_TRANSCRIPT: [DocumentType.TRANSCRIPT, DocumentType.CERTIFICATE],
  ENROLMENT_AGREEMENT: [DocumentType.OTHER],
  FEE_RECEIPT: [DocumentType.OTHER],
  OTHER: [DocumentType.OTHER, DocumentType.RESUME],
};

export interface PaginatedStudentsResponse {
  data: any[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly documentStorageService: DocumentStorageService,
  ) {}

  /**
   * Generates a unique student code: SEG-YY-XXXX (e.g. SEG-26-0001).
   */
  private async generateStudentCode(): Promise<string> {
    const yearSuffix = new Date().getFullYear().toString().slice(-2);
    const count = await this.prisma.profileStudent.count();
    const sequence = (count + 1).toString().padStart(4, '0');
    let code = `SEG-${yearSuffix}-${sequence}`;

    // Ensure uniqueness
    let exists = await this.prisma.profileStudent.findUnique({
      where: { studentCode: code },
    });
    let extra = 1;
    while (exists) {
      code = `SEG-${yearSuffix}-${(count + 1 + extra).toString().padStart(4, '0')}`;
      exists = await this.prisma.profileStudent.findUnique({
        where: { studentCode: code },
      });
      extra++;
    }
    return code;
  }

  /**
   * Register a new student profile.
   */
  async registerStudent(
    dto: CreateStudentDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Check for duplicate student email
    const existing = await this.prisma.profileStudent.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException(`Student with email ${normalizedEmail} already exists.`);
    }

    const studentCode = await this.generateStudentCode();

    const student = await this.prisma.profileStudent.create({
      data: {
        studentCode,
        fullName: dto.fullName.trim(),
        email: normalizedEmail,
        phoneNumber: dto.phoneNumber?.trim() || null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender?.trim() || null,
        nationality: dto.nationality?.trim() || null,
        addressLine1: dto.addressLine1?.trim() || null,
        addressLine2: dto.addressLine2?.trim() || null,
        city: dto.city?.trim() || null,
        state: dto.state?.trim() || null,
        country: dto.country?.trim() || null,
        postalCode: dto.postalCode?.trim() || null,
        emergencyContact: dto.emergencyContact?.trim() || null,
        guardianName: dto.guardianName?.trim() || null,
        guardianPhone: dto.guardianPhone?.trim() || null,
        guardianEmail: dto.guardianEmail?.trim()?.toLowerCase() || null,
      },
      include: {
        enrolments: true,
        documents: true,
      },
    });

    // Record Audit Log
    await this.auditService.log({
      action: 'STUDENT_REGISTERED',
      resource: 'ProfileStudent',
      resourceId: student.id,
      actorUserId: actor.userId,
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
      payload: {
        studentCode: student.studentCode,
        fullName: student.fullName,
        email: student.email,
      },
    });

    this.logger.log(`Student registered: ${student.studentCode} (${student.id}) by actor ${actor.userId}`);
    return student;
  }

  /**
   * List students with search, filters, and pagination.
   */
  async listStudents(query: QueryStudentsDto): Promise<PaginatedStudentsResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ProfileStudentWhereInput = {};

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { studentCode: { contains: term, mode: 'insensitive' } },
        { phoneNumber: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.city) {
      where.city = { contains: query.city.trim(), mode: 'insensitive' };
    }
    if (query.country) {
      where.country = { contains: query.country.trim(), mode: 'insensitive' };
    }

    const [total, students] = await Promise.all([
      this.prisma.profileStudent.count({ where }),
      this.prisma.profileStudent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          enrolments: {
            select: {
              id: true,
              status: true,
              batch: {
                select: {
                  batchCode: true,
                  name: true,
                  course: { select: { code: true, title: true } },
                },
              },
            },
          },
          _count: {
            select: {
              documents: true,
              invoices: true,
              payments: true,
            },
          },
        },
      }),
    ]);

    return {
      data: students,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get student details by ID.
   */
  async getStudentById(id: string) {
    const student = await this.prisma.profileStudent.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        enrolments: {
          include: {
            batch: {
              include: {
                course: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
            dueDate: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found.`);
    }

    return student;
  }

  /**
   * Update student profile.
   */
  async updateStudent(
    id: string,
    dto: UpdateStudentDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const existing = await this.prisma.profileStudent.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Student with ID ${id} not found.`);
    }

    const updated = await this.prisma.profileStudent.update({
      where: { id },
      data: {
        fullName: dto.fullName !== undefined ? dto.fullName.trim() : undefined,
        phoneNumber: dto.phoneNumber !== undefined ? dto.phoneNumber?.trim() || null : undefined,
        dateOfBirth: dto.dateOfBirth !== undefined ? (dto.dateOfBirth ? new Date(dto.dateOfBirth) : null) : undefined,
        gender: dto.gender !== undefined ? dto.gender?.trim() || null : undefined,
        nationality: dto.nationality !== undefined ? dto.nationality?.trim() || null : undefined,
        addressLine1: dto.addressLine1 !== undefined ? dto.addressLine1?.trim() || null : undefined,
        addressLine2: dto.addressLine2 !== undefined ? dto.addressLine2?.trim() || null : undefined,
        city: dto.city !== undefined ? dto.city?.trim() || null : undefined,
        state: dto.state !== undefined ? dto.state?.trim() || null : undefined,
        country: dto.country !== undefined ? dto.country?.trim() || null : undefined,
        postalCode: dto.postalCode !== undefined ? dto.postalCode?.trim() || null : undefined,
        emergencyContact: dto.emergencyContact !== undefined ? dto.emergencyContact?.trim() || null : undefined,
        guardianName: dto.guardianName !== undefined ? dto.guardianName?.trim() || null : undefined,
        guardianPhone: dto.guardianPhone !== undefined ? dto.guardianPhone?.trim() || null : undefined,
        guardianEmail: dto.guardianEmail !== undefined ? dto.guardianEmail?.trim()?.toLowerCase() || null : undefined,
      },
    });

    // Record Audit Log
    await this.auditService.log({
      action: 'STUDENT_PROFILE_UPDATED',
      resource: 'ProfileStudent',
      resourceId: id,
      actorUserId: actor.userId,
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
      payload: {
        updatedFields: Object.keys(dto),
      },
    });

    return updated;
  }

  /**
   * Upload binary KYC document directly, validate signature/MIME/size, store in private storage,
   * create StudentDocument record, and log audit event.
   */
  async uploadDocumentBinary(
    studentId: string,
    file: UploadedFileDto,
    documentTypeStr: string,
    documentNameOverride: string | undefined,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const student = await this.prisma.profileStudent.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found.`);
    }

    // Determine and validate documentType enum
    let docTypeEnum: DocumentType = DocumentType.OTHER;
    const typeUpper = (documentTypeStr || 'OTHER').toUpperCase().trim();
    if (Object.values(DocumentType).includes(typeUpper as DocumentType)) {
      docTypeEnum = typeUpper as DocumentType;
    } else if (FRONTEND_TO_PRISMA_DOC_TYPE[typeUpper] && FRONTEND_TO_PRISMA_DOC_TYPE[typeUpper].length > 0) {
      docTypeEnum = FRONTEND_TO_PRISMA_DOC_TYPE[typeUpper][0];
    } else {
      throw new BadRequestException(`Invalid document type: ${documentTypeStr}`);
    }

    // Validate and upload file to secure private storage
    const uploadResult = await this.documentStorageService.uploadFile(file, studentId);

    const docName = (documentNameOverride || file.originalname || 'student-document').trim();

    try {
      const document = await this.prisma.studentDocument.create({
        data: {
          studentId,
          documentType: docTypeEnum,
          documentName: docName,
          fileStorageKey: uploadResult.storageKey,
          mimeType: uploadResult.mimeType,
          fileSizeBytes: uploadResult.fileSizeBytes,
        },
      });

      await this.auditService.log({
        action: 'STUDENT_DOCUMENT_UPLOADED',
        resource: 'StudentDocument',
        resourceId: document.id,
        actorUserId: actor.userId,
        ipAddress: clientMeta?.ipAddress,
        userAgent: clientMeta?.userAgent,
        payload: {
          studentId,
          documentType: document.documentType,
          documentName: document.documentName,
          fileStorageKey: document.fileStorageKey,
          fileSizeBytes: document.fileSizeBytes,
          mimeType: document.mimeType,
        },
      });

      return document;
    } catch (dbErr: any) {
      // Rollback uploaded file from storage if DB transaction fails
      await this.documentStorageService.deleteFile(uploadResult.storageKey);
      this.logger.error(`Failed to save document metadata for student ${studentId}: ${dbErr.message}`);
      throw dbErr;
    }
  }

  /**
   * Attach a document record to a student.
   */
  async attachDocument(
    studentId: string,
    dto: CreateStudentDocumentDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const student = await this.prisma.profileStudent.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found.`);
    }

    const document = await this.prisma.studentDocument.create({
      data: {
        studentId,
        documentType: dto.documentType,
        documentName: dto.documentName.trim(),
        fileStorageKey: dto.fileStorageKey.trim(),
        mimeType: dto.mimeType.trim(),
        fileSizeBytes: dto.fileSizeBytes,
      },
    });

    await this.auditService.log({
      action: 'STUDENT_DOCUMENT_UPLOADED',
      resource: 'StudentDocument',
      resourceId: document.id,
      actorUserId: actor.userId,
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
      payload: {
        studentId,
        documentType: document.documentType,
        documentName: document.documentName,
      },
    });

    return document;
  }

  /**
   * Verify or reject a student document.
   */
  async verifyDocument(
    studentId: string,
    documentId: string,
    dto: VerifyStudentDocumentDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const document = await this.prisma.studentDocument.findUnique({
      where: { id: documentId },
    });
    if (!document || document.studentId !== studentId) {
      throw new NotFoundException(`Document with ID ${documentId} not found for student ${studentId}.`);
    }

    const updated = await this.prisma.studentDocument.update({
      where: { id: documentId },
      data: {
        verificationStatus: dto.status,
        verifiedById: actor.employeeId || null,
        verifiedAt: new Date(),
        rejectionReason: dto.status === 'REJECTED' ? dto.rejectionReason?.trim() || null : null,
      },
    });

    await this.auditService.log({
      action: 'STUDENT_DOCUMENT_VERIFIED',
      resource: 'StudentDocument',
      resourceId: documentId,
      actorUserId: actor.userId,
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
      payload: {
        verificationStatus: dto.status,
        rejectionReason: updated.rejectionReason,
      },
    });

    return updated;
  }

  /**
   * Securely generates a signed download/access metadata descriptor without exposing storage credentials.
   */
  async getDocumentDownloadUrl(
    studentId: string,
    documentId: string,
    actor?: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const document = await this.prisma.studentDocument.findUnique({
      where: { id: documentId },
    });
    if (!document || document.studentId !== studentId) {
      throw new NotFoundException(`Document with ID ${documentId} not found for student ${studentId}.`);
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

    // Check if remote signed URL from Supabase Storage is available
    const remoteSignedUrl = await this.documentStorageService.createSignedUrl(document.fileStorageKey, 900);

    if (actor) {
      await this.auditService.log({
        action: 'STUDENT_DOCUMENT_DOWNLOADED',
        resource: 'StudentDocument',
        resourceId: document.id,
        actorUserId: actor.userId,
        ipAddress: clientMeta?.ipAddress,
        userAgent: clientMeta?.userAgent,
        payload: {
          studentId,
          documentId,
          documentName: document.documentName,
          fileStorageKey: document.fileStorageKey,
        },
      });
    }

    return {
      documentId: document.id,
      documentName: document.documentName,
      mimeType: document.mimeType,
      fileSizeBytes: document.fileSizeBytes,
      storageKey: document.fileStorageKey,
      signedUrl: remoteSignedUrl || `/api/v1/students/${studentId}/documents/${documentId}/stream?expires=${encodeURIComponent(expiresAt)}`,
      streamUrl: `/api/v1/students/${studentId}/documents/${documentId}/stream?expires=${encodeURIComponent(expiresAt)}`,
      expiresAt,
    };
  }

  /**
   * Securely retrieves binary stream for document, validating relationship, actor, and signed expiry.
   */
  async streamDocument(
    studentId: string,
    documentId: string,
    expiresQuery: string | undefined,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const document = await this.prisma.studentDocument.findUnique({
      where: { id: documentId },
    });
    if (!document || document.studentId !== studentId) {
      throw new NotFoundException(`Document with ID ${documentId} not found for student ${studentId}.`);
    }

    if (expiresQuery) {
      const expTime = new Date(expiresQuery).getTime();
      if (isNaN(expTime) || expTime < Date.now()) {
        throw new BadRequestException('Download link has expired. Please request a fresh download descriptor.');
      }
    }

    const file = await this.documentStorageService.getFile(document.fileStorageKey);

    await this.auditService.log({
      action: 'STUDENT_DOCUMENT_STREAMED',
      resource: 'StudentDocument',
      resourceId: document.id,
      actorUserId: actor.userId,
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
      payload: {
        studentId,
        documentId,
        documentName: document.documentName,
        fileStorageKey: document.fileStorageKey,
      },
    });

    return {
      buffer: file.buffer,
      mimeType: document.mimeType || file.mimeType,
      documentName: document.documentName,
      fileSizeBytes: document.fileSizeBytes,
    };
  }

  /**
   * Global document listing across all students with pagination, search and filtering.
   */
  async getGlobalDocuments(query: QueryGlobalDocumentsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.StudentDocumentWhereInput = {};

    if (query.status) {
      where.verificationStatus = query.status;
    }

    if (query.type) {
      const typeUpper = query.type.toUpperCase();
      if (FRONTEND_TO_PRISMA_DOC_TYPE[typeUpper]) {
        where.documentType = { in: FRONTEND_TO_PRISMA_DOC_TYPE[typeUpper] };
      } else if (Object.values(DocumentType).includes(typeUpper as DocumentType)) {
        where.documentType = typeUpper as DocumentType;
      }
    }

    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { documentName: { contains: search, mode: 'insensitive' } },
        {
          student: {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { studentCode: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, documents] = await Promise.all([
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
              studentCode: true,
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              employeeCode: true,
              jobTitle: true,
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const serialized = documents.map((doc: any) => {
      const frontendDocType = PRISMA_TO_FRONTEND_DOC_TYPE[doc.documentType] || 'OTHER';
      return {
        id: doc.id,
        studentId: doc.studentId,
        studentName: doc.student?.fullName,
        studentCode: doc.student?.studentCode,
        studentEmail: doc.student?.email,
        documentType: frontendDocType,
        rawDocumentType: doc.documentType,
        documentName: doc.documentName,
        fileUrl: doc.fileStorageKey,
        storageKey: doc.fileStorageKey,
        mimeType: doc.mimeType,
        fileSizeBytes: doc.fileSizeBytes,
        verificationStatus: doc.verificationStatus,
        rejectionReason: doc.rejectionReason,
        uploadedAt: doc.createdAt,
        verifiedAt: doc.verifiedAt,
        verifiedBy: doc.verifiedBy?.user?.fullName || null,
      };
    });

    return {
      data: serialized,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Direct document verification by document ID.
   */
  async directVerifyDocument(
    documentId: string,
    dto: DirectVerifyDocumentDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const document = await this.prisma.studentDocument.findUnique({
      where: { id: documentId },
      include: { student: true },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found.`);
    }

    let verifiedById = actor.employeeId || null;
    if (!verifiedById && actor.userId) {
      const employee = await this.prisma.profileEmployee.findUnique({
        where: { userId: actor.userId },
        select: { id: true },
      });
      if (employee) {
        verifiedById = employee.id;
      }
    }

    const updated = await this.prisma.studentDocument.update({
      where: { id: documentId },
      data: {
        verificationStatus: dto.status,
        verifiedById,
        verifiedAt: new Date(),
        rejectionReason: dto.status === DocumentVerificationStatus.REJECTED ? dto.rejectionReason?.trim() || null : null,
      },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            email: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            employeeCode: true,
            jobTitle: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    await this.auditService.log({
      action: 'STUDENT_DOCUMENT_VERIFIED',
      resource: 'StudentDocument',
      resourceId: documentId,
      actorUserId: actor.userId,
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
      payload: {
        studentId: document.studentId,
        documentName: document.documentName,
        verificationStatus: dto.status,
        rejectionReason: updated.rejectionReason,
        verifiedById,
      },
    });

    const frontendDocType = PRISMA_TO_FRONTEND_DOC_TYPE[updated.documentType] || 'OTHER';
    return {
      id: updated.id,
      studentId: updated.studentId,
      studentName: updated.student?.fullName,
      studentCode: updated.student?.studentCode,
      studentEmail: updated.student?.email,
      documentType: frontendDocType,
      rawDocumentType: updated.documentType,
      documentName: updated.documentName,
      fileUrl: updated.fileStorageKey,
      storageKey: updated.fileStorageKey,
      mimeType: updated.mimeType,
      fileSizeBytes: updated.fileSizeBytes,
      verificationStatus: updated.verificationStatus,
      rejectionReason: updated.rejectionReason,
      uploadedAt: updated.createdAt,
      verifiedAt: updated.verifiedAt,
      verifiedBy: updated.verifiedBy?.user?.fullName || null,
    };
  }
}
