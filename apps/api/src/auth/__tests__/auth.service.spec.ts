import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PasswordService } from '../password.service';
import { TokenService } from '../token.service';
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

  const mockPrisma = {
    user: {
      findUnique: async ({ where }: any) => {
        return mockUsers.find((u) => u.email === where.email) || null;
      },
      update: async ({ where, data }: any) => {
        const user = mockUsers.find((u) => u.id === where.id);
        if (user) Object.assign(user, data);
        return user;
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
  } as unknown as PrismaService;

  const authService = new AuthService(mockPrisma, passwordService, tokenService);

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
});
