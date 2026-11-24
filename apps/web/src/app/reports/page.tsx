'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { billingService, formatINR, BillingMetrics } from '@/lib/api/billing';
import { tasksApi, TaskMetrics } from '@/lib/api/tasks';
import { organizationService } from '@/lib/api/organization';
import {
  BarChart3,
  TrendingUp,
  Download,
  IndianRupee,
  Users,
  GraduationCap,
  BookOpen,
  CheckSquare,
  ArrowUpRight,
  Calendar,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

export default function ReportsAnalyticsPage() {
  const [billingMetrics, setBillingMetrics] = useState<BillingMetrics>({
    totalInvoiced: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    overdueAmount: 0,
    overdueCount: 0,
    paidInvoicesCount: 0,
    pendingInvoicesCount: 0,
  });
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics>({
    totalTasks: 0,
    assignedTasks: 0,
    inProgressTasks: 0,
    pendingReviews: 0,
    completedTasks: 0,
    overdueTasks: 0,
    urgentTasks: 0,
    completionRate: 0,
  });
  const [employeeCount, setEmployeeCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [invRes, tasksList, empsList, deptsList] = await Promise.all([
          billingService.getInvoices({}),
          tasksApi.getTasks(),
          organizationService.getEmployees(),
          organizationService.getDepartments(),
        ]);
        setBillingMetrics(invRes.metrics);
        setTaskMetrics(tasksApi.computeMetrics(tasksList));
        setEmployeeCount(empsList.length);
        setDepartmentCount(deptsList.length);
      } catch (err) {
        console.error('Failed to load reporting data', err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  const collectionRate =
    billingMetrics.totalInvoiced > 0
      ? Math.round((billingMetrics.totalCollected / billingMetrics.totalInvoiced) * 100)
      : 0;

  const handleExportSummaryCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Invoiced Revenue', billingMetrics.totalInvoiced.toString()],
      ['Total Collected Revenue', billingMetrics.totalCollected.toString()],
      ['Total Outstanding Balance', billingMetrics.totalOutstanding.toString()],
      ['Overdue Outstanding', billingMetrics.overdueAmount.toString()],
      ['Collection Rate (%)', `${collectionRate}%`],
      ['Total Operational Tasks', taskMetrics.totalTasks.toString()],
      ['Task Completion Rate (%)', `${taskMetrics.completionRate}%`],
      ['Active Staff & Faculty', employeeCount.toString()],
      ['Functional Departments', departmentCount.toString()],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SEG_CRM_Executive_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell
      allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER']}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-seg-plum/10 text-seg-plum">
                <BarChart3 className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Executive Reports & Business Analytics
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aggregated financial reconciliations, enrollment intake trends, and operational velocity.
            </p>
          </div>

          <button
            onClick={handleExportSummaryCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-seg-plum" />
            <span>Export Executive CSV</span>
          </button>
        </div>

        {/* Financial Health Overview */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-seg-plum" />
                <span>Financial Collections & Revenue Health</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Invoiced revenue vs realized collections verified across invoice ledgers.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              {collectionRate}% Realized
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Invoiced
              </span>
              <div className="mt-1 text-xl font-bold text-foreground font-mono">
                {formatINR(billingMetrics.totalInvoiced)}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {billingMetrics.paidInvoicesCount + billingMetrics.pendingInvoicesCount} tax invoices
              </span>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Collected Revenue
              </span>
              <div className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                {formatINR(billingMetrics.totalCollected)}
              </div>
              <span className="text-[10px] text-muted-foreground">Settled bank & UPI funds</span>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Outstanding Balance
              </span>
              <div className="mt-1 text-xl font-bold text-seg-orange font-mono">
                {formatINR(billingMetrics.totalOutstanding)}
              </div>
              <span className="text-[10px] text-muted-foreground">Pending student dues</span>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Overdue Receivables
              </span>
              <div className="mt-1 text-xl font-bold text-red-700 dark:text-red-400 font-mono">
                {formatINR(billingMetrics.overdueAmount)}
              </div>
              <span className="text-[10px] text-red-600 font-medium">
                {billingMetrics.overdueCount} invoices past deadline
              </span>
            </div>
          </div>
        </div>

        {/* Operational & Academic Split Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Operations & Task Velocity */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-purple-600" />
                  <span>Operational Task Velocity</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Task completion rates, rubric evaluations, and turnaround times.
                </p>
              </div>
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">
                {taskMetrics.completionRate}% Completed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-border/60 p-3">
                <span className="text-muted-foreground">Total Delegations:</span>
                <div className="text-lg font-bold text-foreground font-mono mt-0.5">
                  {taskMetrics.totalTasks}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <span className="text-muted-foreground">In Progress:</span>
                <div className="text-lg font-bold text-sky-700 font-mono mt-0.5">
                  {taskMetrics.inProgressTasks}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <span className="text-muted-foreground">Pending Evaluation:</span>
                <div className="text-lg font-bold text-purple-700 font-mono mt-0.5">
                  {taskMetrics.pendingReviews}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <span className="text-muted-foreground">Overdue Commitments:</span>
                <div className="text-lg font-bold text-red-700 font-mono mt-0.5">
                  {taskMetrics.overdueTasks}
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Capacity & Staffing */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-seg-plum" />
                  <span>Institutional Staffing & Divisions</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Organizational capacity across functional divisions and teams.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-border/60 p-3">
                <span className="text-muted-foreground">Total Staff Members:</span>
                <div className="text-lg font-bold text-foreground font-mono mt-0.5">
                  {employeeCount}
                </div>
                <span className="text-[10px] text-muted-foreground">Full-time, contract & interns</span>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <span className="text-muted-foreground">Operating Departments:</span>
                <div className="text-lg font-bold text-foreground font-mono mt-0.5">
                  {departmentCount}
                </div>
                <span className="text-[10px] text-muted-foreground">Active organizational units</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/employees"
                className="text-xs font-semibold text-seg-plum hover:underline inline-flex items-center gap-1"
              >
                <span>View Full Employee Directory</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
