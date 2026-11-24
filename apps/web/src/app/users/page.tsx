'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { usersService, UserSummary, UserStatus } from '@/lib/api/users';
import {
  Users,
  Search,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Building2,
  Mail,
  Phone,
} from 'lucide-react';

export default function UsersDirectoryPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await usersService.getUsers();
        setUsers(data);
      } catch (err) {
        console.error('Failed to load users', err);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const handleStatusToggle = async (user: UserSummary) => {
    const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const updated = await usersService.updateUserStatus(user.id, nextStatus);
    if (updated) {
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch =
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.employeeCode && u.employeeCode.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
      const matchesRole = roleFilter === 'ALL' || u.roleCode === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, search, statusFilter, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const staffCount = users.filter((u) => u.employeeCode).length;
  const suspendedCount = users.filter((u) => u.status === 'SUSPENDED').length;

  return (
    <AppShell
      allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN']}
      requiredPermission="users:read"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-seg-plum/10 text-seg-plum">
                <Users className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                User Management & Access Control
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Authoritative identity directory, RBAC role assignment, and active credentials management.
            </p>
          </div>
        </div>

        {/* Executive KPI Summary */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
            <span className="text-xs font-medium text-muted-foreground">Total Identities</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">
              {users.length}
            </div>
            <span className="text-[11px] text-muted-foreground">Registered user accounts</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
            <span className="text-xs font-medium text-muted-foreground">Active Sessions</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 font-mono">
              {activeCount}
            </div>
            <span className="text-[11px] text-muted-foreground">Valid login access</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
            <span className="text-xs font-medium text-muted-foreground">Internal Staff</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-seg-plum font-mono">
              {staffCount}
            </div>
            <span className="text-[11px] text-muted-foreground">Linked 1:1 to employee</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
            <span className="text-xs font-medium text-muted-foreground">Suspended</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400 font-mono">
              {suspendedCount}
            </div>
            <span className="text-[11px] text-muted-foreground">Access blocked</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search user by name, email, or employee code..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
              >
                <option value="ALL">All Account Statuses</option>
                <option value="ACTIVE">Active Access</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
                <option value="INVITED">Invited / Pending</option>
              </select>
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
              >
                <option value="ALL">All RBAC Roles</option>
                <option value="FOUNDER_SUPER_ADMIN">Founder / Super Admin</option>
                <option value="ADMIN">System Administrator</option>
                <option value="INSTRUCTOR">Faculty / Instructor</option>
                <option value="ACADEMIC_COUNSELLOR">Academic Counsellor</option>
                <option value="FINANCE_MANAGER">Finance Manager</option>
                <option value="HR_MANAGER">HR Manager</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Directory Table */}
        <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">User Identity</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Role & Permissions</th>
                  <th className="py-3 px-4">Profile Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Access Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-muted-foreground">
                      Loading user identities...
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-muted-foreground">
                      No user accounts match the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-seg-plum/10 text-xs font-bold text-seg-plum shrink-0">
                            {user.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{user.fullName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        {user.phoneNumber || '—'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-md border border-seg-plum/20 bg-seg-plum/5 px-2 py-0.5 text-[11px] font-semibold text-seg-plum">
                          <Shield className="h-3 w-3" />
                          {user.roleName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {user.employeeCode ? (
                          <div className="flex flex-col text-[11px]">
                            <span className="font-mono font-semibold text-foreground">{user.employeeCode}</span>
                            <span className="text-muted-foreground">{user.jobTitle || 'Staff Member'}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">Independent Identity</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {user.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            <AlertTriangle className="h-3 w-3" /> Suspended
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-[11px]">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleStatusToggle(user)}
                          className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            user.status === 'ACTIVE'
                              ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {user.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border/80 px-4 py-3 bg-muted/10 text-xs">
            <div className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-foreground">{Math.min(currentPage * pageSize, filteredUsers.length)}</span> of{' '}
              <span className="font-semibold text-foreground">{filteredUsers.length}</span> user records
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-foreground disabled:opacity-40 hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-mono font-medium text-foreground">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-foreground disabled:opacity-40 hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
