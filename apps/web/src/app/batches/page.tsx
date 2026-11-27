'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  academicService,
  BatchSummary,
  CourseSummary,
} from '@/lib/api/academic';
import {
  BookOpen,
  Plus,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Calendar,
  Layers,
} from 'lucide-react';

export default function BatchesDirectoryPage() {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter & Pagination States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [totalBatches, setTotalBatches] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Request race-condition counter
  const requestCounterRef = useRef(0);

  // Load courses once for the course filter dropdown
  useEffect(() => {
    async function loadCourseCatalog() {
      try {
        const res = await academicService.listCourses({ limit: 100 });
        setCourses(res.data);
      } catch {
        setCourses([]);
      }
    }
    loadCourseCatalog();
  }, []);

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset to page 1 whenever search, status, or course filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, courseFilter]);

  // Fetch batches with server-side query parameters
  const fetchBatches = useCallback(async () => {
    const currentRequestId = ++requestCounterRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await academicService.listBatches({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        courseId: courseFilter === 'ALL' ? undefined : courseFilter,
      });

      // Ignore response if a newer query was fired in the meantime
      if (currentRequestId !== requestCounterRef.current) return;

      setBatches(res.data);
      setTotalBatches(res.meta.total);
      setTotalPages(res.meta.totalPages || 1);
    } catch (err: any) {
      if (currentRequestId !== requestCounterRef.current) return;
      setErrorMessage(err.message || 'Failed to retrieve batch cohorts.');
      setBatches([]);
      setTotalBatches(0);
      setTotalPages(1);
    } finally {
      if (currentRequestId === requestCounterRef.current) {
        setIsLoading(false);
      }
    }
  }, [page, limit, debouncedSearch, statusFilter, courseFilter]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

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
                placeholder="Search by cohort name or batch code..."
                className="pl-8 h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Course Offering Filter */}
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="h-9 rounded-md border border-input/80 bg-background px-3 text-xs max-w-[200px] truncate"
              >
                <option value="ALL">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input/80 bg-background px-3 text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Page size limit */}
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input/80 bg-background px-2.5 text-xs text-muted-foreground"
              >
                <option value={6}>6 / page</option>
                <option value={12}>12 / page</option>
                <option value={24}>24 / page</option>
                <option value={48}>48 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error State Banner with Retry */}
        {errorMessage && (
          <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchBatches()}
              className="h-7 text-xs border-destructive/30 hover:bg-destructive/10"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          </div>
        )}

        {/* Batches Table View */}
        <div className="rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/70 bg-muted/30 uppercase text-[11px] font-semibold text-muted-foreground/80 tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3">Batch Code</th>
                  <th scope="col" className="px-5 py-3">Cohort Name</th>
                  <th scope="col" className="px-5 py-3">Course Offering</th>
                  <th scope="col" className="px-5 py-3">Schedule Period</th>
                  <th scope="col" className="px-5 py-3">Capacity</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-seg-orange border-t-transparent" />
                        Loading batch cohorts...
                      </div>
                    </td>
                  </tr>
                ) : batches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                      <h3 className="text-xs font-semibold text-foreground">No batch cohorts found</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {debouncedSearch || statusFilter !== 'ALL' || courseFilter !== 'ALL'
                          ? 'Try adjusting your search terms or filter selections.'
                          : 'No cohorts scheduled yet. Click "Schedule Batch" to create one.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => {
                    const enrolled = b.enrolments?.length || b._count?.enrolments || 0;
                    return (
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
                          {b.course?.title || b.course?.code || 'Academic Offering'}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground space-y-0.5">
                          <div>{new Date(b.startDate).toLocaleDateString()}</div>
                          {b.endDate && (
                            <div className="text-[11px] text-muted-foreground/80">
                              to {new Date(b.endDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-foreground">
                            {enrolled}
                          </span>{' '}
                          <span className="text-muted-foreground">/ {b.capacity} seats</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              b.status === 'UPCOMING'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                                : b.status === 'ONGOING'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                : b.status === 'COMPLETED'
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Bar */}
          {!isLoading && totalBatches > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-5 py-3 border-t border-border/70 bg-muted/10 text-xs">
              <div className="text-muted-foreground">
                Showing{' '}
                <span className="font-medium text-foreground">
                  {(page - 1) * limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium text-foreground">
                  {Math.min(page * limit, totalBatches)}
                </span>{' '}
                of <span className="font-medium text-foreground">{totalBatches}</span> cohorts
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1 || isLoading}
                  className="h-8 px-2.5 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>

                <span className="px-2 font-medium text-foreground">
                  Page {page} of {totalPages}
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="h-8 px-2.5 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
