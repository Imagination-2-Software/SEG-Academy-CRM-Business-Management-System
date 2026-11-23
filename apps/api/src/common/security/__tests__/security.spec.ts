import 'reflect-metadata';
import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import { buildCorsOptions, ALLOWED_HTTP_METHODS, ALLOWED_HTTP_HEADERS, EXPOSED_HTTP_HEADERS } from '../cors.config';
import { securityHeadersMiddleware } from '../security-headers.middleware';

describe('CORS Configuration (buildCorsOptions)', () => {
  test('should allow configured allowed origins', () => {
    const corsOptions = buildCorsOptions({
      allowedOrigins: ['http://localhost:3000', 'https://crm.segacademy.com'],
    });

    const originValidator = corsOptions.origin as (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => void;

    // Test localhost
    let allowed: boolean | undefined;
    let error: Error | null = null;
    originValidator('http://localhost:3000', (err, allow) => {
      error = err;
      allowed = allow;
    });
    assert.equal(error, null);
    assert.equal(allowed, true);

    // Test production domain
    originValidator('https://crm.segacademy.com', (err, allow) => {
      error = err;
      allowed = allow;
    });
    assert.equal(error, null);
    assert.equal(allowed, true);
  });

  test('should allow requests with no origin (e.g. server-to-server, curl, Postman)', () => {
    const corsOptions = buildCorsOptions({
      allowedOrigins: ['https://crm.segacademy.com'],
    });

    const originValidator = corsOptions.origin as any;
    let allowed: boolean | undefined;
    let error: Error | null = null;

    originValidator(undefined, (err: Error | null, allow?: boolean) => {
      error = err;
      allowed = allow;
    });

    assert.equal(error, null);
    assert.equal(allowed, true);
  });

  test('should reject unauthorized origins with a descriptive error', () => {
    const corsOptions = buildCorsOptions({
      allowedOrigins: ['https://crm.segacademy.com'],
    });

    const originValidator = corsOptions.origin as any;
    let allowed: boolean | undefined;
    let error: Error | null = null;

    originValidator('https://malicious-site.com', (err: Error | null, allow?: boolean) => {
      error = err;
      allowed = allow;
    });

    assert.ok(error !== null);
    assert.equal(allowed, false);
    assert.ok((error as Error).message.includes('not authorized'));
  });

  test('should include all necessary HTTP methods, headers, and credentials flag', () => {
    const corsOptions = buildCorsOptions();

    assert.equal(corsOptions.credentials, true);
    assert.equal(corsOptions.maxAge, 86400);

    // Methods
    assert.deepEqual(corsOptions.methods, ALLOWED_HTTP_METHODS);
    assert.ok(corsOptions.methods?.includes('OPTIONS'));
    assert.ok(corsOptions.methods?.includes('PATCH'));

    // Headers
    assert.ok((corsOptions.allowedHeaders as string[]).includes('X-Correlation-ID'));
    assert.ok((corsOptions.allowedHeaders as string[]).includes('Authorization'));

    // Exposed headers
    assert.ok((corsOptions.exposedHeaders as string[]).includes('X-Correlation-ID'));
    assert.ok((corsOptions.exposedHeaders as string[]).includes('Retry-After'));
    assert.ok((corsOptions.exposedHeaders as string[]).includes('X-RateLimit-Limit'));
  });
});

describe('Security Headers Middleware (securityHeadersMiddleware)', () => {
  function createMockHttp() {
    const headers: Record<string, string> = {};
    const req: any = {};
    const res: any = {
      setHeader: (key: string, value: string) => {
        headers[key.toLowerCase()] = value;
      },
      getHeader: (key: string) => headers[key.toLowerCase()],
      headers,
    };
    return { req, res, headers };
  }

  test('should set standard OWASP security headers in development', () => {
    const { req, res, headers } = createMockHttp();
    const middleware = securityHeadersMiddleware({ isProduction: false });

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

    // CSP should be set and allow self & unsafe-inline for Swagger
    assert.ok(headers['content-security-policy']?.includes("default-src 'self'"));
    assert.ok(headers['content-security-policy']?.includes("frame-ancestors 'none'"));

    // HSTS should NOT be set in non-production
    assert.equal(headers['strict-transport-security'], undefined);
  });

  test('should set Strict-Transport-Security (HSTS) in production', () => {
    const { req, res, headers } = createMockHttp();
    const middleware = securityHeadersMiddleware({ isProduction: true });

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
