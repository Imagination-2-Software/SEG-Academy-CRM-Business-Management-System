import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/decorators/auth.decorators';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  ReplaceUserRolesDto,
  QueryUsersDto,
} from './dto/users.dto';

export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  roleId: string;
  status: string;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isSystem: boolean;
  };
  employee?: {
    id: string;
    employeeCode: string;
    jobTitle: string;
  } | null;
}

export interface PaginatedUsersResponse {
  data: SafeUser[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Lists users with pagination, fuzzy search and status/role filters.
   */
  async listUsers(query: QueryUsersDto): Promise<PaginatedUsersResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

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

    // Format safe response without passwordHash
    const safeData: SafeUser[] = users.map((u) => this.toSafeUser(u));

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

  /**
   * Retrieves user details by ID.
   */
  async getUserById(id: string): Promise<SafeUser> {
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
      throw new NotFoundException(`User with ID "${id}" was not found.`);
    }

    return this.toSafeUser(user);
  }

  /**
   * Creates a user account with Argon2id password hashing and audit logging.
   */
  async createUser(
    dto: CreateUserDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ): Promise<SafeUser> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Duplicate email check
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException(`User with email "${normalizedEmail}" already exists.`);
    }

    // 2. Validate role existence
    const targetRole = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!targetRole) {
      throw new BadRequestException(`Role with ID "${dto.roleId}" does not exist.`);
    }

    // 3. Prevent non-super-admin from assigning FOUNDER_SUPER_ADMIN
    if (
      targetRole.code === 'FOUNDER_SUPER_ADMIN' &&
      !actor.roles.includes('FOUNDER_SUPER_ADMIN')
    ) {
      this.logger.warn(
        `Privilege escalation attempt: Actor ${actor.userId} attempted to assign FOUNDER_SUPER_ADMIN.`,
      );
      throw new ForbiddenException(
        'Only FOUNDER_SUPER_ADMIN can assign the FOUNDER_SUPER_ADMIN role.',
      );
    }

    // 4. Hash initial password securely with Argon2id
    const passwordHash = await this.passwordService.hashPassword(dto.password);

    // 5. Create user in database
    const createdUser = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName: dto.fullName.trim(),
        phoneNumber: dto.phoneNumber?.trim() || null,
        passwordHash,
        roleId: targetRole.id,
        status: (dto.status as any) || 'ACTIVE',
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

    // 6. Record Audit Log
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

  /**
   * Updates non-sensitive user profile details.
   */
  async updateUser(
    id: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`User with ID "${id}" was not found.`);
    }

    const data: any = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber?.trim() || null;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl?.trim() || null;

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

  /**
   * Updates account status (ACTIVE, INACTIVE, SUSPENDED, INVITED).
   * Prevents self-deactivation and automatically revokes active sessions on deactivation.
   */
  async updateUserStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ): Promise<SafeUser> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!targetUser) {
      throw new NotFoundException(`User with ID "${id}" was not found.`);
    }

    // 1. Prevent self-deactivation / self-suspension
    if (id === actor.userId && dto.status !== 'ACTIVE') {
      throw new BadRequestException('Security protection: You cannot deactivate or suspend your own account.');
    }

    // 2. Protect FOUNDER_SUPER_ADMIN from being deactivated by others
    if (
      targetUser.role.code === 'FOUNDER_SUPER_ADMIN' &&
      !actor.roles.includes('FOUNDER_SUPER_ADMIN')
    ) {
      throw new ForbiddenException(
        'FOUNDER_SUPER_ADMIN account status cannot be modified by other administrators.',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status as any },
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

    // 3. If account is deactivated or suspended, immediately revoke all active refresh tokens!
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

  /**
   * Replaces user's assigned role.
   * Enforces privilege escalation guards, self-role modification blocks,
   * superuser protection, and session revocation.
   */
  async replaceUserRoles(
    id: string,
    dto: ReplaceUserRolesDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ): Promise<SafeUser> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!targetUser) {
      throw new NotFoundException(`User with ID "${id}" was not found.`);
    }

    // 1. Prevent self-role modification to avoid privilege escalation or accidental lockout
    if (id === actor.userId) {
      throw new BadRequestException('Security protection: You cannot modify your own assigned roles.');
    }

    // 2. Resolve target role from provided roleIds (schema supports 1 primary role per User)
    const targetRoleId = dto.roleIds[0];
    const newRole = await this.prisma.role.findUnique({
      where: { id: targetRoleId },
    });
    if (!newRole) {
      throw new BadRequestException(`Role with ID "${targetRoleId}" does not exist.`);
    }

    // 3. Superuser Protection on removal
    if (
      targetUser.role.code === 'FOUNDER_SUPER_ADMIN' &&
      !actor.roles.includes('FOUNDER_SUPER_ADMIN')
    ) {
      throw new ForbiddenException(
        'Cannot reassign or remove the role of a FOUNDER_SUPER_ADMIN account.',
      );
    }

    // 4. Superuser Protection on assignment
    if (
      newRole.code === 'FOUNDER_SUPER_ADMIN' &&
      !actor.roles.includes('FOUNDER_SUPER_ADMIN')
    ) {
      throw new ForbiddenException(
        'Only FOUNDER_SUPER_ADMIN can assign the FOUNDER_SUPER_ADMIN role.',
      );
    }

    // 5. Execute role update inside a transaction and invalidate active refresh tokens
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

      // Revoke all active sessions on role change so user must re-authenticate with new permissions
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

  /**
   * Retrieves the currently assigned role for a user.
   */
  async getUserRoles(id: string): Promise<{ roles: any[] }> {
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
      throw new NotFoundException(`User with ID "${id}" was not found.`);
    }

    const permissions = user.role.permissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`,
    );

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

  /**
   * Helper that formats a User database record into a safe serialized response.
   * Strips passwordHash and secret fields.
   */
  private toSafeUser(user: any): SafeUser {
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
}
