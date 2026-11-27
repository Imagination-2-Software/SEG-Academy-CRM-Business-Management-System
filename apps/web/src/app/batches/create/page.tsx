'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { academicService, CourseSummary, CreateBatchPayload } from '@/lib/api/academic';
import { organizationService, EmployeeSummary } from '@/lib/api/organization';
import { ArrowLeft, Save, AlertCircle, BookOpen, CheckCircle2 } from 'lucide-react';

function CreateBatchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCourseId = searchParams.get('courseId');

  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseSummary | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    courseId: '',
    batchCode: '',
    name: '',
    startDate: '',
    endDate: '',
    capacity: 30,
    instructorId: '',
  });

  useEffect(() => {
    async function initialize() {
      setIsInitializing(true);
      try {
        const [coursesRes, staffRes] = await Promise.all([
          academicService.listCourses({ limit: 100, isActive: true }),
          organizationService.getEmployees().catch(() => []),
        ]);

        const courseList = coursesRes.data;
        setCourses(courseList);
        setEmployees(staffRes);

        let initialCourseId = '';
        if (preselectedCourseId) {
          const match = courseList.find((c) => c.id === preselectedCourseId);
          if (match) {
            initialCourseId = match.id;
            setSelectedCourse(match);
          } else {
            // If not found in page 1 list, attempt direct fetch
            try {
              const directCourse = await academicService.getCourseById(preselectedCourseId);
              if (directCourse) {
                setCourses((prev) => [directCourse, ...prev.filter((p) => p.id !== directCourse.id)]);
                initialCourseId = directCourse.id;
                setSelectedCourse(directCourse);
              }
            } catch {
              // Gracefully fallback to first course if preselected ID is invalid
              if (courseList.length > 0) {
                initialCourseId = courseList[0].id;
                setSelectedCourse(courseList[0]);
              }
            }
          }
        } else if (courseList.length > 0) {
          initialCourseId = courseList[0].id;
          setSelectedCourse(courseList[0]);
        }

        if (initialCourseId) {
          setFormData((prev) => ({ ...prev, courseId: initialCourseId }));
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load courses.');
      } finally {
        setIsInitializing(false);
      }
    }

    initialize();
  }, [preselectedCourseId]);

  const handleCourseChange = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId) || null;
    setSelectedCourse(course);
    setFormData((prev) => ({ ...prev, courseId }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!formData.courseId || !formData.batchCode.trim() || !formData.name.trim() || !formData.startDate) {
      setErrorMessage('Please fill in all mandatory fields.');
      return;
    }

    if (formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      setErrorMessage('End date must be after the start date.');
      return;
    }

    const capacityNum = Number(formData.capacity);
    if (isNaN(capacityNum) || capacityNum < 1 || capacityNum > 500) {
      setErrorMessage('Seat capacity must be an integer between 1 and 500.');
      return;
    }

    setIsLoading(true);

    try {
      const payload: CreateBatchPayload = {
        courseId: formData.courseId,
        batchCode: formData.batchCode.trim().toUpperCase(),
        name: formData.name.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate ? formData.endDate : undefined,
        capacity: capacityNum,
        instructorId: formData.instructorId ? formData.instructorId : undefined,
      };

      const newBatch = await academicService.createBatch(payload);

      // Successfully created -> redirect to newly created batch dossier
      if (newBatch && newBatch.id) {
        router.push(`/batches/${newBatch.id}`);
      } else {
        router.push('/batches');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to schedule batch cohort. Please check parameters.');
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-seg-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/batches">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Cohorts
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Schedule Batch Cohort
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure calendar intake dates, academic course offering, and seat limits
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Cohort Configuration</CardTitle>
            <CardDescription>
              Assign a parent academic course, schedule cohort dates, and set maximum seat limits.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Parent Course Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Parent Academic Course <span className="text-destructive">*</span>
                </label>
                {selectedCourse && (
                  <span className="text-[11px] font-mono text-seg-orange font-semibold">
                    {selectedCourse.code} • {selectedCourse.durationWeeks} weeks
                  </span>
                )}
              </div>
              <select
                name="courseId"
                value={formData.courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                required
              >
                {courses.length === 0 ? (
                  <option value="" disabled>No active courses available</option>
                ) : (
                  courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))
                )}
              </select>
              {selectedCourse && selectedCourse.description && (
                <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                  {selectedCourse.description}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Batch Code <span className="text-destructive">*</span>
                </label>
                <Input
                  name="batchCode"
                  placeholder="e.g. FSW-2026-A"
                  value={formData.batchCode}
                  onChange={handleChange}
                  required
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Seat Capacity <span className="text-destructive">*</span>
                </label>
                <Input
                  name="capacity"
                  type="number"
                  min="1"
                  max="500"
                  value={formData.capacity}
                  onChange={handleChange}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Cohort Name <span className="text-destructive">*</span>
              </label>
              <Input
                name="name"
                placeholder="e.g. Cohort Alpha Morning 2026"
                value={formData.name}
                onChange={handleChange}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Start Date <span className="text-destructive">*</span>
                </label>
                <Input
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  End Date
                </label>
                <Input
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Instructor Assignment Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Assigned Faculty / Instructor
              </label>
              <select
                name="instructorId"
                value={formData.instructorId}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
              >
                <option value="">-- No Instructor Assigned (Assign Later) --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeCode} — {emp.fullName} ({emp.jobTitle})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Optional. Can also be assigned or changed later from the cohort dossier.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 border-t border-border p-4">
            <Link href="/batches">
              <Button variant="outline" type="button" disabled={isLoading} className="h-9 text-xs">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="bg-seg-orange text-white hover:bg-seg-orange/90 h-9 text-xs shadow-xs"
              disabled={isLoading || courses.length === 0}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {isLoading ? 'Scheduling Cohort...' : 'Schedule Batch'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

export default function CreateBatchPage() {
  return (
    <AppShell requiredPermission="batches:create">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-seg-orange border-t-transparent" />
          </div>
        }
      >
        <CreateBatchForm />
      </Suspense>
    </AppShell>
  );
}
