'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  organizationService,
  Department,
  getEmploymentTypeBadge,
  getAccountStatusBadge,
} from '@/lib/api/organization';
import {
  ArrowLeft,
  Building2,
  Users2,
  UserSquare2,
  Plus,
  Eye,
  Calendar,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function DepartmentDetailsPage() {
  const params = useParams();
  const departmentId = params.id as string;

  const [department, setDepartment] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'teams' | 'employees'>('teams');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDepartment = async () => {
    setIsLoading(true);
    try {
      const [deptData, allStaff] = await Promise.all([
        organizationService.getDepartmentById(departmentId),
        organizationService.getEmployees({ departmentId }),
      ]);
      setDepartment(deptData);
      setEmployees(allStaff);
    } catch {
      setDepartment(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (departmentId) {
      fetchDepartment();
    }
  }, [departmentId]);

  if (isLoading) {
    return (
      <AppShell allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN']} requiredPermission="users:read">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
          <p className="text-xs font-medium text-muted-foreground">
            Loading department records...
          </p>
        </div>
      </AppShell>
    );
  }

  if (!department) {
    return (
      <AppShell allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN']} requiredPermission="users:read">
        <div className="mx-auto max-w-xl p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">
            Department Not Found
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The requested department identifier does not match any active division.
          </p>
          <div className="mt-6">
            <Link href="/departments">
              <Button size="sm" variant="outline">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Departments
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN']} requiredPermission="users:read">
      <div className="space-y-6">
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
          <span className="font-semibold text-foreground">{department.name}</span>
        </div>

        {/* Department Overview Banner */}
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge variant="plum" className="font-mono text-sm font-bold">
                  {department.code}
                </Badge>
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {department.name}
                </h1>
              </div>

              {department.description && (
                <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
                  {department.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:self-start">
              <Link href={`/teams/create?departmentId=${department.id}`}>
                <Button size="sm" variant="outline" className="text-xs">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Team
                </Button>
              </Link>
              <Link href={`/employees/create?departmentId=${department.id}`}>
                <Button size="sm" className="bg-seg-plum text-white hover:bg-seg-plum-hover text-xs">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Staff
                </Button>
              </Link>
            </div>
          </div>

          {/* Department Meta Grid */}
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border/60 pt-6 sm:grid-cols-3">
            {/* Department Head */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Department Head
              </span>
              {department.head ? (
                <div className="mt-1.5 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-seg-plum-subtle text-xs font-bold text-seg-plum">
                    {department.head.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      {department.head.fullName}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {department.head.jobTitle}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  No department head assigned
                </p>
              )}
            </div>

            {/* Teams Count */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Functional Teams
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">
                  {department.teamCount || (department.teams ? department.teams.length : 0)}
                </span>
                <span className="text-xs text-muted-foreground">teams operating</span>
              </div>
            </div>

            {/* Employees Count */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Staff
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">
                  {employees.length}
                </span>
                <span className="text-xs text-muted-foreground">assigned members</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs: Teams vs Employees */}
        <div className="space-y-4">
          <div className="flex border-b border-border/80 pb-px">
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                activeTab === 'teams'
                  ? 'border-seg-plum text-seg-plum dark:text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users2 className="h-4 w-4" />
              <span>Associated Teams ({department.teams ? department.teams.length : 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                activeTab === 'employees'
                  ? 'border-seg-plum text-seg-plum dark:text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserSquare2 className="h-4 w-4" />
              <span>Department Employees ({employees.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'teams' ? (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
              {!department.teams || department.teams.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No functional teams created in this department yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/30 font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">Team Code</th>
                        <th className="px-4 py-3">Team Name</th>
                        <th className="px-4 py-3">Team Lead</th>
                        <th className="px-4 py-3 text-center">Members</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {department.teams.map((team) => (
                        <tr key={team.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">
                            {team.code}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            <Link
                              href={`/teams/${team.id}`}
                              className="hover:text-seg-plum hover:underline"
                            >
                              {team.name}
                            </Link>
                            {team.description && (
                              <p className="line-clamp-1 font-normal text-muted-foreground text-[11px]">
                                {team.description}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {team.leadName || 'Unassigned'}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-foreground">
                            {team.employeeCount || 0}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/teams/${team.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                View Team
                                <ChevronRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
              {employees.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No employees assigned to this department yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/30 font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">Employee Code</th>
                        <th className="px-4 py-3">Full Name</th>
                        <th className="px-4 py-3">Job Title / Designation</th>
                        <th className="px-4 py-3">Team</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {employees.map((emp) => {
                        const typeBadge = getEmploymentTypeBadge(emp.employmentType);
                        const statusBadge = getAccountStatusBadge(emp.status);
                        return (
                          <tr key={emp.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-mono font-bold text-foreground">
                              {emp.employeeCode}
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground">
                              <Link
                                href={`/employees/${emp.id}`}
                                className="hover:text-seg-plum hover:underline"
                              >
                                {emp.fullName}
                              </Link>
                              <div className="text-[10px] text-muted-foreground">
                                {emp.email}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {emp.jobTitle}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {emp.teamName || 'General'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={typeBadge.variant}>
                                {typeBadge.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant={statusBadge.variant}>
                                {statusBadge.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link href={`/employees/${emp.id}`}>
                                <Button variant="ghost" size="sm" className="h-7 text-xs">
                                  Profile
                                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
