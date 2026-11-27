import { apiClient } from './client';

export interface CourseSummary {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  durationWeeks: number;
  totalCredits?: number | null;
  baseFee: number | string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    batches?: number;
    invoiceItems?: number;
  };
  batches?: BatchSummary[];
}

export interface BatchSummary {
  id: string;
  courseId: string;
  batchCode: string;
  name: string;
  startDate: string;
  endDate?: string | null;
  capacity: number;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  instructorId?: string | null;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    code: string;
    title: string;
    durationWeeks: number;
    baseFee: number | string;
  };
  instructor?: {
    id: string;
    employeeCode: string;
    jobTitle: string;
    user?: {
      fullName: string;
      email: string;
    };
  } | null;
  enrolments?: EnrolmentSummary[];
  _count?: {
    enrolments?: number;
    assignments?: number;
  };
}

export type EnrolmentStatus =
  | 'APPLIED'
  | 'ENROLLED'
  | 'ON_HOLD'
  | 'GRADUATED'
  | 'DROPPED'
  | 'WITHDRAWN';

export interface EnrolmentSummary {
  id: string;
  studentId: string;
  batchId: string;
  enrolmentNumber: string;
  enrolmentDate: string;
  status: EnrolmentStatus;
  finalGrade?: string | null;
  completionDate?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    studentCode: string;
    fullName: string;
    email: string;
    phoneNumber?: string | null;
  };
  batch?: {
    id: string;
    batchCode: string;
    name: string;
  };
}

export interface PaginatedCoursesResponse {
  data: CourseSummary[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedBatchesResponse {
  data: BatchSummary[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QueryCoursesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface QueryBatchesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  courseId?: string;
}

export interface CreateCoursePayload {
  code: string;
  title: string;
  description?: string;
  durationWeeks: number;
  totalCredits?: number;
  baseFee: number;
  currency?: string;
  isActive?: boolean;
}

export interface UpdateCoursePayload {
  title?: string;
  description?: string;
  durationWeeks?: number;
  totalCredits?: number;
  baseFee?: number;
  isActive?: boolean;
}

export interface CreateBatchPayload {
  courseId: string;
  batchCode: string;
  name: string;
  startDate: string;
  endDate?: string;
  capacity: number;
  instructorId?: string;
}

export interface UpdateBatchPayload {
  name?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  status?: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  instructorId?: string;
}

export interface CreateEnrolmentPayload {
  studentId: string;
  batchId: string;
}

export interface UpdateEnrolmentStatusPayload {
  status: EnrolmentStatus;
  finalGrade?: string;
  completionDate?: string;
}

export const academicService = {
  // ---------------------------------------------------------------------------
  // COURSES
  // ---------------------------------------------------------------------------

  /**
   * List courses with search, active filter, and pagination.
   */
  async listCourses(params?: QueryCoursesParams): Promise<PaginatedCoursesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search?.trim()) searchParams.set('search', params.search.trim());
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));

    const endpoint = `/courses${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const res: any = await apiClient.get<any>(endpoint);

    if (res.success && res.data) {
      if (Array.isArray(res.data)) {
        return {
          data: res.data,
          meta: res.meta || {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: res.data.length,
            totalPages: 1,
          },
        };
      }
      return {
        data: res.data.data || [],
        meta: res.data.meta || {
          page: params?.page || 1,
          limit: params?.limit || 20,
          total: 0,
          totalPages: 1,
        },
      };
    }

    return {
      data: [],
      meta: {
        page: params?.page || 1,
        limit: params?.limit || 20,
        total: 0,
        totalPages: 1,
      },
    };
  },

  /**
   * Get single course details with scheduled batches.
   */
  async getCourseById(id: string): Promise<CourseSummary> {
    const res = await apiClient.get<CourseSummary>(`/courses/${id}`);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || `Course with ID ${id} not found.`);
  },

  /**
   * Create a new course offering.
   */
  async createCourse(payload: CreateCoursePayload): Promise<CourseSummary> {
    const res = await apiClient.post<CourseSummary>('/courses', payload);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to create course offering.');
  },

  /**
   * Update course details, pricing, and active status.
   */
  async updateCourse(id: string, payload: UpdateCoursePayload): Promise<CourseSummary> {
    const res = await apiClient.patch<CourseSummary>(`/courses/${id}`, payload);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to update course.');
  },

  // ---------------------------------------------------------------------------
  // BATCHES
  // ---------------------------------------------------------------------------

  /**
   * List batches with status, course, and search filters.
   */
  async listBatches(params?: QueryBatchesParams): Promise<PaginatedBatchesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search?.trim()) searchParams.set('search', params.search.trim());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.courseId) searchParams.set('courseId', params.courseId);

    const endpoint = `/batches${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const res: any = await apiClient.get<any>(endpoint);

    if (res.success && res.data) {
      if (Array.isArray(res.data)) {
        return {
          data: res.data,
          meta: res.meta || {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: res.data.length,
            totalPages: 1,
          },
        };
      }
      return {
        data: res.data.data || [],
        meta: res.data.meta || {
          page: params?.page || 1,
          limit: params?.limit || 20,
          total: 0,
          totalPages: 1,
        },
      };
    }

    return {
      data: [],
      meta: {
        page: params?.page || 1,
        limit: params?.limit || 20,
        total: 0,
        totalPages: 1,
      },
    };
  },

  /**
   * Get batch details with enrolled student roster.
   */
  async getBatchById(id: string): Promise<BatchSummary> {
    const res = await apiClient.get<BatchSummary>(`/batches/${id}`);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || `Batch with ID ${id} not found.`);
  },

  /**
   * Schedule a new batch for a course.
   */
  async createBatch(payload: CreateBatchPayload): Promise<BatchSummary> {
    const res = await apiClient.post<BatchSummary>('/batches', payload);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to schedule batch.');
  },

  /**
   * Update batch details, capacity, and status.
   */
  async updateBatch(id: string, payload: UpdateBatchPayload): Promise<BatchSummary> {
    const res = await apiClient.patch<BatchSummary>(`/batches/${id}`, payload);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to update batch.');
  },

  // ---------------------------------------------------------------------------
  // ENROLMENTS
  // ---------------------------------------------------------------------------

  /**
   * Enrol a student into a batch cohort.
   */
  async enrolStudent(payload: CreateEnrolmentPayload): Promise<EnrolmentSummary> {
    const res = await apiClient.post<EnrolmentSummary>('/enrolments', payload);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to enrol student into batch.');
  },

  /**
   * Update enrolment status and record final grade.
   */
  async updateEnrolmentStatus(id: string, payload: UpdateEnrolmentStatusPayload): Promise<EnrolmentSummary> {
    const res = await apiClient.patch<EnrolmentSummary>(`/enrolments/${id}/status`, payload);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to update enrolment status.');
  },
};
