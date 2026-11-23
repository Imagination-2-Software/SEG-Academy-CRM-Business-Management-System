import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogData {
  actorUserId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  payload?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a security or domain audit event in the audit_logs table.
   * Strips any sensitive fields (passwords, tokens, secrets) before persisting.
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      const rawPayload = data.payload || {};
      const payloadWithMeta = data.correlationId
        ? { ...rawPayload, correlationId: data.correlationId }
        : rawPayload;

      const sanitizedPayload = this.sanitizePayload(payloadWithMeta);

      await this.prisma.auditLog.create({
        data: {
          userId: data.actorUserId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          payload: sanitizedPayload as any,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to record audit log for action ${data.action}: ${msg}`);
      // Never throw from audit logging to avoid breaking user transactions
    }
  }

  private sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'refreshToken', 'secret'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(payload)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        sanitized[key] = this.sanitizePayload(val as Record<string, unknown>);
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }
}
