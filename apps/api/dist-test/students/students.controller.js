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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const students_service_1 = require("./students.service");
const students_dto_1 = require("./dto/students.dto");
const auth_1 = require("../auth");
let StudentsController = class StudentsController {
    studentsService;
    constructor(studentsService) {
        this.studentsService = studentsService;
    }
    async registerStudent(dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.studentsService.registerStudent(dto, actor, clientMeta);
    }
    async listStudents(query) {
        return this.studentsService.listStudents(query);
    }
    async getStudentById(id) {
        return this.studentsService.getStudentById(id);
    }
    async updateStudent(id, dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.studentsService.updateStudent(id, dto, actor, clientMeta);
    }
    async attachDocument(id, dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.studentsService.attachDocument(id, dto, actor, clientMeta);
    }
    async verifyDocument(id, docId, dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.studentsService.verifyDocument(id, docId, dto, actor, clientMeta);
    }
    async getDocumentDownloadUrl(id, docId) {
        return this.studentsService.getDocumentDownloadUrl(id, docId);
    }
};
exports.StudentsController = StudentsController;
__decorate([
    (0, auth_1.Permissions)('students:create'),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new student profile' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Student registered successfully' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Student with this email already exists' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [students_dto_1.CreateStudentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "registerStudent", null);
__decorate([
    (0, auth_1.Permissions)('students:read'),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List students with search, filters, and pagination' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated student list' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [students_dto_1.QueryStudentsDto]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "listStudents", null);
__decorate([
    (0, auth_1.Permissions)('students:read'),
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get full student details by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Student details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Student not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "getStudentById", null);
__decorate([
    (0, auth_1.Permissions)('students:update'),
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update student profile details' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Student profile updated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Student not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, students_dto_1.UpdateStudentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "updateStudent", null);
__decorate([
    (0, auth_1.Permissions)('students:update'),
    (0, common_1.Post)(':id/documents'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Attach a document metadata record to a student' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Document attached successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, students_dto_1.CreateStudentDocumentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "attachDocument", null);
__decorate([
    (0, auth_1.Permissions)('students:update'),
    (0, common_1.Patch)(':id/documents/:docId/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify or reject a student document' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Document verification updated' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('docId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_1.CurrentUser)()),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, students_dto_1.VerifyStudentDocumentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "verifyDocument", null);
__decorate([
    (0, auth_1.Permissions)('students:read'),
    (0, common_1.Get)(':id/documents/:docId/download'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate time-limited secure signed URL for document retrieval' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Time-limited signed download metadata' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('docId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "getDocumentDownloadUrl", null);
exports.StudentsController = StudentsController = __decorate([
    (0, swagger_1.ApiTags)('Student Management'),
    (0, swagger_1.ApiBearerAuth)('bearer-jwt'),
    (0, common_1.Controller)('students'),
    __metadata("design:paramtypes", [students_service_1.StudentsService])
], StudentsController);
//# sourceMappingURL=students.controller.js.map