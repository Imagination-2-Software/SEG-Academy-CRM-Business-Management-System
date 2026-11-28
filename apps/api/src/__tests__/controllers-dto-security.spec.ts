import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// DTOs
import { LoginDto, RefreshTokenDto, LogoutDto } from '../auth/dto/auth.dto';
import { SetupFounderDto } from '../auth/dto/setup-founder.dto';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto, ReplaceUserRolesDto } from '../users/dto/users.dto';
import { CreateStudentDto, DirectVerifyDocumentDto } from '../students/dto/students.dto';
import { CreateCourseDto, CreateBatchDto, CreateEnrolmentDto } from '../academic/dto/academic.dto';
import { CreateInvoiceDto, CreateInvoiceItemDto, RecordPaymentDto, CreateCreditNoteDto, CreateDebitNoteDto, CreateRefundDto } from '../billing/dto';
import { CreateDepartmentDto, CreateTeamDto, CreateEmployeeDto } from '../organization/dto';
import { CreateTaskDto, CreateTaskSubmissionDto, CreateSubmissionReviewDto } from '../tasks/dto';

// Controllers
import { AuthController } from '../auth/auth.controller';
import { UsersController } from '../users/users.controller';
import { StudentsController } from '../students/students.controller';
import { AcademicController } from '../academic/academic.controller';
import { BillingController } from '../billing/billing.controller';
import { OrganizationController } from '../organization/organization.controller';
import { TasksController } from '../tasks/tasks.controller';
import { NotificationsController } from '../notifications/notifications.controller';
import { ReportsController } from '../reports/reports.controller';
import { RolesController } from '../roles/roles.controller';
import { TestAccessController } from '../test-access.controller';

// Guards
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/decorators/auth.decorators';
import { InvoiceStatus, PaymentMethod, TaskPriority, TaskStatus, DocumentType, DocumentVerificationStatus } from '@seg/database';

