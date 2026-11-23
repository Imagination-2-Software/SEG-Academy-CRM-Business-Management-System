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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const password_reset_service_1 = require("./password-reset.service");
const auth_dto_1 = require("./dto/auth.dto");
const password_reset_dto_1 = require("./dto/password-reset.dto");
const auth_decorators_1 = require("./decorators/auth.decorators");
const rate_limit_decorator_1 = require("../common/rate-limiting/rate-limit.decorator");
let AuthController = class AuthController {
    authService;
    passwordResetService;
    constructor(authService, passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }
    async login(dto, req) {
        const metadata = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.socket?.remoteAddress,
        };
        return this.authService.login(dto, metadata);
    }
    async refresh(dto, req) {
        const metadata = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.socket?.remoteAddress,
        };
        return this.authService.refreshTokens(dto.refreshToken, metadata);
    }
    async logout(dto) {
        return this.authService.logout(dto.refreshToken);
    }
    async forgotPassword(dto, req) {
        const metadata = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.socket?.remoteAddress,
        };
        return this.passwordResetService.forgotPassword(dto, metadata);
    }
    async resetPassword(dto, req) {
        const metadata = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.socket?.remoteAddress,
        };
        return this.passwordResetService.resetPassword(dto, metadata);
    }
    async verifyEmail(dto, req) {
        const metadata = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.socket?.remoteAddress,
        };
        return this.passwordResetService.verifyEmail(dto, metadata);
    }
    async resendVerification(dto) {
        return this.passwordResetService.resendVerification(dto);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, auth_decorators_1.Public)(),
    (0, rate_limit_decorator_1.RateLimit)({ limit: 5, ttlSeconds: 60, name: 'auth:login', keyPrefix: 'auth_login' }),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Authenticate user and issue access and refresh tokens' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Authentication successful' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid email or password' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Too many login attempts. Rate limit exceeded.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, auth_decorators_1.Public)(),
    (0, rate_limit_decorator_1.RateLimit)({ limit: 10, ttlSeconds: 60, name: 'auth:refresh', keyPrefix: 'auth_refresh' }),
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Rotate refresh token and issue a new access token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Token refreshed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid or expired refresh token' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Refresh token reuse/replay detected' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Too many refresh requests. Rate limit exceeded.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RefreshTokenDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, auth_decorators_1.Public)(),
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke active refresh token session' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Logged out successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LogoutDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, auth_decorators_1.Public)(),
    (0, rate_limit_decorator_1.RateLimit)({ limit: 3, ttlSeconds: 60, name: 'auth:forgot-password', keyPrefix: 'auth_forgot' }),
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Request password reset link' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Generic response regardless of email existence' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Rate limit exceeded' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [password_reset_dto_1.ForgotPasswordDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, auth_decorators_1.Public)(),
    (0, rate_limit_decorator_1.RateLimit)({ limit: 5, ttlSeconds: 60, name: 'auth:reset-password', keyPrefix: 'auth_reset' }),
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password using high-entropy single-use token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Password reset successfully and sessions revoked' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid, expired, or reused token' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Too many reset attempts. Rate limit exceeded.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [password_reset_dto_1.ResetPasswordDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, auth_decorators_1.Public)(),
    (0, rate_limit_decorator_1.RateLimit)({ limit: 5, ttlSeconds: 60, name: 'auth:verify-email', keyPrefix: 'auth_verify' }),
    (0, common_1.Post)('verify-email'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify email address using single-use verification token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Email verified successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid, expired, or reused token' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Too many verification attempts. Rate limit exceeded.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [password_reset_dto_1.VerifyEmailDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, auth_decorators_1.Public)(),
    (0, rate_limit_decorator_1.RateLimit)({ limit: 3, ttlSeconds: 60, name: 'auth:resend-verification', keyPrefix: 'auth_resend' }),
    (0, common_1.Post)('resend-verification'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Resend email verification link' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Generic response regardless of email existence' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Rate limit exceeded' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [password_reset_dto_1.ResendVerificationDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendVerification", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Authentication'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        password_reset_service_1.PasswordResetService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map