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
  Department,
} from '@/lib/api/organization';
import {
  Building2,
  Plus,
  Search,
  Eye,
  Users2,
  UserSquare2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const data = await organizationService.getDepartments({
        search: search.trim() || undefined,
      });
      setDepartments(data);
    } catch {
      setDepartments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDepartments();
  };

  return (
    <AppShell
      allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'HR_MANAGER']}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <OrgNav />

        {/* Page Title & Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Departments Directory
              </h1>
              <span className="rounded-full bg-seg-plum-subtle px-2 py-0.5 text-[10px] font-semibold text-seg-plum dark:bg-seg-plum/20 border border-seg-plum/20">
                {departments.length} Units
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Institutional divisions, curriculum faculties, and administrative functional groups
            </p>
          </div>

          <Link href="/departments/create">
            <Button size="sm" className="bg-seg-plum text-white hover:bg-seg-plum-hover shadow-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Department
            </Button>
          </Link>
        </div>

        {/* Search Toolbar */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by department name, code (e.g. ACAD, TECH) or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </form>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchDepartments}
            className="text-xs"
          >
            Refresh
          </Button>
        </div>

        {/* Departments Grid / Table */}
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          {isLoading ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
              <p className="text-xs font-medium text-muted-foreground">
                Loading departments...
              </p>
            </div>
          ) : departments.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                No departments found
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {search
                  ? 'No department matched your query. Try a different keyword.'
                  : 'Start by setting up your first organizational department.'}
              </p>
              <div className="mt-4">
                <Link href="/departments/create">
                  <Button size="sm" className="bg-seg-plum text-white hover:bg-seg-plum-hover">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create Department
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Department Name</th>
                    <th className="hidden px-4 py-3 md:table-cell">Department Head</th>
                    <th className="px-4 py-3 text-center">Teams</th>
                    <th className="px-4 py-3 text-center">Employees</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {departments.map((dept) => (
                    <tr
                      key={dept.id}
                      className="transition-colors hover:bg-muted/40"
                    >
                      {/* Code Badge */}
                      <td className="px-4 py-3.5">
                        <Badge variant="plum" className="font-mono font-bold">
                          {dept.code}
                        </Badge>
                      </td>

                      {/* Name & Description */}
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/departments/${dept.id}`}
                          className="font-bold text-foreground hover:text-seg-plum hover:underline"
                        >
                          {dept.name}
                        </Link>
                        {dept.description && (
                          <p className="mt-0.5 line-clamp-1 text-muted-foreground">
                            {dept.description}
                          </p>
                        )}
                      </td>

                      {/* Department Head */}
                      <td className="hidden px-4 py-3.5 md:table-cell">
                        {dept.head ? (
                          <div>
                            <div className="font-semibold text-foreground">
                              {dept.head.fullName}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {dept.head.jobTitle}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Teams count */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {dept.teamCount || 0}
                        </span>
                      </td>

                      {/* Employees count */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <UserSquare2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {dept.employeeCount || 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/departments/${dept.id}`}>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
