import 'reflect-metadata';
import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { validateEnvironment } from '../env.validation';

describe('Environment Configuration Validation Unit Tests', () => {
  const validConfig = {
    NODE_ENV: 'development',
    PORT: '4000',
    CORS_ORIGIN: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://postgres:secret@localhost:5432/seg_crm_staging',
    DIRECT_URL: 'postgresql://postgres:secret@localhost:5432/seg_crm_staging',
    JWT_SECRET: 'test-super-secret-key-at-least-32-chars-long!',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key-32-chars-min!',
    JWT_REFRESH_EXPIRES_IN: '30d',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
  };

  it('1. Passes validation with complete, valid environment configuration', () => {
    const validated = validateEnvironment(validConfig);
    assert.equal(validated.PORT, 4000);
    assert.equal(validated.NODE_ENV, 'development');
    assert.equal(validated.JWT_SECRET, 'test-super-secret-key-at-least-32-chars-long!');
  });

  it('2. Fails when DATABASE_URL is missing', () => {
    const invalid = { ...validConfig };
    delete (invalid as any).DATABASE_URL;

    assert.throws(
      () => validateEnvironment(invalid),
      (err: any) => err.message.includes('DATABASE_URL is required'),
    );
  });

  it('3. Fails when DATABASE_URL is not a PostgreSQL URI', () => {
    const invalid = {
      ...validConfig,
      DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
    };

    assert.throws(
      () => validateEnvironment(invalid),
      (err: any) => err.message.includes('DATABASE_URL must be a valid PostgreSQL connection URI'),
    );
  });

  it('4. Fails when JWT_SECRET is less than 32 characters (cryptographic strength requirement)', () => {
    const invalid = {
      ...validConfig,
      JWT_SECRET: 'short-secret-123', // < 32 chars
    };

    assert.throws(
      () => validateEnvironment(invalid),
      (err: any) => err.message.includes('JWT_SECRET must be at least 32 characters long'),
    );
  });

  it('5. Never exposes secret values in validation error messages', () => {
    const invalid = {
      ...validConfig,
      NODE_ENV: 'invalid_env_name',
    };

    try {
      validateEnvironment(invalid);
      assert.fail('Should have thrown validation error');
    } catch (err: any) {
      assert.match(err.message, /NODE_ENV must be one of/);
      // Secrets and connection URLs must NOT be in error message
      assert.equal(err.message.includes(validConfig.JWT_SECRET), false);
      assert.equal(err.message.includes('secret@localhost:5432'), false);
    }
  });

  it('6. Coerces numeric PORT from string cleanly', () => {
    const configWithStrPort = { ...validConfig, PORT: '8080' };
    const validated = validateEnvironment(configWithStrPort);
    assert.equal(typeof validated.PORT, 'number');
    assert.equal(validated.PORT, 8080);
  });
});
