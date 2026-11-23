import 'reflect-metadata';
import { test, describe, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { AcademicService } from '../academic.service';
import { BatchStatus, EnrolmentStatus } from '@seg/database';

describe('AcademicService Unit Tests', () => {
  let service: AcademicService;
  let mockPrisma: any;
  let mockAudit: any;

  const mockActor: any = {
    userId: 'usr-admin-1',
    roles: ['ADMIN'],
    permissions: [
      'courses:create',
      'courses:read',
      'courses:update',
      'batches:create',
      'batches:read',
      'batches:update',
      'enrolments:create',
      'enrolments:read',
      'enrolments:update',
    ],
  };

  const sampleCourse: any = {
    id: 'course-uuid-1',
    code: 'FS-WEB-01',
    title: 'Full Stack Web Development',
    durationWeeks: 24,
    baseFee: 125000,
    currency: 'INR',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleBatch: any = {
    id: 'batch-uuid-1',
    courseId: 'course-uuid-1',
    batchCode: 'FSW-2026-A',
    name: 'Cohort Alpha 2026',
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-09-01'),
    capacity: 2,
    status: BatchStatus.UPCOMING,
    _count: { enrolments: 1 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleStudent: any = {
    id: 'stu-uuid-1',
    studentCode: 'SEG-26-0001',
    fullName: 'Aarav Sharma',
  };

  beforeEach(() => {
    mockPrisma = {
      course: {
        findUnique: async (args: any) => {
          if (args.where.code === 'FS-WEB-01' || args.where.id === 'course-uuid-1') {
            return sampleCourse;
          }
          return null;
        },
        create: async (args: any) => ({
          id: 'course-uuid-2',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        count: async () => 1,
        findMany: async () => [sampleCourse],
        update: async (args: any) => ({
          ...sampleCourse,
          ...args.data,
        }),
      },
      batch: {
        findUnique: async (args: any) => {
          if (args.where.batchCode === 'FSW-2026-A' || args.where.id === 'batch-uuid-1') {
            return sampleBatch;
          }
          return null;
        },
        create: async (args: any) => ({
          id: 'batch-uuid-2',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        count: async () => 1,
        findMany: async () => [sampleBatch],
        update: async (args: any) => ({
          ...sampleBatch,
          ...args.data,
        }),
      },
      profileStudent: {
        findUnique: async (args: any) => {
          if (args.where.id === 'stu-uuid-1' || args.where.id === 'stu-uuid-2') {
            return { id: args.where.id, fullName: 'Student ' + args.where.id };
          }
          return null;
        },
      },
      enrolment: {
        count: async () => 1,
        findUnique: async (args: any) => {
          if (args.where.studentId_batchId) {
            if (
              args.where.studentId_batchId.studentId === 'stu-uuid-1' &&
              args.where.studentId_batchId.batchId === 'batch-uuid-1'
            ) {
              return {
                id: 'enr-uuid-1',
                studentId: 'stu-uuid-1',
                batchId: 'batch-uuid-1',
                status: EnrolmentStatus.ENROLLED,
              };
            }
          }
          if (args.where.id === 'enr-uuid-1') {
            return {
              id: 'enr-uuid-1',
              status: EnrolmentStatus.ENROLLED,
            };
          }
          return null;
        },
        create: async (args: any) => ({
          id: 'enr-uuid-2',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          student: { studentCode: 'SEG-26-0002', fullName: 'Student 2' },
          batch: { batchCode: 'FSW-2026-A', name: 'Cohort Alpha 2026' },
        }),
        findMany: async () => [],
        update: async (args: any) => ({
          id: args.where.id,
          status: args.data.status,
          finalGrade: args.data.finalGrade,
        }),
      },
    };

    mockAudit = {
      log: async () => {},
    };

    service = new AcademicService(mockPrisma, mockAudit);
  });

  test('1. createCourse - Creates course and rejects duplicate course code', async () => {
    const created = await service.createCourse(
      {
        code: 'DS-ML-01',
        title: 'Data Science & Machine Learning',
        durationWeeks: 30,
        baseFee: 150000,
      },
      mockActor,
    );
    assert.equal(created.code, 'DS-ML-01');

    await assert.rejects(
      async () => {
        await service.createCourse(
          {
            code: 'FS-WEB-01',
            title: 'Duplicate Code Test',
            durationWeeks: 20,
            baseFee: 100000,
          },
          mockActor,
        );
      },
      { name: 'ConflictException' },
    );
  });

  test('2. createBatch - Validates course existence, date constraints, and batch code uniqueness', async () => {
    const batch = await service.createBatch(
      {
        courseId: 'course-uuid-1',
        batchCode: 'FSW-2026-B',
        name: 'Cohort Beta 2026',
        startDate: '2026-04-01',
        endDate: '2026-10-01',
        capacity: 25,
      },
      mockActor,
    );
    assert.equal(batch.batchCode, 'FSW-2026-B');

    // Invalid dates (end before start)
    await assert.rejects(
      async () => {
        await service.createBatch(
          {
            courseId: 'course-uuid-1',
            batchCode: 'FSW-INVALID',
            name: 'Invalid Dates',
            startDate: '2026-05-01',
            endDate: '2026-04-01',
            capacity: 20,
          },
          mockActor,
        );
      },
      { name: 'BadRequestException' },
    );
  });

  test('3. enrolStudent - Prevents duplicate enrolment in the same batch', async () => {
    await assert.rejects(
      async () => {
        await service.enrolStudent(
          {
            studentId: 'stu-uuid-1',
            batchId: 'batch-uuid-1',
          },
          mockActor,
        );
      },
      { name: 'ConflictException' },
    );
  });

  test('4. enrolStudent - Successfully enrols new student into batch', async () => {
    const enr = await service.enrolStudent(
      {
        studentId: 'stu-uuid-2',
        batchId: 'batch-uuid-1',
      },
      mockActor,
    );
    assert.ok(enr.enrolmentNumber.startsWith('ENR-'));
    assert.equal(enr.studentId, 'stu-uuid-2');
  });

  test('5. updateEnrolmentStatus - Updates status to GRADUATED with final grade', async () => {
    const updated = await service.updateEnrolmentStatus(
      'enr-uuid-1',
      {
        status: EnrolmentStatus.GRADUATED,
        finalGrade: 'A+',
      },
      mockActor,
    );
    assert.equal(updated.status, EnrolmentStatus.GRADUATED);
    assert.equal(updated.finalGrade, 'A+');
  });
});
