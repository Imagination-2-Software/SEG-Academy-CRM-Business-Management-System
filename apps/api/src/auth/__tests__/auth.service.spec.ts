import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PasswordService } from '../password.service';
import { TokenService } from '../token.service';
import { TokenStorageService } from '../token-storage.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService Rotation & Revocation Unit Tests', () => {
  const passwordService = new PasswordService();

  const mockConfigService = {
    get: (key: string) => {
      if (key === 'JWT_SECRET') return 'test-super-secret-key-at-least-32-chars-long!';
      if (key === 'JWT_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
      return null;
    },
  };
  const tokenService = new TokenService(mockConfigService as any);

  // In-memory mock database state
  let mockUsers: any[] = [];
  let mockTokens: any[] = [];
  let mockRoles: any[] = [
    {
      id: 'role-founder',
      code: 'FOUNDER_SUPER_ADMIN',
      name: 'Founder / Super Admin',
      description: 'Super Admin',
      isSystem: true,
    },
  ];

  const mockAuditService = {
    log: async () => {},
  };

  const mockPrisma = {
    user: {
      findUnique: async ({ where }: any) => {
        if (where.id) return mockUsers.find((u) => u.id === where.id) || null;
        if (where.email) return mockUsers.find((u) => u.email === where.email) || null;
        return null;
      },
      count: async (params?: any) => {
        const where = params?.where;
        if (!where) return mockUsers.length;
        if (where.roleId) return mockUsers.filter((u) => u.roleId === where.roleId).length;
        return mockUsers.length;
      },
      create: async ({ data }: any) => {
        const role = mockRoles.find((r) => r.id === data.roleId) || {
          id: data.roleId,
          code: 'FOUNDER_SUPER_ADMIN',
          name: 'Founder',
        };
        const user = {
          id: `usr-${mockUsers.length + 1}`,
          ...data,
          role,
          employee: null,
        };
        mockUsers.push(user);
        return user;
      },
      update: async ({ where, data }: any) => {
        const user = mockUsers.find((u) => u.id === where.id);
        if (user) Object.assign(user, data);
        return user;
      },
    },
    role: {
      findUnique: async ({ where }: any) => {
        return mockRoles.find((r) => r.code === where.code || r.id === where.id) || null;
      },
      create: async ({ data }: any) => {
        const role = { id: `role-${mockRoles.length + 1}`, ...data };
        mockRoles.push(role);
        return role;
      },
    },
    refreshToken: {
      create: async ({ data }: any) => {
        const record = { id: `token-${mockTokens.length + 1}`, isRevoked: false, ...data };
        mockTokens.push(record);
        return record;
      },
      findUnique: async ({ where }: any) => {
        const token = mockTokens.find((t) => t.tokenHash === where.tokenHash);
        if (!token) return null;
        const user = mockUsers.find((u) => u.id === token.userId);
        return { ...token, user };
      },
      update: async ({ where, data }: any) => {
        const token = mockTokens.find((t) => t.id === where.id);
        if (token) Object.assign(token, data);
        return token;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        mockTokens.forEach((t) => {
          let match = true;
          if (where.userId && t.userId !== where.userId) match = false;
          if (where.tokenHash && t.tokenHash !== where.tokenHash) match = false;
          if (where.isRevoked !== undefined && t.isRevoked !== where.isRevoked) match = false;
          if (match) {
            Object.assign(t, data);
            count++;
          }
        });
        return { count };
      },
    },
    $transaction: async (fn: any) => {
      if (typeof fn === 'function') {
        return fn(mockPrisma);
      }
      return Promise.all(fn);
    },
  } as unknown as PrismaService;

  const tokenStorageService = new TokenStorageService();

  const authService = new AuthService(
    mockPrisma,
    passwordService,
    tokenService,
    mockAuditService as any,
    tokenStorageService,
  );

  it('should authenticate valid credentials and issue tokens', async () => {
    const rawPassword = 'CorrectPassword123!';
    const passwordHash = await passwordService.hashPassword(rawPassword);

    mockUsers = [
      {
        id: 'usr-1',
        email: 'admin@segacademy.com',
        fullName: 'Admin User',
        passwordHash,
        status: 'ACTIVE',
        role: { id: 'role-1', code: 'ADMIN', name: 'Administrator' },
        employee: { id: 'emp-1' },
      },
    ];
    mockTokens = [];

    const res = await authService.login({
      email: 'admin@segacademy.com',
      password: rawPassword,
    });

    assert.equal(res.user.email, 'admin@segacademy.com');
    assert.equal(res.user.role.code, 'ADMIN');
    assert.ok(res.tokens.accessToken);
    assert.ok(res.tokens.refreshToken);
    assert.equal(res.tokens.tokenType, 'Bearer');

    // Verify token was stored as SHA-256 hash in mock database
    assert.equal(mockTokens.length, 1);
    assert.notEqual(mockTokens[0].tokenHash, res.tokens.refreshToken);
    assert.equal(
      mockTokens[0].tokenHash,
      passwordService.hashToken(res.tokens.refreshToken),
    );
  });

  it('should reject invalid credentials with generic message', async () => {
    await assert.rejects(
      async () =>
        authService.login({
          email: 'admin@segacademy.com',
          password: 'WrongPassword!',
        }),
      (err: any) =>
        err instanceof UnauthorizedException && err.message === 'Invalid email or password.',
    );
  });

  it('should rotate refresh token and revoke the previous token', async () => {
    const loginRes = await authService.login({
      email: 'admin@segacademy.com',
      password: 'CorrectPassword123!',
    });

    const oldToken = loginRes.tokens.refreshToken;
    const oldHash = passwordService.hashToken(oldToken);

    // Perform refresh
    const refreshed = await authService.refreshTokens(oldToken);

    assert.ok(refreshed.accessToken);
    assert.ok(refreshed.refreshToken);
    assert.notEqual(refreshed.refreshToken, oldToken, 'New token must differ from old token');

    // Confirm old token is marked revoked
    const storedOld = mockTokens.find((t) => t.tokenHash === oldHash);
    assert.equal(storedOld.isRevoked, true, 'Old token must be marked isRevoked = true');

    // Confirm new token exists and is active
    const newHash = passwordService.hashToken(refreshed.refreshToken);
    const storedNew = mockTokens.find((t) => t.tokenHash === newHash);
    assert.ok(storedNew);
    assert.equal(storedNew.isRevoked, false, 'New token must be active');
  });

  it('SECURITY REPLAY ATTACK: Reusing an already-revoked refresh token must revoke ALL user tokens and throw ForbiddenException', async () => {
    // 1. Initial login
    const loginRes = await authService.login({
      email: 'admin@segacademy.com',
      password: 'CorrectPassword123!',
    });

    const tokenA = loginRes.tokens.refreshToken;

    // 2. Normal rotation: tokenA is rotated to tokenB
    const rotated = await authService.refreshTokens(tokenA);
    const tokenB = rotated.refreshToken;

    // 3. Attacker replays tokenA!
    await assert.rejects(
      async () => authService.refreshTokens(tokenA),
      (err: any) =>
        err instanceof ForbiddenException &&
        err.message.includes('Suspicious session activity detected'),
    );

    // 4. Verify that ALL active tokens for this user (including tokenB) were revoked!
    const activeTokens = mockTokens.filter((t) => t.userId === 'usr-1' && !t.isRevoked);
    assert.equal(
      activeTokens.length,
      0,
      'All user refresh tokens must be revoked after replay detection',
    );
  });

  it('should logout and revoke the presented refresh token', async () => {
    const loginRes = await authService.login({
      email: 'admin@segacademy.com',
      password: 'CorrectPassword123!',
    });

    const token = loginRes.tokens.refreshToken;
    const tokenHash = passwordService.hashToken(token);

    const logoutRes = await authService.logout(token);
    assert.equal(logoutRes.success, true);

    const storedToken = mockTokens.find((t) => t.tokenHash === tokenHash);
    assert.equal(storedToken.isRevoked, true, 'Logout must revoke token');
  });

  describe('One-Time Founder / Super Admin Setup', () => {
    it('should report uninitialized setup status when no founder exists', async () => {
      mockUsers = [];
      const status = await authService.getSetupStatus();
      assert.equal(status.initialized, false);
      assert.match(status.message, /First-time Founder setup/i);
    });

    it('should successfully setup initial Founder account with Argon2id hash and tokens', async () => {
      mockUsers = [];
      const setupRes = await authService.setupFounder({
        fullName: 'Dr. Sarah Jenkins',
        email: 'founder@segacademy.com',
        password: 'SecureFounderPass123!',
      });

      assert.ok(setupRes.user);
      assert.equal(setupRes.user.email, 'founder@segacademy.com');
      assert.equal(setupRes.user.fullName, 'Dr. Sarah Jenkins');
      assert.equal(setupRes.user.role.code, 'FOUNDER_SUPER_ADMIN');
      assert.ok(setupRes.tokens.accessToken);
      assert.ok(setupRes.tokens.refreshToken);

      // Verify password was hashed using Argon2id
      const savedUser = mockUsers.find((u) => u.email === 'founder@segacademy.com');
      assert.ok(savedUser);
      assert.match(savedUser.passwordHash, /^\$argon2id\$/);

      // Verify status now reports initialized
      const status = await authService.getSetupStatus();
      assert.equal(status.initialized, true);
    });

    it('SECURITY: should strictly block subsequent attempts to create Founder account', async () => {
      await assert.rejects(
        async () =>
          authService.setupFounder({
            fullName: 'Intruder Impersonator',
            email: 'intruder@segacademy.com',
            password: 'IntruderPass123!',
          }),
        (err: any) =>
          err instanceof ForbiddenException &&
          err.message.includes('System initialization completed'),
      );
    });
  });

  describe('Authenticated Password Change', () => {
    it('should successfully change password when current password matches', async () => {
      const initialPassword = 'InitialSecret123!';
      const newPassword = 'BrandNewSecret456!';
      const hashedInitial = await passwordService.hashPassword(initialPassword);

      const testUser = {
        id: 'usr-pwd-test-1',
        email: 'pwdchange@segacademy.com',
        fullName: 'Password Change User',
        passwordHash: hashedInitial,
        status: 'ACTIVE',
        role: { id: 'role-founder', code: 'FOUNDER_SUPER_ADMIN', name: 'Founder' },
      };
      mockUsers.push(testUser);

      // Active refresh token session
      const currentToken = 'mock-refresh-token-val';
      const tokenHash = passwordService.hashToken(currentToken);
      mockTokens.push({
        id: 'token-active-1',
        userId: testUser.id,
        tokenHash,
        isRevoked: false,
      });

      const res = await authService.changePassword(
        testUser.id,
        initialPassword,
        newPassword,
        { currentRefreshToken: currentToken },
      );

      assert.equal(res.success, true);
      assert.match(res.message, /Password changed successfully/i);

      // Verify new password is valid with Argon2id and old password fails
      const updatedUser = mockUsers.find((u) => u.id === testUser.id);
      const isNewValid = await passwordService.verifyPassword(updatedUser.passwordHash, newPassword);
      assert.equal(isNewValid, true);

      const isOldValid = await passwordService.verifyPassword(updatedUser.passwordHash, initialPassword);
      assert.equal(isOldValid, false);
    });

    it('should reject password change when current password is incorrect', async () => {
      const testUser = mockUsers.find((u) => u.id === 'usr-pwd-test-1');
      assert.ok(testUser);

      await assert.rejects(
        async () =>
          authService.changePassword(
            testUser.id,
            'WrongCurrentPass123!',
            'ShouldNeverSetThis!',
          ),
        (err: any) =>
          err instanceof UnauthorizedException &&
          err.message.includes('Current password does not match'),
      );
    });

    it('should reject password change if user account is not active', async () => {
      const inactiveUser = {
        id: 'usr-inactive-pwd-1',
        email: 'inactive@segacademy.com',
        fullName: 'Inactive User',
        passwordHash: await passwordService.hashPassword('OldPass123!'),
        status: 'SUSPENDED',
      };
      mockUsers.push(inactiveUser);

      await assert.rejects(
        async () =>
          authService.changePassword(
            inactiveUser.id,
            'OldPass123!',
            'NewPassword123!',
          ),
        (err: any) =>
          err instanceof UnauthorizedException &&
          err.message.includes('Account is not active'),
      );
    });
  });
});
