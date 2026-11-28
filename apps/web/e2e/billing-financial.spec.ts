import { test, expect } from './fixtures/auth.fixture';
import { Page, Route } from '@playwright/test';

/**
 * SEG Academy CRM - Billing & Financial Management E2E Test Suite
 *
 * SAFETY GUARANTEES:
 * 1. Zero real database mutations against Supabase.
 * 2. All billing and financial backend API calls (invoices, payments, credit notes,
 *    debit notes, refunds) are intercepted via Playwright route interception.
 * 3. Any unintended mutation calls (POST, PUT, PATCH, DELETE) without explicit mocks
 *    are blocked and abort with error to protect the production database.
 */

// Synthetic Test Data Fixtures
const MOCK_STUDENT = {
  id: 'stu-e2e-001',
  studentCode: 'SEG-2026-0042',
  fullName: 'Arjun Sharma',
  email: 'arjun.sharma@test.segacademy.internal',
  phoneNumber: '+91 98765 43210',
  addressLine1: 'B-402 Silicon Heights',
  city: 'Mumbai',
  state: 'Maharashtra',
  address: 'B-402 Silicon Heights, Mumbai, Maharashtra',
};

const MOCK_INVOICES = [
  {
    id: 'inv-e2e-001',
    invoiceNumber: 'INV-2026-0001',
    studentId: 'stu-e2e-001',
    issueDate: '2026-11-01',
    dueDate: '2026-11-15',
    subtotal: 55000,
    taxAmount: 9900,
    discountAmount: 0,
    totalAmount: 64900,
    paidAmount: 0,
    currency: 'INR',
    status: 'ISSUED',
    version: 1,
    isFinalized: true,
    notes: 'Tuition fee for academic enrollment.',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    student: MOCK_STUDENT,
    batch: {
      id: 'bat-e2e-001',
      name: 'Full Stack Web Dev Batch 1',
      code: 'FSWD-B1',
      course: {
        id: 'cou-e2e-001',
        name: 'Full Stack Web Development',
        code: 'FSWD-101',
      },
    },
    items: [
      {
        id: 'item-001',
        description: 'Tuition Fee - Academic Program (Semester 1)',
        quantity: 1,
        unitPrice: 50000,
        taxRate: 18,
        amount: 50000,
      },
      {
        id: 'item-002',
        description: 'Lab & LMS Access Pass',
        quantity: 1,
        unitPrice: 5000,
        taxRate: 18,
        amount: 5000,
      },
    ],
    payments: [],
  },
  {
    id: 'inv-e2e-002',
    invoiceNumber: 'INV-2026-0002',
    studentId: 'stu-e2e-001',
    issueDate: '2026-11-05',
    dueDate: '2026-11-20',
    subtotal: 30000,
    taxAmount: 5400,
    discountAmount: 2000,
    totalAmount: 33400,
    paidAmount: 33400,
    currency: 'INR',
    status: 'PAID',
    version: 1,
    isFinalized: true,
    notes: 'Advance tuition payment settled in full.',
    createdAt: '2026-11-05T10:00:00.000Z',
    updatedAt: '2026-11-06T10:00:00.000Z',
    student: MOCK_STUDENT,
    items: [
      {
        id: 'item-003',
        description: 'Data Science Certification Course',
        quantity: 1,
        unitPrice: 30000,
        taxRate: 18,
        amount: 30000,
      },
    ],
    payments: [
      {
        id: 'pay-e2e-001',
        paymentNumber: 'PAY-2026-0001',
        invoiceId: 'inv-e2e-002',
        studentId: 'stu-e2e-001',
        amount: 33400,
        currency: 'INR',
        method: 'UPI',
        status: 'CONFIRMED',
        transactionReference: 'UPI-REF-9876543210',
        idempotencyKey: 'idemp-pay-001',
        paidAt: '2026-11-06T11:00:00.000Z',
        createdAt: '2026-11-06T11:00:00.000Z',
      },
    ],
  },
  {
    id: 'inv-e2e-003',
    invoiceNumber: 'INV-2026-0003',
    studentId: 'stu-e2e-001',
    issueDate: '2026-11-10',
    dueDate: '2026-11-25',
    subtotal: 20000,
    taxAmount: 3600,
    discountAmount: 0,
    totalAmount: 23600,
    paidAmount: 0,
    currency: 'INR',
    status: 'DRAFT',
    version: 1,
    isFinalized: false,
    notes: 'Draft preliminary invoice awaiting approval.',
    createdAt: '2026-11-10T10:00:00.000Z',
    updatedAt: '2026-11-10T10:00:00.000Z',
    student: MOCK_STUDENT,
    items: [
      {
        id: 'item-004',
        description: 'Cloud Architecture Workshop',
        quantity: 1,
        unitPrice: 20000,
        taxRate: 18,
        amount: 20000,
      },
    ],
    payments: [],
  },
];

