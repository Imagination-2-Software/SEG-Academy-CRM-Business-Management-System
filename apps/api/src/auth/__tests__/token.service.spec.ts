import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService, JwtPayload } from '../token.service';

describe('TokenService Unit Tests', () => {
  const mockConfigService = {
    get: (key: string) => {
      if (key === 'JWT_SECRET') return 'test-super-secret-key-at-least-32-chars-long!';
      if (key === 'JWT_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
      return null;
    },
  } as unknown as ConfigService;

  const tokenService = new TokenService(mockConfigService);

  it('should sign and verify valid JWT access tokens with correct payload', () => {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: 'user-uuid-1234',
      email: 'admin@segacademy.com',
      roleCode: 'ADMIN',
      fullName: 'System Administrator',
      employeeId: 'emp-uuid-5678',
    };

    const token = tokenService.signAccessToken(payload);
    assert.ok(typeof token === 'string');
    assert.equal(token.split('.').length, 3, 'JWT must contain header, payload, and signature');

    const decoded = tokenService.verifyAccessToken(token);
    assert.equal(decoded.sub, payload.sub);
    assert.equal(decoded.email, payload.email);
    assert.equal(decoded.roleCode, payload.roleCode);
    assert.equal(decoded.fullName, payload.fullName);
    assert.equal(decoded.employeeId, payload.employeeId);
    assert.ok(decoded.exp! > decoded.iat!, 'exp must be greater than iat');
  });

  it('should reject tampered or modified JWT tokens', () => {
    const payload = {
      sub: 'user-uuid-1234',
      email: 'admin@segacademy.com',
      roleCode: 'ADMIN',
      fullName: 'System Administrator',
    };

    const token = tokenService.signAccessToken(payload);
    const parts = token.split('.');

    // Tamper payload
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...payload, roleCode: 'FOUNDER_SUPER_ADMIN' }),
    )
      .toString('base64')
      .replace(/=/g, '');

    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    assert.throws(
      () => tokenService.verifyAccessToken(tamperedToken),
      (err: unknown) => err instanceof UnauthorizedException,
      'Tampered token signature must throw UnauthorizedException',
    );
  });

  it('should reject tokens with invalid secrets', () => {
    const payload = {
      sub: 'user-uuid-1234',
      email: 'admin@segacademy.com',
      roleCode: 'ADMIN',
      fullName: 'System Administrator',
    };

    const token = tokenService.signAccessToken(payload);

    const otherConfigService = {
      get: (key: string) => {
        if (key === 'JWT_SECRET') return 'different-secret-key-that-does-not-match-32!';
        return '15m';
      },
    } as unknown as ConfigService;
    const otherTokenService = new TokenService(otherConfigService);

    assert.throws(
      () => otherTokenService.verifyAccessToken(token),
      (err: unknown) => err instanceof UnauthorizedException,
    );
  });

  it('should calculate refresh token expiry in future', () => {
    const expiry = tokenService.getRefreshTokenExpiryDate();
    const now = new Date();
    assert.ok(expiry.getTime() > now.getTime(), 'Expiry date must be in the future');

    const diffDays = Math.round((expiry.getTime() - now.getTime()) / (1000 * 86400));
    assert.equal(diffDays, 30, 'Expiry should be 30 days ahead');
  });
});
