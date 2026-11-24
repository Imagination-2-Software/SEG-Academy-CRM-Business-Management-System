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
// Seed Data
// ---------------------------------------------------------------------------

const INITIAL_TASKS: Task[] = [
  {
    id: 'tsk-001',
    taskCode: 'TSK-101',
    title: 'Design Full-Stack Curriculum Lab Environment',
    description: 'Set up reproducible containerized dev environments for the upcoming cohort of Full-Stack Web Development students.',
    instructions: '1. Prepare Docker Compose configurations for PostgreSQL, Redis, and Node.js.\n2. Write instructions in Markdown for students using Windows and macOS.\n3. Verify all student starter templates compile with zero warnings.',
    departmentId: 'dept-acad',
    departmentName: 'Academic Operations',
    teamId: 'team-curriculum',
    teamName: 'Curriculum & Content Team',
    assignedToId: 'emp-002',
    assignedToName: 'Sarah Jenkins',
    assignedToEmail: 'sarah.jenkins@segacademy.com',
    assignedToRole: 'Lead Technical Instructor',
    createdById: 'emp-admin',
    createdByName: 'Alexander Wright',
    createdByRole: 'Founder / Super Admin',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    startDate: '2026-11-15T09:00:00.000Z',
    dueDate: '2026-11-28T18:00:00.000Z',
    estimatedHours: 24,
    submissionRequirements: 'Submit GitHub repository link with verified Docker Compose file and student walkthrough PDF.',
    attachments: [
      {
        name: 'Curriculum_Lab_Spec_v2.pdf',
        size: '1.4 MB',
        uploadedAt: '2026-11-15T09:15:00.000Z',
      },
    ],
    submissions: [],
    timeline: [
      {
        id: 'act-001',
        taskId: 'tsk-001',
        actorName: 'Alexander Wright',
        action: 'Created task and assigned to Sarah Jenkins',
        timestamp: '2026-11-15T09:00:00.000Z',
      },
      {
        id: 'act-002',
        taskId: 'tsk-001',
        actorName: 'Sarah Jenkins',
        action: 'Started progress on container configuration',
        timestamp: '2026-11-16T10:30:00.000Z',
      },
    ],
    createdAt: '2026-11-15T09:00:00.000Z',
    updatedAt: '2026-11-16T10:30:00.000Z',
  },
  {
    id: 'tsk-002',
    taskCode: 'TSK-102',
    title: 'Audit Student Enrolment Compliance for Q4',
    description: 'Verify identity documents and signed enrollment agreements for Batch FSD-2026-Q4.',
    instructions: 'Cross-reference student portal uploads against national ID verification records. Flag any missing parent/guardian signatures for minor students.',
    departmentId: 'dept-admin',
    departmentName: 'Admissions & Compliance',
    teamId: 'team-admissions',
    teamName: 'Admissions Verification',
    assignedToId: 'emp-004',
    assignedToName: 'David Chen',
    assignedToEmail: 'david.chen@segacademy.com',
    assignedToRole: 'Compliance Officer',
    createdById: 'emp-admin',
    createdByName: 'Alexander Wright',
    createdByRole: 'Founder / Super Admin',
    priority: 'URGENT',
    status: 'UNDER_REVIEW',
    startDate: '2026-11-10T09:00:00.000Z',
    dueDate: '2026-11-20T17:00:00.000Z',
    estimatedHours: 16,
    submissionRequirements: 'Upload signed compliance audit summary spreadsheet and exception memo.',
    attachments: [
      {
        name: 'Batch_FSD_Q4_Student_Manifest.xlsx',
        size: '840 KB',
        uploadedAt: '2026-11-10T09:20:00.000Z',
      },
    ],
    submissions: [
      {
        id: 'sub-001',
        taskId: 'tsk-002',
        submittedById: 'emp-004',
        submittedByName: 'David Chen',
        submittedByEmail: 'david.chen@segacademy.com',
        submittedByRole: 'Compliance Officer',
        submissionDate: '2026-11-19T16:45:00.000Z',
        contentUrl: 'https://storage.segacademy.com/compliance/q4_audit_report.pdf',
        notes: 'Completed check for all 42 enrolled students in Batch Q4. 40 verified cleanly; 2 pending guardian signoff documents flagged in appendix.',
        attachmentName: 'Q4_Compliance_Audit_Report_Final.pdf',
        attachmentSize: '2.1 MB',
        status: 'SUBMITTED',
        reviews: [],
        createdAt: '2026-11-19T16:45:00.000Z',
        updatedAt: '2026-11-19T16:45:00.000Z',
      },
    ],
    timeline: [
      {
        id: 'act-003',
        taskId: 'tsk-002',
        actorName: 'Alexander Wright',
        action: 'Created task with priority URGENT',
        timestamp: '2026-11-10T09:00:00.000Z',
      },
      {
        id: 'act-004',
        taskId: 'tsk-002',
        actorName: 'David Chen',
        action: 'Submitted compliance audit document for review',
        details: 'Q4_Compliance_Audit_Report_Final.pdf',
        timestamp: '2026-11-19T16:45:00.000Z',
      },
      {
        id: 'act-005',
        taskId: 'tsk-002',
        actorName: 'System',
        action: 'Status updated to UNDER_REVIEW',
        timestamp: '2026-11-19T16:45:00.000Z',
      },
    ],
    createdAt: '2026-11-10T09:00:00.000Z',
    updatedAt: '2026-11-19T16:45:00.000Z',
  },
  {
    id: 'tsk-003',
    taskCode: 'TSK-103',
    title: 'Generate Faculty Monthly Attendance & Payroll Reconciliations',
    description: 'Calculate lecture hours delivered vs contractual commitments for November 2026.',
    instructions: 'Reconcile attendance registers across all active courses against automated LMS lecture logs.',
    departmentId: 'dept-fin',
    departmentName: 'Finance & Accounts',
    teamId: 'team-payroll',
    teamName: 'Financial Operations',
    assignedToId: 'emp-005',
    assignedToName: 'Elena Rostova',
    assignedToEmail: 'elena.rostova@segacademy.com',
    assignedToRole: 'Accounts Specialist',
    createdById: 'emp-admin',
    createdByName: 'Alexander Wright',
    createdByRole: 'Founder / Super Admin',
    priority: 'MEDIUM',
    status: 'DONE',
    startDate: '2026-11-01T09:00:00.000Z',
    dueDate: '2026-11-12T17:00:00.000Z',
    completedAt: '2026-11-11T15:20:00.000Z',
    estimatedHours: 12,
    submissionRequirements: 'Upload signed reconciliation sheet approved by Dean of Academics.',
    submissions: [
      {
        id: 'sub-002',
        taskId: 'tsk-003',
        submittedById: 'emp-005',
        submittedByName: 'Elena Rostova',
        submittedByEmail: 'elena.rostova@segacademy.com',
        submissionDate: '2026-11-10T14:30:00.000Z',
        contentUrl: 'https://storage.segacademy.com/finance/nov_faculty_payroll.xlsx',
        notes: 'All 14 faculty members reconciled. Overtime hours calculated according to institutional rate schedule.',
        attachmentName: 'Faculty_Reconciliation_Nov_Signed.xlsx',
        attachmentSize: '460 KB',
        status: 'GRADED',
        reviews: [
          {
            id: 'rev-001',
            submissionId: 'sub-002',
            reviewerId: 'emp-admin',
            reviewerName: 'Alexander Wright',
            reviewerEmail: 'alexander.wright@segacademy.com',
            reviewerJobTitle: 'Founder / Super Admin',
            score: 98,
            feedback: 'Accurate reconciliation. Approved for disbursement.',
            status: 'APPROVED',
            reviewedAt: '2026-11-11T15:20:00.000Z',
            createdAt: '2026-11-11T15:20:00.000Z',
          },
        ],
        createdAt: '2026-11-10T14:30:00.000Z',
        updatedAt: '2026-11-11T15:20:00.000Z',
      },
    ],
    timeline: [
      {
        id: 'act-006',
        taskId: 'tsk-003',
        actorName: 'Alexander Wright',
        action: 'Created task',
        timestamp: '2026-11-01T09:00:00.000Z',
      },
      {
        id: 'act-007',
        taskId: 'tsk-003',
        actorName: 'Elena Rostova',
        action: 'Submitted payroll reconciliation',
        timestamp: '2026-11-10T14:30:00.000Z',
      },
      {
        id: 'act-008',
        taskId: 'tsk-003',
        actorName: 'Alexander Wright',
        action: 'Reviewed submission: APPROVED (Score: 98/100)',
        details: 'Accurate reconciliation. Approved for disbursement.',
        timestamp: '2026-11-11T15:20:00.000Z',
      },
      {
        id: 'act-009',
        taskId: 'tsk-003',
        actorName: 'System',
        action: 'Task marked as DONE',
        timestamp: '2026-11-11T15:20:00.000Z',
      },
    ],
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-11T15:20:00.000Z',
  },
  {
    id: 'tsk-004',
    taskCode: 'TSK-104',
    title: 'Migrate Student Assessment Submissions to Cloud Storage',
    description: 'Transition historical zip archives to protected cloud buckets with SHA-256 integrity verification.',
    instructions: '1. Create backup manifest of all files prior to transfer.\n2. Execute batch transfer script with rate limiting.\n3. Verify checksum matches on destination bucket.',
    departmentId: 'dept-it',
    departmentName: 'Technology & Systems',
    teamId: 'team-devops',
    teamName: 'Infrastructure & Cloud',
    assignedToId: 'emp-003',
    assignedToName: 'Marcus Vance',
    assignedToEmail: 'marcus.vance@segacademy.com',
    assignedToRole: 'Cloud Infrastructure Engineer',
    createdById: 'emp-admin',
    createdByName: 'Alexander Wright',
    createdByRole: 'Founder / Super Admin',
    priority: 'MEDIUM',
    status: 'TODO',
    startDate: '2026-11-20T09:00:00.000Z',
    dueDate: '2026-11-30T18:00:00.000Z',
    estimatedHours: 20,
    submissionRequirements: 'Upload execution log and verify zero failed checksums.',
    submissions: [],
    timeline: [
      {
        id: 'act-010',
        taskId: 'tsk-004',
        actorName: 'Alexander Wright',
        action: 'Created task and assigned to Marcus Vance',
        timestamp: '2026-11-20T09:00:00.000Z',
      },
    ],
    createdAt: '2026-11-20T09:00:00.000Z',
    updatedAt: '2026-11-20T09:00:00.000Z',
  },
  {
    id: 'tsk-005',
    taskCode: 'TSK-105',
    title: 'Prepare Mid-Term Evaluation Rubric for UI/UX Cohort',
    description: 'Establish standard evaluation metrics for Figma wireframe submissions and interactive prototypes.',
    instructions: 'Define grading bands: Visual Hierarchy (30%), Accessibility & Contrast (20%), Component Architecture (30%), Interaction Fidelity (20%).',
    departmentId: 'dept-acad',
    departmentName: 'Academic Operations',
    teamId: 'team-curriculum',
    teamName: 'Curriculum & Content Team',
    assignedToId: 'emp-002',
    assignedToName: 'Sarah Jenkins',
    assignedToEmail: 'sarah.jenkins@segacademy.com',
    assignedToRole: 'Lead Technical Instructor',
    createdById: 'emp-admin',
    createdByName: 'Alexander Wright',
    createdByRole: 'Founder / Super Admin',
    priority: 'LOW',
    status: 'TODO',
    startDate: '2026-11-22T09:00:00.000Z',
    dueDate: '2026-12-05T17:00:00.000Z',
    estimatedHours: 8,
    submissionRequirements: 'Provide rubric document in PDF format with example grade assignments.',
    submissions: [],
    timeline: [
      {
        id: 'act-011',
        taskId: 'tsk-005',
        actorName: 'Alexander Wright',
        action: 'Created task',
        timestamp: '2026-11-22T09:00:00.000Z',
      },
    ],
    createdAt: '2026-11-22T09:00:00.000Z',
    updatedAt: '2026-11-22T09:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// LocalStorage Persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'seg_crm_tasks_v1';

function getStoredTasks(): Task[] {
  if (typeof window === 'undefined') return INITIAL_TASKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TASKS));
      return INITIAL_TASKS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_TASKS;
  } catch {
    return INITIAL_TASKS;
  }
}

