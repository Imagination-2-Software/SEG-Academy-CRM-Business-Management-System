'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { useAuth } from '@/lib/auth';
import {
  usersService,
  UserSummary,
  UserStatus,
  RoleWithPermissions,
} from '@/lib/api/users';
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
  Settings,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  KeyRound,
  Eye,
  Calendar,
  Briefcase,
  Layers,
  User as UserIcon,
} from 'lucide-react';

export default function UsersDirectoryPage() {
  const { user: currentUser, hasPermission, hasRole } = useAuth();

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters and Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Role Management State
  const [availableRoles, setAvailableRoles] = useState<RoleWithPermissions[]>([]);
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserSummary | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleModalError, setRoleModalError] = useState<string | null>(null);

  // User Details Drawer State
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<UserSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Permission checks
  const canReadUsers = hasPermission('users:read') || hasRole('FOUNDER_SUPER_ADMIN') || hasRole('ADMIN');
  const canManageRoles = hasPermission('users:manage_roles') || hasRole('FOUNDER_SUPER_ADMIN');
  const canManageStatus = hasPermission('users:manage_status') || hasRole('FOUNDER_SUPER_ADMIN');

  // Load Users from real API
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await usersService.getUsers({
        page: 1,
        limit: 100, // Load users directory for client-side search/filtering
      });
      setUsers(result.data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setErrorMessage(err.message || 'Failed to load user directory from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Roles from real API
  const loadRoles = useCallback(async () => {
    try {
      const roles = await usersService.getRoles();
      setAvailableRoles(roles);
    } catch (err: any) {
      console.error('Failed to load roles:', err);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [loadUsers, loadRoles]);

  // Handle Opening User Details Drawer
  const handleOpenDetails = useCallback(async (userId: string, initialUserSummary?: UserSummary) => {
    if (!canReadUsers) return;

    setDetailUserId(userId);
    setIsDrawerOpen(true);
    setDetailError(null);

    // Seed drawer with summary data if already available in list
    if (initialUserSummary) {
      setDetailUser(initialUserSummary);
    }

    setDetailLoading(true);
    try {
      const fullDetails = await usersService.getUserById(userId);
      setDetailUser(fullDetails);
    } catch (err: any) {
      console.error('Failed to fetch full user details:', err);
      setDetailError(err.message || 'Failed to load user details from server.');
    } finally {
      setDetailLoading(false);
    }
  }, [canReadUsers]);

  // Handle Account Status Toggle (Active <-> Suspended)
  const handleStatusToggle = async (targetUser: UserSummary) => {
    if (!canManageStatus) {
      setErrorMessage('You do not have permission to modify account statuses.');
      return;
    }

    if (currentUser?.id === targetUser.id) {
      setErrorMessage('Security protection: You cannot suspend or deactivate your own account.');
      return;
    }

    const nextStatus: UserStatus = targetUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setActionLoadingId(targetUser.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await usersService.updateUserStatus(targetUser.id, nextStatus);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (detailUser && detailUser.id === updated.id) {
        setDetailUser((prev) => (prev ? { ...prev, status: updated.status } : null));
      }
      setSuccessMessage(
        `User ${targetUser.fullName} account status set to ${nextStatus}. Active sessions updated.`,
      );
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setErrorMessage(err.message || 'Failed to update user status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Role Management Modal
  const handleOpenRoleModal = (targetUser: UserSummary) => {
    if (!canManageRoles) {
      setErrorMessage('You do not have permission to manage user roles.');
      return;
    }

    if (currentUser?.id === targetUser.id) {
      setErrorMessage('Security protection: You cannot modify your own assigned role.');
      return;
    }

    setSelectedUserForRole(targetUser);
    setSelectedRoleId(targetUser.role?.id || targetUser.roleId || '');
    setRoleModalError(null);
    setIsRoleModalOpen(true);
  };

  // Save Role Assignment
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForRole || !selectedRoleId) return;

    setIsUpdatingRole(true);
    setRoleModalError(null);
    setSuccessMessage(null);

    try {
      const updated = await usersService.replaceUserRoles(selectedUserForRole.id, [
        selectedRoleId,
      ]);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (detailUser && detailUser.id === updated.id) {
        setDetailUser(updated);
      }
      setSuccessMessage(
        `Successfully updated role for ${selectedUserForRole.fullName} to ${updated.role?.name || updated.roleName}. Active sessions revoked.`,
      );
      setIsRoleModalOpen(false);
      setSelectedUserForRole(null);
    } catch (err: any) {
      console.error('Failed to update role:', err);
      setRoleModalError(err.message || 'Failed to update user role.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Filtered Users List
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadUsers()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              title="Refresh directory"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <Link
              href="/organization/employees/create"
              className="inline-flex items-center gap-1.5 rounded-lg bg-seg-plum px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-seg-plum/90 transition-colors"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Add Staff / Employee</span>
            </Link>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-600 hover:text-red-800 dark:text-red-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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
                {availableRoles.length > 0 ? (
                  availableRoles.map((r) => (
                    <option key={r.id} value={r.code}>
                      {r.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="FOUNDER_SUPER_ADMIN">Founder / Super Admin</option>
                    <option value="ADMIN">System Administrator</option>
                    <option value="TEAM_LEADER">Team Leader</option>
                    <option value="TRAINER_FACULTY">Trainer / Faculty</option>
                    <option value="FINANCE_MANAGER">Finance Manager</option>
                    <option value="EMPLOYEE_INTERN">Employee / Intern</option>
                  </>
                )}
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
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-seg-plum" />
                        <span>Loading user identities from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-muted-foreground">
                      No user accounts match the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    const isSuperAdminUser = user.roleCode === 'FOUNDER_SUPER_ADMIN';
                    const canEditThisUserRole =
                      canManageRoles &&
                      !isSelf &&
                      (!isSuperAdminUser || currentUser?.role?.code === 'FOUNDER_SUPER_ADMIN');

                    return (
                      <tr
                        key={user.id}
                        onClick={() => handleOpenDetails(user.id, user)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-seg-plum/10 text-xs font-bold text-seg-plum shrink-0">
                              {user.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                <span>{user.fullName}</span>
                                {isSelf && (
                                  <span className="rounded-sm bg-seg-plum/10 px-1.5 py-0.2 text-[9px] font-semibold text-seg-plum">
                                    You
                                  </span>
                                )}
                              </div>
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
                            {user.roleName || user.role?.name || user.roleCode}
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
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                              <AlertTriangle className="h-3 w-3" /> Suspended
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-[11px]">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Inspect Details Button */}
                            <button
                              onClick={() => handleOpenDetails(user.id, user)}
                              title="View Identity Dossier"
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
                            >
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              <span>Details</span>
                            </button>

                            {/* Role Management Action */}
                            {canManageRoles && (
                              <button
                                onClick={() => handleOpenRoleModal(user)}
                                disabled={!canEditThisUserRole}
                                title={
                                  isSelf
                                    ? 'Cannot modify your own role'
                                    : !canEditThisUserRole
                                    ? 'Insufficient privileges to modify Super Admin'
                                    : 'Manage User Role'
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                <Settings className="h-3 w-3 text-muted-foreground" />
                                <span>Role</span>
                              </button>
                            )}

                            {/* Status Toggle Action */}
                            {canManageStatus && (
                              <button
                                onClick={() => handleStatusToggle(user)}
                                disabled={actionLoadingId === user.id || isSelf}
                                title={isSelf ? 'Cannot suspend your own account' : 'Toggle status'}
                                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                  user.status === 'ACTIVE'
                                    ? 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30'
                                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30'
                                }`}
                              >
                                {actionLoadingId === user.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin inline" />
                                ) : user.status === 'ACTIVE' ? (
                                  'Suspend'
                                ) : (
                                  'Reactivate'
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
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

        {/* User Details Inspection Side Drawer */}
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
            <div className="relative w-full max-w-lg bg-card border-l border-border shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-5 border-b border-border/80 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-seg-plum text-sm font-bold text-white shadow-xs">
                    {detailUser?.fullName
                      ? detailUser.fullName.slice(0, 2).toUpperCase()
                      : 'US'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {detailUser?.fullName || 'User Dossier'}
                    </h3>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {detailUser?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {detailUser && canManageRoles && currentUser?.id !== detailUser.id && (
                    <button
                      onClick={() => handleOpenRoleModal(detailUser)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                      title="Modify Role"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>Role</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setDetailUserId(null);
                      setDetailUser(null);
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
                {detailLoading && !detailUser ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-seg-plum" />
                    <span>Loading comprehensive identity records...</span>
                  </div>
                ) : detailError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4" />
                      <span>Failed to retrieve details</span>
                    </div>
                    <p>{detailError}</p>
                    <button
                      onClick={() => detailUserId && handleOpenDetails(detailUserId)}
                      className="rounded-md bg-red-100 px-3 py-1 font-semibold text-red-900 hover:bg-red-200 dark:bg-red-900 dark:text-red-200"
                    >
                      Retry Request
                    </button>
                  </div>
                ) : detailUser ? (
                  <>
                    {/* Status and Identity Card */}
                    <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <span className="font-semibold text-foreground">Identity Status</span>
                        {detailUser.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Active Login Access
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5" /> Suspended / Blocked
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-[11px] text-muted-foreground">User ID</span>
                          <div className="font-mono text-muted-foreground text-[10px] break-all">
                            {detailUser.id}
                          </div>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground">Contact Phone</span>
                          <div className="font-semibold text-foreground">
                            {detailUser.phoneNumber || 'Not provided'}
                          </div>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground">Account Created</span>
                          <div className="font-medium text-foreground">
                            {detailUser.createdAt ? new Date(detailUser.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}
                          </div>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground">Last Login</span>
                          <div className="font-medium text-foreground">
                            {detailUser.lastLoginAt ? new Date(detailUser.lastLoginAt).toLocaleString('en-IN') : 'Never authenticated'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RBAC Role & Permissions Dossier */}
                    <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Shield className="h-4 w-4 text-seg-plum" />
                          <span>Assigned RBAC Role</span>
                        </div>
                        <span className="rounded-md border border-seg-plum/20 bg-seg-plum/10 px-2 py-0.5 font-semibold text-seg-plum text-[11px]">
                          {detailUser.role?.name || detailUser.roleName || detailUser.roleCode}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <span className="text-[11px] text-muted-foreground">Role Code:</span>
                        <div className="font-mono font-bold text-foreground">
                          {detailUser.role?.code || detailUser.roleCode}
                        </div>
                        {detailUser.role?.description && (
                          <p className="text-[11px] text-muted-foreground pt-1">
                            {detailUser.role.description}
                          </p>
                        )}
                      </div>

                      {/* Permissions List */}
                      <div className="pt-2 border-t border-border/60 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-foreground">Effective Permissions</span>
                          <span className="font-mono text-muted-foreground">
                            {detailUser.role?.permissions?.length || 0} total
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1 rounded-lg border border-border/60 bg-muted/20">
                          {detailUser.role?.permissions && detailUser.role.permissions.length > 0 ? (
                            detailUser.role.permissions.map((perm) => (
                              <span
                                key={perm}
                                className="rounded-sm bg-background px-1.5 py-0.5 text-[9px] font-mono text-foreground border border-border/60"
                              >
                                {perm}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-[10px] p-1 italic">
                              Inherits standard base permissions.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Linked Employee Profile Dossier */}
                    <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-border/60 font-semibold text-foreground">
                        <Briefcase className="h-4 w-4 text-seg-plum" />
                        <span>Staff & Employee Profile</span>
                      </div>

                      {detailUser.employee ? (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[11px] text-muted-foreground">Employee Code</span>
                            <div className="font-mono font-bold text-foreground text-sm">
                              {detailUser.employee.employeeCode}
                            </div>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground">Job Title</span>
                            <div className="font-semibold text-foreground">
                              {detailUser.employee.jobTitle}
                            </div>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground">Department</span>
                            <div className="font-medium text-foreground">
                              {detailUser.employee.department?.name || 'Unassigned'}
                            </div>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground">Assigned Team</span>
                            <div className="font-medium text-foreground">
                              {detailUser.employee.team?.name || 'Unassigned'}
                            </div>
                          </div>
                          {detailUser.employee.employmentType && (
                            <div>
                              <span className="text-[11px] text-muted-foreground">Employment Type</span>
                              <div className="font-medium text-foreground">
                                {detailUser.employee.employmentType}
                              </div>
                            </div>
                          )}
                          {detailUser.employee.joinDate && (
                            <div>
                              <span className="text-[11px] text-muted-foreground">Date Joined</span>
                              <div className="font-medium text-foreground">
                                {new Date(detailUser.employee.joinDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-xs italic">
                          This user account is not linked to an internal employee profile.
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              {/* Drawer Footer Actions */}
              {detailUser && (
                <div className="p-4 border-t border-border/80 bg-muted/20 flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    Record ID: <span className="font-mono">{detailUser.id.slice(0, 8)}...</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManageStatus && currentUser?.id !== detailUser.id && (
                      <button
                        onClick={() => handleStatusToggle(detailUser)}
                        disabled={actionLoadingId === detailUser.id}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          detailUser.status === 'ACTIVE'
                            ? 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300'
                        }`}
                      >
                        {actionLoadingId === detailUser.id
                          ? 'Updating...'
                          : detailUser.status === 'ACTIVE'
                          ? 'Suspend Account'
                          : 'Reactivate Account'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        setDetailUserId(null);
                        setDetailUser(null);
                      }}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      Close Drawer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Role Management Modal Dialog */}
        {isRoleModalOpen && selectedUserForRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-seg-plum/10 text-seg-plum">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Assign RBAC Role</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Modifying roles revokes active user sessions immediately.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsRoleModalOpen(false);
                    setSelectedUserForRole(null);
                  }}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {roleModalError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{roleModalError}</span>
                </div>
              )}

              {/* User Dossier Snippet */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Target Identity:</span>
                  <span className="font-semibold text-foreground">{selectedUserForRole.fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-mono text-muted-foreground text-[11px]">{selectedUserForRole.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Role:</span>
                  <span className="font-semibold text-seg-plum">
                    {selectedUserForRole.role?.name || selectedUserForRole.roleName || selectedUserForRole.roleCode}
                  </span>
                </div>
              </div>

              {/* Role Selection Form */}
              <form onSubmit={handleSaveRole} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Select New System Role
                  </label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
                  >
                    <option value="" disabled>
                      Choose a role...
                    </option>
                    {availableRoles.map((role) => {
                      const isSuperAdminRole = role.code === 'FOUNDER_SUPER_ADMIN';
                      const disabledForCaller =
                        isSuperAdminRole && currentUser?.role?.code !== 'FOUNDER_SUPER_ADMIN';

                      return (
                        <option
                          key={role.id}
                          value={role.id}
                          disabled={disabledForCaller}
                        >
                          {role.name} ({role.code}) {disabledForCaller ? '— Requires Founder' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    Permissions attached to the selected role will become active immediately upon their next login.
                  </p>
                </div>

                {/* Role Details Preview */}
                {selectedRoleId && (
                  <div className="rounded-lg border border-border/80 bg-background p-3 text-xs space-y-1.5">
                    <div className="font-semibold text-foreground flex items-center justify-between">
                      <span>Permissions Granted:</span>
                      <span className="text-[11px] font-mono text-seg-plum">
                        {availableRoles.find((r) => r.id === selectedRoleId)?.permissions.length || 0} permissions
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                      {availableRoles
                        .find((r) => r.id === selectedRoleId)
                        ?.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="rounded-sm bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground"
                          >
                            {perm}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRoleModalOpen(false);
                      setSelectedUserForRole(null);
                    }}
                    className="rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingRole || !selectedRoleId || selectedRoleId === selectedUserForRole.roleId}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-seg-plum px-4 py-2 text-xs font-semibold text-white hover:bg-seg-plum/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingRole ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Updating Role...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>Confirm Role Change</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
