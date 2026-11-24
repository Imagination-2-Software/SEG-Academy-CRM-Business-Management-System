'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import {
  BookOpen,
  Plus,
  Search,
  Users,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function BatchesDirectoryPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const res: any = await apiClient.get('/batches');
      if (res?.success && res?.data) {
        setBatches(Array.isArray(res.data) ? res.data : res.data.data || []);
      }
    } catch {
      setBatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.batchCode?.toLowerCase().includes(search.toLowerCase()) ||
      b.course?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <AppShell requiredPermission="batches:read">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header with Creation CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Batch Cohorts
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Monitor active student cohorts, intake dates, and seat capacity schedules
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/courses">
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                Course Catalog
              </Button>
            </Link>
            <Link href="/batches/create">
              <Button size="sm" className="bg-seg-orange text-white hover:bg-seg-orange/90 shadow-xs h-8 text-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Schedule Batch
              </Button>
            </Link>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="rounded-xl border border-border/70 bg-card p-3 shadow-xs">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by cohort name, batch code, or course..."
                className="pl-8 h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input/80 bg-background px-3 text-xs"
              >
                <option value="ALL">All Cohort Statuses</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Batches Table View */}
        <div className="rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/70 bg-muted/30 uppercase text-[11px] font-semibold text-muted-foreground/80 tracking-wider">
                <tr>
                  <th className="px-5 py-3">Batch Code</th>
                  <th className="px-5 py-3">Cohort Name</th>
                  <th className="px-5 py-3">Course Offering</th>
                  <th className="px-5 py-3">Schedule Period</th>
                  <th className="px-5 py-3">Capacity</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-seg-orange border-t-transparent" />
                        Loading batch cohorts...
                      </div>
                    </td>
                  </tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center">
                      <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                      <h3 className="text-xs font-semibold text-foreground">No batch cohorts found</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Adjust your filters or schedule a new cohort.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-seg-orange">
                        <span className="rounded bg-seg-orange/5 px-2 py-0.5 border border-seg-orange/15">
                          {b.batchCode}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-foreground">
                        <Link href={`/batches/${b.id}`} className="hover:underline">
                          {b.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {b.course?.name || b.course?.courseCode || 'Full-Stack Bootcamp'}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground space-y-0.5">
                        <div>{new Date(b.startDate).toLocaleDateString()}</div>
                        {b.endDate && <div className="text-[11px] text-muted-foreground/80">to {new Date(b.endDate).toLocaleDateString()}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-foreground">
                          {b.enrolments?.length || b._count?.enrolments || 0}
                        </span>{' '}
                        <span className="text-muted-foreground">/ {b.capacity} seats</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-foreground border border-border/50">
                          {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/batches/${b.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5">
                            <Users className="mr-1 h-3 w-3" />
                            Roster
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
