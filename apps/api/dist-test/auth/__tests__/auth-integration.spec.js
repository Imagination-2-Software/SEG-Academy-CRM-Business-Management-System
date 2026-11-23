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
const password_reset_service_1 = require("../password-reset.service");
const token_storage_service_1 = require("../token-storage.service");
const users_service_1 = require("../../users/users.service");
const jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
const permissions_guard_1 = require("../guards/permissions.guard");
(0, node_test_1.describe)('Part 4 Step 6 — End-to-End Authentication & Security Integration Tests', () => {
    const mockConfigService = {
        get: (key) => {
            if (key === 'JWT_SECRET')
                return 'test-super-secret-key-at-least-32-chars-long!';
            if (key === 'JWT_EXPIRES_IN')
                return '15m';
            if (key === 'JWT_REFRESH_SECRET')
                return 'test-refresh-secret-key-32-chars-min!';
            if (key === 'JWT_REFRESH_EXPIRES_IN')
                return '30d';
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
    const tokenService = new token_service_1.TokenService(mockConfigService);
    const tokenStorage = new token_storage_service_1.TokenStorageService();
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
    let users = [];
    let refreshTokens = [];
    let auditLogs = [];
    let dispatchedEmails = [];
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
    const prismaMock = {
        user: {
            findUnique: async (args) => {
                if (args.where.id)
                    return users.find((u) => u.id === args.where.id) || null;
                if (args.where.email)
                    return users.find((u) => u.email === args.where.email.toLowerCase()) || null;
                return null;
            },
            update: async (args) => {
                const idx = users.findIndex((u) => u.id === args.where.id);
                if (idx === -1)
                    throw new Error('User not found');
                const updatedRole = args.data.roleId
                    ? roles.find((r) => r.id === args.data.roleId)
                    : users[idx].role;
                users[idx] = { ...users[idx], ...args.data, role: updatedRole, updatedAt: new Date() };
                return users[idx];
            },
        },
        role: {
            findUnique: async (args) => {
                if (args.where.id)
                    return roles.find((r) => r.id === args.where.id) || null;
                if (args.where.code)
                    return roles.find((r) => r.code === args.where.code) || null;
                return null;
            },
        },
        refreshToken: {
            create: async (args) => {
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
            findUnique: async (args) => {
                const token = refreshTokens.find((rt) => rt.tokenHash === args.where.tokenHash);
                if (!token)
                    return null;
                const user = users.find((u) => u.id === token.userId);
                return {
                    ...token,
                    user: user ? { ...user } : null,
                };
            },
            update: async (args) => {
                const idx = refreshTokens.findIndex((rt) => rt.id === args.where.id);
                if (idx === -1)
                    throw new Error('Token not found');
                refreshTokens[idx] = { ...refreshTokens[idx], ...args.data };
                return refreshTokens[idx];
            },
            updateMany: async (args) => {
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
        $transaction: async (cb) => cb(prismaMock),
    };
    const emailServiceMock = {
        sendMail: async (opts) => {
            dispatchedEmails.push(opts);
            return { messageId: 'msg-id', delivered: true };
        },
        renderPasswordResetEmail: (name, link, expiry) => ({
            text: `Link: ${link}`,
            html: `<p>Link: ${link}</p>`,
        }),
        renderEmailVerificationEmail: (name, link, expiry) => ({
            text: `Link: ${link}`,
            html: `<p>Link: ${link}</p>`,
        }),
    };
    const auditServiceMock = {
        log: async (entry) => {
            auditLogs.push(entry);
        },
    };
    const authService = new auth_service_1.AuthService(prismaMock, passwordService, tokenService);
    const passwordResetService = new password_reset_service_1.PasswordResetService(prismaMock, passwordService, emailServiceMock, tokenStorage, auditServiceMock, mockConfigService);
    const usersService = new users_service_1.UsersService(prismaMock, passwordService, auditServiceMock);
    const createMockContext = (req, metadata = {}) => {
        const reflector = {
            getAllAndOverride: (key) => {
                if (key === 'isPublic')
                    return metadata.isPublic;
                if (key === 'roles')
                    return metadata.roles;
                if (key === 'permissions')
                    return metadata.permissions;
                return null;
            },
        };
        const context = {
            getHandler: () => ({}),
            getClass: () => ({}),
            switchToHttp: () => ({
                getRequest: () => req,
                getResponse: () => ({}),
            }),
        };
        return { context, reflector };
    };
    (0, node_test_1.it)('1. Login → Access Token Issuance → Authenticated Request via JwtAuthGuard', async () => {
        await resetDb();
        const loginResult = await authService.login({
            email: 'admin@segacademy.com',
            password: 'StandardPassword123!',
        });
        assert.ok(loginResult.tokens.accessToken);
        assert.ok(loginResult.tokens.refreshToken);
        assert.equal(loginResult.user.email, 'admin@segacademy.com');
        const req = {
            headers: { authorization: `Bearer ${loginResult.tokens.accessToken}` },
        };
        const { context, reflector } = createMockContext(req);
        const guard = new jwt_auth_guard_1.JwtAuthGuard(reflector, tokenService, prismaMock);
        const allowed = await guard.canActivate(context);
        assert.equal(allowed, true);
        assert.ok(req.user, 'JwtAuthGuard must populate request.user context');
        assert.equal(req.user.userId, 'usr-admin-id');
        assert.deepEqual(req.user.roles, ['ADMIN']);
        assert.ok(req.user.permissions.includes('users:read'));
    });
    (0, node_test_1.it)('2. Login → Refresh Token Rotation → Old Refresh Token Replay Detection', async () => {
        await resetDb();
        const loginRes = await authService.login({
            email: 'admin@segacademy.com',
            password: 'StandardPassword123!',
        });
        const oldRefreshToken = loginRes.tokens.refreshToken;
        const rotateRes = await authService.refreshTokens(oldRefreshToken);
        assert.ok(rotateRes.accessToken);
        assert.ok(rotateRes.refreshToken);
        assert.notEqual(rotateRes.refreshToken, oldRefreshToken);
        await assert.rejects(async () => authService.refreshTokens(oldRefreshToken), (err) => err instanceof common_1.ForbiddenException);
        const userTokens = refreshTokens.filter((rt) => rt.userId === 'usr-admin-id');
        assert.ok(userTokens.length >= 2);
        assert.ok(userTokens.every((rt) => rt.isRevoked === true));
    });
    (0, node_test_1.it)('3. Login → Logout → Session Invalidation', async () => {
        await resetDb();
        const loginRes = await authService.login({
            email: 'intern@segacademy.com',
            password: 'StandardPassword123!',
        });
        const logoutRes = await authService.logout(loginRes.tokens.refreshToken);
        assert.equal(logoutRes.success, true);
        await assert.rejects(async () => authService.refreshTokens(loginRes.tokens.refreshToken), (err) => err instanceof common_1.ForbiddenException);
    });
    (0, node_test_1.it)('4. Password Reset Flow → Old Refresh-Token Sessions Revoked', async () => {
        await resetDb();
        const loginRes = await authService.login({
            email: 'intern@segacademy.com',
            password: 'StandardPassword123!',
        });
        await passwordResetService.forgotPassword({ email: 'intern@segacademy.com' });
        assert.equal(dispatchedEmails.length, 1);
        const rawToken = dispatchedEmails[0].text.match(/token=([a-f0-9]+)/)[1];
        const resetRes = await passwordResetService.resetPassword({
            token: rawToken,
            newPassword: 'BrandNewStrongPassword123!',
        });
        assert.equal(resetRes.success, true);
        await assert.rejects(async () => authService.login({
            email: 'intern@segacademy.com',
            password: 'StandardPassword123!',
        }), (err) => err instanceof common_1.UnauthorizedException);
        const newLoginRes = await authService.login({
            email: 'intern@segacademy.com',
            password: 'BrandNewStrongPassword123!',
        });
        assert.ok(newLoginRes.tokens.accessToken);
        await assert.rejects(async () => authService.refreshTokens(loginRes.tokens.refreshToken), (err) => err instanceof common_1.ForbiddenException);
    });
    (0, node_test_1.it)('5. Role Reassignment Flow → Active Sessions Immediately Revoked in Transaction', async () => {
        await resetDb();
        const internLogin = await authService.login({
            email: 'intern@segacademy.com',
            password: 'StandardPassword123!',
        });
        const founderActor = {
            userId: 'usr-founder-id',
            email: 'founder@segacademy.com',
            fullName: 'Founder',
            role: { id: 'role-founder', code: 'FOUNDER_SUPER_ADMIN', name: 'Founder' },
            roles: ['FOUNDER_SUPER_ADMIN'],
            permissions: ['*:*'],
        };
        await usersService.replaceUserRoles('usr-intern-id', { roleIds: ['role-admin'] }, founderActor);
        await assert.rejects(async () => authService.refreshTokens(internLogin.tokens.refreshToken), (err) => err instanceof common_1.ForbiddenException);
    });
    (0, node_test_1.it)('6. Inactive & Suspended Users → Access Denied in JwtAuthGuard', async () => {
        await resetDb();
        const suspendedToken = tokenService.signAccessToken({
            sub: 'usr-suspended-id',
            email: 'suspended@segacademy.com',
            fullName: 'Suspended Staff',
            roleCode: 'EMPLOYEE_INTERN',
        });
        const reqSuspended = {
            headers: { authorization: `Bearer ${suspendedToken}` },
        };
        const { context: ctxSuspended, reflector: refSuspended } = createMockContext(reqSuspended);
        const guard = new jwt_auth_guard_1.JwtAuthGuard(refSuspended, tokenService, prismaMock);
        await assert.rejects(async () => guard.canActivate(ctxSuspended), (err) => err instanceof common_1.UnauthorizedException && err.message.includes('inactive or suspended'));
        const inactiveToken = tokenService.signAccessToken({
            sub: 'usr-inactive-id',
            email: 'inactive@segacademy.com',
            fullName: 'Inactive Staff',
            roleCode: 'EMPLOYEE_INTERN',
        });
        const reqInactive = {
            headers: { authorization: `Bearer ${inactiveToken}` },
        };
        const { context: ctxInactive, reflector: refInactive } = createMockContext(reqInactive);
        await assert.rejects(async () => guard.canActivate(ctxInactive), (err) => err instanceof common_1.UnauthorizedException && err.message.includes('inactive or suspended'));
    });
    (0, node_test_1.it)('7. Public Endpoint Bypass & Protected Endpoint Rejection', async () => {
        await resetDb();
        const reqPublic = { headers: {} };
        const { context: ctxPublic, reflector: refPublic } = createMockContext(reqPublic, {
            isPublic: true,
        });
        const guard = new jwt_auth_guard_1.JwtAuthGuard(refPublic, tokenService, prismaMock);
        const allowed = await guard.canActivate(ctxPublic);
        assert.equal(allowed, true);
        const reqProtected = { headers: {} };
        const { context: ctxProtected, reflector: refProtected } = createMockContext(reqProtected, {
            isPublic: false,
        });
        const protectedGuard = new jwt_auth_guard_1.JwtAuthGuard(refProtected, tokenService, prismaMock);
        await assert.rejects(async () => protectedGuard.canActivate(ctxProtected), (err) => err instanceof common_1.UnauthorizedException && err.message.includes('Missing Authorization header'));
    });
    (0, node_test_1.it)('8. Insufficient Permissions Guard (HTTP 403) & Superuser Bypass', async () => {
        await resetDb();
        const reqIntern = {
            user: {
                userId: 'usr-intern-id',
                email: 'intern@segacademy.com',
                fullName: 'Intern',
                role: { id: 'role-intern', code: 'EMPLOYEE_INTERN', name: 'Intern' },
                roles: ['EMPLOYEE_INTERN'],
                permissions: ['users:read'],
            },
        };
        const { context: ctxPerm, reflector: refPerm } = createMockContext(reqIntern, {
            permissions: [{ resource: 'users', action: 'manage_roles' }],
        });
        const permGuard = new permissions_guard_1.PermissionsGuard(refPerm);
        assert.throws(() => permGuard.canActivate(ctxPerm), (err) => err instanceof common_1.ForbiddenException);
        const reqFounder = {
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
});
//# sourceMappingURL=auth-integration.spec.js.map