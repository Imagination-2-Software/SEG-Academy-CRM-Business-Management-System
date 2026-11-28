import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string;           // User ID
  email: string;         // User email
  roleCode: string;      // Role code, e.g. "ADMIN", "FOUNDER_SUPER_ADMIN", "EMPLOYEE", "STUDENT"
  fullName: string;      // User full name
  employeeId?: string;   // Employee ID if linked
  studentId?: string;    // Student ID if linked (Student Portal)
  employmentType?: string; // Employment type classification (FACULTY_TRAINER, INTERN, etc.)
  iat?: number;
  exp?: number;
}

@Injectable()
export class TokenService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresInSeconds: number;
  private readonly refreshExpiresInDays: number;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error(
        'FATAL: JWT_SECRET must be configured in environment and must be at least 32 characters long.',
      );
    }
    this.jwtSecret = secret;

    // Parse access token expiry (e.g., '15m', '1h', '7d', or numeric seconds)
    const rawExp = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    this.jwtExpiresInSeconds = this.parseDurationToSeconds(rawExp, 900); // default 15 minutes

    // Parse refresh token expiry in days
    const rawRefreshExp = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';
    this.refreshExpiresInDays = Math.max(
      1,
      Math.floor(this.parseDurationToSeconds(rawRefreshExp, 30 * 86400) / 86400),
    );
  }

  /**
   * Signs a JWT using HMAC SHA-256 with environment-based secret.
   */
  signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: now + this.jwtExpiresInSeconds,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));
    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64');
    const encodedSignature = this.base64ToBase64Url(signature);

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  }

  /**
   * Verifies and decodes an access token.
   * Throws UnauthorizedException if expired, invalid format, or signature mismatch.
   */
  verifyAccessToken(token: string): JwtPayload {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Invalid or missing authentication token.');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed authentication token structure.');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    // Verify HMAC-SHA256 signature
    const expectedSigRaw = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64');
    const expectedSignature = this.base64ToBase64Url(expectedSigRaw);

    // Constant-time buffer comparison to prevent timing attacks
    const sigBuffer = Buffer.from(encodedSignature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid token signature.');
    }

    // Decode and parse payload
    let payload: JwtPayload;
    try {
      payload = JSON.parse(this.base64UrlDecode(encodedPayload));
    } catch {
      throw new UnauthorizedException('Invalid token payload encoding.');
    }

    // Expiration verification
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) {
      throw new UnauthorizedException('Token has expired.');
    }

    return payload;
  }

  /**
   * Calculates the exact Date when a newly issued refresh token expires.
   */
  getRefreshTokenExpiryDate(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshExpiresInDays);
    return expiresAt;
  }

  getAccessTokenTtlSeconds(): number {
    return this.jwtExpiresInSeconds;
  }

  // --- Helper Encoders / Parsers ---

  private base64UrlEncode(str: string): string {
    return Buffer.from(str, 'utf8')
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  private base64ToBase64Url(base64: string): string {
    return base64
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  private base64UrlDecode(base64Url: string): string {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  private parseDurationToSeconds(duration: string, defaultSeconds: number): number {
    if (!duration || typeof duration !== 'string') return defaultSeconds;
    const trimmed = duration.trim().toLowerCase();
    const match = trimmed.match(/^(\d+)([smhd])?$/);
    if (!match) return defaultSeconds;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return value;
    }
  }
}
