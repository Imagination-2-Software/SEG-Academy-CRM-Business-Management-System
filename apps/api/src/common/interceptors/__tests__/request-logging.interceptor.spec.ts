import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { of, throwError } from 'rxjs';
import { RequestLoggingInterceptor } from '../request-logging.interceptor';

describe('RequestLoggingInterceptor Unit Tests', () => {
  const interceptor = new RequestLoggingInterceptor();

  it('1. Logs successful request execution with correlation ID and duration', (t, done) => {
    const req: any = {
      method: 'GET',
      originalUrl: '/api/v1/health',
      ip: '127.0.0.1',
      correlationId: 'test-trace-id-123',
      get: () => 'TestAgent',
    };
    const res: any = { statusCode: 200 };

    const context: any = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    };

    const next: any = {
      handle: () => of({ status: 'ok' }),
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

  it('2. Logs failed request execution safely without breaking error flow', (t, done) => {
    const req: any = {
      method: 'POST',
      originalUrl: '/api/v1/failing',
      ip: '127.0.0.1',
      correlationId: 'test-trace-fail-456',
      get: () => 'TestAgent',
    };
    const res: any = { statusCode: 500 };

    const context: any = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    };

    const next: any = {
      handle: () => throwError(() => new Error('Simulated route failure')),
    };

    interceptor.intercept(context, next).subscribe({
      error: (err) => {
        assert.equal(err.message, 'Simulated route failure');
        done();
      },
    });
  });
});
