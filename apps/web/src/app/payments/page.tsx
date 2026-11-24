'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  billingService,
  Payment,
  formatINR,
  formatDate,
  getPaymentMethodLabel,
} from '@/lib/api/billing';
import {
  CreditCard,
  Search,
  Filter,
  Eye,
  ArrowLeft,
  Download,
  CheckCircle2,
  Building,
  Smartphone,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileCheck,
} from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const data = await billingService.getPayments({
        search: search.trim() || undefined,
        method: methodFilter,
        status: statusFilter,
      });
      setPayments(data);
    } catch {
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchPayments();
  }, [methodFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPayments();
  };

  const totalPages = Math.ceil(payments.length / pageSize) || 1;
  const paginatedPayments = payments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalCollected = payments.reduce(
    (sum, p) => sum + (p.status === 'CONFIRMED' ? Number(p.amount) : 0),
    0,
  );

  const upiCollected = payments
    .filter((p) => p.method === 'UPI' && p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const bankCollected = payments
    .filter((p) => p.method === 'BANK_TRANSFER' && p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const otherCollected = totalCollected - upiCollected - bankCollected;

  const handleExportCSV = () => {
    if (payments.length === 0) return;
    const headers = [
      'Payment Number',
      'Invoice Number',
      'Student Name',
      'Student Code',
      'Payment Date',
      'Payment Method',
      'Transaction Reference',
      'Amount',
      'Status',
    ];
    const rows = payments.map((p) => [
      p.paymentNumber,
      p.invoice?.invoiceNumber || '',
      `"${p.student?.fullName || ''}"`,
      p.student?.studentCode || '',
      p.paidAt || p.createdAt,
      p.method,
      `"${p.transactionReference || ''}"`,
      p.amount,
      p.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `SEG_Academy_Payments_${new Date().toISOString().split('T')[0]}.csv`,
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
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/invoices"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Invoices
              </Link>
              <span className="text-muted-foreground">/</span>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Payments Ledger
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Real-time audit record of student remittances, UPI transactions, and bank reconciliations
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={payments.length === 0}
              className="text-xs font-medium"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Export Ledger
            </Button>

            <Link href="/invoices">
              <Button size="sm" variant="outline" className="text-xs font-medium">
                View Invoices Directory
              </Button>
            </Link>
          </div>
        </div>

        {/* Collections Overview KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">
                Total Collections
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatINR(totalCollected)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {payments.length} verified transactions
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">
                UPI / QR Volume
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-seg-plum-subtle text-seg-plum dark:bg-seg-plum/20">
                <Smartphone className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
              {formatINR(upiCollected)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Instant settlements
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">
                NEFT / RTGS Transfers
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-seg-orange-subtle text-seg-orange dark:bg-seg-orange/20">
                <Building className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
              {formatINR(bankCollected)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Bank remittances
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">
                Cards & Gateway
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
              {formatINR(otherCollected)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Online POS & Gateways
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Payment #, UTR / Ref, Student name or Invoice #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Method:</span>
            </div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="CASH">Cash</option>
              <option value="ONLINE_GATEWAY">Razorpay / Online</option>
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchPayments}
              className="h-9 text-xs"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Payments Table */}
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          {isLoading ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
              <p className="text-xs font-medium text-muted-foreground">
                Loading payments ledger...
              </p>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                No payments recorded
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                No transactions match the selected filter. Payments recorded on invoices will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Receipt / Payment #</th>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Transaction UTR / Ref</th>
                    <th className="px-4 py-3 text-right">Amount (₹)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedPayments.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-muted/40">
                      {/* Payment Number */}
                      <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                        <Link
                          href={`/payments/${p.id}`}
                          className="hover:text-seg-plum hover:underline"
                        >
                          {p.paymentNumber}
                        </Link>
                      </td>

                      {/* Invoice Link */}
                      <td className="px-4 py-3.5">
                        {p.invoice ? (
                          <Link
                            href={`/invoices/${p.invoice.id}`}
                            className="font-mono text-muted-foreground hover:text-seg-plum hover:underline"
                          >
                            {p.invoice.invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Student */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-foreground">
                          {p.student?.fullName || 'Student'}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {p.student?.studentCode}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {formatDate(p.paidAt || p.createdAt)}
                      </td>

                      {/* Method */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                          {getPaymentMethodLabel(p.method)}
                        </span>
                      </td>

                      {/* Reference / UTR */}
                      <td className="px-4 py-3.5 font-mono text-muted-foreground">
                        {p.transactionReference || '—'}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatINR(Number(p.amount))}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <Badge variant="success">Confirmed</Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/payments/${p.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            Receipt
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          {!isLoading && payments.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-2 border-t border-border/80 bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:flex-row">
              <div>
                Showing <span className="font-semibold text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * pageSize, payments.length)}
                </span>{' '}
                of <span className="font-semibold text-foreground">{payments.length}</span> payment transactions
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
    </AppShell>
  );
}