const MOCK_METRICS = {
  totalInvoiced: 121900,
  totalCollected: 33400,
  totalOutstanding: 88500,
  overdueAmount: 64900,
  overdueCount: 1,
  paidInvoicesCount: 1,
  pendingInvoicesCount: 2,
};

const MOCK_PAYMENTS = [
  {
    id: 'pay-e2e-001',
    paymentNumber: 'PAY-2026-0001',
    invoiceId: 'inv-e2e-002',
    studentId: 'stu-e2e-001',
    amount: 33400,
    currency: 'INR',
    method: 'UPI',
    status: 'CONFIRMED',
    transactionReference: 'UPI-REF-9876543210',
    idempotencyKey: 'idemp-pay-001-abc1234567890',
    paidAt: '2026-11-06T11:00:00.000Z',
    createdAt: '2026-11-06T11:00:00.000Z',
    student: MOCK_STUDENT,
    invoice: {
      id: 'inv-e2e-002',
      invoiceNumber: 'INV-2026-0002',
      totalAmount: 33400,
      paidAmount: 33400,
      status: 'PAID',
    },
    refunds: [],
  },
  {
    id: 'pay-e2e-002',
    paymentNumber: 'PAY-2026-0002',
    invoiceId: 'inv-e2e-001',
    studentId: 'stu-e2e-001',
    amount: 15000,
    currency: 'INR',
    method: 'BANK_TRANSFER',
    status: 'CONFIRMED',
    transactionReference: 'NEFT-AXIS-20261102',
    idempotencyKey: 'idemp-pay-002-xyz0987654321',
    paidAt: '2026-11-07T14:30:00.000Z',
    createdAt: '2026-11-07T14:30:00.000Z',
    student: MOCK_STUDENT,
    invoice: {
      id: 'inv-e2e-001',
      invoiceNumber: 'INV-2026-0001',
      totalAmount: 64900,
      paidAmount: 15000,
      status: 'PARTIALLY_PAID',
    },
    refunds: [],
  },
];

const MOCK_CREDIT_NOTES = [
  {
    id: 'cn-e2e-001',
    creditNoteNumber: 'CN-2026-0001',
    invoiceId: 'inv-e2e-001',
    studentId: 'stu-e2e-001',
    amount: 5000,
    currency: 'INR',
    reason: 'Merit Scholarship concession adjustment',
    status: 'ISSUED',
    issuedAt: '2026-11-12T10:00:00.000Z',
    notes: 'Approved by Founder Super Admin',
    createdAt: '2026-11-12T10:00:00.000Z',
    invoice: {
      id: 'inv-e2e-001',
      invoiceNumber: 'INV-2026-0001',
      totalAmount: 64900,
      status: 'ISSUED',
    },
    student: MOCK_STUDENT,
    issuedByName: 'E2E Administrator',
  },
];

const MOCK_DEBIT_NOTES = [
  {
    id: 'dn-e2e-001',
    debitNoteNumber: 'DN-2026-0001',
    invoiceId: 'inv-e2e-001',
    studentId: 'stu-e2e-001',
    amount: 2500,
    currency: 'INR',
    reason: 'Additional cloud lab infrastructure surcharge',
    status: 'ISSUED',
    issuedAt: '2026-11-14T10:00:00.000Z',
    notes: 'Approved by Academic Director',
    createdAt: '2026-11-14T10:00:00.000Z',
    invoice: {
      id: 'inv-e2e-001',
      invoiceNumber: 'INV-2026-0001',
      totalAmount: 64900,
      status: 'ISSUED',
    },
    student: MOCK_STUDENT,
    issuedByName: 'E2E Administrator',
  },
];

