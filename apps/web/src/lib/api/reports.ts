import { apiClient } from './client';

export interface BillingSummaryMetrics {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
  collectionRate: number;
}

export interface TaskSummaryMetrics {
  totalTasks: number;
  assignedTasks: number;
  inProgressTasks: number;
  pendingReviews: number;
  completedTasks: number;
  overdueTasks: number;
  urgentTasks: number;
  completionRate: number;
}

export interface OrganizationSummaryMetrics {
  employeeCount: number;
  departmentCount: number;
}

export interface ReportsSummary {
  billing: BillingSummaryMetrics;
  tasks: TaskSummaryMetrics;
  organization: OrganizationSummaryMetrics;
  generatedAt: string;
}

export const reportsApi = {
  /**
   * Fetch consolidated executive report metrics directly from backend database.
   */
  async getExecutiveSummary(): Promise<ReportsSummary> {
    const res: any = await apiClient.get('/reports/summary');
    if (res?.success && res?.data) {
      return res.data;
    }
    if (res?.data) {
      return res.data;
    }
    return res;
  },
};
