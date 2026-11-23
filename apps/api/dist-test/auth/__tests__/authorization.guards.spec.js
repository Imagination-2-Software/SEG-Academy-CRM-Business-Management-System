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
const jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
const roles_guard_1 = require("../guards/roles.guard");
const permissions_guard_1 = require("../guards/permissions.guard");
const token_service_1 = require("../token.service");
(0, node_test_1.describe)('Authorization Guards Comprehensive Unit Tests', () => {
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
    const mockDbUsers = {
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
            findUnique: async ({ where }) => {
                return mockDbUsers[where.id] || null;
            },
        },
    };
    function createMockContext(authHeader, metadata = {}) {
        const request = {
            headers: {
                authorization: authHeader,
            },
            user: undefined,
        };
        const reflector = {
            getAllAndOverride: (key) => {
                if (key === 'isPublic')
                    return metadata.isPublic ?? false;
                if (key === 'roles')
                    return metadata.roles ?? null;
                if (key === 'permissions')
                    return metadata.permissions ?? null;
                return null;
            },
        };
        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
            getHandler: () => ({}),
            getClass: () => ({}),
        };
        return { context, request };
    }
    (0, node_test_1.describe)('JwtAuthGuard', () => {
        (0, node_test_1.it)('should allow access to public endpoints without Authorization header', async () => {
            const { context } = createMockContext(undefined, { isPublic: true });
            const reflector = { getAllAndOverride: () => true };
            const guard = new jwt_auth_guard_1.JwtAuthGuard(reflector, tokenService, mockPrisma);
            const canActivate = await guard.canActivate(context);
            assert.equal(canActivate, true);
        });
        (0, node_test_1.it)('should reject request when Authorization header is missing on protected endpoint (HTTP 401)', async () => {
            const { context } = createMockContext(undefined, { isPublic: false });
            const reflector = { getAllAndOverride: () => false };
            const guard = new jwt_auth_guard_1.JwtAuthGuard(reflector, tokenService, mockPrisma);
            await assert.rejects(async () => guard.canActivate(context), (err) => err instanceof common_1.UnauthorizedException && err.message === 'Missing Authorization header.');
        });
        (0, node_test_1.it)('should reject malformed Authorization headers (HTTP 401)', async () => {
            const { context } = createMockContext('Basic xyz123', { isPublic: false });
            const reflector = { getAllAndOverride: () => false };
            const guard = new jwt_auth_guard_1.JwtAuthGuard(reflector, tokenService, mockPrisma);
            await assert.rejects(async () => guard.canActivate(context), (err) => err instanceof common_1.UnauthorizedException &&
                err.message.includes('Invalid Authorization format'));
        });
        (0, node_test_1.it)('should reject tampered or invalid JWT signature (HTTP 401)', async () => {
            const token = tokenService.signAccessToken({
                sub: 'usr-admin',
                email: 'admin@segacademy.com',
                roleCode: 'ADMIN',
                fullName: 'Admin',
            });
            const tampered = token.slice(0, -5) + 'AAAAA';
            const { context } = createMockContext(`Bearer ${tampered}`, { isPublic: false });
            const reflector = { getAllAndOverride: () => false };
            const guard = new jwt_auth_guard_1.JwtAuthGuard(reflector, tokenService, mockPrisma);
            await assert.rejects(async () => guard.canActivate(context), (err) => err instanceof common_1.UnauthorizedException);
        });
        (0, node_test_1.it)('should reject expired JWT token (HTTP 401)', async () => {
            const expiredConfig = {
                get: (k) => (k === 'JWT_SECRET' ? 'test-super-secret-key-at-least-32-chars-long!' : '0s'),
            };
            const expiredTokenService = new token_service_1.TokenService(expiredConfig);
            const expiredToken = expiredTokenService.signAccessToken({
                sub: 'usr-admin',
                email: 'admin@segacademy.com',
                roleCode: 'ADMIN',
                fullName: 'Admin',
            });
            await new Promise((r) => setTimeout(r, 100));
            const { context } = createMockContext(`Bearer ${expiredToken}`, { isPublic: false });
            const reflector = { getAllAndOverride: () => false };
            const guard = new jwt_auth_guard_1.JwtAuthGuard(reflector, tokenService, mockPrisma);
            await assert.rejects(async () => guard.canActivate(context), (err) => err instanceof common_1.UnauthorizedException && err.message.includes('expired'));
        });
        (0, node_test_1.it)('should reject suspended/inactive user even with a valid JWT (HTTP 401)', async () => {
            const token = tokenService.signAccessToken({
                sub: 'usr-suspended',
                email: 'bad@segacademy.com',
                roleCode: 'FINANCE_MANAGER',
                fullName: 'Suspended',
            });
            const { context } = createMockContext(`Bearer ${token}`, { isPublic: false });
            const reflector = { getAllAndOverride: () => false };
            const guard = new jwt_auth_guard_1.JwtAuthGuard(reflector, tokenService, mockPrisma);
            await assert.rejects(async () => guard.canActivate(context), (err) => err instanceof common_1.UnauthorizedException && err.message.includes('inactive or suspended'));
        });
        (0, node_test_1.it)('should successfully authenticate valid user and populate typed request.user context', async () => {
            const token = tokenService.signAccessToken({
                sub: 'usr-admin',
                email: 'admin@segacademy.com',
                roleCode: 'ADMIN',
                fullName: 'System Admin',
            });
            const { context, request } = createMockContext(`Bearer ${token}`, { isPublic: false });
            const reflector = { getAllAndOverride: () => false };
            const guard = new jwt_auth_guard_1.JwtAuthGuard(reflector, tokenService, mockPrisma);
            const canActivate = await guard.canActivate(context);
            assert.equal(canActivate, true);
            assert.equal(request.user.userId, 'usr-admin');
            assert.equal(request.user.email, 'admin@segacademy.com');
            assert.deepEqual(request.user.roles, ['ADMIN']);
            assert.ok(request.user.permissions.includes('students:read'));
            assert.ok(request.user.permissions.includes('invoices:approve'));
            assert.equal(request.user.passwordHash, undefined);
        });
        (0, node_test_1.it)('ANTI-TAMPERING: Attacker modifying JWT payload roleCode is defeated by live DB lookup', async () => {
            const token = tokenService.signAccessToken({
                sub: 'usr-finance',
                email: 'finance@segacademy.com',
                roleCode: 'FOUNDER_SUPER_ADMIN',
                fullName: 'Finance Officer',
            });
            const { context, request } = createMockContext(`Bearer ${token}`, { isPublic: false });
            const reflector = { getAllAndOverride: () => false };
            const guard = new jwt_auth_guard_1.JwtAuthGuard(reflector, tokenService, mockPrisma);
            await guard.canActivate(context);
            assert.deepEqual(request.user.roles, ['FINANCE_MANAGER']);
            assert.notEqual(request.user.roles[0], 'FOUNDER_SUPER_ADMIN');
        });
    });
    (0, node_test_1.describe)('RolesGuard', () => {
        (0, node_test_1.it)('should allow access when user role matches one of the required roles', () => {
            const reflector = {
                getAllAndOverride: (key) => (key === 'roles' ? ['ADMIN', 'FOUNDER_SUPER_ADMIN'] : false),
            };
            const guard = new roles_guard_1.RolesGuard(reflector);
            const { context, request } = createMockContext();
            request.user = { userId: '1', roles: ['ADMIN'] };
            assert.equal(guard.canActivate(context), true);
        });
        (0, node_test_1.it)('should deny access (HTTP 403) when user role is not in allowed list', () => {
            const reflector = {
                getAllAndOverride: (key) => (key === 'roles' ? ['ADMIN', 'FOUNDER_SUPER_ADMIN'] : false),
            };
            const guard = new roles_guard_1.RolesGuard(reflector);
            const { context, request } = createMockContext();
            request.user = { userId: '2', roles: ['FINANCE_MANAGER'] };
            assert.throws(() => guard.canActivate(context), (err) => err instanceof common_1.ForbiddenException && err.message.includes('Required role'));
        });
        (0, node_test_1.it)('should grant access to FOUNDER_SUPER_ADMIN regardless of required roles (Superuser bypass)', () => {
            const reflector = {
                getAllAndOverride: (key) => (key === 'roles' ? ['COUNSELOR', 'TRAINER_FACULTY'] : false),
            };
            const guard = new roles_guard_1.RolesGuard(reflector);
            const { context, request } = createMockContext();
            request.user = { userId: '3', roles: ['FOUNDER_SUPER_ADMIN'] };
            assert.equal(guard.canActivate(context), true);
        });
    });
    (0, node_test_1.describe)('PermissionsGuard', () => {
        (0, node_test_1.it)('should allow access when user possesses all required permissions', () => {
            const reflector = {
                getAllAndOverride: (key) => key === 'permissions'
                    ? [
                        { resource: 'invoices', action: 'read' },
                        { resource: 'invoices', action: 'approve' },
                    ]
                    : false,
            };
            const guard = new permissions_guard_1.PermissionsGuard(reflector);
            const { context, request } = createMockContext();
            request.user = {
                userId: '1',
                roles: ['ADMIN'],
                permissions: ['invoices:read', 'invoices:approve', 'students:read'],
            };
            assert.equal(guard.canActivate(context), true);
        });
        (0, node_test_1.it)('should deny access (HTTP 403) when user is missing any required permission', () => {
            const reflector = {
                getAllAndOverride: (key) => key === 'permissions'
                    ? [
                        { resource: 'invoices', action: 'read' },
                        { resource: 'invoices', action: 'approve' },
                    ]
                    : false,
            };
            const guard = new permissions_guard_1.PermissionsGuard(reflector);
            const { context, request } = createMockContext();
            request.user = {
                userId: '2',
                roles: ['FINANCE_MANAGER'],
                permissions: ['invoices:read', 'payments:create'],
            };
            assert.throws(() => guard.canActivate(context), (err) => err instanceof common_1.ForbiddenException &&
                err.message.includes('Missing required permission(s): invoices:approve'));
        });
        (0, node_test_1.it)('should grant access to FOUNDER_SUPER_ADMIN regardless of required permissions', () => {
            const reflector = {
                getAllAndOverride: (key) => key === 'permissions'
                    ? [{ resource: 'secret_module', action: 'execute' }]
                    : false,
            };
            const guard = new permissions_guard_1.PermissionsGuard(reflector);
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
//# sourceMappingURL=authorization.guards.spec.js.map