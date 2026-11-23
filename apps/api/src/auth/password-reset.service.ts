import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { EmailService } from '../email/email.service';
import { TokenStorageService } from './token-storage.service';
import { AuditService } from '../audit/audit.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from './dto/password-reset.dto';

export interface GenericActionResponse {
  success: boolean;
  message: string;
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  // In-memory set of verified email addresses to demonstrate email verification flow
  // until User.emailVerified / User.status schema migration is performed.
  private readonly verifiedEmails = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly emailService: EmailService,
    private readonly tokenStorage: TokenStorageService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Request Password Reset Link.
   * Always returns a generic 200 response to prevent account enumeration.
   */
  async forgotPassword(
    dto: ForgotPasswordDto,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ): Promise<GenericActionResponse> {
    const email = dto.email.trim().toLowerCase();
    const genericResponse: GenericActionResponse = {
      success: true,
      message:
        'If an account with that email address exists, a password reset link has been sent.',
    };

    // 1. Rate Limiting: 60 seconds cooldown per email
    const rateLimitKey = `pwd_reset:${email}`;
    const allowed = this.tokenStorage.checkRateLimit(rateLimitKey, 60);
    if (!allowed) {
      throw new HttpException(
        'Too many password reset requests. Please wait before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Lookup user in database
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.logger.log(`Password reset requested for non-existing email: ${email}`);
      return genericResponse;
    }

    // Check account status
    if (user.status !== 'ACTIVE' && user.status !== 'INVITED') {
      this.logger.warn(`Password reset requested for non-active user ${user.id} (status: ${user.status})`);
      return genericResponse;
    }

    // 3. Generate high-entropy CSPRNG token (64 hex characters = 32 bytes)
    const rawToken = this.passwordService.generateRandomToken(32);
    const tokenHash = this.tokenStorage.hashToken(rawToken);

    // 4. Token expiry (configurable, default 15 minutes)
    const expiryMinutes = parseInt(
      this.configService.get<string>('PASSWORD_RESET_EXPIRES_MINUTES') || '15',
      10,
    );

    // 5. Store token hash
    await this.tokenStorage.storeToken(user.id, tokenHash, 'PASSWORD_RESET', expiryMinutes);

    // 6. Build reset link
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

    // 7. Render and send email
    const { text, html } = this.emailService.renderPasswordResetEmail(
      user.fullName,
      resetLink,
      expiryMinutes,
    );

    try {
      await this.emailService.sendMail({
        to: user.email,
        subject: 'Reset Your SEG CRM Password',
        text,
        html,
      });
    } catch (err: any) {
      this.logger.error(`Failed to send password reset email to ${user.email}: ${err.message}`);
      throw new HttpException('Email delivery failed. Please try again later.', HttpStatus.BAD_GATEWAY);
    }

    // 8. Audit log (Never log the raw token or token hash)
    await this.auditService.log({
      actorUserId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'users',
      resourceId: user.id,
      payload: { email: user.email },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return genericResponse;
  }

  /**
   * Reset Password Using Single-Use Token.
   * Hashes new password with Argon2id, revokes token, and invalidates all active sessions.
   */
  async resetPassword(
    dto: ResetPasswordDto,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ): Promise<GenericActionResponse> {
    const rawToken = dto.token.trim();
    const tokenHash = this.tokenStorage.hashToken(rawToken);

    // 1. Validate and consume token atomically
    const entry = await this.tokenStorage.consumeToken(tokenHash, 'PASSWORD_RESET');
    if (!entry) {
      throw new BadRequestException('Invalid, expired, or previously used password reset token.');
    }

    // 2. Fetch user
    const user = await this.prisma.user.findUnique({
      where: { id: entry.userId },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    // 3. Hash new password with Argon2id
    const newPasswordHash = await this.passwordService.hashPassword(dto.newPassword);

    // 4. Update user password and revoke all active refresh tokens in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke all active sessions
      await tx.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    this.logger.log(`Password reset successfully executed for user ${user.id}. All sessions revoked.`);

    // 5. Audit log
    await this.auditService.log({
      actorUserId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      resource: 'users',
      resourceId: user.id,
      payload: { sessionsRevoked: true },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return {
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }

  /**
   * Send Email Verification Link.
   */
  async sendEmailVerification(
    email: string,
    fullName: string,
    userId: string,
  ): Promise<void> {
    const rawToken = this.passwordService.generateRandomToken(32);
    const tokenHash = this.tokenStorage.hashToken(rawToken);

    const expiryHours = parseInt(
      this.configService.get<string>('EMAIL_VERIFICATION_EXPIRES_HOURS') || '24',
      10,
    );

    await this.tokenStorage.storeToken(userId, tokenHash, 'EMAIL_VERIFICATION', expiryHours * 60);

    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const verifyLink = `${baseUrl}/verify-email?token=${rawToken}`;

    const { text, html } = this.emailService.renderEmailVerificationEmail(
      fullName,
      verifyLink,
      expiryHours,
    );

    await this.emailService.sendMail({
      to: email,
      subject: 'Verify Your SEG CRM Email Address',
      text,
      html,
    });
  }

  /**
   * Verify Email Address Using Single-Use Token.
   */
  async verifyEmail(
    dto: VerifyEmailDto,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ): Promise<GenericActionResponse> {
    const rawToken = dto.token.trim();
    const tokenHash = this.tokenStorage.hashToken(rawToken);

    // 1. Validate and consume token atomically
    const entry = await this.tokenStorage.consumeToken(tokenHash, 'EMAIL_VERIFICATION');
    if (!entry) {
      throw new BadRequestException('Invalid, expired, or previously used email verification token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: entry.userId },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired email verification token.');
    }

    // 2. Prevent downgrade if already verified
    if (this.verifiedEmails.has(user.email)) {
      return {
        success: true,
        message: 'Email is already verified.',
      };
    }

    // 3. Mark as verified
    this.verifiedEmails.add(user.email);

    // If account was INVITED, activate it
    if (user.status === 'INVITED') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE' },
      });
    }

    // 4. Audit log
    await this.auditService.log({
      actorUserId: user.id,
      action: 'EMAIL_VERIFIED',
      resource: 'users',
      resourceId: user.id,
      payload: { email: user.email },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return {
      success: true,
      message: 'Email address has been verified successfully.',
    };
  }

  /**
   * Resend Email Verification Link.
   * Applies rate limiting (60s) and generic responses to prevent enumeration.
   */
  async resendVerification(
    dto: ResendVerificationDto,
  ): Promise<GenericActionResponse> {
    const email = dto.email.trim().toLowerCase();
    const genericResponse: GenericActionResponse = {
      success: true,
      message:
        'If an unverified account with that email exists, a new verification link has been sent.',
    };

    // 1. Rate limiting (60s)
    const rateLimitKey = `resend_verify:${email}`;
    const allowed = this.tokenStorage.checkRateLimit(rateLimitKey, 60);
    if (!allowed) {
      throw new HttpException(
        'Too many verification requests. Please wait before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Lookup user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return genericResponse;
    }

    // Check if already verified
    if (this.verifiedEmails.has(user.email)) {
      return {
        success: true,
        message: 'Your email address is already verified.',
      };
    }

    // 3. Send verification
    try {
      await this.sendEmailVerification(user.email, user.fullName, user.id);
    } catch (err: any) {
      this.logger.error(`Failed to dispatch email verification to ${user.email}: ${err.message}`);
      throw new HttpException('Email delivery failed. Please try again later.', HttpStatus.BAD_GATEWAY);
    }

    return genericResponse;
  }

  /**
   * Helper to check verification status
   */
  isEmailVerified(email: string): boolean {
    return this.verifiedEmails.has(email.toLowerCase());
  }
}
