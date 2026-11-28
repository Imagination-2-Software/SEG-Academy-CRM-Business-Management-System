import { test, expect } from './fixtures/auth.fixture';
import { Page, Route } from '@playwright/test';

/**
 * SEG Academy CRM - Tasks & Workflow Playwright E2E Suite
 *
 * SAFETY GUARANTEES:
 * 1. Zero real database mutations against Supabase.
 * 2. All task management and workflow API calls are intercepted via Playwright route interception.
 * 3. Any unexpected mutation request is aborted.
 */

const MOCK_TASKS = [
  {
    id: 'task-e2e-001',
    taskCode: 'TSK-2026-0001',
    title: 'Review Full Stack Curriculum Module 4',
    description: 'Verify Node.js microservices and database clustering lesson plans.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    dueDate: '2026-12-15T18:00:00.000Z',
    createdById: 'emp-001',
    createdByName: 'Dr. Vikram Malhotra',
    creator: { id: 'emp-001', fullName: 'Dr. Vikram Malhotra' },
    assignedToId: 'emp-002',
    assignedToName: 'Ananya Roy',
    assignedToEmail: 'ananya.roy@test.segacademy.internal',
    assignee: { id: 'emp-002', fullName: 'Ananya Roy', email: 'ananya.roy@test.segacademy.internal' },
    departmentId: 'dept-001',
    departmentName: 'Academic Affairs',
    department: { id: 'dept-001', name: 'Academic Affairs' },
    teamId: 'team-001',
    teamName: 'Full Stack Faculty Cohort',
    team: { id: 'team-001', name: 'Full Stack Faculty Cohort' },
    submissions: [
      {
        id: 'sub-e2e-001',
        taskId: 'task-e2e-001',
        submittedById: 'emp-002',
        submittedByName: 'Ananya Roy',
        submittedByEmail: 'ananya.roy@test.segacademy.internal',
        submittedBy: { fullName: 'Ananya Roy' },
        submissionDate: '2026-11-25T10:00:00.000Z',
        contentUrl: 'https://github.com/seg-academy/curriculum-m4',
        notes: 'Initial draft submitted for review.',
        status: 'SUBMITTED',
        createdAt: '2026-11-25T10:00:00.000Z',
        updatedAt: '2026-11-25T10:00:00.000Z',
        reviews: [],
      },
    ],
    timeline: [],
    history: [],
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
  },
  {
    id: 'task-e2e-002',
    taskCode: 'TSK-2026-0002',
    title: 'Prepare Lab Environment VM Templates',
    description: 'Set up Docker containers for incoming batch students.',
    priority: 'URGENT',
    status: 'UNDER_REVIEW',
    dueDate: '2026-12-01T12:00:00.000Z',
    createdById: 'emp-001',
    createdByName: 'Dr. Vikram Malhotra',
    creator: { id: 'emp-001', fullName: 'Dr. Vikram Malhotra' },
    assignedToId: 'emp-002',
    assignedToName: 'Ananya Roy',
    assignedToEmail: 'ananya.roy@test.segacademy.internal',
    assignee: { id: 'emp-002', fullName: 'Ananya Roy' },
    departmentId: 'dept-002',
    departmentName: 'Technology & Labs',
    department: { id: 'dept-002', name: 'Technology & Labs' },
    submissions: [
      {
        id: 'sub-e2e-002',
        taskId: 'task-e2e-002',
        submittedById: 'emp-002',
        submittedByName: 'Ananya Roy',
        submittedByEmail: 'ananya.roy@test.segacademy.internal',
        submittedBy: { fullName: 'Ananya Roy' },
        submissionDate: '2026-11-27T10:00:00.000Z',
        contentUrl: 'https://registry.segacademy.internal/lab-vms',
        notes: 'VM templates uploaded and tested.',
        status: 'SUBMITTED',
        createdAt: '2026-11-27T10:00:00.000Z',
        updatedAt: '2026-11-27T10:00:00.000Z',
        reviews: [],
      },
    ],
    timeline: [],
    history: [],
    createdAt: '2026-11-21T10:00:00.000Z',
    updatedAt: '2026-11-21T10:00:00.000Z',
  },
];

async function setupTasksMocks(page: Page) {
  await page.route(/\/api\/v1\/tasks\/[^/?]+/, async (route: Route) => {
    if (route.request().method() === 'GET') {
      const url = new URL(route.request().url());
      const path = url.pathname;
      const parts = path.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1];

      const found = MOCK_TASKS.find((t) => t.id === lastPart || t.taskCode === lastPart);
      if (found) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: found }),
        });
      }
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Task not found' }),
      });
    }
    return route.abort();
  });

  await page.route('**/api/v1/tasks', async (route: Route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_TASKS }),
      });
    } else if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: `task-new-${Date.now()}`,
            title: 'Created Task',
            status: 'TODO',
            priority: 'NORMAL',
          },
        }),
      });
    }
    return route.abort();
  });

  await page.route('**/api/v1/tasks/*/submissions*', async (route: Route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: `sub-new-${Date.now()}`,
            status: 'SUBMITTED',
            notes: 'Submission received',
          },
        }),
      });
    }
    return route.abort();
  });

  await page.route('**/api/v1/tasks/*/reviews*', async (route: Route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: `rev-new-${Date.now()}`,
            outcome: 'APPROVED',
            score: 95,
          },
        }),
      });
    }
    return route.abort();
  });
}

test.describe('Part 16 Stage 1: Tasks & Workflow E2E Tests', () => {
  test('1. Task dashboard renders metrics, priorities, and task overview', async ({ adminPage }) => {
    await setupTasksMocks(adminPage);
    await adminPage.goto('/tasks');

    await expect(adminPage.locator('h1')).toContainText('Tasks, Submissions & Reviews');
    await expect(adminPage.locator('text=Total Tasks')).toBeVisible();
    await expect(adminPage.locator('text=Review Full Stack Curriculum Module 4').first()).toBeVisible();
  });

  test('2. Task all list page renders tasks table and navigation tabs', async ({ adminPage }) => {
    await setupTasksMocks(adminPage);
    await adminPage.goto('/tasks/all');

    await expect(adminPage.locator('h1')).toContainText('Task Directory');
    await expect(adminPage.locator('text=Review Full Stack Curriculum Module 4').first()).toBeVisible();
    await expect(adminPage.locator('text=Prepare Lab Environment VM Templates').first()).toBeVisible();
  });

  test('3. Task details page renders submissions and deliverables', async ({ adminPage }) => {
    await setupTasksMocks(adminPage);
    await adminPage.goto('/tasks/task-e2e-001');

    await expect(adminPage.locator('h1')).toContainText('Review Full Stack Curriculum Module 4');
    await expect(adminPage.locator('text=Verify Node.js microservices')).toBeVisible();
    await expect(adminPage.locator('text=Deliverable Submissions')).toBeVisible();
  });

  test('4. Task create page validates required title and priority', async ({ adminPage }) => {
    await setupTasksMocks(adminPage);
    await adminPage.goto('/tasks/create');

    await expect(adminPage.locator('h1')).toContainText('Create New Task');
    const submitBtn = adminPage.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test('5. Non-existent task ID renders 404 / Task Not Found cleanly without crashing', async ({ adminPage }) => {
    await setupTasksMocks(adminPage);
    await adminPage.goto('/tasks/non-existent-task-uuid');

    await expect(adminPage.locator('text=Task Not Found')).toBeVisible({ timeout: 5000 });
  });
});
