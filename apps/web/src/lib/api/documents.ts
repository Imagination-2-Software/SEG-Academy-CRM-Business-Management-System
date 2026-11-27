import { apiClient } from './client';

export interface StudentDocumentItem {
  id: string;
  studentId: string;
  studentName?: string;
  studentCode?: string;
  studentEmail?: string;
  documentType: 'GOVERNMENT_ID' | 'ACADEMIC_TRANSCRIPT' | 'ENROLMENT_AGREEMENT' | 'FEE_RECEIPT' | 'OTHER';
  rawDocumentType?: string;
  title: string;
  fileName: string;
  documentName?: string;
  fileSizeBytes: number;
  mimeType: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface PaginatedDocumentsResponse {
  data: StudentDocumentItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const documentsService = {
  async getDocuments(params?: {
    search?: string;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<StudentDocumentItem[]> {
    try {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.status && params.status !== 'ALL') query.append('status', params.status);
      if (params?.type && params.type !== 'ALL') query.append('type', params.type);
      if (params?.page) query.append('page', String(params.page));
      if (params?.limit) query.append('limit', String(params.limit));

      const res: any = await apiClient.get(`/students/documents?${query.toString()}`);
      const rawList = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(rawList)) {
        return rawList.map((doc: any) => ({
          id: doc.id,
          studentId: doc.studentId,
          studentName: doc.studentName || doc.student?.fullName,
          studentCode: doc.studentCode || doc.student?.studentCode,
          studentEmail: doc.studentEmail || doc.student?.email,
          documentType: doc.documentType || 'OTHER',
          rawDocumentType: doc.rawDocumentType || doc.documentType,
          title: doc.documentName || doc.title || 'Untitled Document',
          fileName: doc.documentName || doc.fileName || 'document',
          documentName: doc.documentName,
          fileSizeBytes: doc.fileSizeBytes || 0,
          mimeType: doc.mimeType || 'application/pdf',
          status: doc.verificationStatus || doc.status || 'PENDING',
          rejectionReason: doc.rejectionReason,
          uploadedAt: doc.uploadedAt,
          verifiedAt: doc.verifiedAt,
          verifiedBy: doc.verifiedBy,
        }));
      }
    } catch {
      // Return empty list on failure
    }
    return [];
  },

  async verifyDocument(id: string, status: 'VERIFIED' | 'REJECTED', reason?: string): Promise<{ success: boolean; data?: any }> {
    const res: any = await apiClient.patch(`/students/documents/${id}/verify`, {
      status,
      rejectionReason: reason,
    });
    return { success: true, data: res?.data || res };
  },

  async getDocumentDownloadUrl(studentId: string, documentId: string): Promise<{ signedUrl: string; expiresAt: string }> {
    const res: any = await apiClient.get(`/students/${studentId}/documents/${documentId}/download`);
    return res?.data || res;
  },
};
