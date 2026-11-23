"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AcademicService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademicService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let AcademicService = AcademicService_1 = class AcademicService {
    prisma;
    auditService;
    logger = new common_1.Logger(AcademicService_1.name);
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async createCourse(dto, actor, clientMeta) {
        const normalizedCode = dto.code.trim().toUpperCase();
        const existing = await this.prisma.course.findUnique({
            where: { code: normalizedCode },
        });
        if (existing) {
            throw new common_1.ConflictException(`Course with code ${normalizedCode} already exists.`);
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
    async listCourses(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const where = {};
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
    async getCourseById(id) {
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
            throw new common_1.NotFoundException(`Course with ID ${id} not found.`);
        }
        return course;
    }
    async updateCourse(id, dto, actor, clientMeta) {
        const existing = await this.prisma.course.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException(`Course with ID ${id} not found.`);
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
    async createBatch(dto, actor, clientMeta) {
        const normalizedCode = dto.batchCode.trim().toUpperCase();
        const course = await this.prisma.course.findUnique({
            where: { id: dto.courseId },
        });
        if (!course) {
            throw new common_1.NotFoundException(`Course with ID ${dto.courseId} not found.`);
        }
        const existing = await this.prisma.batch.findUnique({
            where: { batchCode: normalizedCode },
        });
        if (existing) {
            throw new common_1.ConflictException(`Batch with code ${normalizedCode} already exists.`);
        }
        const start = new Date(dto.startDate);
        const end = dto.endDate ? new Date(dto.endDate) : null;
        if (end && end <= start) {
            throw new common_1.BadRequestException('Batch end date must be after the start date.');
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
    async listBatches(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const where = {};
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
    async getBatchById(id) {
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
            throw new common_1.NotFoundException(`Batch with ID ${id} not found.`);
        }
        return batch;
    }
    async updateBatch(id, dto, actor, clientMeta) {
        const existing = await this.prisma.batch.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException(`Batch with ID ${id} not found.`);
        }
        if (dto.startDate && dto.endDate) {
            if (new Date(dto.endDate) <= new Date(dto.startDate)) {
                throw new common_1.BadRequestException('Batch end date must be after the start date.');
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
    async generateEnrolmentNumber() {
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
    async enrolStudent(dto, actor, clientMeta) {
        const student = await this.prisma.profileStudent.findUnique({
            where: { id: dto.studentId },
        });
        if (!student) {
            throw new common_1.NotFoundException(`Student with ID ${dto.studentId} not found.`);
        }
        const batch = await this.prisma.batch.findUnique({
            where: { id: dto.batchId },
            include: {
                _count: { select: { enrolments: true } },
            },
        });
        if (!batch) {
            throw new common_1.NotFoundException(`Batch with ID ${dto.batchId} not found.`);
        }
        if (batch._count.enrolments >= batch.capacity) {
            throw new common_1.BadRequestException(`Batch ${batch.batchCode} has reached its maximum seat capacity (${batch.capacity}).`);
        }
        const duplicate = await this.prisma.enrolment.findUnique({
            where: {
                studentId_batchId: {
                    studentId: dto.studentId,
                    batchId: dto.batchId,
                },
            },
        });
        if (duplicate) {
            throw new common_1.ConflictException(`Student is already enrolled in batch ${batch.batchCode} with status ${duplicate.status}.`);
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
    async listEnrolments(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.studentId)
            where.studentId = query.studentId;
        if (query.batchId)
            where.batchId = query.batchId;
        if (query.status)
            where.status = query.status;
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
    async getEnrolmentById(id) {
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
            throw new common_1.NotFoundException(`Enrolment with ID ${id} not found.`);
        }
        return enrolment;
    }
    async updateEnrolmentStatus(id, dto, actor, clientMeta) {
        const existing = await this.prisma.enrolment.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException(`Enrolment with ID ${id} not found.`);
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
};
exports.AcademicService = AcademicService;
exports.AcademicService = AcademicService = AcademicService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AcademicService);
//# sourceMappingURL=academic.service.js.map