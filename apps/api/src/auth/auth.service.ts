import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService, JwtPayload } from './token.service';
import { LoginDto } from './dto/auth.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: {
      id: string;
      code: string;
      name: string;
    };
    employeeId?: string;
  };
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Authenticates user with email and password.
   * Throws generic UnauthorizedException without disclosing whether email or password was wrong.
   */
  async login(
    dto: LoginDto,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Look up user with Role and Employee profile
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        role: true,
        employee: {
          select: { id: true },
        },
      },
    });

    // If user not found, perform dummy hash verification to prevent timing side-channel attacks
    if (!user) {
      await this.passwordService.verifyPassword(
        '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$dGVzdGhhc2h2YWx1ZXRvcHJldmVudHRpbWluZ2F0dGFjaw',
        dto.password,
      );
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Verify account status
    if (user.status !== 'ACTIVE') {
      this.logger.warn(`Login rejected: User ${user.id} account status is ${user.status}.`);
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Verify password using Argon2id
    const isPasswordValid = await this.passwordService.verifyPassword(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for user ${user.id}.`);
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT Access Token
    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      roleCode: user.role.code,
      fullName: user.fullName,
      employeeId: user.employee?.id,
    };

    const accessToken = this.tokenService.signAccessToken(jwtPayload);

    // Generate Opaque Cryptographically Secure Refresh Token
    const rawRefreshToken = this.passwordService.generateRandomToken(32);
    const tokenHash = this.passwordService.hashToken(rawRefreshToken);
    const expiresAt = this.tokenService.getRefreshTokenExpiryDate();

    // Persist SHA-256 hashed refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: {
          id: user.role.id,
          code: user.role.code,
          name: user.role.name,
        },
        employeeId: user.employee?.id,
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        tokenType: 'Bearer',
        expiresIn: this.tokenService.getAccessTokenTtlSeconds(),
      },
    };
  }

  /**
   * Refreshes access token with full refresh token rotation.
   * Detects reuse/replay attacks: if a revoked token is presented, all user sessions are revoked!
   */
  async refreshTokens(
    rawRefreshToken: string,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthTokens> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const tokenHash = this.passwordService.hashToken(rawRefreshToken);

    // Look up token record
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            role: true,
            employee: { select: { id: true } },
          },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    // AUTOMATIC REPLAY DETECTION:
    // If an already-revoked refresh token is reused, assume token theft!
    if (storedToken.isRevoked) {
      this.logger.error(
        `SECURITY ALERT: Replay attack detected for user ${storedToken.userId}! Revoking ALL active refresh tokens for user.`,
      );
      // Invalidate all tokens for this compromised user
      await this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { isRevoked: true },
      });
      throw new ForbiddenException(
        'Suspicious session activity detected. Please log in again.',
      );
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
      // Mark as revoked
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Refresh token has expired.');
    }

    // Check user active status
    if (storedToken.user.status !== 'ACTIVE') {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('User account is inactive.');
    }

    // ROTATION: Revoke the presented refresh token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new access token
    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: storedToken.user.id,
      email: storedToken.user.email,
      roleCode: storedToken.user.role.code,
      fullName: storedToken.user.fullName,
      employeeId: storedToken.user.employee?.id,
    };
    const newAccessToken = this.tokenService.signAccessToken(jwtPayload);

    // Generate and persist new rotated refresh token
    const newRawRefreshToken = this.passwordService.generateRandomToken(32);
    const newTokenHash = this.passwordService.hashToken(newRawRefreshToken);
    const newExpiresAt = this.tokenService.getRefreshTokenExpiryDate();

    await this.prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: newTokenHash,
        expiresAt: newExpiresAt,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.tokenService.getAccessTokenTtlSeconds(),
    };
  }

  /**
   * Logs out user by revoking the presented refresh token.
   */
  async logout(rawRefreshToken: string): Promise<{ success: boolean; message: string }> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      return { success: true, message: 'Session logged out.' };
    }

    const tokenHash = this.passwordService.hashToken(rawRefreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, isRevoked: false },
      data: { isRevoked: true },
    });

    return { success: true, message: 'Session logged out successfully.' };
  }

  /**
   * Revokes all active refresh tokens for a user (e.g., on password change or security reset).
   */
  async revokeAllUserSessions(userId: string): Promise<{ revokedCount: number }> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { revokedCount: result.count };
  }
}
