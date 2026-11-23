import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PasswordResetService } from '../password-reset.service';
import { TokenStorageService } from '../token-storage.service';
import { PasswordService } from '../password.service';

describe('PasswordResetService & EmailVerification Unit Tests', () => {
  // Test user fixtures
  const existingUser = {
    id: 'usr-reset-1',
    email: 'alice@segacademy.com',
    fullName: 'Alice Developer',
    passwordHash: 'old_hashed_password',
    status: 'ACTIVE',
  };

  const invitedUser = {
    id: 'usr-invited-2',
    email: 'bob@segacademy.com',
    fullName: 'Bob Trainee',
    passwordHash: 'old_hashed_bob',
    status: 'INVITED',
  };

  const createMockContext = () => {
    let users = [{ ...existingUser }, { ...invitedUser }];
    let refreshTokens = [
      { id: 'rt-1', userId: 'usr-reset-1', isRevoked: false },
      { id: 'rt-2', userId: 'usr-reset-1', isRevoked: false },
      { id: 'rt-3', userId: 'usr-other', isRevoked: false },
    ];

    const prismaMock: any = {
      user: {
        findUnique: async (args: any) => {
          if (args.where.email) {
            return users.find((u) => u.email === args.where.email.toLowerCase()) || null;
          }
          if (args.where.id) {
            return users.find((u) => u.id === args.where.id) || null;
          }
          return null;
        },
        update: async (args: any) => {
          const idx = users.findIndex((u) => u.id === args.where.id);
          if (idx === -1) throw new Error('User not found');
          users[idx] = { ...users[idx], ...args.data };
          return users[idx];
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
      $transaction: async (cb: any) => cb(prismaMock),
      _getUsers: () => users,
      _getRefreshTokens: () => refreshTokens,
    };

    const sentEmails: any[] = [];
    let throwEmailError = false;
    const emailServiceMock: any = {
      sendMail: async (options: any) => {
        if (throwEmailError) {
          throw new Error('SMTP connection failed (Connection refused)');
        }
        sentEmails.push(options);
        return { messageId: 'test-mail-id', delivered: true };
      },
      renderPasswordResetEmail: (name: string, link: string, expiry: number) => ({
        text: `Reset link: ${link}`,
        html: `<p>Reset link: ${link}</p>`,
      }),
      renderEmailVerificationEmail: (name: string, link: string, expiry: number) => ({
        text: `Verify link: ${link}`,
        html: `<p>Verify link: ${link}</p>`,
      }),
      _setThrowError: (val: boolean) => {
        throwEmailError = val;
      },
      _getSentEmails: () => sentEmails,
    };

    const auditLogs: any[] = [];
    const auditServiceMock: any = {
      log: async (entry: any) => {
        auditLogs.push(entry);
      },
      _getLogs: () => auditLogs,
    };

    const configServiceMock: any = {
      get: (key: string) => {
        if (key === 'APP_URL') return 'https://crm.segacademy.com';
        if (key === 'PASSWORD_RESET_EXPIRES_MINUTES') return '15';
        if (key === 'EMAIL_VERIFICATION_EXPIRES_HOURS') return '24';
        return null;
      },
    };

    const passwordService = new PasswordService();
    const tokenStorage = new TokenStorageService();

    const service = new PasswordResetService(
      prismaMock,
      passwordService,
      emailServiceMock,
      tokenStorage,
      auditServiceMock,
      configServiceMock,
    );

    return {
      service,
      prismaMock,
      emailServiceMock,
      auditServiceMock,
      tokenStorage,
      passwordService,
    };
  };

  it('1. Forgot Password - Returns generic message for existing email and dispatches email', async () => {
    const ctx = createMockContext();
    const res = await ctx.service.forgotPassword({ email: 'alice@segacademy.com' });

    assert.equal(res.success, true);
    assert.match(res.message, /If an account with that email address exists/);

    const sent = ctx.emailServiceMock._getSentEmails();
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'alice@segacademy.com');
    assert.match(sent[0].text, /reset-password\?token=/);

    // Verify raw token is NOT in audit log
    const logs = ctx.auditServiceMock._getLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'PASSWORD_RESET_REQUESTED');
    assert.equal(logs[0].payload.token, undefined);
    assert.equal(logs[0].payload.tokenHash, undefined);
  });

  it('2. Forgot Password - Returns same generic message for non-existing email (anti-enumeration)', async () => {
    const ctx = createMockContext();
    const res = await ctx.service.forgotPassword({ email: 'nonexistent@segacademy.com' });

    assert.equal(res.success, true);
    assert.match(res.message, /If an account with that email address exists/);

    const sent = ctx.emailServiceMock._getSentEmails();
    assert.equal(sent.length, 0, 'No email should be sent for nonexistent account');
  });

  it('3. Forgot Password - Enforces 60-second cooldown rate limit', async () => {
    const ctx = createMockContext();
    // First request
    await ctx.service.forgotPassword({ email: 'alice@segacademy.com' });

    // Immediate second request
    await assert.rejects(
      async () => ctx.service.forgotPassword({ email: 'alice@segacademy.com' }),
      (err: any) => err instanceof HttpException && err.getStatus() === HttpStatus.TOO_MANY_REQUESTS,
    );
  });

  it('4. Forgot Password - Handles SMTP delivery failures gracefully', async () => {
    const ctx = createMockContext();
    ctx.emailServiceMock._setThrowError(true);

    await assert.rejects(
      async () => ctx.service.forgotPassword({ email: 'alice@segacademy.com' }),
      (err: any) => err instanceof HttpException && err.getStatus() === HttpStatus.BAD_GATEWAY,
    );
  });

  it('5. Reset Password - Successfully resets password with Argon2id and revokes all active sessions', async () => {
    const ctx = createMockContext();
    await ctx.service.forgotPassword({ email: 'alice@segacademy.com' });

    const sent = ctx.emailServiceMock._getSentEmails();
    const match = sent[0].text.match(/token=([a-f0-9]+)/);
    assert.ok(match, 'Token must be present in email link');
    const rawToken = match[1];

    const resetRes = await ctx.service.resetPassword({
      token: rawToken,
      newPassword: 'MyBrandNewPassword2026!',
    });

    assert.equal(resetRes.success, true);
    assert.match(resetRes.message, /Password has been reset successfully/);

    // Verify password was updated with Argon2id hash
    const updatedUser = ctx.prismaMock._getUsers().find((u: any) => u.id === 'usr-reset-1');
    assert.match(updatedUser.passwordHash, /^\$argon2id\$/);
    const isValid = await ctx.passwordService.verifyPassword(updatedUser.passwordHash, 'MyBrandNewPassword2026!');
    assert.equal(isValid, true);

    // Verify user sessions revoked
    const userTokens = ctx.prismaMock._getRefreshTokens().filter((rt: any) => rt.userId === 'usr-reset-1');
    assert.ok(userTokens.every((rt: any) => rt.isRevoked === true));

    // Verify other user's session was unaffected
    const otherTokens = ctx.prismaMock._getRefreshTokens().filter((rt: any) => rt.userId === 'usr-other');
    assert.equal(otherTokens[0].isRevoked, false);
  });

  it('6. Reset Password - Replay prevention: Token cannot be used a second time', async () => {
    const ctx = createMockContext();
    await ctx.service.forgotPassword({ email: 'alice@segacademy.com' });

    const sent = ctx.emailServiceMock._getSentEmails();
    const rawToken = sent[0].text.match(/token=([a-f0-9]+)/)[1];

    // First use
    await ctx.service.resetPassword({
      token: rawToken,
      newPassword: 'FirstNewPassword123!',
    });

    // Second use (replay)
    await assert.rejects(
      async () =>
        ctx.service.resetPassword({
          token: rawToken,
          newPassword: 'SecondNewPassword123!',
        }),
      (err: any) => err instanceof BadRequestException,
    );
  });

  it('7. Reset Password - Rejects invalid or expired token', async () => {
    const ctx = createMockContext();

    // Random non-existent token
    await assert.rejects(
      async () =>
        ctx.service.resetPassword({
          token: 'invalid-non-existent-hex-token-1234567890',
          newPassword: 'SomePassword123!',
        }),
      (err: any) => err instanceof BadRequestException,
    );

    // Expired token test
    const rawToken = 'expired-token-sample-123456';
    const tokenHash = ctx.tokenStorage.hashToken(rawToken);
    // Store token that expired 5 minutes ago (-5 mins)
    await ctx.tokenStorage.storeToken('usr-reset-1', tokenHash, 'PASSWORD_RESET', -5);

    await assert.rejects(
      async () =>
        ctx.service.resetPassword({
          token: rawToken,
          newPassword: 'SomePassword123!',
        }),
      (err: any) => err instanceof BadRequestException,
    );
  });

  it('8. Reset Password - Concurrent reset race condition test', async () => {
    const ctx = createMockContext();
    await ctx.service.forgotPassword({ email: 'alice@segacademy.com' });

    const rawToken = ctx.emailServiceMock._getSentEmails()[0].text.match(/token=([a-f0-9]+)/)[1];

    // Fire 2 concurrent reset attempts with same token
    const results = await Promise.allSettled([
      ctx.service.resetPassword({ token: rawToken, newPassword: 'WinnerPassword123!' }),
      ctx.service.resetPassword({ token: rawToken, newPassword: 'LoserPassword123!' }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'Exactly one concurrent request must succeed');
    assert.equal(rejected.length, 1, 'The duplicate concurrent request must be rejected');
  });

  it('9. Email Verification - Successfully verifies email and activates INVITED account', async () => {
    const ctx = createMockContext();
    await ctx.service.resendVerification({ email: 'bob@segacademy.com' });

    const sent = ctx.emailServiceMock._getSentEmails();
    assert.equal(sent.length, 1);
    const rawToken = sent[0].text.match(/token=([a-f0-9]+)/)[1];

    const verifyRes = await ctx.service.verifyEmail({ token: rawToken });
    assert.equal(verifyRes.success, true);
    assert.match(verifyRes.message, /verified successfully/);

    // Verify Bob status transitioned from INVITED to ACTIVE
    const bob = ctx.prismaMock._getUsers().find((u: any) => u.id === 'usr-invited-2');
    assert.equal(bob.status, 'ACTIVE');
    assert.equal(ctx.service.isEmailVerified('bob@segacademy.com'), true);
  });

  it('10. Email Verification - Prevent downgrade / redundant verification for already verified email', async () => {
    const ctx = createMockContext();
    await ctx.service.resendVerification({ email: 'bob@segacademy.com' });
    const rawToken = ctx.emailServiceMock._getSentEmails()[0].text.match(/token=([a-f0-9]+)/)[1];

    // Verify once
    await ctx.service.verifyEmail({ token: rawToken });

    // Clear rate limit to simulate subsequent request after cooldown
    ctx.tokenStorage.clearRateLimits();

    // Request verification for already verified email
    const resendRes = await ctx.service.resendVerification({ email: 'bob@segacademy.com' });
    assert.match(resendRes.message, /already verified/);
  });

  it('11. Email Verification - Enforces 60-second cooldown rate limit on resend', async () => {
    const ctx = createMockContext();
    await ctx.service.resendVerification({ email: 'alice@segacademy.com' });

    await assert.rejects(
      async () => ctx.service.resendVerification({ email: 'alice@segacademy.com' }),
      (err: any) => err instanceof HttpException && err.getStatus() === HttpStatus.TOO_MANY_REQUESTS,
    );
  });
});
