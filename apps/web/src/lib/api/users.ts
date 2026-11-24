import { apiClient } from './client';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  status: UserStatus;
  avatarUrl?: string;
  lastLoginAt?: string;
  employeeCode?: string;
  jobTitle?: string;
  departmentName?: string;
  createdAt: string;
  updatedAt: string;
}

const INITIAL_USERS: UserSummary[] = [
  {
    id: 'usr-001',
    email: 'admin@segacademy.com',
    fullName: 'Alexander Wright',
    phoneNumber: '+91 98765 43210',
    roleId: 'role-super-admin',
    roleCode: 'FOUNDER_SUPER_ADMIN',
    roleName: 'Founder / Super Admin',
    status: 'ACTIVE',
    employeeCode: 'EMP-001',
    jobTitle: 'Founder & Academic Director',
    departmentName: 'Executive Directorate',
    lastLoginAt: '2026-11-24T02:15:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-11-24T02:15:00.000Z',
  },
  {
    id: 'usr-002',
    email: 'sarah.jenkins@segacademy.com',
    fullName: 'Sarah Jenkins',
    phoneNumber: '+91 98765 43211',
    roleId: 'role-instructor',
    roleCode: 'INSTRUCTOR',
    roleName: 'Lead Technical Instructor',
    status: 'ACTIVE',
    employeeCode: 'EMP-002',
    jobTitle: 'Lead Technical Instructor',
    departmentName: 'Academic Operations',
    lastLoginAt: '2026-11-23T18:40:00.000Z',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-11-23T18:40:00.000Z',
  },
  {
    id: 'usr-003',
    email: 'marcus.vance@segacademy.com',
    fullName: 'Marcus Vance',
    phoneNumber: '+91 98765 43212',
    roleId: 'role-it-admin',
    roleCode: 'ADMIN',
    roleName: 'Systems Administrator',
    status: 'ACTIVE',
    employeeCode: 'EMP-003',
    jobTitle: 'Cloud Infrastructure Engineer',
    departmentName: 'Technology & Systems',
    lastLoginAt: '2026-11-24T01:10:00.000Z',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-11-24T01:10:00.000Z',
  },
  {
    id: 'usr-004',
    email: 'david.chen@segacademy.com',
    fullName: 'David Chen',
    phoneNumber: '+91 98765 43213',
    roleId: 'role-counsellor',
    roleCode: 'ACADEMIC_COUNSELLOR',
    roleName: 'Academic Counsellor',
    status: 'ACTIVE',
    employeeCode: 'EMP-004',
    jobTitle: 'Admissions & Compliance Specialist',
    departmentName: 'Admissions & Compliance',
    lastLoginAt: '2026-11-23T16:20:00.000Z',
    createdAt: '2026-02-15T00:00:00.000Z',
    updatedAt: '2026-11-23T16:20:00.000Z',
  },
  {
    id: 'usr-005',
    email: 'elena.rostova@segacademy.com',
    fullName: 'Elena Rostova',
    phoneNumber: '+91 98765 43214',
    roleId: 'role-finance',
    roleCode: 'FINANCE_MANAGER',
    roleName: 'Finance Manager',
    status: 'ACTIVE',
    employeeCode: 'EMP-005',
    jobTitle: 'Senior Accounts Officer',
    departmentName: 'Finance & Accounts',
    lastLoginAt: '2026-11-23T14:05:00.000Z',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-11-23T14:05:00.000Z',
  },
  {
    id: 'usr-006',
    email: 'priya.sharma@segacademy.com',
    fullName: 'Priya Sharma',
    phoneNumber: '+91 98765 43215',
    roleId: 'role-hr',
    roleCode: 'HR_MANAGER',
    roleName: 'Human Resources Manager',
    status: 'ACTIVE',
    employeeCode: 'EMP-006',
    jobTitle: 'HR & People Operations Lead',
    departmentName: 'Human Resources & Talent',
    lastLoginAt: '2026-11-22T11:30:00.000Z',
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-11-22T11:30:00.000Z',
  },
  {
    id: 'usr-007',
    email: 'rohit.verma@example.com',
    fullName: 'Rohit Verma',
    phoneNumber: '+91 98765 43216',
    roleId: 'role-student',
    roleCode: 'STUDENT',
    roleName: 'Student',
    status: 'ACTIVE',
    lastLoginAt: '2026-11-21T09:15:00.000Z',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-11-21T09:15:00.000Z',
  },
];

const USERS_STORAGE_KEY = 'seg_crm_users_v1';

function getStoredUsers(): UserSummary[] {
  if (typeof window === 'undefined') return INITIAL_USERS;
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

function saveStoredUsers(list: UserSummary[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export const usersService = {
  async getUsers(): Promise<UserSummary[]> {
    try {
      const res: any = await apiClient.get('/users');
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.data;
        if (list && list.length > 0) return list;
      }
    } catch {}
    return getStoredUsers();
  },

  async updateUserStatus(id: string, status: UserStatus): Promise<UserSummary | null> {
    try {
      await apiClient.patch(`/users/${id}/status`, { status });
    } catch {}

    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      users[idx].status = status;
      users[idx].updatedAt = new Date().toISOString();
      saveStoredUsers(users);
      return users[idx];
    }
    return null;
  },
};
