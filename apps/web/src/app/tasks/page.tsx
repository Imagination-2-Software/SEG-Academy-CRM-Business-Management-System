'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { TaskNav } from '@/components/tasks/task-nav';
import { TaskPriorityBadge, TaskStatusBadge } from '@/components/tasks/task-badges';
import { Task, TaskMetrics, tasksApi, formatTaskDate, isTaskOverdue } from '@/lib/api/tasks';
import {
  CheckSquare,
  Clock,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Calendar,
  User,
} from 'lucide-react';

export default function TasksDashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<TaskMetrics>({
    totalTasks: 0,
    assignedTasks: 0,
    inProgressTasks: 0,
    pendingReviews: 0,
    completedTasks: 0,
    overdueTasks: 0,
    urgentTasks: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await tasksApi.getTasks();
        setTasks(data);
        setMetrics(tasksApi.computeMetrics(data));
      } catch (err) {
        console.error('Failed to load tasks', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const urgentAndInProgress = tasks.filter(
    (t) => t.status === 'IN_PROGRESS' || t.priority === 'URGENT' || isTaskOverdue(t.dueDate, t.status)
  ).slice(0, 5);

  const pendingSubmissions = tasks.filter((t) => t.status === 'UNDER_REVIEW').slice(0, 5);

  const recentTimeline = tasks
    .flatMap((t) => (t.timeline || []).map((a) => ({ ...a, taskTitle: t.title, taskCode: t.taskCode })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-seg-plum/10 text-seg-plum">
                  <CheckSquare className="h-4 w-4" />
                </span>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Tasks, Submissions & Reviews
                </h1>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Operational task delegation, assignment tracking, deliverable submissions, and evaluations.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/tasks/all"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
              >
                <span>Task Directory</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/tasks/create"
                className="inline-flex items-center gap-1.5 rounded-lg bg-seg-plum px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-seg-plum/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Task</span>
              </Link>
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <TaskNav />

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total Tasks</span>
                <CheckSquare className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">
                {metrics.totalTasks}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Active registry</div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Assigned</span>
                <User className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">
                {metrics.assignedTasks}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">To team members</div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">In Progress</span>
                <PlayCircle className="h-4 w-4 text-sky-500" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-sky-700 dark:text-sky-400 font-mono">
                {metrics.inProgressTasks}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Actively underway</div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pending Review</span>
                <FileCheck2 className="h-4 w-4 text-purple-500" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-purple-700 dark:text-purple-400 font-mono">
                {metrics.pendingReviews}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Submissions lodged</div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Completed</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 font-mono">
                {metrics.completedTasks}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {metrics.completionRate}% completion
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Overdue</span>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-red-700 dark:text-red-400 font-mono">
                {metrics.overdueTasks}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Past deadline</div>
            </div>
          </div>

          {/* Main 2-Column Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Urgent & Active Tasks (2 Columns) */}
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-xl border border-border bg-card shadow-2xs">
                <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Priority & Active Workflow
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Urgent items, in-progress commitments, and approaching deadlines.
                    </p>
                  </div>
                  <Link
                    href="/tasks/all"
                    className="text-xs font-semibold text-seg-plum hover:underline"
                  >
                    View all ({tasks.length})
                  </Link>
                </div>

                <div className="divide-y divide-border/60">
                  {loading ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      Loading active tasks...
                    </div>
                  ) : urgentAndInProgress.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No urgent or pending tasks at this time.
                    </div>
                  ) : (
                    urgentAndInProgress.map((task) => {
                      const overdue = isTaskOverdue(task.dueDate, task.status);
                      return (
                        <div
                          key={task.id}
                          className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-seg-plum">
                                {task.taskCode}
                              </span>
                              <TaskPriorityBadge priority={task.priority} />
                              <TaskStatusBadge status={task.status} />
                              {overdue && (
                                <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.2 text-[10px] font-bold text-red-700">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/tasks/${task.id}`}
                              className="block truncate text-xs font-semibold text-foreground hover:text-seg-plum hover:underline"
                            >
                              {task.title}
                            </Link>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                              {task.assignedToName && (
                                <span>Assignee: <span className="font-medium text-foreground">{task.assignedToName}</span></span>
                              )}
                              {task.departmentName && (
                                <span>• {task.departmentName}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right text-xs">
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground justify-end">
                                <Calendar className="h-3 w-3" />
                                <span>Due: {formatTaskDate(task.dueDate)}</span>
                              </div>
                            </div>
                            <Link
                              href={`/tasks/${task.id}`}
                              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                            >
                              Details
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Submissions Awaiting Evaluation */}
              <div className="rounded-xl border border-border bg-card shadow-2xs">
                <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Pending Reviews & Submissions
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Submissions lodged by assignees awaiting evaluation and rubric grading.
                    </p>
                  </div>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                    {pendingSubmissions.length} Pending
                  </span>
                </div>

                <div className="divide-y divide-border/60">
                  {pendingSubmissions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      All deliverables have been evaluated. No pending reviews in queue.
                    </div>
                  ) : (
                    pendingSubmissions.map((task) => {
                      const latestSub = task.submissions[0];
                      return (
                        <div
                          key={task.id}
                          className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-seg-plum">
                                {task.taskCode}
                              </span>
                              <span className="text-xs font-semibold text-foreground truncate">
                                {task.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground italic truncate max-w-md">
                              "{latestSub?.notes || 'Deliverable uploaded for review'}"
                            </p>
                            <div className="text-[10px] text-muted-foreground">
                              Submitted by <span className="font-medium text-foreground">{latestSub?.submittedByName}</span> on {formatTaskDate(latestSub?.submissionDate)}
                            </div>
                          </div>

                          <Link
                            href={`/tasks/${task.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-seg-plum px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-seg-plum/90"
                          >
                            <span>Evaluate Submission</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Column: Recent Activity & Quick Shortcuts */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <Link
                    href="/tasks/create"
                    className="flex items-center justify-between rounded-lg border border-border/80 bg-background p-3 text-xs font-semibold text-foreground hover:bg-muted hover:border-seg-plum transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <Plus className="h-4 w-4 text-seg-plum" />
                      <span>Delegate New Task</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>

                  <Link
                    href="/tasks/all?status=UNDER_REVIEW"
                    className="flex items-center justify-between rounded-lg border border-border/80 bg-background p-3 text-xs font-semibold text-foreground hover:bg-muted hover:border-seg-plum transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCheck2 className="h-4 w-4 text-purple-600" />
                      <span>Review Submissions Queue</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>

                  <Link
                    href="/tasks/all?overdue=true"
                    className="flex items-center justify-between rounded-lg border border-border/80 bg-background p-3 text-xs font-semibold text-foreground hover:bg-muted hover:border-seg-plum transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span>Audit Overdue Deadlines</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Recent Activity Stream
                </h3>
                <div className="flow-root">
                  <ul className="-mb-4">
                    {recentTimeline.map((item, idx) => (
                      <li key={item.id} className="relative pb-4">
                        {idx !== recentTimeline.length - 1 && (
                          <span
                            className="absolute left-3 top-3 -ml-px h-full w-0.5 bg-border"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex items-start space-x-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-seg-plum/10 text-seg-plum ring-4 ring-card">
                            <CheckSquare className="h-3 w-3" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-foreground">
                              <span className="font-semibold">{item.actorName}</span>{' '}
                              <span className="text-muted-foreground">{item.action}</span>
                            </div>
                            <div className="text-[10px] font-mono text-seg-plum mt-0.5">
                              {item.taskCode} • {formatTaskDate(item.timestamp)}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