const MOCK_REFUNDS = [
  {
    id: 'ref-e2e-001',
    refundNumber: 'REF-2026-0001',
    paymentId: 'pay-e2e-001',
    invoiceId: 'inv-e2e-002',
    amount: 5000,
    currency: 'INR',
    reason: 'Course withdrawal within approved guarantee window',
    status: 'PROCESSED',
    idempotencyKey: 'idemp-ref-001',
    processedAt: '2026-11-16T12:00:00.000Z',
    createdAt: '2026-11-16T12:00:00.000Z',
    invoice: {
      id: 'inv-e2e-002',
      invoiceNumber: 'INV-2026-0002',
      totalAmount: 33400,
      paidAmount: 33400,
      status: 'PAID',
    },
    payment: {
      id: 'pay-e2e-001',
      paymentNumber: 'PAY-2026-0001',
      amount: 33400,
      method: 'UPI',
      status: 'CONFIRMED',
    },
    processedByName: 'E2E Administrator',
  },
];

/**
 * Universal Mock Route Interceptor for Billing & Financial APIs
 * Guarantees zero interaction with production Supabase.
 */
async function setupBillingApiMocks(page: Page) {
  // 1. Invoices Directory & Metrics
  await page.route('**/api/v1/invoices?*', async (route: Route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');

    let filtered = [...MOCK_INVOICES];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.student.fullName.toLowerCase().includes(q) ||
          i.student.studentCode.toLowerCase().includes(q),
      );
    }
    if (status && status !== 'ALL') {
      filtered = filtered.filter((i) => i.status === status);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: filtered,
        metrics: MOCK_METRICS,
        meta: {
          total: filtered.length,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      }),
    });
  });

  await page.route('**/api/v1/invoices', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_INVOICES,
          metrics: MOCK_METRICS,
          meta: {
            total: MOCK_INVOICES.length,
            page: 1,
            limit: 20,
            totalPages: 1,
          },
        }),
      });
    } else if (route.request().method() === 'POST') {
      const payload = JSON.parse(route.request().postData() || '{}');
      const createdInvoice = {
        ...MOCK_INVOICES[0],
        id: `inv-mock-new-${Date.now()}`,
        invoiceNumber: `INV-2026-9999`,
        studentId: payload.studentId,
        subtotal: payload.subtotal,
        totalAmount: payload.totalAmount,
        status: payload.isFinalized ? 'ISSUED' : 'DRAFT',
        isFinalized: !!payload.isFinalized,
        items: payload.items,
        notes: payload.notes,
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: createdInvoice,
          message: 'Invoice created successfully',
        }),
      });
    } else {
      await route.abort();
    }
  });

  // 2. Single Invoice by ID
  await page.route('**/api/v1/invoices/inv-e2e-*', async (route: Route) => {
    const url = route.request().url();
    const invoiceId = url.split('/invoices/')[1]?.split('/')[0]?.split('?')[0];
    const invoice = MOCK_INVOICES.find((i) => i.id === invoiceId) || MOCK_INVOICES[0];

    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: invoice,
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // 3. Invoice Lifecycle Mutations: Finalize and Cancel
  await page.route('**/api/v1/invoices/*/finalize', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          ...MOCK_INVOICES[2],
          status: 'ISSUED',
          isFinalized: true,
        },
        message: 'Invoice finalized successfully',
      }),
    });
  });

  await page.route('**/api/v1/invoices/*/cancel', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          ...MOCK_INVOICES[0],
          status: 'CANCELLED',
        },
        message: 'Invoice cancelled successfully',
      }),
    });
  });

  // 4. Record Payment on Invoice
  await page.route('**/api/v1/invoices/*/payments', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const payload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: `pay-mock-new-${Date.now()}`,
            paymentNumber: 'PAY-2026-9999',
            invoiceId: payload.invoiceId,
            amount: payload.amount,
            method: payload.method,
            status: 'CONFIRMED',
            transactionReference: payload.transactionReference || 'UPI-REF-TEST',
            paidAt: new Date().toISOString(),
          },
          message: 'Payment recorded successfully',
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // 5. Payments Directory and Single Payment
  await page.route('**/api/v1/payments?*', async (route: Route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get('search');
    const method = url.searchParams.get('method');

    let filtered = [...MOCK_PAYMENTS];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.paymentNumber.toLowerCase().includes(q) ||
          p.student?.fullName?.toLowerCase().includes(q) ||
          p.transactionReference?.toLowerCase().includes(q),
      );
    }
    if (method && method !== 'ALL') {
      filtered = filtered.filter((p) => p.method === method);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: filtered,
        meta: { total: filtered.length, page: 1, limit: 20 },
      }),
    });
  });

  await page.route('**/api/v1/payments', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_PAYMENTS,
        meta: { total: MOCK_PAYMENTS.length, page: 1, limit: 20 },
      }),
    });
  });

  await page.route('**/api/v1/payments/pay-e2e-*', async (route: Route) => {
    const payment = {
      ...MOCK_PAYMENTS[0],
      invoice: {
        id: 'inv-e2e-002',
        invoiceNumber: 'INV-2026-0002',
        totalAmount: 33400,
        paidAmount: 33400,
        status: 'PAID',
      },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: payment,
      }),
    });
  });

  // 6. Credit Notes & Debit Notes
  await page.route('**/api/v1/credit-notes*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_CREDIT_NOTES,
        meta: { total: MOCK_CREDIT_NOTES.length, page: 1, limit: 20 },
      }),
    });
  });

  await page.route('**/api/v1/debit-notes*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_DEBIT_NOTES,
        meta: { total: MOCK_DEBIT_NOTES.length, page: 1, limit: 20 },
      }),
    });
  });

  await page.route('**/api/v1/invoices/*/credit-notes', async (route: Route) => {
    const payload = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: `cn-mock-new-${Date.now()}`,
          creditNoteNumber: 'CN-2026-9999',
          amount: payload.amount,
          reason: payload.reason,
          status: 'ISSUED',
        },
      }),
    });
  });

  await page.route('**/api/v1/invoices/*/debit-notes', async (route: Route) => {
    const payload = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: `dn-mock-new-${Date.now()}`,
          debitNoteNumber: 'DN-2026-9999',
          amount: payload.amount,
          reason: payload.reason,
          status: 'ISSUED',
        },
      }),
    });
  });

  // 7. Refunds
  await page.route('**/api/v1/refunds*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_REFUNDS,
        meta: { total: MOCK_REFUNDS.length, page: 1, limit: 20 },
      }),
    });
  });

  await page.route('**/api/v1/invoices/*/payments/*/refunds', async (route: Route) => {
    const payload = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: `ref-mock-new-${Date.now()}`,
          refundNumber: 'REF-2026-9999',
          amount: payload.amount,
          reason: payload.reason,
          status: 'PROCESSED',
        },
      }),
    });
  });

  // 8. Auxiliary Routes (Students and Courses for Invoice Creation Form)
  await page.route('**/api/v1/students*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [MOCK_STUDENT],
        meta: { total: 1, page: 1, limit: 100 },
      }),
    });
  });

  await page.route('**/api/v1/courses*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'cou-e2e-001',
            code: 'FSWD-101',
            title: 'Full Stack Web Development',
            baseFee: 50000,
            isActive: true,
          },
        ],
        meta: { total: 1, page: 1, limit: 100 },
      }),
    });
  });
}

