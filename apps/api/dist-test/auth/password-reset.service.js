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
var PasswordResetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const password_service_1 = require("./password.service");
const email_service_1 = require("../email/email.service");
const token_storage_service_1 = require("./token-storage.service");
const audit_service_1 = require("../audit/audit.service");
let PasswordResetService = PasswordResetService_1 = class PasswordResetService {
    prisma;
    passwordService;
    emailService;
    tokenStorage;
    auditService;
    configService;
    logger = new common_1.Logger(PasswordResetService_1.name);
    verifiedEmails = new Set();
    constructor(prisma, passwordService, emailService, tokenStorage, auditService, configService) {
        this.prisma = prisma;
        this.passwordService = passwordService;
        this.emailService = emailService;
        this.tokenStorage = tokenStorage;
        this.auditService = auditService;
        this.configService = configService;
    }
    async forgotPassword(dto, clientMeta) {
        const email = dto.email.trim().toLowerCase();
        const genericResponse = {
            success: true,
            message: 'If an account with that email address exists, a password reset link has been sent.',
        };
        const rateLimitKey = `pwd_reset:${email}`;
        const allowed = this.tokenStorage.checkRateLimit(rateLimitKey, 60);
        if (!allowed) {
            throw new common_1.HttpException('Too many password reset requests. Please wait before trying again.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            this.logger.log(`Password reset requested for non-existing email: ${email}`);
            return genericResponse;
        }
        if (user.status !== 'ACTIVE' && user.status !== 'INVITED') {
            this.logger.warn(`Password reset requested for non-active user ${user.id} (status: ${user.status})`);
            return genericResponse;
        }
        const rawToken = this.passwordService.generateRandomToken(32);
        const tokenHash = this.tokenStorage.hashToken(rawToken);
        const expiryMinutes = parseInt(this.configService.get('PASSWORD_RESET_EXPIRES_MINUTES') || '15', 10);
        await this.tokenStorage.storeToken(user.id, tokenHash, 'PASSWORD_RESET', expiryMinutes);
        const baseUrl = this.configService.get('APP_URL') || 'http://localhost:3000';
        const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;
        const { text, html } = this.emailService.renderPasswordResetEmail(user.fullName, resetLink, expiryMinutes);
        try {
            await this.emailService.sendMail({
                to: user.email,
                subject: 'Reset Your SEG CRM Password',
                text,
                html,
            });
        }
        catch (err) {
            this.logger.error(`Failed to send password reset email to ${user.email}: ${err.message}`);
            throw new common_1.HttpException('Email delivery failed. Please try again later.', common_1.HttpStatus.BAD_GATEWAY);
        }
        await this.auditService.log({
            actorUserId: user.id,
            action: 'PASSWORD_RESET_REQUESTED',
            resource: 'users',
            resourceId: user.id,
            payload: { email: user.email },
            ipAddress: clientMeta?.ipAddress,
            userAgent: clientMeta?.userAgent,
        });
        return genericResponse;
    }
    async resetPassword(dto, clientMeta) {
        const rawToken = dto.token.trim();
        const tokenHash = this.tokenStorage.hashToken(rawToken);
        const entry = await this.tokenStorage.consumeToken(tokenHash, 'PASSWORD_RESET');
        if (!entry) {
            throw new common_1.BadRequestException('Invalid, expired, or previously used password reset token.');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: entry.userId },
        });
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired password reset token.');
        }
        const newPasswordHash = await this.passwordService.hashPassword(dto.newPassword);
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: user.id },
                data: { passwordHash: newPasswordHash },
            });
            await tx.refreshToken.updateMany({
                where: { userId: user.id, isRevoked: false },
                data: { isRevoked: true },
            });
        });
        this.logger.log(`Password reset successfully executed for user ${user.id}. All sessions revoked.`);
        await this.auditService.log({
            actorUserId: user.id,
            action: 'PASSWORD_RESET_COMPLETED',
            resource: 'users',
            resourceId: user.id,
            payload: { sessionsRevoked: true },
            ipAddress: clientMeta?.ipAddress,
            userAgent: clientMeta?.userAgent,
        });
        return {
            success: true,
            message: 'Password has been reset successfully. Please log in with your new password.',
        };
    }
    async sendEmailVerification(email, fullName, userId) {
        const rawToken = this.passwordService.generateRandomToken(32);
        const tokenHash = this.tokenStorage.hashToken(rawToken);
        const expiryHours = parseInt(this.configService.get('EMAIL_VERIFICATION_EXPIRES_HOURS') || '24', 10);
        await this.tokenStorage.storeToken(userId, tokenHash, 'EMAIL_VERIFICATION', expiryHours * 60);
        const baseUrl = this.configService.get('APP_URL') || 'http://localhost:3000';
        const verifyLink = `${baseUrl}/verify-email?token=${rawToken}`;
        const { text, html } = this.emailService.renderEmailVerificationEmail(fullName, verifyLink, expiryHours);
        await this.emailService.sendMail({
            to: email,
            subject: 'Verify Your SEG CRM Email Address',
            text,
            html,
        });
    }
    async verifyEmail(dto, clientMeta) {
        const rawToken = dto.token.trim();
        const tokenHash = this.tokenStorage.hashToken(rawToken);
        const entry = await this.tokenStorage.consumeToken(tokenHash, 'EMAIL_VERIFICATION');
        if (!entry) {
            throw new common_1.BadRequestException('Invalid, expired, or previously used email verification token.');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: entry.userId },
        });
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired email verification token.');
        }
        if (this.verifiedEmails.has(user.email)) {
            return {
                success: true,
                message: 'Email is already verified.',
            };
        }
        this.verifiedEmails.add(user.email);
        if (user.status === 'INVITED') {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { status: 'ACTIVE' },
            });
        }
        await this.auditService.log({
            actorUserId: user.id,
            action: 'EMAIL_VERIFIED',
            resource: 'users',
            resourceId: user.id,
            payload: { email: user.email },
            ipAddress: clientMeta?.ipAddress,
            userAgent: clientMeta?.userAgent,
        });
        return {
            success: true,
            message: 'Email address has been verified successfully.',
        };
    }
    async resendVerification(dto) {
        const email = dto.email.trim().toLowerCase();
        const genericResponse = {
            success: true,
            message: 'If an unverified account with that email exists, a new verification link has been sent.',
        };
        const rateLimitKey = `resend_verify:${email}`;
        const allowed = this.tokenStorage.checkRateLimit(rateLimitKey, 60);
        if (!allowed) {
            throw new common_1.HttpException('Too many verification requests. Please wait before trying again.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return genericResponse;
        }
        if (this.verifiedEmails.has(user.email)) {
            return {
                success: true,
                message: 'Your email address is already verified.',
            };
        }
        try {
            await this.sendEmailVerification(user.email, user.fullName, user.id);
        }
        catch (err) {
            this.logger.error(`Failed to dispatch email verification to ${user.email}: ${err.message}`);
            throw new common_1.HttpException('Email delivery failed. Please try again later.', common_1.HttpStatus.BAD_GATEWAY);
        }
        return genericResponse;
    }
    isEmailVerified(email) {
        return this.verifiedEmails.has(email.toLowerCase());
    }
};
exports.PasswordResetService = PasswordResetService;
exports.PasswordResetService = PasswordResetService = PasswordResetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        password_service_1.PasswordService,
        email_service_1.EmailService,
        token_storage_service_1.TokenStorageService,
        audit_service_1.AuditService,
        config_1.ConfigService])
], PasswordResetService);
//# sourceMappingURL=password-reset.service.js.map