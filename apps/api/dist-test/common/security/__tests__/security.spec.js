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
const cors_config_1 = require("../cors.config");
const security_headers_middleware_1 = require("../security-headers.middleware");
(0, node_test_1.describe)('CORS Configuration (buildCorsOptions)', () => {
    (0, node_test_1.test)('should allow configured allowed origins', () => {
        const corsOptions = (0, cors_config_1.buildCorsOptions)({
            allowedOrigins: ['http://localhost:3000', 'https://crm.segacademy.com'],
        });
        const originValidator = corsOptions.origin;
        let allowed;
        let error = null;
        originValidator('http://localhost:3000', (err, allow) => {
            error = err;
            allowed = allow;
        });
        assert.equal(error, null);
        assert.equal(allowed, true);
        originValidator('https://crm.segacademy.com', (err, allow) => {
            error = err;
            allowed = allow;
        });
        assert.equal(error, null);
        assert.equal(allowed, true);
    });
    (0, node_test_1.test)('should allow requests with no origin (e.g. server-to-server, curl, Postman)', () => {
        const corsOptions = (0, cors_config_1.buildCorsOptions)({
            allowedOrigins: ['https://crm.segacademy.com'],
        });
        const originValidator = corsOptions.origin;
        let allowed;
        let error = null;
        originValidator(undefined, (err, allow) => {
            error = err;
            allowed = allow;
        });
        assert.equal(error, null);
        assert.equal(allowed, true);
    });
    (0, node_test_1.test)('should reject unauthorized origins with a descriptive error', () => {
        const corsOptions = (0, cors_config_1.buildCorsOptions)({
            allowedOrigins: ['https://crm.segacademy.com'],
        });
        const originValidator = corsOptions.origin;
        let allowed;
        let error = null;
        originValidator('https://malicious-site.com', (err, allow) => {
            error = err;
            allowed = allow;
        });
        assert.ok(error !== null);
        assert.equal(allowed, false);
        assert.ok(error.message.includes('not authorized'));
    });
    (0, node_test_1.test)('should include all necessary HTTP methods, headers, and credentials flag', () => {
        const corsOptions = (0, cors_config_1.buildCorsOptions)();
        assert.equal(corsOptions.credentials, true);
        assert.equal(corsOptions.maxAge, 86400);
        assert.deepEqual(corsOptions.methods, cors_config_1.ALLOWED_HTTP_METHODS);
        assert.ok(corsOptions.methods?.includes('OPTIONS'));
        assert.ok(corsOptions.methods?.includes('PATCH'));
        assert.ok(corsOptions.allowedHeaders.includes('X-Correlation-ID'));
        assert.ok(corsOptions.allowedHeaders.includes('Authorization'));
        assert.ok(corsOptions.exposedHeaders.includes('X-Correlation-ID'));
        assert.ok(corsOptions.exposedHeaders.includes('Retry-After'));
        assert.ok(corsOptions.exposedHeaders.includes('X-RateLimit-Limit'));
    });
});
(0, node_test_1.describe)('Security Headers Middleware (securityHeadersMiddleware)', () => {
    function createMockHttp() {
        const headers = {};
        const req = {};
        const res = {
            setHeader: (key, value) => {
                headers[key.toLowerCase()] = value;
            },
            getHeader: (key) => headers[key.toLowerCase()],
            headers,
        };
        return { req, res, headers };
    }
    (0, node_test_1.test)('should set standard OWASP security headers in development', () => {
        const { req, res, headers } = createMockHttp();
        const middleware = (0, security_headers_middleware_1.securityHeadersMiddleware)({ isProduction: false });
        let nextCalled = false;
        middleware(req, res, () => {
            nextCalled = true;
        });
        assert.equal(nextCalled, true);
        assert.equal(headers['x-content-type-options'], 'nosniff');
        assert.equal(headers['x-frame-options'], 'DENY');
        assert.equal(headers['x-xss-protection'], '0');
        assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin');
        assert.ok(headers['permissions-policy']?.includes('camera=()'));
        assert.equal(headers['cross-origin-opener-policy'], 'same-origin');
        assert.equal(headers['cross-origin-resource-policy'], 'cross-origin');
        assert.ok(headers['content-security-policy']?.includes("default-src 'self'"));
        assert.ok(headers['content-security-policy']?.includes("frame-ancestors 'none'"));
        assert.equal(headers['strict-transport-security'], undefined);
    });
    (0, node_test_1.test)('should set Strict-Transport-Security (HSTS) in production', () => {
        const { req, res, headers } = createMockHttp();
        const middleware = (0, security_headers_middleware_1.securityHeadersMiddleware)({ isProduction: true });
        let nextCalled = false;
        middleware(req, res, () => {
            nextCalled = true;
        });
        assert.equal(nextCalled, true);
        assert.ok(headers['strict-transport-security']?.includes('max-age=31536000'));
        assert.ok(headers['strict-transport-security']?.includes('includeSubDomains'));
        assert.ok(headers['strict-transport-security']?.includes('preload'));
    });
});
//# sourceMappingURL=security.spec.js.map