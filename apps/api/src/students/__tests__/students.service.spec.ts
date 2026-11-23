import 'reflect-metadata';
import { test, describe, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { StudentsService } from '../students.service';
import { DocumentType, DocumentVerificationStatus } from '@seg/database';

describe('StudentsService Unit Tests', () => {
  let service: StudentsService;
  let mockPrisma: any;
  let mockAudit: any;

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

    service = new StudentsService(mockPrisma, mockAudit);
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
});
