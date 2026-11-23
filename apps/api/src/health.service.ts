import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

export interface LivenessStatus {
  status: 'ok';
  service: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

export interface ReadinessStatus {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs?: number;
      message?: string;
    };
    memory: {
      status: 'up';
      heapUsedMb: number;
      rssMb: number;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness probe: Confirms that the NestJS process is running and responsive.
   * Suitable for Kubernetes/container orchestrator liveness checks.
   */
  getLiveness(): LivenessStatus {
    return {
      status: 'ok',
      service: 'SEG Academy CRM API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Readiness probe: Verifies critical infrastructure dependencies (PostgreSQL database via Prisma).
   * Executes a lightweight `SELECT 1` without exposing connection strings or schema details.
   */
  async getReadiness(): Promise<ReadinessStatus> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMb = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const rssMb = Math.round(memoryUsage.rss / 1024 / 1024);

    let dbStatus: 'up' | 'down' = 'up';
    let latencyMs: number | undefined = undefined;
    let dbMessage: string | undefined = undefined;

    const start = Date.now();
    try {
      // Execute lightweight raw query through Prisma
      await this.prisma.$queryRaw`SELECT 1`;
      latencyMs = Date.now() - start;
    } catch (err: unknown) {
      dbStatus = 'down';
      latencyMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Database readiness check failed: ${msg}`);
      dbMessage = 'Database connection check failed';
    }

    const overallStatus: 'ok' | 'error' = dbStatus === 'up' ? 'ok' : 'error';

    return {
      status: overallStatus,
      service: 'SEG Academy CRM API',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbStatus,
          ...(latencyMs !== undefined ? { latencyMs } : {}),
          ...(dbMessage ? { message: dbMessage } : {}),
        },
        memory: {
          status: 'up',
          heapUsedMb,
          rssMb,
        },
      },
    };
  }
}
