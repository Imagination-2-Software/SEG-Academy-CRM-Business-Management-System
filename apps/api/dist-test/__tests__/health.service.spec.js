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
const health_service_1 = require("../health.service");
(0, node_test_1.describe)('HealthService & Probes Unit Tests', () => {
    (0, node_test_1.it)('1. Liveness probe returns ok status, uptime, and environment without sensitive data', () => {
        const mockPrisma = {};
        const service = new health_service_1.HealthService(mockPrisma);
        const liveness = service.getLiveness();
        assert.equal(liveness.status, 'ok');
        assert.equal(liveness.service, 'SEG Academy CRM API');
        assert.ok(liveness.uptime >= 0);
        assert.ok(liveness.timestamp);
        assert.doesNotThrow(() => new Date(liveness.timestamp));
    });
    (0, node_test_1.it)('2. Readiness probe returns ok when database connection query succeeds', async () => {
        const mockPrisma = {
            $queryRaw: async () => [{ '?column?': 1 }],
        };
        const service = new health_service_1.HealthService(mockPrisma);
        const readiness = await service.getReadiness();
        assert.equal(readiness.status, 'ok');
        assert.equal(readiness.checks.database.status, 'up');
        assert.ok(typeof readiness.checks.database.latencyMs === 'number');
        assert.equal(readiness.checks.memory.status, 'up');
        assert.ok(readiness.checks.memory.heapUsedMb > 0);
    });
    (0, node_test_1.it)('3. Readiness probe returns error when database query fails (without leaking DB secrets)', async () => {
        const mockPrisma = {
            $queryRaw: async () => {
                throw new Error('Connection pool exhausted at postgresql://postgres:SecretPass@db.com:5432');
            },
        };
        const service = new health_service_1.HealthService(mockPrisma);
        const readiness = await service.getReadiness();
        assert.equal(readiness.status, 'error');
        assert.equal(readiness.checks.database.status, 'down');
        assert.equal(readiness.checks.database.message, 'Database connection check failed');
        assert.equal(JSON.stringify(readiness).includes('SecretPass'), false);
        assert.equal(JSON.stringify(readiness).includes('postgresql://'), false);
    });
});
//# sourceMappingURL=health.service.spec.js.map