import { apiClient } from './client';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED';
export type InternshipStatus = 'ACTIVE' | 'COMPLETED' | 'TERMINATED';

export interface DepartmentHeadSummary {
  id: string;
  employeeCode: string;
  fullName: string;
  jobTitle: string;
  email: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  headId?: string;
  head?: DepartmentHeadSummary;
  employeeCount: number;
  teamCount: number;
  teams?: TeamSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamSummary {
  id: string;
  name: string;
  code: string;
  description?: string;
  departmentId: string;
  departmentName?: string;
  leadId?: string;
  leadName?: string;
  employeeCount: number;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  description?: string;
  departmentId: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
  leadId?: string;
  lead?: {
    id: string;
    employeeCode: string;
    fullName: string;
    jobTitle: string;
    email: string;
  };
  employeeCount: number;
  employees?: EmployeeSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface InternDetails {
  id: string;
  employeeId: string;
  mentorId?: string;
  mentorName?: string;
  status: InternshipStatus;
  startDate: string;
  endDate: string;
  collegeName?: string;
  academicDegree?: string;
}

export interface EmployeeSummary {
  id: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  jobTitle: string;
  employmentType: EmploymentType;
  departmentId?: string;
  departmentName?: string;
  teamId?: string;
  teamName?: string;
  managerId?: string;
  managerName?: string;
  roleCode: string;
  roleName: string;
  status: AccountStatus;
  joinDate: string;
  avatarUrl?: string;
}

export interface ProfileEmployee extends EmployeeSummary {
  exitDate?: string;
  directReports?: EmployeeSummary[];
  internProfile?: InternDetails;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentPayload {
  name: string;
  code: string;
  description?: string;
  headId?: string;
}

export interface CreateTeamPayload {
  name: string;
  code: string;
  departmentId: string;
  description?: string;
  leadId?: string;
}

export interface CreateEmployeePayload {
  fullName: string;
  email: string;
  phoneNumber?: string;
  employeeCode?: string;
  jobTitle: string;
  employmentType: EmploymentType;
  departmentId?: string;
  teamId?: string;
  managerId?: string;
  roleCode: string;
  joinDate: string;
  internDetails?: {
    mentorId?: string;
    startDate: string;
    endDate: string;
    collegeName?: string;
    academicDegree?: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getEmploymentTypeBadge(type: EmploymentType) {
  switch (type) {
    case 'FULL_TIME':
      return { label: 'Full-time', variant: 'success' as const };
    case 'PART_TIME':
      return { label: 'Part-time', variant: 'info' as const };
    case 'CONTRACT':
      return { label: 'Contract', variant: 'warning' as const };
    case 'INTERN':
      return { label: 'Intern', variant: 'plum' as const };
    default:
      return { label: type, variant: 'neutral' as const };
  }
}

export function getAccountStatusBadge(status: AccountStatus) {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', variant: 'success' as const };
    case 'INVITED':
      return { label: 'Invited', variant: 'warning' as const };
    case 'SUSPENDED':
      return { label: 'Suspended', variant: 'destructive' as const };
    case 'INACTIVE':
      return { label: 'Inactive', variant: 'neutral' as const };
    default:
      return { label: status, variant: 'neutral' as const };
  }
}

// ---------------------------------------------------------------------------
// Organization Service
// ---------------------------------------------------------------------------

export const organizationService = {
  // Departments
  async getDepartments(params?: { search?: string }): Promise<Department[]> {
    const res: any = await apiClient.get('/departments');
    let list: Department[] = [];
    if (res?.success && res?.data) {
      list = Array.isArray(res.data) ? res.data : res.data.data || [];
    } else if (Array.isArray(res)) {
      list = res;
    }

    if (params?.search && list.length > 0) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.code?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q),
      );
    }
    return list;
  },

  async getDepartmentById(id: string): Promise<Department | null> {
    const res: any = await apiClient.get(`/departments/${id}`);
    if (res?.success && res?.data) return res.data;
    if (res?.data) return res.data;
    return res || null;
  },

  async createDepartment(payload: CreateDepartmentPayload): Promise<Department> {
    const res: any = await apiClient.post('/departments', {
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
      description: payload.description?.trim(),
    });
    if (res?.success && res?.data) return res.data;
    return res?.data || res;
  },

  // Teams
  async getTeams(params?: { search?: string; departmentId?: string }): Promise<Team[]> {
    const query = new URLSearchParams();
    if (params?.departmentId && params.departmentId !== 'ALL') {
      query.set('departmentId', params.departmentId);
    }
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res: any = await apiClient.get(`/teams${queryString}`);

    let list: Team[] = [];
    if (res?.success && res?.data) {
      list = Array.isArray(res.data) ? res.data : res.data.data || [];
    } else if (Array.isArray(res)) {
      list = res;
    }

    if (params?.search && list.length > 0) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name?.toLowerCase().includes(q) ||
          t.code?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q),
      );
    }
    return list;
  },

  async getTeamById(id: string): Promise<Team | null> {
    const res: any = await apiClient.get(`/teams/${id}`);
    if (res?.success && res?.data) return res.data;
    if (res?.data) return res.data;
    return res || null;
  },

  async createTeam(payload: CreateTeamPayload): Promise<Team> {
    const res: any = await apiClient.post('/teams', {
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
      departmentId: payload.departmentId,
      description: payload.description?.trim(),
    });
    if (res?.success && res?.data) return res.data;
    return res?.data || res;
  },

  // Employees
  async getEmployees(params?: {
    search?: string;
    departmentId?: string;
    teamId?: string;
    employmentType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ProfileEmployee[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.departmentId && params.departmentId !== 'ALL') query.set('departmentId', params.departmentId);
    if (params?.teamId && params.teamId !== 'ALL') query.set('teamId', params.teamId);
    if (params?.employmentType && params.employmentType !== 'ALL') query.set('employmentType', params.employmentType);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit || 50));

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res: any = await apiClient.get(`/employees${queryString}`);

    if (res?.success && res?.data) {
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data.data)) return res.data.data;
    }
    if (Array.isArray(res)) return res;
    return [];
  },

  async getEmployeeById(id: string): Promise<ProfileEmployee | null> {
    const res: any = await apiClient.get(`/employees/${id}`);
    if (res?.success && res?.data) return res.data;
    if (res?.data) return res.data;
    return res || null;
  },

  async createEmployee(payload: CreateEmployeePayload): Promise<ProfileEmployee> {
    const body: Record<string, any> = {
      employeeCode: payload.employeeCode?.trim().toUpperCase(),
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      phoneNumber: payload.phoneNumber?.trim() || undefined,
      jobTitle: payload.jobTitle.trim(),
      employmentType: payload.employmentType,
      departmentId: payload.departmentId || undefined,
      teamId: payload.teamId || undefined,
      managerId: payload.managerId || undefined,
      roleCode: payload.roleCode || undefined,
      joinDate: payload.joinDate,
    };

    if (payload.employmentType === 'INTERN' && payload.internDetails) {
      body.collegeName = payload.internDetails.collegeName?.trim();
      body.academicDegree = payload.internDetails.academicDegree?.trim();
      body.mentorId = payload.internDetails.mentorId;
      body.endDate = payload.internDetails.endDate;
    }

    const res: any = await apiClient.post('/employees', body);
    if (res?.success && res?.data) return res.data;
    return res?.data || res;
  },

  async updateEmployee(id: string, payload: Partial<CreateEmployeePayload>): Promise<ProfileEmployee> {
    const res: any = await apiClient.patch(`/employees/${id}`, payload);
    if (res?.success && res?.data) return res.data;
    return res?.data || res;
  },

  async updateEmployeeStatus(id: string, status: AccountStatus): Promise<void> {
    await apiClient.patch(`/employees/${id}/status`, { status });
  },
};
