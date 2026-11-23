"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert/strict"));
const common_1 = require("@nestjs/common");
const password_reset_service_1 = require("../password-reset.service");
const token_storage_service_1 = require("../token-storage.service");
const password_service_1 = require("../password.service");
(0, node_test_1.describe)('PasswordResetService & EmailVerification Unit Tests', () => {
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
        const prismaMock = {
            user: {
                findUnique: async (args) => {
                    if (args.where.email) {
                        return users.find((u) => u.email === args.where.email.toLowerCase()) || null;
                    }
                    if (args.where.id) {
                        return users.find((u) => u.id === args.where.id) || null;
                    }
                    return null;
                },
                update: async (args) => {
                    const idx = users.findIndex((u) => u.id === args.where.id);
                    if (idx === -1)
                        throw new Error('User not found');
                    users[idx] = { ...users[idx], ...args.data };
                    return users[idx];
                },
            },
            refreshToken: {
                updateMany: async (args) => {
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
            $transaction: async (cb) => cb(prismaMock),
            _getUsers: () => users,
            _getRefreshTokens: () => refreshTokens,
        };
        const sentEmails = [];
        let throwEmailError = false;
        const emailServiceMock = {
            sendMail: async (options) => {
                if (throwEmailError) {
                    throw new Error('SMTP connection failed (Connection refused)');
                }
                sentEmails.push(options);
                return { messageId: 'test-mail-id', delivered: true };
            },
            renderPasswordResetEmail: (name, link, expiry) => ({
                text: `Reset link: ${link}`,
                html: `<p>Reset link: ${link}</p>`,
            }),
            renderEmailVerificationEmail: (name, link, expiry) => ({
                text: `Verify link: ${link}`,
                html: `<p>Verify link: ${link}</p>`,
            }),
            _setThrowError: (val) => {
                throwEmailError = val;
            },
            _getSentEmails: () => sentEmails,
        };
        const auditLogs = [];
        const auditServiceMock = {
            log: async (entry) => {
                auditLogs.push(entry);
            },
            _getLogs: () => auditLogs,
        };
        const configServiceMock = {
            get: (key) => {
                if (key === 'APP_URL')
                    return 'https://crm.segacademy.com';
                if (key === 'PASSWORD_RESET_EXPIRES_MINUTES')
                    return '15';
                if (key === 'EMAIL_VERIFICATION_EXPIRES_HOURS')
                    return '24';
                return null;
            },
        };
        const passwordService = new password_service_1.PasswordService();
        const tokenStorage = new token_storage_service_1.TokenStorageService();
        const service = new password_reset_service_1.PasswordResetService(prismaMock, passwordService, emailServiceMock, tokenStorage, auditServiceMock, configServiceMock);
        return {
            service,
            prismaMock,
            emailServiceMock,
            auditServiceMock,
            tokenStorage,
            passwordService,
        };
    };
    (0, node_test_1.it)('1. Forgot Password - Returns generic message for existing email and dispatches email', async () => {
        const ctx = createMockContext();
        const res = await ctx.service.forgotPassword({ email: 'alice@segacademy.com' });
        assert.equal(res.success, true);
        assert.match(res.message, /If an account with that email address exists/);
        const sent = ctx.emailServiceMock._getSentEmails();
        assert.equal(sent.length, 1);
        assert.equal(sent[0].to, 'alice@segacademy.com');
        assert.match(sent[0].text, /reset-password\?token=/);
        const logs = ctx.auditServiceMock._getLogs();
        assert.equal(logs.length, 1);
        assert.equal(logs[0].action, 'PASSWORD_RESET_REQUESTED');
        assert.equal(logs[0].payload.token, undefined);
        assert.equal(logs[0].payload.tokenHash, undefined);
    });
    (0, node_test_1.it)('2. Forgot Password - Returns same generic message for non-existing email (anti-enumeration)', async () => {
        const ctx = createMockContext();
        const res = await ctx.service.forgotPassword({ email: 'nonexistent@segacademy.com' });
        assert.equal(res.success, true);
        assert.match(res.message, /If an account with that email address exists/);
        const sent = ctx.emailServiceMock._getSentEmails();
        assert.equal(sent.length, 0, 'No email should be sent for nonexistent account');
    });
    (0, node_test_1.it)('3. Forgot Password - Enforces 60-second cooldown rate limit', async () => {
        const ctx = createMockContext();
        await ctx.service.forgotPassword({ email: 'alice@segacademy.com' });
        await assert.rejects(async () => ctx.service.forgotPassword({ email: 'alice@segacademy.com' }), (err) => err instanceof common_1.HttpException && err.getStatus() === common_1.HttpStatus.TOO_MANY_REQUESTS);
    });
    (0, node_test_1.it)('4. Forgot Password - Handles SMTP delivery failures gracefully', async () => {
        const ctx = createMockContext();
        ctx.emailServiceMock._setThrowError(true);
        await assert.rejects(async () => ctx.service.forgotPassword({ email: 'alice@segacademy.com' }), (err) => err instanceof common_1.HttpException && err.getStatus() === common_1.HttpStatus.BAD_GATEWAY);
    });
    (0, node_test_1.it)('5. Reset Password - Successfully resets password with Argon2id and revokes all active sessions', async () => {
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
        const updatedUser = ctx.prismaMock._getUsers().find((u) => u.id === 'usr-reset-1');
        assert.match(updatedUser.passwordHash, /^\$argon2id\$/);
        const isValid = await ctx.passwordService.verifyPassword(updatedUser.passwordHash, 'MyBrandNewPassword2026!');
        assert.equal(isValid, true);
        const userTokens = ctx.prismaMock._getRefreshTokens().filter((rt) => rt.userId === 'usr-reset-1');
        assert.ok(userTokens.every((rt) => rt.isRevoked === true));
        const otherTokens = ctx.prismaMock._getRefreshTokens().filter((rt) => rt.userId === 'usr-other');
        assert.equal(otherTokens[0].isRevoked, false);
    });
    (0, node_test_1.it)('6. Reset Password - Replay prevention: Token cannot be used a second time', async () => {
        const ctx = createMockContext();
        await ctx.service.forgotPassword({ email: 'alice@segacademy.com' });
        const sent = ctx.emailServiceMock._getSentEmails();
        const rawToken = sent[0].text.match(/token=([a-f0-9]+)/)[1];
        await ctx.service.resetPassword({
            token: rawToken,
            newPassword: 'FirstNewPassword123!',
        });
        await assert.rejects(async () => ctx.service.resetPassword({
            token: rawToken,
            newPassword: 'SecondNewPassword123!',
        }), (err) => err instanceof common_1.BadRequestException);
    });
    (0, node_test_1.it)('7. Reset Password - Rejects invalid or expired token', async () => {
        const ctx = createMockContext();
        await assert.rejects(async () => ctx.service.resetPassword({
            token: 'invalid-non-existent-hex-token-1234567890',
            newPassword: 'SomePassword123!',
        }), (err) => err instanceof common_1.BadRequestException);
        const rawToken = 'expired-token-sample-123456';
        const tokenHash = ctx.tokenStorage.hashToken(rawToken);
        await ctx.tokenStorage.storeToken('usr-reset-1', tokenHash, 'PASSWORD_RESET', -5);
        await assert.rejects(async () => ctx.service.resetPassword({
            token: rawToken,
            newPassword: 'SomePassword123!',
        }), (err) => err instanceof common_1.BadRequestException);
    });
    (0, node_test_1.it)('8. Reset Password - Concurrent reset race condition test', async () => {
        const ctx = createMockContext();
        await ctx.service.forgotPassword({ email: 'alice@segacademy.com' });
        const rawToken = ctx.emailServiceMock._getSentEmails()[0].text.match(/token=([a-f0-9]+)/)[1];
        const results = await Promise.allSettled([
            ctx.service.resetPassword({ token: rawToken, newPassword: 'WinnerPassword123!' }),
            ctx.service.resetPassword({ token: rawToken, newPassword: 'LoserPassword123!' }),
        ]);
        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');
        assert.equal(fulfilled.length, 1, 'Exactly one concurrent request must succeed');
        assert.equal(rejected.length, 1, 'The duplicate concurrent request must be rejected');
    });
    (0, node_test_1.it)('9. Email Verification - Successfully verifies email and activates INVITED account', async () => {
        const ctx = createMockContext();
        await ctx.service.resendVerification({ email: 'bob@segacademy.com' });
        const sent = ctx.emailServiceMock._getSentEmails();
        assert.equal(sent.length, 1);
        const rawToken = sent[0].text.match(/token=([a-f0-9]+)/)[1];
        const verifyRes = await ctx.service.verifyEmail({ token: rawToken });
        assert.equal(verifyRes.success, true);
        assert.match(verifyRes.message, /verified successfully/);
        const bob = ctx.prismaMock._getUsers().find((u) => u.id === 'usr-invited-2');
        assert.equal(bob.status, 'ACTIVE');
        assert.equal(ctx.service.isEmailVerified('bob@segacademy.com'), true);
    });
    (0, node_test_1.it)('10. Email Verification - Prevent downgrade / redundant verification for already verified email', async () => {
        const ctx = createMockContext();
        await ctx.service.resendVerification({ email: 'bob@segacademy.com' });
        const rawToken = ctx.emailServiceMock._getSentEmails()[0].text.match(/token=([a-f0-9]+)/)[1];
        await ctx.service.verifyEmail({ token: rawToken });
        ctx.tokenStorage.clearRateLimits();
        const resendRes = await ctx.service.resendVerification({ email: 'bob@segacademy.com' });
        assert.match(resendRes.message, /already verified/);
    });
    (0, node_test_1.it)('11. Email Verification - Enforces 60-second cooldown rate limit on resend', async () => {
        const ctx = createMockContext();
        await ctx.service.resendVerification({ email: 'alice@segacademy.com' });
        await assert.rejects(async () => ctx.service.resendVerification({ email: 'alice@segacademy.com' }), (err) => err instanceof common_1.HttpException && err.getStatus() === common_1.HttpStatus.TOO_MANY_REQUESTS);
    });
});
//# sourceMappingURL=password-reset.spec.js.map