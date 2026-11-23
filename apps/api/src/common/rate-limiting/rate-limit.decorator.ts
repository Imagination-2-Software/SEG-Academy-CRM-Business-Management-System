import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'RATE_LIMIT_METADATA';
export const RATE_LIMIT_SKIP_KEY = 'RATE_LIMIT_SKIP_METADATA';

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window */
  limit: number;
  /** Window size in seconds */
  ttlSeconds: number;
  /** Custom category name for metrics/logging (e.g. 'auth:login') */
  name?: string;
  /** Whether to key by IP, or include an additional discriminator (e.g. email from body if applicable) */
  keyPrefix?: string;
}

/**
 * Decorator to apply specific rate limits to a controller method or class.
 * Overrides the default global rate limit.
 *
 * @param options RateLimitOptions with limit and ttlSeconds
 */
export const RateLimit = (options: RateLimitOptions): CustomDecorator<string> =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Decorator to skip rate limiting entirely for specific endpoints (e.g. health checks).
 */
export const SkipRateLimit = (): CustomDecorator<string> =>
  SetMetadata(RATE_LIMIT_SKIP_KEY, true);
