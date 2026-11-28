import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogsDto, PaginatedAuditLogsResponse, SafeAuditLogEntry } from './dto/audit-logs.dto';

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

  /**
   * Retrieves paginated, filtered audit logs for Super Admins.
   * Sanitizes all payloads and hides sensitive credentials.
   */
  async getAuditLogs(query?: QueryAuditLogsDto): Promise<PaginatedAuditLogsResponse> {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query?.action && query.action.trim()) {
      where.action = { contains: query.action.trim(), mode: 'insensitive' };
    }

    if (query?.resource && query.resource.trim()) {
      where.resource = { contains: query.resource.trim(), mode: 'insensitive' };
    }

    if (query?.userId && query.userId.trim()) {
      where.userId = query.userId.trim();
    }

    if (query?.startDate || query?.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query?.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { action: { contains: term, mode: 'insensitive' } },
        { resource: { contains: term, mode: 'insensitive' } },
        { ipAddress: { contains: term, mode: 'insensitive' } },
        { user: { fullName: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, records] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const sanitizedData: SafeAuditLogEntry[] = records.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      actor: r.user
        ? {
            id: r.user.id,
            fullName: r.user.fullName,
            email: r.user.email,
            roleCode: r.user.role?.code,
            roleName: r.user.role?.name,
          }
        : null,
      action: r.action,
      resource: r.resource,
      resourceId: r.resourceId,
      payload: r.payload ? (this.sanitizePayload(r.payload as Record<string, unknown>) as any) : null,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));

    return {
      data: sanitizedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
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
