import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TasksService } from '../tasks.service';
import { AuthenticatedUser } from '../../auth/decorators/auth.decorators';
import { TaskPriority, TaskStatus } from '@seg/database';

describe('TasksService Comprehensive Unit Tests', () => {
  const adminActor: AuthenticatedUser = {
    userId: 'usr-admin-1',
    email: 'admin@segacademy.com',
    fullName: 'System Admin',
    role: { id: 'role-admin', code: 'ADMIN', name: 'Administrator' },
    roles: ['ADMIN'],
    permissions: ['tasks:read', 'tasks:create', 'tasks:update', 'tasks:review'],
  };

  const employeeActor: AuthenticatedUser = {
    userId: 'usr-emp-1',
    email: 'john@segacademy.com',
    fullName: 'John Assignee',
    role: { id: 'role-emp', code: 'EMPLOYEE_INTERN', name: 'Employee' },
    roles: ['EMPLOYEE_INTERN'],
    permissions: ['tasks:read', 'tasks:update'],
  };

  const reviewerActor: AuthenticatedUser = {
    userId: 'usr-reviewer-1',
    email: 'lead@segacademy.com',
    fullName: 'Jane Reviewer',
    role: { id: 'role-lead', code: 'TEAM_LEADER', name: 'Team Lead' },
    roles: ['TEAM_LEADER'],
    permissions: ['tasks:read', 'tasks:update', 'tasks:review'],
  };

  const mockEmployeeProfile = {
    id: 'emp-profile-1',
    userId: 'usr-emp-1',
    employeeCode: 'EMP-001',
    jobTitle: 'Developer',
    user: {
      id: 'usr-emp-1',
      fullName: 'John Assignee',
      email: 'john@segacademy.com',
      role: { code: 'EMPLOYEE_INTERN', name: 'Employee' },
    },
  };

  const mockAdminProfile = {
    id: 'emp-admin-profile',
    userId: 'usr-admin-1',
    employeeCode: 'ADM-001',
    jobTitle: 'Admin',
    user: {
      id: 'usr-admin-1',
      fullName: 'System Admin',
      email: 'admin@segacademy.com',
      role: { code: 'ADMIN', name: 'Administrator' },
    },
  };

  const mockReviewerProfile = {
    id: 'emp-reviewer-profile',
    userId: 'usr-reviewer-1',
    employeeCode: 'REV-001',
    jobTitle: 'Team Lead',
    user: {
      id: 'usr-reviewer-1',
      fullName: 'Jane Reviewer',
      email: 'lead@segacademy.com',
      role: { code: 'TEAM_LEADER', name: 'Team Lead' },
    },
  };

  const mockAuditService = {
    log: async () => {},
  };

  it('1. should throw ForbiddenException when user has no linked employee profile', async () => {
    const mockPrisma = {
      profileEmployee: {
        findUnique: async () => null,
      },
    };

    const service = new TasksService(mockPrisma as any, mockAuditService as any);

    await assert.rejects(
      async () => {
        await service.createTask(
          { title: 'Test Task', priority: TaskPriority.MEDIUM },
          adminActor,
        );
      },
      (err: any) => err instanceof ForbiddenException,
    );
  });

  it('2. should create task successfully and link creator ProfileEmployee', async () => {
    let createdPayload: any = null;
    const mockPrisma = {
      profileEmployee: {
        findUnique: async ({ where }: any) => {
          if (where.userId === adminActor.userId) return mockAdminProfile;
          if (where.id === 'emp-profile-1') return mockEmployeeProfile;
          return null;
        },
      },
      task: {
        create: async ({ data }: any) => {
          createdPayload = data;
          return {
            id: 'task-new-12345678',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            assignedTo: mockEmployeeProfile,
            createdBy: mockAdminProfile,
            department: null,
            team: null,
          };
        },
      },
    };

    const service = new TasksService(mockPrisma as any, mockAuditService as any);

    const result = await service.createTask(
      {
        title: 'Build API Module',
        description: 'Implement NestJS Tasks module',
        priority: TaskPriority.HIGH,
        assignedToId: 'emp-profile-1',
      },
      adminActor,
    );

    assert.equal(result.title, 'Build API Module');
    assert.equal(createdPayload.createdById, mockAdminProfile.id);
    assert.equal(createdPayload.assignedToId, 'emp-profile-1');
    assert.equal(result.status, 'TODO');
  });

  it('3. should update task status with valid transitions and record audit', async () => {
    const mockTask = {
      id: 'task-1',
      title: 'Task 1',
      status: TaskStatus.TODO,
      assignedToId: 'emp-profile-1',
      createdById: 'emp-admin-profile',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrisma = {
      profileEmployee: {
        findUnique: async () => mockEmployeeProfile,
      },
      task: {
        findUnique: async () => mockTask,
        update: async ({ data }: any) => ({
          ...mockTask,
          ...data,
          assignedTo: mockEmployeeProfile,
          createdBy: mockAdminProfile,
        }),
      },
    };

    const service = new TasksService(mockPrisma as any, mockAuditService as any);

    const updated = await service.updateTaskStatus(
      'task-1',
      { status: TaskStatus.IN_PROGRESS },
      employeeActor,
    );

    assert.equal(updated.status, TaskStatus.IN_PROGRESS);
  });

  it('4. should reject invalid status transition with BadRequestException', async () => {
    const mockTask = {
      id: 'task-1',
      title: 'Task 1',
      status: TaskStatus.TODO,
      assignedToId: 'emp-profile-1',
      createdById: 'emp-admin-profile',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrisma = {
      profileEmployee: {
        findUnique: async () => mockEmployeeProfile,
      },
      task: {
        findUnique: async () => mockTask,
      },
    };

    const service = new TasksService(mockPrisma as any, mockAuditService as any);

    await assert.rejects(
      async () => {
        // Direct transition from TODO to DONE is disallowed (must be IN_PROGRESS or UNDER_REVIEW)
        await service.updateTaskStatus(
          'task-1',
          { status: TaskStatus.DONE },
          employeeActor,
        );
      },
      (err: any) => err instanceof BadRequestException,
    );
  });

  it('5. should allow assigned employee to submit deliverable and set status to UNDER_REVIEW', async () => {
    const mockTask = {
      id: 'task-1',
      title: 'Task 1',
      status: TaskStatus.IN_PROGRESS,
      assignedToId: 'emp-profile-1',
      createdById: 'emp-admin-profile',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrisma = {
      profileEmployee: {
        findUnique: async () => mockEmployeeProfile,
      },
      task: {
        findUnique: async () => mockTask,
        update: async ({ data }: any) => ({
          ...mockTask,
          ...data,
          assignedTo: mockEmployeeProfile,
          createdBy: mockAdminProfile,
        }),
      },
      $transaction: async (cb: any) => cb({
        task: {
          update: async ({ data }: any) => ({
            ...mockTask,
            ...data,
            assignedTo: mockEmployeeProfile,
            createdBy: mockAdminProfile,
          }),
        },
      }),
    };

    const service = new TasksService(mockPrisma as any, mockAuditService as any);

    const result = await service.createSubmission(
      'task-1',
      {
        contentUrl: 'https://storage.segacademy.com/deliverables/task-1.zip',
        notes: 'Ready for evaluation',
        attachmentName: 'deliverable.zip',
      },
      employeeActor,
    );

    assert.equal(result.status, TaskStatus.UNDER_REVIEW);
    assert.equal(result.submissions.length, 1);
    assert.equal((result.submissions[0] as any).submittedById, mockEmployeeProfile.id);
  });

  it('6. SELF-REVIEW PREVENTION: Should throw ForbiddenException if assignee reviews own task', async () => {
    const mockTask = {
      id: 'task-1',
      title: 'Task 1',
      status: TaskStatus.UNDER_REVIEW,
      assignedToId: 'emp-profile-1', // Same as employeeActor
      createdById: 'emp-admin-profile',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrisma = {
      profileEmployee: {
        findUnique: async () => mockEmployeeProfile,
      },
      task: {
        findUnique: async () => mockTask,
      },
    };

    const service = new TasksService(mockPrisma as any, mockAuditService as any);

    await assert.rejects(
      async () => {
        await service.reviewSubmission(
          'task-1',
          'sub-123',
          { score: 95, status: 'APPROVED', feedback: 'I did a great job' },
          employeeActor,
        );
      },
      (err: any) => err instanceof ForbiddenException,
    );
  });

  it('7. should allow authorized reviewer to grade submission and transition task to DONE on approval', async () => {
    const mockTask = {
      id: 'task-1',
      title: 'Task 1',
      status: TaskStatus.UNDER_REVIEW,
      assignedToId: 'emp-profile-1', // Assigned to John
      createdById: 'emp-admin-profile',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrisma = {
      profileEmployee: {
        findUnique: async () => mockReviewerProfile, // Jane is reviewing John's work
      },
      task: {
        findUnique: async () => mockTask,
      },
      $transaction: async (cb: any) => cb({
        task: {
          update: async ({ data }: any) => ({
            ...mockTask,
            ...data,
            assignedTo: mockEmployeeProfile,
            createdBy: mockAdminProfile,
          }),
        },
      }),
    };

    const service = new TasksService(mockPrisma as any, mockAuditService as any);

    const result = await service.reviewSubmission(
      'task-1',
      'sub-123',
      { score: 92, status: 'APPROVED', feedback: 'Excellent work' },
      reviewerActor,
    );

    assert.equal(result.status, TaskStatus.DONE);
  });
});
