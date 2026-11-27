'use client';

import React, { useState } from 'react';
import { Payment, billingService, formatINR } from '@/lib/api/billing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RotateCcw, X, AlertCircle } from 'lucide-react';

interface ProcessRefundModalProps {
  payment: Payment;
  invoiceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProcessRefundModal({
  payment,
  invoiceId,
  isOpen,
  onClose,
  onSuccess,
}: ProcessRefundModalProps) {
  // Calculate existing refunded amount from payment.refunds if available
  const existingRefunded = (payment.refunds || [])
    .filter((r) => r.status === 'PROCESSED' || r.status === 'APPROVED' || r.status === 'REQUESTED')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const availableBalance = Math.max(0, Number(payment.amount) - existingRefunded);

  const [amount, setAmount] = useState<number>(availableBalance);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setErrorMessage('Please enter a valid refund amount greater than zero.');
      return;
    }

    if (amount > availableBalance + 0.01) {
      setErrorMessage(`Refund amount cannot exceed available refundable balance (${formatINR(availableBalance)}).`);
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Reason for tuition refund is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await billingService.createRefund(invoiceId, payment.id, {
        amount: Number(amount),
        reason: reason.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process refund. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Process Tuition Refund
              </h3>
              <p className="text-xs text-muted-foreground">
                Payment {payment.paymentNumber} • Original: {formatINR(Number(payment.amount))}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Paid Transaction Amount:</span>
              <span className="font-semibold text-foreground">{formatINR(Number(payment.amount))}</span>
            </div>
            {existingRefunded > 0 && (
              <div className="flex justify-between text-muted-foreground mt-1">
                <span>Previously Refunded:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">-{formatINR(existingRefunded)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border/60 mt-2 pt-1 font-bold text-foreground">
              <span>Max Refundable:</span>
              <span className="text-emerald-600 dark:text-emerald-400">{formatINR(availableBalance)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">
              Refund Amount (₹) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={availableBalance}
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 5000"
              required
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">
              Reason <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Student withdrawal within 14-day policy window"
              required
              className="mt-1 text-xs"
            />
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Note: Processed refunds automatically update the payment and invoice reconciliation ledger via database trigger.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || availableBalance <= 0}
              className="bg-red-600 text-white hover:bg-red-700 text-xs"
            >
              {isSubmitting ? 'Processing...' : 'Confirm & Process Refund'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
