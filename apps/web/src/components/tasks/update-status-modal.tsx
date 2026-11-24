'use client';

import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { Task, TaskStatus, tasksApi } from '@/lib/api/tasks';
import { useAuth } from '@/lib/auth';

interface UpdateStatusModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedTask: Task) => void;
}

export function UpdateStatusModal({
  task,
  isOpen,
  onClose,
  onUpdated,
}: UpdateStatusModalProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      const actorName = user?.fullName || 'Staff Member';
      const updated = await tasksApi.updateTaskStatus(task.id, status, actorName);
      if (updated) {
        onUpdated(updated);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: Array<{ value: TaskStatus; label: string; desc: string }> = [
    { value: 'TODO', label: 'To Do', desc: 'Task queued, awaiting active work' },
    { value: 'IN_PROGRESS', label: 'In Progress', desc: 'Work underway by assigned staff' },
    { value: 'UNDER_REVIEW', label: 'Under Review', desc: 'Deliverables submitted and awaiting review' },
    { value: 'DONE', label: 'Completed', desc: 'Work verified and accepted' },
    { value: 'CANCELLED', label: 'Cancelled', desc: 'Task discarded or invalidated' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Update Task Status</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Current: <span className="font-semibold text-foreground">{task.status}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
          {statusOptions.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                status === opt.value
                  ? 'border-seg-plum bg-seg-plum/5 ring-1 ring-seg-plum dark:bg-seg-plum/10'
                  : 'border-border bg-card hover:bg-muted/50'
              }`}
            >
              <input
                type="radio"
                name="taskStatus"
                value={opt.value}
                checked={status === opt.value}
                onChange={() => setStatus(opt.value)}
                className="mt-0.5 text-seg-plum focus:ring-seg-plum"
              />
              <div className="text-xs">
                <div className="font-semibold text-foreground">{opt.label}</div>
                <div className="text-muted-foreground text-[11px] mt-0.5">{opt.desc}</div>
              </div>
            </label>
          ))}

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
              {isSubmitting ? 'Saving...' : 'Apply Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
