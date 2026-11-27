import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService, AuthResponse, AuthTokens } from './auth.service';
import { PasswordResetService, GenericActionResponse } from './password-reset.service';
import { LoginDto, RefreshTokenDto, LogoutDto } from './dto/auth.dto';
import { SetupFounderDto } from './dto/setup-founder.dto';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from './dto/password-reset.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public, CurrentUser, AuthenticatedUser } from './decorators/auth.decorators';
import { RateLimit } from '../common/rate-limiting/rate-limit.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Public()
  @RateLimit({ limit: 5, ttlSeconds: 60, name: 'auth:setup-status', keyPrefix: 'auth_setup_status' })
  @Get('setup-status')
  @ApiOperation({ summary: 'Check if the initial Founder account has been setup' })
  @ApiResponse({ status: 200, description: 'Initialization status returned' })
  async getSetupStatus(): Promise<{ initialized: boolean; message: string }> {
    return this.authService.getSetupStatus();
  }

  @Public()
  @RateLimit({ limit: 3, ttlSeconds: 60, name: 'auth:setup-founder', keyPrefix: 'auth_setup_founder' })
  @Post('setup-founder')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'One-time bootstrap setup for initial Founder / Super Admin account' })
  @ApiResponse({ status: 201, description: 'Founder account initialized and tokens issued' })
  @ApiResponse({ status: 403, description: 'System already initialized. Forbidden.' })
  @ApiResponse({ status: 409, description: 'User with email already exists' })
  async setupFounder(
    @Body() dto: SetupFounderDto,
    @Req() req: Request,
  ): Promise<AuthResponse> {
    const metadata = {
      userAgent: req.headers['user-agent'] as string | undefined,
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
    };
    return this.authService.setupFounder(dto, metadata);
  }

  @Public()
  @RateLimit({ limit: 5, ttlSeconds: 60, name: 'auth:login', keyPrefix: 'auth_login' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and issue access and refresh tokens' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 429, description: 'Too many login attempts. Rate limit exceeded.' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponse> {
    const metadata = {
      userAgent: req.headers['user-agent'] as string | undefined,
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
    };
    return this.authService.login(dto, metadata);
  }

  @Public()
  @RateLimit({ limit: 10, ttlSeconds: 60, name: 'auth:refresh', keyPrefix: 'auth_refresh' })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiResponse({ status: 403, description: 'Refresh token reuse/replay detected' })
  @ApiResponse({ status: 429, description: 'Too many refresh requests. Rate limit exceeded.' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<AuthTokens> {
    const metadata = {
      userAgent: req.headers['user-agent'] as string | undefined,
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
    };
    return this.authService.refreshTokens(dto.refreshToken, metadata);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke active refresh token session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Body() dto: LogoutDto): Promise<{ success: boolean; message: string }> {
    return this.authService.logout(dto.refreshToken);
  }

  @Public()
  @RateLimit({ limit: 3, ttlSeconds: 60, name: 'auth:forgot-password', keyPrefix: 'auth_forgot' })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiResponse({ status: 200, description: 'Generic response regardless of email existence' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<GenericActionResponse> {
    const metadata = {
      userAgent: req.headers['user-agent'] as string | undefined,
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
    };
    return this.passwordResetService.forgotPassword(dto, metadata);
  }

  @Public()
  @RateLimit({ limit: 5, ttlSeconds: 60, name: 'auth:reset-password', keyPrefix: 'auth_reset' })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using high-entropy single-use token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully and sessions revoked' })
  @ApiResponse({ status: 400, description: 'Invalid, expired, or reused token' })
  @ApiResponse({ status: 429, description: 'Too many reset attempts. Rate limit exceeded.' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<GenericActionResponse> {
    const metadata = {
      userAgent: req.headers['user-agent'] as string | undefined,
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
    };
    return this.passwordResetService.resetPassword(dto, metadata);
  }

  @Public()
  @RateLimit({ limit: 5, ttlSeconds: 60, name: 'auth:verify-email', keyPrefix: 'auth_verify' })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using single-use verification token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid, expired, or reused token' })
  @ApiResponse({ status: 429, description: 'Too many verification attempts. Rate limit exceeded.' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request,
  ): Promise<GenericActionResponse> {
    const metadata = {
      userAgent: req.headers['user-agent'] as string | undefined,
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
    };
    return this.passwordResetService.verifyEmail(dto, metadata);
  }

  @Public()
  @RateLimit({ limit: 3, ttlSeconds: 60, name: 'auth:resend-verification', keyPrefix: 'auth_resend' })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({ status: 200, description: 'Generic response regardless of email existence' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<GenericActionResponse> {
    return this.passwordResetService.resendVerification(dto);
  }

  @RateLimit({ limit: 5, ttlSeconds: 60, name: 'auth:change-password', keyPrefix: 'auth_change_pwd' })
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Incorrect current password or unauthenticated' })
  @ApiResponse({ status: 429, description: 'Too many change password attempts. Rate limit exceeded.' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const metadata = {
      userAgent: req.headers['user-agent'] as string | undefined,
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      currentRefreshToken: req.headers['x-refresh-token'] as string | undefined,
    };
    return this.authService.changePassword(
      actor.userId,
      dto.currentPassword,
      dto.newPassword,
      metadata,
    );
  }
}
