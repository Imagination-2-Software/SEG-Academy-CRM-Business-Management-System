import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { of, throwError } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ResponseInterceptor } from '../response.interceptor';

describe('ResponseInterceptor Unit Tests', () => {
  const interceptor = new ResponseInterceptor();

  const createMockContext = (url = '/api/v1/test', statusCode = 200) => {
    const req: any = { originalUrl: url, url };
    const res: any = { statusCode };

    const context: ExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as any;

    return { context, req, res };
  };

  it('1. Wraps raw data payload into standard API response envelope', async () => {
    const { context } = createMockContext('/api/v1/users/profile', 200);
    const rawData = { id: 'usr-1', email: 'test@segacademy.com' };

    const next: CallHandler = {
      handle: () => of(rawData),
    };

    const observable = interceptor.intercept(context, next);
    observable.subscribe({
      next: (result: any) => {
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

  it('2. Anti-Double-Wrapping: Preserves already standard-wrapped response', async () => {
    const { context } = createMockContext('/api/v1/already-wrapped', 200);
    const existingEnvelope = {
      success: true,
      statusCode: 200,
      message: 'Already processed',
      data: { custom: true },
      timestamp: '2026-11-17T12:00:00.000Z',
      path: '/api/v1/already-wrapped',
    };

    const next: CallHandler = {
      handle: () => of(existingEnvelope),
    };

    const observable = interceptor.intercept(context, next);
    observable.subscribe({
      next: (result: any) => {
        assert.deepEqual(result, existingEnvelope, 'Must not double-wrap an already wrapped envelope');
      },
    });
  });

  it('3. Supports paginated responses preserving data array and pagination meta', async () => {
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

    const next: CallHandler = {
      handle: () => of(paginatedPayload),
    };

    const observable = interceptor.intercept(context, next);
    observable.subscribe({
      next: (result: any) => {
        assert.equal(result.success, true);
        assert.equal(result.statusCode, 200);
        assert.deepEqual(result.data, paginatedPayload);
        assert.equal(result.data.data.length, 2);
        assert.equal(result.data.meta.total, 2);
      },
    });
  });

  it('4. Handles custom message in response object seamlessly', async () => {
    const { context } = createMockContext('/api/v1/auth/logout', 200);
    const customResult = {
      success: true,
      message: 'Session logged out successfully.',
    };

    const next: CallHandler = {
      handle: () => of(customResult),
    };

    const observable = interceptor.intercept(context, next);
    observable.subscribe({
      next: (result: any) => {
        assert.equal(result.success, true);
        assert.equal(result.statusCode, 200);
        assert.equal(result.message, 'Session logged out successfully.');
        assert.deepEqual(result.data, {});
      },
    });
  });

  it('5. Handles null or undefined returned data safely', async () => {
    const { context } = createMockContext('/api/v1/void-endpoint', 204);

    const next: CallHandler = {
      handle: () => of(undefined),
    };

    const observable = interceptor.intercept(context, next);
    observable.subscribe({
      next: (result: any) => {
        assert.equal(result.success, true);
        assert.equal(result.statusCode, 204);
        assert.deepEqual(result.data, {});
      },
    });
  });
});
