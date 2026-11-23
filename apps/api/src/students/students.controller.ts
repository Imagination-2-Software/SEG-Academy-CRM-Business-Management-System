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
import { StudentsService, PaginatedStudentsResponse } from './students.service';
import {
  CreateStudentDto,
  UpdateStudentDto,
  QueryStudentsDto,
  CreateStudentDocumentDto,
  VerifyStudentDocumentDto,
} from './dto/students.dto';
import { Permissions, CurrentUser, AuthenticatedUser } from '../auth';

@ApiTags('Student Management')
@ApiBearerAuth('bearer-jwt')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Permissions('students:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new student profile' })
  @ApiResponse({ status: 201, description: 'Student registered successfully' })
  @ApiResponse({ status: 409, description: 'Student with this email already exists' })
  async registerStudent(
    @Body() dto: CreateStudentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.studentsService.registerStudent(dto, actor, clientMeta);
  }

  @Permissions('students:read')
  @Get()
  @ApiOperation({ summary: 'List students with search, filters, and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated student list' })
  async listStudents(@Query() query: QueryStudentsDto): Promise<PaginatedStudentsResponse> {
    return this.studentsService.listStudents(query);
  }

  @Permissions('students:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get full student details by ID' })
  @ApiResponse({ status: 200, description: 'Student details' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentById(@Param('id') id: string) {
    return this.studentsService.getStudentById(id);
  }

  @Permissions('students:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update student profile details' })
  @ApiResponse({ status: 200, description: 'Student profile updated' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async updateStudent(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.studentsService.updateStudent(id, dto, actor, clientMeta);
  }

  @Permissions('students:update')
  @Post(':id/documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Attach a document metadata record to a student' })
  @ApiResponse({ status: 201, description: 'Document attached successfully' })
  async attachDocument(
    @Param('id') id: string,
    @Body() dto: CreateStudentDocumentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.studentsService.attachDocument(id, dto, actor, clientMeta);
  }

  @Permissions('students:update')
  @Patch(':id/documents/:docId/verify')
  @ApiOperation({ summary: 'Verify or reject a student document' })
  @ApiResponse({ status: 200, description: 'Document verification updated' })
  async verifyDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Body() dto: VerifyStudentDocumentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.studentsService.verifyDocument(id, docId, dto, actor, clientMeta);
  }

  @Permissions('students:read')
  @Get(':id/documents/:docId/download')
  @ApiOperation({ summary: 'Generate time-limited secure signed URL for document retrieval' })
  @ApiResponse({ status: 200, description: 'Time-limited signed download metadata' })
  async getDocumentDownloadUrl(
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.studentsService.getDocumentDownloadUrl(id, docId);
  }
}
