"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert/strict"));
const roles_service_1 = require("../roles.service");
(0, node_test_1.describe)('RolesService Unit Tests', () => {
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
    const mockPrisma = {
        role: {
            findMany: async () => sampleRoles,
        },
    };
    (0, node_test_1.it)('1. GET /api/v1/roles - Should list all roles with mapped permissions strings', async () => {
        const service = new roles_service_1.RolesService(mockPrisma);
        const roles = await service.listRoles();
        assert.equal(roles.length, 2);
        assert.equal(roles[0].code, 'ADMIN');
        assert.deepEqual(roles[0].permissions, ['users:read', 'users:create']);
        assert.equal(roles[1].code, 'EMPLOYEE_INTERN');
        assert.deepEqual(roles[1].permissions, ['users:read']);
    });
});
//# sourceMappingURL=roles.service.spec.js.map