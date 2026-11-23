import { Injectable } from '@nestjs/common';
import * as argon2 from '@node-rs/argon2';
import * as crypto from 'crypto';

/**
 * Options for Argon2id hashing conforming to OWASP Password Storage Cheat Sheet.
 * - Algorithm: 2 (Argon2id - hybrid defense against side-channel and GPU/ASIC attacks)
 * - Memory cost: 65,536 KiB (64 MiB)
 * - Time cost / iterations: 3
 * - Parallelism: 4 threads
 */
export const ARGON2_OPTIONS: argon2.Options = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  algorithm: 2, // Explicit literal for Algorithm.Argon2id to support isolatedModules
};

@Injectable()
export class PasswordService {
  /**
   * Hashes a plaintext password using Argon2id.
   * Never stores plaintext passwords.
   */
  async hashPassword(password: string): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string.');
    }
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  /**
   * Verifies a plaintext password candidate against an existing Argon2id hash.
   * Constant-time verification is handled by @node-rs/argon2.
   */
  async verifyPassword(hash: string, candidate: string): Promise<boolean> {
    if (!hash || !candidate || typeof hash !== 'string' || typeof candidate !== 'string') {
      return false;
    }
    try {
      return await argon2.verify(hash, candidate);
    } catch {
      return false;
    }
  }

  /**
   * Generates a cryptographically secure random token (hex string).
   * Used for opaque refresh tokens.
   */
  generateRandomToken(byteLength = 32): string {
    return crypto.randomBytes(byteLength).toString('hex');
  }

  /**
   * Generates a deterministic SHA-256 hash of an opaque token.
   * Only the hash is persisted to the database.
   */
  hashToken(token: string): string {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a non-empty string.');
    }
    return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
