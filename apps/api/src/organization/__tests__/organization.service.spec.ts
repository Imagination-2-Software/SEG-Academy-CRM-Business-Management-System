import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { OrganizationService } from '../organization.service';
import { AuthenticatedUser } from '../../auth/decorators/auth.decorators';
import { EmploymentType, AccountStatus } from '@seg/database';

describe('OrganizationService Unit Tests', () => {
  const actor: AuthenticatedUser = {
    userId: 'usr-admin-1',
    email: 'admin@segacademy.com',
    fullName: 'System Admin',
    role: { id: 'role-admin-id', code: 'ADMIN', name: 'Administrator' },
    roles: ['ADMIN'],
    permissions: ['users:read', 'users:create', 'users:update'],
  };

  const mockAuditService = {
    log: async () => {},
  };

  const mockPasswordService = {
    hashPassword: async (pwd: string) => `hashed_${pwd}`,
    verifyPassword: async () => true,
  };

  it('should list departments with aggregated employee and team counts', async () => {
    const mockDepartments = [
      {
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        description: 'Tech division',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { employees: 5, teams: 2 },
        teams: [
          {
            id: 'team-1',
            name: 'Frontend',
            code: 'ENG-FE',
            description: null,
            departmentId: 'dept-1',
            _count: { employees: 3 },
          },
        ],
      },
    ];

    const mockPrisma = {
      department: {
        findMany: async () => mockDepartments,
      },
    };

    const service = new OrganizationService(
      mockPrisma as any,
      mockAuditService as any,
      mockPasswordService as any,
    );

    const result = await service.getDepartments();
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Engineering');
    assert.equal(result[0].employeeCount, 5);
    assert.equal(result[0].teamCount, 2);
    assert.equal(result[0].teams[0].employeeCount, 3);
  });

  it('should throw ConflictException on duplicate department name or code', async () => {
    const mockPrisma = {
      department: {
        findFirst: async () => ({ id: 'dept-old', name: 'Existing Dept', code: 'EXIST' }),
      },
    };

    const service = new OrganizationService(
      mockPrisma as any,
      mockAuditService as any,
      mockPasswordService as any,
    );

    await assert.rejects(
      async () => {
        await service.createDepartment({ name: 'Existing Dept', code: 'NEW' }, actor);
      },
      (err: any) => err instanceof ConflictException,
    );
  });

  it('should create department successfully and log audit', async () => {
    let auditLogged = false;
    const auditService = {
      log: async () => {
        auditLogged = true;
      },
    };

    const mockPrisma = {
      department: {
        findFirst: async () => null,
        create: async ({ data }: any) => ({
          id: 'dept-new-id',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    };

    const service = new OrganizationService(
      mockPrisma as any,
      auditService as any,
      mockPasswordService as any,
    );

    const result = await service.createDepartment(
      { name: 'Human Resources', code: 'HR', description: 'Talent' },
      actor,
    );

    assert.equal(result.id, 'dept-new-id');
    assert.equal(result.code, 'HR');
    assert.equal(auditLogged, true);
  });

  it('should throw BadRequestException when creating team with non-existent department', async () => {
    const mockPrisma = {
      department: {
        findUnique: async () => null,
      },
    };

    const service = new OrganizationService(
      mockPrisma as any,
      mockAuditService as any,
      mockPasswordService as any,
    );

    await assert.rejects(
      async () => {
        await service.createTeam(
          { name: 'Core Team', code: 'CORE', departmentId: 'missing-dept-id' },
          actor,
        );
      },
      (err: any) => err instanceof BadRequestException,
    );
  });

  it('should throw ConflictException when creating team with duplicate code', async () => {
    const mockPrisma = {
      department: {
        findUnique: async () => ({ id: 'dept-1', name: 'Engineering' }),
      },
      team: {
        findUnique: async ({ where }: any) => {
          if (where.code) return { id: 'team-existing', code: 'ENG-FE' };
          return null;
        },
      },
    };

    const service = new OrganizationService(
      mockPrisma as any,
      mockAuditService as any,
      mockPasswordService as any,
    );

    await assert.rejects(
      async () => {
        await service.createTeam(
          { name: 'New Team', code: 'ENG-FE', departmentId: 'dept-1' },
          actor,
        );
      },
      (err: any) => err instanceof ConflictException,
    );
  });

  it('should create employee with transaction and create InternDetails if INTERN', async () => {
    let transactionExecuted = false;
    let internRecordCreated = false;

    const mockPrisma = {
      user: {
        findUnique: async () => null,
      },
      profileEmployee: {
        findUnique: async () => null,
      },
      role: {
        findFirst: async () => ({ id: 'role-intern', code: 'EMPLOYEE_INTERN' }),
        findUnique: async () => ({ id: 'role-intern', code: 'EMPLOYEE_INTERN' }),
      },
      $transaction: async (cb: any) => {
        transactionExecuted = true;
        const tx = {
          user: {
            create: async ({ data }: any) => ({
              id: 'user-new-id',
              ...data,
              role: { id: 'role-intern', code: 'EMPLOYEE_INTERN', name: 'Intern' },
            }),
          },
          profileEmployee: {
            create: async ({ data }: any) => ({
              id: 'emp-new-id',
              ...data,
              department: null,
              team: null,
              createdAt: new Date(),
            }),
          },
          internDetails: {
            create: async ({ data }: any) => {
              internRecordCreated = true;
              return { id: 'intern-new-id', ...data };
            },
          },
        };
        return cb(tx);
      },
    };

    const service = new OrganizationService(
      mockPrisma as any,
      mockAuditService as any,
      mockPasswordService as any,
    );

    const result = await service.createEmployee(
      {
        employeeCode: 'INT-001',
        fullName: 'Intern Candidate',
        email: 'intern@segacademy.com',
        jobTitle: 'Software Intern',
        employmentType: EmploymentType.INTERN,
        joinDate: '2026-06-01',
        collegeName: 'National Institute of Tech',
        academicDegree: 'B.Tech CS',
      },
      actor,
    );

    assert.equal(transactionExecuted, true);
    assert.equal(internRecordCreated, true);
    assert.equal(result.employeeCode, 'INT-001');
    assert.equal(result.email, 'intern@segacademy.com');
  });

  it('should throw ConflictException on employee creation if email or code exists', async () => {
    const mockPrisma = {
      user: {
        findUnique: async () => ({ id: 'user-exist', email: 'duplicate@segacademy.com' }),
      },
    };

    const service = new OrganizationService(
      mockPrisma as any,
      mockAuditService as any,
      mockPasswordService as any,
    );

    await assert.rejects(
      async () => {
        await service.createEmployee(
          {
            employeeCode: 'EMP-999',
            fullName: 'Duplicate Person',
            email: 'duplicate@segacademy.com',
            jobTitle: 'Developer',
            employmentType: EmploymentType.FULL_TIME,
            joinDate: '2026-01-01',
          },
          actor,
        );
      },
      (err: any) => err instanceof ConflictException,
    );
  });

  it('should roll back and throw error if transaction fails during employee onboarding', async () => {
    const mockPrisma = {
      user: { findUnique: async () => null },
      profileEmployee: { findUnique: async () => null },
      role: { findUnique: async () => ({ id: 'r1', code: 'EMPLOYEE_INTERN' }) },
      $transaction: async () => {
        throw new Error('Database connection failed during transaction');
      },
    };

    const service = new OrganizationService(
      mockPrisma as any,
      mockAuditService as any,
      mockPasswordService as any,
    );

    await assert.rejects(
      async () => {
        await service.createEmployee(
          {
            employeeCode: 'EMP-FAIL',
            fullName: 'Fail Candidate',
            email: 'fail@segacademy.com',
            jobTitle: 'Developer',
            employmentType: EmploymentType.FULL_TIME,
            joinDate: '2026-01-01',
          },
          actor,
        );
      },
      /Database connection failed during transaction/,
    );
  });
});