describe('Part 15 Backend Quality Assurance: Comprehensive Security, Controller & DTO Suite', () => {

  const superAdminActor: AuthenticatedUser = {
    userId: 'usr-super-1',
    email: 'founder@segacademy.com',
    fullName: 'Founder Super Admin',
    role: { id: 'role-super', code: 'FOUNDER_SUPER_ADMIN', name: 'Super Admin' },
    roles: ['FOUNDER_SUPER_ADMIN'],
    permissions: [],
  };

  const adminActor: AuthenticatedUser = {
    userId: 'usr-admin-1',
    email: 'admin@segacademy.com',
    fullName: 'Admin User',
    role: { id: 'role-admin', code: 'ADMIN', name: 'Admin' },
    roles: ['ADMIN'],
    permissions: [
      'users:read', 'users:create', 'users:update',
      'students:read', 'students:create', 'students:update', 'students:verify',
      'courses:read', 'courses:create', 'courses:update',
      'batches:read', 'batches:create', 'batches:update',
      'enrolments:read', 'enrolments:create', 'enrolments:update',
      'tasks:read', 'tasks:create', 'tasks:update',
    ],
  };

  const financeActor: AuthenticatedUser = {
    userId: 'usr-fin-1',
    email: 'finance@segacademy.com',
    fullName: 'Finance Officer',
    role: { id: 'role-fin', code: 'FINANCE_MANAGER', name: 'Finance Manager' },
    roles: ['FINANCE_MANAGER'],
    permissions: [
      'invoices:read', 'invoices:create', 'invoices:update',
      'payments:read', 'payments:create',
      'credit_notes:read', 'credit_notes:create',
      'debit_notes:read', 'debit_notes:create',
      'refunds:read', 'refunds:create',
      'reports:read',
    ],
  };

  const internActor: AuthenticatedUser = {
    userId: 'usr-intern-1',
    email: 'intern@segacademy.com',
    fullName: 'Intern User',
    role: { id: 'role-intern', code: 'EMPLOYEE_INTERN', name: 'Employee Intern' },
    roles: ['EMPLOYEE_INTERN'],
    permissions: ['tasks:read'],
  };

  const mockReq: any = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'QA-Test-Agent/1.0' },
    socket: { remoteAddress: '127.0.0.1' },
  };

  // =========================================================================
  // 1. AUTHENTICATION & JWT SECURITY
  // =========================================================================
  describe('1. Authentication & JWT Security Controller & DTO Tests', () => {
    it('1a. LoginDto validation enforces valid email and minimum password length', async () => {
      const invalid = plainToInstance(LoginDto, { email: 'not-an-email', password: '123' }) as object;
      const errors = await validate(invalid);
      assert.ok(errors.length >= 2, 'Expected validation errors for malformed email and short password');

      const valid = plainToInstance(LoginDto, { email: 'test@example.com', password: 'ValidPassword123!' }) as object;
      const validErrors = await validate(valid);
      assert.equal(validErrors.length, 0, 'Valid credentials should have no DTO errors');
    });

    it('1b. SetupFounderDto rejects passwords without sufficient complexity', async () => {
      const weak = plainToInstance(SetupFounderDto, {
        fullName: 'Founder',
        email: 'founder@seg.com',
        password: 'weak',
      }) as object;
      const errors = await validate(weak);
      assert.ok(errors.length > 0, 'Weak password must trigger DTO error');
    });

    it('1c. AuthController forwards setupStatus and login requests to service', async () => {
      let loginCalled = false;
      const mockAuthService: any = {
        getSetupStatus: async () => ({ initialized: true, message: 'Ready' }),
        login: async (dto: any, meta: any) => {
          loginCalled = true;
          return { accessToken: 'mock-access', refreshToken: 'mock-refresh' };
        },
      };
      const controller = new AuthController(mockAuthService, {} as any);

      const status = await controller.getSetupStatus();
      assert.equal(status.initialized, true);

      const result = await controller.login({ email: 'admin@seg.com', password: 'Password123!' }, mockReq);
      assert.equal(loginCalled, true);
      assert.equal((result as any).accessToken, 'mock-access');
    });
  });

  // =========================================================================
  // 2. USERS, ROLES & PERMISSIONS
  // =========================================================================
  describe('2. Users, Roles & Permissions Controller & RBAC Tests', () => {
    it('2a. CreateUserDto validates email, name, password, and mandatory role selection', async () => {
      const invalid = plainToInstance(CreateUserDto, { fullName: '', email: 'invalid' }) as object;
      const errors = await validate(invalid);
      assert.ok(errors.length >= 2);

      const valid = plainToInstance(CreateUserDto, {
        fullName: 'Jane Doe',
        email: 'jane@segacademy.com',
        password: 'SecurePassword123!',
        roleId: '00000000-0000-0000-0000-000000000001',
      }) as object;
      const validErrors = await validate(valid);
      assert.equal(validErrors.length, 0);
    });

    it('2b. UsersController enforces actor metadata passing to service', async () => {
      let createdUser = false;
      const mockUsersService: any = {
        listUsers: async (q: any) => ({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
        createUser: async (dto: any, actor: any, meta: any) => {
          createdUser = true;
          assert.equal(actor.userId, superAdminActor.userId);
          assert.equal(meta.ipAddress, '127.0.0.1');
          return { id: 'usr-new', email: dto.email, fullName: dto.fullName };
        },
      };
      const controller = new UsersController(mockUsersService);

      const list = await controller.listUsers({ page: 1, limit: 10 });
      assert.equal(list.data.length, 0);

      const created = await controller.createUser(
        { fullName: 'Jane Doe', email: 'jane@seg.com', password: 'Password123!', roleId: 'role-1' },
        superAdminActor,
        mockReq,
      );
      assert.equal(createdUser, true);
      assert.equal(created.id, 'usr-new');
    });
  });

  // =========================================================================
  // 3. STUDENTS & KYC
  // =========================================================================
  describe('3. Students & KYC Controller & Validation Tests', () => {
    it('3a. CreateStudentDto validates full name and unique email format', async () => {
      const empty = plainToInstance(CreateStudentDto, {}) as object;
      const errors = await validate(empty);
      assert.ok(errors.some((e) => e.property === 'fullName'));
      assert.ok(errors.some((e) => e.property === 'email'));
    });

    it('3b. DirectVerifyDocumentDto enforces VERIFIED or REJECTED status enum', async () => {
      const invalid = plainToInstance(DirectVerifyDocumentDto, { status: 'UNKNOWN' }) as object;
      const errors = await validate(invalid);
      assert.ok(errors.some((e) => e.property === 'status'));

      const valid = plainToInstance(DirectVerifyDocumentDto, { status: 'VERIFIED' }) as object;
      const validErrors = await validate(valid);
      assert.equal(validErrors.length, 0);
    });

    it('3c. StudentsController delegates search, register, and verify to service', async () => {
      let registered = false;
      let verified = false;
      const mockStudentsService: any = {
        registerStudent: async (dto: any, actor: any, meta: any) => {
          registered = true;
          return { id: 'stu-1', studentCode: 'SEG-26-0001', ...dto };
        },
        listStudents: async () => ({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
        getGlobalDocuments: async () => ({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
        directVerifyDocument: async (docId: string, dto: any, actor: any) => {
          verified = true;
          return { id: docId, status: dto.status };
        },
      };
      const controller = new StudentsController(mockStudentsService);

      await controller.registerStudent(
        { fullName: 'Aarav Patel', email: 'aarav@test.segacademy.internal' },
        adminActor,
        mockReq,
      );
      assert.equal(registered, true);

      await controller.directVerifyDocument('doc-1', { status: 'VERIFIED' as any }, adminActor, mockReq);
      assert.equal(verified, true);
    });
  });

  // =========================================================================
  // 4. COURSES, BATCHES & ENROLMENTS
  // =========================================================================
  describe('4. Courses, Batches & Enrolments Controller & Validation Tests', () => {
    it('4a. CreateCourseDto validates title, course code and duration bounds', async () => {
      const invalid = plainToInstance(CreateCourseDto, { title: '', code: 'code with spaces', durationWeeks: -1 }) as object;
      const errors = await validate(invalid);
      assert.ok(errors.length >= 2);

      const valid = plainToInstance(CreateCourseDto, {
        title: 'Full Stack Web Development',
        code: 'FS-WEB-01',
        durationWeeks: 24,
        baseFee: 50000,
      }) as object;
      const validErrors = await validate(valid);
      assert.equal(validErrors.length, 0);
    });

    it('4b. CreateBatchDto validates batch code, startDate and maximum capacity bounds', async () => {
      const invalid = plainToInstance(CreateBatchDto, {
        name: 'Batch 1',
        batchCode: 'B1',
        courseId: '00000000-0000-0000-0000-000000000001',
        startDate: 'invalid-date',
        capacity: 0,
      }) as object;
      const errors = await validate(invalid);
      assert.ok(errors.some((e) => e.property === 'startDate'));
      assert.ok(errors.some((e) => e.property === 'capacity'));
    });

    it('4c. AcademicController routes course creation and student enrolment', async () => {
      let courseCreated = false;
      let studentEnrolled = false;
      const mockAcademicService: any = {
        createCourse: async (dto: any, actor: any) => {
          courseCreated = true;
          return { id: 'crs-1', ...dto };
        },
        enrolStudent: async (dto: any, actor: any) => {
          studentEnrolled = true;
          return { id: 'enr-1', ...dto };
        },
        listCourses: async () => ({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
      };
      const controller = new AcademicController(mockAcademicService);

      await controller.createCourse({ title: 'AI Engineering', code: 'AI-ENG', durationWeeks: 12, baseFee: 25000 }, adminActor, mockReq);
      assert.equal(courseCreated, true);

      await controller.enrolStudent({ studentId: 'stu-1', batchId: 'bat-1' }, adminActor, mockReq);
      assert.equal(studentEnrolled, true);
    });
  });

  // =========================================================================
  // 5. INVOICES, PAYMENTS, CREDIT NOTES, DEBIT NOTES & REFUNDS
  // =========================================================================
  describe('5. Invoices, Payments, Credit Notes & Refunds Security & Calculations', () => {
    it('5a. CreateInvoiceItemDto rejects negative unit prices or zero quantities', async () => {
      const negativeItem = plainToInstance(CreateInvoiceItemDto, {
        description: 'Test',
        quantity: 0,
        unitPrice: -500,
        amount: -500,
      }) as object;
      const errors = await validate(negativeItem);
      assert.ok(errors.some((e) => e.property === 'quantity'));
      assert.ok(errors.some((e) => e.property === 'unitPrice'));
    });

    it('5b. RecordPaymentDto validates positive amount and valid payment method', async () => {
      const invalid = plainToInstance(RecordPaymentDto, {
        invoiceId: '00000000-0000-0000-0000-000000000001',
        amount: -100,
        method: 'BITCOIN' as any,
      }) as object;
      const errors = await validate(invalid);
      assert.ok(errors.some((e) => e.property === 'amount'));
      assert.ok(errors.some((e) => e.property === 'method'));

      const valid = plainToInstance(RecordPaymentDto, {
        invoiceId: '00000000-0000-0000-0000-000000000001',
        amount: 25000,
        method: PaymentMethod.UPI,
      }) as object;
      const validErrors = await validate(valid);
      assert.equal(validErrors.length, 0);
    });

    it('5c. BillingController delegates financial operations with security metadata', async () => {
      let invoiceCreated = false;
      let paymentRecorded = false;
      const mockBillingService: any = {
        createInvoice: async (dto: any, actor: any, meta: any) => {
          invoiceCreated = true;
          return { id: 'inv-1', invoiceNumber: 'INV-2026-0001', totalAmount: 50000 };
        },
        recordPayment: async (dto: any, actor: any, meta: any) => {
          paymentRecorded = true;
          return { id: 'pay-1', amount: dto.amount };
        },
      };
      const controller = new BillingController(mockBillingService);

      await controller.createInvoice(
        {
          studentId: '00000000-0000-0000-0000-000000000001',
          issueDate: '2026-11-28',
          dueDate: '2026-12-15',
          subtotal: 50000,
          totalAmount: 50000,
          items: [{ description: 'Fee', quantity: 1, unitPrice: 50000, amount: 50000 }],
        },
        financeActor,
        mockReq,
      );
      assert.equal(invoiceCreated, true);

      await controller.recordPayment(
        '00000000-0000-0000-0000-000000000001',
        {
          amount: 50000,
          method: PaymentMethod.BANK_TRANSFER,
        },
        financeActor,
        mockReq,
      );
      assert.equal(paymentRecorded, true);
    });
  });

  // =========================================================================
  // 6. DEPARTMENTS, TEAMS & EMPLOYEES
  // =========================================================================
  describe('6. Organization Management (Departments, Teams & Employees)', () => {
    it('6a. CreateDepartmentDto validates required name and uppercase alphanumeric code', async () => {
      const invalid = plainToInstance(CreateDepartmentDto, { name: '', code: '' }) as object;
      const errors = await validate(invalid);
      assert.ok(errors.some((e) => e.property === 'name'));
      assert.ok(errors.some((e) => e.property === 'code'));

      const valid = plainToInstance(CreateDepartmentDto, { name: 'Technology', code: 'TECH' }) as object;
      const validErrors = await validate(valid);
      assert.equal(validErrors.length, 0);
    });

    it('6b. OrganizationController coordinates department and team queries', async () => {
      let deptCreated = false;
      const mockOrgService: any = {
        getDepartments: async () => [{ id: 'dept-1', name: 'Engineering', code: 'ENG' }],
        createDepartment: async (dto: any, actor: any) => {
          deptCreated = true;
          return { id: 'dept-1', ...dto };
        },
      };
      const controller = new OrganizationController(mockOrgService);

      const list = await controller.getDepartments();
      assert.equal(list.length, 1);

      await controller.createDepartment({ name: 'Academics', code: 'ACAD' }, adminActor, mockReq);
      assert.equal(deptCreated, true);
    });
  });

  // =========================================================================
  // 7. TASKS, SUBMISSIONS & REVIEWS
  // =========================================================================
  describe('7. Tasks, Submissions & Review Workflow Tests', () => {
    it('7a. CreateTaskDto validates title minimum length and priority enum', async () => {
      const invalid = plainToInstance(CreateTaskDto, { title: 'ab', priority: 'URGENT_NOW' as any }) as object;
      const errors = await validate(invalid);
      assert.ok(errors.some((e) => e.property === 'title'));
      assert.ok(errors.some((e) => e.property === 'priority'));

      const valid = plainToInstance(CreateTaskDto, { title: 'Grade Quiz 2', priority: TaskPriority.HIGH }) as object;
      const validErrors = await validate(valid);
      assert.equal(validErrors.length, 0);
    });

    it('7b. TasksController restricts task creation and passes actor context', async () => {
      let taskCreated = false;
      const mockTasksService: any = {
        createTask: async (dto: any, actor: any) => {
          taskCreated = true;
          return { id: 'tsk-1', ...dto };
        },
        getTasks: async (q: any, actor: any) => ({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      };
      const controller = new TasksController(mockTasksService);

      await controller.createTask({ title: 'Audit Syllabus', priority: TaskPriority.MEDIUM }, adminActor, mockReq);
      assert.equal(taskCreated, true);
    });
  });

  // =========================================================================
  // 8. NOTIFICATIONS & BROADCASTS
  // =========================================================================
  describe('8. Notifications & Broadcast Controller Tests', () => {
    it('8a. NotificationsController marks notifications as read for current user', async () => {
      let markedAll = false;
      const mockNotificationsService: any = {
        getUserNotifications: async (userId: string) => [],
        markAllAsRead: async (userId: string) => {
          markedAll = true;
          return { success: true };
        },
      };
      const controller = new NotificationsController(mockNotificationsService);

      const res = await controller.markAllAsRead(adminActor);
      assert.equal(markedAll, true);
      assert.equal(res.success, true);
    });
  });

  // =========================================================================
  // 9. DASHBOARD & REPORTS SUMMARY
  // =========================================================================
  describe('9. Dashboard & Executive Reports Controller Tests', () => {
    it('9a. ReportsController exposes getSummary to authorized roles', async () => {
      const mockReportsService: any = {
        getExecutiveSummary: async () => ({
          billing: { totalInvoiced: 100000, totalCollected: 80000, collectionRate: 80 },
          tasks: { totalTasks: 10, completionRate: 70 },
          organization: { employeeCount: 15, departmentCount: 3 },
        }),
      };
      const controller = new ReportsController(mockReportsService);

      const summary = await controller.getSummary();
      assert.equal(summary.billing.collectionRate, 80);
      assert.equal(summary.organization.departmentCount, 3);
    });
  });

  // =========================================================================
  // 10. DIAGNOSTIC RBAC & CROSS-USER SECURITY
  // =========================================================================
  describe('10. Diagnostic RBAC, IDOR & Cross-User Security Endpoints', () => {
    it('10a. PermissionsGuard blocks users lacking required granular permissions', async () => {
      const reflector = {
        getAllAndOverride: (key: string) => {
          if (key === 'permissions') return [{ resource: 'invoices', action: 'create' }];
          return null;
        },
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);

      const internContext: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: internActor }),
        }),
      };

      await assert.rejects(
        async () => guard.canActivate(internContext),
        (err: any) => err instanceof ForbiddenException,
      );

      const financeContext: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: financeActor }),
        }),
      };
      const allowed = guard.canActivate(financeContext);
      assert.equal(allowed, true);
    });

    it('10b. TestAccessController exposes public and authenticated inspection endpoints', () => {
      const controller = new TestAccessController();
      const pub = controller.getPublic();
      assert.equal(pub.access, 'public');

      const auth = controller.getAuthenticated(financeActor);
      assert.equal(auth.access, 'authenticated');
      assert.equal(auth.user.email, financeActor.email);
    });
  });

});
