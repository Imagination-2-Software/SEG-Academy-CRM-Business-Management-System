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
const correlation_id_middleware_1 = require("../correlation-id.middleware");
(0, node_test_1.describe)('CorrelationIdMiddleware Unit Tests', () => {
    const middleware = new correlation_id_middleware_1.CorrelationIdMiddleware();
    (0, node_test_1.it)('1. Generates a new UUIDv4 correlation ID when none is provided by client', () => {
        let nextCalled = false;
        let setHeaderKey = '';
        let setHeaderValue = '';
        const req = { headers: {} };
        const res = {
            setHeader: (key, value) => {
                setHeaderKey = key;
                setHeaderValue = value;
            },
        };
        const next = () => {
            nextCalled = true;
        };
        middleware.use(req, res, next);
        assert.equal(nextCalled, true);
        assert.ok(req.correlationId);
        assert.equal(setHeaderKey, correlation_id_middleware_1.CORRELATION_ID_HEADER);
        assert.equal(setHeaderValue, req.correlationId);
        assert.match(req.correlationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
    (0, node_test_1.it)('2. Preserves and propagates existing client-supplied correlation ID', () => {
        let nextCalled = false;
        let setHeaderValue = '';
        const incomingId = 'client-tracer-12345678';
        const req = { headers: { [correlation_id_middleware_1.CORRELATION_ID_HEADER]: incomingId } };
        const res = {
            setHeader: (_key, value) => {
                setHeaderValue = value;
            },
        };
        const next = () => {
            nextCalled = true;
        };
        middleware.use(req, res, next);
        assert.equal(nextCalled, true);
        assert.equal(req.correlationId, incomingId);
        assert.equal(setHeaderValue, incomingId);
    });
});
//# sourceMappingURL=correlation-id.middleware.spec.js.map