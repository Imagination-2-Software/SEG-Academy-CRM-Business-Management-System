import { apiClient, tokenStorage } from './client';

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'UPI'
  | 'CASH'
  | 'ONLINE_GATEWAY';

export type PaymentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type CreditNoteStatus = 'DRAFT' | 'ISSUED' | 'APPLIED' | 'CANCELLED';

export interface InvoiceItem {
  id?: string;
  courseId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  amount: number;
}

export interface StudentReference {
  id: string;
  studentCode: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
}

export interface BatchReference {
  id: string;
  name: string;
  code: string;
  course?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  enrolmentId?: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  status: InvoiceStatus;
  version: number;
  isFinalized: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  student: StudentReference;
  batch?: BatchReference;
  items: InvoiceItem[];
  payments: Payment[];
  creditNotes?: CreditNote[];
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference?: string;
  idempotencyKey: string;
  gatewayProvider?: string;
  gatewayOrderId?: string;
  paidAt?: string;
  recordedById?: string;
  notes?: string;
  createdAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    status: InvoiceStatus;
  };
  student?: {
    id: string;
    studentCode: string;
    fullName: string;
    email: string;
  };
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  currency: string;
  reason: string;
  status: CreditNoteStatus;
  issuedAt?: string;
  notes?: string;
  createdAt: string;
  invoice?: {
    invoiceNumber: string;
  };
  student?: {
    fullName: string;
    studentCode: string;
  };
}

export interface BillingMetrics {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
}

export interface CreateInvoicePayload {
  studentId: string;
  enrolmentId?: string;
  issueDate: string;
  dueDate: string;
  items: Array<{
    description: string;
    courseId?: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    amount: number;
  }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  isFinalized?: boolean;
}

