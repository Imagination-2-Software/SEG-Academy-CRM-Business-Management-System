import { Injectable, Logger } from '@nestjs/common';

export interface RateLimitRecord {
  count: number;
  resetTime: number; // Unix timestamp in ms
}

export interface RateLimitResult {
  isAllowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in ms
  retryAfterSeconds: number;
}

@Injectable()
export class RateLimiterStorageService {
  private readonly logger = new Logger(RateLimiterStorageService.name);

  // In-memory bucket store: key -> { count, resetTime }
  private readonly store = new Map<string, RateLimitRecord>();

  // Cleanup interval in milliseconds (default: 60 seconds)
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically sweep expired entries to prevent memory exhaustion
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), 60000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Evaluates a rate limit for a specific key (sliding fixed window).
   * Atomically increments the count if within window, or resets if expired.
   */
  consume(key: string, limit: number, ttlSeconds: number): RateLimitResult {
    const now = Date.now();
    const windowMs = ttlSeconds * 1000;
    let record = this.store.get(key);

    if (!record || now >= record.resetTime) {
      // First hit or window expired: start new window
      const resetTime = now + windowMs;
      record = { count: 1, resetTime };
      this.store.set(key, record);

      return {
        isAllowed: true,
        limit,
        remaining: Math.max(0, limit - 1),
        resetTime,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    // Existing window
    record.count += 1;
    const retryAfterMs = Math.max(0, record.resetTime - now);
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    if (record.count > limit) {
      return {
        isAllowed: false,
        limit,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfterSeconds,
      };
    }

    return {
      isAllowed: true,
      limit,
      remaining: Math.max(0, limit - record.count),
      resetTime: record.resetTime,
      retryAfterSeconds,
    };
  }

  /**
   * Resets rate limit for a specific key (e.g. on successful login if desired or testing).
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Purges all expired rate-limiting keys to conserve memory.
   */
  cleanupExpired(): void {
    const now = Date.now();
    let purged = 0;
    for (const [key, record] of this.store.entries()) {
      if (now >= record.resetTime) {
        this.store.delete(key);
        purged++;
      }
    }
    if (purged > 0) {
      this.logger.debug(`Purged ${purged} expired rate-limit records.`);
    }
  }

  /**
   * Current number of tracked rate-limiting keys.
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Clear all records (useful for testing).
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Clean up timer on destruction.
   */
  onDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
