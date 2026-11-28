import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DashboardService } from '../dashboard/dashboard.service';
import { DashboardController } from '../dashboard/dashboard.controller';

describe('Dashboard Overview Module - Unit & Security Tests', () => {
  it('DashboardService.getOverview aggregates counts and revenue correctly for Founder/Admin', async () => {
    const mockPrisma = {
      profileStudent: {
        count: async () => 42,
      },
      batch: {
        count: async (args?: any) => {
          if (args?.where?.status?.in) return 5; // activeBatches
          if (args?.where?.status === 'UPCOMING') return 2; // upcomingCohorts
          return 7;
        },
        findMany: async () => [
          { capacity: 30, _count: { enrolments: 20 } },
          { capacity: 20, _count: { enrolments: 10 } },
        ],
      },
      invoice: {
        aggregate: async () => ({
          _sum: { paidAmount: 250000 },
        }),
        count: async () => 3, // pending invoices
      },
      profileEmployee: {
        count: async () => 12,
      },
      studentDocument: {
        count: async () => 4, // pending KYC
      },
    };

    const service = new DashboardService(mockPrisma as any);
    const overview = await service.getOverview({
      userId: 'founder-1',
      email: 'founder@segacademy.com',
      fullName: 'Founder Admin',
      role: { id: 'r1', code: 'FOUNDER_SUPER_ADMIN', name: 'Founder Super Admin' },
      roles: ['FOUNDER_SUPER_ADMIN'],
      permissions: ['*'],
    });

    assert.equal(overview.activeEnrolments, 42);
    assert.equal(overview.activeBatches, 5);
    assert.equal(overview.reconciledRevenue, 250000);
    assert.equal(overview.totalEmployees, 12);
    assert.equal(overview.pendingInvoices, 3);
    assert.equal(overview.upcomingCohorts, 2);
    assert.equal(overview.pendingKyc, 4);
    // (20 + 10) / (30 + 20) = 30 / 50 = 60%
    assert.equal(overview.capacityAvg, 60);
  });

  it('DashboardService.getOverview masks revenue and financial dues for INTERN role', async () => {
    const mockPrisma = {
      profileStudent: { count: async () => 10 },
      batch: {
        count: async () => 2,
        findMany: async () => [],
      },
      invoice: {
        aggregate: async () => ({ _sum: { paidAmount: 999999 } }),
        count: async () => 15,
      },
      profileEmployee: { count: async () => 5 },
      studentDocument: { count: async () => 1 },
    };

    const service = new DashboardService(mockPrisma as any);
    const overview = await service.getOverview({
      userId: 'intern-1',
      email: 'intern@segacademy.com',
      fullName: 'Intern User',
      role: { id: 'r2', code: 'INTERN', name: 'Intern' },
      roles: ['INTERN'],
      permissions: [],
    });

    // Financial KPIs must be zeroed for Intern
    assert.equal(overview.reconciledRevenue, 0);
    assert.equal(overview.pendingInvoices, 0);
    assert.equal(overview.activeEnrolments, 10);
    assert.equal(overview.capacityAvg, 0);
  });

  it('DashboardService handles empty database and null sums safely', async () => {
    const mockPrisma = {
      profileStudent: { count: async () => 0 },
      batch: {
        count: async () => 0,
        findMany: async () => [],
      },
      invoice: {
        aggregate: async () => ({ _sum: { paidAmount: null } }),
        count: async () => 0,
      },
      profileEmployee: { count: async () => 0 },
      studentDocument: { count: async () => 0 },
    };

    const service = new DashboardService(mockPrisma as any);
    const overview = await service.getOverview({
      userId: 'admin-1',
      email: 'admin@segacademy.com',
      fullName: 'Admin User',
      role: { id: 'r3', code: 'ADMIN', name: 'Admin' },
      roles: ['ADMIN'],
      permissions: ['*'],
    });

    assert.equal(overview.activeEnrolments, 0);
    assert.equal(overview.activeBatches, 0);
    assert.equal(overview.reconciledRevenue, 0);
    assert.equal(overview.totalEmployees, 0);
    assert.equal(overview.pendingInvoices, 0);
    assert.equal(overview.upcomingCohorts, 0);
    assert.equal(overview.pendingKyc, 0);
    assert.equal(overview.capacityAvg, 0);
  });

  it('DashboardController.getOverview extracts user from request and calls service', async () => {
    let capturedUser: any = null;
    const mockService = {
      getOverview: async (user: any) => {
        capturedUser = user;
        return {
          activeEnrolments: 5,
          activeBatches: 2,
          reconciledRevenue: 1000,
          totalEmployees: 3,
          pendingInvoices: 1,
          upcomingCohorts: 1,
          pendingKyc: 0,
          capacityAvg: 50,
        };
      },
    };

    const controller = new DashboardController(mockService as any);
    const actor = {
      id: 'usr-1',
      email: 'test@seg.com',
      role: 'STAFF',
    };

    const res = await controller.getOverview(actor as any);
    assert.equal(res.activeEnrolments, 5);
    assert.equal(capturedUser.role, 'STAFF');
  });
});
