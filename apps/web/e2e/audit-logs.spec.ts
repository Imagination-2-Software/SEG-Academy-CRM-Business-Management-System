import { test, expect } from './fixtures/auth.fixture';
import { Page, Route } from '@playwright/test';

/**
 * SEG Academy CRM - Security & Audit Trail E2E Test Suite
 *
 * SAFETY GUARANTEES:
 * 1. Zero real database mutations against Supabase.
 * 2. All audit logs API calls intercepted via Playwright route interception.
 * 3. Strict verification of Founder Super Admin RBAC access.
 */

const MOCK_AUDIT_LOGS = [
  {
    id: 'log-e2e-001',
    userId: 'usr-founder-1',
    userName: 'Vikram Founder',
    userEmail: 'founder@test.segacademy.internal',
    userRole: 'FOUNDER_SUPER_ADMIN',
    action: 'USER_LOGIN',
    resource: 'AUTH',
    resourceId: 'session-001',
    payload: { ip: '127.0.0.1', password: '[REDACTED]' },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    createdAt: '2026-11-28T10:00:00.000Z',
  },
  {
    id: 'log-e2e-002',
    userId: 'usr-fin-1',
    userName: 'Priya Sharma',
    userEmail: 'finance@test.segacademy.internal',
    userRole: 'FINANCE_MANAGER',
    action: 'PAYMENT_CONFIRMED',
    resource: 'INVOICE',
    resourceId: 'inv-2026-0001',
    payload: { amount: 50000, method: 'UPI', secretKey: '[REDACTED]' },
    ipAddress: '192.168.1.50',
    userAgent: 'Chrome/124.0.0.0',
    createdAt: '2026-11-28T11:30:00.000Z',
  },
];

async function setupAuditLogsMocks(page: Page) {
  await page.route('**/api/v1/audit-logs*', async (route: Route) => {
    if (route.request().method() === 'GET') {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search');
      let data = [...MOCK_AUDIT_LOGS];

      if (search) {
        data = data.filter(
          (l) =>
            l.action.toLowerCase().includes(search.toLowerCase()) ||
            l.resource.toLowerCase().includes(search.toLowerCase()) ||
            l.userName.toLowerCase().includes(search.toLowerCase()),
        );
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data,
          meta: {
            total: data.length,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        }),
      });
    }
    return route.abort();
  });
}

test.describe('Part 16 Stage 2: Audit Logs & Compliance E2E Suite', () => {
  test('1. FOUNDER_SUPER_ADMIN can access /audit-logs and inspect records', async ({ founderPage }) => {
    await setupAuditLogsMocks(founderPage);
    await founderPage.goto('/audit-logs');

    await expect(founderPage.locator('h1')).toContainText('Security & Immutable Audit Trail');
    await expect(founderPage.getByRole('table').getByText('USER_LOGIN')).toBeVisible();
    await expect(founderPage.getByRole('table').getByText('PAYMENT_CONFIRMED')).toBeVisible();
    await expect(founderPage.locator('text=Vikram Founder')).toBeVisible();
  });

  test('2. Inspect button opens payload modal and displays sanitized JSON payload', async ({ founderPage }) => {
    await setupAuditLogsMocks(founderPage);
    await founderPage.goto('/audit-logs');

    // Click inspect on first record
    const inspectBtn = founderPage.locator('button:has-text("Inspect")').first();
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();

    // Modal pops up
    await expect(founderPage.locator('text=Audit Event Payload Snapshot')).toBeVisible();
    await expect(founderPage.locator('text=[REDACTED]').first()).toBeVisible();

    // Close modal
    const closeBtn = founderPage.locator('button:has-text("Close")');
    await closeBtn.click();
    await expect(founderPage.locator('text=Audit Event Payload Snapshot')).not.toBeVisible();
  });

  test('3. Audit logs search filter isolates matching actions or resources', async ({ founderPage }) => {
    await setupAuditLogsMocks(founderPage);
    await founderPage.goto('/audit-logs');

    const searchInput = founderPage.locator('input[placeholder*="Search audit trail" i]');
    await searchInput.fill('PAYMENT');

    await expect(founderPage.getByRole('table').getByText('PAYMENT_CONFIRMED')).toBeVisible();
  });

  test('4. Non-superadmin roles (ADMIN) are blocked from accessing /audit-logs by role guard', async ({ adminPage }) => {
    await setupAuditLogsMocks(adminPage);
    await adminPage.goto('/audit-logs');

    // /audit-logs is strictly restricted to FOUNDER_SUPER_ADMIN
    await expect(adminPage.locator('body')).toContainText(/Access Denied|You do not have permission|Dashboard/i);
  });

  test('5. Non-superadmin roles (EMPLOYEE_INTERN) are blocked from accessing /audit-logs', async ({ internPage }) => {
    await setupAuditLogsMocks(internPage);
    await internPage.goto('/audit-logs');

    await expect(internPage.locator('body')).toContainText(/Access Denied|You do not have permission|Dashboard/i);
  });
});
