'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  organizationService,
  Department,
  ProfileEmployee,
} from '@/lib/api/organization';
import {
  ArrowLeft,
  Users2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

function CreateTeamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDeptId = searchParams.get('departmentId') || '';

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [departmentId, setDepartmentId] = useState(initialDeptId);
  const [leadId, setLeadId] = useState('');
  const [description, setDescription] = useState('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<ProfileEmployee[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [depts, staff] = await Promise.all([
          organizationService.getDepartments(),
          organizationService.getEmployees(),
        ]);
        setDepartments(depts);
        setEmployees(staff);

        if (!departmentId && depts.length > 0) {
          setDepartmentId(depts[0].id);
        }
      } catch {}
    };
    loadPrerequisites();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Team name is required.');
      return;
    }
    if (!code.trim()) {
      setErrorMessage('Team code is required.');
      return;
    }
    if (!departmentId) {
      setErrorMessage('Please select a parent department.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await organizationService.createTeam({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        departmentId,
        description: description.trim() || undefined,
        leadId: leadId || undefined,
      });

      router.push(`/teams/${created.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create team.');
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN']} requiredPermission="users:create">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link href="/teams" className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Teams
          </Link>
          <span>/</span>
          <span className="text-foreground">New Team</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create Functional Team
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Group faculty, staff, and interns under a specialized operating cohort
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border/70 bg-card p-6 shadow-sm">
          {/* Parent Department */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Parent Department <span className="text-red-500">*</span>
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              required
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Team Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Team Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Full Stack & AI Instruction Faculty"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm"
              required
            />
          </div>

          {/* Team Code */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Team Code <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. FS_FACULTY, DEVSECOPS, COUNSELING"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono text-sm uppercase"
              maxLength={20}
              required
            />
          </div>

          {/* Team Lead */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Team Lead (Optional)
            </label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">-- No Team Lead Assigned --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.employeeCode}) — {emp.jobTitle}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="State team responsibilities, curriculum domain, or functional objectives..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-border/80 pt-4">
            <Link href="/teams">
              <Button type="button" variant="outline" size="sm" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !name.trim() || !code.trim() || !departmentId}
              className="bg-seg-plum text-white hover:bg-seg-plum-hover"
            >
              {isSubmitting ? (
                'Creating...'
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Save Team
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default function CreateTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
        </div>
      }
    >
      <CreateTeamContent />
    </Suspense>
  );
}