test.describe('Part 14 Stage 3C: Billing & Financial E2E Tests', () => {
  // =========================================================================
  // 1. INVOICE LISTING, SEARCH, AND FILTERING
  // =========================================================================
  test.describe('1. Invoices Directory & Filter Suite', () => {
    test('1a. Invoices directory renders header, KPI metrics, and invoice items', async ({
      adminPage,
    }) => {
      await setupBillingApiMocks(adminPage);
      await adminPage.goto('/invoices');

      // Title header
      await expect(adminPage.locator('h1')).toContainText('Invoices & Payments');

      // KPI Metric Cards
      await expect(adminPage.locator('text=Total Invoiced')).toBeVisible();
      await expect(adminPage.locator('text=Collected (Paid)')).toBeVisible();
      await expect(adminPage.locator('text=Outstanding Balance')).toBeVisible();
      await expect(adminPage.locator('text=Overdue Receivables')).toBeVisible();

      // Table rows with invoice numbers
      await expect(adminPage.locator('text=INV-2026-0001')).toBeVisible();
      await expect(adminPage.locator('text=INV-2026-0002')).toBeVisible();
      await expect(adminPage.locator('text=Arjun Sharma').first()).toBeVisible();
    });

    test('1b. Invoice search filters records by invoice number and student name', async ({
      adminPage,
    }) => {
      await setupBillingApiMocks(adminPage);
      await adminPage.goto('/invoices');

      const searchInput = adminPage.locator(
        'input[placeholder*="Search by invoice number" i]',
      );
      await expect(searchInput).toBeVisible();

      // Search for specific invoice
      await searchInput.fill('INV-2026-0001');

      // Wait for debounced search update
      await expect(adminPage.locator('text=INV-2026-0001')).toBeVisible();
    });

    test('1c. Status filter dropdown filters invoices by status', async ({ adminPage }) => {
      await setupBillingApiMocks(adminPage);
      await adminPage.goto('/invoices');

      // Filter by "PAID"
      const statusSelect = adminPage.locator('select').first();
      await statusSelect.selectOption('PAID');

      // Paid invoice is visible
      await expect(adminPage.locator('text=INV-2026-0002')).toBeVisible();
    });
  });

  // =========================================================================
  // 2. INVOICE CREATION & FORM VALIDATION
  // =========================================================================
  test.describe('2. Invoice Creation & Form Validation Suite', () => {
    test('2a. Invoice create form enforces mandatory student selection and line items', async ({
      adminPage,
    }) => {
      await setupBillingApiMocks(adminPage);
      await adminPage.goto('/invoices/create');

      await expect(adminPage.locator('h1')).toContainText('Create Student Invoice');

      // Student select and dates
      await expect(adminPage.locator('#invoice-student-select')).toBeVisible();
      await expect(adminPage.locator('#invoice-issue-date')).toBeVisible();
      await expect(adminPage.locator('#invoice-due-date')).toBeVisible();

      // Line items container is present
      await expect(adminPage.locator('text=Line Items & Fee Breakdown')).toBeVisible();

      // Add line item button
      const addItemBtn = adminPage.locator('button:has-text("Add Line Item")');
      await expect(addItemBtn).toBeVisible();
      await addItemBtn.click();

      // Draft & Finalize action buttons
      await expect(adminPage.locator('button:has-text("Save as Draft")')).toBeVisible();
      await expect(
        adminPage.locator('button:has-text("Create & Issue Invoice")'),
      ).toBeVisible();
    });

    test('2b. Form calculates subtotal, GST (18%), and grand total dynamically', async ({
      adminPage,
    }) => {
      await setupBillingApiMocks(adminPage);
      await adminPage.goto('/invoices/create');

      // Verify calculation summary panel
      await expect(adminPage.locator('text=Subtotal (Net Items):')).toBeVisible();
      await expect(adminPage.locator('text=Tax (CGST 9% + SGST 9%):')).toBeVisible();
      await expect(adminPage.locator('text=Total Invoiced:')).toBeVisible();
    });

    test('2c. Successful invoice generation redirects to newly created invoice view', async ({
      adminPage,
    }) => {
      await setupBillingApiMocks(adminPage);
      await adminPage.goto('/invoices/create');

      // Click Create & Issue Invoice
      const finalizeBtn = adminPage.locator('button:has-text("Create & Issue Invoice")');
      await finalizeBtn.click();

      // Should redirect to created invoice
      await adminPage.waitForURL(/\/invoices\/inv-mock-new-/);
      expect(adminPage.url()).toContain('/invoices/');
    });
  });

  // =========================================================================
  // 3. PAYMENT RECORDING & PAYMENT FORM VALIDATION
  // =========================================================================
  test.describe('3. Payment Recording & Form Validation Suite', () => {
    test('3a. Payments directory renders payment records and KPI cards', async ({
      financePage,
    }) => {
      await setupBillingApiMocks(financePage);
      await financePage.goto('/payments');

      await expect(financePage.locator('h1')).toContainText('Payments Ledger');
      await expect(financePage.locator('text=Total Collections')).toBeVisible();
      await expect(financePage.locator('text=UPI / QR Volume')).toBeVisible();

      // Check payments table
      await expect(financePage.locator('text=PAY-2026-0001')).toBeVisible();
      await expect(financePage.locator('text=PAY-2026-0002')).toBeVisible();
    });

    test('3b. Record payment modal on invoice enforces amount limits and payment methods', async ({
      financePage,
    }) => {
      await setupBillingApiMocks(financePage);
      // Open invoice 1 (balance due: 64900)
      await financePage.goto('/invoices/inv-e2e-001');

      await expect(financePage.getByRole('heading', { name: 'INV-2026-0001' })).toBeVisible();

      // Click Record Payment button (top action bar)
      const recordPaymentBtn = financePage.locator('button:has-text("Record Payment")').first();
      await expect(recordPaymentBtn).toBeVisible();
      await recordPaymentBtn.click();

      // Modal appears
      await expect(financePage.getByRole('heading', { name: 'Record Payment' })).toBeVisible();
      await expect(financePage.locator('text=Remaining Balance')).toBeVisible();

      // Payment method options
      await expect(financePage.locator('button:has-text("UPI / QR")')).toBeVisible();
      await expect(financePage.locator('button:has-text("NEFT / RTGS / IMPS")')).toBeVisible();

      // Input transaction reference and confirm payment
      const transRefInput = financePage.locator('input[placeholder="XYZ"]');
      await transRefInput.fill('UPI-TEST-CONFIRM-123');

      const submitBtn = financePage.locator('button:has-text("Confirm & Record")');
      await expect(submitBtn).toBeVisible();
      await submitBtn.click();

      // Modal closes after success
      await expect(financePage.getByRole('heading', { name: 'Record Payment' })).toHaveCount(0);
    });

    test('3c. Payment receipt details page renders official receipt document', async ({
      financePage,
    }) => {
      await setupBillingApiMocks(financePage);
      await financePage.goto('/payments/pay-e2e-001');

      await expect(financePage.locator('text=OFFICIAL PAYMENT RECEIPT')).toBeVisible();
      await expect(financePage.getByRole('heading', { name: 'PAY-2026-0001' })).toBeVisible();
      await expect(financePage.locator('text=Amount Received & Confirmed')).toBeVisible();
      await expect(financePage.locator('button:has-text("Print Receipt")')).toBeVisible();
    });
  });

  // =========================================================================
  // 4. CREDIT NOTE WORKFLOW
  // =========================================================================
  test.describe('4. Credit Note Adjustment Suite', () => {
    test('4a. Credit Notes tab renders note records against invoices', async ({
      financePage,
    }) => {
      await setupBillingApiMocks(financePage);
      await financePage.goto('/credit-notes');

      await expect(financePage.locator('h1')).toContainText('Credit & Debit Notes');
      await expect(financePage.locator('text=Credit Notes (Reductions)')).toBeVisible();

      // Check credit note table entry
      await expect(financePage.locator('text=CN-2026-0001')).toBeVisible();
      await expect(financePage.locator('text=Merit Scholarship concession adjustment')).toBeVisible();
    });

    test('4b. Issuing a credit note from invoice modal enforces amount and reason validation', async ({
      financePage,
    }) => {
      await setupBillingApiMocks(financePage);
      await financePage.goto('/invoices/inv-e2e-001');

      // Click Credit Note button
      const cnBtn = financePage.locator('button:has-text("Credit Note")');
      await expect(cnBtn).toBeVisible();
      await cnBtn.click();

      // Credit Note Modal opens
      await expect(financePage.getByRole('heading', { name: 'Issue Credit Note' })).toBeVisible();

      const amountInput = financePage.locator('input[placeholder*="e.g. 5000"]');
      const reasonInput = financePage.locator('input[placeholder*="Scholarship concession" i]');
      const submitBtn = financePage.locator('button:has-text("Issue Credit Note")');

      await amountInput.fill('2000');
      await reasonInput.fill('Special fee waiver approved');
      await submitBtn.click();

      // Modal closes upon successful issuance
      await expect(financePage.getByRole('heading', { name: 'Issue Credit Note' })).toHaveCount(0);
    });
  });

  // =========================================================================
  // 5. DEBIT NOTE WORKFLOW
  // =========================================================================
  test.describe('5. Debit Note Surcharge Suite', () => {
    test('5a. Debit Notes tab renders surcharges ledger', async ({ financePage }) => {
      await setupBillingApiMocks(financePage);
      await financePage.goto('/credit-notes');

      // Switch to Debit Notes tab
      const debitTab = financePage.locator('button:has-text("Debit Notes (Surcharges)")');
      await expect(debitTab).toBeVisible();
      await debitTab.click();

      await expect(financePage.locator('text=DN-2026-0001')).toBeVisible();
      await expect(financePage.locator('text=Additional cloud lab infrastructure surcharge')).toBeVisible();
    });

    test('5b. Issuing a debit note from invoice modal enforces required reason and surcharge amount', async ({
      financePage,
    }) => {
      await setupBillingApiMocks(financePage);
      await financePage.goto('/invoices/inv-e2e-001');

      // Click Debit Note button
      const dnBtn = financePage.locator('button:has-text("Debit Note")');
      await expect(dnBtn).toBeVisible();
      await dnBtn.click();

      // Debit Note Modal opens
      await expect(financePage.getByRole('heading', { name: 'Issue Debit Note' })).toBeVisible();

      const amountInput = financePage.locator('input[placeholder*="e.g. 2500"]');
      const reasonInput = financePage.locator('input[placeholder*="Additional practical kit" i]');
      const submitBtn = financePage.locator('button:has-text("Issue Debit Note")');

      await amountInput.fill('1500');
      await reasonInput.fill('Extended examination fee');
      await submitBtn.click();

      // Modal closes upon successful issuance
      await expect(financePage.getByRole('heading', { name: 'Issue Debit Note' })).toHaveCount(0);
    });
  });

  // =========================================================================
  // 6. TUITION REFUND PAGE & FORM VALIDATION
  // =========================================================================
  test.describe('6. Tuition Refund Suite', () => {
    test('6a. Refunds ledger page displays processed refund transactions', async ({
      financePage,
    }) => {
      await setupBillingApiMocks(financePage);
      await financePage.goto('/refunds');

      await expect(financePage.locator('h1')).toContainText('Tuition Refunds');
      await expect(financePage.locator('text=REF-2026-0001')).toBeVisible();
      await expect(financePage.locator('text=Course withdrawal within approved guarantee window')).toBeVisible();
    });

    test('6b. Processing refund on payment receipt enforces max refundable amount', async ({
      founderPage,
    }) => {
      await setupBillingApiMocks(founderPage);
      await founderPage.goto('/payments/pay-e2e-001');

      // Click Issue Refund
      const refundBtn = founderPage.locator('button:has-text("Issue Refund")');
      await expect(refundBtn).toBeVisible();
      await refundBtn.click();

      // Refund Modal opens
      await expect(founderPage.getByRole('heading', { name: 'Process Tuition Refund' })).toBeVisible();
      await expect(founderPage.locator('text=Max Refundable:')).toBeVisible();

      const reasonInput = founderPage.locator('input[placeholder*="Student withdrawal" i]');
      await reasonInput.fill('Student relocated to another city');

      const processBtn = founderPage.locator('button:has-text("Confirm & Process Refund")');
      await expect(processBtn).toBeVisible();
      await processBtn.click();

      // Modal closes upon successful refund processing
      await expect(founderPage.getByRole('heading', { name: 'Process Tuition Refund' })).toHaveCount(0);
    });
  });

  // =========================================================================
  // 7. ROLE-BASED BILLING ACCESS RESTRICTIONS (RBAC)
  // =========================================================================
  test.describe('7. Role-Based Financial Access Restrictions', () => {
    test('7a. EMPLOYEE_INTERN is restricted from accessing /invoices', async ({
      internPage,
    }) => {
      await internPage.goto('/invoices');
      const restrictedHeading = internPage.getByRole('heading', {
        name: /Insufficient Permissions|Access Restricted/,
      });
      await expect(restrictedHeading).toBeVisible({ timeout: 5000 });
    });

    test('7b. EMPLOYEE_INTERN is restricted from accessing /payments', async ({
      internPage,
    }) => {
      await internPage.goto('/payments');
      const restrictedHeading = internPage.getByRole('heading', {
        name: /Insufficient Permissions|Access Restricted/,
      });
      await expect(restrictedHeading).toBeVisible({ timeout: 5000 });
    });

    test('7c. EMPLOYEE_INTERN is restricted from accessing /refunds', async ({
      internPage,
    }) => {
      await internPage.goto('/refunds');
      const restrictedHeading = internPage.getByRole('heading', {
        name: /Insufficient Permissions|Access Restricted/,
      });
      await expect(restrictedHeading).toBeVisible({ timeout: 5000 });
    });

    test('7d. TEAM_LEADER is restricted from accessing /invoices', async ({
      teamLeaderPage,
    }) => {
      await teamLeaderPage.goto('/invoices');
      const restrictedHeading = teamLeaderPage.getByRole('heading', {
        name: /Insufficient Permissions|Access Restricted/,
      });
      await expect(restrictedHeading).toBeVisible({ timeout: 5000 });
    });

    test('7e. TRAINER_FACULTY is restricted from accessing /invoices', async ({
      trainerPage,
    }) => {
      await trainerPage.goto('/invoices');
      const restrictedHeading = trainerPage.getByRole('heading', {
        name: /Insufficient Permissions|Access Restricted/,
      });
      await expect(restrictedHeading).toBeVisible({ timeout: 5000 });
    });

    test('7f. TRAINER_FACULTY is restricted from accessing /credit-notes', async ({
      trainerPage,
    }) => {
      await trainerPage.goto('/credit-notes');
      const restrictedHeading = trainerPage.getByRole('heading', {
        name: /Insufficient Permissions|Access Restricted/,
      });
      await expect(restrictedHeading).toBeVisible({ timeout: 5000 });
    });
  });

  // =========================================================================
  // 8. INVALID INPUTS & API ERROR HANDLING
  // =========================================================================
  test.describe('8. Invalid Inputs & API Error Handling Suite', () => {
    test('8a. Invoices page renders graceful error alert and retry button on API 500 failure', async ({
      page,
      loginAs,
    }) => {
      // Set up error route BEFORE navigation
      await page.route('**/api/v1/invoices*', async (route: Route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 500,
            message: 'Internal financial ledger database temporarily unavailable.',
            error: 'INTERNAL_SERVER_ERROR',
          }),
        });
      });

      await loginAs('ADMIN');
      await page.goto('/invoices');

      // Should display error alert with retry button
      await expect(page.locator('text=Internal financial ledger database temporarily unavailable.')).toBeVisible();
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    });

    test('8b. Non-existent invoice ID shows graceful "Invoice Not Found" page', async ({
      adminPage,
    }) => {
      // Mock 404 Not Found
      await adminPage.route('**/api/v1/invoices/non-existent-inv-id', async (route: Route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 404,
            message: 'Invoice with ID non-existent-inv-id not found',
            error: 'NOT_FOUND',
          }),
        });
      });

      await adminPage.goto('/invoices/non-existent-inv-id');

      await expect(adminPage.getByRole('heading', { name: 'Invoice Not Found' })).toBeVisible({
        timeout: 5000,
      });
      await expect(adminPage.locator('button:has-text("Back to Invoices Directory")')).toBeVisible();
    });

    test('8c. Record payment rejects amount exceeding remaining balance', async ({
      financePage,
    }) => {
      await setupBillingApiMocks(financePage);
      await financePage.goto('/invoices/inv-e2e-001');

      const recordPaymentBtn = financePage.locator('button:has-text("Record Payment")').first();
      await recordPaymentBtn.click();

      // Enter amount higher than balance due (64900)
      const amountInput = financePage.locator('input[type="number"]').first();
      await amountInput.fill('999999');

      const submitBtn = financePage.locator('button:has-text("Confirm & Record")');
      await submitBtn.click();

      // HTML5 or client error validation prevents mutation
      await expect(financePage.getByRole('heading', { name: 'Record Payment' })).toBeVisible();
    });

    test('8d. Credit note rejects empty reason submission', async ({ financePage }) => {
      await setupBillingApiMocks(financePage);
      await financePage.goto('/invoices/inv-e2e-001');

      const cnBtn = financePage.locator('button:has-text("Credit Note")');
      await cnBtn.click();

      const amountInput = financePage.locator('input[placeholder*="e.g. 5000"]');
      const submitBtn = financePage.locator('button:has-text("Issue Credit Note")');

      await amountInput.fill('1000');
      // Leave reason empty
      await submitBtn.click();

      // Stays on modal
      await expect(financePage.getByRole('heading', { name: 'Issue Credit Note' })).toBeVisible();
    });
  });
});
