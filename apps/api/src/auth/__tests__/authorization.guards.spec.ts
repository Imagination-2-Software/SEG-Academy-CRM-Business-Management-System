import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { TokenService } from '../token.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Authorization Guards Comprehensive Unit Tests', () => {
  const mockConfigService = {
    get: (key: string) => {
      if (key === 'JWT_SECRET') return 'test-super-secret-key-at-least-32-chars-long!';
      if (key === 'JWT_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
      return null;
    },
  };
  const tokenService = new TokenService(mockConfigService as any);

  // Mock database records
  const mockDbUsers: Record<string, any> = {
    'usr-admin': {
      id: 'usr-admin',
      email: 'admin@segacademy.com',
      fullName: 'System Admin',
      status: 'ACTIVE',
      role: {
        id: 'role-admin',
        code: 'ADMIN',
        name: 'Administrator',
        permissions: [
          { permission: { resource: 'students', action: 'read' } },
          { permission: { resource: 'students', action: 'create' } },
          { permission: { resource: 'invoices', action: 'read' } },
          { permission: { resource: 'invoices', action: 'approve' } },
        ],
      },
      employee: { id: 'emp-1' },
    },
    'usr-finance': {
      id: 'usr-finance',
      email: 'finance@segacademy.com',
      fullName: 'Finance Officer',
      status: 'ACTIVE',
      role: {
        id: 'role-fin',
        code: 'FINANCE_MANAGER',
        name: 'Finance Manager',
        permissions: [
          { permission: { resource: 'invoices', action: 'read' } },
          { permission: { resource: 'payments', action: 'create' } },
        ],
      },
      employee: { id: 'emp-2' },
    },
    'usr-founder': {
      id: 'usr-founder',
      email: 'founder@segacademy.com',
      fullName: 'Founder Super Admin',
      status: 'ACTIVE',
      role: {
        id: 'role-super',
        code: 'FOUNDER_SUPER_ADMIN',
        name: 'Super Admin',
        permissions: [],
      },
      employee: { id: 'emp-3' },
    },
    'usr-suspended': {
      id: 'usr-suspended',
      email: 'bad@segacademy.com',
      fullName: 'Suspended User',
      status: 'SUSPENDED',
      role: {
        id: 'role-fin',
        code: 'FINANCE_MANAGER',
        name: 'Finance Manager',
        permissions: [],
      },
    },
  };

  const mockPrisma = {
    user: {
      findUnique: async ({ where }: any) => {
        return mockDbUsers[where.id] || null;
      },
    },
  } as unknown as PrismaService;

  // Helper to create mock ExecutionContext
  function createMockContext(
    authHeader?: string,
    metadata: { isPublic?: boolean; roles?: string[]; permissions?: any[] } = {},
  ): { context: ExecutionContext; request: any } {
    const request: any = {
      headers: {
        authorization: authHeader,
      },
      user: undefined,
    };

    const reflector = {
      getAllAndOverride: (key: string) => {
        if (key === 'isPublic') return metadata.isPublic ?? false;
        if (key === 'roles') return metadata.roles ?? null;
        if (key === 'permissions') return metadata.permissions ?? null;
        return null;
      },
    } as unknown as Reflector;

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  // --- JwtAuthGuard Tests ---
  describe('JwtAuthGuard', () => {
    it('should allow access to public endpoints without Authorization header', async () => {
      const { context } = createMockContext(undefined, { isPublic: true });
      const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
      const guard = new JwtAuthGuard(reflector, tokenService, mockPrisma);

      const canActivate = await guard.canActivate(context);
      assert.equal(canActivate, true);
    });

    it('should reject request when Authorization header is missing on protected endpoint (HTTP 401)', async () => {
      const { context } = createMockContext(undefined, { isPublic: false });
      const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
      const guard = new JwtAuthGuard(reflector, tokenService, mockPrisma);

      await assert.rejects(
        async () => guard.canActivate(context),
        (err: any) =>
          err instanceof UnauthorizedException && err.message === 'Missing Authorization header.',
      );
    });

    it('should reject malformed Authorization headers (HTTP 401)', async () => {
      const { context } = createMockContext('Basic xyz123', { isPublic: false });
      const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
      const guard = new JwtAuthGuard(reflector, tokenService, mockPrisma);

      await assert.rejects(
        async () => guard.canActivate(context),
        (err: any) =>
          err instanceof UnauthorizedException &&
          err.message.includes('Invalid Authorization format'),
      );
    });

    it('should reject tampered or invalid JWT signature (HTTP 401)', async () => {
      const token = tokenService.signAccessToken({
        sub: 'usr-admin',
        email: 'admin@segacademy.com',
        roleCode: 'ADMIN',
        fullName: 'Admin',
      });
      const tampered = token.slice(0, -5) + 'AAAAA';

      const { context } = createMockContext(`Bearer ${tampered}`, { isPublic: false });
      const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
      const guard = new JwtAuthGuard(reflector, tokenService, mockPrisma);

      await assert.rejects(
        async () => guard.canActivate(context),
        (err: any) => err instanceof UnauthorizedException,
      );
    });

    it('should reject expired JWT token (HTTP 401)', async () => {
      // Create token service with 0s TTL
      const expiredConfig = {
        get: (k: string) => (k === 'JWT_SECRET' ? 'test-super-secret-key-at-least-32-chars-long!' : '0s'),
      } as any;
      const expiredTokenService = new TokenService(expiredConfig);
      const expiredToken = expiredTokenService.signAccessToken({
        sub: 'usr-admin',
        email: 'admin@segacademy.com',
        roleCode: 'ADMIN',
        fullName: 'Admin',
      });

      // Small delay to ensure expiration
      await new Promise((r) => setTimeout(r, 100));

      const { context } = createMockContext(`Bearer ${expiredToken}`, { isPublic: false });
      const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
      const guard = new JwtAuthGuard(reflector, tokenService, mockPrisma);

      await assert.rejects(
        async () => guard.canActivate(context),
        (err: any) =>
          err instanceof UnauthorizedException && err.message.includes('expired'),
      );
    });

    it('should reject suspended/inactive user even with a valid JWT (HTTP 401)', async () => {
      const token = tokenService.signAccessToken({
        sub: 'usr-suspended',
        email: 'bad@segacademy.com',
        roleCode: 'FINANCE_MANAGER',
        fullName: 'Suspended',
      });

      const { context } = createMockContext(`Bearer ${token}`, { isPublic: false });
      const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
      const guard = new JwtAuthGuard(reflector, tokenService, mockPrisma);

      await assert.rejects(
        async () => guard.canActivate(context),
        (err: any) =>
          err instanceof UnauthorizedException && err.message.includes('inactive or suspended'),
      );
    });

    it('should successfully authenticate valid user and populate typed request.user context', async () => {
      const token = tokenService.signAccessToken({
        sub: 'usr-admin',
        email: 'admin@segacademy.com',
        roleCode: 'ADMIN',
        fullName: 'System Admin',
      });

      const { context, request } = createMockContext(`Bearer ${token}`, { isPublic: false });
      const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
      const guard = new JwtAuthGuard(reflector, tokenService, mockPrisma);

      const canActivate = await guard.canActivate(context);
      assert.equal(canActivate, true);

      // Verify request.user context
      assert.equal(request.user.userId, 'usr-admin');
      assert.equal(request.user.email, 'admin@segacademy.com');
      assert.deepEqual(request.user.roles, ['ADMIN']);
      assert.ok(request.user.permissions.includes('students:read'));
      assert.ok(request.user.permissions.includes('invoices:approve'));
      // Never expose passwordHash
      assert.equal(request.user.passwordHash, undefined);
    });

    it('ANTI-TAMPERING: Attacker modifying JWT payload roleCode is defeated by live DB lookup', async () => {
      // Attacker is finance officer usr-finance, but tries to forge roleCode: 'ADMIN' in JWT payload
      const token = tokenService.signAccessToken({
        sub: 'usr-finance',
        email: 'finance@segacademy.com',
        roleCode: 'FOUNDER_SUPER_ADMIN', // FORGED CLAIM!
        fullName: 'Finance Officer',
      });

      const { context, request } = createMockContext(`Bearer ${token}`, { isPublic: false });
      const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
      const guard = new JwtAuthGuard(reflector, tokenService, mockPrisma);

      await guard.canActivate(context);

      // The guard looked up usr-finance from database!
      assert.deepEqual(request.user.roles, ['FINANCE_MANAGER']);
      assert.notEqual(request.user.roles[0], 'FOUNDER_SUPER_ADMIN');
    });
  });

  // --- RolesGuard Tests ---
  describe('RolesGuard', () => {
    it('should allow access when user role matches one of the required roles', () => {
      const reflector = {
        getAllAndOverride: (key: string) => (key === 'roles' ? ['ADMIN', 'FOUNDER_SUPER_ADMIN'] : false),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);

      const { context, request } = createMockContext();
      request.user = { userId: '1', roles: ['ADMIN'] };

      assert.equal(guard.canActivate(context), true);
    });

    it('should deny access (HTTP 403) when user role is not in allowed list', () => {
      const reflector = {
        getAllAndOverride: (key: string) => (key === 'roles' ? ['ADMIN', 'FOUNDER_SUPER_ADMIN'] : false),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);

      const { context, request } = createMockContext();
      request.user = { userId: '2', roles: ['FINANCE_MANAGER'] };

      assert.throws(
        () => guard.canActivate(context),
        (err: any) => err instanceof ForbiddenException && err.message.includes('Required role'),
      );
    });

    it('should grant access to FOUNDER_SUPER_ADMIN regardless of required roles (Superuser bypass)', () => {
      const reflector = {
        getAllAndOverride: (key: string) => (key === 'roles' ? ['COUNSELOR', 'TRAINER_FACULTY'] : false),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);

      const { context, request } = createMockContext();
      request.user = { userId: '3', roles: ['FOUNDER_SUPER_ADMIN'] };

      assert.equal(guard.canActivate(context), true);
    });
  });

  // --- PermissionsGuard Tests ---
  describe('PermissionsGuard', () => {
    it('should allow access when user possesses all required permissions', () => {
      const reflector = {
        getAllAndOverride: (key: string) =>
          key === 'permissions'
            ? [
                { resource: 'invoices', action: 'read' },
                { resource: 'invoices', action: 'approve' },
              ]
            : false,
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);

      const { context, request } = createMockContext();
      request.user = {
        userId: '1',
        roles: ['ADMIN'],
        permissions: ['invoices:read', 'invoices:approve', 'students:read'],
      };

      assert.equal(guard.canActivate(context), true);
    });

    it('should deny access (HTTP 403) when user is missing any required permission', () => {
      const reflector = {
        getAllAndOverride: (key: string) =>
          key === 'permissions'
            ? [
                { resource: 'invoices', action: 'read' },
                { resource: 'invoices', action: 'approve' },
              ]
            : false,
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);

      const { context, request } = createMockContext();
      // User has invoices:read but lacks invoices:approve
      request.user = {
        userId: '2',
        roles: ['FINANCE_MANAGER'],
        permissions: ['invoices:read', 'payments:create'],
      };

      assert.throws(
        () => guard.canActivate(context),
        (err: any) =>
          err instanceof ForbiddenException &&
          err.message.includes('Missing required permission(s): invoices:approve'),
      );
    });

    it('should grant access to FOUNDER_SUPER_ADMIN regardless of required permissions', () => {
      const reflector = {
        getAllAndOverride: (key: string) =>
          key === 'permissions'
            ? [{ resource: 'secret_module', action: 'execute' }]
            : false,
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);

      const { context, request } = createMockContext();
      request.user = {
        userId: '3',
        roles: ['FOUNDER_SUPER_ADMIN'],
        permissions: [],
      };

      assert.equal(guard.canActivate(context), true);
    });
  });
});
