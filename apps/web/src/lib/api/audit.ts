import { apiClient } from './client';

export interface AuditActor {
  id: string;
  fullName: string;
  email: string;
  roleCode?: string;
  roleName?: string;
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  actor?: AuditActor | null;
  action: string;
  resource: string;
  resourceId?: string;
  payload?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface QueryAuditLogsParams {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PaginatedAuditLogsResponse {
  data: AuditLogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const auditService = {
  /**
   * Fetches real audit logs from the backend API.
   * Throws ApiClientError upon network or server failure so caller can render appropriate error states.
   */
  async getAuditLogs(params?: QueryAuditLogsParams): Promise<PaginatedAuditLogsResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.action && params.action !== 'ALL') query.append('action', params.action);
    if (params?.resource && params.resource !== 'ALL') query.append('resource', params.resource);
    if (params?.userId) query.append('userId', params.userId);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.search && params.search.trim()) query.append('search', params.search.trim());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res: any = await apiClient.get(`/audit-logs${queryString}`);

    if (res?.success && res?.data) {
      const records = Array.isArray(res.data) ? res.data : (res.data.data || []);
      const meta = res.meta || res.data.meta || {
        total: records.length,
        page: params?.page || 1,
        limit: params?.limit || 20,
        totalPages: 1,
      };

      // Normalize actor information for UI compatibility
      const normalized: AuditLogEntry[] = records.map((r: any) => ({
        ...r,
        userName: r.actor?.fullName || r.userName || 'System / Anonymous',
        userEmail: r.actor?.email || r.userEmail || 'system@segacademy.internal',
        userRole: r.actor?.roleCode || r.userRole || 'STAFF',
      }));

      return {
        data: normalized,
        meta,
      };
    }

    throw new Error(res?.message || 'Failed to retrieve compliance audit logs');
  },
};
