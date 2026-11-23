import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { RolesService, RoleWithPermissions } from './roles.service';
import { Permissions } from '../auth';

@ApiTags('Roles Management')
@ApiBearerAuth('bearer-jwt')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Permissions('roles:read')
  @Get()
  @ApiOperation({ summary: 'List all available system roles and their assigned permissions' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires roles:read permission' })
  async listRoles(): Promise<RoleWithPermissions[]> {
    return this.rolesService.listRoles();
  }
}
