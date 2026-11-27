'use client';

import React, { useState } from 'react';
import { Invoice, billingService, formatINR } from '@/lib/api/billing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileDown, X, AlertCircle } from 'lucide-react';

interface CreateCreditNoteModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCreditNoteModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: CreateCreditNoteModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setErrorMessage('Please enter a valid credit note amount greater than zero.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Reason for issuing credit note is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await billingService.createCreditNote(invoice.id, {
        amount: Number(amount),
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to issue credit note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-seg-plum-subtle text-seg-plum">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Issue Credit Note
              </h3>
              <p className="text-xs text-muted-foreground">
                Invoice {invoice.invoiceNumber} • {invoice.student?.fullName}
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

          <div>
            <label className="text-xs font-semibold text-foreground">
              Credit Amount (₹) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 5000"
              required
              className="mt-1 text-xs"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Total invoice value: {formatINR(Number(invoice.totalAmount))}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">
              Reason <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Scholarship concession / Fee waiver adjustment"
              required
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">
              Internal Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Approval reference or additional documentation notes"
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

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
              disabled={isSubmitting}
              className="bg-seg-plum text-white hover:bg-seg-plum-hover text-xs"
            >
              {isSubmitting ? 'Issuing...' : 'Issue Credit Note'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
