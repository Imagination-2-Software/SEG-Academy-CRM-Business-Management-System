import { AuthenticatedUser } from '../auth';

/**
 * Standardized synthetic actors for backend testing.
 * Aligns strictly with E2E TEST_PERSONAS to ensure parity between test layers.
 */

export const mockSuperAdminActor: AuthenticatedUser = {
  userId: 'usr-super-1',
  email: 'founder@test.segacademy.internal',
  fullName: 'Founder Super Admin',
  role: { id: 'role-super', code: 'FOUNDER_SUPER_ADMIN', name: 'Super Admin' },
  roles: ['FOUNDER_SUPER_ADMIN'],
  permissions: ['*:*'],
};

export const mockAdminActor: AuthenticatedUser = {
  userId: 'usr-admin-1',
  email: 'admin@test.segacademy.internal',
  fullName: 'Admin User',
  role: { id: 'role-admin', code: 'ADMIN', name: 'Admin' },
  roles: ['ADMIN'],
  permissions: [
    'users:read', 'users:create', 'users:update',
    'students:read', 'students:create', 'students:update', 'students:verify',
    'courses:read', 'courses:create', 'courses:update',
    'batches:read', 'batches:create', 'batches:update',
    'enrolments:read', 'enrolments:create', 'enrolments:update',
    'tasks:read', 'tasks:create', 'tasks:update',
  ],
};

export const mockFinanceActor: AuthenticatedUser = {
  userId: 'usr-fin-1',
  email: 'finance@test.segacademy.internal',
  fullName: 'Finance Officer',
  role: { id: 'role-fin', code: 'FINANCE_MANAGER', name: 'Finance Manager' },
  roles: ['FINANCE_MANAGER'],
  permissions: [
    'invoices:read', 'invoices:create', 'invoices:update',
    'payments:read', 'payments:create',
    'credit_notes:read', 'credit_notes:create',
    'debit_notes:read', 'debit_notes:create',
    'refunds:read', 'refunds:create',
    'reports:read',
  ],
};

export const mockInternActor: AuthenticatedUser = {
  userId: 'usr-intern-1',
  email: 'intern@test.segacademy.internal',
  fullName: 'Intern User',
  role: { id: 'role-intern', code: 'EMPLOYEE_INTERN', name: 'Employee Intern' },
  roles: ['EMPLOYEE_INTERN'],
  permissions: ['tasks:read', 'tasks:update'],
};

export const mockTrainerActor: AuthenticatedUser = {
  userId: 'usr-trainer-1',
  email: 'trainer@test.segacademy.internal',
  fullName: 'Faculty Trainer',
  role: { id: 'role-trainer', code: 'TRAINER_FACULTY', name: 'Trainer Faculty' },
  roles: ['TRAINER_FACULTY'],
  permissions: [
    'courses:read',
    'batches:read',
    'enrolments:read',
    'tasks:read', 'tasks:update',
    'students:read',
  ],
};
