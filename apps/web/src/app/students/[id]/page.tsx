'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { apiClient, ApiClientError } from '@/lib/api';
import {
  ArrowLeft,
  GraduationCap,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  AlertCircle,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function StudentDetailsPage() {
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Document Upload Mock State
  const [docType, setDocType] = useState('TRANSCRIPT');
  const [docName, setDocName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchStudent = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/students/${studentId}`);
      if (res.success && res.data) {
        setStudent(res.data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load student profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchStudent();
    }
  }, [studentId]);

  const handleAttachDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    setIsUploading(true);
    try {
      const randomSuffix = Math.random().toString(36).substring(7);
      const storageKey = `students/${studentId}/${docType.toLowerCase()}_${randomSuffix}.pdf`;

      await apiClient.post(`/students/${studentId}/documents`, {
        documentType: docType,
        documentName: docName.trim(),
        fileStorageKey: storageKey,
        mimeType: 'application/pdf',
        fileSizeBytes: 1048576, // 1MB sample
      });

      setDocName('');
      await fetchStudent();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to attach document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerifyDocument = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await apiClient.patch(`/students/${studentId}/documents/${docId}/verify`, {
        status,
        rejectionReason: status === 'REJECTED' ? 'Verification criteria not met.' : undefined,
      });
      await fetchStudent();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update verification status.');
    }
  };

  const handleDownload = async (docId: string) => {
    try {
      const res = await apiClient.get(`/students/${studentId}/documents/${docId}/download`);
      if (res.success && res.data?.signedUrl) {
        alert(`Secure signed download descriptor generated:\n${res.data.signedUrl}\n(Valid for 15 minutes)`);
      }
    } catch (err: any) {
      alert('Unable to generate secure download link.');
    }
  };

  if (isLoading) {
    return (
      <AppShell requiredPermission="students:read">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-seg-plum border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (!student) {
    return (
      <AppShell requiredPermission="students:read">
        <div className="text-center p-12">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
          <h2 className="text-xl font-bold">Student Not Found</h2>
          <p className="text-sm text-muted-foreground mt-1">No record matching ID: {studentId}</p>
          <Link href="/students" className="mt-4 inline-block">
            <Button variant="outline">Back to Directory</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell requiredPermission="students:read">
      <div className="space-y-6">
        {/* Navigation & Student Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/students">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Directory
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                  {student.fullName}
                </h1>
                <span className="font-mono text-xs font-bold text-seg-plum bg-seg-plum-subtle px-2 py-0.5 rounded">
                  {student.studentCode}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Registered on {new Date(student.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Profile Info Cards Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Contact Details */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-seg-plum" />
                Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium text-foreground">{student.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <p className="font-medium text-foreground">{student.phoneNumber || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date of Birth:</span>
                <p className="font-medium text-foreground">
                  {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Nationality:</span>
                <p className="font-medium text-foreground">{student.nationality || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Residential Address */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-seg-orange" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">Street:</span>
                <p className="font-medium text-foreground">{student.addressLine1 || '-'}</p>
                {student.addressLine2 && <p className="font-medium text-foreground">{student.addressLine2}</p>}
              </div>
              <div>
                <span className="text-muted-foreground">City & State:</span>
                <p className="font-medium text-foreground">
                  {student.city ? `${student.city}, ${student.state || ''}` : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Country & PIN:</span>
                <p className="font-medium text-foreground">
                  {student.country ? `${student.country} - ${student.postalCode || ''}` : '-'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Guardian Info */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-seg-yellow" />
                Guardian & Emergency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">Guardian Name:</span>
                <p className="font-medium text-foreground">{student.guardianName || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Guardian Contact:</span>
                <p className="font-medium text-foreground">{student.guardianPhone || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Emergency Number:</span>
                <p className="font-medium text-foreground">{student.emergencyContact || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KYC Documents Section */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">KYC & Academic Documents</CardTitle>
                <CardDescription>
                  Verified records are stored in Supabase Private Storage with time-limited signed URLs
                </CardDescription>
              </div>

              {/* Upload Document Form */}
              <form onSubmit={handleAttachDocument} className="flex items-center gap-2">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="TRANSCRIPT">TRANSCRIPT</option>
                  <option value="ID_PROOF">ID_PROOF</option>
                  <option value="PASSPORT">PASSPORT</option>
                  <option value="VISA">VISA</option>
                  <option value="CERTIFICATE">CERTIFICATE</option>
                  <option value="RESUME">RESUME</option>
                  <option value="OTHER">OTHER</option>
                </select>
                <Input
                  placeholder="Document file name (e.g. Passport.pdf)"
                  className="h-9 text-xs w-48"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  required
                />
                <Button size="sm" type="submit" className="bg-seg-plum text-white hover:bg-seg-plum-hover" disabled={isUploading}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Attach
                </Button>
              </form>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Document Name</th>
                    <th className="px-4 py-3 font-semibold">Storage Key</th>
                    <th className="px-4 py-3 font-semibold">Verification Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!student.documents || student.documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No documents currently attached.
                      </td>
                    </tr>
                  ) : (
                    student.documents.map((doc: any) => (
                      <tr key={doc.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-semibold text-seg-plum">
                          {doc.documentType}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {doc.documentName}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                          {doc.fileStorageKey}
                        </td>
                        <td className="px-4 py-3">
                          {doc.verificationStatus === 'VERIFIED' ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> VERIFIED
                            </span>
                          ) : doc.verificationStatus === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
                              <XCircle className="h-3 w-3" /> REJECTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                              <Clock className="h-3 w-3" /> PENDING
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => handleDownload(doc.id)}
                            >
                              <Download className="mr-1 h-3 w-3" />
                              Download
                            </Button>
                            {doc.verificationStatus === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-2"
                                  onClick={() => handleVerifyDocument(doc.id, 'VERIFIED')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-xs px-2"
                                  onClick={() => handleVerifyDocument(doc.id, 'REJECTED')}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
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
