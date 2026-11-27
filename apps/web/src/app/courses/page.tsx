'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { academicService, CourseSummary, BatchSummary } from '@/lib/api/academic';
import { useAuth } from '@/lib/auth';
import {
  BookOpen,
  Plus,
  Search,
  Eye,
  Clock,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  Filter,
} from 'lucide-react';

export default function CoursesPage() {
  const { hasPermission } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<'courses' | 'batches'>('courses');

  // Courses Server-Driven State
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [coursePage, setCoursePage] = useState(1);
  const [courseLimit, setCourseLimit] = useState(12);
  const [courseTotal, setCourseTotal] = useState(0);
  const [courseTotalPages, setCourseTotalPages] = useState(1);
  const [courseStatusFilter, setCourseStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [courseSearchInput, setCourseSearchInput] = useState('');
  const [debouncedCourseSearch, setDebouncedCourseSearch] = useState('');
  const [isCoursesLoading, setIsCoursesLoading] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);

  // Batches State
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [batchSearchInput, setBatchSearchInput] = useState('');
  const [isBatchesLoading, setIsBatchesLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Request race-condition counter
  const latestCourseRequestId = useRef(0);

  // Debounce search input for courses
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCourseSearch(courseSearchInput.trim());
      setCoursePage(1); // Reset to page 1 on search change
    }, 350);

    return () => clearTimeout(timer);
  }, [courseSearchInput]);

  // Handle status filter change
  const handleStatusFilterChange = (status: 'ALL' | 'ACTIVE' | 'INACTIVE') => {
    setCourseStatusFilter(status);
    setCoursePage(1); // Reset to page 1 on filter change
  };

  // Fetch Courses with Backend Query
  const fetchCourses = useCallback(async () => {
    const requestId = ++latestCourseRequestId.current;
    setIsCoursesLoading(true);
    setCourseError(null);

    try {
      let isActiveParam: boolean | undefined = undefined;
      if (courseStatusFilter === 'ACTIVE') isActiveParam = true;
      if (courseStatusFilter === 'INACTIVE') isActiveParam = false;

      const res = await academicService.listCourses({
        page: coursePage,
        limit: courseLimit,
        search: debouncedCourseSearch || undefined,
        isActive: isActiveParam,
      });

      // Avoid race condition / stale responses
      if (requestId === latestCourseRequestId.current) {
        setCourses(res.data || []);
        setCourseTotal(res.meta?.total || 0);
        setCourseTotalPages(res.meta?.totalPages || 1);
      }
    } catch (err: any) {
      if (requestId === latestCourseRequestId.current) {
        setCourseError(err.message || 'Failed to load courses.');
        setCourses([]);
        setCourseTotal(0);
        setCourseTotalPages(1);
      }
    } finally {
      if (requestId === latestCourseRequestId.current) {
        setIsCoursesLoading(false);
      }
    }
  }, [coursePage, courseLimit, debouncedCourseSearch, courseStatusFilter]);

  // Fetch Batches
  const fetchBatches = useCallback(async () => {
    setIsBatchesLoading(true);
    setBatchError(null);
    try {
      const res = await academicService.listBatches({ limit: 100 });
      setBatches(res.data || []);
    } catch (err: any) {
      setBatchError(err.message || 'Failed to load batch cohorts.');
      setBatches([]);
    } finally {
      setIsBatchesLoading(false);
    }
  }, []);

  // Trigger course fetch when query parameters change
  useEffect(() => {
    if (activeTab === 'courses') {
      fetchCourses();
    }
  }, [fetchCourses, activeTab]);

  // Fetch batches when tab switched to batches
  useEffect(() => {
    if (activeTab === 'batches') {
      fetchBatches();
    }
  }, [fetchBatches, activeTab]);

  // Filter batches client-side for quick search in batches tab
  const filteredBatches = React.useMemo(() => {
    if (!batchSearchInput.trim()) return batches;
    const q = batchSearchInput.toLowerCase();
    return batches.filter(
      (b) =>
        b.batchCode?.toLowerCase().includes(q) ||
        b.name?.toLowerCase().includes(q) ||
        b.course?.title?.toLowerCase().includes(q) ||
        b.course?.code?.toLowerCase().includes(q)
    );
  }, [batches, batchSearchInput]);

  return (
    <AppShell requiredPermission="courses:read">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header & Quick Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Academic Operations
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage course offerings, batch capacity scheduling, and student cohort allocations
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(hasPermission('courses:create') || hasPermission('courses:write')) && (
              <Link href="/courses/create">
                <Button size="sm" className="bg-seg-plum text-white hover:bg-seg-plum/90 shadow-xs">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Course
                </Button>
              </Link>
            )}
            {(hasPermission('batches:create') || hasPermission('batches:write')) && (
              <Link href="/batches/create">
                <Button size="sm" className="bg-seg-orange text-white hover:bg-seg-orange/90 shadow-xs">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Batch
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Tab Selection & Filter Interface */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('courses')}
              className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 px-3 ${
                activeTab === 'courses'
                  ? 'border-seg-plum text-seg-plum font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Course Catalog {activeTab === 'courses' && !isCoursesLoading ? `(${courseTotal})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 px-3 ${
                activeTab === 'batches'
                  ? 'border-seg-orange text-seg-orange font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Batch Cohorts {activeTab === 'batches' && !isBatchesLoading ? `(${batches.length})` : ''}
            </button>
          </div>

          {/* Search bar & Status Filters for Courses Tab */}
          {activeTab === 'courses' ? (
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center rounded-lg border border-border/80 bg-background p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleStatusFilterChange('ALL')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    courseStatusFilter === 'ALL'
                      ? 'bg-seg-plum text-white shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusFilterChange('ACTIVE')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    courseStatusFilter === 'ACTIVE'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusFilterChange('INACTIVE')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    courseStatusFilter === 'INACTIVE'
                      ? 'bg-muted-foreground text-white shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Inactive
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search courses by code or title..."
                  value={courseSearchInput}
                  onChange={(e) => setCourseSearchInput(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search cohorts by code, name or course..."
                value={batchSearchInput}
                onChange={(e) => setBatchSearchInput(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          )}
        </div>

        {/* Courses Tab View */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            {/* Error State */}
            {courseError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{courseError}</span>
                </div>
                <Button size="sm" variant="outline" onClick={fetchCourses} className="h-7 text-xs">
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Retry
                </Button>
              </div>
            )}

            {/* Courses Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {isCoursesLoading ? (
                <div className="col-span-full p-12 text-center text-sm text-muted-foreground">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-seg-plum border-t-transparent mx-auto mb-2" />
                  Loading academic courses from catalog...
                </div>
              ) : courses.length === 0 ? (
                <div className="col-span-full p-12 text-center border border-dashed border-border rounded-xl">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40 mb-2" />
                  <h3 className="font-semibold text-foreground">
                    {courseSearchInput || courseStatusFilter !== 'ALL'
                      ? 'No matching course offerings'
                      : 'No courses in catalog'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {courseSearchInput || courseStatusFilter !== 'ALL'
                      ? 'No courses matched your search or status filter. Try clearing filters.'
                      : 'Get started by creating your first course offering.'}
                  </p>
                  {(courseSearchInput || courseStatusFilter !== 'ALL') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 text-xs"
                      onClick={() => {
                        setCourseSearchInput('');
                        setCourseStatusFilter('ALL');
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                courses.map((c) => (
                  <Card
                    key={c.id}
                    className="border-border/60 hover:border-seg-plum/50 transition-colors shadow-2xs flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-seg-plum bg-seg-plum/10 border border-seg-plum/20 px-2 py-0.5 rounded">
                          {c.code}
                        </span>
                        {c.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-base mt-2">{c.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <p className="text-muted-foreground line-clamp-2">
                        {c.description || 'No detailed syllabus summary provided.'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-seg-orange" />
                          <span>{c.durationWeeks} weeks</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <IndianRupee className="h-3.5 w-3.5 text-seg-yellow" />
                          <span>₹{Number(c.baseFee).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <Link href={`/courses/${c.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            aria-label={`View Course Offerings and Batches for ${c.title}`}
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                            View Batches ({c._count?.batches || 0})
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Server-Side Pagination Bar */}
            {!isCoursesLoading && courses.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 pt-4 px-1 text-xs">
                <div className="text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{(coursePage - 1) * courseLimit + 1}</span> to{' '}
                  <span className="font-semibold text-foreground">
                    {Math.min(coursePage * courseLimit, courseTotal)}
                  </span>{' '}
                  of <span className="font-semibold text-foreground">{courseTotal}</span> courses
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-2">
                    <span className="text-muted-foreground text-[11px]">Rows per page:</span>
                    <select
                      value={courseLimit}
                      onChange={(e) => {
                        setCourseLimit(Number(e.target.value));
                        setCoursePage(1);
                      }}
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value={6}>6</option>
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                    </select>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-2.5"
                    disabled={coursePage <= 1 || isCoursesLoading}
                    onClick={() => setCoursePage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Previous
                  </Button>

                  <span className="text-xs font-semibold px-2">
                    Page {coursePage} of {courseTotalPages}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-2.5"
                    disabled={coursePage >= courseTotalPages || isCoursesLoading}
                    onClick={() => setCoursePage((p) => Math.min(courseTotalPages, p + 1))}
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Batches Tab View */}
        {activeTab === 'batches' && (
          <Card className="border-border/60 shadow-2xs overflow-hidden">
            {batchError && (
              <div className="border-b border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between">
                <span>{batchError}</span>
                <Button size="sm" variant="outline" onClick={fetchBatches} className="h-6 text-xs">
                  Retry
                </Button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 uppercase text-xs text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3.5 font-bold">Batch Code</th>
                    <th className="px-6 py-3.5 font-bold">Cohort Name</th>
                    <th className="px-6 py-3.5 font-bold">Course</th>
                    <th className="px-6 py-3.5 font-bold">Dates</th>
                    <th className="px-6 py-3.5 font-bold">Capacity</th>
                    <th className="px-6 py-3.5 font-bold">Status</th>
                    <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isBatchesLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground text-xs">
                        Loading batches...
                      </td>
                    </tr>
                  ) : filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground text-xs">
                        {batchSearchInput
                          ? `No batch cohorts matching "${batchSearchInput}".`
                          : 'No batch cohorts currently scheduled.'}
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-seg-orange">
                          {b.batchCode}
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">{b.name}</td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {b.course?.title || b.course?.code}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {new Date(b.startDate).toLocaleDateString()}
                          {b.endDate && ` - ${new Date(b.endDate).toLocaleDateString()}`}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className="font-semibold text-foreground">
                            {b._count?.enrolments || 0} / {b.capacity}
                          </span>{' '}
                          students
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className="rounded bg-muted px-2 py-0.5 font-semibold text-foreground">
                            {b.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/batches/${b.id}`}>
                            <Button size="sm" variant="outline" className="h-8">
                              <Users className="mr-1.5 h-3.5 w-3.5" />
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
          </Card>
        )}
      </div>
    </AppShell>
  );
}
