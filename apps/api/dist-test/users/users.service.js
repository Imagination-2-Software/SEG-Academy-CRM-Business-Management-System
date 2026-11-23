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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const password_service_1 = require("../auth/password.service");
const audit_service_1 = require("../audit/audit.service");
let UsersService = UsersService_1 = class UsersService {
    prisma;
    passwordService;
    auditService;
    logger = new common_1.Logger(UsersService_1.name);
    constructor(prisma, passwordService, auditService) {
        this.prisma = prisma;
        this.passwordService = passwordService;
        this.auditService = auditService;
    }
    async listUsers(query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(100, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.status) {
            where.status = query.status;
        }
        if (query.roleCode) {
            where.role = { code: query.roleCode };
        }
        if (query.search && query.search.trim()) {
            const search = query.search.trim();
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [total, users] = await Promise.all([
            this.prisma.user.count({ where }),
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    role: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            description: true,
                            isSystem: true,
                        },
                    },
                    employee: {
                        select: {
                            id: true,
                            employeeCode: true,
                            jobTitle: true,
                        },
                    },
                },
            }),
        ]);
        const safeData = users.map((u) => this.toSafeUser(u));
        return {
            data: safeData,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }
    async getUserById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                role: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        description: true,
                        isSystem: true,
                    },
                },
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        jobTitle: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID "${id}" was not found.`);
        }
        return this.toSafeUser(user);
    }
    async createUser(dto, actor, clientMeta) {
        const normalizedEmail = dto.email.trim().toLowerCase();
        const existing = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        if (existing) {
            throw new common_1.ConflictException(`User with email "${normalizedEmail}" already exists.`);
        }
        const targetRole = await this.prisma.role.findUnique({
            where: { id: dto.roleId },
        });
        if (!targetRole) {
            throw new common_1.BadRequestException(`Role with ID "${dto.roleId}" does not exist.`);
        }
        if (targetRole.code === 'FOUNDER_SUPER_ADMIN' &&
            !actor.roles.includes('FOUNDER_SUPER_ADMIN')) {
            this.logger.warn(`Privilege escalation attempt: Actor ${actor.userId} attempted to assign FOUNDER_SUPER_ADMIN.`);
            throw new common_1.ForbiddenException('Only FOUNDER_SUPER_ADMIN can assign the FOUNDER_SUPER_ADMIN role.');
        }
        const passwordHash = await this.passwordService.hashPassword(dto.password);
        const createdUser = await this.prisma.user.create({
            data: {
                email: normalizedEmail,
                fullName: dto.fullName.trim(),
                phoneNumber: dto.phoneNumber?.trim() || null,
                passwordHash,
                roleId: targetRole.id,
                status: dto.status || 'ACTIVE',
                avatarUrl: dto.avatarUrl?.trim() || null,
            },
            include: {
                role: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        description: true,
                        isSystem: true,
                    },
                },
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        jobTitle: true,
                    },
                },
            },
        });
        await this.auditService.log({
            actorUserId: actor.userId,
            action: 'USER_CREATED',
            resource: 'users',
            resourceId: createdUser.id,
            payload: {
                email: createdUser.email,
                fullName: createdUser.fullName,
                roleCode: targetRole.code,
                status: createdUser.status,
            },
            ipAddress: clientMeta?.ipAddress,
            userAgent: clientMeta?.userAgent,
        });
        return this.toSafeUser(createdUser);
    }
    async updateUser(id, dto, actor, clientMeta) {
        const existing = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`User with ID "${id}" was not found.`);
        }
        const data = {};
        if (dto.fullName !== undefined)
            data.fullName = dto.fullName.trim();
        if (dto.phoneNumber !== undefined)
            data.phoneNumber = dto.phoneNumber?.trim() || null;
        if (dto.avatarUrl !== undefined)
            data.avatarUrl = dto.avatarUrl?.trim() || null;
        const updated = await this.prisma.user.update({
            where: { id },
            data,
            include: {
                role: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        description: true,
                        isSystem: true,
                    },
                },
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        jobTitle: true,
                    },
                },
            },
        });
        await this.auditService.log({
            actorUserId: actor.userId,
            action: 'USER_UPDATED',
            resource: 'users',
            resourceId: id,
            payload: { updatedFields: data },
            ipAddress: clientMeta?.ipAddress,
            userAgent: clientMeta?.userAgent,
        });
        return this.toSafeUser(updated);
    }
    async updateUserStatus(id, dto, actor, clientMeta) {
        const targetUser = await this.prisma.user.findUnique({
            where: { id },
            include: { role: true },
        });
        if (!targetUser) {
            throw new common_1.NotFoundException(`User with ID "${id}" was not found.`);
        }
        if (id === actor.userId && dto.status !== 'ACTIVE') {
            throw new common_1.BadRequestException('Security protection: You cannot deactivate or suspend your own account.');
        }
        if (targetUser.role.code === 'FOUNDER_SUPER_ADMIN' &&
            !actor.roles.includes('FOUNDER_SUPER_ADMIN')) {
            throw new common_1.ForbiddenException('FOUNDER_SUPER_ADMIN account status cannot be modified by other administrators.');
        }
        const updated = await this.prisma.user.update({
            where: { id },
            data: { status: dto.status },
            include: {
                role: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        description: true,
                        isSystem: true,
                    },
                },
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        jobTitle: true,
                    },
                },
            },
        });
        if (dto.status !== 'ACTIVE') {
            await this.prisma.refreshToken.updateMany({
                where: { userId: id, isRevoked: false },
                data: { isRevoked: true },
            });
            this.logger.log(`Revoked all active sessions for deactivated/suspended user ${id}.`);
        }
        await this.auditService.log({
            actorUserId: actor.userId,
            action: 'USER_STATUS_CHANGED',
            resource: 'users',
            resourceId: id,
            payload: {
                previousStatus: targetUser.status,
                newStatus: dto.status,
                reason: dto.reason || null,
            },
            ipAddress: clientMeta?.ipAddress,
            userAgent: clientMeta?.userAgent,
        });
        return this.toSafeUser(updated);
    }
    async replaceUserRoles(id, dto, actor, clientMeta) {
        const targetUser = await this.prisma.user.findUnique({
            where: { id },
            include: { role: true },
        });
        if (!targetUser) {
            throw new common_1.NotFoundException(`User with ID "${id}" was not found.`);
        }
        if (id === actor.userId) {
            throw new common_1.BadRequestException('Security protection: You cannot modify your own assigned roles.');
        }
        const targetRoleId = dto.roleIds[0];
        const newRole = await this.prisma.role.findUnique({
            where: { id: targetRoleId },
        });
        if (!newRole) {
            throw new common_1.BadRequestException(`Role with ID "${targetRoleId}" does not exist.`);
        }
        if (targetUser.role.code === 'FOUNDER_SUPER_ADMIN' &&
            !actor.roles.includes('FOUNDER_SUPER_ADMIN')) {
            throw new common_1.ForbiddenException('Cannot reassign or remove the role of a FOUNDER_SUPER_ADMIN account.');
        }
        if (newRole.code === 'FOUNDER_SUPER_ADMIN' &&
            !actor.roles.includes('FOUNDER_SUPER_ADMIN')) {
            throw new common_1.ForbiddenException('Only FOUNDER_SUPER_ADMIN can assign the FOUNDER_SUPER_ADMIN role.');
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id },
                data: { roleId: newRole.id },
                include: {
                    role: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            description: true,
                            isSystem: true,
                        },
                    },
                    employee: {
                        select: {
                            id: true,
                            employeeCode: true,
                            jobTitle: true,
                        },
                    },
                },
            });
            await tx.refreshToken.updateMany({
                where: { userId: id, isRevoked: false },
                data: { isRevoked: true },
            });
            return user;
        });
        await this.auditService.log({
            actorUserId: actor.userId,
            action: 'USER_ROLE_REASSIGNED',
            resource: 'users',
            resourceId: id,
            payload: {
                previousRoleId: targetUser.role.id,
                previousRoleCode: targetUser.role.code,
                newRoleId: newRole.id,
                newRoleCode: newRole.code,
            },
            ipAddress: clientMeta?.ipAddress,
            userAgent: clientMeta?.userAgent,
        });
        return this.toSafeUser(updated);
    }
    async getUserRoles(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { permission: true },
                        },
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID "${id}" was not found.`);
        }
        const permissions = user.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`);
        return {
            roles: [
                {
                    id: user.role.id,
                    code: user.role.code,
                    name: user.role.name,
                    description: user.role.description,
                    isSystem: user.role.isSystem,
                    permissions,
                },
            ],
        };
    }
    toSafeUser(user) {
        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            phoneNumber: user.phoneNumber ?? null,
            roleId: user.roleId,
            status: user.status,
            avatarUrl: user.avatarUrl ?? null,
            lastLoginAt: user.lastLoginAt ?? null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            role: user.role,
            employee: user.employee ?? null,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        password_service_1.PasswordService,
        audit_service_1.AuditService])
], UsersService);
//# sourceMappingURL=users.service.js.map