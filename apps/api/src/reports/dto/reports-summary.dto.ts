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

export interface ReportsSummaryResponse {
  billing: BillingSummaryMetrics;
  tasks: TaskSummaryMetrics;
  organization: OrganizationSummaryMetrics;
  generatedAt: string;
}
