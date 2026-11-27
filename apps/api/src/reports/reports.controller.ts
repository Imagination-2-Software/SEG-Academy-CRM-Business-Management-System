import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportsSummaryResponse } from './dto/reports-summary.dto';
import { Roles } from '../auth';

@ApiTags('Reports')
@ApiBearerAuth('bearer-jwt')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @Roles('FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get consolidated executive reporting summary metrics',
    description:
      'Aggregates financial health, operational task velocity, and institutional staffing metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Consolidated executive report summary',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Founder, Admin, or Finance Manager may view executive reports',
  })
  async getSummary(): Promise<ReportsSummaryResponse> {
    return this.reportsService.getExecutiveSummary();
  }
}
