import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/decorators/auth.decorators';
import {
  CreateTaskDto,
  UpdateTaskStatusDto,
  AssignTaskDto,
  QueryTasksDto,
  CreateTaskSubmissionDto,
  CreateSubmissionReviewDto,
} from './dto';
import { TaskStatus, Prisma } from '@seg/database';

export interface PaginatedTasksResult {
  data: any[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Securely resolves the ProfileEmployee entity for the authenticated user.
   * Throws ForbiddenException if the user has no employee profile in the database.
   */
  async resolveEmployeeProfile(actor: AuthenticatedUser) {
    const profile = await this.prisma.profileEmployee.findUnique({
      where: { userId: actor.userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!profile) {
      throw new ForbiddenException(
        'Authenticated user is not linked to an active employee profile.',
      );
    }
    return profile;
  }

  // ==========================================
  // TASKS CRUD & WORKFLOW
  // ==========================================

  async getTasks(query: QueryTasksDto, actor: AuthenticatedUser): Promise<PaginatedTasksResult> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }
    if (query.teamId) {
      where.teamId = query.teamId;
    }
    if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, tasks] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  avatarUrl: true,
                  role: { select: { code: true, name: true } },
                },
              },
            },
          },
          createdBy: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  role: { select: { code: true, name: true } },
                },
              },
            },
          },
          department: { select: { id: true, name: true, code: true } },
          team: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    const data = tasks.map((t) => this.mapTaskToResponse(t));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getTaskById(id: string): Promise<any> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                role: { select: { code: true, name: true } },
              },
            },
          },
        },
        createdBy: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: { select: { code: true, name: true } },
              },
            },
          },
        },
        department: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true, code: true } },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID '${id}' not found.`);
    }

    return this.mapTaskToResponse(task);
  }

  async createTask(
    dto: CreateTaskDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const creator = await this.resolveEmployeeProfile(actor);

    // Validate assignee if provided
    if (dto.assignedToId) {
      const assignee = await this.prisma.profileEmployee.findUnique({
        where: { id: dto.assignedToId },
      });
      if (!assignee) {
        throw new BadRequestException(`Assignee employee '${dto.assignedToId}' not found.`);
      }
    }

    // Validate department & team if provided
    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept) {
        throw new BadRequestException(`Department '${dto.departmentId}' not found.`);
      }
    }

    if (dto.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: dto.teamId },
      });
      if (!team) {
        throw new BadRequestException(`Team '${dto.teamId}' not found.`);
      }
      if (dto.departmentId && team.departmentId !== dto.departmentId) {
        throw new BadRequestException(`Team '${dto.teamId}' does not belong to the selected department.`);
      }
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        createdById: creator.id,
        assignedToId: dto.assignedToId || null,
        departmentId: dto.departmentId || null,
        teamId: dto.teamId || null,
        priority: dto.priority,
        status: TaskStatus.TODO,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: {
        assignedTo: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                role: { select: { code: true, name: true } },
              },
            },
          },
        },
        createdBy: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: { select: { code: true, name: true } },
              },
            },
          },
        },
        department: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true, code: true } },
      },
    });

    await this.auditService.log({
      actorUserId: actor.userId,
      action: 'TASK_CREATE',
      resource: 'tasks',
      resourceId: task.id,
      payload: { title: task.title, priority: task.priority, assignedToId: task.assignedToId },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return this.mapTaskToResponse(task);
  }

  async updateTaskStatus(
    id: string,
    dto: UpdateTaskStatusDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const employee = await this.resolveEmployeeProfile(actor);

    const existing = await this.prisma.task.findUnique({
      where: { id },
      include: { assignedTo: true, createdBy: true },
    });

    if (!existing) {
      throw new NotFoundException(`Task with ID '${id}' not found.`);
    }

    // Authorization: User must be assignee, creator, or possess tasks:manage/admin permissions
    const isAssignee = existing.assignedToId === employee.id;
    const isCreator = existing.createdById === employee.id;
    const isSuperOrAdmin =
      actor.roles.includes('FOUNDER_SUPER_ADMIN') || actor.roles.includes('ADMIN');

    if (!isAssignee && !isCreator && !isSuperOrAdmin) {
      throw new ForbiddenException('Only the assignee, creator, or an administrator can update task status.');
    }

    // Status transition validation
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      TODO: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
      IN_PROGRESS: [TaskStatus.UNDER_REVIEW, TaskStatus.DONE, TaskStatus.CANCELLED, TaskStatus.TODO],
      UNDER_REVIEW: [TaskStatus.DONE, TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
      DONE: [TaskStatus.IN_PROGRESS],
      CANCELLED: [TaskStatus.TODO],
    };

    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from '${existing.status}' to '${dto.status}'. Allowed: ${allowed.join(', ')}`,
      );
    }

    const completedAt = dto.status === TaskStatus.DONE ? new Date() : null;

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: dto.status,
        completedAt: completedAt !== null ? completedAt : (dto.status !== TaskStatus.DONE ? null : undefined),
      },
      include: {
        assignedTo: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                role: { select: { code: true, name: true } },
              },
            },
          },
        },
        createdBy: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: { select: { code: true, name: true } },
              },
            },
          },
        },
        department: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true, code: true } },
      },
    });

    await this.auditService.log({
      actorUserId: actor.userId,
      action: 'TASK_STATUS_UPDATE',
      resource: 'tasks',
      resourceId: id,
      payload: { previousStatus: existing.status, newStatus: dto.status },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return this.mapTaskToResponse(updated);
  }

  async assignTask(
    id: string,
    dto: AssignTaskDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const existing = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Task with ID '${id}' not found.`);
    }

    if (dto.assignedToId) {
      const assignee = await this.prisma.profileEmployee.findUnique({
        where: { id: dto.assignedToId },
      });
      if (!assignee) {
        throw new BadRequestException(`Assignee employee '${dto.assignedToId}' not found.`);
      }
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        assignedToId: dto.assignedToId || null,
      },
      include: {
        assignedTo: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                role: { select: { code: true, name: true } },
              },
            },
          },
        },
        createdBy: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: { select: { code: true, name: true } },
              },
            },
          },
        },
        department: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true, code: true } },
      },
    });

    await this.auditService.log({
      actorUserId: actor.userId,
      action: 'TASK_ASSIGN',
      resource: 'tasks',
      resourceId: id,
      payload: { previousAssignee: existing.assignedToId, newAssignee: dto.assignedToId },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return this.mapTaskToResponse(updated);
  }

  // ==========================================
  // SUBMISSIONS & REVIEWS
  // ==========================================

  async createSubmission(
    taskId: string,
    dto: CreateTaskSubmissionDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const employee = await this.resolveEmployeeProfile(actor);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID '${taskId}' not found.`);
    }

    // Only assigned employee, task creator, or admin can submit work
    const isAssignee = task.assignedToId === employee.id;
    const isCreator = task.createdById === employee.id;
    const isSuperOrAdmin =
      actor.roles.includes('FOUNDER_SUPER_ADMIN') || actor.roles.includes('ADMIN');

    if (!isAssignee && !isCreator && !isSuperOrAdmin) {
      throw new ForbiddenException('Only the assigned employee can submit work for this task.');
    }

    // Atomic update: Set task status to UNDER_REVIEW and update task timestamp
    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.UNDER_REVIEW,
          updatedAt: new Date(),
        },
        include: {
          assignedTo: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  avatarUrl: true,
                  role: { select: { code: true, name: true } },
                },
              },
            },
          },
          createdBy: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  role: { select: { code: true, name: true } },
                },
              },
            },
          },
          department: { select: { id: true, name: true, code: true } },
          team: { select: { id: true, name: true, code: true } },
        },
      });

      return updated;
    });

    const response = this.mapTaskToResponse(updatedTask);

    // Synthesize structured submission response item
    const syntheticSubmission = {
      id: `sub-${Date.now()}`,
      taskId,
      submittedById: employee.id,
      submittedByName: employee.user.fullName,
      submittedByEmail: employee.user.email,
      submittedByRole: employee.user.role.name,
      submissionDate: new Date().toISOString(),
      contentUrl: dto.contentUrl,
      notes: dto.notes,
      attachmentName: dto.attachmentName,
      attachmentSize: dto.attachmentSize,
      status: 'SUBMITTED',
      reviews: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    response.submissions.unshift(syntheticSubmission);

    await this.auditService.log({
      actorUserId: actor.userId,
      action: 'TASK_SUBMISSION_CREATE',
      resource: 'tasks',
      resourceId: taskId,
      payload: {
        submittedById: employee.id,
        attachmentName: dto.attachmentName,
        contentUrl: dto.contentUrl,
      },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return response;
  }

  async reviewSubmission(
    taskId: string,
    submissionId: string,
    dto: CreateSubmissionReviewDto,
    actor: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const reviewer = await this.resolveEmployeeProfile(actor);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignedTo: true, createdBy: true },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID '${taskId}' not found.`);
    }

    // STRICT SELF-REVIEW PREVENTION:
    // Reviewer cannot review a task if they are the task assignee who submitted the work
    if (task.assignedToId === reviewer.id) {
      throw new ForbiddenException('Employees are strictly prohibited from evaluating their own task submissions.');
    }

    // Determine target task status
    const targetStatus = dto.status === 'APPROVED' ? TaskStatus.DONE : TaskStatus.IN_PROGRESS;
    const completedAt = dto.status === 'APPROVED' ? new Date() : null;

    // Atomic transaction updating task status
    const updatedTask = await this.prisma.$transaction(async (tx) => {
      return tx.task.update({
        where: { id: taskId },
        data: {
          status: targetStatus,
          completedAt,
          updatedAt: new Date(),
        },
        include: {
          assignedTo: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  avatarUrl: true,
                  role: { select: { code: true, name: true } },
                },
              },
            },
          },
          createdBy: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  role: { select: { code: true, name: true } },
                },
              },
            },
          },
          department: { select: { id: true, name: true, code: true } },
          team: { select: { id: true, name: true, code: true } },
        },
      });
    });

    const response = this.mapTaskToResponse(updatedTask);

    await this.auditService.log({
      actorUserId: actor.userId,
      action: 'TASK_SUBMISSION_REVIEW',
      resource: 'tasks',
      resourceId: taskId,
      payload: {
        reviewerId: reviewer.id,
        submissionId,
        score: dto.score,
        outcome: dto.status,
      },
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
    });

    return response;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private mapTaskToResponse(task: any) {
    const taskCode = `TSK-${task.id.slice(0, 8).toUpperCase()}`;

    return {
      id: task.id,
      taskCode,
      title: task.title,
      description: task.description,
      departmentId: task.departmentId,
      departmentName: task.department?.name,
      teamId: task.teamId,
      teamName: task.team?.name,
      assignedToId: task.assignedToId,
      assignedToName: task.assignedTo?.user?.fullName,
      assignedToEmail: task.assignedTo?.user?.email,
      assignedToRole: task.assignedTo?.user?.role?.name,
      assignedToAvatar: task.assignedTo?.user?.avatarUrl,
      createdById: task.createdById,
      createdByName: task.createdBy?.user?.fullName,
      createdByRole: task.createdBy?.user?.role?.name,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
      completedAt: task.completedAt ? task.completedAt.toISOString() : undefined,
      submissions: [] as any[],
      timeline: [
        {
          id: `act-${task.id}-create`,
          taskId: task.id,
          actorName: task.createdBy?.user?.fullName || 'System',
          action: 'Created task',
          timestamp: task.createdAt.toISOString(),
        },
      ],
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
