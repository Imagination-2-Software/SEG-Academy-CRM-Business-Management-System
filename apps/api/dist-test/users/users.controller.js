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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const users_service_1 = require("./users.service");
const users_dto_1 = require("./dto/users.dto");
const auth_1 = require("../auth");
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async listUsers(query) {
        return this.usersService.listUsers(query);
    }
    async getUserById(id) {
        return this.usersService.getUserById(id);
    }
    async createUser(dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.usersService.createUser(dto, actor, clientMeta);
    }
    async updateUser(id, dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.usersService.updateUser(id, dto, actor, clientMeta);
    }
    async updateUserStatus(id, dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.usersService.updateUserStatus(id, dto, actor, clientMeta);
    }
    async replaceUserRoles(id, dto, actor, req) {
        const clientMeta = {
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.usersService.replaceUserRoles(id, dto, actor, clientMeta);
    }
    async getUserRoles(id) {
        return this.usersService.getUserRoles(id);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, auth_1.Permissions)('users:read'),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List users with pagination, search and filters' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated user list' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - requires users:read permission' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [users_dto_1.QueryUsersDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "listUsers", null);
__decorate([
    (0, auth_1.Permissions)('users:read'),
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user details by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUserById", null);
__decorate([
    (0, auth_1.Permissions)('users:create'),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new employee user account' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email already exists' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [users_dto_1.CreateUserDto, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createUser", null);
__decorate([
    (0, auth_1.Permissions)('users:update'),
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update non-sensitive user profile attributes' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, users_dto_1.UpdateUserDto, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUser", null);
__decorate([
    (0, auth_1.Permissions)('users:manage_status'),
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update account status (activate, deactivate, or suspend)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Status updated and sessions revoked if deactivated' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Self-deactivation prevented' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, users_dto_1.UpdateUserStatusDto, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUserStatus", null);
__decorate([
    (0, auth_1.Permissions)('users:manage_roles'),
    (0, common_1.Put)(':id/roles'),
    (0, swagger_1.ApiOperation)({ summary: 'Replace assigned roles for a user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Role replaced and active sessions revoked' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Self-role escalation prevented' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Superuser role protection triggered' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, users_dto_1.ReplaceUserRolesDto, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "replaceUserRoles", null);
__decorate([
    (0, auth_1.Permissions)('users:read'),
    (0, common_1.Get)(':id/roles'),
    (0, swagger_1.ApiOperation)({ summary: 'Get assigned roles and permissions for a specific user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User roles and permissions' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUserRoles", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('User Management'),
    (0, swagger_1.ApiBearerAuth)('bearer-jwt'),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map