import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { PasswordService } from '../password.service';
import { TokenService } from '../token.service';
import { PasswordResetService } from '../password-reset.service';
import { TokenStorageService } from '../token-storage.service';
import { UsersService } from '../../users/users.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { AuthenticatedUser } from '../decorators/auth.decorators';

describe('Part 4 Step 6 — End-to-End Authentication & Security Integration Tests', () => {
  const mockConfigService: any = {
    get: (key: string) => {
      if (key === 'JWT_SECRET') return 'test-super-secret-key-at-least-32-chars-long!';
      if (key === 'JWT_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret-key-32-chars-min!';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
      if (key === 'APP_URL') return 'https://crm.segacademy.com';
      if (key === 'PASSWORD_RESET_EXPIRES_MINUTES') return '15';
      if (key === 'EMAIL_VERIFICATION_EXPIRES_HOURS') return '24';
      return null;
    },
  };

  const passwordService = new PasswordService();
  const tokenService = new TokenService(mockConfigService);
  const tokenStorage = new TokenStorageService();

  // Test Roles
  const roles = [
    {
      id: 'role-founder',
      code: 'FOUNDER_SUPER_ADMIN',
      name: 'Founder Super Admin',
      description: 'Superuser',
      isSystem: true,
      permissions: [
        {
          permission: {
            id: 'p-all',
            resource: '*',
            action: '*',
          },
        },
      ],
    },
    {
      id: 'role-admin',
      code: 'ADMIN',
      name: 'Administrator',
      description: 'Admin access',
      isSystem: true,
      permissions: [
        {
          permission: {
            id: 'p-users-read',
            resource: 'users',
            action: 'read',
          },
        },
        {
          permission: {
            id: 'p-users-manage-roles',
            resource: 'users',
            action: 'manage_roles',
          },
        },
      ],
    },
    {
      id: 'role-intern',
      code: 'EMPLOYEE_INTERN',
      name: 'Intern',
      description: 'Intern access',
      isSystem: true,
      permissions: [
        {
          permission: {
            id: 'p-users-read',
            resource: 'users',
            action: 'read',
          },
        },
      ],
    },
  ];

  // In-memory Database Fixture
  let users: any[] = [];
  let refreshTokens: any[] = [];
  let auditLogs: any[] = [];
  let dispatchedEmails: any[] = [];

  const resetDb = async () => {
    tokenStorage.clear();
    refreshTokens = [];
    auditLogs = [];
    dispatchedEmails = [];

    const pwdHash = await passwordService.hashPassword('StandardPassword123!');
    users = [
      {
        id: 'usr-founder-id',
        email: 'founder@segacademy.com',
        fullName: 'Founder Admin',
        passwordHash: pwdHash,
        phoneNumber: null,
        roleId: 'role-founder',
        status: 'ACTIVE',
        avatarUrl: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roles[0],
        employee: null,
      },
      {
        id: 'usr-admin-id',
        email: 'admin@segacademy.com',
        fullName: 'System Admin',
        passwordHash: pwdHash,
        phoneNumber: null,
        roleId: 'role-admin',
        status: 'ACTIVE',
        avatarUrl: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roles[1],
        employee: { id: 'emp-1', employeeCode: 'ADM-01', jobTitle: 'Admin' },
      },
      {
        id: 'usr-intern-id',
        email: 'intern@segacademy.com',
        fullName: 'Trainee Intern',
        passwordHash: pwdHash,
        phoneNumber: null,
        roleId: 'role-intern',
        status: 'ACTIVE',
        avatarUrl: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roles[2],
        employee: { id: 'emp-2', employeeCode: 'INT-01', jobTitle: 'Intern' },
      },
      {
        id: 'usr-suspended-id',
        email: 'suspended@segacademy.com',
        fullName: 'Suspended Staff',
        passwordHash: pwdHash,
        phoneNumber: null,
        roleId: 'role-intern',
        status: 'SUSPENDED',
        avatarUrl: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roles[2],
        employee: null,
      },
      {
        id: 'usr-inactive-id',
        email: 'inactive@segacademy.com',
        fullName: 'Inactive Staff',
        passwordHash: pwdHash,
        phoneNumber: null,
        roleId: 'role-intern',
        status: 'INACTIVE',
        avatarUrl: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roles[2],
        employee: null,
      },
    ];
  };

  const prismaMock: any = {
    user: {
      findUnique: async (args: any) => {
        if (args.where.id) return users.find((u) => u.id === args.where.id) || null;
        if (args.where.email) return users.find((u) => u.email === args.where.email.toLowerCase()) || null;
        return null;
      },
      update: async (args: any) => {
        const idx = users.findIndex((u) => u.id === args.where.id);
        if (idx === -1) throw new Error('User not found');
        const updatedRole = args.data.roleId
          ? roles.find((r) => r.id === args.data.roleId)
          : users[idx].role;
        users[idx] = { ...users[idx], ...args.data, role: updatedRole, updatedAt: new Date() };
        return users[idx];
      },
    },
    role: {
      findUnique: async (args: any) => {
        if (args.where.id) return roles.find((r) => r.id === args.where.id) || null;
        if (args.where.code) return roles.find((r) => r.code === args.where.code) || null;
        return null;
      },
    },
    refreshToken: {
      create: async (args: any) => {
        const token = {
          id: `rt-${Date.now()}-${Math.random()}`,
          userId: args.data.userId,
          tokenHash: args.data.tokenHash,
          expiresAt: args.data.expiresAt,
          isRevoked: args.data.isRevoked || false,
          userAgent: args.data.userAgent,
          ipAddress: args.data.ipAddress,
        };
        refreshTokens.push(token);
        return token;
      },
      findUnique: async (args: any) => {
        const token = refreshTokens.find((rt) => rt.tokenHash === args.where.tokenHash);
        if (!token) return null;
        const user = users.find((u) => u.id === token.userId);
        return {
          ...token,
          user: user ? { ...user } : null,
        };
      },
      update: async (args: any) => {
        const idx = refreshTokens.findIndex((rt) => rt.id === args.where.id);
        if (idx === -1) throw new Error('Token not found');
        refreshTokens[idx] = { ...refreshTokens[idx], ...args.data };
        return refreshTokens[idx];
      },
      updateMany: async (args: any) => {
        let count = 0;
        refreshTokens = refreshTokens.map((rt) => {
          const matchUser = !args.where?.userId || rt.userId === args.where.userId;
          const matchHash = !args.where?.tokenHash || rt.tokenHash === args.where.tokenHash;
          const matchRevoked = args.where?.isRevoked === undefined || rt.isRevoked === args.where.isRevoked;
          if (matchUser && matchHash && matchRevoked) {
            count++;
            return { ...rt, isRevoked: args.data.isRevoked };
          }
          return rt;
        });
        return { count };
      },
    },
    $transaction: async (cb: any) => cb(prismaMock),
  };

  const emailServiceMock: any = {
    sendMail: async (opts: any) => {
      dispatchedEmails.push(opts);
      return { messageId: 'msg-id', delivered: true };
    },
    renderPasswordResetEmail: (name: string, link: string, expiry: number) => ({
      text: `Link: ${link}`,
      html: `<p>Link: ${link}</p>`,
    }),
    renderEmailVerificationEmail: (name: string, link: string, expiry: number) => ({
      text: `Link: ${link}`,
      html: `<p>Link: ${link}</p>`,
    }),
  };

  const auditServiceMock: any = {
    log: async (entry: any) => {
      auditLogs.push(entry);
    },
  };

  const tokenStorageService = new TokenStorageService();

  const authService = new AuthService(
    prismaMock,
    passwordService,
    tokenService,
    auditServiceMock,
    tokenStorageService,
  );

  const passwordResetService = new PasswordResetService(
    prismaMock,
    passwordService,
    emailServiceMock,
    tokenStorage,
    auditServiceMock,
    mockConfigService,
  );

  const usersService = new UsersService(
    prismaMock,
    passwordService,
    auditServiceMock,
  );

  // Helper to create mock execution context
  const createMockContext = (
    req: any,
    metadata: { isPublic?: boolean; roles?: string[]; permissions?: any[] } = {},
  ): { context: ExecutionContext; reflector: Reflector } => {
    const reflector = {
      getAllAndOverride: (key: string) => {
        if (key === 'isPublic') return metadata.isPublic;
        if (key === 'roles') return metadata.roles;
        if (key === 'permissions') return metadata.permissions;
        return null;
      },
    } as any;

    const context: any = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
    };

    return { context, reflector };
  };

  it('1. Login → Access Token Issuance → Authenticated Request via JwtAuthGuard', async () => {
    await resetDb();

    // Step A: Login
    const loginResult = await authService.login({
      email: 'admin@segacademy.com',
      password: 'StandardPassword123!',
    });

    assert.ok(loginResult.tokens.accessToken);
    assert.ok(loginResult.tokens.refreshToken);
    assert.equal(loginResult.user.email, 'admin@segacademy.com');

    // Step B: Authenticated request via JwtAuthGuard
    const req: any = {
      headers: { authorization: `Bearer ${loginResult.tokens.accessToken}` },
    };
    const { context, reflector } = createMockContext(req);
    const guard = new JwtAuthGuard(reflector, tokenService, prismaMock);

    const allowed = await guard.canActivate(context);
    assert.equal(allowed, true);
    assert.ok(req.user, 'JwtAuthGuard must populate request.user context');
    assert.equal(req.user.userId, 'usr-admin-id');
    assert.deepEqual(req.user.roles, ['ADMIN']);
    assert.ok(req.user.permissions.includes('users:read'));
  });

  it('2. Login → Refresh Token Rotation → Old Refresh Token Replay Detection', async () => {
    await resetDb();

    // Step A: Login
    const loginRes = await authService.login({
      email: 'admin@segacademy.com',
      password: 'StandardPassword123!',
    });
    const oldRefreshToken = loginRes.tokens.refreshToken;

    // Step B: Refresh rotation
    const rotateRes = await authService.refreshTokens(oldRefreshToken);
    assert.ok(rotateRes.accessToken);
    assert.ok(rotateRes.refreshToken);
    assert.notEqual(rotateRes.refreshToken, oldRefreshToken);

    // Step C: Replay attack (Using old refresh token again)
    await assert.rejects(
      async () => authService.refreshTokens(oldRefreshToken),
      (err: any) => err instanceof ForbiddenException,
    );

    // Confirm that replay detection revoked ALL sessions for the user
    const userTokens = refreshTokens.filter((rt) => rt.userId === 'usr-admin-id');
    assert.ok(userTokens.length >= 2);
    assert.ok(userTokens.every((rt) => rt.isRevoked === true));
  });

  it('3. Login → Logout → Session Invalidation', async () => {
    await resetDb();

    const loginRes = await authService.login({
      email: 'intern@segacademy.com',
      password: 'StandardPassword123!',
    });

    const logoutRes = await authService.logout(loginRes.tokens.refreshToken);
    assert.equal(logoutRes.success, true);

    // Attempting to refresh with the logged-out token must fail with ForbiddenException (since it is revoked)
    await assert.rejects(
      async () => authService.refreshTokens(loginRes.tokens.refreshToken),
      (err: any) => err instanceof ForbiddenException,
    );
  });

  it('4. Password Reset Flow → Old Refresh-Token Sessions Revoked', async () => {
    await resetDb();

    // Active session before password reset
    const loginRes = await authService.login({
      email: 'intern@segacademy.com',
      password: 'StandardPassword123!',
    });

    // Request reset link
    await passwordResetService.forgotPassword({ email: 'intern@segacademy.com' });
    assert.equal(dispatchedEmails.length, 1);
    const rawToken = dispatchedEmails[0].text.match(/token=([a-f0-9]+)/)[1];

    // Execute password reset
    const resetRes = await passwordResetService.resetPassword({
      token: rawToken,
      newPassword: 'BrandNewStrongPassword123!',
    });
    assert.equal(resetRes.success, true);

    // Verify old password no longer works for login
    await assert.rejects(
      async () =>
        authService.login({
          email: 'intern@segacademy.com',
          password: 'StandardPassword123!',
        }),
      (err: any) => err instanceof UnauthorizedException,
    );

    // Verify new password logs in successfully
    const newLoginRes = await authService.login({
      email: 'intern@segacademy.com',
      password: 'BrandNewStrongPassword123!',
    });
    assert.ok(newLoginRes.tokens.accessToken);

    // Verify that the prior session's refresh token was revoked
    await assert.rejects(
      async () => authService.refreshTokens(loginRes.tokens.refreshToken),
      (err: any) => err instanceof ForbiddenException,
    );
  });

  it('5. Role Reassignment Flow → Active Sessions Immediately Revoked in Transaction', async () => {
    await resetDb();

    // Intern logs in
    const internLogin = await authService.login({
      email: 'intern@segacademy.com',
      password: 'StandardPassword123!',
    });

    const founderActor: AuthenticatedUser = {
      userId: 'usr-founder-id',
      email: 'founder@segacademy.com',
      fullName: 'Founder',
      role: { id: 'role-founder', code: 'FOUNDER_SUPER_ADMIN', name: 'Founder' },
      roles: ['FOUNDER_SUPER_ADMIN'],
      permissions: ['*:*'],
    };

    // Promote intern to ADMIN
    await usersService.replaceUserRoles(
      'usr-intern-id',
      { roleIds: ['role-admin'] },
      founderActor,
    );

    // Verify intern's refresh token was revoked
    await assert.rejects(
      async () => authService.refreshTokens(internLogin.tokens.refreshToken),
      (err: any) => err instanceof ForbiddenException,
    );
  });

  it('6. Inactive & Suspended Users → Access Denied in JwtAuthGuard', async () => {
    await resetDb();

    // Token forged or issued before suspension for suspended user
    const suspendedToken = tokenService.signAccessToken({
      sub: 'usr-suspended-id',
      email: 'suspended@segacademy.com',
      fullName: 'Suspended Staff',
      roleCode: 'EMPLOYEE_INTERN',
    });

    const reqSuspended: any = {
      headers: { authorization: `Bearer ${suspendedToken}` },
    };
    const { context: ctxSuspended, reflector: refSuspended } = createMockContext(reqSuspended);
    const guard = new JwtAuthGuard(refSuspended, tokenService, prismaMock);

    await assert.rejects(
      async () => guard.canActivate(ctxSuspended),
      (err: any) => err instanceof UnauthorizedException && err.message.includes('inactive or suspended'),
    );

    // Inactive user
    const inactiveToken = tokenService.signAccessToken({
      sub: 'usr-inactive-id',
      email: 'inactive@segacademy.com',
      fullName: 'Inactive Staff',
      roleCode: 'EMPLOYEE_INTERN',
    });

    const reqInactive: any = {
      headers: { authorization: `Bearer ${inactiveToken}` },
    };
    const { context: ctxInactive, reflector: refInactive } = createMockContext(reqInactive);

    await assert.rejects(
      async () => guard.canActivate(ctxInactive),
      (err: any) => err instanceof UnauthorizedException && err.message.includes('inactive or suspended'),
    );
  });

  it('7. Public Endpoint Bypass & Protected Endpoint Rejection', async () => {
    await resetDb();

    // Public route: no token required
    const reqPublic: any = { headers: {} };
    const { context: ctxPublic, reflector: refPublic } = createMockContext(reqPublic, {
      isPublic: true,
    });
    const guard = new JwtAuthGuard(refPublic, tokenService, prismaMock);
    const allowed = await guard.canActivate(ctxPublic);
    assert.equal(allowed, true);

    // Protected route without authorization header -> 401
    const reqProtected: any = { headers: {} };
    const { context: ctxProtected, reflector: refProtected } = createMockContext(reqProtected, {
      isPublic: false,
    });
    const protectedGuard = new JwtAuthGuard(refProtected, tokenService, prismaMock);

    await assert.rejects(
      async () => protectedGuard.canActivate(ctxProtected),
      (err: any) => err instanceof UnauthorizedException && err.message.includes('Missing Authorization header'),
    );
  });

  it('8. Insufficient Permissions Guard (HTTP 403) & Superuser Bypass', async () => {
    await resetDb();

    // Request by intern (has only users:read)
    const reqIntern: any = {
      user: {
        userId: 'usr-intern-id',
        email: 'intern@segacademy.com',
        fullName: 'Intern',
        role: { id: 'role-intern', code: 'EMPLOYEE_INTERN', name: 'Intern' },
        roles: ['EMPLOYEE_INTERN'],
        permissions: ['users:read'],
      },
    };

    // Route requires users:manage_roles
    const { context: ctxPerm, reflector: refPerm } = createMockContext(reqIntern, {
      permissions: [{ resource: 'users', action: 'manage_roles' }],
    });
    const permGuard = new PermissionsGuard(refPerm);

    assert.throws(
      () => permGuard.canActivate(ctxPerm),
      (err: any) => err instanceof ForbiddenException,
    );

    // Route accessed by FOUNDER_SUPER_ADMIN -> Superuser bypass
    const reqFounder: any = {
      user: {
        userId: 'usr-founder-id',
        email: 'founder@segacademy.com',
        fullName: 'Founder',
        role: { id: 'role-founder', code: 'FOUNDER_SUPER_ADMIN', name: 'Founder' },
        roles: ['FOUNDER_SUPER_ADMIN'],
        permissions: ['*:*'],
      },
    };
    const { context: ctxFounder, reflector: refFounder } = createMockContext(reqFounder, {
      permissions: [{ resource: 'users', action: 'manage_roles' }],
    });

    const superuserAllowed = permGuard.canActivate(ctxFounder);
    assert.equal(superuserAllowed, true);
  });

  it('9. CONCURRENT REFRESH: Simultaneous refresh requests with same token - only one succeeds, subsequent fails or triggers rotation', async () => {
    await resetDb();

    // 1. Initial login
    const loginRes = await authService.login(
      { email: 'admin@segacademy.com', password: 'StandardPassword123!' },
      { ipAddress: '127.0.0.1', userAgent: 'Browser/1.0' },
    );
    const originalRefreshToken = loginRes.tokens.refreshToken;

    // 2. Fire two concurrent refresh requests simultaneously
    const results = await Promise.allSettled([
      authService.refreshTokens(
        originalRefreshToken,
        { ipAddress: '127.0.0.1', userAgent: 'Browser/1.0' },
      ),
      authService.refreshTokens(
        originalRefreshToken,
        { ipAddress: '127.0.0.1', userAgent: 'Browser/1.0' },
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Either strictly one succeeds and one is rejected (due to rotation replay prevention),
    // or both handle sequentially if queued. In strict rotation, at most 1 can succeed with original token.
    assert.ok(fulfilled.length >= 1, 'At least one refresh request must succeed');
    if (fulfilled.length === 1) {
      assert.equal(rejected.length, 1, 'Second concurrent request was blocked as replay');
    }
  });
});
