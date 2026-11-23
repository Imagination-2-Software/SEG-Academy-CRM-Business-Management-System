import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import {
  RATE_LIMIT_KEY,
  RATE_LIMIT_SKIP_KEY,
  RateLimitOptions,
} from './rate-limit.decorator';
import { RateLimiterStorageService } from './rate-limiter-storage.service';
import { getClientIp } from './client-ip.util';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly logger = new Logger('RateLimiter');

  // Default global rate limit (100 requests per 60 seconds per IP)
  private readonly defaultLimit: number;
  private readonly defaultTtl: number;
  private readonly trustProxy: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly storage: RateLimiterStorageService,
    private readonly configService: ConfigService,
  ) {
    this.defaultLimit = parseInt(
      this.configService.get<string>('THROTTLE_LIMIT') || '100',
      10,
    );
    this.defaultTtl = parseInt(
      this.configService.get<string>('THROTTLE_TTL') || '60',
      10,
    );
    // Explicitly configure whether proxy headers are trusted (default: false unless behind verified proxy)
    const trustProxyConfig = this.configService.get<string>('TRUST_PROXY');
    this.trustProxy = trustProxyConfig === 'true' || trustProxyConfig === '1';
  }

  canActivate(context: ExecutionContext): boolean {
    // 1. Check if endpoint or controller skips rate limiting
    const isSkipped = this.reflector.getAllAndOverride<boolean>(
      RATE_LIMIT_SKIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isSkipped) {
      return true;
    }

    // 2. Extract specific rate limit options or fall back to defaults
    const customOptions = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    const limit = customOptions?.limit ?? this.defaultLimit;
    const ttlSeconds = customOptions?.ttlSeconds ?? this.defaultTtl;
    const ruleName = customOptions?.name ?? 'global';
    const keyPrefix = customOptions?.keyPrefix ?? 'rl';

    // 3. Extract request and response
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    // 4. Determine client IP securely
    const clientIp = getClientIp(req, { trustProxy: this.trustProxy });
    const correlationId = req.correlationId || '-';

    // 5. Build unique rate limit key
    // For auth endpoints, combine keyPrefix with IP so endpoints are tracked independently
    const rateLimitKey = `${keyPrefix}:${ruleName}:${clientIp}`;

    // 6. Consume from storage
    const result = this.storage.consume(rateLimitKey, limit, ttlSeconds);

    // 7. Set standard RateLimit headers (RFC standard / IETF draft)
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', result.limit.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader(
        'X-RateLimit-Reset',
        Math.ceil(result.resetTime / 1000).toString(),
      );
    }

    // 8. Handle exceeded limit
    if (!result.isAllowed) {
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', result.retryAfterSeconds.toString());
      }

      // Safe logging without credentials or sensitive body data
      this.logger.warn(
        `[${correlationId}] Rate limit exceeded for IP: ${clientIp} on [${req.method}] ${req.originalUrl || req.url} ` +
          `(Rule: ${ruleName}, Limit: ${limit}/${ttlSeconds}s, Retry-After: ${result.retryAfterSeconds}s)`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Too many requests. Please try again after ${result.retryAfterSeconds} seconds.`,
          retryAfter: result.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
