'use client';

import React, { useState } from 'react';
import {
  Invoice,
  PaymentMethod,
  billingService,
  formatINR,
} from '@/lib/api/billing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CreditCard,
  Building,
  Smartphone,
  Banknote,
  Globe,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface RecordPaymentModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordPaymentModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const balanceDue = Math.max(0, Number(invoice.totalAmount) - Number(invoice.paidAmount));

  const [amount, setAmount] = useState<number>(balanceDue);
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (amount > balanceDue + 0.01) {
      setErrorMessage(`Amount cannot exceed the remaining balance (${formatINR(balanceDue)}).`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await billingService.recordPayment({
        invoiceId: invoice.id,
        amount: Number(amount),
        method,
        transactionReference: transactionRef.trim() || undefined,
        paidAt: new Date(paymentDate).toISOString(),
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethods: Array<{
    id: PaymentMethod;
    label: string;
    icon: any;
    hint: string;
  }> = [
    {
      id: 'UPI',
      label: 'UPI / QR',
      icon: Smartphone,
      hint: 'XYZ',
    },
    {
      id: 'BANK_TRANSFER',
      label: 'NEFT / RTGS / IMPS',
      icon: Building,
      hint: '123',
    },
    {
      id: 'CREDIT_CARD',
      label: 'Credit Card',
      icon: CreditCard,
      hint: 'XYZ',
    },
    {
      id: 'DEBIT_CARD',
      label: 'Debit Card',
      icon: CreditCard,
      hint: 'XYZ',
    },
    {
      id: 'CASH',
      label: 'Cash',
      icon: Banknote,
      hint: '123',
    },
    {
      id: 'ONLINE_GATEWAY',
      label: 'Razorpay / Gateway',
      icon: Globe,
      hint: 'XYZ',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl transition-all sm:my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Record Payment
            </h2>
            <p className="text-xs text-muted-foreground">
              Invoice <span className="font-semibold text-foreground">{invoice.invoiceNumber}</span> • {invoice.student?.fullName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Invoice Balance Summary Banner */}
        <div className="my-4 flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3.5">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Total Invoiced
            </div>
            <div className="text-sm font-semibold text-foreground">
              {formatINR(Number(invoice.totalAmount))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Already Paid
            </div>
            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {formatINR(Number(invoice.paidAmount))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-seg-plum">
              Remaining Balance
            </div>
            <div className="text-base font-extrabold text-foreground">
              {formatINR(balanceDue)}
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount and Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">
                  ₹
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  max={balanceDue}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="pl-7 text-sm font-semibold"
                  required
                />
              </div>
              {amount === balanceDue && balanceDue > 0 && (
                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                  Full settlement amount selected.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="text-sm"
                required
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {paymentMethods.map((m) => {
                const Icon = m.icon;
                const isSelected = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-seg-plum bg-seg-plum-subtle font-semibold text-seg-plum dark:bg-seg-plum/20'
                        : 'border-border bg-background text-foreground/80 hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference / UTR Number */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Transaction / Reference / UTR Number
            </label>
            <Input
              type="text"
              placeholder={
                paymentMethods.find((m) => m.id === method)?.hint || 'Reference Number'
              }
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="text-sm"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Crucial for bank reconciliation and student payment receipt verification.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Internal Remarks (Optional)
            </label>
            <Input
              type="text"
              placeholder="Sample text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-border/80 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || amount <= 0}
              className="bg-seg-plum text-white hover:bg-seg-plum-hover"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Confirm & Record {formatINR(amount)}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
