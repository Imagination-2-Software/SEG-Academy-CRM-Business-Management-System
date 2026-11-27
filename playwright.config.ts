import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for SEG Academy CRM Monorepo.
 *
 * Verified Architecture:
 * - Frontend Next.js Web: http://localhost:3000
 * - Backend NestJS API:   http://localhost:4000/api/v1
 * - Test Discovery:       apps/web/e2e/
 */
export default defineConfig({
  testDir: './apps/web/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false, // Sequential execution to prevent multi-role database state contention
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Single worker avoids database collision
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  outputDir: 'test-results',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10 * 1000,
    navigationTimeout: 15 * 1000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Optional: Auto-start local dev/prod servers if not already running
  // Uncomment and configure webServer when running fully self-contained CI:
  // webServer: [
  //   {
  //     command: 'npm --prefix apps/api run start',
  //     port: 4000,
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120 * 1000,
  //   },
  //   {
  //     command: 'npm --prefix apps/web run start',
  //     port: 3000,
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120 * 1000,
  //   },
  // ],
});
