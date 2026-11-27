import { test, expect } from './fixtures/auth.fixture';
import { TEST_PERSONAS } from './personas';

test.describe('Part 14 Stage 2: Isolated Test Personas & Auth Fixtures Verification', () => {
  test('1. Verify all 6 synthetic personas have correct role definitions', async () => {
    const roles = Object.keys(TEST_PERSONAS);
    expect(roles).toHaveLength(6);
    expect(roles).toContain('FOUNDER_SUPER_ADMIN');
    expect(roles).toContain('ADMIN');
    expect(roles).toContain('FINANCE_MANAGER');
    expect(roles).toContain('TEAM_LEADER');
    expect(roles).toContain('TRAINER_FACULTY');
    expect(roles).toContain('EMPLOYEE_INTERN');
  });

  test('2. Verify personas use non-production internal test domains', async () => {
    Object.values(TEST_PERSONAS).forEach((persona) => {
      expect(persona.user.email).toContain('@test.segacademy.internal');
      expect(persona.tokens.accessToken).toContain('mock-e2e-token-');
    });
  });

  test('3. Verify role permissions align with PostgreSQL schema matrix', async () => {
    // Founder has wildcard
    expect(TEST_PERSONAS.FOUNDER_SUPER_ADMIN.user.permissions).toEqual(['*:*']);

    // Admin has 29 permissions including user, student, academic, billing
    expect(TEST_PERSONAS.ADMIN.user.permissions).toContain('users:create');
    expect(TEST_PERSONAS.ADMIN.user.permissions).toContain('invoices:create');

    // Finance Manager has financial permissions but no user mutation
    expect(TEST_PERSONAS.FINANCE_MANAGER.user.permissions).toContain('invoices:create');
    expect(TEST_PERSONAS.FINANCE_MANAGER.user.permissions).not.toContain('users:create');

    // Employee Intern has only task permissions
    expect(TEST_PERSONAS.EMPLOYEE_INTERN.user.permissions).toEqual(['tasks:read', 'tasks:update']);
  });
});
