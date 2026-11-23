import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // 1. Extract existing correlation ID or generate a new cryptographically secure UUIDv4
    const headerValue = req.headers[CORRELATION_ID_HEADER];
    const correlationId =
      (typeof headerValue === 'string' && headerValue.trim()) ||
      (Array.isArray(headerValue) && headerValue[0]?.trim()) ||
      randomUUID();

    // 2. Attach to request for consumption across services, filters, and interceptors
    req.correlationId = correlationId;

    // 3. Set standard response header for client tracking
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    next();
  }
}
