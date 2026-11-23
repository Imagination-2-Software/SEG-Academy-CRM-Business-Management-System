import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService, SafeUser, PaginatedUsersResponse } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  ReplaceUserRolesDto,
  QueryUsersDto,
} from './dto/users.dto';
import { Permissions, CurrentUser, AuthenticatedUser } from '../auth';

@ApiTags('User Management')
@ApiBearerAuth('bearer-jwt')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Permissions('users:read')
  @Get()
  @ApiOperation({ summary: 'List users with pagination, search and filters' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires users:read permission' })
  async listUsers(@Query() query: QueryUsersDto): Promise<PaginatedUsersResponse> {
    return this.usersService.listUsers(query);
  }

  @Permissions('users:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string): Promise<SafeUser> {
    return this.usersService.getUserById(id);
  }

  @Permissions('users:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new employee user account' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<SafeUser> {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.usersService.createUser(dto, actor, clientMeta);
  }

  @Permissions('users:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update non-sensitive user profile attributes' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<SafeUser> {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.usersService.updateUser(id, dto, actor, clientMeta);
  }

  @Permissions('users:manage_status')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update account status (activate, deactivate, or suspend)' })
  @ApiResponse({ status: 200, description: 'Status updated and sessions revoked if deactivated' })
  @ApiResponse({ status: 400, description: 'Self-deactivation prevented' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<SafeUser> {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.usersService.updateUserStatus(id, dto, actor, clientMeta);
  }

  @Permissions('users:manage_roles')
  @Put(':id/roles')
  @ApiOperation({ summary: 'Replace assigned roles for a user' })
  @ApiResponse({ status: 200, description: 'Role replaced and active sessions revoked' })
  @ApiResponse({ status: 400, description: 'Self-role escalation prevented' })
  @ApiResponse({ status: 403, description: 'Superuser role protection triggered' })
  async replaceUserRoles(
    @Param('id') id: string,
    @Body() dto: ReplaceUserRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<SafeUser> {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.usersService.replaceUserRoles(id, dto, actor, clientMeta);
  }

  @Permissions('users:read')
  @Get(':id/roles')
  @ApiOperation({ summary: 'Get assigned roles and permissions for a specific user' })
  @ApiResponse({ status: 200, description: 'User roles and permissions' })
  async getUserRoles(@Param('id') id: string): Promise<{ roles: any[] }> {
    return this.usersService.getUserRoles(id);
  }
}
