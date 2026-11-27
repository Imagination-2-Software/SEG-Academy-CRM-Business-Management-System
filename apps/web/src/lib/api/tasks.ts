import { apiClient } from './client';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'DONE' | 'CANCELLED';
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'LATE' | 'RESUBMISSION_REQUESTED' | 'GRADED';
export type ReviewOutcome = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

export interface TaskAttachment {
  name: string;
  size: string;
  url?: string;
  uploadedAt: string;
}

export interface TaskSubmissionReview {
  id: string;
  submissionId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerEmail: string;
  reviewerJobTitle: string;
  score: number; // 0 to 100
  feedback?: string;
  status: ReviewOutcome;
  reviewedAt: string;
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  submittedById: string;
  submittedByName: string;
  submittedByEmail: string;
  submittedByRole?: string;
  submissionDate: string;
  contentUrl?: string;
  notes?: string;
  attachmentName?: string;
  attachmentSize?: string;
  status: SubmissionStatus;
  reviews: TaskSubmissionReview[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  actorName: string;
  actorRole?: string;
  action: string;
  details?: string;
  timestamp: string;
}

export interface Task {
  id: string;
  taskCode: string;
  title: string;
  description?: string;
  instructions?: string;
  departmentId?: string;
  departmentName?: string;
  teamId?: string;
  teamName?: string;
  assignedToId?: string;
  assignedToName?: string;
  assignedToEmail?: string;
  assignedToRole?: string;
  assignedToAvatar?: string;
  createdById: string;
  createdByName: string;
  createdByRole?: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  submissionRequirements?: string;
  attachments?: TaskAttachment[];
  completedAt?: string;
  submissions: TaskSubmission[];
  timeline: TaskActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  instructions?: string;
  departmentId?: string;
  teamId?: string;
  assignedToId?: string;
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  submissionRequirements?: string;
  attachments?: TaskAttachment[];
}

export interface SubmitWorkPayload {
  taskId: string;
  notes?: string;
  contentUrl?: string;
  attachmentName?: string;
  attachmentSize?: string;
}

export interface ReviewSubmissionPayload {
  submissionId: string;
  taskId: string;
  score: number;
  feedback?: string;
  status: ReviewOutcome;
}

export interface TaskMetrics {
  totalTasks: number;
  assignedTasks: number;
  inProgressTasks: number;
  pendingReviews: number;
  completedTasks: number;
  overdueTasks: number;
  urgentTasks: number;
  completionRate: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatTaskDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatTaskDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function isTaskOverdue(dueDate?: string, status?: TaskStatus): boolean {
  if (!dueDate) return false;
  if (status === 'DONE' || status === 'CANCELLED') return false;
  return new Date(dueDate).getTime() < new Date().getTime();
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

export const tasksApi = {
  async getTasks(params?: {
    status?: string;
    priority?: string;
    assignedToId?: string;
    departmentId?: string;
    teamId?: string;
    search?: string;
  }): Promise<Task[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.priority && params.priority !== 'ALL') query.set('priority', params.priority);
    if (params?.assignedToId && params.assignedToId !== 'ALL') query.set('assignedToId', params.assignedToId);
    if (params?.departmentId && params.departmentId !== 'ALL') query.set('departmentId', params.departmentId);
    if (params?.teamId && params.teamId !== 'ALL') query.set('teamId', params.teamId);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res: any = await apiClient.get(`/tasks${queryString}`);

    if (res?.success && res?.data) {
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data.data)) return res.data.data;
    }
    if (Array.isArray(res)) return res;
    return [];
  },

  async getTaskById(id: string): Promise<Task | null> {
    const res: any = await apiClient.get(`/tasks/${id}`);
    if (res?.success && res?.data) return res.data;
    if (res?.data) return res.data;
    return res || null;
  },

  async createTask(payload: CreateTaskPayload, _creator?: { id: string; name: string; role?: string }): Promise<Task> {
    const body: Record<string, any> = {
      title: payload.title.trim(),
      description: payload.description?.trim(),
      priority: payload.priority,
      departmentId: payload.departmentId || undefined,
      teamId: payload.teamId || undefined,
      assignedToId: payload.assignedToId || undefined,
      dueDate: payload.dueDate || undefined,
    };

    const res: any = await apiClient.post('/tasks', body);
    if (res?.success && res?.data) return res.data;
    return res?.data || res;
  },

  async updateTaskStatus(id: string, status: TaskStatus, _actorName: string = 'Staff Member'): Promise<Task | null> {
    const res: any = await apiClient.patch(`/tasks/${id}/status`, { status });
    if (res?.success && res?.data) return res.data;
    return res?.data || res || null;
  },

  async assignTask(id: string, assignedToId: string | null): Promise<Task | null> {
    const res: any = await apiClient.patch(`/tasks/${id}/assign`, { assignedToId });
    if (res?.success && res?.data) return res.data;
    return res?.data || res || null;
  },

  async submitWork(payload: SubmitWorkPayload, _submitter?: { id: string; name: string; email: string; role?: string }): Promise<Task | null> {
    const body = {
      contentUrl: payload.contentUrl?.trim() || undefined,
      notes: payload.notes?.trim() || undefined,
      attachmentName: payload.attachmentName?.trim() || undefined,
      attachmentSize: payload.attachmentSize?.trim() || undefined,
    };

    const res: any = await apiClient.post(`/tasks/${payload.taskId}/submissions`, body);
    if (res?.success && res?.data) return res.data;
    return res?.data || res || null;
  },

  async reviewSubmission(
    payload: ReviewSubmissionPayload,
    _reviewer?: { id: string; name: string; email: string; jobTitle?: string }
  ): Promise<Task | null> {
    const body = {
      score: payload.score,
      feedback: payload.feedback?.trim() || undefined,
      status: payload.status,
    };

    const res: any = await apiClient.post(`/tasks/${payload.taskId}/submissions/${payload.submissionId}/reviews`, body);
    if (res?.success && res?.data) return res.data;
    return res?.data || res || null;
  },

  computeMetrics(tasks: Task[]): TaskMetrics {
    const totalTasks = tasks.length;
    let assignedTasks = 0;
    let inProgressTasks = 0;
    let pendingReviews = 0;
    let completedTasks = 0;
    let overdueTasks = 0;
    let urgentTasks = 0;

    for (const t of tasks) {
      if (t.assignedToId) assignedTasks++;
      if (t.status === 'IN_PROGRESS') inProgressTasks++;
      if (t.status === 'UNDER_REVIEW') pendingReviews++;
      if (t.status === 'DONE') completedTasks++;
      if (t.priority === 'URGENT') urgentTasks++;
      if (isTaskOverdue(t.dueDate, t.status)) overdueTasks++;
    }

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      assignedTasks,
      inProgressTasks,
      pendingReviews,
      completedTasks,
      overdueTasks,
      urgentTasks,
      completionRate,
    };
  },
};
