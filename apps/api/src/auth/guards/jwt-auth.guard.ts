import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TokenService } from '../token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY, AuthenticatedUser } from '../decorators/auth.decorators';

// Extend Express Request to type request.user
declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 2. Extract Authorization header
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header.');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Invalid Authorization format. Expected: Bearer <token>',
      );
    }

    // 3. Verify JWT cryptographically using TokenService (HS256)
    const payload = this.tokenService.verifyAccessToken(token);

    // 4. Authoritative Database Lookup (Zero-Trust Model)
    // Never trust client-supplied role or permission claims in the JWT payload alone!
    // Fetch live user status, role, and assigned permissions from PostgreSQL via Prisma.
    const userRecord = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        employee: {
          select: { id: true },
        },
      },
    });

    if (!userRecord) {
      this.logger.warn(`JwtAuthGuard: User ${payload.sub} no longer exists in database.`);
      throw new UnauthorizedException('User account no longer exists.');
    }

    if (userRecord.status !== 'ACTIVE') {
      this.logger.warn(
        `JwtAuthGuard: User ${userRecord.id} account is currently ${userRecord.status}.`,
      );
      throw new UnauthorizedException('User account is inactive or suspended.');
    }

    // 5. Flatten permissions into array of "resource:action" strings
    const permissions: string[] = userRecord.role.permissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`,
    );

    // 6. Build typed, sanitized AuthenticatedUser (never exposing passwordHash or secret fields)
    const authenticatedUser: AuthenticatedUser = {
      userId: userRecord.id,
      email: userRecord.email,
      fullName: userRecord.fullName,
      role: {
        id: userRecord.role.id,
        code: userRecord.role.code,
        name: userRecord.role.name,
      },
      roles: [userRecord.role.code],
      permissions,
      employeeId: userRecord.employee?.id,
    };

    // Attach to request context
    request.user = authenticatedUser;

    return true;
  }
}
