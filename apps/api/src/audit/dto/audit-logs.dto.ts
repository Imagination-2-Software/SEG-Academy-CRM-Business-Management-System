import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAuditLogsDto {
  @ApiPropertyOptional({ default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Records per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by action name (e.g. USER_LOGIN, INVOICE_CREATED)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by resource (e.g. users, invoices, students)' })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({ description: 'Filter by actor User ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter logs created on or after this ISO date' })
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO-8601 date string.' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter logs created on or before this ISO date' })
  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO-8601 date string.' })
  endDate?: string;

  @ApiPropertyOptional({ description: 'Search across action, resource, IP or user details' })
  @IsOptional()
  @IsString()
  search?: string;
}

export interface AuditLogActor {
  id: string;
  fullName: string;
  email: string;
  roleCode?: string;
  roleName?: string;
}

export interface SafeAuditLogEntry {
  id: string;
  userId: string | null;
  actor: AuditLogActor | null;
  action: string;
  resource: string;
  resourceId: string | null;
  payload: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface PaginatedAuditLogsResponse {
  data: SafeAuditLogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
