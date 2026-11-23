import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/**
 * Decorator to mark routes as publicly accessible, bypassing JwtAuthGuard.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/**
 * Decorator to restrict endpoints to specific role codes (e.g. 'ADMIN', 'FINANCE_MANAGER').
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const PERMISSIONS_KEY = 'permissions';
/**
 * Decorator to restrict endpoints to specific permissions.
 * Each permission can be specified as a string "resource:action" (e.g. "students:read")
 * or as an object { resource: string, action: string }.
 */
export interface RequiredPermission {
  resource: string;
  action: string;
}

export type PermissionInput = string | RequiredPermission;

export const Permissions = (...permissions: PermissionInput[]) => {
  const normalized: RequiredPermission[] = permissions.map((p) => {
    if (typeof p === 'string') {
      const [resource, action] = p.split(':');
      if (!resource || !action) {
        throw new Error(
          `Invalid permission string format: "${p}". Expected "resource:action" (e.g. "students:read").`,
        );
      }
      return { resource: resource.trim(), action: action.trim() };
    }
    return p;
  });
  return SetMetadata(PERMISSIONS_KEY, normalized);
};

export interface AuthenticatedUser {
  userId: string;
  email: string;
  fullName: string;
  role: {
    id: string;
    code: string;
    name: string;
  };
  roles: string[];           // Array of role codes (e.g. ['ADMIN'])
  permissions: string[];     // Array of "resource:action" (e.g. ['students:read', 'invoices:create'])
  employeeId?: string;
}

/**
 * Parameter decorator to extract the typed, sanitized authenticated user from the request.
 * Contains only non-sensitive identity, role, and permission data.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
