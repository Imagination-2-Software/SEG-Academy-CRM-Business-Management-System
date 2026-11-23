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
const rxjs_1 = require("rxjs");
const response_interceptor_1 = require("../response.interceptor");
(0, node_test_1.describe)('ResponseInterceptor Unit Tests', () => {
    const interceptor = new response_interceptor_1.ResponseInterceptor();
    const createMockContext = (url = '/api/v1/test', statusCode = 200) => {
        const req = { originalUrl: url, url };
        const res = { statusCode };
        const context = {
            switchToHttp: () => ({
                getRequest: () => req,
                getResponse: () => res,
            }),
        };
        return { context, req, res };
    };
    (0, node_test_1.it)('1. Wraps raw data payload into standard API response envelope', async () => {
        const { context } = createMockContext('/api/v1/users/profile', 200);
        const rawData = { id: 'usr-1', email: 'test@segacademy.com' };
        const next = {
            handle: () => (0, rxjs_1.of)(rawData),
        };
        const observable = interceptor.intercept(context, next);
        observable.subscribe({
            next: (result) => {
                assert.equal(result.success, true);
                assert.equal(result.statusCode, 200);
                assert.equal(result.message, 'Request completed successfully');
                assert.deepEqual(result.data, rawData);
                assert.equal(result.path, '/api/v1/users/profile');
                assert.ok(result.timestamp);
                assert.doesNotThrow(() => new Date(result.timestamp));
            },
        });
    });
    (0, node_test_1.it)('2. Anti-Double-Wrapping: Preserves already standard-wrapped response', async () => {
        const { context } = createMockContext('/api/v1/already-wrapped', 200);
        const existingEnvelope = {
            success: true,
            statusCode: 200,
            message: 'Already processed',
            data: { custom: true },
            timestamp: '2026-11-17T12:00:00.000Z',
            path: '/api/v1/already-wrapped',
        };
        const next = {
            handle: () => (0, rxjs_1.of)(existingEnvelope),
        };
        const observable = interceptor.intercept(context, next);
        observable.subscribe({
            next: (result) => {
                assert.deepEqual(result, existingEnvelope, 'Must not double-wrap an already wrapped envelope');
            },
        });
    });
    (0, node_test_1.it)('3. Supports paginated responses preserving data array and pagination meta', async () => {
        const { context } = createMockContext('/api/v1/users?page=1&limit=10', 200);
        const paginatedPayload = {
            data: [{ id: '1' }, { id: '2' }],
            meta: {
                total: 2,
                page: 1,
                limit: 10,
                totalPages: 1,
            },
        };
        const next = {
            handle: () => (0, rxjs_1.of)(paginatedPayload),
        };
        const observable = interceptor.intercept(context, next);
        observable.subscribe({
            next: (result) => {
                assert.equal(result.success, true);
                assert.equal(result.statusCode, 200);
                assert.deepEqual(result.data, paginatedPayload);
                assert.equal(result.data.data.length, 2);
                assert.equal(result.data.meta.total, 2);
            },
        });
    });
    (0, node_test_1.it)('4. Handles custom message in response object seamlessly', async () => {
        const { context } = createMockContext('/api/v1/auth/logout', 200);
        const customResult = {
            success: true,
            message: 'Session logged out successfully.',
        };
        const next = {
            handle: () => (0, rxjs_1.of)(customResult),
        };
        const observable = interceptor.intercept(context, next);
        observable.subscribe({
            next: (result) => {
                assert.equal(result.success, true);
                assert.equal(result.statusCode, 200);
                assert.equal(result.message, 'Session logged out successfully.');
                assert.deepEqual(result.data, {});
            },
        });
    });
    (0, node_test_1.it)('5. Handles null or undefined returned data safely', async () => {
        const { context } = createMockContext('/api/v1/void-endpoint', 204);
        const next = {
            handle: () => (0, rxjs_1.of)(undefined),
        };
        const observable = interceptor.intercept(context, next);
        observable.subscribe({
            next: (result) => {
                assert.equal(result.success, true);
                assert.equal(result.statusCode, 204);
                assert.deepEqual(result.data, {});
            },
        });
    });
});
//# sourceMappingURL=response.interceptor.spec.js.map