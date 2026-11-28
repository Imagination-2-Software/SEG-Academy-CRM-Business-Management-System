import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardOverviewDto } from './dto/dashboard-overview.dto';
import { AuthenticatedUser } from '../auth';
import { BatchStatus, InvoiceStatus, DocumentVerificationStatus } from '@seg/database';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes consolidated dashboard metrics using efficient database-level aggregations
   * (count, sum, avg) without fetching full collection rows into memory.
   */
  async getOverview(actor: AuthenticatedUser): Promise<DashboardOverviewDto> {
    try {
      // If user is a restricted role like EMPLOYEE_INTERN, restrict financial totals
      const canViewFinancials =
        actor.roles.includes('FOUNDER_SUPER_ADMIN') ||
        actor.roles.includes('ADMIN') ||
        actor.roles.includes('FINANCE_MANAGER');

      // Database-level parallel aggregations
      const [
        totalStudents,
        activeBatchesCount,
        upcomingBatchesCount,
        revenueAgg,
        totalEmployeesCount,
        pendingInvoicesCount,
        pendingKycCount,
        capacityBatches,
      ] = await Promise.all([
        // 1. Total registered students (active enrolments count)
        this.prisma.profileStudent.count(),

        // 2. Active batches (UPCOMING or ONGOING)
        this.prisma.batch.count({
          where: {
            status: {
              in: [BatchStatus.UPCOMING, BatchStatus.ONGOING],
            },
          },
        }),

        // 3. Upcoming cohorts
        this.prisma.batch.count({
          where: {
            status: BatchStatus.UPCOMING,
          },
        }),

        // 4. Reconciled revenue from PAID invoices (database SUM)
        canViewFinancials
          ? this.prisma.invoice.aggregate({
              _sum: {
                paidAmount: true,
              },
              where: {
                status: InvoiceStatus.PAID,
              },
            })
          : Promise.resolve({ _sum: { paidAmount: null } }),

        // 5. Total active internal staff & faculty
        this.prisma.profileEmployee.count(),

        // 6. Pending invoices requiring collection (ISSUED or PARTIALLY_PAID)
        canViewFinancials
          ? this.prisma.invoice.count({
              where: {
                status: {
                  in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID],
                },
              },
            })
          : Promise.resolve(0),

        // 7. KYC documents pending verification
        this.prisma.studentDocument.count({
          where: {
            verificationStatus: DocumentVerificationStatus.PENDING,
          },
        }),

        // 8. Active batch capacities to compute average capacity without fetching all rows
        this.prisma.batch.findMany({
          where: {
            status: {
              in: [BatchStatus.UPCOMING, BatchStatus.ONGOING],
            },
          },
          select: {
            capacity: true,
            _count: {
              select: {
                enrolments: true,
              },
            },
          },
        }),
      ]);

      // Calculate capacity utilization percentage
      let capacityAvg = 0;
      if (capacityBatches && capacityBatches.length > 0) {
        const totalCapacity = capacityBatches.reduce((acc, b) => acc + (b.capacity || 0), 0);
        const totalEnrolled = capacityBatches.reduce((acc, b) => acc + (b._count?.enrolments || 0), 0);
        capacityAvg = totalCapacity > 0 ? Number(((totalEnrolled / totalCapacity) * 100).toFixed(1)) : 0;
      }

      const reconciledRevenue = revenueAgg?._sum?.paidAmount
        ? Number(revenueAgg._sum.paidAmount)
        : 0;

      return {
        activeEnrolments: totalStudents || 0,
        activeBatches: activeBatchesCount || 0,
        reconciledRevenue,
        totalEmployees: totalEmployeesCount || 0,
        pendingInvoices: pendingInvoicesCount || 0,
        upcomingCohorts: upcomingBatchesCount || 0,
        pendingKyc: pendingKycCount || 0,
        capacityAvg,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to compute dashboard overview metrics: ${msg}`);
      // Graceful fallback with zeros
      return {
        activeEnrolments: 0,
        activeBatches: 0,
        reconciledRevenue: 0,
        totalEmployees: 0,
        pendingInvoices: 0,
        upcomingCohorts: 0,
        pendingKyc: 0,
        capacityAvg: 0,
      };
    }
  }
}
