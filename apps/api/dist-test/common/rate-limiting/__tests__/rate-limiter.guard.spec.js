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
require("reflect-metadata");
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert/strict"));
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const rate_limiter_guard_1 = require("../rate-limiter.guard");
const rate_limiter_storage_service_1 = require("../rate-limiter-storage.service");
const rate_limit_decorator_1 = require("../rate-limit.decorator");
function createMockContext(options) {
    const headers = options.headers || {};
    const req = {
        ip: options.ip || '192.168.1.100',
        socket: { remoteAddress: options.ip || '192.168.1.100' },
        url: options.url || '/api/v1/test',
        originalUrl: options.url || '/api/v1/test',
        method: options.method || 'GET',
        headers,
        correlationId: options.correlationId || 'test-corr-id-1234',
    };
    const resHeaders = {};
    const res = {
        setHeader: (name, value) => {
            resHeaders[name.toLowerCase()] = value;
        },
        getHeader: (name) => resHeaders[name.toLowerCase()],
        resHeaders,
    };
    const context = {
        switchToHttp: () => ({
            getRequest: () => req,
            getResponse: () => res,
        }),
        getHandler: () => () => { },
        getClass: () => class TestClass {
        },
    };
    return { context, req, res };
}
(0, node_test_1.describe)('RateLimiterGuard & RateLimiterStorageService', () => {
    let storage;
    let reflector;
    let configService;
    let guard;
    (0, node_test_1.beforeEach)(() => {
        storage = new rate_limiter_storage_service_1.RateLimiterStorageService();
        reflector = new core_1.Reflector();
        configService = new config_1.ConfigService({
            THROTTLE_LIMIT: '5',
            THROTTLE_TTL: '60',
            TRUST_PROXY: 'false',
        });
        guard = new rate_limiter_guard_1.RateLimiterGuard(reflector, storage, configService);
    });
    (0, node_test_1.afterEach)(() => {
        storage.onDestroy();
        storage.clear();
    });
    (0, node_test_1.test)('should allow requests within configured global rate limit', () => {
        const { context, res } = createMockContext({ ip: '10.0.0.1' });
        for (let i = 1; i <= 5; i++) {
            const allowed = guard.canActivate(context);
            assert.equal(allowed, true);
            assert.equal(res.resHeaders['x-ratelimit-limit'], '5');
            assert.equal(res.resHeaders['x-ratelimit-remaining'], (5 - i).toString());
        }
    });
    (0, node_test_1.test)('should block 6th request with HTTP 429 when global limit is exceeded', () => {
        const { context, res } = createMockContext({ ip: '10.0.0.2' });
        for (let i = 1; i <= 5; i++) {
            guard.canActivate(context);
        }
        assert.throws(() => guard.canActivate(context), (err) => {
            assert.ok(err instanceof common_1.HttpException);
            assert.equal(err.getStatus(), common_1.HttpStatus.TOO_MANY_REQUESTS);
            const body = err.getResponse();
            assert.equal(body.statusCode, 429);
            assert.ok(body.message.includes('Too many requests'));
            assert.ok(body.retryAfter > 0);
            return true;
        });
        assert.ok(parseInt(res.resHeaders['retry-after'], 10) > 0);
    });
    (0, node_test_1.test)('should enforce endpoint-specific stricter rate limits (e.g. login 3 attempts)', () => {
        reflector.getAllAndOverride = (key) => {
            if (key === rate_limit_decorator_1.RATE_LIMIT_KEY) {
                return { limit: 3, ttlSeconds: 30, name: 'auth:login', keyPrefix: 'auth_login' };
            }
            return undefined;
        };
        const { context, res } = createMockContext({ ip: '10.0.0.3', url: '/api/v1/auth/login', method: 'POST' });
        assert.equal(guard.canActivate(context), true);
        assert.equal(res.resHeaders['x-ratelimit-remaining'], '2');
        assert.equal(guard.canActivate(context), true);
        assert.equal(res.resHeaders['x-ratelimit-remaining'], '1');
        assert.equal(guard.canActivate(context), true);
        assert.equal(res.resHeaders['x-ratelimit-remaining'], '0');
        assert.throws(() => guard.canActivate(context), (err) => {
            assert.equal(err.getStatus(), common_1.HttpStatus.TOO_MANY_REQUESTS);
            return true;
        });
    });
    (0, node_test_1.test)('should skip rate limiting when @SkipRateLimit is applied (e.g. health checks)', () => {
        reflector.getAllAndOverride = (key) => {
            if (key === rate_limit_decorator_1.RATE_LIMIT_SKIP_KEY) {
                return true;
            }
            return undefined;
        };
        const { context } = createMockContext({ ip: '10.0.0.4', url: '/api/v1/health' });
        for (let i = 0; i < 20; i++) {
            assert.equal(guard.canActivate(context), true);
        }
    });
    (0, node_test_1.test)('should not trust spoofed X-Forwarded-For headers when TRUST_PROXY is false', () => {
        const { context } = createMockContext({
            ip: '192.168.1.50',
            headers: { 'x-forwarded-for': '203.0.113.195' },
        });
        for (let i = 0; i < 5; i++) {
            guard.canActivate(context);
        }
        const spoofedContext = createMockContext({
            ip: '192.168.1.50',
            headers: { 'x-forwarded-for': '198.51.100.77' },
        }).context;
        assert.throws(() => guard.canActivate(spoofedContext), (err) => {
            assert.equal(err.getStatus(), common_1.HttpStatus.TOO_MANY_REQUESTS);
            return true;
        });
    });
    (0, node_test_1.test)('should respect trusted X-Forwarded-For when TRUST_PROXY is true', () => {
        const trustedConfig = new config_1.ConfigService({
            THROTTLE_LIMIT: '2',
            THROTTLE_TTL: '60',
            TRUST_PROXY: 'true',
        });
        const trustedGuard = new rate_limiter_guard_1.RateLimiterGuard(reflector, storage, trustedConfig);
        const ctx1 = createMockContext({
            ip: '127.0.0.1',
            headers: { 'x-forwarded-for': '198.51.100.1, 127.0.0.1' },
        }).context;
        const ctx2 = createMockContext({
            ip: '127.0.0.1',
            headers: { 'x-forwarded-for': '198.51.100.2, 127.0.0.1' },
        }).context;
        assert.equal(trustedGuard.canActivate(ctx1), true);
        assert.equal(trustedGuard.canActivate(ctx1), true);
        assert.throws(() => trustedGuard.canActivate(ctx1), (err) => err.getStatus() === 429);
        assert.equal(trustedGuard.canActivate(ctx2), true);
    });
    (0, node_test_1.test)('storage service cleans up expired entries', () => {
        storage.consume('test:key1', 5, 0.01);
        assert.equal(storage.size, 1);
        return new Promise((resolve) => {
            setTimeout(() => {
                storage.cleanupExpired();
                assert.equal(storage.size, 0);
                resolve();
            }, 25);
        });
    });
});
//# sourceMappingURL=rate-limiter.guard.spec.js.map