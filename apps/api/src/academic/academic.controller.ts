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
import { AcademicService } from './academic.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  QueryCoursesDto,
  CreateBatchDto,
  UpdateBatchDto,
  QueryBatchesDto,
  CreateEnrolmentDto,
  UpdateEnrolmentStatusDto,
  QueryEnrolmentsDto,
} from './dto/academic.dto';
import { Permissions, CurrentUser, AuthenticatedUser } from '../auth';

@ApiTags('Academic Operations (Courses, Batches, Enrolments)')
@ApiBearerAuth('bearer-jwt')
@Controller()
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // ---------------------------------------------------------------------------
  // COURSES
  // ---------------------------------------------------------------------------

  @Permissions('courses:create')
  @Post('courses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new course catalog offering' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  @ApiResponse({ status: 409, description: 'Course code already exists' })
  async createCourse(
    @Body() dto: CreateCourseDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.academicService.createCourse(dto, actor, clientMeta);
  }

  @Permissions('courses:read')
  @Get('courses')
  @ApiOperation({ summary: 'List and filter courses' })
  @ApiResponse({ status: 200, description: 'Paginated courses list' })
  async listCourses(@Query() query: QueryCoursesDto) {
    return this.academicService.listCourses(query);
  }

  @Permissions('courses:read')
  @Get('courses/:id')
  @ApiOperation({ summary: 'Get course details with associated batches' })
  @ApiResponse({ status: 200, description: 'Course details' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseById(@Param('id') id: string) {
    return this.academicService.getCourseById(id);
  }

  @Permissions('courses:update')
  @Patch('courses/:id')
  @ApiOperation({ summary: 'Update course details and pricing' })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  async updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.academicService.updateCourse(id, dto, actor, clientMeta);
  }

  // ---------------------------------------------------------------------------
  // BATCHES
  // ---------------------------------------------------------------------------

  @Permissions('batches:create')
  @Post('batches')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new batch schedule for a course' })
  @ApiResponse({ status: 201, description: 'Batch created successfully' })
  @ApiResponse({ status: 409, description: 'Batch code already exists' })
  async createBatch(
    @Body() dto: CreateBatchDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.academicService.createBatch(dto, actor, clientMeta);
  }

  @Permissions('batches:read')
  @Get('batches')
  @ApiOperation({ summary: 'List and filter batches' })
  @ApiResponse({ status: 200, description: 'Paginated batches list' })
  async listBatches(@Query() query: QueryBatchesDto) {
    return this.academicService.listBatches(query);
  }

  @Permissions('batches:read')
  @Get('batches/:id')
  @ApiOperation({ summary: 'Get batch details and enrolled students list' })
  @ApiResponse({ status: 200, description: 'Batch details' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async getBatchById(@Param('id') id: string) {
    return this.academicService.getBatchById(id);
  }

  @Permissions('batches:update')
  @Patch('batches/:id')
  @ApiOperation({ summary: 'Update batch scheduling, status, or capacity' })
  @ApiResponse({ status: 200, description: 'Batch updated successfully' })
  async updateBatch(
    @Param('id') id: string,
    @Body() dto: UpdateBatchDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.academicService.updateBatch(id, dto, actor, clientMeta);
  }

  // ---------------------------------------------------------------------------
  // ENROLMENTS
  // ---------------------------------------------------------------------------

  @Permissions('enrolments:create')
  @Post('enrolments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enrol an existing student into a batch' })
  @ApiResponse({ status: 201, description: 'Student enrolled successfully' })
  @ApiResponse({ status: 400, description: 'Batch capacity exceeded' })
  @ApiResponse({ status: 409, description: 'Student is already enrolled in this batch' })
  async enrolStudent(
    @Body() dto: CreateEnrolmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.academicService.enrolStudent(dto, actor, clientMeta);
  }

  @Permissions('enrolments:read')
  @Get('enrolments')
  @ApiOperation({ summary: 'List and filter student enrolments' })
  @ApiResponse({ status: 200, description: 'Paginated enrolments list' })
  async listEnrolments(@Query() query: QueryEnrolmentsDto) {
    return this.academicService.listEnrolments(query);
  }

  @Permissions('enrolments:read')
  @Get('enrolments/:id')
  @ApiOperation({ summary: 'Get enrolment details by ID' })
  @ApiResponse({ status: 200, description: 'Enrolment details' })
  @ApiResponse({ status: 404, description: 'Enrolment not found' })
  async getEnrolmentById(@Param('id') id: string) {
    return this.academicService.getEnrolmentById(id);
  }

  @Permissions('enrolments:update')
  @Patch('enrolments/:id/status')
  @ApiOperation({ summary: 'Update student enrolment status or record grade' })
  @ApiResponse({ status: 200, description: 'Enrolment status updated' })
  async updateEnrolmentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnrolmentStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.academicService.updateEnrolmentStatus(id, dto, actor, clientMeta);
  }
}
