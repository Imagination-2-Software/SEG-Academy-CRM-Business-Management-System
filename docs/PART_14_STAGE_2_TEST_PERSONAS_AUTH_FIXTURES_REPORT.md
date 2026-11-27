# SEG Academy CRM – Part 14, Stage 2: Isolated Test Personas & Auth Fixtures Report

**Document Status:** Official Implementation Deliverable  
**Date:** November 27, 2026  
**Phase:** Part 14 – Stage 2: Isolated Test Personas & Authentication Fixtures  
**Scope Covered:** Synthetic persona modeling for all 6 roles, Playwright auth injection fixtures, and role verification tests.  
**Safety Protocol:** Zero Database Writes. Zero Production Credentials. Zero Real User Modifications.  

---

## 1. Executive Summary

In Stage 2 of Part 14, isolated synthetic test personas and reusable Playwright authentication fixtures were implemented. This provides a safe, reproducible testing harness for multi-role browser testing without modifying database state or using production credentials.

### Key Deliverables:
1. **Synthetic Test Personas (`apps/web/e2e/personas.ts`):** Models all 6 canonical SEG CRM roles using internal mock domains (`@test.segacademy.internal`), synthetic identifiers, and exact permissions mapped from the PostgreSQL database schema.
2. **Playwright Auth Fixture (`apps/web/e2e/fixtures/auth.fixture.ts`):** Provides reusable custom page fixtures (`founderPage`, `adminPage`, `financePage`, `teamLeaderPage`, `trainerPage`, `internPage`, `loginAs`) that inject authenticated session state directly into browser `sessionStorage` and `localStorage`.
3. **Verification Test Spec (`apps/web/e2e/auth-personas.spec.ts`):** Verified that all 6 personas have valid configurations, non-production credentials, and match the authoritative PostgreSQL RBAC matrix (3 tests passed).

---

## 2. Test Personas & RBAC Matrix

All 6 roles are modeled in `apps/web/e2e/personas.ts` using verified permissions from the connected database:

| Role Code | Test Email | Display Name | Permissions Summary | Security Boundary |
| :--- | :--- | :--- | :--- | :--- |
| **`FOUNDER_SUPER_ADMIN`** | `e2e-founder@test.segacademy.internal` | E2E Founder SuperAdmin | `['*:*']` | Universal platform access |
| **`ADMIN`** | `e2e-admin@test.segacademy.internal` | E2E Administrator | 29 permissions (`users:*`, `students:*`, `invoices:*`, etc.) | Full operations, cannot alter Founder |
| **`FINANCE_MANAGER`** | `e2e-finance@test.segacademy.internal` | E2E Finance Manager | 14 permissions (`invoices:*`, `payments:*`, `refunds:*`, etc.) | Billing/accounting, no user mutation |
| **`TEAM_LEADER`** | `e2e-teamleader@test.segacademy.internal` | E2E Team Leader | 11 permissions (`students:read/update`, `courses:*`, `tasks:*`) | Academic & task grading, no finance |
| **`TRAINER_FACULTY`** | `e2e-faculty@test.segacademy.internal` | E2E Faculty Trainer | 5 permissions (`courses:read`, `batches:read`, `tasks:read`) | Batch viewing, attendance, no financial actions |
| **`EMPLOYEE_INTERN`** | `e2e-intern@test.segacademy.internal` | E2E Intern Employee | 2 permissions (`tasks:read`, `tasks:update`) | Task deliverable submission only |

---

## 3. Playwright Authentication Fixture Architecture

In `apps/web/e2e/fixtures/auth.fixture.ts`, synthetic sessions are injected using `page.addInitScript()` before page navigation:

```typescript
// Example usage in an E2E test:
import { test, expect } from './fixtures/auth.fixture';

test('Finance Manager views billing ledger', async ({ financePage }) => {
  await financePage.goto('/invoices');
  await expect(financePage.locator('h1')).toContainText('Invoices');
});

test('Employee Intern blocked from billing ledger', async ({ internPage }) => {
  await internPage.goto('/invoices');
  // Verifies route guard redirects or renders 403 Forbidden
});
```

### Safety Advantages of Direct State Injection:
- **Zero Database Load:** Does not flood PostgreSQL with repeated login transactions or Argon2id CPU computations on every test.
- **Speed:** Instant authentication eliminates slow form-filling and network roundtrips for each test run.
- **Isolation:** Each test runs in an independent browser context with its own isolated storage state.

---

## 4. Verification Results

| Check / Command | Result | Details |
| :--- | :---: | :--- |
| **Playwright Test Discovery** | **PASS** | `npx playwright test --list` correctly discovered 3 tests in `auth-personas.spec.ts`. |
| **Persona Verification Test** | **PASS** | `npx playwright test apps/web/e2e/auth-personas.spec.ts` ran 3 tests and passed (734ms). |
| **Frontend Type-Check** | **PASS** | `npm --prefix apps/web run type-check` passed with 0 TypeScript compilation errors. |

---

## 5. Files Changed & Created

- **Created:**
  - `apps/web/e2e/personas.ts` (Persona definitions and RBAC mapping)
  - `apps/web/e2e/fixtures/auth.fixture.ts` (Playwright custom fixtures and session injection)
  - `apps/web/e2e/auth-personas.spec.ts` (Verification test spec)
  - `docs/PART_14_STAGE_2_TEST_PERSONAS_AUTH_FIXTURES_REPORT.md` (This document)

---

## 6. Next Steps (Stage 3: Business Workflow E2E Specs)

With Stage 1 and Stage 2 complete, the testing harness is ready for Stage 3:
- Authentication & route-guard tests (`e2e/auth-navigation.spec.ts`)
- Academic & student management tests (`e2e/students-academic.spec.ts`)
- Invoicing, payments, and refunds tests (`e2e/billing-financials.spec.ts`)
- Employee tasks & anti-self-review tests (`e2e/tasks-workflow.spec.ts`)
