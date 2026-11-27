'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  billingService,
  CreditNote,
  DebitNote,
  formatINR,
  formatDate,
} from '@/lib/api/billing';
import {
  FileText,
  FileDown,
  FileUp,
  Search,
  ExternalLink,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

export default function CreditDebitNotesPage() {
  const [activeTab, setActiveTab] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'CREDIT') {
        const res = await billingService.getCreditNotes({
          search: search.trim() || undefined,
          page,
          limit: 20,
        });
        setCreditNotes(res.creditNotes);
        setTotal(res.total);
      } else {
        const res = await billingService.getDebitNotes({
          search: search.trim() || undefined,
          page,
          limit: 20,
        });
        setDebitNotes(res.debitNotes);
        setTotal(res.total);
      }
    } catch {
      if (activeTab === 'CREDIT') setCreditNotes([]);
      else setDebitNotes([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  return (
    <AppShell
      allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER']}
      requiredPermission="invoices:read"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Credit & Debit Notes
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Official GST adjustment notes and fee rectification ledger
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/invoices">
              <Button variant="outline" size="sm" className="text-xs">
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Invoices Directory
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab Selector & Filter Bar */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-border/80 pb-4">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'CREDIT' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveTab('CREDIT');
                setPage(1);
              }}
              className={activeTab === 'CREDIT' ? 'bg-seg-plum text-white hover:bg-seg-plum-hover text-xs' : 'text-xs'}
            >
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              Credit Notes (Reductions)
            </Button>
            <Button
              variant={activeTab === 'DEBIT' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveTab('DEBIT');
                setPage(1);
              }}
              className={activeTab === 'DEBIT' ? 'bg-seg-navy text-white hover:bg-seg-navy-hover text-xs' : 'text-xs'}
            >
              <FileUp className="mr-1.5 h-3.5 w-3.5" />
              Debit Notes (Surcharges)
            </Button>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search note #, reason, student..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" className="h-9 text-xs">
              Search
            </Button>
          </form>
        </div>

        {/* Records Table */}
        <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
            </div>
          ) : activeTab === 'CREDIT' ? (
            creditNotes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/30 font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-4">Note Number</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Against Invoice</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4 text-right">Credit Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Issued By</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {creditNotes.map((cn) => (
                      <tr key={cn.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {cn.creditNoteNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{cn.student?.fullName || '—'}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{cn.student?.studentCode}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-foreground">
                          {cn.invoice?.invoiceNumber || '—'}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                          {cn.reason}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-seg-plum">
                          -{formatINR(Number(cn.amount))}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="info">{cn.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {cn.issuedByName || 'Accounts Dept'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/invoices/${cn.invoiceId}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              <ExternalLink className="mr-1 h-3 w-3" />
                              Invoice
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No credit note adjustments found matching the query.
              </div>
            )
          ) : debitNotes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">Note Number</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Against Invoice</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 text-right">Debit Surcharge</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Issued By</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {debitNotes.map((dn) => (
                    <tr key={dn.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {dn.debitNoteNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{dn.student?.fullName || '—'}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{dn.student?.studentCode}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {dn.invoice?.invoiceNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                        {dn.reason}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-seg-navy">
                        +{formatINR(Number(dn.amount))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="info">{dn.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {dn.issuedByName || 'Accounts Dept'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/invoices/${dn.invoiceId}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Invoice
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No debit note adjustments found matching the query.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
