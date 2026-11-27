import { apiClient } from './client';

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
// Billing Service Methods
// ---------------------------------------------------------------------------

export interface GetInvoicesResponse {
  invoices: Invoice[];
  total: number;
  metrics: BillingMetrics;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const billingService = {
  async getInvoices(params?: {
    search?: string;
    status?: string;
    studentId?: string;
    page?: number;
    limit?: number;
  }): Promise<GetInvoicesResponse> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res: any = await apiClient.get(`/invoices${queryString}`);

    let list: Invoice[] = [];
    let total = 0;
    let meta: { page: number; limit: number; total: number; totalPages: number } | undefined = undefined;
    let metrics: BillingMetrics = {
      totalInvoiced: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      overdueAmount: 0,
      overdueCount: 0,
      paidInvoicesCount: 0,
      pendingInvoicesCount: 0,
    };

    if (res?.success && res?.data) {
      list = Array.isArray(res.data) ? res.data : res.data.data || [];
      meta = res.meta || res.data?.meta;
      total = meta?.total ?? (res.meta?.total || list.length);
      metrics = res.data?.metrics || res.metrics || this.computeMetrics(list);
    } else if (Array.isArray(res)) {
      list = res;
      total = list.length;
      metrics = this.computeMetrics(list);
    }

    return {
      invoices: list,
      total,
      metrics,
      meta,
    };
  },

  async getInvoiceById(id: string): Promise<Invoice | null> {
    const res: any = await apiClient.get(`/invoices/${id}`);
    if (res?.success && res?.data) {
      return res.data;
    }
    if (res?.data) return res.data;
    return res || null;
  },

  async createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
    const res: any = await apiClient.post('/invoices', payload);
    if (res?.success && res?.data) {
      return res.data;
    }
    return res?.data || res;
  },

  async finalizeInvoice(id: string): Promise<Invoice> {
    const res: any = await apiClient.patch(`/invoices/${id}/finalize`, {});
    if (res?.success && res?.data) {
      return res.data;
    }
    return res?.data || res;
  },

  async cancelInvoice(id: string): Promise<Invoice> {
    const res: any = await apiClient.patch(`/invoices/${id}/cancel`, {});
    if (res?.success && res?.data) {
      return res.data;
    }
    return res?.data || res;
  },

  async recordPayment(payload: RecordPaymentPayload): Promise<Payment> {
    const res: any = await apiClient.post(
      `/invoices/${payload.invoiceId}/payments`,
      payload,
    );
    if (res?.success && res?.data) {
      return res.data;
    }
    return res?.data || res;
  },

  async getPayments(params?: {
    search?: string;
    method?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<Payment[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.method && params.method !== 'ALL') query.append('method', params.method);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res: any = await apiClient.get(`/payments${queryString}`);

    if (res?.success && res?.data) {
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data.data)) return res.data.data;
    }
    if (Array.isArray(res)) return res;
    return [];
  },

  async getPaymentById(id: string): Promise<Payment | null> {
    const res: any = await apiClient.get(`/payments/${id}`);
    if (res?.success && res?.data) {
      return res.data;
    }
    if (res?.data) return res.data;
    return res || null;
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
