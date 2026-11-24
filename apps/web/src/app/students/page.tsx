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
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header with Registration CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Student Directory
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage student registrations, profile records, and KYC document verifications
            </p>
          </div>
          <Link href="/students/register">
            <Button size="sm" className="bg-seg-plum text-white hover:bg-seg-plum/90 shadow-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Register Student
            </Button>
          </Link>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="rounded-xl border border-border/70 bg-card p-3 shadow-xs">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, student code, or phone..."
                className="pl-8 h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" className="bg-seg-plum text-white hover:bg-seg-plum/90 h-9 px-4 text-xs font-semibold">
              Search
            </Button>
          </form>
        </div>

        {/* Students Table */}
        <div className="rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/70 bg-muted/30 uppercase text-[11px] font-semibold text-muted-foreground/80 tracking-wider">
                <tr>
                  <th className="px-5 py-3">Student Code</th>
                  <th className="px-5 py-3">Full Name</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Documents</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
                        Loading student records...
                      </div>
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center">
                      <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                      <h3 className="text-xs font-semibold text-foreground">No students found</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Try adjusting your search query or register a new student.
                      </p>
                    </td>
                  </tr>
                ) : (
                  students.map((stu) => (
                    <tr key={stu.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-seg-plum">
                        <span className="rounded bg-seg-plum/5 px-2 py-0.5 border border-seg-plum/15">
                          {stu.studentCode}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-foreground">
                        <Link href={`/students/${stu.id}`} className="hover:underline">
                          {stu.fullName}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground space-y-0.5">
                        <div>{stu.email}</div>
                        <div className="text-[11px]">{stu.phoneNumber || '-'}</div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {stu.city ? `${stu.city}, ${stu.country || 'India'}` : (stu.country || '-')}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground border border-border/50">
                          <FileText className="h-3 w-3 text-seg-orange" />
                          {stu._count?.documents || 0} attached
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/students/${stu.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5">
                            <Eye className="mr-1 h-3 w-3" />
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
          <div className="flex items-center justify-between border-t border-border/70 px-5 py-2.5 text-xs text-muted-foreground bg-muted/10">
            <span className="text-[11px]">
              Page {page} of {totalPages} ({total} total students)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => fetchStudents(page - 1, search)}
                disabled={page <= 1 || isLoading}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => fetchStudents(page + 1, search)}
                disabled={page >= totalPages || isLoading}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
