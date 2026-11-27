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
import { TasksService, PaginatedTasksResult } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskStatusDto,
  AssignTaskDto,
  QueryTasksDto,
  CreateTaskSubmissionDto,
  CreateSubmissionReviewDto,
} from './dto';
import { Permissions, CurrentUser, AuthenticatedUser } from '../auth';

@ApiTags('Tasks & Workflow Management')
@ApiBearerAuth('bearer-jwt')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Permissions('tasks:read')
  @Get()
  @ApiOperation({ summary: 'List tasks with pagination, filters and search' })
  @ApiResponse({ status: 200, description: 'Paginated list of tasks' })
  async getTasks(
    @Query() query: QueryTasksDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PaginatedTasksResult> {
    return this.tasksService.getTasks(query, actor);
  }

  @Permissions('tasks:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get detailed task record by ID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTaskById(@Param('id') id: string) {
    return this.tasksService.getTaskById(id);
  }

  @Permissions('tasks:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new internal task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async createTask(
    @Body() dto: CreateTaskDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.tasksService.createTask(dto, actor, clientMeta);
  }

  @Permissions('tasks:update')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update workflow status of a task' })
  @ApiResponse({ status: 200, description: 'Task status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Not authorized to change this task status' })
  async updateTaskStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.tasksService.updateTaskStatus(id, dto, actor, clientMeta);
  }

  @Permissions('tasks:update')
  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign or reassign a task to an employee' })
  @ApiResponse({ status: 200, description: 'Task assignment updated' })
  @ApiResponse({ status: 404, description: 'Task or assignee not found' })
  async assignTask(
    @Param('id') id: string,
    @Body() dto: AssignTaskDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.tasksService.assignTask(id, dto, actor, clientMeta);
  }

  @Permissions('tasks:update')
  @Post(':id/submissions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit deliverable or progress notes for evaluation' })
  @ApiResponse({ status: 201, description: 'Submission recorded, task status set to UNDER_REVIEW' })
  @ApiResponse({ status: 403, description: 'Only assigned employee can submit work' })
  async createSubmission(
    @Param('id') id: string,
    @Body() dto: CreateTaskSubmissionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.tasksService.createSubmission(id, dto, actor, clientMeta);
  }

  @Permissions('tasks:review')
  @Post(':id/submissions/:submissionId/reviews')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate and review a task submission' })
  @ApiResponse({ status: 200, description: 'Review recorded, task status updated accordingly' })
  @ApiResponse({ status: 403, description: 'Self-review strictly prohibited' })
  async reviewSubmission(
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: CreateSubmissionReviewDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.tasksService.reviewSubmission(id, submissionId, dto, actor, clientMeta);
  }
}
