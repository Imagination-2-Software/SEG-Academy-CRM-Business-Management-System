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

    // Explicit backward-compatible legacy role mappings without modifying production records:
    // Legacy roles mapping to unified EMPLOYEE category
    const legacyEmployeeRoles = ['EMPLOYEE_INTERN', 'TRAINER_FACULTY', 'TEAM_LEADER'];

    // Expand user roles with evaluated categories
    const effectiveUserRoles = new Set<string>(user.roles);
    if (user.roles.some((r) => legacyEmployeeRoles.includes(r))) {
      effectiveUserRoles.add('EMPLOYEE');
    }

    // 4. Verify whether user possesses at least one of the required roles
    // An endpoint requiring 'EMPLOYEE' accepts consolidated 'EMPLOYEE' as well as legacy staff roles
    const hasRole = requiredRoles.some((role) => {
      if (effectiveUserRoles.has(role)) {
        return true;
      }
      // If the route specifically requests legacy roles, handle gracefully
      if (role === 'EMPLOYEE' && user.roles.some((r) => legacyEmployeeRoles.includes(r))) {
        return true;
      }
      return false;
    });

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
