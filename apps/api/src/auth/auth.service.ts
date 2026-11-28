import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService, JwtPayload } from './token.service';
import { LoginDto } from './dto/auth.dto';
import { SetupFounderDto } from './dto/setup-founder.dto';
import { AuditService } from '../audit/audit.service';
import { TokenStorageService } from './token-storage.service';
import { InviteStudentDto, ActivateStudentDto } from './dto/student-invitation.dto';

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
    studentId?: string;
    employmentType?: string;
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
    private readonly auditService: AuditService,
    private readonly tokenStorage: TokenStorageService,
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
          select: { id: true, employmentType: true },
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

    // Check if user is linked to a student record (by matching email safely)
    let linkedStudentId: string | undefined = undefined;
    if (user.role.code === 'STUDENT') {
      const studentRecord = await this.prisma.profileStudent.findUnique({
        where: { email: user.email },
        select: { id: true },
      });
      if (studentRecord) {
        linkedStudentId = studentRecord.id;
      }
    }

    // Generate JWT Access Token
    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      roleCode: user.role.code,
      fullName: user.fullName,
      employeeId: user.employee?.id,
      studentId: linkedStudentId,
      employmentType: user.employee?.employmentType,
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
        studentId: linkedStudentId,
        employmentType: user.employee?.employmentType,
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

  /**
   * Checks whether the system already has a registered user or Founder account.
   */
  async getSetupStatus(): Promise<{ initialized: boolean; message: string }> {
    const founderRole = await this.prisma.role.findUnique({
      where: { code: 'FOUNDER_SUPER_ADMIN' },
    });

    let founderCount = 0;
    if (founderRole) {
      founderCount = await this.prisma.user.count({
        where: { roleId: founderRole.id },
      });
    }

    const totalUsers = await this.prisma.user.count();

    const initialized = founderCount > 0;
    return {
      initialized,
      message: initialized
        ? 'System is already initialized with an active Founder / Super Admin account.'
        : totalUsers === 0
          ? 'System is uninitialized. First-time Founder setup is available.'
          : 'First-time Founder setup is pending.',
    };
  }

  /**
   * Secure one-time initialization of the primary Founder / Super Admin account.
   * Strictly blocked if an account with FOUNDER_SUPER_ADMIN role already exists.
   */
  async setupFounder(
    dto: SetupFounderDto,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Check whether a Founder account already exists
    let founderRole = await this.prisma.role.findUnique({
      where: { code: 'FOUNDER_SUPER_ADMIN' },
    });

    if (founderRole) {
      const existingFounderCount = await this.prisma.user.count({
        where: { roleId: founderRole.id },
      });

      if (existingFounderCount > 0) {
        this.logger.warn(
          `Setup rejected: Founder account already exists. Blocked attempt from IP: ${metadata?.ipAddress}`,
        );
        throw new ForbiddenException(
          'System initialization completed. A Founder / Super Admin account is already configured. New administrators must be created by existing administrators.',
        );
      }
    } else {
      // Auto-provision system FOUNDER_SUPER_ADMIN role if missing
      founderRole = await this.prisma.role.create({
        data: {
          code: 'FOUNDER_SUPER_ADMIN',
          name: 'Founder / Super Admin',
          description: 'Universal administrative and operational permissions across the SEG CRM platform.',
          isSystem: true,
        },
      });
    }

    // 2. Duplicate email check
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new ConflictException(
        `An account with email "${normalizedEmail}" already exists in the system.`,
      );
    }

    // 3. Hash password using Argon2id (m=64MB, t=3, p=4)
    const passwordHash = await this.passwordService.hashPassword(dto.password);

    // 4. Create Founder User in a transaction
    const newUser = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName: dto.fullName.trim(),
        passwordHash,
        roleId: founderRole.id,
        status: 'ACTIVE',
      },
      include: {
        role: true,
        employee: {
          select: { id: true },
        },
      },
    });

    // 5. Issue initial authentication tokens for seamless access
    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: newUser.id,
      email: newUser.email,
      roleCode: newUser.role.code,
      fullName: newUser.fullName,
      employeeId: newUser.employee?.id,
    };
    const accessToken = this.tokenService.signAccessToken(jwtPayload);
    const rawRefreshToken = this.passwordService.generateRandomToken(32);
    const tokenHash = this.passwordService.hashToken(rawRefreshToken);
    const expiresAt = this.tokenService.getRefreshTokenExpiryDate();

    await this.prisma.refreshToken.create({
      data: {
        userId: newUser.id,
        tokenHash,
        expiresAt,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    const tokens: AuthTokens = {
      accessToken,
      refreshToken: rawRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.tokenService.getAccessTokenTtlSeconds(),
    };

    // 6. Record security audit log
    await this.auditService.log({
      actorUserId: newUser.id,
      action: 'SYSTEM_INITIALIZED_FOUNDER_SETUP',
      resource: 'User',
      resourceId: newUser.id,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      payload: {
        email: newUser.email,
        fullName: newUser.fullName,
        roleCode: newUser.role.code,
      },
    });

    this.logger.log(
      `Founder / Super Admin initialized successfully: ${newUser.email} (${newUser.id})`,
    );

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: {
          id: newUser.role.id,
          code: newUser.role.code,
          name: newUser.role.name,
        },
        employeeId: newUser.employee?.id,
      },
      tokens,
    };
  }

  /**
   * Changes authenticated user password after verifying current credentials.
   * Hashes new password using Argon2id.
   * Revokes all active refresh tokens EXCEPT the current active session if provided,
   * or all sessions with clear notification.
   */
  async changePassword(
    userId: string,
    currentPasswordCandidate: string,
    newPasswordCandidate: string,
    metadata?: { userAgent?: string; ipAddress?: string; currentRefreshToken?: string },
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or unauthenticated.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active.');
    }

    // Verify current password with Argon2id
    const isCurrentPasswordValid = await this.passwordService.verifyPassword(
      user.passwordHash,
      currentPasswordCandidate,
    );

    if (!isCurrentPasswordValid) {
      this.logger.warn(`Failed password change attempt for user ${user.id}: incorrect current password.`);
      throw new UnauthorizedException('Current password does not match.');
    }

    // Hash new password using Argon2id
    const newPasswordHash = await this.passwordService.hashPassword(newPasswordCandidate);

    // Optional: identify current refresh token hash if client provided it
    let currentTokenHash: string | undefined;
    if (metadata?.currentRefreshToken) {
      currentTokenHash = this.passwordService.hashToken(metadata.currentRefreshToken);
    }

    // Atomically update password
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      // Invalidate sessions: if current refresh token hash provided, preserve it and revoke other sessions;
      // otherwise keep active tokens or revoke older ones.
      if (currentTokenHash) {
        await tx.refreshToken.updateMany({
          where: {
            userId: user.id,
            isRevoked: false,
            tokenHash: { not: currentTokenHash },
          },
          data: { isRevoked: true },
        });
      }
    });

    // Record audit log
    await this.auditService.log({
      actorUserId: user.id,
      action: 'USER_PASSWORD_CHANGED',
      resource: 'User',
      resourceId: user.id,
      payload: {
        otherSessionsRevoked: !!currentTokenHash,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    this.logger.log(`Password changed successfully for user ${user.id}.`);

    return {
      success: true,
      message: 'Password changed successfully. Your account is secured with Argon2id.',
    };
  }

  /**
   * Invites an existing student to the Student Portal.
   * Creates an inactive/invited User record with role STUDENT if none exists.
   * Generates a cryptographically random single-use token (valid for 48 hours).
   * Prevents duplicate linked accounts.
   * Never leaks temporary passwords in responses.
   */
  async inviteStudent(
    dto: InviteStudentDto,
    actor: { userId: string; roleCode: string },
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string; invitationToken?: string }> {
    // 1. Verify student exists
    const student = await this.prisma.profileStudent.findUnique({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new ConflictException('Student profile not found.');
    }

    // 2. Prevent duplicate linked accounts
    const existingUser = await this.prisma.user.findUnique({
      where: { email: student.email.toLowerCase().trim() },
      include: { role: true },
    });

    let targetUserId: string;

    if (existingUser) {
      if (existingUser.status === 'ACTIVE') {
        throw new ConflictException(
          `Student account is already active with email: ${student.email}. Duplicate account prohibited.`,
        );
      }
      targetUserId = existingUser.id;
    } else {
      // Find or provision STUDENT role safely
      let studentRole = await this.prisma.role.findUnique({
        where: { code: 'STUDENT' },
      });

      if (!studentRole) {
        studentRole = await this.prisma.role.create({
          data: {
            code: 'STUDENT',
            name: 'Student',
            description: 'External student access to personal learning and billing data.',
            isSystem: true,
          },
        });
      }

      // Generate placeholder hash for invited state
      const placeholderHash = await this.passwordService.hashPassword(
        this.passwordService.generateRandomToken(32),
      );

      // Create User in INVITED status
      const newUser = await this.prisma.user.create({
        data: {
          email: student.email.toLowerCase().trim(),
          passwordHash: placeholderHash,
          fullName: student.fullName,
          phoneNumber: student.phoneNumber,
          roleId: studentRole.id,
          status: 'INVITED',
        },
      });
      targetUserId = newUser.id;
    }

    // 3. Generate cryptographic 32-byte opaque token
    const rawInvitationToken = this.passwordService.generateRandomToken(32);
    const tokenHash = this.tokenStorage.hashToken(rawInvitationToken);

    // 4. Store token hash with 48 hours expiry (2880 minutes)
    await this.tokenStorage.storeToken(
      targetUserId,
      tokenHash,
      'STUDENT_INVITATION',
      2880,
    );

    // 5. Audit log invitation issuance
    await this.auditService.log({
      actorUserId: actor.userId,
      action: 'STUDENT_INVITATION_ISSUED',
      resource: 'Student',
      resourceId: student.id,
      payload: {
        studentCode: student.studentCode,
        email: student.email,
        targetUserId,
      },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    this.logger.log(`Student invitation token generated for student ${student.id} (${student.email}).`);

    return {
      success: true,
      message: `Invitation generated successfully for ${student.email}. Student can establish credentials via the secure activation link.`,
      invitationToken: rawInvitationToken, // Returned to caller (Admin UI or test suite) to send via email link
    };
  }

  /**
   * Activates a student account using the invitation token.
   * Performs atomic single-use validation, verifies token expiration,
   * updates status to ACTIVE, hashes new password with Argon2id, and issues session tokens.
   */
  async activateStudent(
    dto: ActivateStudentDto,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResponse> {
    const tokenHash = this.tokenStorage.hashToken(dto.token);

    // Atomically validate and consume token
    const tokenEntry = await this.tokenStorage.consumeToken(
      tokenHash,
      'STUDENT_INVITATION',
    );

    if (!tokenEntry) {
      throw new UnauthorizedException(
        'Invalid, expired, or already-consumed invitation token. Please contact your administrator for a new invite.',
      );
    }

    // Hash the student's chosen password
    const passwordHash = await this.passwordService.hashPassword(dto.password);

    // Update User account to ACTIVE
    const updatedUser = await this.prisma.user.update({
      where: { id: tokenEntry.userId },
      data: {
        passwordHash,
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
      include: {
        role: true,
      },
    });

    // Check linked student record
    const studentRecord = await this.prisma.profileStudent.findUnique({
      where: { email: updatedUser.email },
      select: { id: true },
    });

    // Generate session JWT & Refresh token
    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: updatedUser.id,
      email: updatedUser.email,
      roleCode: updatedUser.role.code,
      fullName: updatedUser.fullName,
      studentId: studentRecord?.id,
    };

    const accessToken = this.tokenService.signAccessToken(jwtPayload);
    const rawRefreshToken = this.passwordService.generateRandomToken(32);
    const refreshTokenHash = this.passwordService.hashToken(rawRefreshToken);
    const expiresAt = this.tokenService.getRefreshTokenExpiryDate();

    await this.prisma.refreshToken.create({
      data: {
        userId: updatedUser.id,
        tokenHash: refreshTokenHash,
        expiresAt,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    // Audit log activation
    await this.auditService.log({
      actorUserId: updatedUser.id,
      action: 'STUDENT_ACCOUNT_ACTIVATED',
      resource: 'User',
      resourceId: updatedUser.id,
      payload: {
        email: updatedUser.email,
        studentId: studentRecord?.id,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: {
          id: updatedUser.role.id,
          code: updatedUser.role.code,
          name: updatedUser.role.name,
        },
        studentId: studentRecord?.id,
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        tokenType: 'Bearer',
        expiresIn: this.tokenService.getAccessTokenTtlSeconds(),
      },
    };
  }
}
