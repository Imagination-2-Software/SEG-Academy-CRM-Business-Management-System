'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudents = async (targetPage = 1, searchTerm = '') => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: targetPage.toString(),
        limit: limit.toString(),
      });
      if (searchTerm) query.append('search', searchTerm);

      const res: any = await apiClient.get(`/students?${query.toString()}`);
      if (res.success && res.data) {
        if (Array.isArray(res.data)) {
          setStudents(res.data);
          if (res.meta) {
            setTotal(res.meta.total || 0);
            setTotalPages(res.meta.totalPages || 1);
            setPage(res.meta.page || targetPage);
          }
        } else if (res.data.data) {
          setStudents(res.data.data);
          if (res.data.meta) {
            setTotal(res.data.meta.total || 0);
            setTotalPages(res.data.meta.totalPages || 1);
            setPage(res.data.meta.page || targetPage);
          }
        }
      }
    } catch (err) {
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(1, search);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(1, search);
  };

  return (
    <AppShell requiredPermission="students:read">
      <div className="space-y-6">
        {/* Header with Registration CTA */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              Student Directory
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage student registrations, profile records, and KYC document verifications
            </p>
          </div>
          <Link href="/students/register">
            <Button className="bg-seg-plum text-white hover:bg-seg-plum-hover">
              <Plus className="mr-2 h-4 w-4" />
              Register Student
            </Button>
          </Link>
        </div>

        {/* Search & Filter Toolbar */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, student code, or phone..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="submit" variant="default" className="bg-seg-plum text-white hover:bg-seg-plum-hover">
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5 font-bold">Code</th>
                  <th className="px-6 py-3.5 font-bold">Full Name</th>
                  <th className="px-6 py-3.5 font-bold">Contact</th>
                  <th className="px-6 py-3.5 font-bold">Location</th>
                  <th className="px-6 py-3.5 font-bold">Documents</th>
                  <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
                        Loading student records...
                      </div>
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                      <h3 className="font-semibold text-foreground">No students found</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your search query or register a new student.
                      </p>
                    </td>
                  </tr>
                ) : (
                  students.map((stu) => (
                    <tr key={stu.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-seg-plum">
                        {stu.studentCode}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {stu.fullName}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        <div>{stu.email}</div>
                        <div>{stu.phoneNumber || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {stu.city ? `${stu.city}, ${stu.country || 'India'}` : (stu.country || '-')}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-medium text-foreground">
                          <FileText className="h-3 w-3 text-seg-orange" />
                          {stu._count?.documents || 0} files
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/students/${stu.id}`}>
                          <Button size="sm" variant="outline" className="h-8">
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-border px-6 py-3 text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages} ({total} total students)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchStudents(page - 1, search)}
                disabled={page <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchStudents(page + 1, search)}
                disabled={page >= totalPages || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
