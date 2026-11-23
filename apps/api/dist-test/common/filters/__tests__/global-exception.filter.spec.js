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
const database_1 = require("@seg/database");
const global_exception_filter_1 = require("../global-exception.filter");
(0, node_test_1.describe)('GlobalExceptionFilter Unit Tests', () => {
    const filter = new global_exception_filter_1.GlobalExceptionFilter();
    const createMockHost = (url = '/api/v1/resource') => {
        let capturedStatus = 200;
        let capturedBody = null;
        const res = {
            status: (code) => {
                capturedStatus = code;
                return {
                    json: (body) => {
                        capturedBody = body;
                    },
                };
            },
        };
        const req = {
            method: 'POST',
            originalUrl: url,
            url,
        };
        const host = {
            switchToHttp: () => ({
                getRequest: () => req,
                getResponse: () => res,
            }),
        };
        return {
            host,
            getStatus: () => capturedStatus,
            getBody: () => capturedBody,
        };
    };
    (0, node_test_1.it)('1. HTTP 400 - BadRequestException with string message', () => {
        const { host, getStatus, getBody } = createMockHost('/api/v1/test');
        const exception = new common_1.BadRequestException('Invalid payload provided.');
        filter.catch(exception, host);
        assert.equal(getStatus(), 400);
        const body = getBody();
        assert.equal(body.success, false);
        assert.equal(body.statusCode, 400);
        assert.equal(body.message, 'Invalid payload provided.');
        assert.equal(body.error, 'Bad Request');
        assert.equal(body.path, '/api/v1/test');
        assert.ok(body.timestamp);
    });
    (0, node_test_1.it)('2. HTTP 400 - ValidationPipe DTO errors with array details', () => {
        const { host, getStatus, getBody } = createMockHost('/api/v1/auth/login');
        const exception = new common_1.BadRequestException({
            statusCode: 400,
            message: ['Email is required.', 'Password must be at least 8 characters long.'],
            error: 'Bad Request',
        });
        filter.catch(exception, host);
        assert.equal(getStatus(), 400);
        const body = getBody();
        assert.equal(body.success, false);
        assert.equal(body.statusCode, 400);
        assert.match(body.message, /Email is required/);
        assert.deepEqual(body.details, [
            'Email is required.',
            'Password must be at least 8 characters long.',
        ]);
    });
    (0, node_test_1.it)('3. HTTP 401 - UnauthorizedException', () => {
        const { host, getStatus, getBody } = createMockHost('/api/v1/users');
        const exception = new common_1.UnauthorizedException('Missing Authorization header.');
        filter.catch(exception, host);
        assert.equal(getStatus(), 401);
        const body = getBody();
        assert.equal(body.success, false);
        assert.equal(body.statusCode, 401);
        assert.equal(body.message, 'Missing Authorization header.');
        assert.equal(body.error, 'Unauthorized');
    });
    (0, node_test_1.it)('4. HTTP 403 - ForbiddenException', () => {
        const { host, getStatus, getBody } = createMockHost('/api/v1/admin/billing');
        const exception = new common_1.ForbiddenException('Access denied. Insufficient permissions.');
        filter.catch(exception, host);
        assert.equal(getStatus(), 403);
        const body = getBody();
        assert.equal(body.success, false);
        assert.equal(body.statusCode, 403);
        assert.equal(body.message, 'Access denied. Insufficient permissions.');
        assert.equal(body.error, 'Forbidden');
    });
    (0, node_test_1.it)('5. HTTP 404 - NotFoundException', () => {
        const { host, getStatus, getBody } = createMockHost('/api/v1/users/non-existent-id');
        const exception = new common_1.NotFoundException('User with ID was not found.');
        filter.catch(exception, host);
        assert.equal(getStatus(), 404);
        const body = getBody();
        assert.equal(body.success, false);
        assert.equal(body.statusCode, 404);
        assert.equal(body.message, 'User with ID was not found.');
        assert.equal(body.error, 'Not Found');
    });
    (0, node_test_1.it)('6. HTTP 500 - InternalServerErrorException', () => {
        const { host, getStatus, getBody } = createMockHost('/api/v1/compute');
        const exception = new common_1.InternalServerErrorException('System calculation failed');
        filter.catch(exception, host);
        assert.equal(getStatus(), 500);
        const body = getBody();
        assert.equal(body.success, false);
        assert.equal(body.statusCode, 500);
        assert.equal(body.message, 'System calculation failed');
    });
    (0, node_test_1.it)('7. Prisma P2002 - Unique Constraint Conflict mapped to HTTP 409', () => {
        const { host, getStatus, getBody } = createMockHost('/api/v1/users');
        const prismaError = new database_1.Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`email`)', {
            code: 'P2002',
            clientVersion: '6.19.3',
            meta: { target: ['email'] },
        });
        filter.catch(prismaError, host);
        assert.equal(getStatus(), 409);
        const body = getBody();
        assert.equal(body.success, false);
        assert.equal(body.statusCode, 409);
        assert.equal(body.error, 'Conflict');
        assert.equal(body.message, 'A record with this email already exists.');
    });
    (0, node_test_1.it)('8. Prisma P2025 - Record Not Found mapped to HTTP 404', () => {
        const { host, getStatus, getBody } = createMockHost('/api/v1/users/uuid');
        const prismaError = new database_1.Prisma.PrismaClientKnownRequestError('An operation failed because it depends on one or more records that were required but not found.', {
            code: 'P2025',
            clientVersion: '6.19.3',
        });
        filter.catch(prismaError, host);
        assert.equal(getStatus(), 404);
        const body = getBody();
        assert.equal(body.success, false);
        assert.equal(body.statusCode, 404);
        assert.equal(body.error, 'Not Found');
        assert.equal(body.message, 'The requested record was not found.');
    });
    (0, node_test_1.it)('9. Prisma P2003 - Foreign Key Constraint mapped to HTTP 400', () => {
        const { host, getStatus, getBody } = createMockHost('/api/v1/users');
        const prismaError = new database_1.Prisma.PrismaClientKnownRequestError('Foreign key constraint failed on the field: `roleId`', {
            code: 'P2003',
            clientVersion: '6.19.3',
        });
        filter.catch(prismaError, host);
        assert.equal(getStatus(), 400);
        const body = getBody();
        assert.equal(body.success, false);
        assert.equal(body.statusCode, 400);
        assert.equal(body.error, 'Bad Request');
        assert.match(body.message, /Referenced related record does not exist/);
    });
    (0, node_test_1.it)('10. Prisma P2014 - Required Relation Violation mapped to HTTP 400', () => {
        const { host, getStatus, getBody } = createMockHost('/api/v1/roles');
        const prismaError = new database_1.Prisma.PrismaClientKnownRequestError('The change you are trying to make would violate the required relation between models.', {
            code: 'P2014',
            clientVersion: '6.19.3',
        });
        filter.catch(prismaError, host);
        assert.equal(getStatus(), 400);
        const body = getBody();
        assert.equal(body.success, false);
        assert.equal(body.statusCode, 400);
        assert.equal(body.error, 'Bad Request');
        assert.match(body.message, /violates a required relational dependency/);
    });
    (0, node_test_1.it)('11. Unknown Unhandled Error - Sanitizes internal details and protects sensitive data', () => {
        const { host, getStatus, getBody } = createMockHost('/api/v1/sensitive');
        const unhandled = new Error('DATABASE_URL="postgresql://postgres:SecretPassword123@db.supabase.co:5432" connection failed at select * from users where password_hash = ...');
        filter.catch(unhandled, host);
        assert.equal(getStatus(), 500);
        const body = getBody();
        assert.equal(body.success, false);
        assert.equal(body.statusCode, 500);
        assert.equal(body.error, 'Internal Server Error');
        assert.equal(body.message, 'An unexpected internal server error occurred.');
        assert.equal(body.stack, undefined);
        assert.equal(JSON.stringify(body).includes('SecretPassword123'), false);
        assert.equal(JSON.stringify(body).includes('DATABASE_URL'), false);
    });
});
//# sourceMappingURL=global-exception.filter.spec.js.map