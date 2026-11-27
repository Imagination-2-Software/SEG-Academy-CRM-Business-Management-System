'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { academicService, CourseSummary, BatchSummary, UpdateCoursePayload } from '@/lib/api/academic';
import { useAuth } from '@/lib/auth';
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
  Edit,
  X,
  Loader2,
  Save,
} from 'lucide-react';

export default function CourseDetailsPage() {
  const { hasPermission } = useAuth();
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseSummary | null>(null);
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateCoursePayload>({
    title: '',
    description: '',
    durationWeeks: 24,
    totalCredits: 60,
    baseFee: 125000,
    isActive: true,
  });

  const canUpdateCourse = hasPermission('courses:update');

  const loadCourseAndBatches = async () => {
    setLoading(true);
    try {
      const courseData = await academicService.getCourseById(courseId);
      setCourse(courseData);
      if (courseData.batches && Array.isArray(courseData.batches)) {
        setBatches(courseData.batches);
      } else {
        const batchesRes = await academicService.listBatches({ courseId, limit: 100 });
        setBatches(batchesRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load course details', err);
      setCourse(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      loadCourseAndBatches();
    }
  }, [courseId]);

  const handleOpenEditModal = () => {
    if (!course) return;
    setEditFormData({
      title: course.title,
      description: course.description || '',
      durationWeeks: course.durationWeeks,
      totalCredits: course.totalCredits ?? undefined,
      baseFee: Number(course.baseFee),
      isActive: course.isActive,
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'isActive') {
      setEditFormData((prev) => ({ ...prev, isActive: value === 'true' }));
    } else if (name === 'durationWeeks' || name === 'totalCredits' || name === 'baseFee') {
      setEditFormData((prev) => ({
        ...prev,
        [name]: value === '' ? undefined : Number(value),
      }));
    } else {
      setEditFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    if (!editFormData.title?.trim()) {
      setEditError('Course title is required.');
      return;
    }

    if (!editFormData.durationWeeks || editFormData.durationWeeks < 1) {
      setEditError('Duration in weeks must be at least 1.');
      return;
    }

    if (editFormData.baseFee === undefined || editFormData.baseFee < 0) {
      setEditError('Base fee must be a valid non-negative number.');
      return;
    }

    setIsUpdating(true);
    setEditError(null);
    setSuccessMessage(null);

    try {
      const payload: UpdateCoursePayload = {
        title: editFormData.title.trim(),
        description: editFormData.description?.trim() || undefined,
        durationWeeks: Number(editFormData.durationWeeks),
        totalCredits: editFormData.totalCredits !== undefined ? Number(editFormData.totalCredits) : undefined,
        baseFee: Number(editFormData.baseFee),
        isActive: editFormData.isActive,
      };

      const updated = await academicService.updateCourse(courseId, payload);
      setCourse((prev) => (prev ? { ...prev, ...updated } : updated));
      setIsEditModalOpen(false);
      setSuccessMessage('Course curriculum & pricing updated successfully.');
      await loadCourseAndBatches();
    } catch (err: any) {
      console.error('Failed to update course:', err);
      setEditError(err.message || 'Failed to update course. Please check inputs.');
    } finally {
      setIsUpdating(false);
    }
  };

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
            {canUpdateCourse && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenEditModal}
                className="h-8 text-xs font-semibold text-foreground border-border hover:bg-muted"
              >
                <Edit className="mr-1.5 h-3.5 w-3.5 text-seg-plum" />
                Edit Course
              </Button>
            )}
            <Link href={`/batches/create?courseId=${course.id}`}>
              <Button size="sm" className="bg-seg-orange text-white hover:bg-seg-orange/90 shadow-xs h-8 text-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Schedule New Batch
              </Button>
            </Link>
          </div>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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
        {/* Edit Course Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/80 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-seg-plum/10 text-seg-plum">
                    <Edit className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Edit Course Offering</h3>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {course.code} &bull; {course.currency}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveCourse} className="p-5 overflow-y-auto space-y-4 text-xs">
                {editError && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive border border-destructive/20">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Course Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={editFormData.title || ''}
                    onChange={handleEditChange}
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Course Curriculum Summary & Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    value={editFormData.description || ''}
                    onChange={handleEditChange}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Duration (Weeks) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      name="durationWeeks"
                      min={1}
                      max={200}
                      value={editFormData.durationWeeks ?? ''}
                      onChange={handleEditChange}
                      required
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Academic Credits
                    </label>
                    <input
                      type="number"
                      name="totalCredits"
                      min={0}
                      value={editFormData.totalCredits ?? ''}
                      onChange={handleEditChange}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Base Tuition Fee (₹) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      name="baseFee"
                      min={0}
                      step="any"
                      value={editFormData.baseFee ?? ''}
                      onChange={handleEditChange}
                      required
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Catalog Status <span className="text-destructive">*</span>
                    </label>
                    <select
                      name="isActive"
                      value={editFormData.isActive ? 'true' : 'false'}
                      onChange={handleEditChange}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden font-medium"
                    >
                      <option value="true">Active (Accepting Cohorts)</option>
                      <option value="false">Inactive (Archived)</option>
                    </select>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/80">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-seg-plum px-4 py-2 text-xs font-semibold text-white hover:bg-seg-plum/90 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Save Course Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
