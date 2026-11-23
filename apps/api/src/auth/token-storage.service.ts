import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface StoredTokenEntry {
  userId: string;
  tokenHash: string;
  purpose: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

@Injectable()
export class TokenStorageService {
  private readonly logger = new Logger(TokenStorageService.name);

  // In-memory token store keyed by SHA-256 tokenHash
  private readonly store = new Map<string, StoredTokenEntry>();

  // Rate limiting map: tracks timestamp of last request per email/key
  private readonly rateLimits = new Map<string, number>();

  /**
   * Hashes an opaque token using SHA-256 to ensure plaintext tokens are never stored.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Stores a single-use token hash with a defined expiration and purpose.
   * If an active token of the same purpose exists for this user, it is superseded.
   */
  async storeToken(
    userId: string,
    tokenHash: string,
    purpose: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION',
    expiresInMinutes: number,
  ): Promise<StoredTokenEntry> {
    // Invalidate existing unused tokens for this user and purpose
    for (const [hash, entry] of this.store.entries()) {
      if (entry.userId === userId && entry.purpose === purpose && !entry.used) {
        entry.used = true;
      }
    }

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const entry: StoredTokenEntry = {
      userId,
      tokenHash,
      purpose,
      expiresAt,
      used: false,
      createdAt: new Date(),
    };

    this.store.set(tokenHash, entry);
    return entry;
  }

  /**
   * Atomically validates and consumes a token.
   * Fails if the token does not exist, was already used, or is expired.
   */
  async consumeToken(
    tokenHash: string,
    expectedPurpose: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION',
  ): Promise<StoredTokenEntry | null> {
    const entry = this.store.get(tokenHash);
    if (!entry) {
      return null;
    }

    if (entry.purpose !== expectedPurpose) {
      return null;
    }

    if (entry.used) {
      this.logger.warn(`Attempted reuse of already-consumed token for user: ${entry.userId}`);
      return null;
    }

    if (entry.expiresAt.getTime() <= Date.now()) {
      this.logger.warn(`Attempted use of expired token for user: ${entry.userId}`);
      return null;
    }

    // Atomically mark token as used
    entry.used = true;
    return entry;
  }

  /**
   * Enforces a cooldown/rate-limit period between requests (e.g. resend verification or forgot password).
   * Returns true if allowed, false if rate limited.
   */
  checkRateLimit(key: string, cooldownSeconds: number): boolean {
    const now = Date.now();
    const lastTime = this.rateLimits.get(key);

    if (lastTime && now - lastTime < cooldownSeconds * 1000) {
      return false; // Rate limited
    }

    this.rateLimits.set(key, now);
    return true;
  }

  /**
   * Helper for testing/inspections: clears or inspects state.
   */
  clear(): void {
    this.store.clear();
    this.rateLimits.clear();
  }

  clearRateLimits(): void {
    this.rateLimits.clear();
  }

  getEntry(tokenHash: string): StoredTokenEntry | undefined {
    return this.store.get(tokenHash);
  }
}
