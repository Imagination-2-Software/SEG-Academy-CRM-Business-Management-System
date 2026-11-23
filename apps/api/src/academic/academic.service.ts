import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  QueryCoursesDto,
  CreateBatchDto,
  UpdateBatchDto,
  QueryBatchesDto,
  CreateEnrolmentDto,
  UpdateEnrolmentStatusDto,
  QueryEnrolmentsDto,
} from './dto/academic.dto';
import { AuthenticatedUser } from '../auth';
import { Prisma } from '@seg/database';

@Injectable()
export class AcademicService {
  private readonly logger = new Logger(AcademicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // COURSE MANAGEMENT
  // ---------------------------------------------------------------------------

  async createCourse(
    dto: CreateCourseDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const normalizedCode = dto.code.trim().toUpperCase();

    const existing = await this.prisma.course.findUnique({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new ConflictException(`Course with code ${normalizedCode} already exists.`);
    }

    const course = await this.prisma.course.create({
      data: {
        code: normalizedCode,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        durationWeeks: dto.durationWeeks,
        totalCredits: dto.totalCredits || null,
        baseFee: dto.baseFee,
        currency: dto.currency || 'INR',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    await this.auditService.log({
      action: 'COURSE_CREATED',
      resource: 'Course',
      resourceId: course.id,
      actorUserId: actor.userId,
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
      payload: { code: course.code, title: course.title, baseFee: dto.baseFee },
    });

    return course;
  }

  async listCourses(query: QueryCoursesDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {};
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [total, courses] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { batches: true },
          },
        },
      }),
    ]);

