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
var JwtAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const token_service_1 = require("../token.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const auth_decorators_1 = require("../decorators/auth.decorators");
let JwtAuthGuard = JwtAuthGuard_1 = class JwtAuthGuard {
    reflector;
    tokenService;
    prisma;
    logger = new common_1.Logger(JwtAuthGuard_1.name);
    constructor(reflector, tokenService, prisma) {
        this.reflector = reflector;
        this.tokenService = tokenService;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(auth_decorators_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new common_1.UnauthorizedException('Missing Authorization header.');
        }
        const [scheme, token] = authHeader.split(' ');
        if (scheme !== 'Bearer' || !token) {
            throw new common_1.UnauthorizedException('Invalid Authorization format. Expected: Bearer <token>');
        }
        const payload = this.tokenService.verifyAccessToken(token);
        const userRecord = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
                employee: {
                    select: { id: true },
                },
            },
        });
        if (!userRecord) {
            this.logger.warn(`JwtAuthGuard: User ${payload.sub} no longer exists in database.`);
            throw new common_1.UnauthorizedException('User account no longer exists.');
        }
        if (userRecord.status !== 'ACTIVE') {
            this.logger.warn(`JwtAuthGuard: User ${userRecord.id} account is currently ${userRecord.status}.`);
            throw new common_1.UnauthorizedException('User account is inactive or suspended.');
        }
        const permissions = userRecord.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`);
        const authenticatedUser = {
            userId: userRecord.id,
            email: userRecord.email,
            fullName: userRecord.fullName,
            role: {
                id: userRecord.role.id,
                code: userRecord.role.code,
                name: userRecord.role.name,
            },
            roles: [userRecord.role.code],
            permissions,
            employeeId: userRecord.employee?.id,
        };
        request.user = authenticatedUser;
        return true;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = JwtAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        token_service_1.TokenService,
        prisma_service_1.PrismaService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map