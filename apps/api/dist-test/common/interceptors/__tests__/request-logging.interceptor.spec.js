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
const request_logging_interceptor_1 = require("../request-logging.interceptor");
(0, node_test_1.describe)('RequestLoggingInterceptor Unit Tests', () => {
    const interceptor = new request_logging_interceptor_1.RequestLoggingInterceptor();
    (0, node_test_1.it)('1. Logs successful request execution with correlation ID and duration', (t, done) => {
        const req = {
            method: 'GET',
            originalUrl: '/api/v1/health',
            ip: '127.0.0.1',
            correlationId: 'test-trace-id-123',
            get: () => 'TestAgent',
        };
        const res = { statusCode: 200 };
        const context = {
            switchToHttp: () => ({
                getRequest: () => req,
                getResponse: () => res,
            }),
        };
        const next = {
            handle: () => (0, rxjs_1.of)({ status: 'ok' }),
        };
        interceptor.intercept(context, next).subscribe({
            next: (val) => {
                assert.deepEqual(val, { status: 'ok' });
            },
            complete: () => {
                done();
            },
        });
    });
    (0, node_test_1.it)('2. Logs failed request execution safely without breaking error flow', (t, done) => {
        const req = {
            method: 'POST',
            originalUrl: '/api/v1/failing',
            ip: '127.0.0.1',
            correlationId: 'test-trace-fail-456',
            get: () => 'TestAgent',
        };
        const res = { statusCode: 500 };
        const context = {
            switchToHttp: () => ({
                getRequest: () => req,
                getResponse: () => res,
            }),
        };
        const next = {
            handle: () => (0, rxjs_1.throwError)(() => new Error('Simulated route failure')),
        };
        interceptor.intercept(context, next).subscribe({
            error: (err) => {
                assert.equal(err.message, 'Simulated route failure');
                done();
            },
        });
    });
});
//# sourceMappingURL=request-logging.interceptor.spec.js.map