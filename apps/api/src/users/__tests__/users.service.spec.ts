import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { AuthenticatedUser } from '../../auth/decorators/auth.decorators';

describe('UsersService and Roles Assignment Unit Tests', () => {
  // Test actor fixtures
  const adminActor: AuthenticatedUser = {
    userId: 'usr-admin-1',
    email: 'admin@segacademy.com',
    fullName: 'System Administrator',
    role: { id: 'role-admin-id', code: 'ADMIN', name: 'System Administrator' },
    roles: ['ADMIN'],
    permissions: [
      'users:read',
      'users:create',
      'users:update',
      'users:manage_status',
      'users:manage_roles',
    ],
  };

  const superAdminActor: AuthenticatedUser = {
    userId: 'usr-founder-1',
    email: 'founder@segacademy.com',
    fullName: 'Founder Super Admin',
    role: { id: 'role-founder-id', code: 'FOUNDER_SUPER_ADMIN', name: 'Founder Super Admin' },
    roles: ['FOUNDER_SUPER_ADMIN'],
    permissions: ['*:*'],
  };

  const nonAdminActor: AuthenticatedUser = {
    userId: 'usr-employee-1',
    email: 'employee@segacademy.com',
    fullName: 'Intern User',
    role: { id: 'role-intern-id', code: 'EMPLOYEE_INTERN', name: 'Employee Intern' },
    roles: ['EMPLOYEE_INTERN'],
    permissions: ['users:read'],
  };

  // Mock PasswordService
  const mockPasswordService = {
    hashPassword: async (pwd: string) => `hashed_${pwd}`,
    verifyPassword: async (pwd: string, hash: string) => hash === `hashed_${pwd}`,
  };

  // Mock AuditService
  const auditLogs: any[] = [];
  const mockAuditService = {
    log: async (entry: any) => {
      auditLogs.push(entry);
    },
  };

  const createMockPrisma = (initialUsers: any[], initialRoles: any[]) => {
    let users = [...initialUsers];
    let roles = [...initialRoles];
    let refreshTokens: any[] = [
      { id: 'rt-1', userId: 'usr-target-1', isRevoked: false },
      { id: 'rt-2', userId: 'usr-target-1', isRevoked: false },
      { id: 'rt-3', userId: 'usr-admin-1', isRevoked: false },
    ];

    const prismaMock: any = {
      user: {
        findMany: async (args: any) => {
          let filtered = [...users];
          if (args?.where) {
            if (args.where.status) {
              filtered = filtered.filter((u) => u.status === args.where.status);
            }
            if (args.where.role?.code) {
              filtered = filtered.filter((u) => u.role?.code === args.where.role.code);
            }
            if (args.where.OR) {
              // search
              filtered = filtered.filter((u) =>
                u.email.includes('target') || u.fullName.includes('target'),
              );
            }
          }
          const skip = args?.skip || 0;
          const take = args?.take || filtered.length;
          return filtered.slice(skip, skip + take);
        },
        count: async (args: any) => {
          let filtered = [...users];
          if (args?.where?.status) {
            filtered = filtered.filter((u) => u.status === args.where.status);
          }
          return filtered.length;
        },
        findUnique: async (args: any) => {
          if (args.where.id) {
            return users.find((u) => u.id === args.where.id) || null;
          }
          if (args.where.email) {
            return users.find((u) => u.email === args.where.email.toLowerCase()) || null;
          }
          return null;
        },
        create: async (args: any) => {
          const role = roles.find((r) => r.id === args.data.roleId);
          const newUser = {
            id: `usr-${Date.now()}`,
            email: args.data.email,
            passwordHash: args.data.passwordHash,
            fullName: args.data.fullName,
            phoneNumber: args.data.phoneNumber || null,
            roleId: args.data.roleId,
            status: args.data.status || 'ACTIVE',
            avatarUrl: args.data.avatarUrl || null,
            lastLoginAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            role,
            employee: null,
          };
          users.push(newUser);
          return newUser;
        },
        update: async (args: any) => {
          const idx = users.findIndex((u) => u.id === args.where.id);
          if (idx === -1) throw new Error('User not found in mock');
          const updatedRole = args.data.roleId
            ? roles.find((r) => r.id === args.data.roleId)
            : users[idx].role;
          users[idx] = {
            ...users[idx],
            ...args.data,
            role: updatedRole,
            updatedAt: new Date(),
          };
          return users[idx];
        },
      },
      role: {
        findMany: async () => roles,
        findUnique: async (args: any) => {
          if (args.where.id) return roles.find((r) => r.id === args.where.id) || null;
          if (args.where.code) return roles.find((r) => r.code === args.where.code) || null;
          return null;
        },
      },
      refreshToken: {
        updateMany: async (args: any) => {
          let count = 0;
          refreshTokens = refreshTokens.map((rt) => {
            if (rt.userId === args.where.userId && (args.where.isRevoked === undefined || rt.isRevoked === args.where.isRevoked)) {
              count++;
              return { ...rt, isRevoked: args.data.isRevoked };
            }
            return rt;
          });
          return { count };
        },
      },
      $transaction: async (cb: any) => {
        return cb(prismaMock);
      },
      _getRefreshTokens: () => refreshTokens,
    };

    return prismaMock;
  };

  const sampleRoles = [
    {
      id: 'role-founder-id',
      code: 'FOUNDER_SUPER_ADMIN',
      name: 'Founder Super Admin',
      description: 'Full unconstrained platform control',
      isSystem: true,
      permissions: [{ permission: { resource: '*', action: '*' } }],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'role-admin-id',
      code: 'ADMIN',
      name: 'System Administrator',
      description: 'Platform management and staff admin',
      isSystem: true,
      permissions: [
        { permission: { resource: 'users', action: 'read' } },
        { permission: { resource: 'users', action: 'create' } },
        { permission: { resource: 'users', action: 'update' } },
        { permission: { resource: 'users', action: 'manage_status' } },
        { permission: { resource: 'users', action: 'manage_roles' } },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'role-intern-id',
      code: 'EMPLOYEE_INTERN',
      name: 'Employee Intern',
      description: 'Standard intern profile',
      isSystem: true,
      permissions: [{ permission: { resource: 'users', action: 'read' } }],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const sampleUsers = [
    {
      id: 'usr-founder-1',
      email: 'founder@segacademy.com',
      passwordHash: 'hashed_supersecret123',
      fullName: 'Founder Super Admin',
      phoneNumber: '+1000000000',
      roleId: 'role-founder-id',
      status: 'ACTIVE',
      avatarUrl: null,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      role: sampleRoles[0],
      employee: null,
    },
    {
      id: 'usr-admin-1',
      email: 'admin@segacademy.com',
      passwordHash: 'hashed_admin123',
      fullName: 'System Administrator',
      phoneNumber: '+1111111111',
      roleId: 'role-admin-id',
      status: 'ACTIVE',
      avatarUrl: null,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      role: sampleRoles[1],
      employee: {
        id: 'emp-admin',
        employeeCode: 'EMP-001',
        jobTitle: 'Lead Ops',
      },
    },
    {
      id: 'usr-target-1',
      email: 'target@segacademy.com',
      passwordHash: 'hashed_target123',
      fullName: 'Target User',
      phoneNumber: '+1222222222',
      roleId: 'role-intern-id',
      status: 'ACTIVE',
      avatarUrl: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: sampleRoles[2],
      employee: {
        id: 'emp-target',
        employeeCode: 'INT-099',
        jobTitle: 'Engineering Intern',
      },
    },
  ];

  it('1. GET /api/v1/users - Should paginate and never return passwordHash', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    const result = await service.listUsers({ page: 1, limit: 2 });
    assert.equal(result.data.length, 2);
    assert.equal(result.meta.page, 1);
    assert.equal(result.meta.limit, 2);
    assert.equal(result.meta.total, 3);
    assert.equal(result.meta.totalPages, 2);

    for (const user of result.data) {
      assert.equal((user as any).passwordHash, undefined, 'passwordHash must never be returned in user list');
      assert.ok(user.id);
      assert.ok(user.email);
      assert.ok(user.role);
    }
  });

  it('2. GET /api/v1/users/:id - Should return single user profile without passwordHash', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    const user = await service.getUserById('usr-target-1');
    assert.equal(user.id, 'usr-target-1');
    assert.equal(user.email, 'target@segacademy.com');
    assert.equal((user as any).passwordHash, undefined, 'passwordHash must be stripped');
    assert.equal(user.role.code, 'EMPLOYEE_INTERN');
    assert.equal(user.employee?.employeeCode, 'INT-099');
    assert.ok(Array.isArray(user.role.permissions));
    assert.ok(user.role.permissions.includes('users:read'));
  });

  it('3. GET /api/v1/users/:id - Should throw NotFoundException if user does not exist', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    await assert.rejects(
      async () => service.getUserById('non-existent-id'),
      (err: any) => err instanceof NotFoundException,
    );
  });

  it('4. POST /api/v1/users - Should create user securely with Argon2id hash and record audit log', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    const created = await service.createUser(
      {
        email: 'newuser@segacademy.com',
        fullName: 'New Trainee',
        password: 'SecurePassword123!',
        roleId: 'role-intern-id',
        phoneNumber: '+1999999999',
      },
      adminActor,
      { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
    );

    assert.ok(created.id);
    assert.equal(created.email, 'newuser@segacademy.com');
    assert.equal((created as any).passwordHash, undefined);
    assert.equal(created.status, 'ACTIVE');

    // Verify audit log
    const lastAudit = auditLogs[auditLogs.length - 1];
    assert.equal(lastAudit.action, 'USER_CREATED');
    assert.equal(lastAudit.actorUserId, adminActor.userId);
    assert.equal(lastAudit.payload.email, 'newuser@segacademy.com');
  });

  it('5. POST /api/v1/users - Should reject duplicate email with ConflictException', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    await assert.rejects(
      async () =>
        service.createUser(
          {
            email: 'target@segacademy.com', // Duplicate
            fullName: 'Duplicate User',
            password: 'Password123!',
            roleId: 'role-intern-id',
          },
          adminActor,
        ),
      (err: any) => err instanceof ConflictException,
    );
  });

  it('6. POST /api/v1/users - Non-superadmin cannot assign FOUNDER_SUPER_ADMIN role', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    await assert.rejects(
      async () =>
        service.createUser(
          {
            email: 'wannabe-superadmin@segacademy.com',
            fullName: 'Malicious Escalator',
            password: 'Password123!',
            roleId: 'role-founder-id', // FOUNDER_SUPER_ADMIN
          },
          adminActor, // Normal ADMIN
        ),
      (err: any) => err instanceof ForbiddenException,
    );
  });

  it('7. PATCH /api/v1/users/:id - Should update permitted profile fields and audit change', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    const updated = await service.updateUser(
      'usr-target-1',
      {
        fullName: 'Target User Renamed',
        phoneNumber: '+1999888777',
      },
      adminActor,
    );

    assert.equal(updated.fullName, 'Target User Renamed');
    assert.equal(updated.phoneNumber, '+1999888777');
    assert.equal((updated as any).passwordHash, undefined);

    const lastAudit = auditLogs[auditLogs.length - 1];
    assert.equal(lastAudit.action, 'USER_UPDATED');
    assert.equal(lastAudit.resourceId, 'usr-target-1');
  });

  it('8. PATCH /api/v1/users/:id/status - Should reject self-deactivation with BadRequestException', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    await assert.rejects(
      async () =>
        service.updateUserStatus(
          adminActor.userId, // Self
          { status: 'INACTIVE' as any },
          adminActor,
        ),
      (err: any) => err instanceof BadRequestException,
    );
  });

  it('9. PATCH /api/v1/users/:id/status - Should revoke refresh tokens upon deactivation', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    const updated = await service.updateUserStatus(
      'usr-target-1',
      { status: 'INACTIVE' as any },
      adminActor,
    );

    assert.equal(updated.status, 'INACTIVE');

    // Confirm that target's refresh tokens were revoked
    const targetTokens = prisma._getRefreshTokens().filter((rt: any) => rt.userId === 'usr-target-1');
    assert.equal(targetTokens.length, 2);
    assert.ok(targetTokens.every((rt: any) => rt.isRevoked === true));

    // Confirm admin's refresh token remained unrevoked
    const adminTokens = prisma._getRefreshTokens().filter((rt: any) => rt.userId === adminActor.userId);
    assert.equal(adminTokens[0].isRevoked, false);
  });

  it('10. PATCH /api/v1/users/:id/status - Should protect FOUNDER_SUPER_ADMIN from modification by non-founder', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    await assert.rejects(
      async () =>
        service.updateUserStatus(
          'usr-founder-1',
          { status: 'SUSPENDED' as any },
          adminActor, // Normal admin attempting to suspend founder
        ),
      (err: any) => err instanceof ForbiddenException,
    );
  });

  it('11. PUT /api/v1/users/:id/roles - Should reject self-role modification', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    await assert.rejects(
      async () =>
        service.replaceUserRoles(
          adminActor.userId, // Self
          { roleIds: ['role-founder-id'] },
          adminActor,
        ),
      (err: any) => err instanceof BadRequestException,
    );
  });

  it('12. PUT /api/v1/users/:id/roles - Non-superadmin cannot assign FOUNDER_SUPER_ADMIN role', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    await assert.rejects(
      async () =>
        service.replaceUserRoles(
          'usr-target-1',
          { roleIds: ['role-founder-id'] },
          adminActor, // Normal admin attempting privilege escalation
        ),
      (err: any) => err instanceof ForbiddenException,
    );
  });

  it('13. PUT /api/v1/users/:id/roles - Should replace role inside transaction and revoke active sessions', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    const updated = await service.replaceUserRoles(
      'usr-target-1',
      { roleIds: ['role-admin-id'] },
      adminActor,
    );

    assert.equal(updated.role.code, 'ADMIN');

    // Confirm session revocation on role change
    const targetTokens = prisma._getRefreshTokens().filter((rt: any) => rt.userId === 'usr-target-1');
    assert.ok(targetTokens.every((rt: any) => rt.isRevoked === true));

    // Confirm audit log
    const lastAudit = auditLogs[auditLogs.length - 1];
    assert.equal(lastAudit.action, 'USER_ROLE_REASSIGNED');
    assert.equal(lastAudit.payload.newRoleCode, 'ADMIN');
  });

  it('14. GET /api/v1/users/:id/roles - Should return user role with permissions list', async () => {
    const prisma = createMockPrisma(sampleUsers, sampleRoles);
    const service = new UsersService(prisma, mockPasswordService as any, mockAuditService as any);

    const res = await service.getUserRoles('usr-target-1');
    assert.ok(res.roles);
    assert.equal(res.roles.length, 1);
    assert.equal(res.roles[0].code, 'EMPLOYEE_INTERN');
    assert.deepEqual(res.roles[0].permissions, ['users:read']);
  });
});
