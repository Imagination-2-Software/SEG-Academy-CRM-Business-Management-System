import { apiClient, tokenStorage } from './client';

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
// Seed Data (Reflecting SEG Academy Organizational Architecture)
// ---------------------------------------------------------------------------

const SEED_DEPARTMENTS: Department[] = [
  {
    id: 'dept-acad',
    name: 'Academic & Curriculum Operations',
    code: 'ACAD',
    description: 'Manages instructional design, faculty delivery, assessment standards, and academic accreditation.',
    headId: 'emp-001',
    head: {
      id: 'emp-001',
      employeeCode: 'EMP-2026-001',
      fullName: 'Dr. Rajesh Iyer',
      jobTitle: 'Dean & Lead Academic Director',
      email: 'rajesh.iyer@segacademy.com',
    },
    employeeCount: 4,
    teamCount: 2,
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  {
    id: 'dept-tech',
    name: 'Technology & Cloud Engineering',
    code: 'TECH',
    description: 'Oversees student cloud sandbox labs, LMS infrastructure, security posture, and developer tooling.',
    headId: 'emp-002',
    head: {
      id: 'emp-002',
      employeeCode: 'EMP-2026-002',
      fullName: 'Anand Kulkarni',
      jobTitle: 'Chief Technology Architect',
      email: 'anand.kulkarni@segacademy.com',
    },
    employeeCount: 3,
    teamCount: 1,
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-11-18T14:30:00Z',
  },
  {
    id: 'dept-adm',
    name: 'Admissions & Career Counseling',
    code: 'ADM',
    description: 'Drives student admissions counseling, cohort onboarding, KYC verification, and industry placements.',
    headId: 'emp-003',
    head: {
      id: 'emp-003',
      employeeCode: 'EMP-2026-003',
      fullName: 'Meera Nair',
      jobTitle: 'Head of Admissions & Career Placements',
      email: 'meera.nair@segacademy.com',
    },
    employeeCount: 2,
    teamCount: 1,
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-11-15T11:00:00Z',
  },
  {
    id: 'dept-fin',
    name: 'Finance & Institutional Billing',
    code: 'FIN',
    description: 'Oversees student fee billing, installment collections, tax invoice generation, and GST compliance.',
    headId: 'emp-004',
    head: {
      id: 'emp-004',
      employeeCode: 'EMP-2026-004',
      fullName: 'Suresh Krishnan',
      jobTitle: 'Senior Finance & Billing Controller',
      email: 'suresh.krishnan@segacademy.com',
    },
    employeeCount: 1,
    teamCount: 1,
    createdAt: '2026-01-18T09:00:00Z',
    updatedAt: '2026-11-10T16:00:00Z',
  },
  {
    id: 'dept-hr',
    name: 'People Operations & Intern Academy',
    code: 'HR',
    description: 'Handles staff recruitment, employee lifecycle, intern mentorship development, and HR compliance.',
    headId: 'emp-005',
    head: {
      id: 'emp-005',
      employeeCode: 'EMP-2026-005',
      fullName: 'Sunita Rao',
      jobTitle: 'Director of People & Intern Development',
      email: 'sunita.rao@segacademy.com',
    },
    employeeCount: 2,
    teamCount: 1,
    createdAt: '2026-01-20T09:00:00Z',
    updatedAt: '2026-11-05T12:00:00Z',
  },
];

const SEED_TEAMS: Team[] = [
  {
    id: 'team-fs',
    name: 'Full Stack & AI Instruction Faculty',
    code: 'FS_FACULTY',
    departmentId: 'dept-acad',
    description: 'Delivers full stack architecture, cloud native microservices, and practical AI engineering courses.',
    leadId: 'emp-001',
    lead: {
      id: 'emp-001',
      employeeCode: 'EMP-2026-001',
      fullName: 'Dr. Rajesh Iyer',
      jobTitle: 'Dean & Lead Academic Director',
      email: 'rajesh.iyer@segacademy.com',
    },
    employeeCount: 2,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  {
    id: 'team-ds',
    name: 'Data Science & Machine Learning Faculty',
    code: 'DS_FACULTY',
    departmentId: 'dept-acad',
    description: 'Specializes in statistical modeling, neural networks, PyTorch, and deep learning engineering.',
    leadId: 'emp-006',
    lead: {
      id: 'emp-006',
      employeeCode: 'EMP-2026-006',
      fullName: 'Vikramaditya Sengupta',
      jobTitle: 'Principal Trainer - Applied Machine Learning',
      email: 'vikram.sengupta@segacademy.com',
    },
    employeeCount: 2,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-11-15T12:00:00Z',
  },
  {
    id: 'team-cloud',
    name: 'Cloud Infrastructure & DevSecOps Team',
    code: 'DEVSECOPS',
    departmentId: 'dept-tech',
    description: 'Manages AWS/GCP clusters, Kubernetes student pods, automated testing pipelines, and cyber labs.',
    leadId: 'emp-002',
    lead: {
      id: 'emp-002',
      employeeCode: 'EMP-2026-002',
      fullName: 'Anand Kulkarni',
      jobTitle: 'Chief Technology Architect',
      email: 'anand.kulkarni@segacademy.com',
    },
    employeeCount: 3,
    createdAt: '2026-01-12T11:00:00Z',
    updatedAt: '2026-11-18T14:30:00Z',
  },
  {
    id: 'team-counsel',
    name: 'Student Admissions & Career Guidance',
    code: 'COUNSELING',
    departmentId: 'dept-adm',
    description: 'Guides applicants, conducts technical interviews, evaluates scholarships, and supports placement.',
    leadId: 'emp-003',
    lead: {
      id: 'emp-003',
      employeeCode: 'EMP-2026-003',
      fullName: 'Meera Nair',
      jobTitle: 'Head of Admissions & Career Placements',
      email: 'meera.nair@segacademy.com',
    },
    employeeCount: 2,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-11-15T11:00:00Z',
  },
  {
    id: 'team-billing',
    name: 'Fee Collections & Reconciliation',
    code: 'BILLING_REC',
    departmentId: 'dept-fin',
    description: 'Performs payment verification, bank UTR audits, GST credit notes, and installment plan approvals.',
    leadId: 'emp-004',
    lead: {
      id: 'emp-004',
      employeeCode: 'EMP-2026-004',
      fullName: 'Suresh Krishnan',
      jobTitle: 'Senior Finance & Billing Controller',
      email: 'suresh.krishnan@segacademy.com',
    },
    employeeCount: 1,
    createdAt: '2026-01-18T10:00:00Z',
    updatedAt: '2026-11-10T16:00:00Z',
  },
  {
    id: 'team-interns',
    name: 'Graduate Engineering Intern Cohort',
    code: 'INTERN_DEV',
    departmentId: 'dept-hr',
    description: 'Hands-on accelerated internship training track covering internal systems development.',
    leadId: 'emp-005',
    lead: {
      id: 'emp-005',
      employeeCode: 'EMP-2026-005',
      fullName: 'Sunita Rao',
      jobTitle: 'Director of People & Intern Development',
      email: 'sunita.rao@segacademy.com',
    },
    employeeCount: 2,
    createdAt: '2026-01-20T11:00:00Z',
    updatedAt: '2026-11-05T12:00:00Z',
  },
];

const SEED_EMPLOYEES: ProfileEmployee[] = [
  {
    id: 'emp-001',
    userId: 'usr-001',
    employeeCode: 'EMP-2026-001',
    fullName: 'Dr. Rajesh Iyer',
    email: 'rajesh.iyer@segacademy.com',
    phoneNumber: '+91 98201 12345',
    jobTitle: 'Dean & Lead Academic Director',
    employmentType: 'FULL_TIME',
    departmentId: 'dept-acad',
    departmentName: 'Academic & Curriculum Operations',
    teamId: 'team-fs',
    teamName: 'Full Stack & AI Instruction Faculty',
    roleCode: 'FOUNDER_SUPER_ADMIN',
    roleName: 'Founder & Super Admin',
    status: 'ACTIVE',
    joinDate: '2024-06-01',
    createdAt: '2024-06-01T09:00:00Z',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  {
    id: 'emp-002',
    userId: 'usr-002',
    employeeCode: 'EMP-2026-002',
    fullName: 'Anand Kulkarni',
    email: 'anand.kulkarni@segacademy.com',
    phoneNumber: '+91 98202 23456',
    jobTitle: 'Chief Technology Architect',
    employmentType: 'FULL_TIME',
    departmentId: 'dept-tech',
    departmentName: 'Technology & Cloud Engineering',
    teamId: 'team-cloud',
    teamName: 'Cloud Infrastructure & DevSecOps Team',
    roleCode: 'ADMIN',
    roleName: 'System Administrator',
    status: 'ACTIVE',
    joinDate: '2024-08-15',
    createdAt: '2024-08-15T09:00:00Z',
    updatedAt: '2026-11-18T14:30:00Z',
  },
  {
    id: 'emp-003',
    userId: 'usr-003',
    employeeCode: 'EMP-2026-003',
    fullName: 'Meera Nair',
    email: 'meera.nair@segacademy.com',
    phoneNumber: '+91 98203 34567',
    jobTitle: 'Head of Admissions & Career Placements',
    employmentType: 'FULL_TIME',
    departmentId: 'dept-adm',
    departmentName: 'Admissions & Career Counseling',
    teamId: 'team-counsel',
    teamName: 'Student Admissions & Career Guidance',
    roleCode: 'TEAM_LEADER',
    roleName: 'Team Leader',
    status: 'ACTIVE',
    joinDate: '2025-01-10',
    createdAt: '2025-01-10T09:00:00Z',
    updatedAt: '2026-11-15T11:00:00Z',
  },
  {
    id: 'emp-004',
    userId: 'usr-004',
    employeeCode: 'EMP-2026-004',
    fullName: 'Suresh Krishnan',
    email: 'suresh.krishnan@segacademy.com',
    phoneNumber: '+91 98204 45678',
    jobTitle: 'Senior Finance & Billing Controller',
    employmentType: 'FULL_TIME',
    departmentId: 'dept-fin',
    departmentName: 'Finance & Institutional Billing',
    teamId: 'team-billing',
    teamName: 'Fee Collections & Reconciliation',
    roleCode: 'FINANCE_MANAGER',
    roleName: 'Finance Manager',
    status: 'ACTIVE',
    joinDate: '2025-02-01',
    createdAt: '2025-02-01T09:00:00Z',
    updatedAt: '2026-11-10T16:00:00Z',
  },
  {
    id: 'emp-005',
    userId: 'usr-005',
    employeeCode: 'EMP-2026-005',
    fullName: 'Sunita Rao',
    email: 'sunita.rao@segacademy.com',
    phoneNumber: '+91 98205 56789',
    jobTitle: 'Director of People & Intern Development',
    employmentType: 'FULL_TIME',
    departmentId: 'dept-hr',
    departmentName: 'People Operations & Intern Academy',
    teamId: 'team-interns',
    teamName: 'Graduate Engineering Intern Cohort',
    roleCode: 'ADMIN',
    roleName: 'System Administrator',
    status: 'ACTIVE',
    joinDate: '2025-03-01',
    createdAt: '2025-03-01T09:00:00Z',
    updatedAt: '2026-11-05T12:00:00Z',
  },
  {
    id: 'emp-006',
    userId: 'usr-006',
    employeeCode: 'EMP-2026-006',
    fullName: 'Vikramaditya Sengupta',
    email: 'vikram.sengupta@segacademy.com',
    phoneNumber: '+91 98206 67890',
    jobTitle: 'Principal Trainer - Applied Machine Learning',
    employmentType: 'FULL_TIME',
    departmentId: 'dept-acad',
    departmentName: 'Academic & Curriculum Operations',
    teamId: 'team-ds',
    teamName: 'Data Science & Machine Learning Faculty',
    managerId: 'emp-001',
    managerName: 'Dr. Rajesh Iyer',
    roleCode: 'TRAINER_FACULTY',
    roleName: 'Faculty & Trainer',
    status: 'ACTIVE',
    joinDate: '2025-04-15',
    createdAt: '2025-04-15T09:00:00Z',
    updatedAt: '2026-11-15T12:00:00Z',
  },
  {
    id: 'emp-007',
    userId: 'usr-007',
    employeeCode: 'EMP-2026-007',
    fullName: 'Ananya Deshmukh',
    email: 'ananya.deshmukh@segacademy.com',
    phoneNumber: '+91 98207 78901',
    jobTitle: 'Senior Admissions Counselor',
    employmentType: 'FULL_TIME',
    departmentId: 'dept-adm',
    departmentName: 'Admissions & Career Counseling',
    teamId: 'team-counsel',
    teamName: 'Student Admissions & Career Guidance',
    managerId: 'emp-003',
    managerName: 'Meera Nair',
    roleCode: 'EMPLOYEE_INTERN',
    roleName: 'Employee / Intern',
    status: 'ACTIVE',
    joinDate: '2025-06-01',
    createdAt: '2025-06-01T09:00:00Z',
    updatedAt: '2026-11-10T11:00:00Z',
  },
  {
    id: 'emp-008',
    userId: 'usr-008',
    employeeCode: 'EMP-2026-008',
    fullName: 'Karthik Sundaram',
    email: 'karthik.sundaram@segacademy.com',
    phoneNumber: '+91 98208 89012',
    jobTitle: 'Cloud Solutions Engineer',
    employmentType: 'FULL_TIME',
    departmentId: 'dept-tech',
    departmentName: 'Technology & Cloud Engineering',
    teamId: 'team-cloud',
    teamName: 'Cloud Infrastructure & DevSecOps Team',
    managerId: 'emp-002',
    managerName: 'Anand Kulkarni',
    roleCode: 'TRAINER_FACULTY',
    roleName: 'Faculty & Trainer',
    status: 'ACTIVE',
    joinDate: '2025-07-01',
    createdAt: '2025-07-01T09:00:00Z',
    updatedAt: '2026-11-12T15:00:00Z',
  },
  {
    id: 'emp-009',
    userId: 'usr-009',
    employeeCode: 'INT-2026-001',
    fullName: 'Tanvi Joshi',
    email: 'tanvi.joshi@segacademy.com',
    phoneNumber: '+91 98209 90123',
    jobTitle: 'Graduate Cloud Platform Intern',
    employmentType: 'INTERN',
    departmentId: 'dept-tech',
    departmentName: 'Technology & Cloud Engineering',
    teamId: 'team-cloud',
    teamName: 'Cloud Infrastructure & DevSecOps Team',
    managerId: 'emp-002',
    managerName: 'Anand Kulkarni',
    roleCode: 'EMPLOYEE_INTERN',
    roleName: 'Employee / Intern',
    status: 'ACTIVE',
    joinDate: '2026-01-15',
    internProfile: {
      id: 'intern-001',
      employeeId: 'emp-009',
      mentorId: 'emp-002',
      mentorName: 'Anand Kulkarni',
      status: 'ACTIVE',
      startDate: '2026-01-15',
      endDate: '2026-07-15',
      collegeName: 'Veermata Jijabai Technological Institute (VJTI Mumbai)',
      academicDegree: 'B.Tech Computer Engineering',
    },
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  {
    id: 'emp-010',
    userId: 'usr-010',
    employeeCode: 'INT-2026-002',
    fullName: 'Sahil Verma',
    email: 'sahil.verma@segacademy.com',
    phoneNumber: '+91 98210 01234',
    jobTitle: 'Junior Data Analyst Intern',
    employmentType: 'INTERN',
    departmentId: 'dept-acad',
    departmentName: 'Academic & Curriculum Operations',
    teamId: 'team-ds',
    teamName: 'Data Science & Machine Learning Faculty',
    managerId: 'emp-006',
    managerName: 'Vikramaditya Sengupta',
    roleCode: 'EMPLOYEE_INTERN',
    roleName: 'Employee / Intern',
    status: 'ACTIVE',
    joinDate: '2026-02-01',
    internProfile: {
      id: 'intern-002',
      employeeId: 'emp-010',
      mentorId: 'emp-006',
      mentorName: 'Vikramaditya Sengupta',
      status: 'ACTIVE',
      startDate: '2026-02-01',
      endDate: '2026-08-01',
      collegeName: 'BITS Pilani',
      academicDegree: 'M.Sc. Data Science & Applied Statistics',
    },
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-11-10T14:00:00Z',
  },
];

const LOCAL_STORAGE_DEPTS = 'seg_crm_departments_cache_v1';
const LOCAL_STORAGE_TEAMS = 'seg_crm_teams_cache_v1';
const LOCAL_STORAGE_EMPLOYEES = 'seg_crm_employees_cache_v1';

function getStoredDepartments(): Department[] {
  if (typeof window === 'undefined') return SEED_DEPARTMENTS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DEPTS);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_DEPTS, JSON.stringify(SEED_DEPARTMENTS));
      return SEED_DEPARTMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_DEPARTMENTS;
  }
}

function saveStoredDepartments(data: Department[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_DEPTS, JSON.stringify(data));
  } catch {}
}

