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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const password_service_1 = require("./password.service");
const token_service_1 = require("./token.service");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    passwordService;
    tokenService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, passwordService, tokenService) {
        this.prisma = prisma;
        this.passwordService = passwordService;
        this.tokenService = tokenService;
    }
    async login(dto, metadata) {
        const normalizedEmail = dto.email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: {
                role: true,
                employee: {
                    select: { id: true },
                },
            },
        });
        if (!user) {
            await this.passwordService.verifyPassword('$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$dGVzdGhhc2h2YWx1ZXRvcHJldmVudHRpbWluZ2F0dGFjaw', dto.password);
            throw new common_1.UnauthorizedException('Invalid email or password.');
        }
        if (user.status !== 'ACTIVE') {
            this.logger.warn(`Login rejected: User ${user.id} account status is ${user.status}.`);
            throw new common_1.UnauthorizedException('Invalid email or password.');
        }
        const isPasswordValid = await this.passwordService.verifyPassword(user.passwordHash, dto.password);
        if (!isPasswordValid) {
            this.logger.warn(`Failed login attempt for user ${user.id}.`);
            throw new common_1.UnauthorizedException('Invalid email or password.');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const jwtPayload = {
            sub: user.id,
            email: user.email,
            roleCode: user.role.code,
            fullName: user.fullName,
            employeeId: user.employee?.id,
        };
        const accessToken = this.tokenService.signAccessToken(jwtPayload);
        const rawRefreshToken = this.passwordService.generateRandomToken(32);
        const tokenHash = this.passwordService.hashToken(rawRefreshToken);
        const expiresAt = this.tokenService.getRefreshTokenExpiryDate();
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
                userAgent: metadata?.userAgent,
                ipAddress: metadata?.ipAddress,
            },
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: {
                    id: user.role.id,
                    code: user.role.code,
                    name: user.role.name,
                },
                employeeId: user.employee?.id,
            },
            tokens: {
                accessToken,
                refreshToken: rawRefreshToken,
                tokenType: 'Bearer',
                expiresIn: this.tokenService.getAccessTokenTtlSeconds(),
            },
        };
    }
    async refreshTokens(rawRefreshToken, metadata) {
        if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
            throw new common_1.UnauthorizedException('Invalid refresh token.');
        }
        const tokenHash = this.passwordService.hashToken(rawRefreshToken);
        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: {
                user: {
                    include: {
                        role: true,
                        employee: { select: { id: true } },
                    },
                },
            },
        });
        if (!storedToken) {
            throw new common_1.UnauthorizedException('Invalid refresh token.');
        }
        if (storedToken.isRevoked) {
            this.logger.error(`SECURITY ALERT: Replay attack detected for user ${storedToken.userId}! Revoking ALL active refresh tokens for user.`);
            await this.prisma.refreshToken.updateMany({
                where: { userId: storedToken.userId },
                data: { isRevoked: true },
            });
            throw new common_1.ForbiddenException('Suspicious session activity detected. Please log in again.');
        }
        if (storedToken.expiresAt < new Date()) {
            await this.prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: { isRevoked: true },
            });
            throw new common_1.UnauthorizedException('Refresh token has expired.');
        }
        if (storedToken.user.status !== 'ACTIVE') {
            await this.prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: { isRevoked: true },
            });
            throw new common_1.UnauthorizedException('User account is inactive.');
        }
        await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { isRevoked: true },
        });
        const jwtPayload = {
            sub: storedToken.user.id,
            email: storedToken.user.email,
            roleCode: storedToken.user.role.code,
            fullName: storedToken.user.fullName,
            employeeId: storedToken.user.employee?.id,
        };
        const newAccessToken = this.tokenService.signAccessToken(jwtPayload);
        const newRawRefreshToken = this.passwordService.generateRandomToken(32);
        const newTokenHash = this.passwordService.hashToken(newRawRefreshToken);
        const newExpiresAt = this.tokenService.getRefreshTokenExpiryDate();
        await this.prisma.refreshToken.create({
            data: {
                userId: storedToken.user.id,
                tokenHash: newTokenHash,
                expiresAt: newExpiresAt,
                userAgent: metadata?.userAgent,
                ipAddress: metadata?.ipAddress,
            },
        });
        return {
            accessToken: newAccessToken,
            refreshToken: newRawRefreshToken,
            tokenType: 'Bearer',
            expiresIn: this.tokenService.getAccessTokenTtlSeconds(),
        };
    }
    async logout(rawRefreshToken) {
        if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
            return { success: true, message: 'Session logged out.' };
        }
        const tokenHash = this.passwordService.hashToken(rawRefreshToken);
        await this.prisma.refreshToken.updateMany({
            where: { tokenHash, isRevoked: false },
            data: { isRevoked: true },
        });
        return { success: true, message: 'Session logged out successfully.' };
    }
    async revokeAllUserSessions(userId) {
        const result = await this.prisma.refreshToken.updateMany({
            where: { userId, isRevoked: false },
            data: { isRevoked: true },
        });
        return { revokedCount: result.count };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        password_service_1.PasswordService,
        token_service_1.TokenService])
], AuthService);
//# sourceMappingURL=auth.service.js.map