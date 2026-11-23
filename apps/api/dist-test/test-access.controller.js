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
exports.TestAccessController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_1 = require("./auth");
let TestAccessController = class TestAccessController {
    getPublic() {
        return { status: 'ok', access: 'public', timestamp: new Date().toISOString() };
    }
    getAuthenticated(user) {
        return {
            status: 'ok',
            access: 'authenticated',
            user: {
                userId: user.userId,
                email: user.email,
                roles: user.roles,
                permissions: user.permissions,
            },
        };
    }
    getAdminOnly(user) {
        return { status: 'ok', access: 'admin-granted', userId: user.userId };
    }
    getFinanceOnly(user) {
        return { status: 'ok', access: 'finance-granted', userId: user.userId };
    }
    getStudentsRead(user) {
        return { status: 'ok', access: 'students:read-granted', userId: user.userId };
    }
    getInvoicesMultiPerm(user) {
        return { status: 'ok', access: 'invoices-multi-granted', userId: user.userId };
    }
};
exports.TestAccessController = TestAccessController;
__decorate([
    (0, auth_1.Public)(),
    (0, common_1.Get)('public'),
    (0, swagger_1.ApiOperation)({ summary: 'Public route accessible without authentication' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TestAccessController.prototype, "getPublic", null);
__decorate([
    (0, common_1.Get)('authenticated'),
    (0, swagger_1.ApiBearerAuth)('bearer-jwt'),
    (0, swagger_1.ApiOperation)({ summary: 'Protected route accessible by any active authenticated user' }),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TestAccessController.prototype, "getAuthenticated", null);
__decorate([
    (0, auth_1.Roles)('ADMIN', 'FOUNDER_SUPER_ADMIN'),
    (0, common_1.Get)('admin-only'),
    (0, swagger_1.ApiBearerAuth)('bearer-jwt'),
    (0, swagger_1.ApiOperation)({ summary: 'Protected route restricted to ADMIN or FOUNDER_SUPER_ADMIN' }),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TestAccessController.prototype, "getAdminOnly", null);
__decorate([
    (0, auth_1.Roles)('FINANCE_MANAGER'),
    (0, common_1.Get)('finance-only'),
    (0, swagger_1.ApiBearerAuth)('bearer-jwt'),
    (0, swagger_1.ApiOperation)({ summary: 'Protected route restricted to FINANCE_MANAGER' }),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TestAccessController.prototype, "getFinanceOnly", null);
__decorate([
    (0, auth_1.Permissions)('students:read'),
    (0, common_1.Get)('students-read'),
    (0, swagger_1.ApiBearerAuth)('bearer-jwt'),
    (0, swagger_1.ApiOperation)({ summary: 'Protected route requiring students:read permission' }),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TestAccessController.prototype, "getStudentsRead", null);
__decorate([
    (0, auth_1.Permissions)('invoices:approve', 'invoices:read'),
    (0, common_1.Get)('invoices-multi-perm'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Protected route requiring both invoices:approve and invoices:read' }),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TestAccessController.prototype, "getInvoicesMultiPerm", null);
exports.TestAccessController = TestAccessController = __decorate([
    (0, swagger_1.ApiTags)('Test / Diagnostic Endpoints'),
    (0, common_1.Controller)('test-access')
], TestAccessController);
//# sourceMappingURL=test-access.controller.js.map