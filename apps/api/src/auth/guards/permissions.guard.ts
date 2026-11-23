import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  PERMISSIONS_KEY,
  IS_PUBLIC_KEY,
  RequiredPermission,
} from '../decorators/auth.decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

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

    // 2. Retrieve required permissions from metadata
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no @Permissions() decorator is defined, route allows any authenticated user
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 3. Extract authenticated user attached by JwtAuthGuard
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user || !user.permissions) {
      this.logger.warn('PermissionsGuard: Request does not contain an authenticated user.');
      throw new ForbiddenException('Access denied. Insufficient permissions.');
    }

    // FOUNDER_SUPER_ADMIN possesses universal superuser access across all permissions
    if (user.roles?.includes('FOUNDER_SUPER_ADMIN')) {
      return true;
    }

    // 4. Verify whether user possesses all required permissions (AND logic)
    // Permission format in user.permissions: "resource:action" (e.g. "students:read")
    const missingPermissions = requiredPermissions.filter((reqPerm) => {
      const formatted = `${reqPerm.resource}:${reqPerm.action}`;
      return !user.permissions.includes(formatted);
    });

    if (missingPermissions.length > 0) {
      const missingList = missingPermissions
        .map((p) => `${p.resource}:${p.action}`)
        .join(', ');
      this.logger.warn(
        `PermissionsGuard: User ${user.userId} denied access. Missing permissions: [${missingList}].`,
      );
      throw new ForbiddenException(
        `Access denied. Missing required permission(s): ${missingList}.`,
      );
    }

    return true;
  }
}
