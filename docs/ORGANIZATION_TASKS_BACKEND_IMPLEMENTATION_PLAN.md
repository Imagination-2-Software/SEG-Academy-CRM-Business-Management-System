# Backend Architecture Review & Integration Plan: Organization & Tasks Modules
**SEG Academy CRM & Business Management System**
**Document Reference:** `docs/ORGANIZATION_TASKS_BACKEND_IMPLEMENTATION_PLAN.md`
**Date:** November 26, 2026
**Status:** Architecture Blueprint & Implementation Specification (Read-Only Review)

---

## 1. Executive Summary & Architectural Alignment

### 1.1 Objective
This architectural plan specifies the concrete NestJS module architecture, database operations, security guards, data transfer objects (DTOs), and end-to-end integration contracts required to replace the mock/in-memory data layers in `apps/web/src/lib/api/organization.ts` and `apps/web/src/lib/api/tasks.ts` with real, production-ready NestJS endpoints.

### 1.2 Monorepo Context & Alignment
- **Runtime Environment:** NestJS 10 backend (`apps/api`), Next.js 14 App Router frontend (`apps/web`), Prisma 5.10 with PostgreSQL (`packages/database`).
- **Global Standards Observed:**
  - Standard global response interceptor (`ResponseInterceptor`): wraps all controller responses into `{ success: true, statusCode, message, data, timestamp, path, correlationId }`.
  - Pagination envelope: returns `{ data: T[], meta: { total, page, limit, totalPages } }`.
  - Global guards pipeline: `RateLimiterGuard` -> `JwtAuthGuard` -> `RolesGuard` -> `PermissionsGuard`.
  - Global exception filter: `GlobalExceptionFilter` mapping standard Nest exceptions, Prisma errors (`P2002`, `P2025`, `P2003`), and business conflicts.
  - Strict CRM boundary: Internal employee/management CRM only; no public student portal features.

---

## 2. Prisma Schema Review & Entity Relationships

### 2.1 Organization Models (`packages/database/prisma/schema.prisma`)
The database schema already contains full relational support for organizational hierarchy:

1. **`Department` (`departments` table):**
   - Fields: `id` (UUID), `name` (String, unique), `code` (String, unique), `description` (String?), `createdAt`, `updatedAt`.
   - Relations:
     - `teams`: `Team[]` (One-to-Many).
     - `employees`: `ProfileEmployee[]` (One-to-Many).
     - `tasks`: `Task[]` (One-to-Many).
   - *Note on Head of Department:* Schema does not have a separate `headId` foreign key on `Department`; department heads are designated via `ProfileEmployee.jobTitle` / role or can be computed/stored via an optional metadata field or convention.

2. **`Team` (`teams` table):**
   - Fields: `id` (UUID), `departmentId` (UUID -> Department), `name` (String), `code` (String, unique), `description` (String?), `leadId` (UUID?, nullable -> `ProfileEmployee`), `createdAt`, `updatedAt`.
   - Constraints: `@@unique([departmentId, name])`, index on `[departmentId]`, index on `[leadId]`.
   - Relations:
     - `department`: `Department` (onDelete: Cascade).
     - `lead`: `ProfileEmployee?` (onDelete: SetNull).
     - `employees`: `ProfileEmployee[]`.
     - `tasks`: `Task[]`.

