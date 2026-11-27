'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  organizationService,
  Team,
  getEmploymentTypeBadge,
  getAccountStatusBadge,
} from '@/lib/api/organization';
import {
  ArrowLeft,
  Users2,
  Building2,
  UserSquare2,
  Plus,
  Eye,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

export default function TeamDetailsPage() {
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeam = async () => {
    setIsLoading(true);
    try {
      const data = await organizationService.getTeamById(teamId);
      setTeam(data);
    } catch {
      setTeam(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      fetchTeam();
    }
  }, [teamId]);

  if (isLoading) {
    return (
      <AppShell allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN']} requiredPermission="users:read">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
          <p className="text-xs font-medium text-muted-foreground">
            Loading team details...
          </p>
        </div>
      </AppShell>
    );
  }

  if (!team) {
    return (
      <AppShell allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN']} requiredPermission="users:read">
        <div className="mx-auto max-w-xl p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">
            Team Not Found
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The requested team does not exist or has been archived.
          </p>
          <div className="mt-6">
            <Link href="/teams">
              <Button size="sm" variant="outline">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Teams
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
          <Link href="/teams" className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Teams
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">{team.name}</span>
        </div>

        {/* Overview Card */}
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge variant="plum" className="font-mono text-sm font-bold">
                  {team.code}
                </Badge>
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {team.name}
                </h1>
              </div>

              {team.department && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 text-seg-plum" />
                  <span>Division:</span>
                  <Link
                    href={`/departments/${team.department.id}`}
                    className="font-semibold text-foreground hover:text-seg-plum hover:underline"
                  >
                    {team.department.name} ({team.department.code})
                  </Link>
                </div>
              )}

              {team.description && (
                <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground pt-1">
                  {team.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 sm:self-start">
              <Link href={`/employees/create?teamId=${team.id}&departmentId=${team.departmentId}`}>
                <Button size="sm" className="bg-seg-plum text-white hover:bg-seg-plum-hover text-xs">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Team Member
                </Button>
              </Link>
            </div>
          </div>

          {/* Lead & Metrics */}
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border/60 pt-6 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Team Lead / Supervisor
              </span>
              {team.lead ? (
                <div className="mt-1.5 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-seg-plum-subtle text-xs font-bold text-seg-plum">
                    {team.lead.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      {team.lead.fullName}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {team.lead.jobTitle}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  No designated lead assigned
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Active Staff Members
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">
                  {team.employees ? team.employees.length : team.employeeCount || 0}
                </span>
                <span className="text-xs text-muted-foreground">rostered employees</span>
              </div>
            </div>
          </div>
        </div>

        {/* Members Roster Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              Team Members ({team.employees ? team.employees.length : 0})
            </h2>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            {!team.employees || team.employees.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No members currently assigned to this team.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/30 font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3">Job Title / Designation</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {team.employees.map((emp) => {
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
        </div>
      </div>
    </AppShell>
  );
}
