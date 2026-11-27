import { AuthUserInfo, AuthTokens } from '../src/lib/api/types';

export type RoleCode =
  | 'FOUNDER_SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE_MANAGER'
  | 'TEAM_LEADER'
  | 'TRAINER_FACULTY'
  | 'EMPLOYEE_INTERN';

export interface TestPersona {
  roleCode: RoleCode;
  user: AuthUserInfo;
  tokens: AuthTokens;
}

/**
 * Isolated Synthetic Test Personas for SEG CRM E2E Testing.
 *
 * CRITICAL SAFETY RULES:
 * - Zero production or live Supabase credentials used.
 * - Zero real user emails or passwords.
 * - Exact permissions matching the authoritative PostgreSQL database schema.
 */
export const TEST_PERSONAS: Record<RoleCode, TestPersona> = {
  FOUNDER_SUPER_ADMIN: {
    roleCode: 'FOUNDER_SUPER_ADMIN',
    user: {
      id: 'usr-e2e-founder-001',
      email: 'e2e-founder@test.segacademy.internal',
      fullName: 'E2E Founder SuperAdmin',
      role: {
        id: 'role-founder',
        code: 'FOUNDER_SUPER_ADMIN',
        name: 'Founder & Super Admin',
      },
      employeeId: 'emp-e2e-founder',
      permissions: ['*:*'],
    },
    tokens: {
      accessToken: 'mock-e2e-token-founder',
      refreshToken: 'mock-e2e-refresh-founder',
      tokenType: 'Bearer',
      expiresIn: 3600,
    },
  },

  ADMIN: {
    roleCode: 'ADMIN',
    user: {
      id: 'usr-e2e-admin-002',
      email: 'e2e-admin@test.segacademy.internal',
      fullName: 'E2E Administrator',
      role: {
        id: 'role-admin',
        code: 'ADMIN',
        name: 'Administrator',
      },
      employeeId: 'emp-e2e-admin',
      permissions: [
        'users:read',
        'users:create',
        'users:update',
        'users:manage_status',
        'users:manage_roles',
        'roles:read',
        'students:read',
        'students:create',
        'students:update',
        'courses:read',
        'courses:create',
        'courses:update',
        'batches:read',
        'batches:create',
        'batches:update',
        'enrolments:read',
        'enrolments:create',
        'enrolments:update',
        'invoices:read',
        'invoices:create',
        'invoices:update',
        'invoices:approve',
        'payments:read',
        'payments:create',
        'refunds:read',
        'refunds:process',
        'tasks:read',
        'tasks:create',
        'tasks:update',
      ],
    },
    tokens: {
      accessToken: 'mock-e2e-token-admin',
      refreshToken: 'mock-e2e-refresh-admin',
      tokenType: 'Bearer',
      expiresIn: 3600,
    },
  },

  FINANCE_MANAGER: {
    roleCode: 'FINANCE_MANAGER',
    user: {
      id: 'usr-e2e-fin-003',
      email: 'e2e-finance@test.segacademy.internal',
      fullName: 'E2E Finance Manager',
      role: {
        id: 'role-finance',
        code: 'FINANCE_MANAGER',
        name: 'Finance Manager',
      },
      employeeId: 'emp-e2e-finance',
      permissions: [
        'users:read',
        'roles:read',
        'students:read',
        'courses:read',
        'batches:read',
        'enrolments:read',
        'invoices:read',
        'invoices:create',
        'invoices:update',
        'invoices:approve',
        'payments:read',
        'payments:create',
        'refunds:read',
        'refunds:process',
      ],
    },
    tokens: {
      accessToken: 'mock-e2e-token-finance',
      refreshToken: 'mock-e2e-refresh-finance',
      tokenType: 'Bearer',
      expiresIn: 3600,
    },
  },

  TEAM_LEADER: {
    roleCode: 'TEAM_LEADER',
    user: {
      id: 'usr-e2e-lead-004',
      email: 'e2e-teamleader@test.segacademy.internal',
      fullName: 'E2E Team Leader',
      role: {
        id: 'role-leader',
        code: 'TEAM_LEADER',
        name: 'Team Leader',
      },
      employeeId: 'emp-e2e-leader',
      permissions: [
        'students:read',
        'students:update',
        'courses:read',
        'courses:update',
        'batches:read',
        'batches:update',
        'enrolments:read',
        'enrolments:update',
        'tasks:read',
        'tasks:create',
        'tasks:update',
      ],
    },
    tokens: {
      accessToken: 'mock-e2e-token-leader',
      refreshToken: 'mock-e2e-refresh-leader',
      tokenType: 'Bearer',
      expiresIn: 3600,
    },
  },

  TRAINER_FACULTY: {
    roleCode: 'TRAINER_FACULTY',
    user: {
      id: 'usr-e2e-trainer-005',
      email: 'e2e-faculty@test.segacademy.internal',
      fullName: 'E2E Faculty Trainer',
      role: {
        id: 'role-faculty',
        code: 'TRAINER_FACULTY',
        name: 'Trainer / Faculty',
      },
      employeeId: 'emp-e2e-faculty',
      permissions: [
        'batches:read',
        'courses:read',
        'enrolments:read',
        'students:read',
        'tasks:read',
      ],
    },
    tokens: {
      accessToken: 'mock-e2e-token-faculty',
      refreshToken: 'mock-e2e-refresh-faculty',
      tokenType: 'Bearer',
      expiresIn: 3600,
    },
  },

  EMPLOYEE_INTERN: {
    roleCode: 'EMPLOYEE_INTERN',
    user: {
      id: 'usr-e2e-intern-006',
      email: 'e2e-intern@test.segacademy.internal',
      fullName: 'E2E Intern Employee',
      role: {
        id: 'role-intern',
        code: 'EMPLOYEE_INTERN',
        name: 'Employee / Intern',
      },
      employeeId: 'emp-e2e-intern',
      permissions: ['tasks:read', 'tasks:update'],
    },
    tokens: {
      accessToken: 'mock-e2e-token-intern',
      refreshToken: 'mock-e2e-refresh-intern',
      tokenType: 'Bearer',
      expiresIn: 3600,
    },
  },
};