export interface RecordPaymentPayload {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
  paidAt?: string;
  notes?: string;
  gatewayProvider?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatINR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function isPastDue(dueDateStr: string, status: InvoiceStatus): boolean {
  if (status === 'PAID' || status === 'CANCELLED' || status === 'REFUNDED') {
    return false;
  }
  const dueDate = new Date(dueDateStr);
  const now = new Date();
  // Strip hours
  dueDate.setHours(23, 59, 59, 999);
  return now > dueDate;
}

export function getInvoiceStatusMeta(status: InvoiceStatus, dueDate?: string) {
  if (dueDate && isPastDue(dueDate, status)) {
    return {
      label: 'Overdue',
      variant: 'destructive' as const,
      color: 'text-red-700 bg-red-50 border-red-200',
    };
  }

  switch (status) {
    case 'PAID':
      return {
        label: 'Paid',
        variant: 'success' as const,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    case 'PARTIALLY_PAID':
      return {
        label: 'Partially Paid',
        variant: 'warning' as const,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
      };
    case 'ISSUED':
      return {
        label: 'Issued',
        variant: 'info' as const,
        color: 'text-sky-700 bg-sky-50 border-sky-200',
      };
    case 'DRAFT':
      return {
        label: 'Draft',
        variant: 'neutral' as const,
        color: 'text-slate-600 bg-slate-100 border-slate-200',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        variant: 'neutral' as const,
        color: 'text-slate-500 bg-slate-100 border-slate-200 line-through',
      };
    case 'REFUNDED':
      return {
        label: 'Refunded',
        variant: 'destructive' as const,
        color: 'text-purple-700 bg-purple-50 border-purple-200',
      };
    default:
      return {
        label: status,
        variant: 'neutral' as const,
        color: 'text-slate-600 bg-slate-100 border-slate-200',
      };
  }
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'UPI':
      return 'UPI (Instant)';
    case 'BANK_TRANSFER':
      return 'Bank Transfer / NEFT';
    case 'CREDIT_CARD':
      return 'Credit Card';
    case 'DEBIT_CARD':
      return 'Debit Card';
    case 'CASH':
      return 'Cash Payment';
    case 'ONLINE_GATEWAY':
      return 'Online Gateway (Razorpay)';
    default:
      return method;
  }
}

// ---------------------------------------------------------------------------
// Realistic Seed Data (SEG Academy CRM Baseline)
// ---------------------------------------------------------------------------

const SEED_INVOICES: Invoice[] = [
  {
    id: 'inv-uuid-001',
    invoiceNumber: 'INV-2026-0041',
    studentId: 'stu-uuid-1',
    enrolmentId: 'enr-uuid-1',
    issueDate: '2026-11-01',
    dueDate: '2026-11-15',
    subtotal: 55000,
    taxAmount: 9900,
    discountAmount: 5000,
    totalAmount: 59900,
    paidAmount: 59900,
    currency: 'INR',
    status: 'PAID',
    version: 2,
    isFinalized: true,
    notes: 'Semester 1 comprehensive tuition fee for Full Stack AI Development.',
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-05T14:30:00Z',
    student: {
      id: 'stu-uuid-1',
      studentCode: 'SEG-26-0001',
      fullName: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      phoneNumber: '+91 98765 43210',
      address: 'Flat 402, Highrise Residency, Andheri East, Mumbai, Maharashtra 400069',
    },
    batch: {
      id: 'batch-uuid-1',
      name: 'Batch Alpha 2026',
      code: 'FSAD-2026-B1',
      course: {
        id: 'crs-uuid-1',
        name: 'Full Stack AI & Cloud Engineering',
        code: 'FSAD-101',
      },
    },
    items: [
      {
        id: 'item-1',
        description: 'Tuition Fee - Full Stack AI & Cloud Engineering (Term 1)',
        quantity: 1,
        unitPrice: 50000,
        amount: 50000,
      },
      {
        id: 'item-2',
        description: 'Lab & Cloud Infrastructure Access Pass (Annual)',
        quantity: 1,
        unitPrice: 5000,
        amount: 5000,
      },
    ],
    payments: [
      {
        id: 'pay-uuid-001',
        paymentNumber: 'PAY-2026-0081',
        invoiceId: 'inv-uuid-001',
        studentId: 'stu-uuid-1',
        amount: 59900,
        currency: 'INR',
        method: 'UPI',
        status: 'CONFIRMED',
        transactionReference: 'UPI/632194829101/YESB',
        idempotencyKey: 'idemp-pay-001',
        gatewayProvider: 'RAZORPAY',
        paidAt: '2026-11-05T14:30:00Z',
        createdAt: '2026-11-05T14:30:00Z',
      },
    ],
  },
  {
    id: 'inv-uuid-002',
    invoiceNumber: 'INV-2026-0042',
    studentId: 'stu-uuid-2',
    enrolmentId: 'enr-uuid-2',
    issueDate: '2026-11-10',
    dueDate: '2026-11-25',
    subtotal: 45000,
    taxAmount: 8100,
    discountAmount: 0,
    totalAmount: 53100,
    paidAmount: 25000,
    currency: 'INR',
    status: 'PARTIALLY_PAID',
    version: 2,
    isFinalized: true,
    notes: 'Two-installment plan approved by Admissions.',
    createdAt: '2026-11-10T09:15:00Z',
    updatedAt: '2026-11-12T11:20:00Z',
    student: {
      id: 'stu-uuid-2',
      studentCode: 'SEG-26-0002',
      fullName: 'Priya Patel',
      email: 'priya.patel@example.com',
      phoneNumber: '+91 91234 56789',
      address: 'B-12 Nilgiri Heights, Vastrapur, Ahmedabad, Gujarat 380015',
    },
    batch: {
      id: 'batch-uuid-2',
      name: 'Data Science Evening Cohort',
      code: 'DS-2026-E1',
      course: {
        id: 'crs-uuid-2',
        name: 'Applied Data Science & Machine Learning',
        code: 'DS-201',
      },
    },
    items: [
      {
        id: 'item-3',
        description: 'Applied Data Science & Machine Learning Program Fee',
        quantity: 1,
        unitPrice: 45000,
        amount: 45000,
      },
    ],
    payments: [
      {
        id: 'pay-uuid-002',
        paymentNumber: 'PAY-2026-0082',
        invoiceId: 'inv-uuid-002',
        studentId: 'stu-uuid-2',
        amount: 25000,
        currency: 'INR',
        method: 'BANK_TRANSFER',
        status: 'CONFIRMED',
        transactionReference: 'NEFT/HDFC0001234/98712391',
        idempotencyKey: 'idemp-pay-002',
        gatewayProvider: 'BANK_NEFT',
        paidAt: '2026-11-12T11:20:00Z',
        createdAt: '2026-11-12T11:20:00Z',
      },
    ],
  },
  {
    id: 'inv-uuid-003',
    invoiceNumber: 'INV-2026-0043',
    studentId: 'stu-uuid-3',
    enrolmentId: 'enr-uuid-3',
    issueDate: '2026-11-05',
    dueDate: '2026-11-18', // Past due!
    subtotal: 60000,
    taxAmount: 10800,
    discountAmount: 3000,
    totalAmount: 67800,
    paidAmount: 0,
    currency: 'INR',
    status: 'ISSUED',
    version: 1,
    isFinalized: true,
    notes: 'Payment overdue. Second reminder dispatched via email.',
    createdAt: '2026-11-05T11:00:00Z',
    updatedAt: '2026-11-05T11:00:00Z',
    student: {
      id: 'stu-uuid-3',
      studentCode: 'SEG-26-0003',
      fullName: 'Rohan Mehta',
      email: 'rohan.mehta@example.com',
      phoneNumber: '+91 99887 76655',
      address: '74 Park View Apartments, Koramangala, Bengaluru, Karnataka 560034',
    },
    batch: {
      id: 'batch-uuid-1',
      name: 'Batch Alpha 2026',
      code: 'FSAD-2026-B1',
      course: {
        id: 'crs-uuid-1',
        name: 'Full Stack AI & Cloud Engineering',
        code: 'FSAD-101',
      },
    },
    items: [
      {
        id: 'item-4',
        description: 'Complete Course Tuition Fee',
        quantity: 1,
        unitPrice: 60000,
        amount: 60000,
      },
    ],
    payments: [],
  },
  {
    id: 'inv-uuid-004',
    invoiceNumber: 'INV-2026-0044',
    studentId: 'stu-uuid-4',
    issueDate: '2026-11-20',
    dueDate: '2026-12-05',
    subtotal: 35000,
    taxAmount: 6300,
    discountAmount: 0,
    totalAmount: 41300,
    paidAmount: 0,
    currency: 'INR',
    status: 'ISSUED',
    version: 1,
    isFinalized: true,
    notes: 'Registration fee for Cyber Security & DevSecOps Bootcamp.',
    createdAt: '2026-11-20T14:00:00Z',
    updatedAt: '2026-11-20T14:00:00Z',
    student: {
      id: 'stu-uuid-4',
      studentCode: 'SEG-26-0004',
      fullName: 'Neha Gupta',
      email: 'neha.gupta@example.com',
      phoneNumber: '+91 97654 32109',
      address: 'Block C-9, Sector 62, Noida, Uttar Pradesh 201309',
    },
    items: [
      {
        id: 'item-5',
        description: 'Cyber Security & DevSecOps Immersion',
        quantity: 1,
        unitPrice: 35000,
        amount: 35000,
      },
    ],
    payments: [],
  },
  {
    id: 'inv-uuid-005',
    invoiceNumber: 'INV-2026-0045',
    studentId: 'stu-uuid-5',
    issueDate: '2026-11-22',
    dueDate: '2026-12-07',
    subtotal: 48000,
    taxAmount: 8640,
    discountAmount: 2000,
    totalAmount: 54640,
    paidAmount: 0,
    currency: 'INR',
    status: 'DRAFT',
    version: 1,
    isFinalized: false,
    notes: 'Draft awaiting sponsorship coupon verification.',
    createdAt: '2026-11-22T16:45:00Z',
    updatedAt: '2026-11-22T16:45:00Z',
    student: {
      id: 'stu-uuid-5',
      studentCode: 'SEG-26-0005',
      fullName: 'Vikram Singh',
      email: 'vikram.singh@example.com',
      phoneNumber: '+91 98112 23344',
      address: '15 Civil Lines, Jaipur, Rajasthan 302006',
    },
    items: [
      {
        id: 'item-6',
        description: 'Product Design & UI/UX Systems Track',
        quantity: 1,
        unitPrice: 48000,
        amount: 48000,
      },
    ],
    payments: [],
  },
];

const LOCAL_STORAGE_INVOICES_KEY = 'seg_crm_invoices_cache_v1';
const LOCAL_STORAGE_PAYMENTS_KEY = 'seg_crm_payments_cache_v1';

function getStoredInvoices(): Invoice[] {
  if (typeof window === 'undefined') return SEED_INVOICES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INVOICES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_INVOICES_KEY, JSON.stringify(SEED_INVOICES));
      return SEED_INVOICES;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_INVOICES;
  }
}

