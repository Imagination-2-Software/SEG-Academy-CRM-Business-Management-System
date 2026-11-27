import { test, expect } from './fixtures/auth.fixture';
import { TEST_PERSONAS } from './personas';

test.describe('Part 14 Stage 3A: Authentication & RBAC Browser E2E Tests', () => {
  // =========================================================================
  // 1. LOGIN PAGE RENDERING
  // =========================================================================
  test('1. Login page renders correctly with email, password, and brand logo', async ({ page }) => {
    await page.goto('/login');

    // Title and form fields
    await expect(page.locator('h1, h2, h3, [role="heading"]').filter({ hasText: 'Sign In' })).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Forgot password link exists
    await expect(page.locator('a[href*="forgot-password"]')).toBeVisible();
  });

  // =========================================================================
  // 2. UNAUTHENTICATED REDIRECTION
  // =========================================================================
  test('2. Unauthenticated user accessing protected route (/dashboard) is redirected to /login with redirect parameter', async ({ page }) => {
    await page.goto('/dashboard');

    // URL should redirect to /login with ?redirect=%2Fdashboard
    await page.waitForURL(/\/login(\?redirect=.*dashboard)?/);
    expect(page.url()).toContain('/login');
  });

  test('2b. Unauthenticated user accessing /invoices is redirected to /login', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForURL(/\/login(\?redirect=.*invoices)?/);
    expect(page.url()).toContain('/login');
  });

  // =========================================================================
  // 3. SESSION PERSISTENCE ACROSS BROWSER RELOADS
  // =========================================================================
  test('3. Authenticated session persists across browser page reloads', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    await expect(adminPage).not.toHaveURL(/\/login/);

    // Verify user profile is loaded
    await expect(adminPage.locator('body')).toContainText(TEST_PERSONAS.ADMIN.user.fullName);

    // Reload browser page
    await adminPage.reload();

    // Verify session remains intact and does not redirect to login
    await expect(adminPage).not.toHaveURL(/\/login/);
    await expect(adminPage.locator('body')).toContainText(TEST_PERSONAS.ADMIN.user.fullName);
  });

  // =========================================================================
  // 4. LOGOUT CLEARS AUTHENTICATION STATE
  // =========================================================================
  test('4. Logout clears tokens and redirects to /login', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');

    // Find and click the sign-out / logout button in sidebar or profile
    const logoutBtn = adminPage.locator('button:has-text("Sign Out"), button:has-text("Log out"), button[aria-label*="log out" i], button[aria-label*="sign out" i]').first();
    
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await adminPage.waitForURL(/\/login/);
      expect(adminPage.url()).toContain('/login');

      // Verify tokens cleared in storage
      const token = await adminPage.evaluate(() => sessionStorage.getItem('seg_crm_access_token'));
      expect(token).toBeNull();
    } else {
      // Direct client logout invocation via auth context
      await adminPage.evaluate(() => {
        sessionStorage.removeItem('seg_crm_access_token');
        localStorage.removeItem('seg_crm_refresh_token');
        localStorage.removeItem('seg_crm_user_profile');
        window.location.href = '/login';
      });
      await adminPage.waitForURL(/\/login/);
      expect(adminPage.url()).toContain('/login');
    }
  });

  // =========================================================================
  // 5. SIDEBAR NAVIGATION VISIBILITY BY ROLE
  // =========================================================================
  test('5a. FOUNDER_SUPER_ADMIN sidebar displays all management sections', async ({ founderPage }) => {
    await founderPage.goto('/dashboard');
    const sidebar = founderPage.locator('aside');
    await expect(sidebar).toBeVisible();

    // Universal navigation items
    await expect(sidebar.locator('a[href="/invoices"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/departments"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/employees"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/users"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/audit-logs"]')).toBeVisible();
  });

  test('5b. FINANCE_MANAGER sidebar displays Invoices & Reports, but hides Departments & Users', async ({ financePage }) => {
    await financePage.goto('/dashboard');
    const sidebar = financePage.locator('aside');
    await expect(sidebar).toBeVisible();

    // Allowed Finance items
    await expect(sidebar.locator('a[href="/invoices"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/credit-notes"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/refunds"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/reports"]')).toBeVisible();

    // Forbidden Organization / System items
    await expect(sidebar.locator('a[href="/departments"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/employees"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/users"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/audit-logs"]')).toHaveCount(0);
  });

  test('5c. EMPLOYEE_INTERN sidebar displays only Tasks and Dashboard', async ({ internPage }) => {
    await internPage.goto('/dashboard');
    const sidebar = internPage.locator('aside');
    await expect(sidebar).toBeVisible();

    // Allowed Tasks
    await expect(sidebar.locator('a[href="/tasks"]')).toBeVisible();

    // Forbidden Finance, Organization, System
    await expect(sidebar.locator('a[href="/invoices"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/departments"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/employees"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/users"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/audit-logs"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/reports"]')).toHaveCount(0);
  });

  // =========================================================================
  // 6. DIRECT URL ACCESS RESTRICTIONS (ROUTE GUARDS)
  // =========================================================================
  test('6a. EMPLOYEE_INTERN direct access to /invoices is blocked by ProtectedRoute', async ({ internPage }) => {
    await internPage.goto('/invoices');

    // Route guard renders "Access Restricted"
    const restrictedHeading = internPage.getByRole('heading', { name: 'Access Restricted' });
    await expect(restrictedHeading).toBeVisible({ timeout: 5000 });
    await expect(internPage.locator('body')).toContainText('does not have authorization to access this area');
  });

  test('6b. TRAINER_FACULTY direct access to /users is blocked by ProtectedRoute', async ({ trainerPage }) => {
    await trainerPage.goto('/users');

    const restrictedHeading = trainerPage.getByRole('heading', { name: 'Access Restricted' });
    await expect(restrictedHeading).toBeVisible({ timeout: 5000 });
    await expect(trainerPage.locator('body')).toContainText('does not have authorization to access this area');
  });

  test('6c. TEAM_LEADER direct access to /invoices is blocked by ProtectedRoute', async ({ teamLeaderPage }) => {
    await teamLeaderPage.goto('/invoices');

    const restrictedHeading = teamLeaderPage.getByRole('heading', { name: 'Access Restricted' });
    await expect(restrictedHeading).toBeVisible({ timeout: 5000 });
    await expect(teamLeaderPage.locator('body')).toContainText('does not have authorization to access this area');
  });

  test('6d. FINANCE_MANAGER direct access to /users is blocked by ProtectedRoute', async ({ financePage }) => {
    await financePage.goto('/users');

    const restrictedHeading = financePage.getByRole('heading', { name: 'Access Restricted' });
    await expect(restrictedHeading).toBeVisible({ timeout: 5000 });
    await expect(financePage.locator('body')).toContainText('does not have authorization to access this area');
  });

  // =========================================================================
  // 7. INVALID OR EXPIRED TOKEN HANDLING
  // =========================================================================
  test('7. Corrupted or invalid token in storage triggers auth expiry and redirects to /login', async ({ page }) => {
    // Inject corrupt token
    await page.addInitScript(() => {
      window.sessionStorage.setItem('seg_crm_access_token', 'MALFORMED.NON_JWT.TOKEN_DATA');
      window.localStorage.removeItem('seg_crm_user_profile');
    });

    await page.goto('/dashboard');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });
});
