'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  organizationService,
  ProfileEmployee,
  AccountStatus,
  formatDate,
  getEmploymentTypeBadge,
  getAccountStatusBadge,
} from '@/lib/api/organization';
import {
  ArrowLeft,
  UserSquare2,
  Building2,
  Users2,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  UserX,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export default function EmployeeProfilePage() {
  const params = useParams();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<ProfileEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchEmployee = async () => {
    setIsLoading(true);
    try {
      const data = await organizationService.getEmployeeById(employeeId);
      setEmployee(data);
    } catch {
      setEmployee(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchEmployee();
    }
  }, [employeeId]);

  const handleStatusChange = async (newStatus: AccountStatus) => {
    if (!employee) return;
    setIsUpdatingStatus(true);
    setStatusMessage(null);
    try {
      await organizationService.updateEmployeeStatus(employee.id, newStatus);
      setStatusMessage(`Account status updated to ${newStatus}.`);
      await fetchEmployee();
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to update account status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'HR_MANAGER']}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
          <p className="text-xs font-medium text-muted-foreground">
            Loading employee dossier...
          </p>
        </div>
      </AppShell>
    );
  }

  if (!employee) {
    return (
      <AppShell allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'HR_MANAGER']}>
        <div className="mx-auto max-w-xl p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">
            Employee Profile Not Found
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The requested staff member record does not exist in the active directory.
          </p>
          <div className="mt-6">
            <Link href="/employees">
              <Button size="sm" variant="outline">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Directory
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const typeBadge = getEmploymentTypeBadge(employee.employmentType);
  const statusBadge = getAccountStatusBadge(employee.status);

  return (
    <AppShell allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'HR_MANAGER']}>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link href="/employees" className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Employees
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">{employee.fullName}</span>
        </div>

        {statusMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Profile Dossier Header */}
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Initials Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-seg-plum text-xl font-black text-white shadow-sm">
                {employee.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              {/* Title & Metadata */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {employee.fullName}
                  </h1>
                  <Badge variant="plum" className="font-mono text-xs font-bold">
                    {employee.employeeCode}
                  </Badge>
                  <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                  <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                </div>

                <div className="text-sm font-medium text-foreground">
                  {employee.jobTitle}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{employee.email}</span>
                  </div>
                  {employee.phoneNumber && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{employee.phoneNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status Management Actions */}
            <div className="flex items-center gap-2">
              {employee.status === 'ACTIVE' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('SUSPENDED')}
                  disabled={isUpdatingStatus}
                  className="text-xs text-amber-700 hover:bg-amber-50 dark:text-amber-400"
                >
                  Suspend Account
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('ACTIVE')}
                  disabled={isUpdatingStatus}
                  className="text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
                >
                  Activate Account
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Organizational Hierarchy */}
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-seg-plum" />
              Organizational Placement
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Department / Division:</span>
                {employee.departmentId ? (
                  <Link
                    href={`/departments/${employee.departmentId}`}
                    className="font-semibold text-foreground hover:text-seg-plum hover:underline"
                  >
                    {employee.departmentName || 'View Department'}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Functional Team:</span>
                {employee.teamId ? (
                  <Link
                    href={`/teams/${employee.teamId}`}
                    className="font-semibold text-foreground hover:text-seg-plum hover:underline"
                  >
                    {employee.teamName || 'View Team'}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">General Staff</span>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Reporting Manager:</span>
                {employee.managerId ? (
                  <Link
                    href={`/employees/${employee.managerId}`}
                    className="font-semibold text-foreground hover:text-seg-plum hover:underline"
                  >
                    {employee.managerName || 'View Manager'}
                  </Link>
                ) : (
                  <span className="text-muted-foreground font-medium">Reports to Directorate</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date of Joining:</span>
                <span className="font-semibold text-foreground">
                  {formatDate(employee.joinDate)}
                </span>
              </div>
            </div>
          </div>

          {/* System Privileges & RBAC */}
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-seg-plum" />
              System Privileges & Security Role
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Access Role:</span>
                <span className="font-bold text-seg-plum">{employee.roleName}</span>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">System Role Code:</span>
                <span className="font-mono text-muted-foreground">{employee.roleCode}</span>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Account Status:</span>
                <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User UUID:</span>
                <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[180px]">
                  {employee.userId}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Conditional Intern Details Card */}
        {employee.internProfile && (
          <div className="rounded-xl border border-seg-plum/30 bg-seg-plum-subtle/20 p-5 shadow-sm space-y-4 dark:bg-seg-plum/10">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-seg-plum" />
              Graduate Internship Track Particulars
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground">Assigned Faculty Mentor:</span>
                <div className="font-semibold text-foreground">
                  {employee.internProfile.mentorName || 'Unassigned'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground">Internship Duration:</span>
                <div className="font-semibold text-foreground">
                  {formatDate(employee.internProfile.startDate)} — {formatDate(employee.internProfile.endDate)}
                </div>
              </div>

              {employee.internProfile.collegeName && (
                <div className="space-y-1">
                  <span className="text-muted-foreground">College / Institution:</span>
                  <div className="font-semibold text-foreground">
                    {employee.internProfile.collegeName}
                  </div>
                </div>
              )}

              {employee.internProfile.academicDegree && (
                <div className="space-y-1">
                  <span className="text-muted-foreground">Degree & Field:</span>
                  <div className="font-semibold text-foreground">
                    {employee.internProfile.academicDegree}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Direct Reports Section (if any) */}
        {employee.directReports && employee.directReports.length > 0 && (
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users2 className="h-4 w-4 text-seg-plum" />
                Direct Reports ({employee.directReports.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Designation</th>
                    <th className="px-3 py-2">Team</th>
                    <th className="px-3 py-2 text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {employee.directReports.map((report) => (
                    <tr key={report.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-mono font-bold text-foreground">
                        {report.employeeCode}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-foreground">
                        <Link
                          href={`/employees/${report.id}`}
                          className="hover:text-seg-plum hover:underline"
                        >
                          {report.fullName}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {report.jobTitle}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {report.teamName || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`/employees/${report.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            View
                            <ChevronRight className="ml-0.5 h-3 w-3" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
