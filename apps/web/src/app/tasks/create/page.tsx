'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { TaskNav } from '@/components/tasks/task-nav';
import { TaskPriority, TaskAttachment, tasksApi } from '@/lib/api/tasks';
import { organizationService, Department, Team, ProfileEmployee } from '@/lib/api/organization';
import { useAuth } from '@/lib/auth';
import {
  CheckSquare,
  ArrowLeft,
  Upload,
  Calendar,
  Clock,
  User,
  Building2,
  Users2,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

export default function CreateTaskPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number | ''>(8);
  const [submissionRequirements, setSubmissionRequirements] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  // Organization Entities
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<ProfileEmployee[]>([]);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadOrgData() {
      try {
        const [dList, tList, eList] = await Promise.all([
          organizationService.getDepartments(),
          organizationService.getTeams(),
          organizationService.getEmployees(),
        ]);
        setDepartments(dList);
        setTeams(tList);
        setEmployees(eList);
      } catch (err) {
        console.error('Failed to load organization entities', err);
      }
    }
    loadOrgData();
  }, []);

  // Filtered teams based on selected department
  const filteredTeams = departmentId
    ? teams.filter((t) => t.departmentId === departmentId)
    : teams;

  // Filtered employees based on department or team
  const filteredEmployees = employees.filter((e) => {
    if (departmentId && e.departmentId && e.departmentId !== departmentId) return false;
    if (teamId && e.teamId && e.teamId !== teamId) return false;
    return true;
  });

  const handleSimulateAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      const sizeKb = Math.round(f.size / 1024);
      const newAtt: TaskAttachment = {
        name: f.name,
        size: sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`,
        uploadedAt: new Date().toISOString(),
      };
      setAttachments((prev) => [...prev, newAtt]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) {
      errs.title = 'Task title is required.';
    } else if (title.trim().length < 5) {
      errs.title = 'Title must be at least 5 characters.';
    }

    if (startDate && dueDate && new Date(dueDate).getTime() < new Date(startDate).getTime()) {
      errs.dueDate = 'Due date cannot precede start date.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmedCreate = async () => {
    try {
      setIsSubmitting(true);
      setShowConfirmModal(false);

      const creator = {
        id: user?.id || 'emp-current',
        name: user?.fullName || 'Current User',
        role: user?.role?.name || user?.role?.code || 'Administrator',
      };

      const selectedDept = departments.find((d) => d.id === departmentId);
      const selectedTeam = teams.find((t) => t.id === teamId);
      const selectedAssignee = employees.find((e) => e.id === assignedToId);

      const created = await tasksApi.createTask(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          instructions: instructions.trim() || undefined,
          departmentId: departmentId || undefined,
          teamId: teamId || undefined,
          assignedToId: assignedToId || undefined,
          priority,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          estimatedHours: estimatedHours !== '' ? Number(estimatedHours) : undefined,
          submissionRequirements: submissionRequirements.trim() || undefined,
          attachments,
        },
        creator,
      );

      // If specific entities were picked, decorate local task
      if (selectedDept) created.departmentName = selectedDept.name;
      if (selectedTeam) created.teamName = selectedTeam.name;
      if (selectedAssignee) {
        created.assignedToName = selectedAssignee.fullName;
        created.assignedToEmail = selectedAssignee.email;
        created.assignedToRole = selectedAssignee.jobTitle;
      }

      router.push(`/tasks/${created.id}`);
    } catch (err: any) {
      setErrors({ global: err?.message || 'Failed to create task.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href="/tasks"
                  className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Create New Task
                </h1>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Delegate operational duties, assign cohorts or staff, and configure deliverable expectations.
              </p>
            </div>
          </div>

          {/* Sub Navigation */}
          <TaskNav />

          {/* Error Banner */}
          {errors.global && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              {errors.global}
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handlePreSubmit} className="space-y-6">
            {/* Section 1: Overview */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
              <h2 className="text-sm font-semibold text-foreground border-b border-border/80 pb-2.5">
                1. Task Overview & Scope
              </h2>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Task Title <span className="text-seg-orange">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Conduct Code Review for Final Capstone Projects Batch 2026-A"
                  className={`w-full rounded-lg border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum ${
                    errors.title ? 'border-red-500' : 'border-input'
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-[11px] text-red-600">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  General Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="High-level objective or context for the assignment..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Detailed Instructions & Acceptance Criteria
                </label>
                <textarea
                  rows={4}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Step-by-step guidance, rubric expectations, compliance checklists..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
                />
              </div>
            </div>

            {/* Section 2: Department, Team & Assignee */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
              <h2 className="text-sm font-semibold text-foreground border-b border-border/80 pb-2.5">
                2. Assignment & Organizational Linkage
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      setTeamId('');
                      setAssignedToId('');
                    }}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
                  >
                    <option value="">Select Department (Optional)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Team
                  </label>
                  <select
                    value={teamId}
                    onChange={(e) => {
                      setTeamId(e.target.value);
                      setAssignedToId('');
                    }}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
                  >
                    <option value="">Select Team (Optional)</option>
                    {filteredTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned Employee */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Assigned Employee
                  </label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
                  >
                    <option value="">Unassigned (Queue)</option>
                    {filteredEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.jobTitle})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Schedule, Priority & Requirements */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
              <h2 className="text-sm font-semibold text-foreground border-b border-border/80 pb-2.5">
                3. Priority, Timelines & Submission Deliverables
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum font-semibold"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`w-full rounded-lg border bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum ${
                      errors.dueDate ? 'border-red-500' : 'border-input'
                    }`}
                  />
                  {errors.dueDate && (
                    <p className="mt-1 text-[11px] text-red-600">{errors.dueDate}</p>
                  )}
                </div>

                {/* Estimated Hours */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 16"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum font-mono"
                  />
                </div>
              </div>

              {/* Submission Requirements */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Submission Deliverable Requirements
                </label>
                <input
                  type="text"
                  value={submissionRequirements}
                  onChange={(e) => setSubmissionRequirements(e.target.value)}
                  placeholder="e.g. Provide GitHub pull request link and signed QA verification sheet"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Reference Materials & Attachments
                </label>
                <div className="flex flex-col gap-2">
                  <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Attach Reference File</span>
                    <input
                      type="file"
                      onChange={handleSimulateAttachment}
                      className="hidden"
                    />
                  </label>

                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-3.5 w-3.5 text-seg-plum shrink-0" />
                            <span className="font-medium text-foreground truncate">{att.name}</span>
                            <span className="text-[11px] text-muted-foreground">({att.size})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="text-muted-foreground hover:text-red-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-border/80 pt-4">
              <Link
                href="/tasks"
                className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-seg-plum px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-seg-plum/90 transition-colors"
              >
                <span>Review & Create Task</span>
              </button>
            </div>
          </form>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-seg-plum/10 text-seg-plum">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Confirm Task Delegation</h3>
                  <p className="text-xs text-muted-foreground">Please review details before assigning.</p>
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/30 p-3.5 space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Title:</span>{' '}
                  <span className="font-semibold text-foreground">{title}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>{' '}
                  <span className="font-semibold text-foreground">{priority}</span>
                </div>
                {dueDate && (
                  <div>
                    <span className="text-muted-foreground">Deadline:</span>{' '}
                    <span className="font-semibold text-foreground">{dueDate}</span>
                  </div>
                )}
                {assignedToId && (
                  <div>
                    <span className="text-muted-foreground">Assignee:</span>{' '}
                    <span className="font-semibold text-foreground">
                      {employees.find((e) => e.id === assignedToId)?.fullName || 'Selected Employee'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Edit Information
                </button>
                <button
                  type="button"
                  onClick={handleConfirmedCreate}
                  disabled={isSubmitting}
                  className="rounded-lg bg-seg-plum px-4 py-2 text-xs font-semibold text-white hover:bg-seg-plum/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Confirm & Delegate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
