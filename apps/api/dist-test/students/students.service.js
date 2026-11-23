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
var StudentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let StudentsService = StudentsService_1 = class StudentsService {
    prisma;
    auditService;
    logger = new common_1.Logger(StudentsService_1.name);
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async generateStudentCode() {
        const yearSuffix = new Date().getFullYear().toString().slice(-2);
        const count = await this.prisma.profileStudent.count();
        const sequence = (count + 1).toString().padStart(4, '0');
        let code = `SEG-${yearSuffix}-${sequence}`;
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
    async registerStudent(dto, actor, clientMeta) {
        const normalizedEmail = dto.email.trim().toLowerCase();
        const existing = await this.prisma.profileStudent.findUnique({
            where: { email: normalizedEmail },
        });
        if (existing) {
            throw new common_1.ConflictException(`Student with email ${normalizedEmail} already exists.`);
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
    async listStudents(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const where = {};
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
    async getStudentById(id) {
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
            throw new common_1.NotFoundException(`Student with ID ${id} not found.`);
        }
        return student;
    }
    async updateStudent(id, dto, actor, clientMeta) {
        const existing = await this.prisma.profileStudent.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Student with ID ${id} not found.`);
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
    async attachDocument(studentId, dto, actor, clientMeta) {
        const student = await this.prisma.profileStudent.findUnique({
            where: { id: studentId },
        });
        if (!student) {
            throw new common_1.NotFoundException(`Student with ID ${studentId} not found.`);
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
    async verifyDocument(studentId, documentId, dto, actor, clientMeta) {
        const document = await this.prisma.studentDocument.findUnique({
            where: { id: documentId },
        });
        if (!document || document.studentId !== studentId) {
            throw new common_1.NotFoundException(`Document with ID ${documentId} not found for student ${studentId}.`);
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
    async getDocumentDownloadUrl(studentId, documentId) {
        const document = await this.prisma.studentDocument.findUnique({
            where: { id: documentId },
        });
        if (!document || document.studentId !== studentId) {
            throw new common_1.NotFoundException(`Document with ID ${documentId} not found for student ${studentId}.`);
        }
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        return {
            documentId: document.id,
            documentName: document.documentName,
            mimeType: document.mimeType,
            fileSizeBytes: document.fileSizeBytes,
            storageKey: document.fileStorageKey,
            signedUrl: `/api/v1/students/${studentId}/documents/${documentId}/stream?expires=${encodeURIComponent(expiresAt)}`,
            expiresAt,
        };
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = StudentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], StudentsService);
//# sourceMappingURL=students.service.js.map