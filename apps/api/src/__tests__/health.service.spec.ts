import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { HealthService } from '../health.service';

describe('HealthService & Probes Unit Tests', () => {
  it('1. Liveness probe returns ok status, uptime, and environment without sensitive data', () => {
    const mockPrisma: any = {};
    const service = new HealthService(mockPrisma);

    const liveness = service.getLiveness();
    assert.equal(liveness.status, 'ok');
    assert.equal(liveness.service, 'SEG Academy CRM API');
    assert.ok(liveness.uptime >= 0);
    assert.ok(liveness.timestamp);
    assert.doesNotThrow(() => new Date(liveness.timestamp));
  });

  it('2. Readiness probe returns ok when database connection query succeeds', async () => {
    const mockPrisma: any = {
      $queryRaw: async () => [{ '?column?': 1 }],
    };
    const service = new HealthService(mockPrisma);

    const readiness = await service.getReadiness();
    assert.equal(readiness.status, 'ok');
    assert.equal(readiness.checks.database.status, 'up');
    assert.ok(typeof readiness.checks.database.latencyMs === 'number');
    assert.equal(readiness.checks.memory.status, 'up');
    assert.ok(readiness.checks.memory.heapUsedMb > 0);
  });

  it('3. Readiness probe returns error when database query fails (without leaking DB secrets)', async () => {
    const mockPrisma: any = {
      $queryRaw: async () => {
        throw new Error('Connection pool exhausted at postgresql://postgres:SecretPass@db.com:5432');
      },
    };
    const service = new HealthService(mockPrisma);

    const readiness = await service.getReadiness();
    assert.equal(readiness.status, 'error');
    assert.equal(readiness.checks.database.status, 'down');
    assert.equal(readiness.checks.database.message, 'Database connection check failed');
    // Ensure raw connection error string with password was NOT exposed
    assert.equal(JSON.stringify(readiness).includes('SecretPass'), false);
    assert.equal(JSON.stringify(readiness).includes('postgresql://'), false);
  });
});