    return {
      data: courses,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getCourseById(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        batches: {
          orderBy: { startDate: 'desc' },
          include: {
            _count: {
              select: { enrolments: true },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found.`);
    }

    return course;
  }

  async updateCourse(
    id: string,
    dto: UpdateCourseDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Course with ID ${id} not found.`);
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        durationWeeks: dto.durationWeeks !== undefined ? dto.durationWeeks : undefined,
        totalCredits: dto.totalCredits !== undefined ? dto.totalCredits : undefined,
        baseFee: dto.baseFee !== undefined ? dto.baseFee : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
    });

    await this.auditService.log({
      action: 'COURSE_UPDATED',
      resource: 'Course',
      resourceId: id,
      actorUserId: actor.userId,
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
      payload: { updatedFields: Object.keys(dto) },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // BATCH MANAGEMENT
  // ---------------------------------------------------------------------------

  async createBatch(
    dto: CreateBatchDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const normalizedCode = dto.batchCode.trim().toUpperCase();

    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${dto.courseId} not found.`);
    }

    // Check batch code uniqueness
    const existing = await this.prisma.batch.findUnique({
      where: { batchCode: normalizedCode },
    });
    if (existing) {
      throw new ConflictException(`Batch with code ${normalizedCode} already exists.`);
    }

    // Validate dates
    const start = new Date(dto.startDate);
    const end = dto.endDate ? new Date(dto.endDate) : null;
    if (end && end <= start) {
      throw new BadRequestException('Batch end date must be after the start date.');
    }

    const batch = await this.prisma.batch.create({
      data: {
        courseId: dto.courseId,
        batchCode: normalizedCode,
        name: dto.name.trim(),
        startDate: start,
        endDate: end,
        capacity: dto.capacity,
        status: dto.status || 'UPCOMING',
        instructorId: dto.instructorId || null,
      },
      include: {
        course: { select: { code: true, title: true } },
      },
    });

    await this.auditService.log({
      action: 'BATCH_CREATED',
      resource: 'Batch',
      resourceId: batch.id,
      actorUserId: actor.userId,
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
      payload: { batchCode: batch.batchCode, courseId: batch.courseId, capacity: batch.capacity },
    });

    return batch;
  }

  async listBatches(query: QueryBatchesDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.BatchWhereInput = {};
    if (query.courseId) {
      where.courseId = query.courseId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { batchCode: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, batches] = await Promise.all([
      this.prisma.batch.count({ where }),
      this.prisma.batch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          course: { select: { id: true, code: true, title: true } },
          _count: {
            select: { enrolments: true },
          },
        },
      }),
    ]);

    return {
      data: batches,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getBatchById(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        course: true,
        instructor: { select: { id: true, employeeCode: true, jobTitle: true } },
        enrolments: {
          include: {
            student: { select: { id: true, studentCode: true, fullName: true, email: true } },
          },
          orderBy: { enrolmentDate: 'desc' },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${id} not found.`);
    }

    return batch;
  }

  async updateBatch(
    id: string,
    dto: UpdateBatchDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const existing = await this.prisma.batch.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Batch with ID ${id} not found.`);
    }

    if (dto.startDate && dto.endDate) {
      if (new Date(dto.endDate) <= new Date(dto.startDate)) {
        throw new BadRequestException('Batch end date must be after the start date.');
      }
    }

    const updated = await this.prisma.batch.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
        capacity: dto.capacity !== undefined ? dto.capacity : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
        instructorId: dto.instructorId !== undefined ? dto.instructorId || null : undefined,
      },
    });

    await this.auditService.log({
      action: 'BATCH_UPDATED',
      resource: 'Batch',
      resourceId: id,
      actorUserId: actor.userId,
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
      payload: { updatedFields: Object.keys(dto) },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // STUDENT ENROLMENT
  // ---------------------------------------------------------------------------

  private async generateEnrolmentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.enrolment.count();
    const sequence = (count + 1).toString().padStart(5, '0');
    let num = `ENR-${year}-${sequence}`;

    let exists = await this.prisma.enrolment.findUnique({
      where: { enrolmentNumber: num },
    });
    let extra = 1;
    while (exists) {
      num = `ENR-${year}-${(count + 1 + extra).toString().padStart(5, '0')}`;
      exists = await this.prisma.enrolment.findUnique({
        where: { enrolmentNumber: num },
      });
      extra++;
    }
    return num;
  }

  async enrolStudent(
    dto: CreateEnrolmentDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    // 1. Verify student exists
    const student = await this.prisma.profileStudent.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${dto.studentId} not found.`);
    }

    // 2. Verify batch exists with capacity
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: {
        _count: { select: { enrolments: true } },
      },
    });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${dto.batchId} not found.`);
    }

    // Check capacity constraint
    if (batch._count.enrolments >= batch.capacity) {
      throw new BadRequestException(
        `Batch ${batch.batchCode} has reached its maximum seat capacity (${batch.capacity}).`,
      );
    }

    // 3. Prevent duplicate active enrolment in the SAME batch
    const duplicate = await this.prisma.enrolment.findUnique({
      where: {
        studentId_batchId: {
          studentId: dto.studentId,
          batchId: dto.batchId,
        },
      },
    });
    if (duplicate) {
      throw new ConflictException(
        `Student is already enrolled in batch ${batch.batchCode} with status ${duplicate.status}.`,
      );
    }

    const enrolmentNumber = await this.generateEnrolmentNumber();

    const enrolment = await this.prisma.enrolment.create({
      data: {
        studentId: dto.studentId,
        batchId: dto.batchId,
        enrolmentNumber,
        status: dto.status || 'ENROLLED',
      },
      include: {
        student: { select: { studentCode: true, fullName: true, email: true } },
        batch: {
          select: {
            batchCode: true,
            name: true,
            course: { select: { code: true, title: true } },
          },
        },
      },
    });

    await this.auditService.log({
      action: 'STUDENT_ENROLLED',
      resource: 'Enrolment',
      resourceId: enrolment.id,
      actorUserId: actor.userId,
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
      payload: {
        enrolmentNumber: enrolment.enrolmentNumber,
        studentId: dto.studentId,
        batchId: dto.batchId,
      },
    });

    return enrolment;
  }

  async listEnrolments(query: QueryEnrolmentsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.EnrolmentWhereInput = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.batchId) where.batchId = query.batchId;
    if (query.status) where.status = query.status;

    const [total, enrolments] = await Promise.all([
      this.prisma.enrolment.count({ where }),
      this.prisma.enrolment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { enrolmentDate: 'desc' },
        include: {
          student: { select: { id: true, studentCode: true, fullName: true, email: true } },
          batch: {
            select: {
              id: true,
              batchCode: true,
              name: true,
              course: { select: { id: true, code: true, title: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: enrolments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getEnrolmentById(id: string) {
    const enrolment = await this.prisma.enrolment.findUnique({
      where: { id },
      include: {
        student: true,
        batch: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!enrolment) {
      throw new NotFoundException(`Enrolment with ID ${id} not found.`);
    }

    return enrolment;
  }

  async updateEnrolmentStatus(
    id: string,
    dto: UpdateEnrolmentStatusDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const existing = await this.prisma.enrolment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Enrolment with ID ${id} not found.`);
    }

    const updated = await this.prisma.enrolment.update({
      where: { id },
      data: {
        status: dto.status,
        finalGrade: dto.finalGrade !== undefined ? dto.finalGrade || null : undefined,
        completionDate: dto.completionDate ? new Date(dto.completionDate) : undefined,
      },
    });

    await this.auditService.log({
      action: 'ENROLMENT_STATUS_UPDATED',
      resource: 'Enrolment',
      resourceId: id,
      actorUserId: actor.userId,
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
      payload: { oldStatus: existing.status, newStatus: dto.status },
    });

    return updated;
  }
}
