import 'reflect-metadata';
import { test, describe, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RateLimiterGuard } from '../rate-limiter.guard';
import { RateLimiterStorageService } from '../rate-limiter-storage.service';
import { RATE_LIMIT_KEY, RATE_LIMIT_SKIP_KEY } from '../rate-limit.decorator';

function createMockContext(options: {
  ip?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  handlerMetadata?: any;
  classMetadata?: any;
  correlationId?: string;
}): {
  context: ExecutionContext;
  req: any;
  res: any;
} {
  const headers = options.headers || {};
  const req: any = {
    ip: options.ip || '192.168.1.100',
    socket: { remoteAddress: options.ip || '192.168.1.100' },
    url: options.url || '/api/v1/test',
    originalUrl: options.url || '/api/v1/test',
    method: options.method || 'GET',
    headers,
    correlationId: options.correlationId || 'test-corr-id-1234',
  };

  const resHeaders: Record<string, string> = {};
  const res: any = {
    setHeader: (name: string, value: string) => {
      resHeaders[name.toLowerCase()] = value;
    },
    getHeader: (name: string) => resHeaders[name.toLowerCase()],
    resHeaders,
  };

  const context: any = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getHandler: () => () => {},
    getClass: () => class TestClass {},
  };

  return { context, req, res };
}

describe('RateLimiterGuard & RateLimiterStorageService', () => {
  let storage: RateLimiterStorageService;
  let reflector: Reflector;
  let configService: ConfigService;
  let guard: RateLimiterGuard;

  beforeEach(() => {
    storage = new RateLimiterStorageService();
    reflector = new Reflector();
    configService = new ConfigService({
      THROTTLE_LIMIT: '5',
      THROTTLE_TTL: '60',
      TRUST_PROXY: 'false',
    });
    guard = new RateLimiterGuard(reflector, storage, configService);
  });

  afterEach(() => {
    storage.onDestroy();
    storage.clear();
  });

  test('should allow requests within configured global rate limit', () => {
    const { context, res } = createMockContext({ ip: '10.0.0.1' });

    // 5 requests allowed
    for (let i = 1; i <= 5; i++) {
      const allowed = guard.canActivate(context);
      assert.equal(allowed, true);
      assert.equal(res.resHeaders['x-ratelimit-limit'], '5');
      assert.equal(res.resHeaders['x-ratelimit-remaining'], (5 - i).toString());
    }
  });

  test('should block 6th request with HTTP 429 when global limit is exceeded', () => {
    const { context, res } = createMockContext({ ip: '10.0.0.2' });

    // Consume all 5
    for (let i = 1; i <= 5; i++) {
      guard.canActivate(context);
    }

    // 6th request must throw 429
    assert.throws(
      () => guard.canActivate(context),
      (err: any) => {
        assert.ok(err instanceof HttpException);
        assert.equal(err.getStatus(), HttpStatus.TOO_MANY_REQUESTS);
        const body = err.getResponse() as Record<string, any>;
        assert.equal(body.statusCode, 429);
        assert.ok(body.message.includes('Too many requests'));
        assert.ok(body.retryAfter > 0);
        return true;
      },
    );

    // Verify Retry-After header was set
    assert.ok(parseInt(res.resHeaders['retry-after'], 10) > 0);
  });

  test('should enforce endpoint-specific stricter rate limits (e.g. login 3 attempts)', () => {
    // Override metadata for handler
    reflector.getAllAndOverride = (key: any) => {
      if (key === RATE_LIMIT_KEY) {
        return { limit: 3, ttlSeconds: 30, name: 'auth:login', keyPrefix: 'auth_login' };
      }
      return undefined;
    };

    const { context, res } = createMockContext({ ip: '10.0.0.3', url: '/api/v1/auth/login', method: 'POST' });

    // 3 requests allowed
    assert.equal(guard.canActivate(context), true);
    assert.equal(res.resHeaders['x-ratelimit-remaining'], '2');
    assert.equal(guard.canActivate(context), true);
    assert.equal(res.resHeaders['x-ratelimit-remaining'], '1');
    assert.equal(guard.canActivate(context), true);
    assert.equal(res.resHeaders['x-ratelimit-remaining'], '0');

    // 4th request blocked
    assert.throws(
      () => guard.canActivate(context),
      (err: any) => {
        assert.equal(err.getStatus(), HttpStatus.TOO_MANY_REQUESTS);
        return true;
      },
    );
  });

  test('should skip rate limiting when @SkipRateLimit is applied (e.g. health checks)', () => {
    reflector.getAllAndOverride = (key: any) => {
      if (key === RATE_LIMIT_SKIP_KEY) {
        return true;
      }
      return undefined;
    };

    const { context } = createMockContext({ ip: '10.0.0.4', url: '/api/v1/health' });

    // Should never throw even after 100 requests
    for (let i = 0; i < 20; i++) {
      assert.equal(guard.canActivate(context), true);
    }
  });

  test('should not trust spoofed X-Forwarded-For headers when TRUST_PROXY is false', () => {
    // Config has TRUST_PROXY='false'
    const { context } = createMockContext({
      ip: '192.168.1.50',
      headers: { 'x-forwarded-for': '203.0.113.195' }, // Spoofed client IP
    });

    // Make 5 requests under socket IP 192.168.1.50
    for (let i = 0; i < 5; i++) {
      guard.canActivate(context);
    }

    // Changing the spoofed X-Forwarded-For should NOT bypass the rate limit because TRUST_PROXY is false!
    const spoofedContext = createMockContext({
      ip: '192.168.1.50', // Same socket IP
      headers: { 'x-forwarded-for': '198.51.100.77' }, // Attacker rotates header
    }).context;

    assert.throws(
      () => guard.canActivate(spoofedContext),
      (err: any) => {
        assert.equal(err.getStatus(), HttpStatus.TOO_MANY_REQUESTS);
        return true;
      },
    );
  });

  test('should respect trusted X-Forwarded-For when TRUST_PROXY is true', () => {
    const trustedConfig = new ConfigService({
      THROTTLE_LIMIT: '2',
      THROTTLE_TTL: '60',
      TRUST_PROXY: 'true',
    });
    const trustedGuard = new RateLimiterGuard(reflector, storage, trustedConfig);

    const ctx1 = createMockContext({
      ip: '127.0.0.1', // Nginx proxy IP
      headers: { 'x-forwarded-for': '198.51.100.1, 127.0.0.1' },
    }).context;

    const ctx2 = createMockContext({
      ip: '127.0.0.1', // Nginx proxy IP
      headers: { 'x-forwarded-for': '198.51.100.2, 127.0.0.1' }, // Different real client
    }).context;

    // Client 1 makes 2 requests (exhausts limit)
    assert.equal(trustedGuard.canActivate(ctx1), true);
    assert.equal(trustedGuard.canActivate(ctx1), true);
    assert.throws(() => trustedGuard.canActivate(ctx1), (err: any) => err.getStatus() === 429);

    // Client 2 with different real IP must still be allowed!
    assert.equal(trustedGuard.canActivate(ctx2), true);
  });

  test('storage service cleans up expired entries', () => {
    storage.consume('test:key1', 5, 0.01); // 10ms ttl
    assert.equal(storage.size, 1);

    // Wait 25ms and run cleanup
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        storage.cleanupExpired();
        assert.equal(storage.size, 0);
        resolve();
      }, 25);
    });
  });
});
