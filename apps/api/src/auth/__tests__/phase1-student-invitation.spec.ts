import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { AuthService } from '../auth.service';
import { PasswordService } from '../password.service';
import { TokenService } from '../token.service';
import { TokenStorageService } from '../token-storage.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('Phase 1 - Student Invitation & Activation Flow Unit Tests', () => {
  let authService: AuthService;
  let tokenStorage: TokenStorageService;
  let mockPrisma: any;

  const mockAudit = {
    log: async () => {},
  };

  const mockConfigService = {
    get: (key: string) => {
      if (key === 'JWT_SECRET') return 'test-super-secret-key-at-least-32-chars-long!';
      if (key === 'JWT_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
      return null;
    },
  };

  tokenStorage = new TokenStorageService();
  const passwordService = new PasswordService();
  const tokenService = new TokenService(mockConfigService as any);

  mockPrisma = {
    profileStudent: {
      findUnique: async ({ where }: any) => {
        if (where.id === 'stu-01' || where.email === 'active.student@example.com') {
          return { id: 'stu-01', email: 'active.student@example.com', studentCode: 'STU-001' };
        }
        if (where.id === 'stu-02' || where.email === 'new.student@example.com') {
          return {
            id: 'stu-02',
            email: 'new.student@example.com',
            studentCode: 'STU-002',
            fullName: 'New Student',
            phoneNumber: '+91 99999 88888',
          };
        }
        if (where.id === 'stu-03' || where.email === 'invited.student@example.com') {
          return {
            id: 'stu-03',
            email: 'invited.student@example.com',
            studentCode: 'STU-003',
            fullName: 'Invited Student',
          };
        }
        return null;
      },
    },
    user: {
      findUnique: async ({ where }: any) => {
        if (where.email === 'active.student@example.com') {
          return {
            id: 'user-01',
            email: 'active.student@example.com',
            status: 'ACTIVE',
            role: { code: 'STUDENT' },
          };
        }
        return null;
      },
      create: async ({ data }: any) => ({
        id: 'usr-new-id',
        ...data,
      }),
      update: async ({ where, data }: any) => ({
        id: where.id,
        email: 'invited.student@example.com',
        fullName: 'Invited Student',
        status: data.status || 'ACTIVE',
        role: { id: 'role-stu', code: 'STUDENT', name: 'Student' },
      }),
    },
    role: {
      findUnique: async () => ({ id: 'role-stu', code: 'STUDENT' }),
      create: async ({ data }: any) => ({ id: 'role-stu', ...data }),
    },
    refreshToken: {
      create: async () => {},
    },
  };

  authService = new AuthService(
    mockPrisma,
    passwordService,
    tokenService,
    mockAudit as any,
    tokenStorage,
  );

  it('1. Throws ConflictException if student profile does not exist', async () => {
    await assert.rejects(
      async () => {
        await authService.inviteStudent(
          { studentId: 'non-existent-student' },
          { userId: 'admin-1', roleCode: 'ADMIN' },
        );
      },
      (err: any) => err instanceof ConflictException,
    );
  });

  it('2. Prevents duplicate active student accounts', async () => {
    await assert.rejects(
      async () => {
        await authService.inviteStudent(
          { studentId: 'stu-01' },
          { userId: 'admin-1', roleCode: 'ADMIN' },
        );
      },
      (err: any) => err instanceof ConflictException,
    );
  });

  it('3. Generates cryptographic single-use invitation token for unactivated student', async () => {
    const result = await authService.inviteStudent(
      { studentId: 'stu-02' },
      { userId: 'admin-1', roleCode: 'ADMIN' },
    );

    assert.equal(result.success, true);
    assert.ok(result.invitationToken);
    assert.ok(result.invitationToken!.length >= 32);
  });

  it('4. Rejects activation with invalid or non-existent token', async () => {
    await assert.rejects(
      async () => {
        await authService.activateStudent({
          token: 'invalid-or-fake-token',
          password: 'ValidPassword123!',
        });
      },
      (err: any) => err instanceof UnauthorizedException,
    );
  });

  it('5. Successfully activates student account and enforces single-use token consumption', async () => {
    const inviteResult = await authService.inviteStudent(
      { studentId: 'stu-03' },
      { userId: 'admin-1', roleCode: 'ADMIN' },
    );
    const rawToken = inviteResult.invitationToken!;

    // First activation attempt: Success
    const activation = await authService.activateStudent({
      token: rawToken,
      password: 'EstablishedSecretPass1!',
    });

    assert.equal(activation.user.email, 'invited.student@example.com');
    assert.equal(activation.user.studentId, 'stu-03');
    assert.ok(activation.tokens.accessToken);

    // Second activation attempt with identical token: Must be rejected (Single-Use Invariant)
    await assert.rejects(
      async () => {
        await authService.activateStudent({
          token: rawToken,
          password: 'EstablishedSecretPass1!',
        });
      },
      (err: any) => err instanceof UnauthorizedException,
    );
  });
});
