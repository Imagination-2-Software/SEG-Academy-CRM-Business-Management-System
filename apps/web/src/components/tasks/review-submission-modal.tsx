'use client';

import React, { useState } from 'react';
import { X, Award, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Task, TaskSubmission, ReviewOutcome, tasksApi } from '@/lib/api/tasks';
import { useAuth } from '@/lib/auth';

interface ReviewSubmissionModalProps {
  task: Task;
  submission: TaskSubmission;
  isOpen: boolean;
  onClose: () => void;
  onReviewed: (updatedTask: Task) => void;
}

export function ReviewSubmissionModal({
  task,
  submission,
  isOpen,
  onClose,
  onReviewed,
}: ReviewSubmissionModalProps) {
  const { user } = useAuth();
  const [score, setScore] = useState<number>(85);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<ReviewOutcome>('APPROVED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score < 0 || score > 100 || isNaN(score)) {
      setError('Score must be a valid number between 0 and 100.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const reviewer = {
        id: user?.id || 'usr-reviewer',
        name: user?.fullName || 'Academic Evaluator',
        email: user?.email || 'evaluator@segacademy.com',
        jobTitle: user?.role?.name || user?.role?.code || 'Lead Evaluator',
      };

      const updated = await tasksApi.reviewSubmission(
        {
          taskId: task.id,
          submissionId: submission.id,
          score: Number(score),
          feedback: feedback.trim() || undefined,
          status,
        },
        reviewer,
      );

      if (updated) {
        onReviewed(updated);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Evaluate Submission</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submitted by <span className="font-semibold text-foreground">{submission.submittedByName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Submission Brief */}
        <div className="mt-4 rounded-lg border border-border/80 bg-muted/40 p-3 text-xs">
          <div className="font-medium text-foreground">Deliverable Summary:</div>
          <p className="mt-1 text-muted-foreground italic">
            {submission.notes || 'No description notes attached.'}
          </p>
          {submission.attachmentName && (
            <div className="mt-2 flex items-center gap-1.5 font-medium text-foreground">
              <span className="text-seg-plum">📎 Attached:</span> {submission.attachmentName} ({submission.attachmentSize})
            </div>
          )}
          {submission.contentUrl && (
            <div className="mt-1.5 truncate">
              <span className="text-seg-plum">🔗 URL:</span>{' '}
              <a href={submission.contentUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                {submission.contentUrl}
              </a>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Evaluation Outcome
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('APPROVED')}
                className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                  status === 'APPROVED'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 ring-1 ring-emerald-500'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 mb-1 text-emerald-600" />
                Approve (Pass)
              </button>

              <button
                type="button"
                onClick={() => setStatus('CHANGES_REQUESTED')}
                className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                  status === 'CHANGES_REQUESTED'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 ring-1 ring-amber-500'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <AlertCircle className="h-4 w-4 mb-1 text-amber-600" />
                Revisions Needed
              </button>

              <button
                type="button"
                onClick={() => setStatus('REJECTED')}
                className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                  status === 'REJECTED'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 ring-1 ring-rose-500'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <XCircle className="h-4 w-4 mb-1 text-rose-600" />
                Reject
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Numeric Score (0 – 100)
            </label>
            <div className="relative w-36">
              <Award className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-xs font-semibold text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Evaluator Feedback & Rubric Observations
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback, notes on quality, or specific items to revise..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-seg-plum px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-seg-plum/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Review...' : 'Record Evaluation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
