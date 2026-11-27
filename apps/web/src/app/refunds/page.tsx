'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  billingService,
  Refund,
  formatINR,
  formatDate,
} from '@/lib/api/billing';
import {
  RotateCcw,
  CreditCard,
  Search,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchRefunds = async () => {
    setIsLoading(true);
    try {
      const res = await billingService.getRefunds({
        search: search.trim() || undefined,
        page,
        limit: 20,
      });
      setRefunds(res.refunds);
      setTotal(res.total);
    } catch {
      setRefunds([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRefunds();
  };

  return (
    <AppShell
      allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER']}
      requiredPermission="refunds:read"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Tuition Refunds
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Official tuition refund transactions and payment reversal audit trail
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/payments">
              <Button variant="outline" size="sm" className="text-xs">
                <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                Payments Ledger
              </Button>
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-border/80 pb-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search refund #, reason, payment #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" className="h-9 text-xs">
              Search
            </Button>
          </form>

          <div className="text-xs text-muted-foreground">
            Total records: <span className="font-bold text-foreground">{total}</span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
            </div>
          ) : refunds.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">Refund #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Original Payment</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Processed By</th>
                    <th className="py-3 px-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {refunds.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {r.refundNumber}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {formatDate(r.processedAt || r.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {r.payment?.paymentNumber || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {r.invoice?.invoiceNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                        {r.reason}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-red-600 dark:text-red-400">
                        -{formatINR(Number(r.amount))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={r.status === 'PROCESSED' ? 'destructive' : 'neutral'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {r.processedByName || 'Accounts Officer'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.invoiceId && (
                            <Link href={`/invoices/${r.invoiceId}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                <ExternalLink className="mr-1 h-3 w-3" />
                                Invoice
                              </Button>
                            </Link>
                          )}
                          {r.paymentId && (
                            <Link href={`/payments/${r.paymentId}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                <ExternalLink className="mr-1 h-3 w-3" />
                                Receipt
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No refund transactions found.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
