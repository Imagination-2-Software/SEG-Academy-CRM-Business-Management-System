'use client';

import React from 'react';
import { TaskPriority, TaskStatus, SubmissionStatus, ReviewOutcome } from '@/lib/api/tasks';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, PlayCircle, XCircle } from 'lucide-react';

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  switch (priority) {
    case 'URGENT':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
          Urgent
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-400">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          High
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Medium
        </span>
      );
    case 'LOW':
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Low
        </span>
      );
  }
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  switch (status) {
    case 'TODO':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Clock className="h-3 w-3 text-slate-500" />
          To Do
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-300">
          <PlayCircle className="h-3 w-3 text-sky-500" />
          In Progress
        </span>
      );
    case 'UNDER_REVIEW':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-medium text-purple-700 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-purple-300">
          <AlertCircle className="h-3 w-3 text-purple-500" />
          Under Review
        </span>
      );
    case 'DONE':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Completed
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
          <XCircle className="h-3 w-3 text-rose-500" />
          Cancelled
        </span>
      );
    default:
      return null;
  }
}

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  switch (status) {
    case 'DRAFT':
      return (
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          Draft
        </span>
      );
    case 'SUBMITTED':
      return (
        <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
          Submitted
        </span>
      );
    case 'LATE':
      return (
        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          Late
        </span>
      );
    case 'RESUBMISSION_REQUESTED':
      return (
        <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
          Revisions Needed
        </span>
      );
    case 'GRADED':
      return (
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          Evaluated
        </span>
      );
    default:
      return null;
  }
}

export function ReviewOutcomeBadge({ outcome }: { outcome: ReviewOutcome }) {
  switch (outcome) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </span>
      );
    case 'CHANGES_REQUESTED':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          <AlertCircle className="h-3 w-3" />
          Changes Requested
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
          <XCircle className="h-3 w-3" />
          Rejected
        </span>
      );
    default:
      return null;
  }
}
