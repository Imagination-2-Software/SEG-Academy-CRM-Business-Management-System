import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { RolesService } from '../roles.service';

describe('RolesService Unit Tests', () => {
  const sampleRoles = [
    {
      id: 'role-1',
      code: 'ADMIN',
      name: 'System Administrator',
      description: 'Platform admin',
      isSystem: true,
      permissions: [
        {
          permission: {
            id: 'p-1',
            resource: 'users',
            action: 'read',
          },
        },
        {
          permission: {
            id: 'p-2',
            resource: 'users',
            action: 'create',
          },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'role-2',
      code: 'EMPLOYEE_INTERN',
      name: 'Employee Intern',
      description: 'Intern access',
      isSystem: true,
      permissions: [
        {
          permission: {
            id: 'p-1',
            resource: 'users',
            action: 'read',
          },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockPrisma: any = {
    role: {
      findMany: async () => sampleRoles,
    },
  };

  it('1. GET /api/v1/roles - Should list all roles with mapped permissions strings', async () => {
    const service = new RolesService(mockPrisma);
    const roles = await service.listRoles();

    assert.equal(roles.length, 2);
    assert.equal(roles[0].code, 'ADMIN');
    assert.deepEqual(roles[0].permissions, ['users:read', 'users:create']);

    assert.equal(roles[1].code, 'EMPLOYEE_INTERN');
    assert.deepEqual(roles[1].permissions, ['users:read']);
  });
});