3. **`ProfileEmployee` (`profile_employees` table):**
   - Fields: `id` (UUID), `userId` (UUID, unique -> `User`), `employeeCode` (String, unique), `jobTitle` (String), `employmentType` (`EmploymentType`: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERN`), `departmentId` (UUID? -> Department), `teamId` (UUID? -> Team), `managerId` (UUID? -> ProfileEmployee), `joinDate` (DateTime), `exitDate` (DateTime?), `emergencyContact` (Json?), `bankDetails` (Json?), `createdAt`, `updatedAt`.
   - Constraints: indexes on `[departmentId]`, `[teamId]`, `[managerId]`, `[employmentType]`.
   - Relations:
     - `user`: `User` (onDelete: Cascade).
     - `department`: `Department?`.
     - `team`: `Team?`.
     - `manager`: `ProfileEmployee?` (self-relation).
     - `internProfile`: `InternDetails?` (One-to-One).

4. **`InternDetails` (`intern_details` table):**
   - Fields: `id` (UUID), `employeeId` (UUID, unique -> ProfileEmployee), `mentorId` (UUID? -> ProfileEmployee), `status` (`InternshipStatus`: `ACTIVE`, `COMPLETED`, `TERMINATED`), `startDate` (DateTime), `endDate` (DateTime?), `collegeName` (String?), `academicDegree` (String?), `performanceNotes` (String?).
   - Relations:
     - `employee`: `ProfileEmployee` (onDelete: Cascade).
     - `mentor`: `ProfileEmployee?` (onDelete: SetNull).

### 2.2 Tasks, Assignments, Submissions & Reviews Models
The schema contains distinct models for internal CRM workflow tasks as well as academic assignment/evaluation models:

1. **`Task` (`tasks` table) - Internal Staff/Employee Workflow:**
   - Fields: `id` (UUID), `title` (String), `description` (String?), `assignedToId` (UUID? -> `ProfileEmployee`), `createdById` (UUID -> `ProfileEmployee`), `departmentId` (UUID? -> `Department`), `teamId` (UUID? -> `Team`), `priority` (`TaskPriority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`), `status` (`TaskStatus`: `TODO`, `IN_PROGRESS`, `UNDER_REVIEW`, `DONE`, `CANCELLED`), `dueDate` (DateTime?), `completedAt` (DateTime?), `createdAt`, `updatedAt`.
   - Relations: `assignedTo`, `createdBy`, `department`, `team`.

2. **`Assignment`, `Submission`, `SubmissionReview` - Academic & Practical Evaluations:**
   - **`Assignment` (`assignments` table):**
     - Fields: `id`, `batchId`, `createdById`, `title`, `description`, `totalMarks` (Decimal 5,2), `dueDate`, `createdAt`, `updatedAt`.
   - **`Submission` (`submissions` table):**
     - Fields: `id`, `assignmentId`, `studentId`, `submissionDate`, `contentUrl` (storage key), `notes`, `status` (`SubmissionStatus`: `SUBMITTED`, `EVALUATED`, `REJECTED`, `RESUBMISSION_REQUESTED`), `createdAt`, `updatedAt`.
     - Unique constraint: `@@unique([assignmentId, studentId])`.
   - **`SubmissionReview` (`submission_reviews` table):**
     - Fields: `id`, `submissionId`, `reviewerId` (UUID -> `ProfileEmployee`), `score` (Decimal 5,2), `feedback` (String?), `reviewedAt`, `createdAt`, `updatedAt`.
     - Index on `[submissionId]`, `[reviewerId]`.

---

## 3. Security, RBAC & Permissions Enforcement

### 3.1 Permission System Integration
All new controllers will utilize the existing RBAC system:
- Guard stack: `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)`
- Permissions decorator: `@Permissions(Permission.USERS_READ)`, `@Permissions(Permission.TASKS_READ)`, etc.

### 3.2 Specific Permissions Mapping

| Module | Action | Endpoint | Required Permission |
| :--- | :--- | :--- | :--- |
| **Organization** | List Departments | `GET /api/v1/departments` | `users:read` |
| | Get Department by ID | `GET /api/v1/departments/:id` | `users:read` |
| | Create Department | `POST /api/v1/departments` | `users:create` |
| | Update Department | `PATCH /api/v1/departments/:id` | `users:update` |
| | List Teams | `GET /api/v1/teams` | `users:read` |
| | Get Team by ID | `GET /api/v1/teams/:id` | `users:read` |
| | Create Team | `POST /api/v1/teams` | `users:create` |
| | Update Team | `PATCH /api/v1/teams/:id` | `users:update` |
| | List Employees | `GET /api/v1/employees` | `users:read` |
| | Get Employee by ID | `GET /api/v1/employees/:id` | `users:read` |
| | Create Employee (Profile + User) | `POST /api/v1/employees` | `users:create` |
| | Update Employee Profile | `PATCH /api/v1/employees/:id` | `users:update` |
| | Update Employee Status | `PATCH /api/v1/employees/:id/status` | `users:update` |
| **Tasks** | List Tasks | `GET /api/v1/tasks` | `tasks:read` |
| | Get Task Details | `GET /api/v1/tasks/:id` | `tasks:read` |
| | Create Task | `POST /api/v1/tasks` | `tasks:create` |
| | Update Task Status | `PATCH /api/v1/tasks/:id/status` | `tasks:update` |
| | Assign Task | `PATCH /api/v1/tasks/:id/assign` | `tasks:update` |
| | Create Task Submission | `POST /api/v1/tasks/:id/submissions` | `tasks:update` |
| | Review/Grade Submission | `POST /api/v1/tasks/:id/submissions/:subId/reviews` | `tasks:review` (or `tasks:update`) |

### 3.3 Strict Business Logic & Self-Review Prevention
In `apps/api/src/tasks/tasks.service.ts`:
- **Self-Evaluation Guard:** When creating a submission review:
  ```typescript
  if (submission.submittedById === currentEmployeeId) {
    throw new ForbiddenException('Reviewers cannot evaluate their own submissions.');
  }
  ```
- **Permission Check:** Submitting a review requires permission `tasks:review` or `tasks:update`.
- **Status Consistency:** Marking a submission as evaluated automatically updates the parent `Task` or `Submission` status to `UNDER_REVIEW` or `DONE`.

---

## 4. Organization Module Implementation Plan

### 4.1 Module Structure (`apps/api/src/organization/`)
```
apps/api/src/organization/
├── dto/
│   ├── department.dto.ts
│   ├── team.dto.ts
│   └── employee.dto.ts
├── organization.controller.ts
├── organization.service.ts
└── organization.module.ts
```

### 4.2 DTO Definitions

#### `department.dto.ts`
```typescript
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Academic Faculty' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'ACAD' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @ApiPropertyOptional({ example: 'Manages curriculum and lectures' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
```

#### `team.dto.ts`
```typescript
import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ example: 'Full Stack Engineering' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'ENG-FS' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @ApiProperty({ example: 'uuid-of-department' })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @ApiPropertyOptional({ example: 'uuid-of-lead-employee' })
  @IsUUID()
  @IsOptional()
  leadId?: string;

  @ApiPropertyOptional({ example: 'Handles full stack curriculum delivery' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}
```

#### `employee.dto.ts`
```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsEmail, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, Role } from '@prisma/client';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'EMP-010' })
  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'jane.doe@segacademy.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Senior Instructor' })
  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @ApiProperty({ enum: EmploymentType, example: EmploymentType.FULL_TIME })
  @IsEnum(EmploymentType)
  employmentType: EmploymentType;

  @ApiProperty({ enum: Role, example: Role.INSTRUCTOR })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ example: 'uuid-of-department' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-team' })
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-manager' })
  @IsUUID()
  @IsOptional()
  managerId?: string;

  @ApiProperty({ example: '2026-01-15' })
  @IsDateString()
  joinDate: string;

  // Intern details (optional, required if employmentType === 'INTERN')
  @ApiPropertyOptional({ example: 'ABC Institute of Technology' })
  @IsString()
  @IsOptional()
  collegeName?: string;

  @ApiPropertyOptional({ example: 'B.Tech Computer Science' })
  @IsString()
  @IsOptional()
  academicDegree?: string;

  @ApiPropertyOptional({ example: 'uuid-of-mentor' })
  @IsUUID()
  @IsOptional()
  mentorId?: string;
}

