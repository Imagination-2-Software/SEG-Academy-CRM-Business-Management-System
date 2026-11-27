import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus, TaskStatus } from '@seg/database';
import { ReportsSummaryResponse } from './dto/reports-summary.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveSummary(): Promise<ReportsSummaryResponse> {
    const now = new Date();

    // Run parallel aggregation queries directly against Supabase PostgreSQL
    const [invoices, tasks, employeeCount, departmentCount] = await Promise.all([
      // 1. Invoices for financial metrics
      this.prisma.invoice.findMany({
        where: {
          status: {
            not: InvoiceStatus.CANCELLED,
          },
        },
        select: {
          totalAmount: true,
          paidAmount: true,
          status: true,
          dueDate: true,
        },
      }),

      // 2. Tasks for operational velocity metrics
      this.prisma.task.findMany({
        select: {
          status: true,
          priority: true,
          dueDate: true,
          assignedToId: true,
        },
      }),

      // 3. Employee count
      this.prisma.profileEmployee.count(),

      // 4. Department count
      this.prisma.department.count(),
    ]);

    // Aggregate Billing Metrics
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let paidInvoicesCount = 0;
    let pendingInvoicesCount = 0;

    for (const inv of invoices) {
      const totalAmt = Number(inv.totalAmount) || 0;
      const paidAmt = Number(inv.paidAmount) || 0;
      const balance = Math.max(0, totalAmt - paidAmt);

      totalInvoiced += totalAmt;
      totalCollected += paidAmt;
      totalOutstanding += balance;

      if (inv.status === InvoiceStatus.PAID) {
        paidInvoicesCount++;
      } else {
        pendingInvoicesCount++;
      }

      if (balance > 0 && inv.dueDate < now) {
        overdueAmount += balance;
        overdueCount++;
      }
    }

    const collectionRate =
      totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    // Aggregate Task Metrics
    const totalTasks = tasks.length;
    let assignedTasks = 0;
    let inProgressTasks = 0;
    let pendingReviews = 0;
    let completedTasks = 0;
    let overdueTasks = 0;
    let urgentTasks = 0;

    for (const t of tasks) {
      if (t.assignedToId) assignedTasks++;
      if (t.status === TaskStatus.IN_PROGRESS) inProgressTasks++;
      if (t.status === TaskStatus.UNDER_REVIEW) pendingReviews++;
      if (t.status === TaskStatus.DONE) completedTasks++;
      if (t.priority === 'URGENT') urgentTasks++;

      // Overdue check: task is not completed or cancelled, and dueDate < now
      if (
        t.dueDate &&
        t.status !== TaskStatus.DONE &&
        t.status !== TaskStatus.CANCELLED &&
        t.dueDate.getTime() < now.getTime()
      ) {
        overdueTasks++;
      }
    }

    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      billing: {
        totalInvoiced,
        totalCollected,
        totalOutstanding,
        overdueAmount,
        overdueCount,
        paidInvoicesCount,
        pendingInvoicesCount,
        collectionRate,
      },
      tasks: {
        totalTasks,
        assignedTasks,
        inProgressTasks,
        pendingReviews,
        completedTasks,
        overdueTasks,
        urgentTasks,
        completionRate,
      },
      organization: {
        employeeCount,
        departmentCount,
      },
      generatedAt: now.toISOString(),
    };
  }
}
