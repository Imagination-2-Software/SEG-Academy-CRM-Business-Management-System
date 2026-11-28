import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { AuthenticatedUser } from '../decorators/auth.decorators';

describe('Phase 1 - Unified RBAC & Legacy Role Compatibility Guard Suite', () => {
  function createMockReflector(config: { roles?: string[]; permissions?: any[]; isPublic?: boolean }) {
    return {
      getAllAndOverride: (key: string) => {
        if (key === 'isPublic') return config.isPublic ?? false;
        if (key === 'roles') return config.roles ?? [];
        if (key === 'permissions') return config.permissions ?? [];
        return null;
      },
    } as unknown as Reflector;
  }

  function createMockExecutionContext(user: Partial<AuthenticatedUser> | null): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('1. FOUNDER_SUPER_ADMIN possesses universal superuser access across all endpoints', () => {
    const reflector = createMockReflector({ roles: ['ADMIN', 'FINANCE_MANAGER', 'STUDENT'] });
    const rolesGuard = new RolesGuard(reflector);

    const context = createMockExecutionContext({
      userId: 'u-founder',
      roles: ['FOUNDER_SUPER_ADMIN'],
    });

    assert.equal(rolesGuard.canActivate(context), true);
  });

  it('2. Legacy TRAINER_FACULTY satisfies EMPLOYEE required role', () => {
    const reflector = createMockReflector({ roles: ['EMPLOYEE'] });
    const rolesGuard = new RolesGuard(reflector);

    const context = createMockExecutionContext({
      userId: 'u-trainer',
      roles: ['TRAINER_FACULTY'],
      employmentType: 'FACULTY_TRAINER',
    });

    assert.equal(rolesGuard.canActivate(context), true);
  });

  it('3. Legacy EMPLOYEE_INTERN satisfies EMPLOYEE required role', () => {
    const reflector = createMockReflector({ roles: ['EMPLOYEE'] });
    const rolesGuard = new RolesGuard(reflector);

    const context = createMockExecutionContext({
      userId: 'u-intern',
      roles: ['EMPLOYEE_INTERN'],
      employmentType: 'INTERN',
    });

    assert.equal(rolesGuard.canActivate(context), true);
  });

  it('4. Legacy TEAM_LEADER satisfies EMPLOYEE required role', () => {
    const reflector = createMockReflector({ roles: ['EMPLOYEE'] });
    const rolesGuard = new RolesGuard(reflector);

    const context = createMockExecutionContext({
      userId: 'u-lead',
      roles: ['TEAM_LEADER'],
    });

    assert.equal(rolesGuard.canActivate(context), true);
  });

  it('5. Consolidated EMPLOYEE role satisfies EMPLOYEE required role', () => {
    const reflector = createMockReflector({ roles: ['EMPLOYEE'] });
    const rolesGuard = new RolesGuard(reflector);

    const context = createMockExecutionContext({
      userId: 'u-emp',
      roles: ['EMPLOYEE'],
      employmentType: 'FULL_TIME',
    });

    assert.equal(rolesGuard.canActivate(context), true);
  });

  it('6. STUDENT role is strictly allowed for STUDENT endpoints', () => {
    const reflector = createMockReflector({ roles: ['STUDENT'] });
    const rolesGuard = new RolesGuard(reflector);

    const context = createMockExecutionContext({
      userId: 'u-student',
      roles: ['STUDENT'],
      studentId: 'stu-999',
    });

    assert.equal(rolesGuard.canActivate(context), true);
  });

  it('7. STUDENT role is strictly FORBIDDEN from accessing ADMIN endpoints', () => {
    const reflector = createMockReflector({ roles: ['ADMIN', 'FOUNDER_SUPER_ADMIN'] });
    const rolesGuard = new RolesGuard(reflector);

    const context = createMockExecutionContext({
      userId: 'u-student',
      roles: ['STUDENT'],
      studentId: 'stu-999',
    });

    assert.throws(
      () => rolesGuard.canActivate(context),
      (err: any) => err instanceof ForbiddenException && err.message.includes('Required role'),
    );
  });

  it('8. STUDENT role is strictly FORBIDDEN from accessing EMPLOYEE endpoints', () => {
    const reflector = createMockReflector({ roles: ['EMPLOYEE'] });
    const rolesGuard = new RolesGuard(reflector);

    const context = createMockExecutionContext({
      userId: 'u-student',
      roles: ['STUDENT'],
      studentId: 'stu-999',
    });

    assert.throws(
      () => rolesGuard.canActivate(context),
      (err: any) => err instanceof ForbiddenException && err.message.includes('Required role'),
    );
  });

  it('9. EMPLOYEE role is strictly FORBIDDEN from accessing STUDENT endpoints', () => {
    const reflector = createMockReflector({ roles: ['STUDENT'] });
    const rolesGuard = new RolesGuard(reflector);

    const context = createMockExecutionContext({
      userId: 'u-employee',
      roles: ['EMPLOYEE'],
      employeeId: 'emp-101',
    });

    assert.throws(
      () => rolesGuard.canActivate(context),
      (err: any) => err instanceof ForbiddenException && err.message.includes('Required role'),
    );
  });

  it('10. FINANCE_MANAGER is allowed for finance endpoints and forbidden from super-admin-only audit logs', () => {
    const finReflector = createMockReflector({ roles: ['FINANCE_MANAGER'] });
    const finGuard = new RolesGuard(finReflector);

    const finContext = createMockExecutionContext({
      userId: 'u-finance',
      roles: ['FINANCE_MANAGER'],
    });
    assert.equal(finGuard.canActivate(finContext), true);

    const superReflector = createMockReflector({ roles: ['FOUNDER_SUPER_ADMIN'] });
    const superGuard = new RolesGuard(superReflector);
    assert.throws(
      () => superGuard.canActivate(finContext),
      (err: any) => err instanceof ForbiddenException && err.message.includes('Required role'),
    );
  });

  it('11. Allows user possessing all required granular permissions', () => {
    const reflector = createMockReflector({
      permissions: [
        { resource: 'batches', action: 'read' },
        { resource: 'assignments', action: 'create' },
      ],
    });
    const permissionsGuard = new PermissionsGuard(reflector);

    const context = createMockExecutionContext({
      userId: 'u-faculty',
      roles: ['TRAINER_FACULTY'],
      permissions: ['batches:read', 'assignments:create', 'students:read'],
    });

    assert.equal(permissionsGuard.canActivate(context), true);
  });

  it('12. Denies employee when missing required granular permission even if role is valid', () => {
    const reflector = createMockReflector({
      permissions: [{ resource: 'invoices', action: 'approve' }],
    });
    const permissionsGuard = new PermissionsGuard(reflector);

    const context = createMockExecutionContext({
      userId: 'u-intern',
      roles: ['EMPLOYEE_INTERN'],
      permissions: ['tasks:read', 'tasks:update'],
    });

    assert.throws(
      () => permissionsGuard.canActivate(context),
      (err: any) => err instanceof ForbiddenException && err.message.includes('Missing required permission'),
    );
  });

  it('13. Denies student trying to call student management create/update APIs', () => {
    const reflector = createMockReflector({
      permissions: [{ resource: 'students', action: 'create' }],
    });
    const permissionsGuard = new PermissionsGuard(reflector);

    const context = createMockExecutionContext({
      userId: 'u-student',
      roles: ['STUDENT'],
      permissions: [],
    });

    assert.throws(
      () => permissionsGuard.canActivate(context),
      (err: any) => err instanceof ForbiddenException && err.message.includes('Missing required permission'),
    );
  });
});
