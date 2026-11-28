import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto, PaginatedAuditLogsResponse } from './dto/audit-logs.dto';
import { Roles } from '../auth';

@ApiTags('Audit & Compliance')
@ApiBearerAuth('bearer-jwt')
@Roles('FOUNDER_SUPER_ADMIN')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('FOUNDER_SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List system audit logs with filters and pagination',
    description: 'Restricted strictly to Founder Super Admin. Never leaks sensitive tokens or credentials.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated audit logs list',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only FOUNDER_SUPER_ADMIN may view compliance audit trails',
  })
  async getAuditLogs(
    @Query() query: QueryAuditLogsDto,
  ): Promise<PaginatedAuditLogsResponse> {
    return this.auditService.getAuditLogs(query);
  }
}
