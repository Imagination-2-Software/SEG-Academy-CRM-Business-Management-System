import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardOverviewDto } from './dto/dashboard-overview.dto';
import { CurrentUser, AuthenticatedUser } from '../auth';

@ApiTags('Operational Dashboard')
@ApiBearerAuth('bearer-jwt')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get consolidated operational dashboard metrics',
    description: 'Calculates database-level aggregated counts, revenue, and active batches. Respects role-based financial visibility.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operational overview metrics',
    type: DashboardOverviewDto,
  })
  async getOverview(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<DashboardOverviewDto> {
    return this.dashboardService.getOverview(actor);
  }
}
