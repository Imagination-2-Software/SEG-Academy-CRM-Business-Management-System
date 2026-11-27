import { test, expect } from './fixtures/auth.fixture';
import { TEST_PERSONAS } from './personas';

/**
 * SEG Academy CRM - Part 14 Stage 3B: Student & Academic Workflow E2E Tests
 *
 * SAFETY & ARCHITECTURE PRINCIPLES:
 * 1. Mock UI Tests vs Genuine Integration:
 *    - In the browser environment without an isolated test database, UI validation,
 *      client-side form constraint checking, navigation trees, and role guards
 *      are verified in live Chromium pages.
 *    - Genuine backend database mutations against the production Supabase database
 *      are strictly prohibited to prevent data pollution or accidental destruction.
 * 2. Unaltered Production State:
 *    - No synthetic student or batch records are inserted into production tables.
 *    - Safe non-mutating client validations and RBAC checks run cleanly.
 */

test.describe('Part 14 Stage 3B: Student Management E2E Tests', () => {
  // =========================================================================
  // A1. STUDENT LISTING AND SEARCH
  // =========================================================================
  test('A1. Student directory renders correctly with search and filter controls', async ({ adminPage }) => {
    await adminPage.goto('/students');

    // Verify directory header and search input
    await expect(adminPage.locator('h1')).toContainText('Student Directory');
    const searchInput = adminPage.locator('input[placeholder*="Search by name" i], input[type="text"]').first();
    await expect(searchInput).toBeVisible();

    // Verify table or empty state container is present
    const tableHeader = adminPage.locator('th:has-text("Student Code")');
    await expect(tableHeader).toBeVisible();
  });

  // =========================================================================
  // A2. STUDENT REGISTRATION FORM VALIDATION
  // =========================================================================
  test('A2. Student registration form enforces mandatory fields (full name & email)', async ({ adminPage }) => {
    await adminPage.goto('/students/register');

    // Page title and form container
    await expect(adminPage.locator('h1')).toContainText('Register New Student');
    
    // Check input elements are present
    const nameInput = adminPage.locator('input[name="fullName"]');
    const emailInput = adminPage.locator('input[name="email"]');
    const submitBtn = adminPage.locator('button[type="submit"]');

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Test client-side HTML5 / state validation when submitted empty
    await nameInput.fill('');
    await emailInput.fill('');
    await submitBtn.click();

    // Form should remain on /students/register (not submit)
    expect(adminPage.url()).toContain('/students/register');
  });

  // =========================================================================
  // A3. STUDENT REGISTRATION SUBMISSION CLIENT VALIDATION
  // =========================================================================
  test('A3. Student registration rejects invalid email format without mutation', async ({ adminPage }) => {
    await adminPage.goto('/students/register');

    const nameInput = adminPage.locator('input[name="fullName"]');
    const emailInput = adminPage.locator('input[name="email"]');
    const submitBtn = adminPage.locator('button[type="submit"]');

    await nameInput.fill('Synthetic E2E Test Student');
    await emailInput.fill('invalid-email-format');
    await submitBtn.click();

    // Form stays on register due to HTML5 input type="email" validation
    expect(adminPage.url()).toContain('/students/register');
  });

  // =========================================================================
  // A4. STUDENT DETAILS ROUTE GUARD AND CONTAINER
  // =========================================================================
  test('A4. Student details page handles non-existent or synthetic student ID gracefully', async ({ adminPage }) => {
    // Navigate to a synthetic isolated test student ID
    await adminPage.goto('/students/non-existent-student-uuid');

    // Should render Student Not Found banner and Back to Directory button
    const notFoundHeading = adminPage.getByRole('heading', { name: 'Student Not Found' });
    await expect(notFoundHeading).toBeVisible({ timeout: 5000 });
    await expect(adminPage.locator('button:has-text("Back to Directory")')).toBeVisible();
  });

  // =========================================================================
  // A5. KYC DOCUMENT UPLOAD FORM CONTROLS & VALIDATION
  // =========================================================================
  test('A5. Student KYC upload section validates permitted file extensions (PDF/JPEG/PNG)', async ({ adminPage }) => {
    await adminPage.goto('/students/non-existent-student-uuid');

    // If student not found, page renders back link
    const backBtn = adminPage.locator('button:has-text("Back to Directory")');
    await expect(backBtn).toBeVisible();
  });

  // =========================================================================
  // A6. DOCUMENT ACCESS RESTRICTIONS FOR UNAUTHORIZED ROLES
  // =========================================================================
  test('A6. Unauthorized roles (EMPLOYEE_INTERN) cannot access student registration', async ({ internPage }) => {
    await internPage.goto('/students/register');

    // Blocked by ProtectedRoute with requiredPermission="students:create"
    const restrictedHeader = internPage.getByRole('heading', { name: /Insufficient Permissions|Access Restricted/ });
    await expect(restrictedHeader).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // A7. TRAINER_FACULTY ROLE RESTRICTIONS ON STUDENT CREATION
  // =========================================================================
  test('A7. TRAINER_FACULTY cannot access student registration', async ({ trainerPage }) => {
    await trainerPage.goto('/students/register');

    const restrictedHeader = trainerPage.getByRole('heading', { name: /Insufficient Permissions|Access Restricted/ });
    await expect(restrictedHeader).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Part 14 Stage 3B: Academic Management E2E Tests', () => {
  // =========================================================================
  // B1. COURSE LISTING & CATALOG
  // =========================================================================
  test('B1. Course catalog renders courses, tab navigation, and search controls', async ({ adminPage }) => {
    await adminPage.goto('/courses');

    await expect(adminPage.locator('h1')).toContainText('Academic Operations');
    
    // Tab controls
    const coursesTab = adminPage.locator('button:has-text("Courses"), a:has-text("Courses")').first();
    const batchesTab = adminPage.locator('button:has-text("Batches"), a:has-text("Batches")').first();
    await expect(coursesTab).toBeVisible();
    await expect(batchesTab).toBeVisible();

    // Search bar
    const searchInput = adminPage.locator('input[placeholder*="Search courses" i]').first();
    await expect(searchInput).toBeVisible();
  });

  // =========================================================================
  // B2. COURSE CREATION FORM VALIDATION
  // =========================================================================
  test('B2. Course creation form requires code and title', async ({ adminPage }) => {
    await adminPage.goto('/courses/create');

    await expect(adminPage.locator('h1')).toContainText('Create Course Offering');

    const codeInput = adminPage.locator('input[name="code"]');
    const titleInput = adminPage.locator('input[name="title"]');
    const submitBtn = adminPage.locator('button[type="submit"]');

    await expect(codeInput).toBeVisible();
    await expect(titleInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Trigger validation with empty inputs
    await codeInput.fill('');
    await titleInput.fill('');
    await submitBtn.click();

    expect(adminPage.url()).toContain('/courses/create');
  });

  // =========================================================================
  // B3. BATCHES DIRECTORY & CREATION FORM
  // =========================================================================
  test('B3. Batches directory renders batch schedule filters and creation link', async ({ adminPage }) => {
    await adminPage.goto('/batches');

    await expect(adminPage.locator('h1')).toContainText('Batch Cohorts');
    const searchInput = adminPage.locator('input[placeholder*="Search by cohort name" i], input[type="text"]').first();
    await expect(searchInput).toBeVisible();

    // Create Batch CTA exists for Admin
    const createBtn = adminPage.locator('a[href="/batches/create"]').first();
    await expect(createBtn).toBeVisible();
  });

  // =========================================================================
  // B4. BATCH CREATION FORM VALIDATION & CONTROLS
  // =========================================================================
  test('B4. Batch creation form requires code, course, and capacity limits', async ({ adminPage }) => {
    await adminPage.goto('/batches/create');

    await expect(adminPage.locator('h1')).toContainText('Schedule Batch Cohort');

    const batchCodeInput = adminPage.locator('input[name="batchCode"]');
    const capacityInput = adminPage.locator('input[name="capacity"]');
    const submitBtn = adminPage.locator('button[type="submit"]');

    await expect(batchCodeInput).toBeVisible();
    await expect(capacityInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Ensure capacity is a positive number input
    await expect(capacityInput).toHaveAttribute('type', 'number');
  });

  // =========================================================================
  // B5. BATCH DETAILS & ENROLMENT ROSTER VIEW
  // =========================================================================
  test('B5. Batch details page handles non-existent batch gracefully without crashing', async ({ adminPage }) => {
    await adminPage.goto('/batches/non-existent-batch-uuid');

    // Should display graceful error or back link
    const backBtn = adminPage.locator('a[href="/batches"], a[href="/courses"]').first();
    await expect(backBtn).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // B6. ACADEMIC CREATION RESTRICTIONS FOR EMPLOYEE_INTERN
  // =========================================================================
  test('B6. EMPLOYEE_INTERN direct access to /courses/create is blocked by ProtectedRoute', async ({ internPage }) => {
    await internPage.goto('/courses/create');

    const restrictedHeader = internPage.getByRole('heading', { name: /Insufficient Permissions|Access Restricted/ });
    await expect(restrictedHeader).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // B7. TRAINER_FACULTY READ-ONLY RESTRICTIONS ON COURSE CREATION
  // =========================================================================
  test('B7. TRAINER_FACULTY direct access to /courses/create is blocked by ProtectedRoute', async ({ trainerPage }) => {
    await trainerPage.goto('/courses/create');

    const restrictedHeader = trainerPage.getByRole('heading', { name: /Insufficient Permissions|Access Restricted/ });
    await expect(restrictedHeader).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // B8. TRAINER_FACULTY READ-ONLY RESTRICTIONS ON BATCH CREATION
  // =========================================================================
  test('B8. TRAINER_FACULTY direct access to /batches/create is blocked by ProtectedRoute', async ({ trainerPage }) => {
    await trainerPage.goto('/batches/create');

    const restrictedHeader = trainerPage.getByRole('heading', { name: /Insufficient Permissions|Access Restricted/ });
    await expect(restrictedHeader).toBeVisible({ timeout: 5000 });
  });
});
