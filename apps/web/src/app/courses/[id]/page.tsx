'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api';
import {
  BookOpen,
  ArrowLeft,
  Clock,
  IndianRupee,
  Calendar,
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
} from 'lucide-react';

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<any | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourseAndBatches() {
      setLoading(true);
      try {
        const [courseRes, batchesRes]: any = await Promise.all([
          apiClient.get(`/courses/${courseId}`),
          apiClient.get('/batches'),
        ]);

        if (courseRes?.success && courseRes?.data) {
          setCourse(courseRes.data);
        } else {
          // Fallback search in courses catalog if direct ID endpoint is stubbed
          const allCourses: any = await apiClient.get('/courses');
          const list = allCourses?.data?.data || allCourses?.data || [];
          const found = list.find((c: any) => c.id === courseId || c.code === courseId);
          if (found) setCourse(found);
        }

        if (batchesRes?.success && batchesRes?.data) {
          const list = batchesRes.data.data || batchesRes.data || [];
          const matched = list.filter((b: any) => b.courseId === courseId || b.course?.id === courseId);
          setBatches(matched);
        }
      } catch (err) {
        console.error('Failed to load course details', err);
      } finally {
        setLoading(false);
      }
    }

    if (courseId) {
      loadCourseAndBatches();
    }
  }, [courseId]);

  if (loading) {
    return (
      <AppShell requiredPermission="courses:read">
        <div className="flex h-64 items-center justify-center">
          <p className="text-xs text-muted-foreground">Loading course syllabus and cohorts...</p>
        </div>
      </AppShell>
    );
  }

  if (!course) {
    return (
      <AppShell requiredPermission="courses:read">
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-2xs space-y-3">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
          <h2 className="text-base font-semibold text-foreground">Course Offering Not Found</h2>
          <p className="text-xs text-muted-foreground">
            No course offering matching ID: <span className="font-mono">{courseId}</span>
          </p>
          <div className="pt-2">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 rounded-lg bg-seg-plum px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-seg-plum/90"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Course Catalog</span>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell requiredPermission="courses:read">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Link
              href="/courses"
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/courses" className="hover:underline">
                  Courses
                </Link>
                <span>/</span>
                <span className="font-mono font-semibold text-seg-plum">{course.code}</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl mt-0.5">
                {course.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/batches/create?courseId=${course.id}`}>
              <Button size="sm" className="bg-seg-orange text-white hover:bg-seg-orange/90 shadow-xs h-8 text-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Schedule New Batch
              </Button>
            </Link>
          </div>
        </div>

        {/* Course Overview Dossier */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-seg-plum bg-seg-plum/10 px-2.5 py-1 rounded-md border border-seg-plum/20">
                  {course.code}
                </span>
                {course.isActive ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> Active Offering
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    <XCircle className="h-3 w-3" /> Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground leading-relaxed">
                {course.description || 'Comprehensive professional training curriculum designed for industry deployment.'}
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/20 p-4 shrink-0 sm:w-64 text-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-semibold text-foreground">{course.durationWeeks} Weeks</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Tuition Fee:</span>
                <span className="font-bold text-foreground font-mono">₹{Number(course.baseFee).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Cohorts:</span>
                <span className="font-semibold text-seg-orange">{batches.length} Scheduled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Associated Batches Section */}
        <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="border-b border-border/80 px-5 py-3.5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Associated Cohorts & Batches ({batches.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                All batch schedules and student intake rosters for this curriculum.
              </p>
            </div>
            <Link
              href={`/batches/create?courseId=${course.id}`}
              className="text-xs font-semibold text-seg-orange hover:underline inline-flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              <span>New Batch</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Batch Code</th>
                  <th className="py-3 px-4">Cohort Name</th>
                  <th className="py-3 px-4">Schedule Period</th>
                  <th className="py-3 px-4">Seat Capacity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Roster</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-muted-foreground">
                      No batch cohorts scheduled for this course yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-seg-orange whitespace-nowrap">
                        <Link href={`/batches/${b.id}`} className="hover:underline">
                          {b.batchCode}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {b.name}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground">
                        {new Date(b.startDate).toLocaleDateString()}
                        {b.endDate && ` – ${new Date(b.endDate).toLocaleDateString()}`}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-foreground">
                          {b.enrolments?.length || b._count?.enrolments || 0}
                        </span>{' '}
                        <span className="text-muted-foreground">/ {b.capacity} seats</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="rounded bg-muted px-2 py-0.5 font-semibold text-foreground text-[10px] border border-border/60">
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link href={`/batches/${b.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5">
                            <Users className="mr-1 h-3 w-3" />
                            View Roster
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
