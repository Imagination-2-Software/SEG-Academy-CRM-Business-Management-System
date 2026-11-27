'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  academicService,
  BatchSummary,
  EnrolmentStatus,
  EnrolmentSummary,
  UpdateBatchPayload,
  UpdateEnrolmentStatusPayload,
} from '@/lib/api/academic';
import { studentsService, StudentSummary } from '@/lib/api/students';
import { organizationService, EmployeeSummary } from '@/lib/api/organization';
import { useAuth } from '@/lib/auth';
import {
  ArrowLeft,
  Users,
  Calendar,
  BookOpen,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  X,
  Award,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export default function BatchDetailsPage() {
  const { hasPermission } = useAuth();
  const params = useParams();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<BatchSummary | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit Batch Modal State
  const [isEditBatchOpen, setIsEditBatchOpen] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [editBatchError, setEditBatchError] = useState<string | null>(null);
  const [batchFormData, setBatchFormData] = useState<{
    name: string;
    startDate: string;
    endDate: string;
    capacity: number;
    status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
    instructorId: string;
  }>({
    name: '',
    startDate: '',
    endDate: '',
    capacity: 30,
    status: 'UPCOMING',
    instructorId: '',
  });

  // Update Enrolment Status Modal State
  const [selectedEnrolment, setSelectedEnrolment] = useState<EnrolmentSummary | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusModalError, setStatusModalError] = useState<string | null>(null);
  const [enrolmentFormData, setEnrolmentFormData] = useState<{
    status: EnrolmentStatus;
    finalGrade: string;
    completionDate: string;
  }>({
    status: 'ENROLLED',
    finalGrade: '',
    completionDate: '',
  });

  const fetchBatch = async () => {
    setIsLoading(true);
    try {
      const [batchData, studentsData] = await Promise.all([
        academicService.getBatchById(batchId),
        studentsService.getStudents({ limit: 100 }),
      ]);

      setBatch(batchData);
      setStudents(studentsData.data);
      if (studentsData.data.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentsData.data[0].id);
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

  // Lazy-load employees for instructor assignment when edit modal is opened
  const loadEmployeesForInstructor = async () => {
    if (employees.length === 0) {
      try {
        const staff = await organizationService.getEmployees();
        setEmployees(staff);
      } catch {
        // Fallback gracefully if staff list cannot be retrieved
        setEmployees([]);
      }
    }
  };

  const openEditBatchModal = () => {
    if (!batch) return;
    setBatchFormData({
      name: batch.name || '',
      startDate: batch.startDate ? new Date(batch.startDate).toISOString().slice(0, 10) : '',
      endDate: batch.endDate ? new Date(batch.endDate).toISOString().slice(0, 10) : '',
      capacity: batch.capacity || 30,
      status: batch.status || 'UPCOMING',
      instructorId: batch.instructorId || '',
    });
    setEditBatchError(null);
    setIsEditBatchOpen(true);
    loadEmployeesForInstructor();
  };

  const handleUpdateBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;
    setEditBatchError(null);

    // Validation
    if (!batchFormData.name.trim()) {
      setEditBatchError('Cohort name is required.');
      return;
    }
    if (!batchFormData.startDate) {
      setEditBatchError('Start date is required.');
      return;
    }
    if (batchFormData.endDate && new Date(batchFormData.endDate) <= new Date(batchFormData.startDate)) {
      setEditBatchError('End date must be after the start date.');
      return;
    }
    const currentEnrolmentCount = batch.enrolments?.length || 0;
    if (batchFormData.capacity < currentEnrolmentCount) {
      setEditBatchError(
        `Capacity cannot be set lower than the current enrolled student count (${currentEnrolmentCount}).`,
      );
      return;
    }
    if (batchFormData.capacity < 1 || batchFormData.capacity > 500) {
      setEditBatchError('Capacity must be between 1 and 500 seats.');
      return;
    }

    setIsSavingBatch(true);
    try {
      const payload: UpdateBatchPayload = {
        name: batchFormData.name.trim(),
        startDate: batchFormData.startDate,
        endDate: batchFormData.endDate || undefined,
        capacity: Number(batchFormData.capacity),
        status: batchFormData.status,
        instructorId: batchFormData.instructorId || undefined,
      };

      await academicService.updateBatch(batch.id, payload);
      setMessage({ text: 'Batch cohort details updated successfully!', type: 'success' });
      setIsEditBatchOpen(false);
      await fetchBatch();
    } catch (err: any) {
      setEditBatchError(err.message || 'Failed to update batch details.');
    } finally {
      setIsSavingBatch(false);
    }
  };

  const openStatusModal = (enrolment: EnrolmentSummary) => {
    setSelectedEnrolment(enrolment);
    setEnrolmentFormData({
      status: enrolment.status,
      finalGrade: enrolment.finalGrade || '',
      completionDate: enrolment.completionDate
        ? new Date(enrolment.completionDate).toISOString().slice(0, 10)
        : '',
    });
    setStatusModalError(null);
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrolment) return;
    setStatusModalError(null);

    setIsSavingStatus(true);
    try {
      const payload: UpdateEnrolmentStatusPayload = {
        status: enrolmentFormData.status,
        finalGrade: enrolmentFormData.finalGrade.trim() || undefined,
        completionDate: enrolmentFormData.completionDate || undefined,
      };

      await academicService.updateEnrolmentStatus(selectedEnrolment.id, payload);
      setMessage({
        text: `Enrolment for ${selectedEnrolment.student?.fullName || 'student'} updated to ${enrolmentFormData.status}.`,
        type: 'success',
      });
      setIsStatusModalOpen(false);
      setSelectedEnrolment(null);
      await fetchBatch();
    } catch (err: any) {
      setStatusModalError(err.message || 'Failed to update enrolment status.');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleEnrol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    setIsEnrolling(true);
    setMessage(null);

    try {
      await academicService.enrolStudent({
        studentId: selectedStudentId,
        batchId,
      });

      setMessage({ text: 'Student enrolled successfully!', type: 'success' });
      await fetchBatch();
    } catch (err: any) {
      setMessage({
        text: err.message || 'Failed to enrol student into cohort.',
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
        <div className="p-8 text-center max-w-md mx-auto">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
          <h2 className="text-xl font-bold">Batch Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1">
            The requested batch cohort does not exist or has been removed.
          </p>
          <Link href="/courses">
            <Button variant="outline" className="mt-4">
              Back to Academic Operations
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const enrolledCount = batch.enrolments?.length || 0;
  const isCapacityReached = enrolledCount >= batch.capacity;

  return (
    <AppShell requiredPermission="batches:read">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-3">
            <Link href="/batches">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Cohorts
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {batch.name}
                </h1>
                <span className="font-mono text-xs font-bold text-seg-orange bg-seg-orange-subtle px-2 py-0.5 rounded">
                  {batch.batchCode}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                    batch.status === 'UPCOMING'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                      : batch.status === 'ONGOING'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                      : batch.status === 'COMPLETED'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {batch.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {batch.course?.title} ({batch.course?.code})
                {batch.instructor?.user?.fullName && (
                  <span className="ml-2 font-medium text-foreground">
                    • Instructor: {batch.instructor.user.fullName} ({batch.instructor.jobTitle})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/courses/${batch.courseId}`}>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                Course Dossier
              </Button>
            </Link>

            {hasPermission('batches:update') && (
              <Button
                size="sm"
                variant="outline"
                onClick={openEditBatchModal}
                className="h-8 text-xs border-seg-orange/30 text-seg-orange hover:bg-seg-orange/10"
              >
                <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                Edit Batch
              </Button>
            )}
          </div>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 rounded-md p-3 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
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
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="border-border/60">
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs font-medium text-muted-foreground">Enrolment Capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {enrolledCount} / {batch.capacity}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {batch.capacity - enrolledCount} seats remaining
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-1.5">
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
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs font-medium text-muted-foreground">Assigned Instructor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-foreground truncate">
                {batch.instructor?.user?.fullName || 'Unassigned'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {batch.instructor ? `${batch.instructor.employeeCode} • ${batch.instructor.jobTitle}` : 'Assign via Edit Batch'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs font-medium text-muted-foreground">Batch Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-foreground">
                {batch.status}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {batch.status === 'UPCOMING' && 'Intake in progress'}
                {batch.status === 'ONGOING' && 'Classes active'}
                {batch.status === 'COMPLETED' && 'Graduated cohort'}
                {batch.status === 'CANCELLED' && 'Terminated'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Enrol Student Action Form & Roster */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Student Enrolment Roster</CardTitle>
                <CardDescription>
                  Enrol registered students into this active batch cohort and manage academic progression.
                </CardDescription>
              </div>

              {hasPermission('enrolments:create') && (
                <form onSubmit={handleEnrol} className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs w-64"
                    disabled={isCapacityReached || isEnrolling}
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
                    className="bg-seg-orange text-white hover:bg-seg-orange/90 h-9 text-xs shadow-xs"
                    disabled={isEnrolling || isCapacityReached || students.length === 0}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {isEnrolling ? 'Enrolling...' : isCapacityReached ? 'Capacity Full' : 'Enrol Student'}
                  </Button>
                </form>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border/70">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 uppercase text-muted-foreground text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Enrolment #</th>
                    <th className="px-4 py-3 font-semibold">Student Code</th>
                    <th className="px-4 py-3 font-semibold">Student Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Enrolment Date</th>
                    <th className="px-4 py-3 font-semibold">Grade</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    {hasPermission('enrolments:update') && (
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!batch.enrolments || batch.enrolments.length === 0 ? (
                    <tr>
                      <td colSpan={hasPermission('enrolments:update') ? 8 : 7} className="p-8 text-center text-muted-foreground">
                        No students enrolled in this batch yet.
                      </td>
                    </tr>
                  ) : (
                    batch.enrolments.map((enr: EnrolmentSummary) => (
                      <tr key={enr.id} className="hover:bg-muted/20 transition-colors">
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
                          {enr.finalGrade ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <Award className="h-3 w-3" />
                              {enr.finalGrade}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              enr.status === 'APPLIED'
                                ? 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-300'
                                : enr.status === 'ENROLLED'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                                : enr.status === 'ON_HOLD'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                                : enr.status === 'GRADUATED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                            }`}
                          >
                            {enr.status}
                          </span>
                        </td>
                        {hasPermission('enrolments:update') && (
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openStatusModal(enr)}
                              className="h-7 text-xs px-2.5"
                            >
                              <ShieldCheck className="mr-1 h-3 w-3" />
                              Update Status
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Batch Modal */}
        {isEditBatchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-seg-orange" />
                  <h3 className="text-lg font-bold text-foreground">Edit Batch Cohort</h3>
                </div>
                <button
                  onClick={() => !isSavingBatch && setIsEditBatchOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {editBatchError && (
                <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editBatchError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateBatchSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Cohort Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={batchFormData.name}
                    onChange={(e) => setBatchFormData({ ...batchFormData, name: e.target.value })}
                    required
                    placeholder="e.g. Cohort Alpha Morning 2026"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Start Date <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="date"
                      value={batchFormData.startDate}
                      onChange={(e) => setBatchFormData({ ...batchFormData, startDate: e.target.value })}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">End Date</label>
                    <Input
                      type="date"
                      value={batchFormData.endDate}
                      onChange={(e) => setBatchFormData({ ...batchFormData, endDate: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Seat Capacity <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="500"
                      value={batchFormData.capacity}
                      onChange={(e) => setBatchFormData({ ...batchFormData, capacity: Number(e.target.value) })}
                      required
                      className="h-9 text-xs"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Current enrolled: {enrolledCount} students
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Batch Status <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={batchFormData.status}
                      onChange={(e: any) => setBatchFormData({ ...batchFormData, status: e.target.value })}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value="UPCOMING">UPCOMING</option>
                      <option value="ONGOING">ONGOING</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Assigned Instructor</label>
                  <select
                    value={batchFormData.instructorId}
                    onChange={(e) => setBatchFormData({ ...batchFormData, instructorId: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="">-- No Instructor Assigned --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} - {emp.fullName} ({emp.jobTitle})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditBatchOpen(false)}
                    disabled={isSavingBatch}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-seg-orange text-white hover:bg-seg-orange/90"
                    disabled={isSavingBatch}
                  >
                    {isSavingBatch ? 'Saving Changes...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update Enrolment Status Modal */}
        {isStatusModalOpen && selectedEnrolment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-seg-orange" />
                  <h3 className="text-lg font-bold text-foreground">Update Enrolment Status</h3>
                </div>
                <button
                  onClick={() => !isSavingStatus && setIsStatusModalOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                <div>
                  <span className="font-semibold text-foreground">Student:</span>{' '}
                  {selectedEnrolment.student?.fullName} ({selectedEnrolment.student?.studentCode})
                </div>
                <div>
                  <span className="font-semibold text-foreground">Enrolment #:</span>{' '}
                  <span className="font-mono text-seg-plum font-bold">{selectedEnrolment.enrolmentNumber}</span>
                </div>
              </div>

              {statusModalError && (
                <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{statusModalError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Enrolment Progression Status <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={enrolmentFormData.status}
                    onChange={(e: any) => setEnrolmentFormData({ ...enrolmentFormData, status: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                    required
                  >
                    <option value="APPLIED">APPLIED</option>
                    <option value="ENROLLED">ENROLLED</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="GRADUATED">GRADUATED</option>
                    <option value="DROPPED">DROPPED</option>
                    <option value="WITHDRAWN">WITHDRAWN</option>
                  </select>
                </div>

                {enrolmentFormData.status === 'GRADUATED' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Final Academic Grade
                      </label>
                      <Input
                        value={enrolmentFormData.finalGrade}
                        onChange={(e) => setEnrolmentFormData({ ...enrolmentFormData, finalGrade: e.target.value })}
                        placeholder="e.g. A+, A, 92%, Distinction"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Graduation Date
                      </label>
                      <Input
                        type="date"
                        value={enrolmentFormData.completionDate}
                        onChange={(e) => setEnrolmentFormData({ ...enrolmentFormData, completionDate: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsStatusModalOpen(false)}
                    disabled={isSavingStatus}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-seg-orange text-white hover:bg-seg-orange/90"
                    disabled={isSavingStatus}
                  >
                    {isSavingStatus ? 'Updating...' : 'Update Status'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