function saveStoredInvoices(invoices: Invoice[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_INVOICES_KEY, JSON.stringify(invoices));
  } catch {}
}

// ---------------------------------------------------------------------------
// Billing Service Methods
// ---------------------------------------------------------------------------

export const billingService = {
  async getInvoices(params?: {
    search?: string;
    status?: string;
    studentId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ invoices: Invoice[]; total: number; metrics: BillingMetrics }> {
    if (tokenStorage.getAccessToken()) {
      try {
        const query = new URLSearchParams();
        if (params?.search) query.append('search', params.search);
        if (params?.status && params.status !== 'ALL') query.append('status', params.status);
        if (params?.studentId) query.append('studentId', params.studentId);
        if (params?.page) query.append('page', params.page.toString());
        if (params?.limit) query.append('limit', params.limit.toString());

        const res: any = await apiClient.get(`/invoices?${query.toString()}`);
        if (res?.success && res?.data) {
          const list = Array.isArray(res.data) ? res.data : res.data.data || [];
          const metrics = res.data.metrics || this.computeMetrics(list);
          return {
            invoices: list,
            total: res.meta?.total || list.length,
            metrics,
          };
        }
      } catch {
        // Fallback to local high-fidelity state if backend endpoint is not yet live
      }
    }

    let list = getStoredInvoices();

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.student.fullName.toLowerCase().includes(q) ||
          inv.student.studentCode.toLowerCase().includes(q) ||
          inv.student.email.toLowerCase().includes(q),
      );
    }

    if (params?.status && params.status !== 'ALL') {
      if (params.status === 'OVERDUE') {
        list = list.filter((inv) => isPastDue(inv.dueDate, inv.status));
      } else {
        list = list.filter((inv) => inv.status === params.status);
      }
    }

    if (params?.studentId) {
      list = list.filter((inv) => inv.studentId === params.studentId);
    }

    const allInvoices = getStoredInvoices();
    const metrics = this.computeMetrics(allInvoices);

    return {
      invoices: list,
      total: list.length,
      metrics,
    };
  },

  async getInvoiceById(id: string): Promise<Invoice | null> {
    if (tokenStorage.getAccessToken()) {
      try {
        const res: any = await apiClient.get(`/invoices/${id}`);
        if (res?.success && res?.data) {
          return res.data;
        }
      } catch {
        // Fallback
      }
    }

    const list = getStoredInvoices();
    const found = list.find((inv) => inv.id === id || inv.invoiceNumber === id);
    return found || null;
  },

  async createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
    try {
      const res: any = await apiClient.post('/invoices', payload);
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch {
      // Fallback local creation
    }

    const list = getStoredInvoices();
    const nextNum = list.length + 42;
    const invNumber = `INV-2026-00${nextNum}`;

    // Look up mock student
    const student =
      SEED_INVOICES.find((i) => i.student.id === payload.studentId)?.student || {
        id: payload.studentId,
        studentCode: `SEG-26-00${nextNum}`,
        fullName: 'Enrolled Student',
        email: 'student@example.com',
        phoneNumber: '+91 98765 00000',
        address: 'SEG Academy Main Campus, India',
      };

    const newInvoice: Invoice = {
      id: `inv-uuid-${Date.now()}`,
      invoiceNumber: invNumber,
      studentId: payload.studentId,
      enrolmentId: payload.enrolmentId,
      issueDate: payload.issueDate,
      dueDate: payload.dueDate,
      subtotal: payload.subtotal,
      discountAmount: payload.discountAmount,
      taxAmount: payload.taxAmount,
      totalAmount: payload.totalAmount,
      paidAmount: 0,
      currency: 'INR',
      status: payload.isFinalized ? 'ISSUED' : 'DRAFT',
      version: 1,
      isFinalized: Boolean(payload.isFinalized),
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      student,
      items: payload.items.map((it, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        ...it,
      })),
      payments: [],
    };

    const updated = [newInvoice, ...list];
    saveStoredInvoices(updated);
    return newInvoice;
  },

  async recordPayment(payload: RecordPaymentPayload): Promise<Payment> {
    try {
      const res: any = await apiClient.post(
        `/invoices/${payload.invoiceId}/payments`,
        payload,
      );
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const list = getStoredInvoices();
    const invoiceIndex = list.findIndex((i) => i.id === payload.invoiceId);
    if (invoiceIndex === -1) {
      throw new Error('Invoice not found.');
    }

    const inv = list[invoiceIndex];
    const newPaidAmount = Number(inv.paidAmount) + Number(payload.amount);
    let newStatus: InvoiceStatus = inv.status;

    if (newPaidAmount >= Number(inv.totalAmount)) {
      newStatus = 'PAID';
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    const paymentNum = `PAY-2026-00${Date.now().toString().slice(-4)}`;
    const newPayment: Payment = {
      id: `pay-uuid-${Date.now()}`,
      paymentNumber: paymentNum,
      invoiceId: inv.id,
      studentId: inv.studentId,
      amount: payload.amount,
      currency: 'INR',
      method: payload.method,
      status: 'CONFIRMED',
      transactionReference:
        payload.transactionReference ||
        `TXN/${payload.method}/${Date.now().toString().slice(-8)}`,
      idempotencyKey: `idemp-${Date.now()}`,
      gatewayProvider: payload.gatewayProvider || payload.method,
      paidAt: payload.paidAt || new Date().toISOString(),
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      invoice: {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        totalAmount: inv.totalAmount,
        paidAmount: newPaidAmount,
        status: newStatus,
      },
      student: {
        id: inv.student.id,
        studentCode: inv.student.studentCode,
        fullName: inv.student.fullName,
        email: inv.student.email,
      },
    };

    inv.paidAmount = newPaidAmount;
    inv.status = newStatus;
    inv.payments = [newPayment, ...(inv.payments || [])];
    inv.updatedAt = new Date().toISOString();

    list[invoiceIndex] = inv;
    saveStoredInvoices(list);
    return newPayment;
  },

  async getPayments(params?: {
    search?: string;
    method?: string;
    status?: string;
  }): Promise<Payment[]> {
    if (tokenStorage.getAccessToken()) {
      try {
        const query = new URLSearchParams();
        if (params?.search) query.append('search', params.search);
        if (params?.method && params.method !== 'ALL') query.append('method', params.method);
        if (params?.status && params.status !== 'ALL') query.append('status', params.status);

        const res: any = await apiClient.get(`/payments?${query.toString()}`);
        if (res?.success && res?.data) {
          return Array.isArray(res.data) ? res.data : res.data.data || [];
        }
      } catch {
        // Fallback
      }
    }

    const list = getStoredInvoices();
    let allPayments: Payment[] = [];
    for (const inv of list) {
      if (inv.payments && inv.payments.length > 0) {
        for (const p of inv.payments) {
          allPayments.push({
            ...p,
            invoice: {
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              totalAmount: inv.totalAmount,
              paidAmount: inv.paidAmount,
              status: inv.status,
            },
            student: inv.student,
          });
        }
      }
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      allPayments = allPayments.filter(
        (p) =>
          p.paymentNumber.toLowerCase().includes(q) ||
          p.transactionReference?.toLowerCase().includes(q) ||
          p.student?.fullName.toLowerCase().includes(q) ||
          p.invoice?.invoiceNumber.toLowerCase().includes(q),
      );
    }

    if (params?.method && params.method !== 'ALL') {
      allPayments = allPayments.filter((p) => p.method === params.method);
    }

    if (params?.status && params.status !== 'ALL') {
      allPayments = allPayments.filter((p) => p.status === params.status);
    }

    return allPayments;
  },

  async getPaymentById(id: string): Promise<Payment | null> {
    if (tokenStorage.getAccessToken()) {
      try {
        const res: any = await apiClient.get(`/payments/${id}`);
        if (res?.success && res?.data) {
          return res.data;
        }
      } catch {
        // Fallback
      }
    }

    const list = getStoredInvoices();
    for (const inv of list) {
      const found = inv.payments?.find(
        (p) => p.id === id || p.paymentNumber === id,
      );
      if (found) {
        return {
          ...found,
          invoice: {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            totalAmount: inv.totalAmount,
            paidAmount: inv.paidAmount,
            status: inv.status,
          },
          student: inv.student,
        };
      }
    }
    return null;
  },

  computeMetrics(invoices: Invoice[]): BillingMetrics {
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let paidInvoicesCount = 0;
    let pendingInvoicesCount = 0;

    for (const inv of invoices) {
      if (inv.status === 'CANCELLED') continue;

      const total = Number(inv.totalAmount) || 0;
      const paid = Number(inv.paidAmount) || 0;
      const balance = Math.max(0, total - paid);

      totalInvoiced += total;
      totalCollected += paid;
      totalOutstanding += balance;

      if (inv.status === 'PAID') {
        paidInvoicesCount++;
      } else {
        pendingInvoicesCount++;
      }

      if (balance > 0 && isPastDue(inv.dueDate, inv.status)) {
        overdueAmount += balance;
        overdueCount++;
      }
    }

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      overdueAmount,
      overdueCount,
      paidInvoicesCount,
      pendingInvoicesCount,
    };
  },
};
