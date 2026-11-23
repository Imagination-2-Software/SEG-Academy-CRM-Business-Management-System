"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = exports.Permissions = exports.PERMISSIONS_KEY = exports.Roles = exports.ROLES_KEY = exports.Public = exports.IS_PUBLIC_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.IS_PUBLIC_KEY = 'isPublic';
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;
exports.ROLES_KEY = 'roles';
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
exports.PERMISSIONS_KEY = 'permissions';
const Permissions = (...permissions) => {
    const normalized = permissions.map((p) => {
        if (typeof p === 'string') {
            const [resource, action] = p.split(':');
            if (!resource || !action) {
                throw new Error(`Invalid permission string format: "${p}". Expected "resource:action" (e.g. "students:read").`);
            }
            return { resource: resource.trim(), action: action.trim() };
        }
        return p;
    });
    return (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, normalized);
};
exports.Permissions = Permissions;
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user)
        return undefined;
    return data ? user[data] : user;
});
//# sourceMappingURL=auth.decorators.js.map