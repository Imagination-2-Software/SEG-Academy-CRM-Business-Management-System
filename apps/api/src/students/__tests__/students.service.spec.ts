import 'reflect-metadata';
import { test, describe, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { StudentsService } from '../students.service';
import { DocumentType, DocumentVerificationStatus } from '@seg/database';

import { DocumentStorageService } from '../document-storage.service';

describe('StudentsService Unit Tests', () => {
  let service: StudentsService;
  let mockPrisma: any;
  let mockAudit: any;
  let storageService: DocumentStorageService;

  const mockActor: any = {
    userId: 'usr-admin-1',
    email: 'admin@segacademy.com',
    roles: ['ADMIN'],
    permissions: ['students:create', 'students:read', 'students:update'],
  };

  const sampleStudent: any = {
    id: 'stu-uuid-1',
    studentCode: 'SEG-26-0001',
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phoneNumber: '+919876543210',
    dateOfBirth: new Date('2004-05-15'),
    gender: 'Male',
    nationality: 'Indian',
    city: 'Mumbai',
    country: 'India',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      profileStudent: {
        findUnique: async (args: any) => {
          if (args.where.email === 'aarav.sharma@example.com' || args.where.id === 'stu-uuid-1') {
            return sampleStudent;
          }
          return null;
        },
        create: async (args: any) => ({
          id: 'stu-uuid-2',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          enrolments: [],
          documents: [],
        }),
        count: async () => 1,
        findMany: async () => [sampleStudent],
        update: async (args: any) => ({
          ...sampleStudent,
          ...args.data,
        }),
      },
      studentDocument: {
        create: async (args: any) => ({
          id: 'doc-uuid-1',
          ...args.data,
          verificationStatus: DocumentVerificationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findUnique: async (args: any) => {
          if (args.where.id === 'doc-uuid-1') {
            return {
              id: 'doc-uuid-1',
              studentId: 'stu-uuid-1',
              documentType: DocumentType.TRANSCRIPT,
              documentName: 'transcript.pdf',
              fileStorageKey: 'students/stu-uuid-1/transcript.pdf',
              mimeType: 'application/pdf',
              fileSizeBytes: 500000,
              verificationStatus: DocumentVerificationStatus.PENDING,
            };
          }
          return null;
        },
        update: async (args: any) => ({
          id: args.where.id,
          verificationStatus: args.data.verificationStatus,
          rejectionReason: args.data.rejectionReason,
        }),
      },
    };

    mockAudit = {
      log: async () => {},
    };

    storageService = new DocumentStorageService();
    service = new StudentsService(mockPrisma, mockAudit, storageService);
  });

  test('1. registerStudent - Creates a student with generated student code and audit log', async () => {
    const result = await service.registerStudent(
      {
        fullName: 'Kavya Patel',
        email: 'kavya.patel@example.com',
        phoneNumber: '+919876543220',
      },
      mockActor,
    );

    assert.equal(result.fullName, 'Kavya Patel');
    assert.equal(result.email, 'kavya.patel@example.com');
    assert.ok(result.studentCode.startsWith('SEG-'));
  });

  test('2. registerStudent - Rejects duplicate student email with ConflictException', async () => {
    await assert.rejects(
      async () => {
        await service.registerStudent(
          {
            fullName: 'Duplicate Aarav',
            email: 'aarav.sharma@example.com',
          },
          mockActor,
        );
      },
      {
        name: 'ConflictException',
      },
    );
  });

  test('3. listStudents - Returns paginated list of students', async () => {
    const result = await service.listStudents({ page: 1, limit: 10 });
    assert.equal(result.data.length, 1);
    assert.equal(result.meta.page, 1);
    assert.equal(result.meta.total, 1);
  });

  test('4. getStudentById - Returns student details or throws NotFoundException', async () => {
    const student = await service.getStudentById('stu-uuid-1');
    assert.equal(student.id, 'stu-uuid-1');

    await assert.rejects(
      async () => {
        await service.getStudentById('non-existent-id');
      },
      {
        name: 'NotFoundException',
      },
    );
  });

  test('5. updateStudent - Updates non-sensitive profile attributes', async () => {
    const updated = await service.updateStudent(
      'stu-uuid-1',
      { city: 'Pune', phoneNumber: '+919999999999' },
      mockActor,
    );
    assert.equal(updated.city, 'Pune');
    assert.equal(updated.phoneNumber, '+919999999999');
  });

  test('6. attachDocument & getDocumentDownloadUrl - Manages documents and generates signed url', async () => {
    const doc = await service.attachDocument(
      'stu-uuid-1',
      {
        documentType: DocumentType.TRANSCRIPT,
        documentName: 'transcript.pdf',
        fileStorageKey: 'students/stu-uuid-1/transcript.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 500000,
      },
      mockActor,
    );

    assert.equal(doc.documentType, DocumentType.TRANSCRIPT);

    const downloadInfo = await service.getDocumentDownloadUrl('stu-uuid-1', 'doc-uuid-1');
    assert.ok(downloadInfo.signedUrl.includes('/stream?expires='));
    assert.equal(downloadInfo.documentName, 'transcript.pdf');
  });

  test('7. verifyDocument - Updates document status to VERIFIED or REJECTED', async () => {
    const verified = await service.verifyDocument(
      'stu-uuid-1',
      'doc-uuid-1',
      { status: DocumentVerificationStatus.VERIFIED },
      mockActor,
    );
    assert.equal(verified.verificationStatus, DocumentVerificationStatus.VERIFIED);
  });

  test('8. getGlobalDocuments - Returns paginated global documents with mapped enum and student details', async () => {
    mockPrisma.studentDocument.count = async (args: any) => 1;
    mockPrisma.studentDocument.findMany = async (args: any) => [
      {
        id: 'doc-uuid-1',
        studentId: 'stu-uuid-1',
        documentType: DocumentType.TRANSCRIPT,
        documentName: 'transcript.pdf',
        fileStorageKey: 'students/stu-uuid-1/transcript.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 500000,
        verificationStatus: DocumentVerificationStatus.PENDING,
        uploadedAt: new Date(),
        verifiedAt: null,
        rejectionReason: null,
        student: {
          id: 'stu-uuid-1',
          studentCode: 'SEG-26-0001',
          fullName: 'Aarav Sharma',
          email: 'aarav.sharma@example.com',
          phoneNumber: '+919876543210',
        },
        verifiedBy: null,
      },
    ];

    const result = await service.getGlobalDocuments({
      page: 1,
      limit: 10,
      status: DocumentVerificationStatus.PENDING,
      type: 'ACADEMIC_TRANSCRIPT',
    });

    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].id, 'doc-uuid-1');
    assert.equal(result.data[0].documentType, 'ACADEMIC_TRANSCRIPT');
    assert.equal(result.data[0].studentName, 'Aarav Sharma');
    assert.equal(result.data[0].studentCode, 'SEG-26-0001');
    assert.equal(result.meta.total, 1);
    assert.equal(result.meta.page, 1);
  });

  test('9. directVerifyDocument - Successfully approves document by documentId', async () => {
    mockPrisma.studentDocument.findUnique = async (args: any) => {
      if (args.where.id === 'doc-uuid-1') {
        return {
          id: 'doc-uuid-1',
          studentId: 'stu-uuid-1',
          documentType: DocumentType.TRANSCRIPT,
          documentName: 'transcript.pdf',
          fileStorageKey: 'students/stu-uuid-1/transcript.pdf',
          student: {
            id: 'stu-uuid-1',
            studentCode: 'SEG-26-0001',
            fullName: 'Aarav Sharma',
            email: 'aarav.sharma@example.com',
          },
        };
      }
      return null;
    };

    mockPrisma.studentDocument.update = async (args: any) => ({
      id: args.where.id,
      studentId: 'stu-uuid-1',
      documentType: DocumentType.TRANSCRIPT,
      documentName: 'transcript.pdf',
      fileStorageKey: 'students/stu-uuid-1/transcript.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 500000,
      verificationStatus: args.data.verificationStatus,
      rejectionReason: args.data.rejectionReason,
      createdAt: new Date(),
      verifiedAt: args.data.verifiedAt,
      student: {
        id: 'stu-uuid-1',
        studentCode: 'SEG-26-0001',
        fullName: 'Aarav Sharma',
        email: 'aarav.sharma@example.com',
      },
      verifiedBy: {
        id: 'emp-1',
        employeeCode: 'EMP-001',
        jobTitle: 'Admin',
        user: {
          fullName: 'Jane Admin',
        },
      },
    });

    mockPrisma.profileEmployee = {
      findUnique: async () => ({ id: 'emp-1' }),
    };

    const verified = await service.directVerifyDocument(
      'doc-uuid-1',
      { status: DocumentVerificationStatus.VERIFIED },
      mockActor,
    );

    assert.equal(verified.verificationStatus, DocumentVerificationStatus.VERIFIED);
    assert.equal(verified.verifiedBy, 'Jane Admin');
    assert.equal(verified.documentType, 'ACADEMIC_TRANSCRIPT');
  });

  test('10. directVerifyDocument - Throws NotFoundException if document does not exist', async () => {
    mockPrisma.studentDocument.findUnique = async () => null;

    await assert.rejects(
      async () => {
        await service.directVerifyDocument(
          'non-existent-doc',
          { status: DocumentVerificationStatus.VERIFIED },
          mockActor,
        );
      },
      {
        name: 'NotFoundException',
      },
    );
  });

  test('11. uploadDocumentBinary - Successfully validates signature and uploads authentic PDF', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 test document content here');
    const file = {
      fieldname: 'file',
      originalname: 'degree_certificate.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: pdfBuffer.length,
      buffer: pdfBuffer,
    };

    const doc = await service.uploadDocumentBinary(
      'stu-uuid-1',
      file,
      'TRANSCRIPT',
      'Degree Certificate',
      mockActor,
    );

    assert.equal(doc.studentId, 'stu-uuid-1');
    assert.equal(doc.documentName, 'Degree Certificate');
    assert.equal(doc.mimeType, 'application/pdf');
    assert.ok(doc.fileStorageKey.startsWith('students/stu-uuid-1/kyc/'));
    assert.ok(doc.fileStorageKey.endsWith('.pdf'));
  });

  test('12. uploadDocumentBinary - Successfully uploads authentic PNG image', async () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const file = {
      fieldname: 'file',
      originalname: 'passport_scan.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: pngBuffer.length,
      buffer: pngBuffer,
    };

    const doc = await service.uploadDocumentBinary(
      'stu-uuid-1',
      file,
      'PASSPORT',
      'Passport Front',
      mockActor,
    );

    assert.equal(doc.studentId, 'stu-uuid-1');
    assert.equal(doc.documentType, DocumentType.PASSPORT);
    assert.equal(doc.mimeType, 'image/png');
    assert.ok(doc.fileStorageKey.endsWith('.png'));
  });

  test('13. uploadDocumentBinary - Rejects spoofed MIME type with invalid magic bytes', async () => {
    // Declared as PDF, but contents are fake executable or random text without %PDF-
    const fakeBuffer = Buffer.from('MZ... NOT A REAL PDF FILE');
    const file = {
      fieldname: 'file',
      originalname: 'malicious.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: fakeBuffer.length,
      buffer: fakeBuffer,
    };

    await assert.rejects(
      async () => {
        await service.uploadDocumentBinary(
          'stu-uuid-1',
          file,
          'TRANSCRIPT',
          undefined,
          mockActor,
        );
      },
      {
        name: 'BadRequestException',
      },
    );
  });

  test('14. uploadDocumentBinary - Rejects oversized files exceeding limit', async () => {
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    bigBuffer[0] = 0x25;
    bigBuffer[1] === 0x50;
    bigBuffer[2] === 0x44;
    bigBuffer[3] === 0x46; // starts with %PDF

    const file = {
      fieldname: 'file',
      originalname: 'giant_file.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: bigBuffer.length,
      buffer: bigBuffer,
    };

    await assert.rejects(
      async () => {
        await service.uploadDocumentBinary(
          'stu-uuid-1',
          file,
          'TRANSCRIPT',
          undefined,
          mockActor,
        );
      },
      {
        name: 'BadRequestException',
      },
    );
  });

  test('15. uploadDocumentBinary - Rejects invalid extensions and disallowed formats', async () => {
    const txtBuffer = Buffer.from('hello world text file');
    const file = {
      fieldname: 'file',
      originalname: 'document.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      size: txtBuffer.length,
      buffer: txtBuffer,
    };

    await assert.rejects(
      async () => {
        await service.uploadDocumentBinary(
          'stu-uuid-1',
          file,
          'OTHER',
          undefined,
          mockActor,
        );
      },
      {
        name: 'BadRequestException',
      },
    );
  });

  test('16. streamDocument - Successfully streams valid student document with audit log', async () => {
    // stu-uuid-1 has doc-uuid-1 in mockPrisma
    const streamed = await service.streamDocument(
      'stu-uuid-1',
      'doc-uuid-1',
      undefined,
      mockActor,
    );

    assert.ok(streamed.buffer);
    assert.equal(streamed.documentName, 'transcript.pdf');
    assert.equal(streamed.mimeType, 'application/pdf');
  });

  test('17. streamDocument - Rejects cross-student document access attempt', async () => {
    // doc-uuid-1 belongs to stu-uuid-1, attempting to access via stu-uuid-999
    await assert.rejects(
      async () => {
        await service.streamDocument(
          'stu-uuid-999',
          'doc-uuid-1',
          undefined,
          mockActor,
        );
      },
      {
        name: 'NotFoundException',
      },
    );
  });

  test('18. streamDocument - Rejects expired download link query', async () => {
    const expiredTimestamp = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago
    await assert.rejects(
      async () => {
        await service.streamDocument(
          'stu-uuid-1',
          'doc-uuid-1',
          expiredTimestamp,
          mockActor,
        );
      },
      {
        name: 'BadRequestException',
      },
    );
  });

  test('19. getDocumentDownloadUrl - Returns signed descriptor with expiration', async () => {
    const res = await service.getDocumentDownloadUrl('stu-uuid-1', 'doc-uuid-1', mockActor);
    assert.equal(res.documentId, 'doc-uuid-1');
    assert.ok(res.signedUrl);
    assert.ok(res.streamUrl);
    assert.ok(res.expiresAt);
  });
});
