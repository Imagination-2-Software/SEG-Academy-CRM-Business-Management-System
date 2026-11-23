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
exports.AcademicController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const academic_service_1 = require("./academic.service");
const academic_dto_1 = require("./dto/academic.dto");
const auth_1 = require("../auth");
let AcademicController = class AcademicController {
    academicService;
    constructor(academicService) {
        this.academicService = academicService;
    }
    async createCourse(dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.academicService.createCourse(dto, actor, clientMeta);
    }
    async listCourses(query) {
        return this.academicService.listCourses(query);
    }
    async getCourseById(id) {
        return this.academicService.getCourseById(id);
    }
    async updateCourse(id, dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.academicService.updateCourse(id, dto, actor, clientMeta);
    }
    async createBatch(dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.academicService.createBatch(dto, actor, clientMeta);
    }
    async listBatches(query) {
        return this.academicService.listBatches(query);
    }
    async getBatchById(id) {
        return this.academicService.getBatchById(id);
    }
    async updateBatch(id, dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.academicService.updateBatch(id, dto, actor, clientMeta);
    }
    async enrolStudent(dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.academicService.enrolStudent(dto, actor, clientMeta);
    }
    async listEnrolments(query) {
        return this.academicService.listEnrolments(query);
    }
    async getEnrolmentById(id) {
        return this.academicService.getEnrolmentById(id);
    }
    async updateEnrolmentStatus(id, dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.academicService.updateEnrolmentStatus(id, dto, actor, clientMeta);
    }
};
exports.AcademicController = AcademicController;
__decorate([
    (0, auth_1.Permissions)('courses:create'),
    (0, common_1.Post)('courses'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new course catalog offering' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Course created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Course code already exists' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [academic_dto_1.CreateCourseDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "createCourse", null);
__decorate([
    (0, auth_1.Permissions)('courses:read'),
    (0, common_1.Get)('courses'),
    (0, swagger_1.ApiOperation)({ summary: 'List and filter courses' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated courses list' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [academic_dto_1.QueryCoursesDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "listCourses", null);
__decorate([
    (0, auth_1.Permissions)('courses:read'),
    (0, common_1.Get)('courses/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get course details with associated batches' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Course details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Course not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "getCourseById", null);
__decorate([
    (0, auth_1.Permissions)('courses:update'),
    (0, common_1.Patch)('courses/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update course details and pricing' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Course updated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, academic_dto_1.UpdateCourseDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "updateCourse", null);
__decorate([
    (0, auth_1.Permissions)('batches:create'),
    (0, common_1.Post)('batches'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new batch schedule for a course' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Batch created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Batch code already exists' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [academic_dto_1.CreateBatchDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "createBatch", null);
__decorate([
    (0, auth_1.Permissions)('batches:read'),
    (0, common_1.Get)('batches'),
    (0, swagger_1.ApiOperation)({ summary: 'List and filter batches' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated batches list' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [academic_dto_1.QueryBatchesDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "listBatches", null);
__decorate([
    (0, auth_1.Permissions)('batches:read'),
    (0, common_1.Get)('batches/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get batch details and enrolled students list' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Batch details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Batch not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "getBatchById", null);
__decorate([
    (0, auth_1.Permissions)('batches:update'),
    (0, common_1.Patch)('batches/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update batch scheduling, status, or capacity' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Batch updated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, academic_dto_1.UpdateBatchDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "updateBatch", null);
__decorate([
    (0, auth_1.Permissions)('enrolments:create'),
    (0, common_1.Post)('enrolments'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Enrol an existing student into a batch' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Student enrolled successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Batch capacity exceeded' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Student is already enrolled in this batch' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [academic_dto_1.CreateEnrolmentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "enrolStudent", null);
__decorate([
    (0, auth_1.Permissions)('enrolments:read'),
    (0, common_1.Get)('enrolments'),
    (0, swagger_1.ApiOperation)({ summary: 'List and filter student enrolments' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated enrolments list' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [academic_dto_1.QueryEnrolmentsDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "listEnrolments", null);
__decorate([
    (0, auth_1.Permissions)('enrolments:read'),
    (0, common_1.Get)('enrolments/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get enrolment details by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Enrolment details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Enrolment not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "getEnrolmentById", null);
__decorate([
    (0, auth_1.Permissions)('enrolments:update'),
    (0, common_1.Patch)('enrolments/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update student enrolment status or record grade' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Enrolment status updated' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, academic_dto_1.UpdateEnrolmentStatusDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "updateEnrolmentStatus", null);
exports.AcademicController = AcademicController = __decorate([
    (0, swagger_1.ApiTags)('Academic Operations (Courses, Batches, Enrolments)'),
    (0, swagger_1.ApiBearerAuth)('bearer-jwt'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [academic_service_1.AcademicService])
], AcademicController);
//# sourceMappingURL=academic.controller.js.map