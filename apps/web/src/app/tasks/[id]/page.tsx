'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { SubmitWorkModal } from '@/components/tasks/submit-work-modal';
import { ReviewSubmissionModal } from '@/components/tasks/review-submission-modal';
import { UpdateStatusModal } from '@/components/tasks/update-status-modal';
import {
  Task,
  TaskSubmission,
  tasksApi,
  formatTaskDate,
  formatTaskDateTime,
  isTaskOverdue,
} from '@/lib/api/tasks';
import {
  ArrowLeft,
  CheckSquare,
  Clock,
  Calendar,
  Building2,
  Users2,
  User,
  Upload,
  FileCheck2,
  Award,
  Link2,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  History,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    async function loadTask() {
      try {
        const found = await tasksApi.getTaskById(taskId);
        setTask(found);
      } catch (err) {
        console.error('Failed to load task', err);
      } finally {
        setLoading(false);
      }
    }
    if (taskId) {
      loadTask();
    }
  }, [taskId]);

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="flex h-64 items-center justify-center">
            <p className="text-xs text-muted-foreground">Loading task details...</p>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!task) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="rounded-xl border border-border bg-card p-12 text-center shadow-2xs space-y-3">
            <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
            <h2 className="text-base font-semibold text-foreground">Task Not Found</h2>
            <p className="text-xs text-muted-foreground">
              No task exists with identifier <span className="font-mono">{taskId}</span>.
            </p>
            <div className="pt-2">
              <Link
                href="/tasks/all"
                className="inline-flex items-center gap-1.5 rounded-lg bg-seg-plum px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-seg-plum/90"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Task Directory</span>
              </Link>
            </div>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  const overdue = isTaskOverdue(task.dueDate, task.status);
  const pendingSubmission = task.submissions.find(
    (s) => s.status === 'SUBMITTED' || s.status === 'LATE'
  );

  const handleOpenReview = (sub: TaskSubmission) => {
    setSelectedSubmission(sub);
    setShowReviewModal(true);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Top Breadcrumb & Actions Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/tasks/all"
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Link href="/tasks" className="hover:underline">
                    Tasks
                  </Link>
                  <ChevronRight className="h-3 w-3" />
                  <span className="font-mono font-semibold text-seg-plum">{task.taskCode}</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground line-clamp-1 mt-0.5">
                  {task.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowStatusModal(true)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs"
              >
                Update Status
              </button>

              {pendingSubmission && (
                <button
                  onClick={() => handleOpenReview(pendingSubmission)}
                  className="flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3.5 py-2 text-xs font-semibold text-purple-800 hover:bg-purple-100 shadow-2xs dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                >
                  <FileCheck2 className="h-3.5 w-3.5 text-purple-600" />
                  <span>Evaluate Submission</span>
                </button>
              )}

              <button
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-seg-plum px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-seg-plum/90 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Submit Deliverables</span>
              </button>
            </div>
          </div>

          {/* Sub Navigation */}
          <TaskNav />

          {/* Status & Overview Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-mono font-bold text-seg-plum text-sm">{task.taskCode}</span>
              <TaskPriorityBadge priority={task.priority} />
              <TaskStatusBadge status={task.status} />
              {overdue && (
                <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                  OVERDUE
                </span>
              )}
            </div>

            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              {task.dueDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Due: <strong className="text-foreground">{formatTaskDate(task.dueDate)}</strong></span>
                </div>
              )}
              {task.estimatedHours && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Effort: <strong className="text-foreground font-mono">{task.estimatedHours}h</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* 2-Column Content Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Column (2/3) */}
            <div className="space-y-6 lg:col-span-2">
              {/* Task Details & Instructions Card */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                <h2 className="text-sm font-semibold text-foreground border-b border-border/80 pb-2.5">
                  Task Scope & Instructions
                </h2>

                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Description
                  </h3>
                  <p className="mt-1 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {task.description || 'No descriptive overview provided for this task.'}
                  </p>
                </div>

                {task.instructions && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Instructions & Acceptance Criteria
                    </h3>
                    <div className="mt-1 rounded-lg border border-border/80 bg-muted/20 p-3.5 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {task.instructions}
                    </div>
                  </div>
                )}

                {task.submissionRequirements && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Required Submission Deliverables
                    </h3>
                    <p className="mt-1 text-xs text-seg-plum font-medium">
                      📋 {task.submissionRequirements}
                    </p>
                  </div>
                )}

                {/* Attachments / Reference Files */}
                {task.attachments && task.attachments.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Reference Attachments ({task.attachments.length})
                    </h3>
                    <div className="mt-2 space-y-1.5">
                      {task.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3.5 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-seg-plum" />
                            <span className="font-medium text-foreground">{att.name}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">({att.size})</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTaskDate(att.uploadedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submissions & Reviews History Card */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <h2 className="text-sm font-semibold text-foreground">
                    Deliverable Submissions ({task.submissions.length})
                  </h2>
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="text-xs font-semibold text-seg-plum hover:underline flex items-center gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    <span>Lodge New Deliverable</span>
                  </button>
                </div>

                {task.submissions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No deliverables lodged yet. When the assignee submits work, review history will appear here.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {task.submissions.map((sub, idx) => (
                      <div
                        key={sub.id}
                        className="rounded-lg border border-border bg-muted/20 p-4 space-y-3"
                      >
                        {/* Submission Header */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">
                              Submission #{task.submissions.length - idx}
                            </span>
                            <SubmissionStatusBadge status={sub.status} />
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Submitted on {formatTaskDateTime(sub.submissionDate)} by{' '}
                            <strong className="text-foreground">{sub.submittedByName}</strong>
                          </div>
                        </div>

                        {/* Submission Notes */}
                        {sub.notes && (
                          <div className="text-xs text-foreground leading-relaxed">
                            <span className="font-medium text-muted-foreground">Notes: </span>
                            {sub.notes}
                          </div>
                        )}

                        {/* Deliverable File / URL */}
                        <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                          {sub.attachmentName && (
                            <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-foreground">
                              <FileText className="h-3.5 w-3.5 text-seg-plum" />
                              <span className="font-medium">{sub.attachmentName}</span>
                              <span className="text-[10px] text-muted-foreground">({sub.attachmentSize})</span>
                            </div>
                          )}

                          {sub.contentUrl && (
                            <a
                              href={sub.contentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-seg-plum hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span className="font-medium">External Asset Link</span>
                            </a>
                          )}
                        </div>

                        {/* Evaluation Reviews */}
                        {sub.reviews && sub.reviews.length > 0 ? (
                          <div className="mt-3 rounded-lg border border-border/80 bg-background p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Evaluation Report
                              </span>
                              <ReviewOutcomeBadge outcome={sub.reviews[0].status} />
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <div>
                                Evaluated by <strong className="text-foreground">{sub.reviews[0].reviewerName}</strong>{' '}
                                <span className="text-[10px] text-muted-foreground">
                                  ({formatTaskDate(sub.reviews[0].reviewedAt)})
                                </span>
                              </div>
                              <div className="font-mono text-sm font-bold text-seg-plum">
                                {sub.reviews[0].score} / 100
                              </div>
                            </div>

                            {sub.reviews[0].feedback && (
                              <p className="text-xs text-muted-foreground italic border-t border-border/60 pt-2 mt-1">
                                "{sub.reviews[0].feedback}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                            <span className="text-muted-foreground italic text-[11px]">
                              Awaiting rubric review & grading
                            </span>
                            <button
                              onClick={() => handleOpenReview(sub)}
                              className="font-semibold text-seg-plum hover:underline"
                            >
                              Evaluate Now →
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity Timeline Card */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                <h2 className="text-sm font-semibold text-foreground border-b border-border/80 pb-2.5">
                  Task Audit & Activity Log
                </h2>

                <div className="flow-root">
                  <ul className="-mb-4">
                    {(task.timeline || []).map((item, idx) => (
                      <li key={item.id} className="relative pb-4">
                        {idx !== (task.timeline || []).length - 1 && (
                          <span
                            className="absolute left-3 top-3 -ml-px h-full w-0.5 bg-border"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex items-start space-x-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-seg-plum/10 text-seg-plum ring-4 ring-card">
                            <History className="h-3 w-3" />
                          </span>
                          <div className="min-w-0 flex-1 text-xs">
                            <div className="text-foreground">
                              <span className="font-semibold">{item.actorName}</span>{' '}
                              <span className="text-muted-foreground">{item.action}</span>
                            </div>
                            {item.details && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground italic">
                                {item.details}
                              </p>
                            )}
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {formatTaskDateTime(item.timestamp)}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Sidebar Column (1/3) */}
            <div className="space-y-6">
              {/* Assignee Card */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Assigned Employee
                </h3>
                {task.assignedToName ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-seg-plum/10 text-sm font-bold text-seg-plum border border-seg-plum/20">
                        {task.assignedToName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-foreground truncate">
                          {task.assignedToName}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {task.assignedToRole || 'Staff Member'}
                        </div>
                      </div>
                    </div>

                    {task.assignedToEmail && (
                      <div className="border-t border-border/80 pt-2 text-xs text-muted-foreground truncate">
                        <span className="text-muted-foreground">Email:</span>{' '}
                        <span className="text-foreground font-mono">{task.assignedToEmail}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    This task is currently in the unassigned queue.
                  </div>
                )}
              </div>

              {/* Task Origin / Creator Card */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-2 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Task Metadata
                </h3>
                <div className="flex items-center justify-between border-b border-border/60 py-1.5">
                  <span className="text-muted-foreground">Created By</span>
                  <span className="font-semibold text-foreground">{task.createdByName}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 py-1.5">
                  <span className="text-muted-foreground">Created Date</span>
                  <span className="font-medium text-foreground">{formatTaskDate(task.createdAt)}</span>
                </div>
                {task.startDate && (
                  <div className="flex items-center justify-between border-b border-border/60 py-1.5">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="font-medium text-foreground">{formatTaskDate(task.startDate)}</span>
                  </div>
                )}
                {task.dueDate && (
                  <div className="flex items-center justify-between border-b border-border/60 py-1.5">
                    <span className="text-muted-foreground">Deadline</span>
                    <span className={`font-semibold ${overdue ? 'text-red-600' : 'text-foreground'}`}>
                      {formatTaskDate(task.dueDate)}
                    </span>
                  </div>
                )}
                {task.completedAt && (
                  <div className="flex items-center justify-between border-b border-border/60 py-1.5">
                    <span className="text-muted-foreground">Completed At</span>
                    <span className="font-medium text-emerald-600">{formatTaskDate(task.completedAt)}</span>
                  </div>
                )}
                {task.departmentName && (
                  <div className="flex items-center justify-between border-b border-border/60 py-1.5">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium text-foreground">{task.departmentName}</span>
                  </div>
                )}
                {task.teamName && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">Team</span>
                    <span className="font-medium text-foreground">{task.teamName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <SubmitWorkModal
          task={task}
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          onSubmitted={(updated) => setTask(updated)}
        />

        {selectedSubmission && (
          <ReviewSubmissionModal
            task={task}
            submission={selectedSubmission}
            isOpen={showReviewModal}
            onClose={() => {
              setShowReviewModal(false);
              setSelectedSubmission(null);
            }}
            onReviewed={(updated) => setTask(updated)}
          />
        )}

        <UpdateStatusModal
          task={task}
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          onUpdated={(updated) => setTask(updated)}
        />
      </AppShell>
    </ProtectedRoute>
  );
}
