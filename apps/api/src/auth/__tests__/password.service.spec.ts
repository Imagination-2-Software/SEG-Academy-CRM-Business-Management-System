import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { PasswordService, ARGON2_OPTIONS } from '../password.service';

describe('PasswordService Unit Tests', () => {
  const service = new PasswordService();

  it('should hash password using Argon2id format ($argon2id$...) with OWASP parameters', async () => {
    const password = 'SuperSecurePassword2026!';
    const hash = await service.hashPassword(password);

    assert.ok(hash.startsWith('$argon2id$'), 'Hash should start with $argon2id$');
    assert.ok(hash.includes('m=65536'), 'Memory cost should be 64MB (65536 KiB)');
    assert.ok(hash.includes('t=3'), 'Time cost should be 3 iterations');
    assert.ok(hash.includes('p=4'), 'Parallelism should be 4 threads');

    // Never return plaintext
    assert.notEqual(hash, password);
  });

  it('should successfully verify correct password against Argon2id hash', async () => {
    const password = 'CorrectPassword123#';
    const hash = await service.hashPassword(password);

    const isValid = await service.verifyPassword(hash, password);
    assert.equal(isValid, true, 'Valid password must return true');
  });

  it('should reject incorrect password', async () => {
    const password = 'CorrectPassword123#';
    const hash = await service.hashPassword(password);

    const isInvalid = await service.verifyPassword(hash, 'WrongPassword456!');
    assert.equal(isInvalid, false, 'Invalid password must return false');
  });

  it('should handle malformed or empty inputs gracefully without throwing uncaught exceptions', async () => {
    assert.equal(await service.verifyPassword('', 'somepass'), false);
    assert.equal(await service.verifyPassword('invalid-hash', 'somepass'), false);
    assert.equal(await service.verifyPassword('$argon2id$malformed', 'somepass'), false);

    await assert.rejects(
      async () => service.hashPassword(''),
      /Password must be a non-empty string/,
    );
  });

  it('should generate cryptographically random 32-byte hex refresh tokens', () => {
    const token1 = service.generateRandomToken(32);
    const token2 = service.generateRandomToken(32);

    assert.equal(typeof token1, 'string');
    assert.equal(token1.length, 64, '32 bytes in hex format is 64 characters');
    assert.notEqual(token1, token2, 'Two generated tokens must be completely distinct');
  });

  it('should hash tokens deterministically using SHA-256', () => {
    const token = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const hash1 = service.hashToken(token);
    const hash2 = service.hashToken(token);

    assert.equal(hash1, hash2, 'SHA-256 hash must be deterministic');
    assert.equal(hash1.length, 64, 'SHA-256 hex digest is 64 chars');
    assert.notEqual(hash1, token, 'Hash must not equal plaintext token');
  });
});
