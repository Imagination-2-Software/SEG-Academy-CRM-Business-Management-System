import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { StudentsService, PaginatedStudentsResponse } from './students.service';
import {
  CreateStudentDto,
  UpdateStudentDto,
  QueryStudentsDto,
  CreateStudentDocumentDto,
  VerifyStudentDocumentDto,
  QueryGlobalDocumentsDto,
  DirectVerifyDocumentDto,
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
  @Get('documents')
  @ApiOperation({ summary: 'List documents across all students with search, filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated global documents list' })
  async getGlobalDocuments(@Query() query: QueryGlobalDocumentsDto) {
    return this.studentsService.getGlobalDocuments(query);
  }

  @Permissions('students:verify')
  @Patch('documents/:docId/verify')
  @ApiOperation({ summary: 'Directly verify or reject a document by document ID' })
  @ApiResponse({ status: 200, description: 'Document verification updated' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async directVerifyDocument(
    @Param('docId') docId: string,
    @Body() dto: DirectVerifyDocumentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.studentsService.directVerifyDocument(docId, dto, actor, clientMeta);
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
  @Post(':id/documents/upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload binary KYC document directly into secure private storage' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'documentType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string', example: 'TRANSCRIPT' },
        documentName: { type: 'string', example: 'High School Diploma.pdf' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded and attached successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type, MIME signature mismatch, or file too large' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body('documentType') documentType: string,
    @Body('documentName') documentName: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('A binary file must be uploaded under form-data key "file".');
    }
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.studentsService.uploadDocumentBinary(
      id,
      file,
      documentType,
      documentName,
      actor,
      clientMeta,
    );
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
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    return this.studentsService.getDocumentDownloadUrl(id, docId, actor, clientMeta);
  }

  @Permissions('students:read')
  @Get(':id/documents/:docId/stream')
  @ApiOperation({ summary: 'Stream binary KYC document content safely to authenticated actor' })
  @ApiResponse({ status: 200, description: 'Binary document stream' })
  @ApiResponse({ status: 400, description: 'Expired or invalid download link' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async streamDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Query('expires') expires: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const clientMeta = {
      ipAddress: req.ip || (req.socket?.remoteAddress as string | undefined),
      userAgent: req.headers['user-agent'] as string | undefined,
    };
    const file = await this.studentsService.streamDocument(
      id,
      docId,
      expires,
      actor,
      clientMeta,
    );

    // Clean filename for Content-Disposition header
    const cleanFilename = encodeURIComponent(file.documentName).replace(/['()]/g, escape);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.buffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${cleanFilename}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    res.end(file.buffer);
  }
}
