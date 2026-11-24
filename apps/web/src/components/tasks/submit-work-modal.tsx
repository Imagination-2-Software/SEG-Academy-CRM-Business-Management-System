'use client';

import React, { useState } from 'react';
import { X, Upload, Link2, FileText, CheckCircle2 } from 'lucide-react';
import { Task, tasksApi } from '@/lib/api/tasks';
import { useAuth } from '@/lib/auth';

interface SubmitWorkModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: (updatedTask: Task) => void;
}

export function SubmitWorkModal({ task, isOpen, onClose, onSubmitted }: SubmitWorkModalProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentSize, setAttachmentSize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulateFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachmentName(file.name);
      const sizeKb = Math.round(file.size / 1024);
      setAttachmentSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() && !contentUrl.trim() && !attachmentName) {
      setError('Please provide submission notes, a deliverable URL, or attach a file.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const submitter = {
        id: user?.id || 'usr-current',
        name: user?.fullName || 'Current User',
        email: user?.email || 'user@segacademy.com',
        role: user?.role?.name || user?.role?.code || 'Staff',
      };

      const updated = await tasksApi.submitWork(
        {
          taskId: task.id,
          notes: notes.trim(),
          contentUrl: contentUrl.trim() || undefined,
          attachmentName: attachmentName || undefined,
          attachmentSize: attachmentSize || undefined,
        },
        submitter,
      );

      if (updated) {
        onSubmitted(updated);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to submit deliverables. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Submit Deliverables</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Task <span className="font-mono font-medium text-foreground">{task.taskCode}</span>: {task.title}
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
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Submission Notes & Summary <span className="text-seg-orange">*</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detail your completed work, test results, or links to assets..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Repository or Deliverable URL
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="url"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="https://github.com/seg-org/... or https://figma.com/file/..."
                className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Attach Report or Deliverable File
            </label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Select File</span>
                <input
                  type="file"
                  onChange={handleSimulateFile}
                  className="hidden"
                />
              </label>
              {attachmentName ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium truncate">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{attachmentName}</span>
                  <span className="text-[10px] text-muted-foreground">({attachmentSize})</span>
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">PDF, DOCX, ZIP, PNG (up to 25MB)</span>
              )}
            </div>
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
              {isSubmitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
