import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { OrganizationService } from './organization.service';
import {
  CreateDepartmentDto,
  CreateTeamDto,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  UpdateEmployeeStatusDto,
  QueryEmployeesDto,
} from './dto';
import { Permissions, CurrentUser, AuthenticatedUser } from '../auth';

@ApiTags('Organization Management')
@ApiBearerAuth('bearer-jwt')
@Controller()
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // ==========================================
  // DEPARTMENTS
  // ==========================================

  @Permissions('users:read')
  @Get('departments')
  @ApiOperation({ summary: 'List all departments with team and employee counts' })
  @ApiResponse({ status: 200, description: 'Departments list' })
  async getDepartments() {
    return this.organizationService.getDepartments();
  }

  @Permissions('users:read')
  @Get('departments/:id')
  @ApiOperation({ summary: 'Get department details by ID' })
  @ApiResponse({ status: 200, description: 'Department details' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async getDepartmentById(@Param('id') id: string) {
    return this.organizationService.getDepartmentById(id);
  }

  @Permissions('users:create')
  @Post('departments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new department' })
  @ApiResponse({ status: 201, description: 'Department created successfully' })
  @ApiResponse({ status: 409, description: 'Department name or code conflict' })
  async createDepartment(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.organizationService.createDepartment(dto, actor, clientMeta);
  }

  // ==========================================
  // TEAMS
  // ==========================================

  @Permissions('users:read')
  @Get('teams')
  @ApiOperation({ summary: 'List teams, optionally filtered by department' })
  @ApiResponse({ status: 200, description: 'Teams list' })
  async getTeams(@Query('departmentId') departmentId?: string) {
    return this.organizationService.getTeams(departmentId);
  }

  @Permissions('users:read')
  @Get('teams/:id')
  @ApiOperation({ summary: 'Get team details by ID' })
  @ApiResponse({ status: 200, description: 'Team details' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async getTeamById(@Param('id') id: string) {
    return this.organizationService.getTeamById(id);
  }

  @Permissions('users:create')
  @Post('teams')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new team under a department' })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  @ApiResponse({ status: 409, description: 'Team code or name conflict within department' })
  async createTeam(
    @Body() dto: CreateTeamDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.organizationService.createTeam(dto, actor, clientMeta);
  }

  // ==========================================
  // EMPLOYEES & INTERNS
  // ==========================================

  @Permissions('users:read')
  @Get('employees')
  @ApiOperation({ summary: 'List employees with pagination, search and filters' })
  @ApiResponse({ status: 200, description: 'Paginated employee list' })
  async getEmployees(@Query() query: QueryEmployeesDto) {
    return this.organizationService.getEmployees(query);
  }

  @Permissions('users:read')
  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee details by ID' })
  @ApiResponse({ status: 200, description: 'Employee details' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async getEmployeeById(@Param('id') id: string) {
    return this.organizationService.getEmployeeById(id);
  }

  @Permissions('users:create')
  @Post('employees')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register and onboard a new employee' })
  @ApiResponse({ status: 201, description: 'Employee created and user account registered' })
  @ApiResponse({ status: 409, description: 'Email or employee code conflict' })
  async createEmployee(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.organizationService.createEmployee(dto, actor, clientMeta);
  }

  @Permissions('users:update')
  @Patch('employees/:id')
  @ApiOperation({ summary: 'Update an employee profile' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.organizationService.updateEmployee(id, dto, actor, clientMeta);
  }

  @Permissions('users:update')
  @Patch('employees/:id/status')
  @ApiOperation({ summary: 'Update employee account status' })
  @ApiResponse({ status: 200, description: 'Employee account status updated' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async updateEmployeeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.organizationService.updateEmployeeStatus(id, dto, actor, clientMeta);
  }
}
