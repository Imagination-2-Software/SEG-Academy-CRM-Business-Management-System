'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { OrgNav } from '@/components/organization/org-nav';
import {
  organizationService,
  ProfileEmployee,
  Department,
  formatDate,
  getEmploymentTypeBadge,
  getAccountStatusBadge,
} from '@/lib/api/organization';
import {
  UserSquare2,
  Plus,
  Search,
  Filter,
  Eye,
  Building2,
  Users2,
  Briefcase,
  ChevronRight,
  UserCheck,
  Mail,
  Phone,
} from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<ProfileEmployee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const [staffData, deptsData] = await Promise.all([
        organizationService.getEmployees({
          search: search.trim() || undefined,
          departmentId: deptFilter,
          employmentType: typeFilter,
          status: statusFilter,
        }),
        organizationService.getDepartments(),
      ]);
      setEmployees(staffData);
      setDepartments(deptsData);
    } catch {
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [deptFilter, typeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmployees();
  };

  return (
    <AppShell allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'HR_MANAGER']}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <OrgNav />

        {/* Page Title & Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Staff & Employee Directory
              </h1>
              <span className="rounded-full bg-seg-plum-subtle px-2 py-0.5 text-[10px] font-semibold text-seg-plum dark:bg-seg-plum/20 border border-seg-plum/20">
                {employees.length} Members
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Internal academy personnel, faculty instructors, department managers, and intern cohorts
            </p>
          </div>

          <Link href="/employees/create">
            <Button size="sm" className="bg-seg-plum text-white hover:bg-seg-plum-hover shadow-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Employee
            </Button>
          </Link>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, employee code (e.g. EMP-2026-001) or job title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters:</span>
            </div>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Employment Types</option>
              <option value="FULL_TIME">Full-time Staff</option>
              <option value="PART_TIME">Part-time Staff</option>
              <option value="CONTRACT">Contractors</option>
              <option value="INTERN">Intern Cohort</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INVITED">Invited</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchEmployees}
              className="h-8 text-xs ml-auto"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Employees Table (Desktop) / Cards (Mobile) */}
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          {isLoading ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
              <p className="text-xs font-medium text-muted-foreground">
                Loading employee records...
              </p>
            </div>
          ) : employees.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserSquare2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                No employees found
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {search || deptFilter !== 'ALL' || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No staff member matched your filter criteria.'
                  : 'Start onboarding your first faculty instructor or team member.'}
              </p>
              <div className="mt-4">
                <Link href="/employees/create">
                  <Button size="sm" className="bg-seg-plum text-white hover:bg-seg-plum-hover">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Employee
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Role & Job Title</th>
                    <th className="hidden px-4 py-3 md:table-cell">Department & Team</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Joined</th>
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
                      <tr
                        key={emp.id}
                        className="transition-colors hover:bg-muted/40"
                      >
                        {/* Employee Avatar & Name */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-seg-plum-subtle text-xs font-bold text-seg-plum">
                              {emp.fullName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <Link
                                href={`/employees/${emp.id}`}
                                className="font-bold text-foreground hover:text-seg-plum hover:underline"
                              >
                                {emp.fullName}
                              </Link>
                              <div className="text-[11px] text-muted-foreground">
                                {emp.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Employee Code */}
                        <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                          {emp.employeeCode}
                        </td>

                        {/* Job Title & Role */}
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-foreground">
                            {emp.jobTitle}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {emp.roleName}
                          </div>
                        </td>

                        {/* Department & Team */}
                        <td className="hidden px-4 py-3.5 md:table-cell">
                          <div className="font-medium text-foreground">
                            {emp.departmentName || '—'}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {emp.teamName || 'General Staff'}
                          </div>
                        </td>

                        {/* Joined Date */}
                        <td className="hidden px-4 py-3.5 text-muted-foreground lg:table-cell">
                          {formatDate(emp.joinDate)}
                        </td>

                        {/* Employment Type */}
                        <td className="px-4 py-3.5">
                          <Badge variant={typeBadge.variant}>
                            {typeBadge.label}
                          </Badge>
                        </td>

                        {/* Account Status */}
                        <td className="px-4 py-3.5 text-center">
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <Link href={`/employees/${emp.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-foreground hover:text-seg-plum"
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              View
                              <ChevronRight className="ml-0.5 h-3 w-3" />
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
    </AppShell>
  );
}
