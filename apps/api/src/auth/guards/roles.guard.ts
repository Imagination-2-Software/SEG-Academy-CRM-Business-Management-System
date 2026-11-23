import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY, IS_PUBLIC_KEY } from '../decorators/auth.decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Bypass check if route is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 2. Retrieve required roles from route metadata
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @Roles() decorator is defined, route allows any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Extract authenticated user attached by JwtAuthGuard
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user || !user.roles || user.roles.length === 0) {
      this.logger.warn('RolesGuard: Request does not contain an authenticated user.');
      throw new ForbiddenException('Access denied. Insufficient permissions.');
    }

    // FOUNDER_SUPER_ADMIN possesses universal superuser access across all endpoints
    if (user.roles.includes('FOUNDER_SUPER_ADMIN')) {
      return true;
    }

    // 4. Verify whether user possesses at least one of the required roles
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      this.logger.warn(
        `RolesGuard: User ${user.userId} (roles: [${user.roles.join(', ')}]) denied access. Required: [${requiredRoles.join(', ')}].`,
      );
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}.`,
      );
    }

    return true;
  }
}
