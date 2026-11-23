'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { apiClient, ApiClientError } from '@/lib/api';
import {
  ArrowLeft,
  Users,
  Calendar,
  BookOpen,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';

export default function BatchDetailsPage() {
  const params = useParams();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchBatch = async () => {
    setIsLoading(true);
    try {
      const [batchRes, studentsRes]: any = await Promise.all([
        apiClient.get(`/batches/${batchId}`),
        apiClient.get('/students?limit=100'),
      ]);

      if (batchRes.success && batchRes.data) {
        setBatch(batchRes.data);
      }
      if (studentsRes.success && studentsRes.data) {
        const list = studentsRes.data.data || studentsRes.data;
        setStudents(list);
        if (list.length > 0) {
          setSelectedStudentId(list[0].id);
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to load batch roster.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (batchId) {
      fetchBatch();
    }
  }, [batchId]);

  const handleEnrol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    setIsEnrolling(true);
    setMessage(null);

    try {
      await apiClient.post('/enrolments', {
        studentId: selectedStudentId,
        batchId,
      });

      setMessage({ text: 'Student enrolled successfully!', type: 'success' });
      await fetchBatch();
    } catch (err: any) {
      setMessage({
        text: err instanceof ApiClientError ? err.message : 'Failed to enrol student.',
        type: 'error',
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell requiredPermission="batches:read">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-seg-orange border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (!batch) {
    return (
      <AppShell requiredPermission="batches:read">
        <div className="p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
          <h2 className="text-xl font-bold">Batch Not Found</h2>
          <Link href="/courses">
            <Button variant="outline" className="mt-4">Back to Academic Operations</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell requiredPermission="batches:read">
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center gap-3">
          <Link href="/courses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Academic Catalog
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                {batch.name}
              </h1>
              <span className="font-mono text-xs font-bold text-seg-orange bg-seg-orange-subtle px-2 py-0.5 rounded">
                {batch.batchCode}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {batch.course?.title} ({batch.course?.code})
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 rounded-md p-3 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Quick Cohort Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Enrolment Capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {batch.enrolments?.length || 0} / {batch.capacity}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {batch.capacity - (batch.enrolments?.length || 0)} seats remaining
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Schedule Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-foreground">
                {new Date(batch.startDate).toLocaleDateString()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Ends: {batch.endDate ? new Date(batch.endDate).toLocaleDateString() : 'Open cohort'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Batch Status</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="inline-block rounded bg-muted px-2.5 py-1 text-xs font-bold text-foreground">
                {batch.status}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Enrol Student Action Form */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Student Enrolment Roster</CardTitle>
                <CardDescription>
                  Enrol registered students into this active batch cohort
                </CardDescription>
              </div>

              <form onSubmit={handleEnrol} className="flex items-center gap-2">
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs w-64"
                >
                  {students.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.studentCode} - {stu.fullName}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  type="submit"
                  className="bg-seg-orange text-white hover:bg-seg-orange-hover"
                  disabled={isEnrolling || (batch.enrolments?.length || 0) >= batch.capacity}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {isEnrolling ? 'Enrolling...' : 'Enrol Student'}
                </Button>
              </form>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Enrolment #</th>
                    <th className="px-4 py-3 font-semibold">Student Code</th>
                    <th className="px-4 py-3 font-semibold">Student Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Enrolment Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!batch.enrolments || batch.enrolments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No students enrolled in this batch yet.
                      </td>
                    </tr>
                  ) : (
                    batch.enrolments.map((enr: any) => (
                      <tr key={enr.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono font-bold text-seg-plum">
                          {enr.enrolmentNumber}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {enr.student?.studentCode}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {enr.student?.fullName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {enr.student?.email}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(enr.enrolmentDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-muted px-2 py-0.5 font-bold text-foreground">
                            {enr.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
