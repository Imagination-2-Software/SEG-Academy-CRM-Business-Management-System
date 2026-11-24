'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  organizationService,
  ProfileEmployee,
} from '@/lib/api/organization';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  AlertCircle,
  UserCheck,
} from 'lucide-react';

export default function CreateDepartmentPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [headId, setHeadId] = useState('');
  const [employees, setEmployees] = useState<ProfileEmployee[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const staff = await organizationService.getEmployees();
        setEmployees(staff);
      } catch {}
    };
    loadStaff();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Department name is required.');
      return;
    }
    if (!code.trim()) {
      setErrorMessage('Department unique code is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await organizationService.createDepartment({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        headId: headId || undefined,
      });

      router.push(`/departments/${created.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create department.');
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'HR_MANAGER']}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link
            href="/departments"
            className="flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Departments
          </Link>
          <span>/</span>
          <span className="text-foreground">New Department</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create Department
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define a high-level organizational division or curriculum faculty
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border/70 bg-card p-6 shadow-sm">
          {/* Department Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Department Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Technology & Cloud Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Official institutional name used in reporting and directory structures.
            </p>
          </div>

          {/* Department Code */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Department Code <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. TECH, ACAD, ADM, FIN, HR"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono text-sm uppercase"
              maxLength={10}
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Unique short system code (alphanumeric, max 10 characters).
            </p>
          </div>

          {/* Department Head (Optional) */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Department Head (Optional)
            </label>
            <select
              value={headId}
              onChange={(e) => setHeadId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">-- No Department Head Assigned --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.employeeCode}) — {emp.jobTitle}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Designate a senior faculty member or director accountable for this department.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Summary of operational charter, educational responsibilities, or administrative scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-border/80 pt-4">
            <Link href="/departments">
              <Button type="button" variant="outline" size="sm" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !name.trim() || !code.trim()}
              className="bg-seg-plum text-white hover:bg-seg-plum-hover"
            >
              {isSubmitting ? (
                'Creating...'
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Save Department
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
