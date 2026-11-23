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
const students_service_1 = require("../students.service");
const database_1 = require("@seg/database");
(0, node_test_1.describe)('StudentsService Unit Tests', () => {
    let service;
    let mockPrisma;
    let mockAudit;
    const mockActor = {
        userId: 'usr-admin-1',
        email: 'admin@segacademy.com',
        roles: ['ADMIN'],
        permissions: ['students:create', 'students:read', 'students:update'],
    };
    const sampleStudent = {
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
    (0, node_test_1.beforeEach)(() => {
        mockPrisma = {
            profileStudent: {
                findUnique: async (args) => {
                    if (args.where.email === 'aarav.sharma@example.com' || args.where.id === 'stu-uuid-1') {
                        return sampleStudent;
                    }
                    return null;
                },
                create: async (args) => ({
                    id: 'stu-uuid-2',
                    ...args.data,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    enrolments: [],
                    documents: [],
                }),
                count: async () => 1,
                findMany: async () => [sampleStudent],
                update: async (args) => ({
                    ...sampleStudent,
                    ...args.data,
                }),
            },
            studentDocument: {
                create: async (args) => ({
                    id: 'doc-uuid-1',
                    ...args.data,
                    verificationStatus: database_1.DocumentVerificationStatus.PENDING,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
                findUnique: async (args) => {
                    if (args.where.id === 'doc-uuid-1') {
                        return {
                            id: 'doc-uuid-1',
                            studentId: 'stu-uuid-1',
                            documentType: database_1.DocumentType.TRANSCRIPT,
                            documentName: 'transcript.pdf',
                            fileStorageKey: 'students/stu-uuid-1/transcript.pdf',
                            mimeType: 'application/pdf',
                            fileSizeBytes: 500000,
                            verificationStatus: database_1.DocumentVerificationStatus.PENDING,
                        };
                    }
                    return null;
                },
                update: async (args) => ({
                    id: args.where.id,
                    verificationStatus: args.data.verificationStatus,
                    rejectionReason: args.data.rejectionReason,
                }),
            },
        };
        mockAudit = {
            log: async () => { },
        };
        service = new students_service_1.StudentsService(mockPrisma, mockAudit);
    });
    (0, node_test_1.test)('1. registerStudent - Creates a student with generated student code and audit log', async () => {
        const result = await service.registerStudent({
            fullName: 'Kavya Patel',
            email: 'kavya.patel@example.com',
            phoneNumber: '+919876543220',
        }, mockActor);
        assert.equal(result.fullName, 'Kavya Patel');
        assert.equal(result.email, 'kavya.patel@example.com');
        assert.ok(result.studentCode.startsWith('SEG-'));
    });
    (0, node_test_1.test)('2. registerStudent - Rejects duplicate student email with ConflictException', async () => {
        await assert.rejects(async () => {
            await service.registerStudent({
                fullName: 'Duplicate Aarav',
                email: 'aarav.sharma@example.com',
            }, mockActor);
        }, {
            name: 'ConflictException',
        });
    });
    (0, node_test_1.test)('3. listStudents - Returns paginated list of students', async () => {
        const result = await service.listStudents({ page: 1, limit: 10 });
        assert.equal(result.data.length, 1);
        assert.equal(result.meta.page, 1);
        assert.equal(result.meta.total, 1);
    });
    (0, node_test_1.test)('4. getStudentById - Returns student details or throws NotFoundException', async () => {
        const student = await service.getStudentById('stu-uuid-1');
        assert.equal(student.id, 'stu-uuid-1');
        await assert.rejects(async () => {
            await service.getStudentById('non-existent-id');
        }, {
            name: 'NotFoundException',
        });
    });
    (0, node_test_1.test)('5. updateStudent - Updates non-sensitive profile attributes', async () => {
        const updated = await service.updateStudent('stu-uuid-1', { city: 'Pune', phoneNumber: '+919999999999' }, mockActor);
        assert.equal(updated.city, 'Pune');
        assert.equal(updated.phoneNumber, '+919999999999');
    });
    (0, node_test_1.test)('6. attachDocument & getDocumentDownloadUrl - Manages documents and generates signed url', async () => {
        const doc = await service.attachDocument('stu-uuid-1', {
            documentType: database_1.DocumentType.TRANSCRIPT,
            documentName: 'transcript.pdf',
            fileStorageKey: 'students/stu-uuid-1/transcript.pdf',
            mimeType: 'application/pdf',
            fileSizeBytes: 500000,
        }, mockActor);
        assert.equal(doc.documentType, database_1.DocumentType.TRANSCRIPT);
        const downloadInfo = await service.getDocumentDownloadUrl('stu-uuid-1', 'doc-uuid-1');
        assert.ok(downloadInfo.signedUrl.includes('/stream?expires='));
        assert.equal(downloadInfo.documentName, 'transcript.pdf');
    });
    (0, node_test_1.test)('7. verifyDocument - Updates document status to VERIFIED or REJECTED', async () => {
        const verified = await service.verifyDocument('stu-uuid-1', 'doc-uuid-1', { status: database_1.DocumentVerificationStatus.VERIFIED }, mockActor);
        assert.equal(verified.verificationStatus, database_1.DocumentVerificationStatus.VERIFIED);
    });
});
//# sourceMappingURL=students.service.spec.js.map