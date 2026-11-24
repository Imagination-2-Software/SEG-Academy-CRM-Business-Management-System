'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { TaskNav } from '@/components/tasks/task-nav';
import {
  TaskPriorityBadge,
  TaskStatusBadge,
  SubmissionStatusBadge,
  ReviewOutcomeBadge,
} from '@/components/tasks/task-badges';
import { UpdateStatusModal } from '@/components/tasks/update-status-modal';
import { Task, TaskPriority, TaskStatus, tasksApi, formatTaskDate, isTaskOverdue } from '@/lib/api/tasks';
import {
  Search,
  Filter,
  Plus,
  Eye,
  MoreVertical,
  CheckSquare,
  AlertCircle,
  FileCheck2,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function TaskDirectoryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');

  // Modals
  const [statusModalTask, setStatusModalTask] = useState<Task | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    async function fetchTasks() {
      try {
        const data = await tasksApi.getTasks();
        setTasks(data);
      } catch (err) {
        console.error('Failed to load tasks', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  // Department and Assignee unique lists for filters
  const departments = useMemo(() => {
    const list = new Set<string>();
    tasks.forEach((t) => {
      if (t.departmentName) list.add(t.departmentName);
    });
    return Array.from(list);
  }, [tasks]);

  const assignees = useMemo(() => {
    const list = new Set<string>();
    tasks.forEach((t) => {
      if (t.assignedToName) list.add(t.assignedToName);
    });
    return Array.from(list);
  }, [tasks]);

  // Filtering
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesCode = t.taskCode.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesAssignee = t.assignedToName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCode && !matchesDesc && !matchesAssignee) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }

      // Priority
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) {
        return false;
      }

      // Department
      if (departmentFilter !== 'ALL' && t.departmentName !== departmentFilter) {
        return false;
      }

      // Assignee
      if (assigneeFilter !== 'ALL' && t.assignedToName !== assigneeFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, departmentFilter, assigneeFilter]);

  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setDepartmentFilter('ALL');
    setAssigneeFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    departmentFilter !== 'ALL' ||
    assigneeFilter !== 'ALL';

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
                  Task Directory
                </h1>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Comprehensive registry of institutional tasks, project milestones, and assignment statuses.
              </p>
            </div>

            <Link
              href="/tasks/create"
              className="inline-flex items-center gap-1.5 rounded-lg bg-seg-plum px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-seg-plum/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Task</span>
            </Link>
          </div>

          {/* Sub Navigation */}
          <TaskNav />

          {/* Filter Bar */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by title, ID (e.g. TSK-101), or assignee..."
                  className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="DONE">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <select
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between border-t border-border/80 pt-2 text-xs text-muted-foreground">
                <span>
                  Showing {filteredTasks.length} of {tasks.length} total tasks
                </span>
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 font-semibold text-seg-plum hover:underline"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reset Filters</span>
                </button>
              </div>
            )}
          </div>

          {/* Table Container */}
          <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Task Code</th>
                    <th className="py-3 px-4">Title & Department</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Submissions / Review</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                        Loading task directory...
                      </td>
                    </tr>
                  ) : paginatedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                        No tasks match the active search or filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map((task) => {
                      const overdue = isTaskOverdue(task.dueDate, task.status);
                      const latestSub = task.submissions[0];
                      const latestReview = latestSub?.reviews[0];

                      return (
                        <tr
                          key={task.id}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          {/* Task Code */}
                          <td className="py-3.5 px-4 font-mono font-semibold text-seg-plum whitespace-nowrap">
                            <Link href={`/tasks/${task.id}`} className="hover:underline">
                              {task.taskCode}
                            </Link>
                          </td>

                          {/* Title & Department */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <Link
                              href={`/tasks/${task.id}`}
                              className="font-semibold text-foreground hover:text-seg-plum hover:underline line-clamp-1"
                            >
                              {task.title}
                            </Link>
                            <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {task.departmentName || 'General Operations'}
                              {task.teamName && ` • ${task.teamName}`}
                            </div>
                          </td>

                          {/* Assignee */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {task.assignedToName ? (
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-seg-plum/10 text-[10px] font-bold text-seg-plum">
                                  {task.assignedToName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="text-xs">
                                  <div className="font-medium text-foreground">{task.assignedToName}</div>
                                  <div className="text-[10px] text-muted-foreground">{task.assignedToRole || 'Staff'}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">Unassigned</span>
                            )}
                          </td>

                          {/* Priority */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <TaskPriorityBadge priority={task.priority} />
                          </td>

                          {/* Due Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className={`text-xs ${overdue ? 'font-bold text-red-600' : 'text-foreground'}`}>
                                {formatTaskDate(task.dueDate)}
                              </span>
                              {overdue && (
                                <span className="text-[10px] font-semibold text-red-600 uppercase">
                                  Overdue
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <TaskStatusBadge status={task.status} />
                          </td>

                          {/* Submissions / Review */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {task.submissions.length === 0 ? (
                              <span className="text-[11px] text-muted-foreground">No submissions</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="rounded-md border border-purple-200 bg-purple-50 px-1.5 py-0.2 text-[10px] font-semibold text-purple-700">
                                  {task.submissions.length} Lodged
                                </span>
                                {latestReview && (
                                  <ReviewOutcomeBadge outcome={latestReview.status} />
                                )}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setStatusModalTask(task)}
                                title="Change Status"
                                className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                Status
                              </button>
                              <Link
                                href={`/tasks/${task.id}`}
                                className="rounded-md bg-seg-plum/10 p-1 text-seg-plum hover:bg-seg-plum hover:text-white transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border/80 px-4 py-3 bg-muted/10 text-xs">
              <div className="text-muted-foreground">
                Showing{' '}
                <span className="font-semibold text-foreground">
                  {filteredTasks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * pageSize, filteredTasks.length)}
                </span>{' '}
                of <span className="font-semibold text-foreground">{filteredTasks.length}</span> tasks
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-foreground disabled:opacity-40 hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 font-mono font-medium text-foreground">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-foreground disabled:opacity-40 hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Modal */}
        {statusModalTask && (
          <UpdateStatusModal
            task={statusModalTask}
            isOpen={true}
            onClose={() => setStatusModalTask(null)}
            onUpdated={(updated) => {
              handleTaskUpdated(updated);
              setStatusModalTask(null);
            }}
          />
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
