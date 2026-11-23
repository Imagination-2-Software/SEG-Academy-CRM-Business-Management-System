"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert/strict"));
const academic_service_1 = require("../academic.service");
const database_1 = require("@seg/database");
(0, node_test_1.describe)('AcademicService Unit Tests', () => {
    let service;
    let mockPrisma;
    let mockAudit;
    const mockActor = {
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
    const sampleCourse = {
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
    const sampleBatch = {
        id: 'batch-uuid-1',
        courseId: 'course-uuid-1',
        batchCode: 'FSW-2026-A',
        name: 'Cohort Alpha 2026',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-09-01'),
        capacity: 2,
        status: database_1.BatchStatus.UPCOMING,
        _count: { enrolments: 1 },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const sampleStudent = {
        id: 'stu-uuid-1',
        studentCode: 'SEG-26-0001',
        fullName: 'Aarav Sharma',
    };
    (0, node_test_1.beforeEach)(() => {
        mockPrisma = {
            course: {
                findUnique: async (args) => {
                    if (args.where.code === 'FS-WEB-01' || args.where.id === 'course-uuid-1') {
                        return sampleCourse;
                    }
                    return null;
                },
                create: async (args) => ({
                    id: 'course-uuid-2',
                    ...args.data,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
                count: async () => 1,
                findMany: async () => [sampleCourse],
                update: async (args) => ({
                    ...sampleCourse,
                    ...args.data,
                }),
            },
            batch: {
                findUnique: async (args) => {
                    if (args.where.batchCode === 'FSW-2026-A' || args.where.id === 'batch-uuid-1') {
                        return sampleBatch;
                    }
                    return null;
                },
                create: async (args) => ({
                    id: 'batch-uuid-2',
                    ...args.data,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
                count: async () => 1,
                findMany: async () => [sampleBatch],
                update: async (args) => ({
                    ...sampleBatch,
                    ...args.data,
                }),
            },
            profileStudent: {
                findUnique: async (args) => {
                    if (args.where.id === 'stu-uuid-1' || args.where.id === 'stu-uuid-2') {
                        return { id: args.where.id, fullName: 'Student ' + args.where.id };
                    }
                    return null;
                },
            },
            enrolment: {
                count: async () => 1,
                findUnique: async (args) => {
                    if (args.where.studentId_batchId) {
                        if (args.where.studentId_batchId.studentId === 'stu-uuid-1' &&
                            args.where.studentId_batchId.batchId === 'batch-uuid-1') {
                            return {
                                id: 'enr-uuid-1',
                                studentId: 'stu-uuid-1',
                                batchId: 'batch-uuid-1',
                                status: database_1.EnrolmentStatus.ENROLLED,
                            };
                        }
                    }
                    if (args.where.id === 'enr-uuid-1') {
                        return {
                            id: 'enr-uuid-1',
                            status: database_1.EnrolmentStatus.ENROLLED,
                        };
                    }
                    return null;
                },
                create: async (args) => ({
                    id: 'enr-uuid-2',
                    ...args.data,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    student: { studentCode: 'SEG-26-0002', fullName: 'Student 2' },
                    batch: { batchCode: 'FSW-2026-A', name: 'Cohort Alpha 2026' },
                }),
                findMany: async () => [],
                update: async (args) => ({
                    id: args.where.id,
                    status: args.data.status,
                    finalGrade: args.data.finalGrade,
                }),
            },
        };
        mockAudit = {
            log: async () => { },
        };
        service = new academic_service_1.AcademicService(mockPrisma, mockAudit);
    });
    (0, node_test_1.test)('1. createCourse - Creates course and rejects duplicate course code', async () => {
        const created = await service.createCourse({
            code: 'DS-ML-01',
            title: 'Data Science & Machine Learning',
            durationWeeks: 30,
            baseFee: 150000,
        }, mockActor);
        assert.equal(created.code, 'DS-ML-01');
        await assert.rejects(async () => {
            await service.createCourse({
                code: 'FS-WEB-01',
                title: 'Duplicate Code Test',
                durationWeeks: 20,
                baseFee: 100000,
            }, mockActor);
        }, { name: 'ConflictException' });
    });
    (0, node_test_1.test)('2. createBatch - Validates course existence, date constraints, and batch code uniqueness', async () => {
        const batch = await service.createBatch({
            courseId: 'course-uuid-1',
            batchCode: 'FSW-2026-B',
            name: 'Cohort Beta 2026',
            startDate: '2026-04-01',
            endDate: '2026-10-01',
            capacity: 25,
        }, mockActor);
        assert.equal(batch.batchCode, 'FSW-2026-B');
        await assert.rejects(async () => {
            await service.createBatch({
                courseId: 'course-uuid-1',
                batchCode: 'FSW-INVALID',
                name: 'Invalid Dates',
                startDate: '2026-05-01',
                endDate: '2026-04-01',
                capacity: 20,
            }, mockActor);
        }, { name: 'BadRequestException' });
    });
    (0, node_test_1.test)('3. enrolStudent - Prevents duplicate enrolment in the same batch', async () => {
        await assert.rejects(async () => {
            await service.enrolStudent({
                studentId: 'stu-uuid-1',
                batchId: 'batch-uuid-1',
            }, mockActor);
        }, { name: 'ConflictException' });
    });
    (0, node_test_1.test)('4. enrolStudent - Successfully enrols new student into batch', async () => {
        const enr = await service.enrolStudent({
            studentId: 'stu-uuid-2',
            batchId: 'batch-uuid-1',
        }, mockActor);
        assert.ok(enr.enrolmentNumber.startsWith('ENR-'));
        assert.equal(enr.studentId, 'stu-uuid-2');
    });
    (0, node_test_1.test)('5. updateEnrolmentStatus - Updates status to GRADUATED with final grade', async () => {
        const updated = await service.updateEnrolmentStatus('enr-uuid-1', {
            status: database_1.EnrolmentStatus.GRADUATED,
            finalGrade: 'A+',
        }, mockActor);
        assert.equal(updated.status, database_1.EnrolmentStatus.GRADUATED);
        assert.equal(updated.finalGrade, 'A+');
    });
});
//# sourceMappingURL=academic.service.spec.js.map