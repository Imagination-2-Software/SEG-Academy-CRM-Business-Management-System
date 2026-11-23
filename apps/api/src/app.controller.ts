import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AppService } from './app.service';
import { HealthService, LivenessStatus, ReadinessStatus } from './health.service';
import { Public } from './auth';
import { SkipRateLimit } from './common/rate-limiting/rate-limit.decorator';

@ApiTags('Health & Monitoring')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly healthService: HealthService,
  ) {}

  @Public()
  @SkipRateLimit()
  @Get('health')
  @ApiOperation({ summary: 'Default system health check (Liveness)' })
  @ApiResponse({ status: 200, description: 'API health status' })
  getHealth(): LivenessStatus {
    return this.healthService.getLiveness();
  }

  @Public()
  @SkipRateLimit()
  @Get('health/live')
  @ApiOperation({ summary: 'Liveness probe (Container orchestrator liveness)' })
  @ApiResponse({ status: 200, description: 'Application process is live and responsive' })
  getLiveness(): LivenessStatus {
    return this.healthService.getLiveness();
  }

  @Public()
  @SkipRateLimit()
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe (Verifies PostgreSQL database connectivity)' })
  @ApiResponse({ status: 200, description: 'Application and database are ready to serve traffic' })
  @ApiResponse({ status: 503, description: 'Database dependency is unhealthy' })
  async getReadiness(@Res({ passthrough: true }) res: Response): Promise<ReadinessStatus> {
    const readiness = await this.healthService.getReadiness();
    if (readiness.status !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return readiness;
  }
}
