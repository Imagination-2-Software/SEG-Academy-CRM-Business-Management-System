'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SegLogo } from '@/components/ui/seg-logo';
import {
  billingService,
  Payment,
  formatINR,
  formatDate,
  getPaymentMethodLabel,
} from '@/lib/api/billing';
import { useAuth } from '@/lib/auth';
import { ProcessRefundModal } from '@/components/billing/process-refund-modal';
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  FileCheck,
  Building,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export default function PaymentReceiptPage() {
  const { hasPermission } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const paymentId = params.id as string;
  const shouldPrint = searchParams.get('print') === 'true';

  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const fetchPayment = async () => {
    setIsLoading(true);
    try {
      const data = await billingService.getPaymentById(paymentId);
      setPayment(data);
    } catch {
      setPayment(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (paymentId) {
      fetchPayment();
    }
  }, [paymentId]);

  useEffect(() => {
    if (!isLoading && payment && shouldPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, payment, shouldPrint]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <AppShell
        allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER']}
        requiredPermission="invoices:read"
      >
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
          <p className="text-xs font-medium text-muted-foreground">
            Loading official payment receipt...
          </p>
        </div>
      </AppShell>
    );
  }

  if (!payment) {
    return (
      <AppShell
        allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER']}
        requiredPermission="invoices:read"
      >
        <div className="mx-auto max-w-xl p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">
            Receipt Not Found
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The requested payment transaction could not be located.
          </p>
          <div className="mt-6">
            <Link href="/payments">
              <Button size="sm" variant="outline">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Payments Ledger
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER']}
      requiredPermission="invoices:read"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Navigation & Action Bar (Hidden during print) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Link
              href="/payments"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Payments
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {payment.paymentNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {payment.invoice && (
              <Link href={`/invoices/${payment.invoice.id}`}>
                <Button variant="outline" size="sm" className="text-xs font-medium">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  View Invoice ({payment.invoice.invoiceNumber})
                </Button>
              </Link>
            )}

            {payment.status !== 'REFUNDED' && payment.invoice && hasPermission('refunds:create') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRefundModalOpen(true)}
                className="border-red-600/30 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 text-xs font-medium"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Issue Refund
              </Button>
            )}

            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-seg-plum text-white hover:bg-seg-plum-hover text-xs font-medium"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Receipt
            </Button>
          </div>
        </div>

        {/* Printable Official Payment Receipt Paper */}
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm print:m-0 print:border-none print:p-0 print:shadow-none sm:p-10">
          {/* Header */}
          <div className="flex flex-col justify-between gap-6 border-b border-border/80 pb-6 sm:flex-row sm:items-start">
            <div className="space-y-1.5">
              <SegLogo size={34} />
              <div className="pt-2 text-xs text-muted-foreground">
                <div className="font-bold text-foreground">SEG Academy Pvt. Ltd.</div>
                <div>BKC Bandra Kurla Complex, Mumbai 400051</div>
                <div>GSTIN: 27AABCS1429B1Z8 • accounts@segacademy.com</div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                OFFICIAL PAYMENT RECEIPT
              </span>
              <h1 className="mt-2 font-mono text-2xl font-black text-foreground">
                {payment.paymentNumber}
              </h1>
              <div className="mt-1 text-xs text-muted-foreground">
                Date: {formatDate(payment.paidAt || payment.createdAt)}
              </div>
            </div>
          </div>

          {/* Amount Paid Highlight Callout */}
          <div className="my-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Amount Received & Confirmed
            </div>
            <div className="mt-1 font-mono text-3xl font-black text-emerald-800 dark:text-emerald-300">
              {formatINR(Number(payment.amount))}
            </div>
            <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
              Payment Status: Confirmed & Reconciled
            </div>
          </div>

          {/* Receipt Particulars Grid */}
          <div className="space-y-4 border-b border-border/80 pb-6 text-xs">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
                <div className="font-bold text-foreground">Received From (Student):</div>
                <div className="mt-1.5 font-semibold text-foreground">
                  {payment.student?.fullName || 'Student'}
                </div>
                <div className="font-mono text-muted-foreground">
                  ID: {payment.student?.studentCode}
                </div>
                {payment.student?.email && (
                  <div className="text-muted-foreground">{payment.student.email}</div>
                )}
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
                <div className="font-bold text-foreground">Against Invoice:</div>
                <div className="mt-1.5 font-mono font-bold text-foreground">
                  {payment.invoice?.invoiceNumber || '—'}
                </div>
                {payment.invoice && (
                  <div className="mt-1 space-y-0.5 text-muted-foreground">
                    <div>Invoice Total: {formatINR(Number(payment.invoice.totalAmount))}</div>
                    <div>Total Settled: {formatINR(Number(payment.invoice.paidAmount))}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Payment Mode:</span>
                  <div className="font-semibold text-foreground">
                    {getPaymentMethodLabel(payment.method)}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground">Transaction UTR / Ref:</span>
                  <div className="font-mono font-semibold text-foreground">
                    {payment.transactionReference || 'N/A'}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground">Gateway / Channel:</span>
                  <div className="font-semibold text-foreground">
                    {payment.gatewayProvider || payment.method}
                  </div>
                </div>
              </div>

              {payment.notes && (
                <div className="mt-3 border-t border-border/60 pt-3 text-muted-foreground italic">
                  Note: {payment.notes}
                </div>
              )}
            </div>
          </div>

          {/* Footer Security Verification & Stamp */}
          <div className="mt-8 flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="text-[11px] text-muted-foreground">
                <div className="font-bold text-foreground">Digitally Reconciled</div>
                <div>Idempotency Key: {payment.idempotencyKey.slice(0, 16)}...</div>
              </div>
            </div>

            <div className="text-center sm:text-right">
              <div className="h-8 text-xs italic text-muted-foreground">
                [Authorized Electronic Receipt]
              </div>
              <div className="border-t border-foreground/30 pt-1 text-xs font-bold text-foreground">
                Accounts Department
              </div>
              <div className="text-[10px] text-muted-foreground">
                SEG Academy Private Limited
              </div>
            </div>
          </div>
        </div>

        {/* Refund History Ledger for this Payment */}
        {payment.refunds && payment.refunds.length > 0 && (
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm print:hidden">
            <div className="mb-4">
              <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <RotateCcw className="h-4 w-4" /> Refund History & Reconciliations
              </h2>
              <p className="text-xs text-muted-foreground">
                Tuition refunds processed against this transaction
              </p>
            </div>

            <div className="space-y-3">
              {payment.refunds.map((ref) => (
                <div key={ref.id} className="rounded-lg border border-border/70 bg-muted/20 p-3.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-foreground">{ref.refundNumber}</span>
                    <span className="font-bold text-red-600 dark:text-red-400">-{formatINR(Number(ref.amount))}</span>
                  </div>
                  <div className="mt-1 text-muted-foreground">{ref.reason}</div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>Processed: {formatDate(ref.processedAt || ref.createdAt)}</span>
                    <Badge variant={ref.status === 'PROCESSED' ? 'destructive' : 'neutral'} className="text-[10px]">
                      {ref.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Process Refund Modal */}
      {isRefundModalOpen && payment.invoice && (
        <ProcessRefundModal
          invoiceId={payment.invoice.id}
          payment={payment}
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          onSuccess={() => {
            fetchPayment();
          }}
        />
      )}
    </AppShell>
  );
}
