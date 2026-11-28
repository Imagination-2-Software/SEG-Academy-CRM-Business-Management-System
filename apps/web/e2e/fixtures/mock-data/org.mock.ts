/**
 * SEG Academy CRM - Centralized Organization (Departments, Teams, Employees) E2E Mock Data
 */

export const MOCK_DEPARTMENTS = [
  {
    id: 'dept-e2e-001',
    name: 'Academic Affairs & Curriculum',
    code: 'ACAD',
    description: 'Faculty operations and curriculum design',
    headId: 'emp-e2e-reg-001',
    head: {
      id: 'emp-e2e-reg-001',
      employeeCode: 'EMP-001',
      fullName: 'Dr. Vikram Malhotra',
      jobTitle: 'Academic Director',
      email: 'vikram.malhotra@test.segacademy.internal',
    },
    employeeCount: 12,
    teamCount: 3,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'dept-e2e-002',
    name: 'Technology & Labs',
    code: 'TECH',
    description: 'Cloud labs and technical infrastructure',
    employeeCount: 6,
    teamCount: 2,
    createdAt: '2026-11-02T10:00:00.000Z',
    updatedAt: '2026-11-02T10:00:00.000Z',
  },
];

export const MOCK_TEAMS = [
  {
    id: 'team-e2e-001',
    name: 'Full Stack Faculty Cohort',
    code: 'FS-FAC',
    description: 'Instructors mentoring Full Stack engineering batches',
    departmentId: 'dept-e2e-001',
    department: {
      id: 'dept-e2e-001',
      name: 'Academic Affairs & Curriculum',
      code: 'ACAD',
    },
    leadId: 'emp-e2e-reg-002',
    lead: {
      id: 'emp-e2e-reg-002',
      employeeCode: 'EMP-002',
      fullName: 'Ananya Roy',
      jobTitle: 'Senior Faculty',
      email: 'ananya.roy@test.segacademy.internal',
    },
    employeeCount: 5,
    createdAt: '2026-11-05T10:00:00.000Z',
    updatedAt: '2026-11-05T10:00:00.000Z',
  },
];

export const MOCK_EMPLOYEES = [
  {
    id: 'emp-e2e-reg-001',
    employeeCode: 'EMP-001',
    fullName: 'Dr. Vikram Malhotra',
    email: 'vikram.malhotra@test.segacademy.internal',
    jobTitle: 'Academic Director',
    departmentId: 'dept-e2e-001',
    departmentName: 'Academic Affairs & Curriculum',
    roleCode: 'ADMIN',
    roleName: 'System Administrator',
    status: 'ACTIVE',
    joinDate: '2026-01-15',
  },
  {
    id: 'emp-e2e-reg-002',
    employeeCode: 'EMP-002',
    fullName: 'Ananya Roy',
    email: 'ananya.roy@test.segacademy.internal',
    jobTitle: 'Senior Faculty',
    departmentId: 'dept-e2e-001',
    departmentName: 'Academic Affairs & Curriculum',
    teamId: 'team-e2e-001',
    teamName: 'Full Stack Faculty Cohort',
    roleCode: 'TRAINER_FACULTY',
    roleName: 'Trainer / Faculty',
    status: 'ACTIVE',
    joinDate: '2026-03-01',
  },
];
