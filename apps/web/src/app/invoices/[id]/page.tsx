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
  Invoice,
  formatINR,
  formatDate,
  getInvoiceStatusMeta,
  getPaymentMethodLabel,
  isPastDue,
} from '@/lib/api/billing';
import { RecordPaymentModal } from '@/components/billing/record-payment-modal';
import {
  ArrowLeft,
  Printer,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Share2,
  ExternalLink,
} from 'lucide-react';

export default function InvoiceDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = params.id as string;
  const shouldPrint = searchParams.get('print') === 'true';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchInvoice = async () => {
    setIsLoading(true);
    try {
      const data = await billingService.getInvoiceById(invoiceId);
      setInvoice(data);
    } catch {
      setInvoice(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  // Trigger print if ?print=true parameter is present
  useEffect(() => {
    if (!isLoading && invoice && shouldPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, invoice, shouldPrint]);

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
            Loading official tax invoice...
          </p>
        </div>
      </AppShell>
    );
  }

  if (!invoice) {
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
            Invoice Not Found
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The requested invoice reference does not exist or has been removed.
          </p>
          <div className="mt-6">
            <Link href="/invoices">
              <Button size="sm" variant="outline">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Invoices Directory
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const balanceDue = Math.max(
    0,
    Number(invoice.totalAmount) - Number(invoice.paidAmount),
  );
  const statusMeta = getInvoiceStatusMeta(invoice.status, invoice.dueDate);
  const overdue = isPastDue(invoice.dueDate, invoice.status);

  // Split tax equally between CGST and SGST for standard Indian invoicing
  const cgst = Number(invoice.taxAmount) / 2;
  const sgst = Number(invoice.taxAmount) / 2;

  return (
    <AppShell
      allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER']}
      requiredPermission="invoices:read"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation & Action Bar (Hidden during print) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Link
              href="/invoices"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Invoices
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {invoice.invoiceNumber}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs font-medium"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Print / Save PDF
            </Button>

            {balanceDue > 0 && invoice.status !== 'CANCELLED' && (
              <Button
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                className="bg-seg-plum text-white hover:bg-seg-plum-hover"
              >
                <CreditCard className="mr-1.5 h-4 w-4" />
                Record Payment
              </Button>
            )}
          </div>
        </div>

        {/* Printable Tax Invoice Paper Document */}
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm print:m-0 print:border-none print:p-0 print:shadow-none sm:p-10">
          {/* Invoice Document Header */}
          <div className="flex flex-col justify-between gap-6 border-b border-border/80 pb-8 sm:flex-row sm:items-start">
            <div className="space-y-2">
              <SegLogo size={36} />
              <div className="pt-2 text-xs text-muted-foreground">
                <div className="font-bold text-foreground">SEG Academy Pvt. Ltd.</div>
                <div>Educational Technology & Skill Excellence</div>
                <div>BKC Bandra Kurla Complex, Mumbai, Maharashtra 400051</div>
                <div>GSTIN: 27AABCS1429B1Z8 • PAN: AABCS1429B</div>
                <div>Email: accounts@segacademy.com • Web: segacademy.com</div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                ORIGINAL TAX INVOICE
              </span>
              <h1 className="mt-2 font-mono text-2xl font-black text-foreground">
                {invoice.invoiceNumber}
              </h1>
              <div className="mt-2 flex sm:justify-end">
                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
              </div>

              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">Issue Date:</span>{' '}
                  {formatDate(invoice.issueDate)}
                </div>
                <div className={overdue ? 'font-bold text-red-600 dark:text-red-400' : ''}>
                  <span className="font-semibold text-foreground">Due Date:</span>{' '}
                  {formatDate(invoice.dueDate)}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Currency:</span>{' '}
                  {invoice.currency} (INR ₹)
                </div>
              </div>
            </div>
          </div>

          {/* Student & Course Details */}
          <div className="grid grid-cols-1 gap-6 border-b border-border/80 py-6 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-seg-plum">
                Billed To (Student)
              </div>
              <div className="mt-1 text-sm font-bold text-foreground">
                {invoice.student.fullName}
              </div>
              <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                Student ID: {invoice.student.studentCode}
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <div>Email: {invoice.student.email}</div>
                {invoice.student.phoneNumber && (
                  <div>Phone: {invoice.student.phoneNumber}</div>
                )}
                {invoice.student.address && (
                  <div className="pt-1">{invoice.student.address}</div>
                )}
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Academic Program / Cohort
              </div>
              <div className="mt-1 text-sm font-bold text-foreground">
                {invoice.batch?.course?.name || invoice.batch?.name || 'Academic Program'}
              </div>
              {invoice.batch?.code && (
                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                  Cohort Code: {invoice.batch.code}
                </div>
              )}
              <div className="mt-2 text-xs text-muted-foreground">
                <div>Payment Terms: Net 15 Days</div>
                <div>Applicable SAC Code: 999293 (Commercial Training & Education)</div>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 pl-3 pr-2">#</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Tax Rate</th>
                    <th className="py-2.5 pl-3 pr-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoice.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="py-3 pl-3 pr-2 font-mono text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">
                        {it.description}
                      </td>
                      <td className="py-3 px-3 text-center text-muted-foreground">
                        {it.quantity}
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        {formatINR(Number(it.unitPrice))}
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        {it.taxRate ?? 18}% GST
                      </td>
                      <td className="py-3 pl-3 pr-3 text-right font-bold text-foreground">
                        {formatINR(Number(it.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Calculations Grid */}
          <div className="flex flex-col justify-between gap-6 border-t border-border/80 pt-6 sm:flex-row">
            {/* Bank Transfer Instructions */}
            <div className="space-y-3 sm:max-w-xs">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 text-xs">
                <div className="font-bold text-foreground">Bank Remittance Details</div>
                <div className="mt-2 space-y-1 text-muted-foreground font-mono text-[11px]">
                  <div>Bank: HDFC Bank Ltd</div>
                  <div>A/C Name: SEG Academy Pvt Ltd</div>
                  <div>A/C No: 50200088991122</div>
                  <div>IFSC: HDFC0000123 (BKC Branch)</div>
                  <div>UPI: segacademy@hdfcbank</div>
                </div>
              </div>

              {invoice.notes && (
                <div className="text-[11px] text-muted-foreground italic">
                  Note: {invoice.notes}
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="w-full space-y-2 text-xs sm:w-72">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-medium text-foreground">
                  {formatINR(Number(invoice.subtotal))}
                </span>
              </div>

              {Number(invoice.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Scholarship / Discount:</span>
                  <span className="font-medium">
                    -{formatINR(Number(invoice.discountAmount))}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>CGST (9%):</span>
                <span className="font-medium text-foreground">{formatINR(cgst)}</span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>SGST (9%):</span>
                <span className="font-medium text-foreground">{formatINR(sgst)}</span>
              </div>

              <div className="border-t border-border/80 pt-2 flex justify-between text-sm">
                <span className="font-extrabold text-foreground">Invoice Total:</span>
                <span className="font-extrabold text-foreground">
                  {formatINR(Number(invoice.totalAmount))}
                </span>
              </div>

              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                <span className="font-semibold">Paid to Date:</span>
                <span className="font-bold">
                  {formatINR(Number(invoice.paidAmount))}
                </span>
              </div>

              <div className="border-t border-border/60 pt-2 flex justify-between text-sm">
                <span className="font-bold text-seg-plum">Balance Payable:</span>
                <span className="text-base font-extrabold text-seg-plum">
                  {formatINR(balanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Authorized Signature Footer */}
          <div className="mt-12 flex flex-col items-end border-t border-border/60 pt-8 sm:flex-row sm:justify-between">
            <div className="text-[10px] text-muted-foreground">
              This is a computer generated invoice and requires no physical signature under Indian IT Act.
            </div>
            <div className="mt-4 text-center sm:mt-0 sm:text-right">
              <div className="h-10 text-xs italic text-muted-foreground">
                [Digitally Authorized by Accounts Department]
              </div>
              <div className="border-t border-foreground/30 pt-1 text-xs font-bold text-foreground">
                Authorized Signatory
              </div>
              <div className="text-[10px] text-muted-foreground">
                SEG Academy Private Limited
              </div>
            </div>
          </div>
        </div>

        {/* Payments History Ledger Card */}
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm print:hidden">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                Payment History & Settlement Ledger
              </h2>
              <p className="text-xs text-muted-foreground">
                Audit trail of verified payment transactions received against this invoice
              </p>
            </div>

            {balanceDue > 0 && invoice.status !== 'CANCELLED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsPaymentModalOpen(true)}
                className="text-xs text-seg-plum hover:bg-seg-plum-subtle hover:text-seg-plum"
              >
                <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                Record Payment
              </Button>
            )}
          </div>

          {invoice.payments && invoice.payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 px-3">Payment #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Transaction UTR / Ref</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoice.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="py-3 px-3 font-mono font-bold text-foreground">
                        {p.paymentNumber}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {formatDate(p.paidAt || p.createdAt)}
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">
                        {getPaymentMethodLabel(p.method)}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        {p.transactionReference || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(Number(p.amount))}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="success">Confirmed</Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link href={`/payments/${p.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Receipt
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
              No payments have been recorded for this invoice yet.
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <RecordPaymentModal
          invoice={invoice}
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            fetchInvoice();
          }}
        />
      )}
    </AppShell>
  );
}
