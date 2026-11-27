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

  // ===========================================================================
  // COURSE MANAGEMENT UNIT TESTS (listCourses, getCourseById, updateCourse)
  // ===========================================================================

  test('6. listCourses - Default pagination and query parameters', async () => {
    let capturedArgs: any = null;
    mockPrisma.course.findMany = async (args: any) => {
      capturedArgs = args;
      return [sampleCourse];
    };
    mockPrisma.course.count = async () => 1;

    const result = await service.listCourses({});

    assert.equal(result.data.length, 1);
    assert.deepEqual(result.meta, {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    assert.equal(capturedArgs.skip, 0);
    assert.equal(capturedArgs.take, 20);
    assert.deepEqual(capturedArgs.orderBy, { createdAt: 'desc' });
  });

  test('7. listCourses - Custom page, limit, and pagination bounds', async () => {
    let capturedArgs: any = null;
    mockPrisma.course.findMany = async (args: any) => {
      capturedArgs = args;
      return [sampleCourse];
    };
    mockPrisma.course.count = async () => 45;

    const result = await service.listCourses({ page: 3, limit: 10 });

    assert.equal(capturedArgs.skip, 20);
    assert.equal(capturedArgs.take, 10);
    assert.equal(result.meta.page, 3);
    assert.equal(result.meta.limit, 10);
    assert.equal(result.meta.total, 45);
    assert.equal(result.meta.totalPages, 5);
  });

  test('8. listCourses - Search by course title and code', async () => {
    let capturedCountArgs: any = null;
    let capturedFindArgs: any = null;
    mockPrisma.course.count = async (args: any) => {
      capturedCountArgs = args;
      return 1;
    };
    mockPrisma.course.findMany = async (args: any) => {
      capturedFindArgs = args;
      return [sampleCourse];
    };

    await service.listCourses({ search: 'Web Development' });

    const expectedOR = [
      { code: { contains: 'Web Development', mode: 'insensitive' } },
      { title: { contains: 'Web Development', mode: 'insensitive' } },
    ];
    assert.deepEqual(capturedCountArgs.where.OR, expectedOR);
    assert.deepEqual(capturedFindArgs.where.OR, expectedOR);
  });

  test('9. listCourses - Filter by active courses (isActive: true)', async () => {
    let capturedFindArgs: any = null;
    mockPrisma.course.findMany = async (args: any) => {
      capturedFindArgs = args;
      return [sampleCourse];
    };
    mockPrisma.course.count = async () => 1;

    await service.listCourses({ isActive: true });

    assert.equal(capturedFindArgs.where.isActive, true);
  });

  test('10. listCourses - Filter by inactive courses (isActive: false)', async () => {
    let capturedFindArgs: any = null;
    mockPrisma.course.findMany = async (args: any) => {
      capturedFindArgs = args;
      return [];
    };
    mockPrisma.course.count = async () => 0;

    const result = await service.listCourses({ isActive: false });

    assert.equal(capturedFindArgs.where.isActive, false);
    assert.equal(result.data.length, 0);
    assert.equal(result.meta.total, 0);
    assert.equal(result.meta.totalPages, 1);
  });

  test('11. listCourses - Combined search and active status filter', async () => {
    let capturedFindArgs: any = null;
    mockPrisma.course.findMany = async (args: any) => {
      capturedFindArgs = args;
      return [sampleCourse];
    };
    mockPrisma.course.count = async () => 1;

    await service.listCourses({ search: 'FS', isActive: true, page: 2, limit: 5 });

    assert.equal(capturedFindArgs.where.isActive, true);
    assert.deepEqual(capturedFindArgs.where.OR, [
      { code: { contains: 'FS', mode: 'insensitive' } },
      { title: { contains: 'FS', mode: 'insensitive' } },
    ]);
    assert.equal(capturedFindArgs.skip, 5);
    assert.equal(capturedFindArgs.take, 5);
  });

  test('12. getCourseById - Successfully retrieves existing course with batch schedules', async () => {
    let capturedArgs: any = null;
    const courseWithBatches = {
      ...sampleCourse,
      batches: [sampleBatch],
    };

    mockPrisma.course.findUnique = async (args: any) => {
      capturedArgs = args;
      if (args.where.id === 'course-uuid-1') {
        return courseWithBatches;
      }
      return null;
    };

    const course = await service.getCourseById('course-uuid-1');

    assert.equal(capturedArgs.where.id, 'course-uuid-1');
    assert.deepEqual(capturedArgs.include, {
      batches: {
        orderBy: { startDate: 'desc' },
        include: {
          _count: {
            select: { enrolments: true },
          },
        },
      },
    });
    assert.equal(course.id, 'course-uuid-1');
    assert.equal(course.code, 'FS-WEB-01');
    assert.equal(course.batches.length, 1);
  });

  test('13. getCourseById - Throws NotFoundException when course does not exist', async () => {
    mockPrisma.course.findUnique = async () => null;

    await assert.rejects(
      async () => {
        await service.getCourseById('non-existent-course-id');
      },
      { name: 'NotFoundException' },
    );
  });

  test('14. updateCourse - Successfully updates course fields and records audit log', async () => {
    let capturedUpdateArgs: any = null;
    let auditEntry: any = null;

    mockPrisma.course.findUnique = async () => sampleCourse;
    mockPrisma.course.update = async (args: any) => {
      capturedUpdateArgs = args;
      return {
        ...sampleCourse,
        ...args.data,
      };
    };
    mockAudit.log = async (entry: any) => {
      auditEntry = entry;
    };

    const updatePayload = {
      title: 'Full Stack Modern Web Engineering',
      description: 'Comprehensive updated syllabus',
      durationWeeks: 28,
      totalCredits: 65,
      baseFee: 135000,
      isActive: false,
    };

    const updated = await service.updateCourse(
      'course-uuid-1',
      updatePayload,
      mockActor,
      { ipAddress: '10.0.0.1', userAgent: 'Jest/Node' },
    );

    assert.equal(capturedUpdateArgs.where.id, 'course-uuid-1');
    assert.equal(capturedUpdateArgs.data.title, 'Full Stack Modern Web Engineering');
    assert.equal(capturedUpdateArgs.data.description, 'Comprehensive updated syllabus');
    assert.equal(capturedUpdateArgs.data.durationWeeks, 28);
    assert.equal(capturedUpdateArgs.data.totalCredits, 65);
    assert.equal(capturedUpdateArgs.data.baseFee, 135000);
    assert.equal(capturedUpdateArgs.data.isActive, false);

    assert.equal(updated.title, 'Full Stack Modern Web Engineering');
    assert.equal(updated.isActive, false);

    assert.ok(auditEntry);
    assert.equal(auditEntry.action, 'COURSE_UPDATED');
    assert.equal(auditEntry.resource, 'Course');
    assert.equal(auditEntry.resourceId, 'course-uuid-1');
    assert.equal(auditEntry.actorUserId, 'usr-admin-1');
    assert.equal(auditEntry.ipAddress, '10.0.0.1');
    assert.equal(auditEntry.userAgent, 'Jest/Node');
  });

  test('15. updateCourse - Throws NotFoundException when course does not exist', async () => {
    mockPrisma.course.findUnique = async () => null;

    await assert.rejects(
      async () => {
        await service.updateCourse(
          'non-existent-course-id',
          { title: 'New Title' },
          mockActor,
        );
      },
      { name: 'NotFoundException' },
    );
  });

  test('16. updateCourse - Partial update preserves undefined fields', async () => {
    let capturedUpdateArgs: any = null;
    mockPrisma.course.findUnique = async () => sampleCourse;
    mockPrisma.course.update = async (args: any) => {
      capturedUpdateArgs = args;
      return { ...sampleCourse, ...args.data };
    };

    await service.updateCourse(
      'course-uuid-1',
      { baseFee: 140000 },
      mockActor,
    );

    assert.equal(capturedUpdateArgs.data.baseFee, 140000);
    assert.equal(capturedUpdateArgs.data.title, undefined);
    assert.equal(capturedUpdateArgs.data.durationWeeks, undefined);
    assert.equal(capturedUpdateArgs.data.isActive, undefined);
  });

  // ---------------------------------------------------------------------------
  // BATCH & ENROLMENT TESTS (PART 7 PRIORITY 4)
  // ---------------------------------------------------------------------------

  test('17. listBatches - Default pagination and query parameters', async () => {
    let capturedFindArgs: any = null;
    let capturedCountArgs: any = null;

    mockPrisma.batch.findMany = async (args: any) => {
      capturedFindArgs = args;
      return [sampleBatch];
    };
    mockPrisma.batch.count = async (args: any) => {
      capturedCountArgs = args;
      return 1;
    };

    const result = await service.listBatches({});

    assert.equal(capturedFindArgs.skip, 0);
    assert.equal(capturedFindArgs.take, 20);
    assert.deepEqual(capturedFindArgs.where, {});
    assert.deepEqual(capturedCountArgs.where, {});
    assert.equal(result.data.length, 1);
    assert.equal(result.meta.page, 1);
    assert.equal(result.meta.limit, 20);
    assert.equal(result.meta.total, 1);
    assert.equal(result.meta.totalPages, 1);
  });

  test('18. listBatches - Custom page, limit, and pagination bounds', async () => {
    let capturedFindArgs: any = null;

    mockPrisma.batch.findMany = async (args: any) => {
      capturedFindArgs = args;
      return [sampleBatch, sampleBatch];
    };
    mockPrisma.batch.count = async () => 18;

    const result = await service.listBatches({ page: 3, limit: 6 });

    assert.equal(capturedFindArgs.skip, 12);
    assert.equal(capturedFindArgs.take, 6);
    assert.equal(result.meta.page, 3);
    assert.equal(result.meta.limit, 6);
    assert.equal(result.meta.total, 18);
    assert.equal(result.meta.totalPages, 3);
  });

  test('19. listBatches - Search by batch name and code', async () => {
    let capturedFindArgs: any = null;

    mockPrisma.batch.findMany = async (args: any) => {
      capturedFindArgs = args;
      return [sampleBatch];
    };
    mockPrisma.batch.count = async () => 1;

    await service.listBatches({ search: 'Alpha' });

    assert.deepEqual(capturedFindArgs.where.OR, [
      { batchCode: { contains: 'Alpha', mode: 'insensitive' } },
      { name: { contains: 'Alpha', mode: 'insensitive' } },
    ]);
  });

  test('20. listBatches - Status and courseId filtering', async () => {
    let capturedFindArgs: any = null;

    mockPrisma.batch.findMany = async (args: any) => {
      capturedFindArgs = args;
      return [sampleBatch];
    };
    mockPrisma.batch.count = async () => 1;

    await service.listBatches({
      status: BatchStatus.ONGOING,
      courseId: 'course-uuid-1',
      search: 'FSW',
    });

    assert.equal(capturedFindArgs.where.status, BatchStatus.ONGOING);
    assert.equal(capturedFindArgs.where.courseId, 'course-uuid-1');
    assert.deepEqual(capturedFindArgs.where.OR, [
      { batchCode: { contains: 'FSW', mode: 'insensitive' } },
      { name: { contains: 'FSW', mode: 'insensitive' } },
    ]);
  });

  test('21. getBatchById - Successfully retrieves batch with relations', async () => {
    let capturedArgs: any = null;
    const fullBatch = {
      ...sampleBatch,
      course: sampleCourse,
      instructor: { id: 'emp-1', employeeCode: 'EMP-01', jobTitle: 'Lead Trainer' },
      enrolments: [
        {
          id: 'enr-1',
          enrolmentNumber: 'ENR-2026-00001',
          student: sampleStudent,
        },
      ],
    };

    mockPrisma.batch.findUnique = async (args: any) => {
      capturedArgs = args;
      return fullBatch;
    };

    const batch = await service.getBatchById('batch-uuid-1');

    assert.equal(capturedArgs.where.id, 'batch-uuid-1');
    assert.ok(capturedArgs.include.course);
    assert.ok(capturedArgs.include.instructor);
    assert.ok(capturedArgs.include.enrolments);
    assert.equal(batch.id, 'batch-uuid-1');
    assert.equal(batch.instructor?.employeeCode, 'EMP-01');
  });

  test('22. getBatchById - Throws NotFoundException when batch does not exist', async () => {
    mockPrisma.batch.findUnique = async () => null;

    await assert.rejects(
      async () => {
        await service.getBatchById('non-existent-batch-id');
      },
      { name: 'NotFoundException' },
    );
  });

  test('23. updateBatch - Updates batch fields and records audit log', async () => {
    let capturedUpdateArgs: any = null;
    let auditEntry: any = null;

    mockPrisma.batch.findUnique = async () => sampleBatch;
    mockPrisma.batch.update = async (args: any) => {
      capturedUpdateArgs = args;
      return { ...sampleBatch, ...args.data };
    };
    mockAudit.log = async (entry: any) => {
      auditEntry = entry;
    };

    const updated = await service.updateBatch(
      'batch-uuid-1',
      {
        name: 'Cohort Alpha 2026 Evening',
        capacity: 40,
        status: BatchStatus.ONGOING,
        instructorId: 'emp-uuid-10',
        startDate: '2026-03-10',
        endDate: '2026-09-20',
      },
      mockActor,
      { ipAddress: '127.0.0.1', userAgent: 'NodeTest' },
    );

    assert.equal(capturedUpdateArgs.where.id, 'batch-uuid-1');
    assert.equal(capturedUpdateArgs.data.name, 'Cohort Alpha 2026 Evening');
    assert.equal(capturedUpdateArgs.data.capacity, 40);
    assert.equal(capturedUpdateArgs.data.status, BatchStatus.ONGOING);
    assert.equal(capturedUpdateArgs.data.instructorId, 'emp-uuid-10');

    assert.ok(auditEntry);
    assert.equal(auditEntry.action, 'BATCH_UPDATED');
    assert.equal(auditEntry.resource, 'Batch');
    assert.equal(auditEntry.resourceId, 'batch-uuid-1');
    assert.equal(auditEntry.actorUserId, 'usr-admin-1');
  });

  test('24. updateBatch - Throws BadRequestException when endDate <= startDate', async () => {
    mockPrisma.batch.findUnique = async () => sampleBatch;

    await assert.rejects(
      async () => {
        await service.updateBatch(
          'batch-uuid-1',
          {
            startDate: '2026-06-01',
            endDate: '2026-05-01',
          },
          mockActor,
        );
      },
      { name: 'BadRequestException' },
    );
  });

  test('25. updateBatch - Throws NotFoundException when batch does not exist', async () => {
    mockPrisma.batch.findUnique = async () => null;

    await assert.rejects(
      async () => {
        await service.updateBatch(
          'non-existent-batch-id',
          { name: 'New Name' },
          mockActor,
        );
      },
      { name: 'NotFoundException' },
    );
  });

  test('26. enrolStudent - Rejects enrolment when batch capacity is reached', async () => {
    mockPrisma.profileStudent.findUnique = async () => sampleStudent;
    mockPrisma.batch.findUnique = async () => ({
      ...sampleBatch,
      capacity: 10,
      _count: { enrolments: 10 }, // Capacity full
    });

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
      (err: any) => {
        assert.equal(err.name, 'BadRequestException');
        assert.match(err.message, /maximum seat capacity/);
        return true;
      },
    );
  });

  test('27. enrolStudent - Rejects enrolment when student or batch not found', async () => {
    // Student not found
    mockPrisma.profileStudent.findUnique = async () => null;
    await assert.rejects(
      async () => {
        await service.enrolStudent(
          { studentId: 'invalid-student', batchId: 'batch-uuid-1' },
          mockActor,
        );
      },
      { name: 'NotFoundException' },
    );

    // Batch not found
    mockPrisma.profileStudent.findUnique = async () => sampleStudent;
    mockPrisma.batch.findUnique = async () => null;
    await assert.rejects(
      async () => {
        await service.enrolStudent(
          { studentId: 'stu-uuid-1', batchId: 'invalid-batch' },
          mockActor,
        );
      },
      { name: 'NotFoundException' },
    );
  });

  test('28. listEnrolments - Default pagination and filtering', async () => {
    let capturedFindArgs: any = null;

    const sampleEnrolmentRecord = {
      id: 'enr-1',
      studentId: 'stu-uuid-1',
      batchId: 'batch-uuid-1',
      enrolmentNumber: 'ENR-2026-00001',
      status: EnrolmentStatus.ENROLLED,
      enrolmentDate: new Date(),
      student: sampleStudent,
      batch: sampleBatch,
    };

    mockPrisma.enrolment.findMany = async (args: any) => {
      capturedFindArgs = args;
      return [sampleEnrolmentRecord];
    };
    mockPrisma.enrolment.count = async () => 1;

    const result = await service.listEnrolments({
      studentId: 'stu-uuid-1',
      batchId: 'batch-uuid-1',
      status: EnrolmentStatus.ENROLLED,
      page: 2,
      limit: 10,
    });

    assert.equal(capturedFindArgs.skip, 10);
    assert.equal(capturedFindArgs.take, 10);
    assert.equal(capturedFindArgs.where.studentId, 'stu-uuid-1');
    assert.equal(capturedFindArgs.where.batchId, 'batch-uuid-1');
    assert.equal(capturedFindArgs.where.status, EnrolmentStatus.ENROLLED);
    assert.equal(result.data.length, 1);
    assert.equal(result.meta.page, 2);
    assert.equal(result.meta.limit, 10);
  });

  test('29. getEnrolmentById - Successfully retrieves enrolment or throws NotFoundException', async () => {
    const sampleEnrolmentRecord = {
      id: 'enr-1',
      studentId: 'stu-uuid-1',
      batchId: 'batch-uuid-1',
      enrolmentNumber: 'ENR-2026-00001',
      status: EnrolmentStatus.ENROLLED,
      student: sampleStudent,
      batch: { ...sampleBatch, course: sampleCourse },
    };

    mockPrisma.enrolment.findUnique = async (args: any) => {
      if (args.where.id === 'enr-1') return sampleEnrolmentRecord;
      return null;
    };

    const found = await service.getEnrolmentById('enr-1');
    assert.equal(found.id, 'enr-1');
    assert.equal(found.enrolmentNumber, 'ENR-2026-00001');

    await assert.rejects(
      async () => {
        await service.getEnrolmentById('non-existent-enrolment');
      },
      { name: 'NotFoundException' },
    );
  });
});
