import { test as base, Page } from '@playwright/test';
import { TEST_PERSONAS, RoleCode, TestPersona } from '../personas';

const USER_STORAGE_KEY = 'seg_crm_user_profile';
const ACCESS_TOKEN_KEY = 'seg_crm_access_token';
const REFRESH_TOKEN_KEY = 'seg_crm_refresh_token';

/**
 * Injects a synthetic authenticated session directly into the browser context.
 * This sets up `sessionStorage` and `localStorage` matching `TokenStorage` and `AuthProvider`.
 */
export async function authenticateAsPersona(page: Page, persona: TestPersona): Promise<void> {
  // 1. Mock the auth/refresh endpoint to prevent synthetic token rejection triggering seg:auth:expired
  await page.route('**/api/v1/auth/refresh*', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: persona.tokens,
      }),
    });
  });

  // 2. Set up initial script to populate storage before page scripts execute
  await page.addInitScript(
    ({ userKey, accessKey, refreshKey, user, tokens }) => {
      window.sessionStorage.setItem(accessKey, tokens.accessToken);
      window.localStorage.setItem(refreshKey, tokens.refreshToken);
      window.localStorage.setItem(userKey, JSON.stringify(user));
    },
    {
      userKey: USER_STORAGE_KEY,
      accessKey: ACCESS_TOKEN_KEY,
      refreshKey: REFRESH_TOKEN_KEY,
      user: persona.user,
      tokens: persona.tokens,
    },
  );
}

/**
 * Clears all authenticated browser state.
 */
export async function clearAuthentication(page: Page): Promise<void> {
  await page.evaluate(
    ({ userKey, accessKey, refreshKey }) => {
      window.sessionStorage.removeItem(accessKey);
      window.localStorage.removeItem(refreshKey);
      window.localStorage.removeItem(userKey);
    },
    {
      userKey: USER_STORAGE_KEY,
      accessKey: ACCESS_TOKEN_KEY,
      refreshKey: REFRESH_TOKEN_KEY,
    },
  );
}

// Custom Playwright test fixture providing pre-configured persona pages
type AuthFixtures = {
  founderPage: Page;
  adminPage: Page;
  financePage: Page;
  teamLeaderPage: Page;
  trainerPage: Page;
  internPage: Page;
  loginAs: (role: RoleCode) => Promise<Page>;
};

export const test = base.extend<AuthFixtures>({
  founderPage: async ({ page }, use) => {
    await authenticateAsPersona(page, TEST_PERSONAS.FOUNDER_SUPER_ADMIN);
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    await authenticateAsPersona(page, TEST_PERSONAS.ADMIN);
    await use(page);
  },

  financePage: async ({ page }, use) => {
    await authenticateAsPersona(page, TEST_PERSONAS.FINANCE_MANAGER);
    await use(page);
  },

  teamLeaderPage: async ({ page }, use) => {
    await authenticateAsPersona(page, TEST_PERSONAS.TEAM_LEADER);
    await use(page);
  },

  trainerPage: async ({ page }, use) => {
    await authenticateAsPersona(page, TEST_PERSONAS.TRAINER_FACULTY);
    await use(page);
  },

  internPage: async ({ page }, use) => {
    await authenticateAsPersona(page, TEST_PERSONAS.EMPLOYEE_INTERN);
    await use(page);
  },

  loginAs: async ({ page }, use) => {
    await use(async (role: RoleCode) => {
      await authenticateAsPersona(page, TEST_PERSONAS[role]);
      return page;
    });
  },
});

export { expect } from '@playwright/test';
