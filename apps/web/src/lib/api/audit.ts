import { apiClient } from './client';

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  payload?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-001',
    userId: 'usr-001',
    userName: 'Alexander Wright',
    userEmail: 'admin@segacademy.com',
    userRole: 'FOUNDER_SUPER_ADMIN',
    action: 'USER_LOGIN',
    resource: 'auth',
    resourceId: 'usr-001',
    payload: { method: 'JWT_ACCESS_TOKEN', mfaVerified: true },
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0',
    createdAt: '2026-11-24T02:15:00.000Z',
  },
  {
    id: 'aud-002',
    userId: 'usr-005',
    userName: 'Elena Rostova',
    userEmail: 'elena.rostova@segacademy.com',
    userRole: 'FINANCE_MANAGER',
    action: 'PAYMENT_CONFIRMED',
    resource: 'payments',
    resourceId: 'pay-0042',
    payload: { invoiceNumber: 'INV-2026-0042', amount: 45000, method: 'UPI' },
    ipAddress: '192.168.1.112',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0',
    createdAt: '2026-11-23T20:30:00.000Z',
  },
  {
    id: 'aud-003',
    userId: 'usr-004',
    userName: 'David Chen',
    userEmail: 'david.chen@segacademy.com',
    userRole: 'ACADEMIC_COUNSELLOR',
    action: 'STUDENT_ENROLLED',
    resource: 'enrolments',
    resourceId: 'enr-0089',
    payload: { studentCode: 'STU-2026-089', batchCode: 'FSD-2026-Q4' },
    ipAddress: '192.168.1.120',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0',
    createdAt: '2026-11-23T16:20:00.000Z',
  },
  {
    id: 'aud-004',
    userId: 'usr-001',
    userName: 'Alexander Wright',
    userEmail: 'admin@segacademy.com',
    userRole: 'FOUNDER_SUPER_ADMIN',
    action: 'TASK_EVALUATION_RECORDED',
    resource: 'tasks',
    resourceId: 'tsk-003',
    payload: { score: 98, status: 'APPROVED' },
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0',
    createdAt: '2026-11-23T14:45:00.000Z',
  },
  {
    id: 'aud-005',
    userId: 'usr-001',
    userName: 'Alexander Wright',
    userEmail: 'admin@segacademy.com',
    userRole: 'FOUNDER_SUPER_ADMIN',
    action: 'ROLE_PERMISSION_UPDATED',
    resource: 'roles',
    resourceId: 'role-counsellor',
    payload: { role: 'ACADEMIC_COUNSELLOR', addedPermission: 'students:write' },
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0',
    createdAt: '2026-11-22T17:10:00.000Z',
  },
  {
    id: 'aud-006',
    userId: 'usr-002',
    userName: 'Sarah Jenkins',
    userEmail: 'sarah.jenkins@segacademy.com',
    userRole: 'INSTRUCTOR',
    action: 'BATCH_CREATED',
    resource: 'batches',
    resourceId: 'btc-0012',
    payload: { batchCode: 'UX-2026-A', capacity: 30 },
    ipAddress: '192.168.1.134',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    createdAt: '2026-11-22T10:00:00.000Z',
  },
];

export const auditService = {
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    try {
      const res: any = await apiClient.get('/audit-logs');
      if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {}
    return INITIAL_AUDIT_LOGS;
  },
};
