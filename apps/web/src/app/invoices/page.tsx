'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  billingService,
  Invoice,
  BillingMetrics,
  formatINR,
  formatDate,
  getInvoiceStatusMeta,
  InvoiceStatus,
  isPastDue,
} from '@/lib/api/billing';
import { RecordPaymentModal } from '@/components/billing/record-payment-modal';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Eye,
  CreditCard,
  Printer,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  FileText,
  DollarSign,
  Download,
} from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [metrics, setMetrics] = useState<BillingMetrics>({
    totalInvoiced: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    overdueAmount: 0,
    overdueCount: 0,
    paidInvoicesCount: 0,
    pendingInvoicesCount: 0,
  });
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Quick payment modal state
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await billingService.getInvoices({
        search: search.trim() || undefined,
        status: statusFilter,
      });
      setInvoices(res.invoices);
      setTotal(res.total);
      setMetrics(res.metrics);
    } catch {
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchInvoices();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchInvoices();
  };

  const totalPages = Math.ceil(invoices.length / pageSize) || 1;
  const paginatedInvoices = invoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleExportCSV = () => {
    if (invoices.length === 0) return;
    const headers = [
      'Invoice Number',
      'Student Name',
      'Student Code',
      'Issue Date',
      'Due Date',
      'Total Amount',
      'Paid Amount',
      'Balance Due',
      'Status',
    ];
    const rows = invoices.map((i) => [
      i.invoiceNumber,
      `"${i.student.fullName}"`,
      i.student.studentCode,
      i.issueDate,
      i.dueDate,
      i.totalAmount,
      i.paidAmount,
      Math.max(0, Number(i.totalAmount) - Number(i.paidAmount)),
      i.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `SEG_Academy_Invoices_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell
      allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER']}
      requiredPermission="invoices:read"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Invoices & Payments
              </h1>
              <span className="rounded-full bg-seg-plum-subtle px-2 py-0.5 text-[10px] font-semibold text-seg-plum dark:bg-seg-plum/20 border border-seg-plum/20">
                Billing Ledger
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Manage student tuition billing, installment plans, and payment reconciliation
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={invoices.length === 0}
              className="text-xs font-medium"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Export CSV
            </Button>

            <Link href="/payments">
              <Button variant="outline" size="sm" className="text-xs font-medium">
                <CreditCard className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                Payments Ledger
              </Button>
            </Link>

            <Link href="/invoices/create">
              <Button size="sm" className="bg-seg-plum text-white hover:bg-seg-plum-hover">
                <Plus className="mr-1.5 h-4 w-4" />
                New Invoice
              </Button>
            </Link>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">
                Total Invoiced
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-seg-plum-subtle text-seg-plum dark:bg-seg-plum/20">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
              {formatINR(metrics.totalInvoiced)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{invoices.length} total generated invoices</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">
                Collected (Paid)
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatINR(metrics.totalCollected)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{metrics.paidInvoicesCount} fully settled invoices</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">
                Outstanding Balance
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-seg-orange-subtle text-seg-orange dark:bg-seg-orange/20">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
              {formatINR(metrics.totalOutstanding)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{metrics.pendingInvoicesCount} pending settlement</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">
                Overdue Receivables
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight text-red-600 dark:text-red-400">
              {formatINR(metrics.overdueAmount)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <span>{metrics.overdueCount} invoices past due date</span>
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number (e.g. INV-2026-0041), student name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Statuses ({total})</option>
              <option value="ISSUED">Issued (Pending)</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Fully Paid</option>
              <option value="OVERDUE">Overdue Only</option>
              <option value="DRAFT">Drafts</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchInvoices}
              className="h-9 text-xs"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Data Table Container */}
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          {isLoading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
              <p className="text-xs font-medium text-muted-foreground">
                Loading billing records...
              </p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                No invoices found
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {search || statusFilter !== 'ALL'
                  ? 'No billing records match your filter criteria. Try resetting filters.'
                  : 'Start by generating your first student tuition invoice.'}
              </p>
              <div className="mt-4">
                <Link href="/invoices/create">
                  <Button size="sm" className="bg-seg-plum text-white hover:bg-seg-plum-hover">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create First Invoice
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="hidden px-4 py-3 md:table-cell">Course / Batch</th>
                    <th className="px-4 py-3">Issue / Due Date</th>
                    <th className="px-4 py-3 text-right">Total (₹)</th>
                    <th className="px-4 py-3 text-right">Paid / Balance</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedInvoices.map((inv) => {
                    const balanceDue = Math.max(
                      0,
                      Number(inv.totalAmount) - Number(inv.paidAmount),
                    );
                    const statusMeta = getInvoiceStatusMeta(inv.status, inv.dueDate);
                    const overdue = isPastDue(inv.dueDate, inv.status);

                    return (
                      <tr
                        key={inv.id}
                        className="transition-colors hover:bg-muted/40"
                      >
                        {/* Invoice # */}
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="font-bold text-foreground hover:text-seg-plum hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>
                          {inv.isFinalized && (
                            <span className="block text-[10px] text-muted-foreground">
                              v{inv.version} • Tax Invoice
                            </span>
                          )}
                        </td>

                        {/* Student */}
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/students/${inv.student.id}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {inv.student.fullName}
                          </Link>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {inv.student.studentCode}
                            </span>
                          </div>
                        </td>

                        {/* Course / Batch */}
                        <td className="hidden px-4 py-3.5 md:table-cell">
                          {inv.batch ? (
                            <div>
                              <div className="truncate font-medium text-foreground">
                                {inv.batch.course?.name || inv.batch.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {inv.batch.code}
                              </div>
                            </div>
                          ) : inv.items && inv.items.length > 0 ? (
                            <div className="truncate text-muted-foreground">
                              {inv.items[0].description}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-3.5">
                          <div className="text-foreground">{formatDate(inv.issueDate)}</div>
                          <div
                            className={`text-[10px] ${
                              overdue
                                ? 'font-semibold text-red-600 dark:text-red-400'
                                : 'text-muted-foreground'
                            }`}
                          >
                            Due {formatDate(inv.dueDate)}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="px-4 py-3.5 text-right font-bold text-foreground">
                          {formatINR(Number(inv.totalAmount))}
                        </td>

                        {/* Paid / Balance Due */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="font-medium text-emerald-600 dark:text-emerald-400">
                            {formatINR(Number(inv.paidAmount))}
                          </div>
                          <div
                            className={`text-[11px] font-semibold ${
                              balanceDue > 0
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {balanceDue > 0
                              ? `Due: ${formatINR(balanceDue)}`
                              : 'Settled'}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center">
                          <Badge variant={statusMeta.variant}>
                            {statusMeta.label}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/invoices/${inv.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                title="View Tax Invoice"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>

                            {balanceDue > 0 && inv.status !== 'CANCELLED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActivePaymentInvoice(inv)}
                                className="h-8 px-2.5 text-xs text-seg-plum hover:bg-seg-plum-subtle hover:text-seg-plum"
                                title="Record Payment"
                              >
                                <CreditCard className="mr-1 h-3.5 w-3.5" />
                                Pay
                              </Button>
                            )}

                            <Link href={`/invoices/${inv.id}?print=true`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                title="Print Invoice"
                              >
                                <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer / Summary */}
          {!isLoading && invoices.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-2 border-t border-border/80 bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:flex-row">
              <div>
                Showing <span className="font-semibold text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * pageSize, invoices.length)}
                </span>{' '}
                of <span className="font-semibold text-foreground">{invoices.length}</span> billing records
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  className="h-7 px-2 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-mono font-medium text-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="h-7 px-2 text-xs"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {activePaymentInvoice && (
        <RecordPaymentModal
          invoice={activePaymentInvoice}
          isOpen={Boolean(activePaymentInvoice)}
          onClose={() => setActivePaymentInvoice(null)}
          onSuccess={() => {
            fetchInvoices();
          }}
        />
      )}
    </AppShell>
  );
}
