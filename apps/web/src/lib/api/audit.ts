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

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

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
