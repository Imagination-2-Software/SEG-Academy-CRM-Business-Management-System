'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { studentsService, StudentSummary, UpdateStudentPayload } from '@/lib/api/students';
import { useAuth } from '@/lib/auth';
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
  Edit,
  X,
  Loader2,
  Save,
  User as UserIcon,
  Shield,
  Eye,
  ExternalLink,
} from 'lucide-react';

export default function StudentDetailsPage() {
  const { hasPermission } = useAuth();
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Document Upload State
  const [docType, setDocType] = useState('TRANSCRIPT');
  const [docName, setDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Document Viewer & Action State
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    name: string;
    type: string;
    mimeType: string;
    blobUrl?: string;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateStudentPayload>({
    fullName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    emergencyContact: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
  });

  const canUpdateStudent = hasPermission('students:update');
  const canVerifyDocuments = hasPermission('students:update') || hasPermission('students:verify');

  const fetchStudent = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await studentsService.getStudentById(studentId);
      setStudent(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load student profile.');
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      fetchStudent();
    }
  }, [studentId, fetchStudent]);

  // Open Edit Profile Modal with prefilled student data
  const handleOpenEditModal = () => {
    if (!student) return;
    setEditFormData({
      fullName: student.fullName || '',
      phoneNumber: student.phoneNumber || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      gender: student.gender || 'Male',
      nationality: student.nationality || 'Indian',
      addressLine1: student.addressLine1 || '',
      addressLine2: student.addressLine2 || '',
      city: student.city || '',
      state: student.state || '',
      country: student.country || 'India',
      postalCode: student.postalCode || '',
      emergencyContact: student.emergencyContact || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      guardianEmail: student.guardianEmail || '',
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !editFormData.fullName?.trim()) {
      setEditError('Full legal name is required.');
      return;
    }

    setIsSavingProfile(true);
    setEditError(null);
    setSuccessMessage(null);

    try {
      const payload: UpdateStudentPayload = {
        fullName: editFormData.fullName.trim(),
        phoneNumber: editFormData.phoneNumber?.trim() || undefined,
        dateOfBirth: editFormData.dateOfBirth || undefined,
        gender: editFormData.gender || undefined,
        nationality: editFormData.nationality?.trim() || undefined,
        addressLine1: editFormData.addressLine1?.trim() || undefined,
        addressLine2: editFormData.addressLine2?.trim() || undefined,
        city: editFormData.city?.trim() || undefined,
        state: editFormData.state?.trim() || undefined,
        country: editFormData.country?.trim() || undefined,
        postalCode: editFormData.postalCode?.trim() || undefined,
        emergencyContact: editFormData.emergencyContact?.trim() || undefined,
        guardianName: editFormData.guardianName?.trim() || undefined,
        guardianPhone: editFormData.guardianPhone?.trim() || undefined,
        guardianEmail: editFormData.guardianEmail?.trim() || undefined,
      };

      const updated = await studentsService.updateStudent(studentId, payload);
      setStudent(updated);
      setIsEditModalOpen(false);
      setSuccessMessage('Student profile details updated successfully.');
    } catch (err: any) {
      console.error('Failed to update student profile:', err);
      setEditError(err.message || 'Failed to update student profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = e.target.files[0];
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !allowedExtensions.includes(ext)) {
      setUploadError('Invalid file type. Only PDF, JPEG, and PNG files are permitted.');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }

    // 10MB client-side limit
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 10MB.`);
      setSelectedFile(null);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    if (!docName.trim()) {
      setDocName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleAttachDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await studentsService.uploadDocument(
        studentId,
        selectedFile,
        docType,
        docName.trim() || undefined,
      );

      setSelectedFile(null);
      setDocName('');
      setSuccessMessage('KYC Document uploaded and attached successfully to student dossier.');
      await fetchStudent();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload student document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerifyDocument = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      let reason: string | undefined = undefined;
      if (status === 'REJECTED') {
        const input = window.prompt('Please enter the reason for rejection:');
        if (input === null) return;
        if (!input.trim()) {
          alert('A rejection reason is required.');
          return;
        }
        reason = input.trim();
      }

      await studentsService.verifyDocument(studentId, docId, status, reason);
      setSuccessMessage(`Document status successfully updated to ${status}.`);
      await fetchStudent();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update verification status.');
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      setErrorMessage(null);
      // Fetch document blob securely with credentials
      const { blob } = await studentsService.fetchDocumentBlob(studentId, doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Guarantee filename matches the document's recorded extension
      let filename = doc.documentName || 'student-document';
      if (!filename.includes('.')) {
        const ext = doc.mimeType === 'application/pdf' ? '.pdf' : doc.mimeType === 'image/png' ? '.png' : '.jpg';
        filename += ext;
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to download document.');
    }
  };

  const handlePreview = async (doc: any) => {
    setPreviewError(null);
    setIsPreviewLoading(true);
    setPreviewDoc({
      id: doc.id,
      name: doc.documentName,
      type: doc.documentType,
      mimeType: doc.mimeType,
    });

    try {
      const { blob, mimeType } = await studentsService.fetchDocumentBlob(studentId, doc.id);
      const blobUrl = window.URL.createObjectURL(blob);
      setPreviewDoc((prev) => (prev ? { ...prev, blobUrl, mimeType } : null));
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to load document for viewing.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewDoc?.blobUrl) {
      window.URL.revokeObjectURL(previewDoc.blobUrl);
    }
    setPreviewDoc(null);
    setPreviewError(null);
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
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navigation & Student Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
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
                <span className="font-mono text-xs font-bold text-seg-plum bg-seg-plum/10 border border-seg-plum/20 px-2.5 py-0.5 rounded-md">
                  {student.studentCode}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Registered on {new Date(student.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </p>
            </div>
          </div>

          {canUpdateStudent && (
            <Button
              onClick={handleOpenEditModal}
              size="sm"
              className="bg-seg-plum text-white hover:bg-seg-plum/90 shadow-xs inline-flex items-center gap-1.5"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </Button>
          )}
        </div>

        {/* Global Feedback Banners */}
        {errorMessage && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:text-red-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Profile Info Cards Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Contact Details */}
          <Card className="border-border/60 shadow-2xs">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4 text-seg-plum" />
                Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs pt-4">
              <div>
                <span className="text-muted-foreground text-[11px]">Primary Email</span>
                <p className="font-semibold text-foreground font-mono">{student.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">Phone Number</span>
                <p className="font-semibold text-foreground">{student.phoneNumber || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">Date of Birth</span>
                <p className="font-semibold text-foreground">
                  {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-IN') : '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">Gender & Nationality</span>
                <p className="font-semibold text-foreground">
                  {student.gender || '—'} • {student.nationality || '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Residential Address */}
          <Card className="border-border/60 shadow-2xs">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-seg-orange" />
                Residential Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs pt-4">
              <div>
                <span className="text-muted-foreground text-[11px]">Street Address</span>
                <p className="font-semibold text-foreground">{student.addressLine1 || '—'}</p>
                {student.addressLine2 && <p className="font-medium text-foreground text-[11px]">{student.addressLine2}</p>}
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">City, State</span>
                <p className="font-semibold text-foreground">
                  {student.city ? `${student.city}, ${student.state || ''}` : '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">Country & Postal PIN</span>
                <p className="font-semibold text-foreground">
                  {student.country ? `${student.country} — ${student.postalCode || ''}` : '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Guardian Info */}
          <Card className="border-border/60 shadow-2xs">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-seg-yellow" />
                Guardian & Emergency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs pt-4">
              <div>
                <span className="text-muted-foreground text-[11px]">Guardian Full Name</span>
                <p className="font-semibold text-foreground">{student.guardianName || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">Guardian Phone & Email</span>
                <p className="font-semibold text-foreground">{student.guardianPhone || '—'}</p>
                {student.guardianEmail && (
                  <p className="font-mono text-muted-foreground text-[11px]">{student.guardianEmail}</p>
                )}
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">Emergency Hotline</span>
                <p className="font-semibold text-foreground">{student.emergencyContact || '—'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KYC Documents Section */}
        <Card className="border-border/60 shadow-2xs overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-foreground">KYC & Academic Documents</CardTitle>
                <CardDescription className="text-xs">
                  Student compliance records stored securely in Supabase Private Storage
                </CardDescription>
              </div>

              {/* Upload Document Form */}
              {canUpdateStudent && (
                <div className="flex flex-col items-end gap-1.5">
                  <form onSubmit={handleAttachDocument} className="flex flex-wrap items-center gap-2">
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
                      disabled={isUploading}
                    >
                      <option value="TRANSCRIPT">TRANSCRIPT</option>
                      <option value="ID_PROOF">ID_PROOF</option>
                      <option value="PASSPORT">PASSPORT</option>
                      <option value="VISA">VISA</option>
                      <option value="CERTIFICATE">CERTIFICATE</option>
                      <option value="RESUME">RESUME</option>
                      <option value="OTHER">OTHER</option>
                    </select>

                    <div className="relative">
                      <input
                        type="file"
                        id="kyc-doc-file"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        className="sr-only"
                        disabled={isUploading}
                      />
                      <label
                        htmlFor="kyc-doc-file"
                        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          selectedFile
                            ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 font-medium'
                            : 'border-input bg-background hover:bg-muted text-foreground'
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5 text-seg-plum" />
                        <span className="max-w-[120px] truncate">
                          {selectedFile ? selectedFile.name : 'Select file...'}
                        </span>
                      </label>
                    </div>

                    <Input
                      placeholder="Display label (optional)..."
                      className="h-8 text-xs w-44"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      disabled={isUploading}
                    />

                    <Button
                      size="sm"
                      type="submit"
                      className="h-8 bg-seg-plum text-white hover:bg-seg-plum/90 text-xs font-medium"
                      disabled={isUploading || !selectedFile}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-1 h-3.5 w-3.5" />
                          Upload KYC
                        </>
                      )}
                    </Button>
                  </form>
                  {uploadError && (
                    <p className="text-[11px] font-semibold text-destructive">{uploadError}</p>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/80 bg-muted/30 uppercase text-[11px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Document Name</th>
                    <th className="px-4 py-3">Storage Key</th>
                    <th className="px-4 py-3">Verification Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {!student.documents || student.documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">
                        No KYC or academic documents attached yet.
                      </td>
                    </tr>
                  ) : (
                    student.documents.map((doc: any) => (
                      <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
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
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" /> VERIFIED
                            </span>
                          ) : doc.verificationStatus === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                              <XCircle className="h-3 w-3" /> REJECTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                              <Clock className="h-3 w-3" /> PENDING
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2 text-seg-plum hover:bg-seg-plum/10"
                              onClick={() => handlePreview(doc)}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="mr-1 h-3 w-3" />
                              Download
                            </Button>
                            {doc.verificationStatus === 'PENDING' && canVerifyDocuments && (
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

        {/* Student Profile Edit Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-border/80 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-seg-plum/10 text-seg-plum">
                    <Edit className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Edit Student Profile</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Update contact, residential address, and guardian emergency records.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                {editError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                {/* Section 1: Personal & Contact */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground border-b border-border/60 pb-1.5">
                    Personal & Contact Information
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Full Legal Name *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={editFormData.fullName || ''}
                        onChange={handleEditChange}
                        required
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        name="phoneNumber"
                        value={editFormData.phoneNumber || ''}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={editFormData.dateOfBirth || ''}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={editFormData.gender || 'Male'}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Nationality
                      </label>
                      <input
                        type="text"
                        name="nationality"
                        value={editFormData.nationality || ''}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Residential Address */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground border-b border-border/60 pb-1.5">
                    Residential Address
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        name="addressLine1"
                        value={editFormData.addressLine1 || ''}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        name="addressLine2"
                        value={editFormData.addressLine2 || ''}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={editFormData.city || ''}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={editFormData.state || ''}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        name="country"
                        value={editFormData.country || ''}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Postal / PIN Code
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        value={editFormData.postalCode || ''}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Guardian & Emergency */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground border-b border-border/60 pb-1.5">
                    Guardian & Emergency Contact
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Guardian Name
                      </label>
                      <input
                        type="text"
                        name="guardianName"
                        value={editFormData.guardianName || ''}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Guardian Phone
                      </label>
                      <input
                        type="text"
                        name="guardianPhone"
                        value={editFormData.guardianPhone || ''}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Guardian Email
                      </label>
                      <input
                        type="email"
                        name="guardianEmail"
                        value={editFormData.guardianEmail || ''}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Emergency Contact Phone
                      </label>
                      <input
                        type="text"
                        name="emergencyContact"
                        value={editFormData.emergencyContact || ''}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
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
                    disabled={isSavingProfile}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-seg-plum px-4 py-2 text-xs font-semibold text-white hover:bg-seg-plum/90 disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Document Viewer Modal */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-4xl h-[85vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/80 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-seg-plum/10 text-seg-plum">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{previewDoc.name}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {previewDoc.type} &bull; {previewDoc.mimeType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => handleDownload(previewDoc)}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download File
                  </Button>
                  <button
                    onClick={closePreview}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-auto bg-muted/10 p-4 flex items-center justify-center">
                {isPreviewLoading ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
                    <Loader2 className="h-8 w-8 animate-spin text-seg-plum" />
                    <span>Loading document securely...</span>
                  </div>
                ) : previewError ? (
                  <div className="text-center p-6 text-destructive text-xs">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-semibold">{previewError}</p>
                  </div>
                ) : previewDoc.blobUrl ? (
                  previewDoc.mimeType?.includes('image') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewDoc.blobUrl}
                      alt={previewDoc.name}
                      className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                    />
                  ) : (
                    <iframe
                      src={previewDoc.blobUrl}
                      title={previewDoc.name}
                      className="w-full h-full rounded-lg border border-border/60 bg-white"
                    />
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">No preview available.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