function getStoredTeams(): Team[] {
  if (typeof window === 'undefined') return SEED_TEAMS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TEAMS);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_TEAMS, JSON.stringify(SEED_TEAMS));
      return SEED_TEAMS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_TEAMS;
  }
}

function saveStoredTeams(data: Team[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_TEAMS, JSON.stringify(data));
  } catch {}
}

function getStoredEmployees(): ProfileEmployee[] {
  if (typeof window === 'undefined') return SEED_EMPLOYEES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EMPLOYEES);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_EMPLOYEES, JSON.stringify(SEED_EMPLOYEES));
      return SEED_EMPLOYEES;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_EMPLOYEES;
  }
}

function saveStoredEmployees(data: ProfileEmployee[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_EMPLOYEES, JSON.stringify(data));
  } catch {}
}

// ---------------------------------------------------------------------------
// Organization Service
// ---------------------------------------------------------------------------

export const organizationService = {
  // Departments
  async getDepartments(params?: { search?: string }): Promise<Department[]> {
    if (tokenStorage.getAccessToken()) {
      try {
        const res: any = await apiClient.get('/departments');
        if (res?.success && res?.data) {
          return Array.isArray(res.data) ? res.data : res.data.data || [];
        }
      } catch {}
    }

    let list = getStoredDepartments();
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.code.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q),
      );
    }
    return list;
  },

  async getDepartmentById(id: string): Promise<Department | null> {
    if (tokenStorage.getAccessToken()) {
      try {
        const res: any = await apiClient.get(`/departments/${id}`);
        if (res?.success && res?.data) return res.data;
      } catch {}
    }

    const list = getStoredDepartments();
    const found = list.find((d) => d.id === id || d.code.toLowerCase() === id.toLowerCase());
    if (!found) return null;

    // Attach teams & employees
    const allTeams = getStoredTeams().filter((t) => t.departmentId === found.id);
    const allEmployees = getStoredEmployees().filter((e) => e.departmentId === found.id);

    return {
      ...found,
      teams: allTeams,
      employeeCount: allEmployees.length,
      teamCount: allTeams.length,
    };
  },

  async createDepartment(payload: CreateDepartmentPayload): Promise<Department> {
    try {
      const res: any = await apiClient.post('/departments', payload);
      if (res?.success && res?.data) return res.data;
    } catch {}

    const list = getStoredDepartments();
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
      description: payload.description?.trim(),
      headId: payload.headId,
      head: payload.headId
        ? getStoredEmployees()
            .filter((e) => e.id === payload.headId)
            .map((e) => ({
              id: e.id,
              employeeCode: e.employeeCode,
              fullName: e.fullName,
              jobTitle: e.jobTitle,
              email: e.email,
            }))[0]
        : undefined,
      employeeCount: 0,
      teamCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...list, newDept];
    saveStoredDepartments(updated);
    return newDept;
  },

  // Teams
  async getTeams(params?: { search?: string; departmentId?: string }): Promise<Team[]> {
    if (tokenStorage.getAccessToken()) {
      try {
        const res: any = await apiClient.get('/teams');
        if (res?.success && res?.data) {
          return Array.isArray(res.data) ? res.data : res.data.data || [];
        }
      } catch {}
    }

    let list = getStoredTeams();
    const allDepts = getStoredDepartments();
    list = list.map((t) => {
      const d = allDepts.find((dept) => dept.id === t.departmentId);
      return {
        ...t,
        department: d ? { id: d.id, name: d.name, code: d.code } : undefined,
      };
    });

    if (params?.departmentId && params.departmentId !== 'ALL') {
      list = list.filter((t) => t.departmentId === params.departmentId);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q),
      );
    }
    return list;
  },

  async getTeamById(id: string): Promise<Team | null> {
    if (tokenStorage.getAccessToken()) {
      try {
        const res: any = await apiClient.get(`/teams/${id}`);
        if (res?.success && res?.data) return res.data;
      } catch {}
    }

    const list = getStoredTeams();
    const found = list.find((t) => t.id === id || t.code.toLowerCase() === id.toLowerCase());
    if (!found) return null;

    const dept = getStoredDepartments().find((d) => d.id === found.departmentId);
    const employees = getStoredEmployees().filter((e) => e.teamId === found.id);

    return {
      ...found,
      department: dept ? { id: dept.id, name: dept.name, code: dept.code } : undefined,
      employeeCount: employees.length,
      employees,
    };
  },

  async createTeam(payload: CreateTeamPayload): Promise<Team> {
    try {
      const res: any = await apiClient.post('/teams', payload);
      if (res?.success && res?.data) return res.data;
    } catch {}

    const list = getStoredTeams();
    const dept = getStoredDepartments().find((d) => d.id === payload.departmentId);
    const lead = payload.leadId
      ? getStoredEmployees().find((e) => e.id === payload.leadId)
      : undefined;

    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
      description: payload.description?.trim(),
      departmentId: payload.departmentId,
      department: dept ? { id: dept.id, name: dept.name, code: dept.code } : undefined,
      leadId: payload.leadId,
      lead: lead
        ? {
            id: lead.id,
            employeeCode: lead.employeeCode,
            fullName: lead.fullName,
            jobTitle: lead.jobTitle,
            email: lead.email,
          }
        : undefined,
      employeeCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...list, newTeam];
    saveStoredTeams(updated);

    // Update team count on department
    if (dept) {
      const depts = getStoredDepartments();
      const dIndex = depts.findIndex((d) => d.id === dept.id);
      if (dIndex !== -1) {
        depts[dIndex].teamCount = (depts[dIndex].teamCount || 0) + 1;
        saveStoredDepartments(depts);
      }
    }

    return newTeam;
  },

  // Employees
  async getEmployees(params?: {
    search?: string;
    departmentId?: string;
    teamId?: string;
    employmentType?: string;
    status?: string;
  }): Promise<ProfileEmployee[]> {
    if (tokenStorage.getAccessToken()) {
      try {
        const res: any = await apiClient.get('/employees');
        if (res?.success && res?.data) {
          return Array.isArray(res.data) ? res.data : res.data.data || [];
        }
      } catch {}
    }

    let list = getStoredEmployees();

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.jobTitle.toLowerCase().includes(q),
      );
    }

    if (params?.departmentId && params.departmentId !== 'ALL') {
      list = list.filter((e) => e.departmentId === params.departmentId);
    }

    if (params?.teamId && params.teamId !== 'ALL') {
      list = list.filter((e) => e.teamId === params.teamId);
    }

    if (params?.employmentType && params.employmentType !== 'ALL') {
      list = list.filter((e) => e.employmentType === params.employmentType);
    }

    if (params?.status && params.status !== 'ALL') {
      list = list.filter((e) => e.status === params.status);
    }

    return list;
  },

  async getEmployeeById(id: string): Promise<ProfileEmployee | null> {
    if (tokenStorage.getAccessToken()) {
      try {
        const res: any = await apiClient.get(`/employees/${id}`);
        if (res?.success && res?.data) return res.data;
      } catch {}
    }

    const list = getStoredEmployees();
    const found = list.find(
      (e) =>
        e.id === id ||
        e.employeeCode.toLowerCase() === id.toLowerCase() ||
        e.userId === id,
    );
    if (!found) return null;

    // Find direct reports
    const directReports = list.filter((e) => e.managerId === found.id);

    return {
      ...found,
      directReports,
    };
  },

  async createEmployee(payload: CreateEmployeePayload): Promise<ProfileEmployee> {
    try {
      const res: any = await apiClient.post('/employees', payload);
      if (res?.success && res?.data) return res.data;
    } catch {}

    const list = getStoredEmployees();
    const dept = getStoredDepartments().find((d) => d.id === payload.departmentId);
    const team = getStoredTeams().find((t) => t.id === payload.teamId);
    const manager = payload.managerId
      ? list.find((e) => e.id === payload.managerId)
      : undefined;

    const nextCode =
      payload.employeeCode ||
      (payload.employmentType === 'INTERN'
        ? `INT-2026-00${list.filter((e) => e.employmentType === 'INTERN').length + 3}`
        : `EMP-2026-00${list.filter((e) => e.employmentType !== 'INTERN').length + 9}`);

    const roleNameMap: Record<string, string> = {
      FOUNDER_SUPER_ADMIN: 'Founder & Super Admin',
      ADMIN: 'System Administrator',
      TEAM_LEADER: 'Team Leader',
      FINANCE_MANAGER: 'Finance Manager',
      TRAINER_FACULTY: 'Faculty & Trainer',
      EMPLOYEE_INTERN: 'Employee / Intern',
    };

    const newEmp: ProfileEmployee = {
      id: `emp-${Date.now()}`,
      userId: `usr-${Date.now()}`,
      employeeCode: nextCode,
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      phoneNumber: payload.phoneNumber?.trim(),
      jobTitle: payload.jobTitle.trim(),
      employmentType: payload.employmentType,
      departmentId: payload.departmentId,
      departmentName: dept?.name,
      teamId: payload.teamId,
      teamName: team?.name,
      managerId: payload.managerId,
      managerName: manager?.fullName,
      roleCode: payload.roleCode,
      roleName: roleNameMap[payload.roleCode] || payload.roleCode,
      status: 'ACTIVE',
      joinDate: payload.joinDate,
      internProfile:
        payload.employmentType === 'INTERN' && payload.internDetails
          ? {
              id: `intern-${Date.now()}`,
              employeeId: `emp-${Date.now()}`,
              mentorId: payload.internDetails.mentorId,
              mentorName: payload.internDetails.mentorId
                ? list.find((e) => e.id === payload.internDetails?.mentorId)?.fullName
                : undefined,
              status: 'ACTIVE',
              startDate: payload.internDetails.startDate,
              endDate: payload.internDetails.endDate,
              collegeName: payload.internDetails.collegeName,
              academicDegree: payload.internDetails.academicDegree,
            }
          : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...list, newEmp];
    saveStoredEmployees(updated);

    // Update employee count in dept & team
    if (dept) {
      const depts = getStoredDepartments();
      const dIdx = depts.findIndex((d) => d.id === dept.id);
      if (dIdx !== -1) {
        depts[dIdx].employeeCount = (depts[dIdx].employeeCount || 0) + 1;
        saveStoredDepartments(depts);
      }
    }
    if (team) {
      const teams = getStoredTeams();
      const tIdx = teams.findIndex((t) => t.id === team.id);
      if (tIdx !== -1) {
        teams[tIdx].employeeCount = (teams[tIdx].employeeCount || 0) + 1;
        saveStoredTeams(teams);
      }
    }

    return newEmp;
  },

  async updateEmployeeStatus(id: string, status: AccountStatus): Promise<void> {
    try {
      await apiClient.patch(`/employees/${id}/status`, { status });
    } catch {}

    const list = getStoredEmployees();
    const idx = list.findIndex((e) => e.id === id);
    if (idx !== -1) {
      list[idx].status = status;
      list[idx].updatedAt = new Date().toISOString();
      saveStoredEmployees(list);
    }
  },
};
