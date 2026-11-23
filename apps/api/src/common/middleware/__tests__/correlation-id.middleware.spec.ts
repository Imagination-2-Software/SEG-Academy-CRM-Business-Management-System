import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { CorrelationIdMiddleware, CORRELATION_ID_HEADER } from '../correlation-id.middleware';

describe('CorrelationIdMiddleware Unit Tests', () => {
  const middleware = new CorrelationIdMiddleware();

  it('1. Generates a new UUIDv4 correlation ID when none is provided by client', () => {
    let nextCalled = false;
    let setHeaderKey = '';
    let setHeaderValue = '';

    const req: any = { headers: {} };
    const res: any = {
      setHeader: (key: string, value: string) => {
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
    assert.equal(setHeaderKey, CORRELATION_ID_HEADER);
    assert.equal(setHeaderValue, req.correlationId);
    // UUIDv4 format check
    assert.match(
      req.correlationId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('2. Preserves and propagates existing client-supplied correlation ID', () => {
    let nextCalled = false;
    let setHeaderValue = '';

    const incomingId = 'client-tracer-12345678';
    const req: any = { headers: { [CORRELATION_ID_HEADER]: incomingId } };
    const res: any = {
      setHeader: (_key: string, value: string) => {
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
