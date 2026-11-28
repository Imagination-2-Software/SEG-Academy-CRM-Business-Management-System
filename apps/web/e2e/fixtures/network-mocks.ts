import { Page, Route } from '@playwright/test';
import { MOCK_STUDENT, MOCK_DASHBOARD_STUDENTS, MOCK_DOCUMENTS } from './mock-data/students.mock';
import {
  MOCK_INVOICES,
  MOCK_PAYMENTS,
  MOCK_CREDIT_NOTES,
  MOCK_DEBIT_NOTES,
  MOCK_REFUNDS,
} from './mock-data/billing.mock';
import { MOCK_DEPARTMENTS, MOCK_TEAMS, MOCK_EMPLOYEES } from './mock-data/org.mock';

export interface SetupNetworkMocksOptions {
  mockDashboard?: boolean;
  mockBilling?: boolean;
  mockStudents?: boolean;
  mockOrg?: boolean;
  mockNotifications?: boolean;
  mockReports?: boolean;
  mockTasks?: boolean;
  mockAuditLogs?: boolean;
}

/**
 * Universal Mock Route Interceptor for Playwright E2E Tests.
 * Ensures zero mutations hit production Supabase.
 */
export async function setupCommonNetworkMocks(page: Page, options: SetupNetworkMocksOptions = {}) {
  const {
    mockDashboard = true,
    mockBilling = true,
    mockStudents = true,
    mockOrg = true,
    mockNotifications = true,
    mockReports = true,
    mockTasks = true,
    mockAuditLogs = true,
  } = options;

  // 1. Dashboard Overview
  if (mockDashboard) {
    await page.route('**/api/v1/dashboard/overview*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            activeEnrolments: 42,
            activeBatches: 2,
            reconciledRevenue: 50000,
            totalEmployees: 2,
            pendingInvoices: 1,
            upcomingCohorts: 1,
            pendingKyc: 3,
            capacityAvg: 75,
          },
        }),
      });
    });
  }

  // 2. Billing & Financial Routes
  if (mockBilling) {
    await page.route('**/api/v1/invoices*', async (route: Route) => {
      if (route.request().method() === 'GET') {
        const url = new URL(route.request().url());
        const pathname = url.pathname;
        const idMatch = pathname.match(/\/api\/v1\/invoices\/([^/?]+)/);

        if (idMatch && idMatch[1] && !pathname.endsWith('/invoices')) {
          const invId = idMatch[1];
          const invoice = MOCK_INVOICES.find((i) => i.id === invId || i.invoiceNumber === invId);
          if (invoice) {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ success: true, data: invoice }),
            });
          }
          return route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Invoice not found' }),
          });
        }

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_INVOICES }),
        });
      } else if (route.request().method() === 'POST') {
        const payload = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: `inv-mock-new-${Date.now()}`,
              invoiceNumber: 'INV-2026-9999',
              totalAmount: payload.totalAmount || 64900,
              status: 'ISSUED',
              student: MOCK_STUDENT,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      }
      return route.abort();
    });

    await page.route('**/api/v1/payments*', async (route: Route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_PAYMENTS }),
        });
      } else if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: `pay-new-${Date.now()}`, status: 'CONFIRMED' },
          }),
        });
      }
      return route.abort();
    });

    await page.route('**/api/v1/credit-notes*', async (route: Route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_CREDIT_NOTES }),
        });
      }
      return route.abort();
    });

    await page.route('**/api/v1/debit-notes*', async (route: Route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_DEBIT_NOTES }),
        });
      }
      return route.abort();
    });

    await page.route('**/api/v1/refunds*', async (route: Route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_REFUNDS }),
        });
      }
      return route.abort();
    });
  }

  // 3. Students & Documents Routes
  if (mockStudents) {
    await page.route('**/api/v1/students*', async (route: Route) => {
      if (route.request().method() === 'GET') {
        const url = new URL(route.request().url());
        if (url.searchParams.get('limit') === '1') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                data: MOCK_DASHBOARD_STUDENTS.data,
                pagination: MOCK_DASHBOARD_STUDENTS.pagination,
              },
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [MOCK_STUDENT] }),
        });
      }
      return route.abort();
    });

    await page.route('**/api/v1/students/documents*', async (route: Route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_DOCUMENTS }),
        });
      }
      return route.abort();
    });
  }

  // 4. Organization Routes
  if (mockOrg) {
    await page.route('**/api/v1/departments*', async (route: Route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_DEPARTMENTS }),
        });
      }
      return route.abort();
    });

    await page.route('**/api/v1/teams*', async (route: Route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_TEAMS }),
        });
      }
      return route.abort();
    });

    await page.route('**/api/v1/employees*', async (route: Route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_EMPLOYEES }),
        });
      }
      return route.abort();
    });
  }
}
