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
  Team,
  Department,
} from '@/lib/api/organization';
import {
  Users2,
  Plus,
  Search,
  Filter,
  Eye,
  Building2,
  UserSquare2,
  ChevronRight,
} from 'lucide-react';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const [teamsData, deptsData] = await Promise.all([
        organizationService.getTeams({
          search: search.trim() || undefined,
          departmentId: selectedDeptId,
        }),
        organizationService.getDepartments(),
      ]);
      setTeams(teamsData);
      setDepartments(deptsData);
    } catch {
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [selectedDeptId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTeams();
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
                Teams Directory
              </h1>
              <span className="rounded-full bg-seg-plum-subtle px-2 py-0.5 text-[10px] font-semibold text-seg-plum dark:bg-seg-plum/20 border border-seg-plum/20">
                {teams.length} Teams
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Functional operating units, faculty cohorts, and specialized task forces
            </p>
          </div>

          <Link href="/teams/create">
            <Button size="sm" className="bg-seg-plum text-white hover:bg-seg-plum-hover shadow-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Team
            </Button>
          </Link>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by team name, code or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Department:</span>
            </div>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchTeams}
              className="text-xs"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Teams Table */}
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          {isLoading ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
              <p className="text-xs font-medium text-muted-foreground">
                Loading teams...
              </p>
            </div>
          ) : teams.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Users2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                No teams found
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {search || selectedDeptId !== 'ALL'
                  ? 'No team matched the current filter. Try resetting.'
                  : 'Start by creating your first functional team.'}
              </p>
              <div className="mt-4">
                <Link href="/teams/create">
                  <Button size="sm" className="bg-seg-plum text-white hover:bg-seg-plum-hover">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create Team
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Team Code</th>
                    <th className="px-4 py-3">Team Name</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="hidden px-4 py-3 md:table-cell">Team Lead</th>
                    <th className="px-4 py-3 text-center">Staff Count</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {teams.map((t) => (
                    <tr
                      key={t.id}
                      className="transition-colors hover:bg-muted/40"
                    >
                      {/* Team Code */}
                      <td className="px-4 py-3.5">
                        <Badge variant="plum" className="font-mono font-bold">
                          {t.code}
                        </Badge>
                      </td>

                      {/* Team Name */}
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/teams/${t.id}`}
                          className="font-bold text-foreground hover:text-seg-plum hover:underline"
                        >
                          {t.name}
                        </Link>
                        {t.description && (
                          <p className="mt-0.5 line-clamp-1 text-muted-foreground">
                            {t.description}
                          </p>
                        )}
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5">
                        {t.department ? (
                          <Link
                            href={`/departments/${t.department.id}`}
                            className="font-medium text-foreground hover:text-seg-plum hover:underline"
                          >
                            {t.department.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Team Lead */}
                      <td className="hidden px-4 py-3.5 md:table-cell">
                        {t.lead ? (
                          <div>
                            <div className="font-semibold text-foreground">
                              {t.lead.fullName}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {t.lead.jobTitle}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Staff Count */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <UserSquare2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {t.employeeCount || 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/teams/${t.id}`}>
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
