import { apiClient, tokenStorage } from './client';

export interface StudentSummary {
  id: string;
  studentCode: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  emergencyContact?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  enrolments?: any[];
  documents?: any[];
  invoices?: any[];
  payments?: any[];
  _count?: {
    enrolments?: number;
    documents?: number;
    invoices?: number;
    payments?: number;
  };
}

export interface PaginatedStudentsResponse {
  data: StudentSummary[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QueryStudentsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  courseId?: string;
}

export interface CreateStudentPayload {
  fullName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  emergencyContact?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
}

export interface UpdateStudentPayload {
  fullName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  emergencyContact?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
}

export const studentsService = {
  /**
   * Retrieves paginated students list with optional search and pagination.
   */
  async getStudents(params?: QueryStudentsParams): Promise<PaginatedStudentsResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search && params.search.trim()) query.append('search', params.search.trim());
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.courseId) query.append('courseId', params.courseId);

    const queryString = query.toString();
    const endpoint = queryString ? `/students?${queryString}` : '/students';

    const res: any = await apiClient.get<any>(endpoint);

    if (res.success && res.data) {
      if (Array.isArray(res.data)) {
        return {
          data: res.data,
          meta: res.meta || {
            page: params?.page || 1,
            limit: params?.limit || res.data.length || 10,
            total: res.data.length,
            totalPages: 1,
          },
        };
      }
      return {
        data: res.data.data || [],
        meta: res.data.meta || {
          page: params?.page || 1,
          limit: params?.limit || 10,
          total: 0,
          totalPages: 1,
        },
      };
    }

    return {
      data: [],
      meta: {
        page: params?.page || 1,
        limit: params?.limit || 10,
        total: 0,
        totalPages: 1,
      },
    };
  },

  /**
   * Retrieves full student profile dossier by ID.
   */
  async getStudentById(id: string): Promise<StudentSummary> {
    const res = await apiClient.get<StudentSummary>(`/students/${id}`);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || `Student with ID ${id} not found.`);
  },

  /**
   * Registers a new student profile.
   */
  async registerStudent(payload: CreateStudentPayload): Promise<StudentSummary> {
    const res = await apiClient.post<StudentSummary>('/students', payload);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to register student.');
  },

  /**
   * Updates non-sensitive student profile attributes.
   */
  async updateStudent(id: string, payload: UpdateStudentPayload): Promise<StudentSummary> {
    const res = await apiClient.patch<StudentSummary>(`/students/${id}`, payload);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to update student profile.');
  },

  /**
   * Uploads real binary KYC document file via multipart/form-data.
   */
  async uploadDocument(
    studentId: string,
    file: File,
    documentType: string,
    documentName?: string,
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    if (documentName?.trim()) {
      formData.append('documentName', documentName.trim());
    }

    const res = await apiClient.post(`/students/${studentId}/documents/upload`, formData);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to upload student document.');
  },

  /**
   * Attaches document metadata record to student.
   */
  async attachDocument(studentId: string, documentData: {
    documentType: string;
    documentName: string;
    fileStorageKey: string;
    mimeType: string;
    fileSizeBytes: number;
  }) {
    const res = await apiClient.post(`/students/${studentId}/documents`, documentData);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to attach student document.');
  },

  /**
   * Verifies or rejects student document.
   */
  async verifyDocument(studentId: string, documentId: string, status: 'VERIFIED' | 'REJECTED', rejectionReason?: string) {
    const res = await apiClient.patch(`/students/${studentId}/documents/${documentId}/verify`, {
      status,
      rejectionReason,
    });
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to update document verification status.');
  },

  /**
   * Generates time-limited signed URL download descriptor for document.
   */
  async getDocumentDownloadUrl(studentId: string, documentId: string) {
    const res = await apiClient.get<any>(`/students/${studentId}/documents/${documentId}/download`);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to generate signed download link.');
  },

  /**
   * Fetches document as a Blob with authorization header and creates a local object URL for preview/download.
   */
  async fetchDocumentBlob(studentId: string, documentId: string, expiresQuery?: string): Promise<{ blob: Blob; mimeType: string }> {
    const token = tokenStorage.getAccessToken();
    const query = expiresQuery ? `?expires=${encodeURIComponent(expiresQuery)}` : '';
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const res = await fetch(`${baseUrl}/students/${studentId}/documents/${documentId}/stream${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `Failed to download document (${res.status})`);
    }

    const mimeType = res.headers.get('content-type') || 'application/octet-stream';
    const blob = await res.blob();
    return { blob, mimeType };
  },
};
