'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { apiClient, ApiClientError } from '@/lib/api';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export default function CreateBatchPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    courseId: '',
    batchCode: '',
    name: '',
    startDate: '',
    endDate: '',
    capacity: 30,
  });

  useEffect(() => {
    async function loadCourses() {
      try {
        const res: any = await apiClient.get('/courses');
        if (res.success && res.data) {
          const list = res.data.data || res.data;
          setCourses(list);
          if (list.length > 0) {
            setFormData((prev) => ({ ...prev, courseId: list[0].id }));
          }
        }
      } catch (err) {
        setCourses([]);
      }
    }
    loadCourses();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.courseId || !formData.batchCode || !formData.name || !formData.startDate) {
      setErrorMessage('Please fill in all mandatory fields.');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post('/batches', {
        courseId: formData.courseId,
        batchCode: formData.batchCode.trim().toUpperCase(),
        name: formData.name.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        capacity: Number(formData.capacity),
      });

      router.push('/courses');
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to schedule batch. Please check dates and parameters.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell requiredPermission="batches:create">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/courses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Schedule Batch Cohort
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Cohort Configuration</CardTitle>
              <CardDescription>
                Assign a parent course, schedule calendar dates, and set maximum student seat limits.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Parent Academic Course <span className="text-destructive">*</span>
                </label>
                <select
                  name="courseId"
                  value={formData.courseId}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
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
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-3 border-t border-border p-4">
              <Link href="/courses">
                <Button variant="outline" type="button" disabled={isLoading}>
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                className="bg-seg-orange text-white hover:bg-seg-orange-hover"
                disabled={isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? 'Scheduling...' : 'Create Batch'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </AppShell>
  );
}
