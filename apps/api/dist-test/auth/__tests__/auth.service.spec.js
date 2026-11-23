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
const auth_service_1 = require("../auth.service");
const password_service_1 = require("../password.service");
const token_service_1 = require("../token.service");
(0, node_test_1.describe)('AuthService Rotation & Revocation Unit Tests', () => {
    const passwordService = new password_service_1.PasswordService();
    const mockConfigService = {
        get: (key) => {
            if (key === 'JWT_SECRET')
                return 'test-super-secret-key-at-least-32-chars-long!';
            if (key === 'JWT_EXPIRES_IN')
                return '15m';
            if (key === 'JWT_REFRESH_EXPIRES_IN')
                return '30d';
            return null;
        },
    };
    const tokenService = new token_service_1.TokenService(mockConfigService);
    let mockUsers = [];
    let mockTokens = [];
    const mockPrisma = {
        user: {
            findUnique: async ({ where }) => {
                return mockUsers.find((u) => u.email === where.email) || null;
            },
            update: async ({ where, data }) => {
                const user = mockUsers.find((u) => u.id === where.id);
                if (user)
                    Object.assign(user, data);
                return user;
            },
        },
        refreshToken: {
            create: async ({ data }) => {
                const record = { id: `token-${mockTokens.length + 1}`, isRevoked: false, ...data };
                mockTokens.push(record);
                return record;
            },
            findUnique: async ({ where }) => {
                const token = mockTokens.find((t) => t.tokenHash === where.tokenHash);
                if (!token)
                    return null;
                const user = mockUsers.find((u) => u.id === token.userId);
                return { ...token, user };
            },
            update: async ({ where, data }) => {
                const token = mockTokens.find((t) => t.id === where.id);
                if (token)
                    Object.assign(token, data);
                return token;
            },
            updateMany: async ({ where, data }) => {
                let count = 0;
                mockTokens.forEach((t) => {
                    let match = true;
                    if (where.userId && t.userId !== where.userId)
                        match = false;
                    if (where.tokenHash && t.tokenHash !== where.tokenHash)
                        match = false;
                    if (where.isRevoked !== undefined && t.isRevoked !== where.isRevoked)
                        match = false;
                    if (match) {
                        Object.assign(t, data);
                        count++;
                    }
                });
                return { count };
            },
        },
    };
    const authService = new auth_service_1.AuthService(mockPrisma, passwordService, tokenService);
    (0, node_test_1.it)('should authenticate valid credentials and issue tokens', async () => {
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
        assert.equal(mockTokens.length, 1);
        assert.notEqual(mockTokens[0].tokenHash, res.tokens.refreshToken);
        assert.equal(mockTokens[0].tokenHash, passwordService.hashToken(res.tokens.refreshToken));
    });
    (0, node_test_1.it)('should reject invalid credentials with generic message', async () => {
        await assert.rejects(async () => authService.login({
            email: 'admin@segacademy.com',
            password: 'WrongPassword!',
        }), (err) => err instanceof common_1.UnauthorizedException && err.message === 'Invalid email or password.');
    });
    (0, node_test_1.it)('should rotate refresh token and revoke the previous token', async () => {
        const loginRes = await authService.login({
            email: 'admin@segacademy.com',
            password: 'CorrectPassword123!',
        });
        const oldToken = loginRes.tokens.refreshToken;
        const oldHash = passwordService.hashToken(oldToken);
        const refreshed = await authService.refreshTokens(oldToken);
        assert.ok(refreshed.accessToken);
        assert.ok(refreshed.refreshToken);
        assert.notEqual(refreshed.refreshToken, oldToken, 'New token must differ from old token');
        const storedOld = mockTokens.find((t) => t.tokenHash === oldHash);
        assert.equal(storedOld.isRevoked, true, 'Old token must be marked isRevoked = true');
        const newHash = passwordService.hashToken(refreshed.refreshToken);
        const storedNew = mockTokens.find((t) => t.tokenHash === newHash);
        assert.ok(storedNew);
        assert.equal(storedNew.isRevoked, false, 'New token must be active');
    });
    (0, node_test_1.it)('SECURITY REPLAY ATTACK: Reusing an already-revoked refresh token must revoke ALL user tokens and throw ForbiddenException', async () => {
        const loginRes = await authService.login({
            email: 'admin@segacademy.com',
            password: 'CorrectPassword123!',
        });
        const tokenA = loginRes.tokens.refreshToken;
        const rotated = await authService.refreshTokens(tokenA);
        const tokenB = rotated.refreshToken;
        await assert.rejects(async () => authService.refreshTokens(tokenA), (err) => err instanceof common_1.ForbiddenException &&
            err.message.includes('Suspicious session activity detected'));
        const activeTokens = mockTokens.filter((t) => t.userId === 'usr-1' && !t.isRevoked);
        assert.equal(activeTokens.length, 0, 'All user refresh tokens must be revoked after replay detection');
    });
    (0, node_test_1.it)('should logout and revoke the presented refresh token', async () => {
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
//# sourceMappingURL=auth.service.spec.js.map