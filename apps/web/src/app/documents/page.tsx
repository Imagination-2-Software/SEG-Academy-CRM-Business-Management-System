'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { documentsService, StudentDocumentItem } from '@/lib/api/documents';
import { useAuth } from '@/lib/auth';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Download,
  UploadCloud,
  FileCheck2,
  ShieldCheck,
  FolderOpen,
} from 'lucide-react';

export default function DocumentsDirectoryPage() {
  const { hasPermission } = useAuth();
  const [documents, setDocuments] = useState<StudentDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const list = await documentsService.getDocuments({
        search,
        status: statusFilter,
        type: typeFilter,
      });
      setDocuments(list);
    } catch {
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [search, statusFilter, typeFilter]);

  const handleVerify = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    let reason: string | undefined = undefined;
    if (status === 'REJECTED') {
      const input = window.prompt('Please enter the reason for rejection:');
      if (input === null) return; // User cancelled
      if (!input.trim()) {
        alert('A rejection reason is required.');
        return;
      }
      reason = input.trim();
    }

    setActionLoadingId(id);
    setActionError(null);
    try {
      await documentsService.verifyDocument(id, status, reason);
      await fetchDocs();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update document verification status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownload = async (studentId: string, documentId: string) => {
    setActionLoadingId(documentId);
    setActionError(null);
    try {
      const meta = await documentsService.getDocumentDownloadUrl(studentId, documentId);
      if (meta?.signedUrl) {
        window.open(meta.signedUrl, '_blank');
      } else {
        alert('Download link could not be generated.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to generate download link.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getStatusBadge = (status: StudentDocumentItem['status']) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Verified
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 border border-red-200">
            <XCircle className="h-3 w-3" /> Rejected
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" /> Pending Verification
          </span>
        );
    }
  };

  const getTypeLabel = (type: StudentDocumentItem['documentType']) => {
    switch (type) {
      case 'GOVERNMENT_ID':
        return 'National Identity (KYC)';
      case 'ACADEMIC_TRANSCRIPT':
        return 'Academic Transcript / Certificate';
      case 'ENROLMENT_AGREEMENT':
        return 'Signed Enrolment Agreement';
      case 'FEE_RECEIPT':
        return 'Tuition Fee Payment Proof';
      default:
        return 'Supporting Document';
    }
  };

  return (
    <AppShell requiredPermission="students:read">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/70">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <FileCheck2 className="h-6 w-6 text-seg-plum" />
              Document Vault & KYC Verifications
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Centralized repository for student verification certificates, legal agreements, and official credentials.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/students">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                <FolderOpen className="h-4 w-4" />
                Student Profiles
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, code, or document title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Types</option>
              <option value="GOVERNMENT_ID">National ID (KYC)</option>
              <option value="ACADEMIC_TRANSCRIPT">Transcripts</option>
              <option value="ENROLMENT_AGREEMENT">Agreements</option>
              <option value="FEE_RECEIPT">Payment Proofs</option>
            </select>
          </div>
        </div>

        {/* Document Records Table or Empty State */}
        <Card className="border border-border/70 bg-card shadow-xs overflow-hidden">
          <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Enrolment Documentation ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
                <span>Loading document repository...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-seg-plum/10 text-seg-plum mb-3">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No records found</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  There are currently no uploaded student documents or verification records in the system.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  {(hasPermission('students:create') || hasPermission('students:write')) && (
                    <Link href="/students/register">
                      <Button size="sm" className="bg-seg-plum hover:bg-seg-plum/90 text-white gap-1.5 text-xs">
                        <UploadCloud className="h-4 w-4" />
                        Register Student & Upload KYC
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/30 text-muted-foreground font-semibold">
                      <th className="p-3">Document Title</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">File Size</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Uploaded</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4 text-seg-plum shrink-0" />
                          <span>{doc.title}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-foreground">{doc.studentName || 'XYZ'}</div>
                          <div className="text-[10px] text-muted-foreground">{doc.studentCode || '123'}</div>
                        </td>
                        <td className="p-3 text-muted-foreground">{getTypeLabel(doc.documentType)}</td>
                        <td className="p-3 text-muted-foreground font-mono">{formatFileSize(doc.fileSizeBytes)}</td>
                        <td className="p-3">{getStatusBadge(doc.status)}</td>
                        <td className="p-3 text-muted-foreground">
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          {hasPermission('students:verify') && doc.status === 'PENDING' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoadingId === doc.id}
                                onClick={() => handleVerify(doc.id, 'VERIFIED')}
                                className="h-7 px-2 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoadingId === doc.id}
                                onClick={() => handleVerify(doc.id, 'REJECTED')}
                                className="h-7 px-2 text-[11px] font-medium text-red-700 hover:text-red-800 hover:bg-red-50 border-red-200"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Download / View Document"
                            disabled={actionLoadingId === doc.id}
                            onClick={() => handleDownload(doc.studentId, doc.id)}
                          >
                            <Download className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
