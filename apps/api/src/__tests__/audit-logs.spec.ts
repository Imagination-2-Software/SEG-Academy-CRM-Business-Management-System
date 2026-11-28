import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuditService } from '../audit/audit.service';
import { AuditController } from '../audit/audit.controller';
import { QueryAuditLogsDto } from '../audit/dto/audit-logs.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth';

describe('Audit Logs Module - Unit & Security Tests', () => {
  const mockAuditLogs = [
    {
      id: 'log-1',
      userId: 'usr-admin-1',
      action: 'USER_LOGIN',
      resource: 'AUTH',
      resourceId: null,
      payload: { ip: '127.0.0.1', password: 'secret-password-123', token: 'jwt-token-xyz' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date('2026-11-20T10:00:00Z'),
      user: {
        id: 'usr-admin-1',
        fullName: 'Admin User',
        email: 'admin@segacademy.com',
        role: { code: 'FOUNDER_SUPER_ADMIN', name: 'Founder Super Admin' },
      },
    },
    {
      id: 'log-2',
      userId: 'usr-student-1',
      action: 'PAYMENT_CONFIRMED',
      resource: 'INVOICE',
      resourceId: 'inv-101',
      payload: { amount: 5000, secretKey: 'dont-leak' },
      ipAddress: '192.168.1.1',
      userAgent: 'Chrome',
      createdAt: new Date('2026-11-21T10:00:00Z'),
      user: null,
    },
  ];

  it('AuditService.getAuditLogs should return paginated logs and sanitize sensitive payload fields', async () => {
    const mockPrisma = {
      auditLog: {
        findMany: async () => mockAuditLogs,
        count: async () => 2,
      },
    };

    const service = new AuditService(mockPrisma as any);
    const result = await service.getAuditLogs({ page: 1, limit: 10 });

    assert.equal(result.meta.total, 2);
    assert.equal(result.meta.page, 1);
    assert.equal(result.meta.limit, 10);
    assert.equal(result.meta.totalPages, 1);
    assert.equal(result.data.length, 2);

    // Verify actor extraction
    assert.equal(result.data[0].actor?.fullName, 'Admin User');
    assert.equal(result.data[0].actor?.roleCode, 'FOUNDER_SUPER_ADMIN');

    // Verify payload sanitization (password, token, secretKey must be redacted)
    const p1: any = result.data[0].payload;
    assert.equal(p1?.password, '[REDACTED]');
    assert.equal(p1?.token, '[REDACTED]');
    assert.equal(p1?.ip, '127.0.0.1');

    const p2: any = result.data[1].payload;
    assert.equal(p2?.secretKey, '[REDACTED]');
    assert.equal(p2?.amount, 5000);
    assert.equal(result.data[1].actor, null);
  });

  it('AuditService.getAuditLogs filters by search, action, actor, and date ranges', async () => {
    let capturedWhere: any = null;
    const mockPrisma = {
      auditLog: {
        findMany: async (args: any) => {
          capturedWhere = args.where;
          return [];
        },
        count: async () => 0,
      },
    };

    const service = new AuditService(mockPrisma as any);
    await service.getAuditLogs({
      page: 2,
      limit: 5,
      search: 'LOGIN',
      action: 'USER_LOGIN',
      userId: 'usr-1',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });

    assert.deepEqual(capturedWhere.action, { contains: 'USER_LOGIN', mode: 'insensitive' });
    assert.equal(capturedWhere.userId, 'usr-1');
    assert.ok(capturedWhere.createdAt.gte);
    assert.ok(capturedWhere.createdAt.lte);
    assert.ok(Array.isArray(capturedWhere.OR));
  });

  it('AuditController should be strictly restricted to FOUNDER_SUPER_ADMIN', () => {
    const reflector = new Reflector();
    const controllerRoles = reflector.get<string[]>(ROLES_KEY, AuditController);
    assert.deepEqual(controllerRoles, ['FOUNDER_SUPER_ADMIN']);
  });

  it('AuditController.getAuditLogs delegates to service', async () => {
    let calledQuery: any = null;
    const mockService = {
      getAuditLogs: async (query: any) => {
        calledQuery = query;
        return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      },
    };

    const controller = new AuditController(mockService as any);
    const res = await controller.getAuditLogs({ page: 1, limit: 10 } as any);

    assert.equal(res.meta.total, 0);
    assert.equal(calledQuery.page, 1);
  });

  it('QueryAuditLogsDto validates query parameters and bounds', async () => {
    const validDto = plainToInstance(QueryAuditLogsDto, {
      page: '1',
      limit: '20',
      action: 'USER_LOGIN',
    });
    const errors = await validate(validDto as object);
    assert.equal(errors.length, 0);

    const invalidDto = plainToInstance(QueryAuditLogsDto, {
      page: '-1',
      limit: '500', // exceeds max 100
      startDate: 'invalid-date',
    });
    const badErrors = await validate(invalidDto as object);
    assert.ok(badErrors.length > 0);
  });
});
