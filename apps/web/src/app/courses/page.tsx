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
  Eye,
  Clock,
  IndianRupee,
  Calendar,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react';

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'courses' | 'batches'>('courses');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, batchesRes]: any = await Promise.all([
        apiClient.get('/courses'),
        apiClient.get('/batches'),
      ]);

      if (coursesRes.success && coursesRes.data) {
        setCourses(coursesRes.data.data || coursesRes.data);
      }
      if (batchesRes.success && batchesRes.data) {
        setBatches(batchesRes.data.data || batchesRes.data);
      }
    } catch (err) {
      setCourses([]);
      setBatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
            <Link href="/courses/create">
              <Button size="sm" className="bg-seg-plum text-white hover:bg-seg-plum/90 shadow-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Course
              </Button>
            </Link>
            <Link href="/batches/create">
              <Button size="sm" className="bg-seg-orange text-white hover:bg-seg-orange/90 shadow-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Batch
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-border/70">
          <button
            onClick={() => setActiveTab('courses')}
            className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 px-3 ${
              activeTab === 'courses'
                ? 'border-seg-plum text-seg-plum font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Course Catalog ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 px-3 ${
              activeTab === 'batches'
                ? 'border-seg-orange text-seg-orange font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Batch Cohorts ({batches.length})
          </button>
        </div>

        {/* Courses Tab View */}
        {activeTab === 'courses' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full p-12 text-center text-sm text-muted-foreground">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-seg-plum border-t-transparent mx-auto mb-2" />
                Loading academic courses...
              </div>
            ) : courses.length === 0 ? (
              <div className="col-span-full p-12 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40 mb-2" />
                <h3 className="font-semibold text-foreground">No courses defined</h3>
                <p className="text-xs text-muted-foreground mt-1">Get started by creating your first course offering.</p>
              </div>
            ) : (
              courses.map((c) => (
                <Card key={c.id} className="border-border/60 hover:border-seg-plum/50 transition-colors shadow-sm flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-seg-plum bg-seg-plum-subtle px-2 py-0.5 rounded">
                        {c.code}
                      </span>
                      {c.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
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
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View Batches ({c._count?.batches || 0})
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Batches Tab View */}
        {activeTab === 'batches' && (
          <Card className="border-border/60 shadow-sm overflow-hidden">
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
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        Loading batches...
                      </td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No batch cohorts currently scheduled.
                      </td>
                    </tr>
                  ) : (
                    batches.map((b) => (
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
