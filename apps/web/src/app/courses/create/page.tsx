'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { apiClient, ApiClientError } from '@/lib/api';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export default function CreateCoursePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    durationWeeks: 24,
    totalCredits: 60,
    baseFee: 125000,
    currency: 'INR',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.code || !formData.title) {
      setErrorMessage('Course code and title are required.');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post('/courses', {
        code: formData.code.trim().toUpperCase(),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        durationWeeks: Number(formData.durationWeeks),
        totalCredits: Number(formData.totalCredits) || undefined,
        baseFee: Number(formData.baseFee),
        currency: formData.currency,
      });

      router.push('/courses');
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to create course. Please verify inputs.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell requiredPermission="courses:create">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/courses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Catalog
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create Course Offering
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Course Master Data</CardTitle>
              <CardDescription>
                Define the academic curriculum code, duration, credits, and tuition fee structure.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Course Code <span className="text-destructive">*</span>
                  </label>
                  <Input
                    name="code"
                    placeholder="e.g. FS-WEB-01"
                    value={formData.code}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Duration (Weeks) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    name="durationWeeks"
                    type="number"
                    min="1"
                    value={formData.durationWeeks}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Course Title <span className="text-destructive">*</span>
                </label>
                <Input
                  name="title"
                  placeholder="e.g. Full Stack Web Development"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Description / Syllabus Overview
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Summary of course objectives and technologies..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Base Tuition Fee (INR) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    name="baseFee"
                    type="number"
                    min="0"
                    value={formData.baseFee}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Total Credits
                  </label>
                  <Input
                    name="totalCredits"
                    type="number"
                    min="1"
                    value={formData.totalCredits}
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
                className="bg-seg-plum text-white hover:bg-seg-plum-hover"
                disabled={isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? 'Creating...' : 'Save Course'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </AppShell>
  );
}