export class EmployeeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
```

### 4.3 Service Implementation Details (`organization.service.ts`)
1. **Departments & Teams Aggregation:**
   - Include counts using Prisma `_count`:
     ```typescript
     include: {
       _count: { select: { employees: true, teams: true } },
       teams: { include: { _count: { select: { employees: true } }, lead: { include: { user: true } } } }
     }
     ```
2. **Employee Creation Transaction:**
   - Create `User` record (with default secure temporary password or invite token) and `ProfileEmployee` in a single `$transaction`:
     ```typescript
     return this.prisma.$transaction(async (tx) => {
       const user = await tx.user.create({
         data: {
           email: dto.email,
           firstName: dto.firstName,
           lastName: dto.lastName,
           role: dto.role,
           status: AccountStatus.ACTIVE,
           passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
         }
       });
       const profile = await tx.profileEmployee.create({
         data: {
           userId: user.id,
           employeeCode: dto.employeeCode,
           jobTitle: dto.jobTitle,
           employmentType: dto.employmentType,
           departmentId: dto.departmentId,
           teamId: dto.teamId,
           managerId: dto.managerId,
           joinDate: new Date(dto.joinDate),
         }
       });
       if (dto.employmentType === EmploymentType.INTERN) {
         await tx.internDetails.create({
           data: {
             employeeId: profile.id,
             mentorId: dto.mentorId,
             status: InternshipStatus.ACTIVE,
             startDate: new Date(dto.joinDate),
             collegeName: dto.collegeName,
             academicDegree: dto.academicDegree,
           }
         });
       }
       return { ...profile, user };
     });
     ```

---

## 5. Tasks & Reviews Module Implementation Plan

### 5.1 Module Structure (`apps/api/src/tasks/`)
```
apps/api/src/tasks/
├── dto/
│   ├── task.dto.ts
│   ├── submission.dto.ts
│   └── review.dto.ts
├── tasks.controller.ts
├── tasks.service.ts
└── tasks.module.ts
```

### 5.2 DTO Definitions

#### `task.dto.ts`
```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({ example: 'Review Module 4 Curriculum' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Ensure all code examples are verified against Node 20' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-of-assigned-employee' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-department' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-team' })
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiProperty({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @ApiPropertyOptional({ example: '2026-12-01T18:00:00Z' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
```

#### `submission.dto.ts` & `review.dto.ts`
```typescript
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskSubmissionDto {
  @ApiPropertyOptional({ example: 'https://storage.segacademy.com/submissions/doc1.pdf' })
  @IsString()
  @IsOptional()
  contentUrl?: string;

  @ApiPropertyOptional({ example: 'Completed the draft review and attached observations.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'Curriculum_Draft_v2.pdf' })
  @IsString()
  @IsOptional()
  attachmentName?: string;

  @ApiPropertyOptional({ example: '2.4 MB' })
  @IsString()
  @IsOptional()
  attachmentSize?: string;
}

export class CreateSubmissionReviewDto {
  @ApiProperty({ example: 88.5, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiPropertyOptional({ example: 'Excellent analysis, suggestions incorporated.' })
  @IsString()
  @IsOptional()
  feedback?: string;

  @ApiProperty({ example: 'APPROVED', enum: ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'] })
  @IsString()
  @IsNotEmpty()
  status: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
}
```

### 5.3 Service Implementation Details (`tasks.service.ts`)
1. **Querying Tasks with Assignee & Creator Profiles:**
   ```typescript
   return this.prisma.task.findMany({
     where,
     include: {
       assignedTo: { include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } } },
       createdBy: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
       department: { select: { id: true, name: true, code: true } },
       team: { select: { id: true, name: true, code: true } },
     },
     orderBy: { createdAt: 'desc' },
     skip,
     take: limit,
   });
   ```
2. **Preventing Self-Review:**
   - In `createReview(taskId: string, submissionId: string, reviewerEmployeeId: string, dto: CreateSubmissionReviewDto)`:
     ```typescript
     const submission = await this.prisma.submission.findUnique({
       where: { id: submissionId },
       include: { student: true }
     });
     if (!submission) throw new NotFoundException('Submission not found.');

     // If the submitter is linked to the current reviewer, disallow
     // (In task submissions, verify author vs reviewer)
     if (submission.studentId === reviewerEmployeeId) {
       throw new ForbiddenException('You cannot review your own submission.');
     }
     ```

---

## 6. Frontend Integration & Compatibility

### 6.1 Compatibility with `apps/web/src/lib/api/organization.ts`
The existing `organization.ts` frontend file expects:
- `organizationService.getDepartments()` -> mapping to `GET /departments`.
- `organizationService.getTeams()` -> mapping to `GET /teams`.
- `organizationService.getEmployees(params)` -> mapping to `GET /employees`.
- `organizationService.getInterns(params)` -> mapping to `GET /employees?employmentType=INTERN`.
- `organizationService.createDepartment(data)` -> mapping to `POST /departments`.
- `organizationService.createTeam(data)` -> mapping to `POST /teams`.
- `organizationService.createEmployee(data)` -> mapping to `POST /employees`.

### 6.2 Compatibility with `apps/web/src/lib/api/tasks.ts`
The frontend service `tasksApi` expects:
- `tasksApi.getTasks(filter)` -> `GET /tasks`.
- `tasksApi.getTaskById(id)` -> `GET /tasks/:id`.
- `tasksApi.createTask(data)` -> `POST /tasks`.
- `tasksApi.updateTaskStatus(id, status)` -> `PATCH /tasks/:id/status`.
- `tasksApi.createSubmission(taskId, data)` -> `POST /tasks/:id/submissions`.
- `tasksApi.reviewSubmission(taskId, submissionId, data)` -> `POST /tasks/:id/submissions/:subId/reviews`.

---

## 7. Automated Test Suite & Verification Matrix

### 7.1 Backend Unit Tests
1. **`organization.service.spec.ts`:**
   - `getDepartments`: returns list with computed counts (`employeeCount`, `teamCount`).
   - `createDepartment`: succeeds with valid payload; throws `ConflictException` on duplicate `name` or `code`.
   - `createTeam`: validates `departmentId` existence; throws `ConflictException` on duplicate `code`.
   - `createEmployee`: verifies transactional creation of `User` and `ProfileEmployee`; creates `InternDetails` if `employmentType === 'INTERN'`.
2. **`tasks.service.spec.ts`:**
   - `getTasks`: verifies role filtering and pagination.
   - `createTask`: creates task and links `assignedToId` and `createdById`.
   - `createSubmission`: appends submission and updates task status.
   - `createReview`: evaluates score; verifies self-review rejection (`ForbiddenException`).

### 7.2 Controller Tests
1. **`organization.controller.spec.ts`:**
   - Verifies `@Permissions('users:read')`, `@Permissions('users:create')`.
   - Verifies validation pipes on query filters.
2. **`tasks.controller.spec.ts`:**
   - Verifies `@Permissions('tasks:read')`, `@Permissions('tasks:create')`, `@Permissions('tasks:review')`.

---

## 8. Implementation Steps & Checklist

- [ ] **Step 1:** Generate `OrganizationModule`, `OrganizationController`, `OrganizationService` in `apps/api/src/organization`.
- [ ] **Step 2:** Implement DTOs for Department, Team, and Employee in `apps/api/src/organization/dto`.
- [ ] **Step 3:** Implement Prisma queries and transactional creations in `OrganizationService`.
- [ ] **Step 4:** Generate `TasksModule`, `TasksController`, `TasksService` in `apps/api/src/tasks`.
- [ ] **Step 5:** Implement DTOs for Task, Submission, and Review in `apps/api/src/tasks/dto`.
- [ ] **Step 6:** Implement Prisma queries, status transitions, and self-review protection in `TasksService`.
- [ ] **Step 7:** Register `OrganizationModule` and `TasksModule` in `AppModule`.
- [ ] **Step 8:** Add comprehensive unit test suites (`organization.service.spec.ts`, `tasks.service.spec.ts`).
- [ ] **Step 9:** Run backend unit test runner (`npm test --workspace=apps/api`) to confirm 100% pass rate.
- [ ] **Step 10:** Update frontend service adapters in `apps/web/src/lib/api/organization.ts` and `apps/web/src/lib/api/tasks.ts` to consume real endpoints seamlessly.
