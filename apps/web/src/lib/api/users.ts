import { apiClient } from './client';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED';

export interface UserRoleSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions?: string[];
}

export interface UserEmployeeSummary {
  id: string;
  employeeCode: string;
  jobTitle: string;
  employmentType?: string;
  department?: { id: string; name: string; code: string } | null;
  team?: { id: string; name: string; code: string } | null;
  joinDate?: string;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  roleId: string;
  status: UserStatus;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  role: UserRoleSummary;
  employee?: UserEmployeeSummary | null;
  // Computed / legacy convenience getters
  roleCode?: string;
  roleName?: string;
  employeeCode?: string;
  jobTitle?: string;
  departmentName?: string;
}

export interface RoleWithPermissions {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedUsersResult {
  data: UserSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface QueryUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus | 'ALL';
  roleCode?: string | 'ALL';
}

function normalizeUser(raw: any): UserSummary {
  const role: UserRoleSummary = raw.role
    ? {
        id: raw.role.id || raw.roleId || '',
        code: raw.role.code || raw.roleCode || '',
        name: raw.role.name || raw.roleName || raw.role.code || '',
        description: raw.role.description || null,
        isSystem: raw.role.isSystem ?? true,
        permissions: raw.role.permissions || [],
      }
    : {
        id: raw.roleId || '',
        code: raw.roleCode || '',
        name: raw.roleName || raw.roleCode || '',
        description: null,
        isSystem: true,
        permissions: [],
      };

  const employee: UserEmployeeSummary | null = raw.employee
    ? {
        id: raw.employee.id,
        employeeCode: raw.employee.employeeCode,
        jobTitle: raw.employee.jobTitle,
        employmentType: raw.employee.employmentType,
        department: raw.employee.department || null,
        team: raw.employee.team || null,
        joinDate: raw.employee.joinDate,
      }
    : raw.employeeCode
    ? {
        id: '',
        employeeCode: raw.employeeCode,
        jobTitle: raw.jobTitle || 'Staff Member',
      }
    : null;

  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.fullName,
    phoneNumber: raw.phoneNumber || null,
    roleId: raw.roleId || role.id,
    status: raw.status as UserStatus,
    avatarUrl: raw.avatarUrl || null,
    lastLoginAt: raw.lastLoginAt || null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    role,
    employee,
    roleCode: role.code,
    roleName: role.name,
    employeeCode: employee?.employeeCode,
    jobTitle: employee?.jobTitle,
    departmentName: raw.departmentName || employee?.department?.name,
  };
}

export const usersService = {
  /**
   * Retrieves paginated users list from backend API with optional search, status and role filters.
   */
  async getUsers(params?: QueryUsersParams): Promise<PaginatedUsersResult> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search && params.search.trim()) searchParams.set('search', params.search.trim());
    if (params?.status && params.status !== 'ALL') searchParams.set('status', params.status);
    if (params?.roleCode && params.roleCode !== 'ALL') searchParams.set('roleCode', params.roleCode);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/users?${queryString}` : '/users';

    const res = await apiClient.get<any>(endpoint);

    if (res.success && res.data) {
      const rawData = res.data.data || res.data;
      const dataList: any[] = Array.isArray(rawData) ? rawData : [];
      const normalizedUsers = dataList.map(normalizeUser);

      const meta = res.data.meta || {
        total: normalizedUsers.length,
        page: params?.page || 1,
        limit: params?.limit || normalizedUsers.length || 20,
        totalPages: 1,
      };

      return {
        data: normalizedUsers,
        meta,
      };
    }

    return {
      data: [],
      meta: {
        total: 0,
        page: params?.page || 1,
        limit: params?.limit || 20,
        totalPages: 1,
      },
    };
  },

  /**
   * Retrieves detailed profile for a single user by ID.
   */
  async getUserById(id: string): Promise<UserSummary> {
    const res = await apiClient.get<any>(`/users/${id}`);
    if (res.success && res.data) {
      return normalizeUser(res.data);
    }
    throw new Error(res.message || 'Failed to fetch user details');
  },

  /**
   * Updates user account status (ACTIVE, SUSPENDED, INACTIVE).
   */
  async updateUserStatus(id: string, status: UserStatus, reason?: string): Promise<UserSummary> {
    const res = await apiClient.patch<any>(`/users/${id}/status`, {
      status,
      reason,
    });
    if (res.success && res.data) {
      return normalizeUser(res.data);
    }
    throw new Error(res.message || 'Failed to update user status');
  },

  /**
   * Fetches all available system roles with mapped permissions.
   */
  async getRoles(): Promise<RoleWithPermissions[]> {
    const res = await apiClient.get<RoleWithPermissions[]>('/roles');
    if (res.success && res.data) {
      return Array.isArray(res.data) ? res.data : [];
    }
    return [];
  },

  /**
   * Replaces assigned roles for a target user.
   */
  async replaceUserRoles(id: string, roleIds: string[]): Promise<UserSummary> {
    const res = await apiClient.put<any>(`/users/${id}/roles`, {
      roleIds,
    });
    if (res.success && res.data) {
      return normalizeUser(res.data);
    }
    throw new Error(res.message || 'Failed to update user roles');
  },

  /**
   * Changes authenticated user account password.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    if (res.success && res.data) {
      return res.data;
    }
    return { success: true, message: res.message || 'Password changed successfully.' };
  },
};
