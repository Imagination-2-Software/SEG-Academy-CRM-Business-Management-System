import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { AuthenticatedUser } from '../auth/decorators/auth.decorators';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreateTeamDto,
  UpdateTeamDto,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  UpdateEmployeeStatusDto,
  QueryEmployeesDto,
} from './dto';
import {
  AccountStatus,
  EmploymentType,
  InternshipStatus,
  Prisma,
} from '@seg/database';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly passwordService: PasswordService,
  ) {}

  // ==========================================
  // DEPARTMENTS
  // ==========================================

  async getDepartments() {
    const departments = await this.prisma.department.findMany({
      include: {
        _count: {
          select: {
            employees: true,
            teams: true,
          },
        },
        teams: {
          include: {
            _count: {
              select: {
                employees: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return departments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description,
      employeeCount: d._count.employees,
      teamCount: d._count.teams,
      teams: d.teams.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        description: t.description,
        departmentId: t.departmentId,
        employeeCount: t._count.employees,
      })),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  async getDepartmentById(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            teams: true,
          },
        },
        teams: {
          include: {
            _count: {
              select: {
                employees: true,
              },
            },
          },
        },
        employees: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID '${id}' not found.`);
    }

    return {
      id: department.id,
      name: department.name,
      code: department.code,
      description: department.description,
      employeeCount: department._count.employees,
      teamCount: department._count.teams,
      teams: department.teams.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        description: t.description,
        departmentId: t.departmentId,
        employeeCount: t._count.employees,
      })),
      employees: department.employees.map((e) => ({
        id: e.id,
        employeeCode: e.employeeCode,
        jobTitle: e.jobTitle,
        employmentType: e.employmentType,
        fullName: e.user.fullName,
        email: e.user.email,
        status: e.user.status,
      })),
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    };
  }

  async createDepartment(
    dto: CreateDepartmentDto,
    actor?: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const existing = await this.prisma.department.findFirst({
      where: {
        OR: [{ name: dto.name }, { code: dto.code.toUpperCase() }],
      },
    });

    if (existing) {
      if (existing.name.toLowerCase() === dto.name.toLowerCase()) {
        throw new ConflictException(`Department with name '${dto.name}' already exists.`);
      }
      throw new ConflictException(`Department with code '${dto.code}' already exists.`);
    }

    const department = await this.prisma.department.create({
      data: {
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        description: dto.description?.trim(),
      },
    });

    if (actor) {
      await this.auditService.log({
        actorUserId: actor.userId,
        action: 'DEPARTMENT_CREATE',
        resource: 'departments',
        resourceId: department.id,
        payload: { name: department.name, code: department.code },
        ipAddress: clientMeta?.ipAddress,
        userAgent: clientMeta?.userAgent,
      });
    }

    return department;
  }

  // ==========================================
  // TEAMS
  // ==========================================

  async getTeams(departmentId?: string) {
    const where: Prisma.TeamWhereInput = {};
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const teams = await this.prisma.team.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            employees: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      description: t.description,
      departmentId: t.departmentId,
      department: t.department,
      employeeCount: t._count.employees,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  async getTeamById(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            employees: true,
          },
        },
        employees: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID '${id}' not found.`);
    }

    return {
      id: team.id,
      name: team.name,
      code: team.code,
      description: team.description,
      departmentId: team.departmentId,
      department: team.department,
      employeeCount: team._count.employees,
      employees: team.employees.map((e) => ({
        id: e.id,
        employeeCode: e.employeeCode,
        jobTitle: e.jobTitle,
        employmentType: e.employmentType,
        fullName: e.user.fullName,
        email: e.user.email,
        status: e.user.status,
      })),
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  async createTeam(
    dto: CreateTeamDto,
    actor?: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new BadRequestException(`Department with ID '${dto.departmentId}' does not exist.`);
    }

    const existingCode = await this.prisma.team.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existingCode) {
      throw new ConflictException(`Team with code '${dto.code}' already exists.`);
    }

    const existingName = await this.prisma.team.findUnique({
      where: {
        departmentId_name: {
          departmentId: dto.departmentId,
          name: dto.name.trim(),
        },
      },
    });
    if (existingName) {
      throw new ConflictException(
        `A team named '${dto.name}' already exists in department '${department.name}'.`,
      );
    }

    const team = await this.prisma.team.create({
      data: {
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        departmentId: dto.departmentId,
        description: dto.description?.trim(),
      },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (actor) {
      await this.auditService.log({
        actorUserId: actor.userId,
        action: 'TEAM_CREATE',
        resource: 'teams',
        resourceId: team.id,
        payload: { name: team.name, code: team.code, departmentId: team.departmentId },
        ipAddress: clientMeta?.ipAddress,
        userAgent: clientMeta?.userAgent,
      });
    }

    return team;
  }

  // ==========================================
  // EMPLOYEES & INTERNS
  // ==========================================

  async getEmployees(query: QueryEmployeesDto): Promise<PaginatedResult<any>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ProfileEmployeeWhereInput = {};

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }
    if (query.teamId) {
      where.teamId = query.teamId;
    }
    if (query.employmentType) {
      where.employmentType = query.employmentType;
    }
    if (query.status) {
      where.user = { status: query.status };
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { employeeCode: { contains: s, mode: 'insensitive' } },
        { jobTitle: { contains: s, mode: 'insensitive' } },
        { user: { fullName: { contains: s, mode: 'insensitive' } } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, records] = await Promise.all([
      this.prisma.profileEmployee.count({ where }),
      this.prisma.profileEmployee.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phoneNumber: true,
              status: true,
              avatarUrl: true,
              role: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          manager: {
            select: {
              id: true,
              employeeCode: true,
              jobTitle: true,
              user: {
                select: {
                  fullName: true,
                  email: true,
                },
              },
            },
          },
          internProfile: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const data = records.map((emp) => ({
      id: emp.id,
      userId: emp.userId,
      employeeCode: emp.employeeCode,
      fullName: emp.user.fullName,
      email: emp.user.email,
      phoneNumber: emp.user.phoneNumber,
      jobTitle: emp.jobTitle,
      employmentType: emp.employmentType,
      status: emp.user.status,
      avatarUrl: emp.user.avatarUrl,
      role: emp.user.role,
      departmentId: emp.departmentId,
      department: emp.department,
      teamId: emp.teamId,
      team: emp.team,
      managerId: emp.managerId,
      manager: emp.manager
        ? {
            id: emp.manager.id,
            employeeCode: emp.manager.employeeCode,
            fullName: emp.manager.user.fullName,
            jobTitle: emp.manager.jobTitle,
          }
        : null,
      joinDate: emp.joinDate,
      exitDate: emp.exitDate,
      internDetails: emp.internProfile,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    }));

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

  async getEmployeeById(id: string) {
    const emp = await this.prisma.profileEmployee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            status: true,
            avatarUrl: true,
            lastLoginAt: true,
            createdAt: true,
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        department: true,
        team: true,
        manager: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
        directReports: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
        internProfile: {
          include: {
            mentor: {
              include: {
                user: {
                  select: {
                    fullName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!emp) {
      throw new NotFoundException(`Employee with ID '${id}' not found.`);
    }

    return {
      id: emp.id,
      userId: emp.userId,
      employeeCode: emp.employeeCode,
      fullName: emp.user.fullName,
      email: emp.user.email,
      phoneNumber: emp.user.phoneNumber,
      jobTitle: emp.jobTitle,
      employmentType: emp.employmentType,
      status: emp.user.status,
      avatarUrl: emp.user.avatarUrl,
      lastLoginAt: emp.user.lastLoginAt,
      role: {
        id: emp.user.role.id,
        code: emp.user.role.code,
        name: emp.user.role.name,
      },
      departmentId: emp.departmentId,
      department: emp.department,
      teamId: emp.teamId,
      team: emp.team,
      managerId: emp.managerId,
      manager: emp.manager
        ? {
            id: emp.manager.id,
            employeeCode: emp.manager.employeeCode,
            fullName: emp.manager.user.fullName,
            jobTitle: emp.manager.jobTitle,
          }
        : null,
      directReports: emp.directReports.map((dr) => ({
        id: dr.id,
        employeeCode: dr.employeeCode,
        fullName: dr.user.fullName,
        jobTitle: dr.jobTitle,
      })),
      internDetails: emp.internProfile
        ? {
            id: emp.internProfile.id,
            status: emp.internProfile.status,
            startDate: emp.internProfile.startDate,
            endDate: emp.internProfile.endDate,
            collegeName: emp.internProfile.collegeName,
            academicDegree: emp.internProfile.academicDegree,
            mentor: emp.internProfile.mentor
              ? {
                  id: emp.internProfile.mentor.id,
                  employeeCode: emp.internProfile.mentor.employeeCode,
                  fullName: emp.internProfile.mentor.user.fullName,
                }
              : null,
          }
        : null,
      joinDate: emp.joinDate,
      exitDate: emp.exitDate,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    };
  }

  async createEmployee(
    dto: CreateEmployeeDto,
    actor?: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Uniqueness checks
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new ConflictException(`User with email '${dto.email}' already exists.`);
    }

    const existingCode = await this.prisma.profileEmployee.findUnique({
      where: { employeeCode: dto.employeeCode.trim().toUpperCase() },
    });
    if (existingCode) {
      throw new ConflictException(`Employee code '${dto.employeeCode}' is already in use.`);
    }

    // 2. Validate department & team if provided
    if (dto.departmentId) {
      const deptExists = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!deptExists) {
        throw new BadRequestException(`Department '${dto.departmentId}' not found.`);
      }
    }

    if (dto.teamId) {
      const teamExists = await this.prisma.team.findUnique({
        where: { id: dto.teamId },
      });
      if (!teamExists) {
        throw new BadRequestException(`Team '${dto.teamId}' not found.`);
      }
      if (dto.departmentId && teamExists.departmentId !== dto.departmentId) {
        throw new BadRequestException(`Team '${dto.teamId}' does not belong to the selected department.`);
      }
    }

    if (dto.managerId) {
      const mgrExists = await this.prisma.profileEmployee.findUnique({
        where: { id: dto.managerId },
      });
      if (!mgrExists) {
        throw new BadRequestException(`Manager employee '${dto.managerId}' not found.`);
      }
    }

    // 3. Resolve Role
    let role = null;
    if (dto.roleCode) {
      role = await this.prisma.role.findFirst({
        where: {
          OR: [{ code: dto.roleCode.toUpperCase() }, { id: dto.roleCode }],
        },
      });
    }

    if (!role) {
      // Default to EMPLOYEE_INTERN if not provided
      role = await this.prisma.role.findUnique({
        where: { code: 'EMPLOYEE_INTERN' },
      });
    }

    if (!role) {
      // Fallback to first role if seeding differs
      role = await this.prisma.role.findFirst();
      if (!role) {
        throw new BadRequestException('No valid system role found to assign to employee.');
      }
    }

    // 4. Generate random temporary password
    const rawTempPassword = `SEG@${Math.random().toString(36).slice(-8)}!2026`;
    const passwordHash = await this.passwordService.hashPassword(rawTempPassword);

    // 5. Execute Prisma Transaction (User + ProfileEmployee + optional InternDetails)
    const result = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          fullName: dto.fullName.trim(),
          phoneNumber: dto.phoneNumber?.trim() || null,
          roleId: role.id,
          status: AccountStatus.ACTIVE,
          passwordHash,
        },
        include: {
          role: true,
        },
      });

      const createdProfile = await tx.profileEmployee.create({
        data: {
          userId: createdUser.id,
          employeeCode: dto.employeeCode.trim().toUpperCase(),
          jobTitle: dto.jobTitle.trim(),
          employmentType: dto.employmentType,
          departmentId: dto.departmentId || null,
          teamId: dto.teamId || null,
          managerId: dto.managerId || null,
          joinDate: new Date(dto.joinDate),
        },
        include: {
          department: true,
          team: true,
        },
      });

      let internRecord = null;
      if (dto.employmentType === EmploymentType.INTERN) {
        internRecord = await tx.internDetails.create({
          data: {
            employeeId: createdProfile.id,
            mentorId: dto.mentorId || null,
            status: InternshipStatus.ACTIVE,
            startDate: new Date(dto.joinDate),
            endDate: dto.endDate ? new Date(dto.endDate) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
            collegeName: dto.collegeName?.trim() || null,
            academicDegree: dto.academicDegree?.trim() || null,
          },
        });
      }

      return {
        id: createdProfile.id,
        userId: createdUser.id,
        employeeCode: createdProfile.employeeCode,
        fullName: createdUser.fullName,
        email: createdUser.email,
        phoneNumber: createdUser.phoneNumber,
        jobTitle: createdProfile.jobTitle,
        employmentType: createdProfile.employmentType,
        status: createdUser.status,
        role: createdUser.role,
        department: createdProfile.department,
        team: createdProfile.team,
        internDetails: internRecord,
        joinDate: createdProfile.joinDate,
        createdAt: createdProfile.createdAt,
      };
    });

    if (actor) {
      await this.auditService.log({
        actorUserId: actor.userId,
        action: 'EMPLOYEE_CREATE',
        resource: 'employees',
        resourceId: result.id,
        payload: {
          employeeCode: result.employeeCode,
          email: result.email,
          employmentType: result.employmentType,
        },
        ipAddress: clientMeta?.ipAddress,
        userAgent: clientMeta?.userAgent,
      });
    }

    return result;
  }

  async updateEmployee(
    id: string,
    dto: UpdateEmployeeDto,
    actor?: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const existing = await this.prisma.profileEmployee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      throw new NotFoundException(`Employee with ID '${id}' not found.`);
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept) throw new BadRequestException(`Department '${dto.departmentId}' not found.`);
    }

    if (dto.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: dto.teamId },
      });
      if (!team) throw new BadRequestException(`Team '${dto.teamId}' not found.`);
    }

    if (dto.managerId) {
      if (dto.managerId === id) {
        throw new BadRequestException('An employee cannot be their own manager.');
      }
      const mgr = await this.prisma.profileEmployee.findUnique({
        where: { id: dto.managerId },
      });
      if (!mgr) throw new BadRequestException(`Manager '${dto.managerId}' not found.`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.fullName || dto.phoneNumber !== undefined) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            fullName: dto.fullName ? dto.fullName.trim() : undefined,
            phoneNumber: dto.phoneNumber !== undefined ? dto.phoneNumber : undefined,
          },
        });
      }

      return tx.profileEmployee.update({
        where: { id },
        data: {
          jobTitle: dto.jobTitle ? dto.jobTitle.trim() : undefined,
          employmentType: dto.employmentType || undefined,
          departmentId: dto.departmentId !== undefined ? dto.departmentId : undefined,
          teamId: dto.teamId !== undefined ? dto.teamId : undefined,
          managerId: dto.managerId !== undefined ? dto.managerId : undefined,
          exitDate: dto.exitDate ? new Date(dto.exitDate) : undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              status: true,
              role: true,
            },
          },
          department: true,
          team: true,
        },
      });
    });

    if (actor) {
      await this.auditService.log({
        actorUserId: actor.userId,
        action: 'EMPLOYEE_UPDATE',
        resource: 'employees',
        resourceId: id,
        payload: dto as Record<string, unknown>,
        ipAddress: clientMeta?.ipAddress,
        userAgent: clientMeta?.userAgent,
      });
    }

    return updated;
  }

  async updateEmployeeStatus(
    id: string,
    dto: UpdateEmployeeStatusDto,
    actor?: AuthenticatedUser,
    clientMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const existing = await this.prisma.profileEmployee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      throw new NotFoundException(`Employee with ID '${id}' not found.`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: existing.userId },
      data: { status: dto.status },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
      },
    });

    if (actor) {
      await this.auditService.log({
        actorUserId: actor.userId,
        action: 'EMPLOYEE_STATUS_UPDATE',
        resource: 'employees',
        resourceId: id,
        payload: { previousStatus: existing.user.status, newStatus: dto.status },
        ipAddress: clientMeta?.ipAddress,
        userAgent: clientMeta?.userAgent,
      });
    }

    return {
      id: existing.id,
      userId: updatedUser.id,
      employeeCode: existing.employeeCode,
      status: updatedUser.status,
    };
  }
}