function saveStoredTasks(tasks: Task[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {}
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

export const tasksApi = {
  async getTasks(): Promise<Task[]> {
    try {
      const res = await apiClient.get<Task[]>('/tasks');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {}
    return getStoredTasks();
  },

  async getTaskById(id: string): Promise<Task | null> {
    try {
      const res = await apiClient.get<Task>(`/tasks/${id}`);
      if (res.data && res.data.id) {
        return res.data;
      }
    } catch {}

    const tasks = getStoredTasks();
    const found = tasks.find((t) => t.id === id || t.taskCode === id);
    return found || null;
  },

  async createTask(payload: CreateTaskPayload, creator: { id: string; name: string; role?: string }): Promise<Task> {
    try {
      const res = await apiClient.post<Task>('/tasks', payload);
      if (res.data && res.data.id) {
        return res.data;
      }
    } catch {}

    const tasks = getStoredTasks();
    const nextNum = tasks.length + 101;
    const taskCode = `TSK-${nextNum}`;

    const newTask: Task = {
      id: `tsk-${Date.now()}`,
      taskCode,
      title: payload.title.trim(),
      description: payload.description?.trim(),
      instructions: payload.instructions?.trim(),
      departmentId: payload.departmentId,
      departmentName: payload.departmentId ? 'Academic Operations' : undefined,
      teamId: payload.teamId,
      teamName: payload.teamId ? 'Operations Team' : undefined,
      assignedToId: payload.assignedToId,
      assignedToName: payload.assignedToId ? 'Assigned Staff' : undefined,
      createdById: creator.id,
      createdByName: creator.name,
      createdByRole: creator.role || 'Staff',
      priority: payload.priority,
      status: 'TODO',
      startDate: payload.startDate,
      dueDate: payload.dueDate,
      estimatedHours: payload.estimatedHours,
      submissionRequirements: payload.submissionRequirements?.trim(),
      attachments: payload.attachments || [],
      submissions: [],
      timeline: [
        {
          id: `act-${Date.now()}`,
          taskId: `tsk-${Date.now()}`,
          actorName: creator.name,
          action: 'Created task',
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newTask, ...tasks];
    saveStoredTasks(updated);
    return newTask;
  },

  async updateTaskStatus(id: string, status: TaskStatus, actorName: string = 'Staff Member'): Promise<Task | null> {
    try {
      await apiClient.patch(`/tasks/${id}/status`, { status });
    } catch {}

    const tasks = getStoredTasks();
    const idx = tasks.findIndex((t) => t.id === id || t.taskCode === id);
    if (idx === -1) return null;

    const task = tasks[idx];
    const prevStatus = task.status;
    task.status = status;
    task.updatedAt = new Date().toISOString();
    if (status === 'DONE') {
      task.completedAt = new Date().toISOString();
    } else {
      task.completedAt = undefined;
    }

    task.timeline.unshift({
      id: `act-${Date.now()}`,
      taskId: task.id,
      actorName,
      action: `Changed status from ${prevStatus} to ${status}`,
      timestamp: new Date().toISOString(),
    });

    tasks[idx] = task;
    saveStoredTasks(tasks);
    return task;
  },

  async submitWork(payload: SubmitWorkPayload, submitter: { id: string; name: string; email: string; role?: string }): Promise<Task | null> {
    try {
      await apiClient.post(`/tasks/${payload.taskId}/submissions`, payload);
    } catch {}

    const tasks = getStoredTasks();
    const idx = tasks.findIndex((t) => t.id === payload.taskId || t.taskCode === payload.taskId);
    if (idx === -1) return null;

    const task = tasks[idx];

    const submission: TaskSubmission = {
      id: `sub-${Date.now()}`,
      taskId: task.id,
      submittedById: submitter.id,
      submittedByName: submitter.name,
      submittedByEmail: submitter.email,
      submittedByRole: submitter.role,
      submissionDate: new Date().toISOString(),
      contentUrl: payload.contentUrl,
      notes: payload.notes,
      attachmentName: payload.attachmentName,
      attachmentSize: payload.attachmentSize,
      status: 'SUBMITTED',
      reviews: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    task.submissions.unshift(submission);
    task.status = 'UNDER_REVIEW';
    task.updatedAt = new Date().toISOString();

    task.timeline.unshift({
      id: `act-${Date.now()}`,
      taskId: task.id,
      actorName: submitter.name,
      action: 'Submitted work for evaluation',
      details: payload.attachmentName || payload.contentUrl || payload.notes?.slice(0, 50),
      timestamp: new Date().toISOString(),
    });

    tasks[idx] = task;
    saveStoredTasks(tasks);
    return task;
  },

  async reviewSubmission(
    payload: ReviewSubmissionPayload,
    reviewer: { id: string; name: string; email: string; jobTitle?: string }
  ): Promise<Task | null> {
    try {
      await apiClient.post(`/tasks/${payload.taskId}/submissions/${payload.submissionId}/reviews`, payload);
    } catch {}

    const tasks = getStoredTasks();
    const idx = tasks.findIndex((t) => t.id === payload.taskId || t.taskCode === payload.taskId);
    if (idx === -1) return null;

    const task = tasks[idx];
    const subIdx = task.submissions.findIndex((s) => s.id === payload.submissionId);
    if (subIdx === -1) return null;

    const review: TaskSubmissionReview = {
      id: `rev-${Date.now()}`,
      submissionId: payload.submissionId,
      reviewerId: reviewer.id,
      reviewerName: reviewer.name,
      reviewerEmail: reviewer.email,
      reviewerJobTitle: reviewer.jobTitle || 'Reviewer',
      score: payload.score,
      feedback: payload.feedback,
      status: payload.status,
      reviewedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    task.submissions[subIdx].reviews.unshift(review);
    task.submissions[subIdx].status = payload.status === 'APPROVED' ? 'GRADED' : 'RESUBMISSION_REQUESTED';
    task.submissions[subIdx].updatedAt = new Date().toISOString();

    if (payload.status === 'APPROVED') {
      task.status = 'DONE';
      task.completedAt = new Date().toISOString();
    } else {
      task.status = 'IN_PROGRESS';
      task.completedAt = undefined;
    }

    task.updatedAt = new Date().toISOString();

    task.timeline.unshift({
      id: `act-${Date.now()}`,
      taskId: task.id,
      actorName: reviewer.name,
      action: `Reviewed submission: ${payload.status} (Score: ${payload.score}/100)`,
      details: payload.feedback,
      timestamp: new Date().toISOString(),
    });

    tasks[idx] = task;
    saveStoredTasks(tasks);
    return task;
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
