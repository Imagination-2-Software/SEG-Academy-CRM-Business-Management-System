import 'reflect-metadata';
import { test, describe, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { ReportsService } from '../reports.service';
import { ReportsController } from '../reports.controller';
import { InvoiceStatus, TaskStatus } from '@seg/database';

describe('ReportsService & Controller Unit Tests', () => {
  let service: ReportsService;
  let controller: ReportsController;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      invoice: {
        findMany: async () => [],
      },
      task: {
        findMany: async () => [],
      },
      profileEmployee: {
        count: async () => 0,
      },
      department: {
        count: async () => 0,
      },
    };

    service = new ReportsService(mockPrisma);
    controller = new ReportsController(service);
  });

  describe('getExecutiveSummary() - Calculations', () => {
    test('should calculate correct metrics when invoices, tasks, and org units exist', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      mockPrisma.invoice.findMany = async () => [
        {
          totalAmount: 100000,
          paidAmount: 100000,
          status: InvoiceStatus.PAID,
          dueDate: pastDate,
        },
        {
          totalAmount: 50000,
          paidAmount: 20000,
          status: InvoiceStatus.PARTIALLY_PAID,
          dueDate: pastDate, // Overdue balance: 30000
        },
        {
          totalAmount: 30000,
          paidAmount: 0,
          status: InvoiceStatus.ISSUED,
          dueDate: futureDate, // Pending balance: 30000 (not overdue)
        },
      ];

      mockPrisma.task.findMany = async () => [
        {
          status: TaskStatus.DONE,
          priority: 'NORMAL',
          dueDate: pastDate,
          assignedToId: 'emp-1',
        },
        {
          status: TaskStatus.IN_PROGRESS,
          priority: 'URGENT',
          dueDate: pastDate, // Overdue task
          assignedToId: 'emp-2',
        },
        {
          status: TaskStatus.UNDER_REVIEW,
          priority: 'NORMAL',
          dueDate: futureDate,
          assignedToId: 'emp-1',
        },
        {
          status: TaskStatus.TODO,
          priority: 'LOW',
          dueDate: futureDate,
          assignedToId: null,
        },
      ];

      mockPrisma.profileEmployee.count = async () => 14;
      mockPrisma.department.count = async () => 5;

      const summary = await controller.getSummary();

      // Financials
      assert.equal(summary.billing.totalInvoiced, 180000);
      assert.equal(summary.billing.totalCollected, 120000);
      assert.equal(summary.billing.totalOutstanding, 60000);
      assert.equal(summary.billing.overdueAmount, 30000);
      assert.equal(summary.billing.overdueCount, 1);
      assert.equal(summary.billing.paidInvoicesCount, 1);
      assert.equal(summary.billing.pendingInvoicesCount, 2);
      assert.equal(summary.billing.collectionRate, 67); // Math.round((120000 / 180000) * 100) = 67%

      // Tasks
      assert.equal(summary.tasks.totalTasks, 4);
      assert.equal(summary.tasks.assignedTasks, 3);
      assert.equal(summary.tasks.inProgressTasks, 1);
      assert.equal(summary.tasks.pendingReviews, 1);
      assert.equal(summary.tasks.completedTasks, 1);
      assert.equal(summary.tasks.overdueTasks, 1);
      assert.equal(summary.tasks.urgentTasks, 1);
      assert.equal(summary.tasks.completionRate, 25); // Math.round((1 / 4) * 100) = 25%

      // Organization
      assert.equal(summary.organization.employeeCount, 14);
      assert.equal(summary.organization.departmentCount, 5);
      assert.ok(summary.generatedAt);
    });

    test('should safely handle empty database without dividing by zero', async () => {
      mockPrisma.invoice.findMany = async () => [];
      mockPrisma.task.findMany = async () => [];
      mockPrisma.profileEmployee.count = async () => 0;
      mockPrisma.department.count = async () => 0;

      const summary = await controller.getSummary();

      assert.equal(summary.billing.totalInvoiced, 0);
      assert.equal(summary.billing.totalCollected, 0);
      assert.equal(summary.billing.totalOutstanding, 0);
      assert.equal(summary.billing.collectionRate, 0);
      assert.equal(summary.tasks.totalTasks, 0);
      assert.equal(summary.tasks.completionRate, 0);
      assert.equal(summary.organization.employeeCount, 0);
      assert.equal(summary.organization.departmentCount, 0);
    });
  });
});
