import { apiClient } from './client';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS';
export type NotificationCategory = 'ADMISSIONS' | 'BILLING' | 'ACADEMIC' | 'TASKS' | 'SECURITY';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  isRead: boolean;
  readAt?: string;
  link?: string;
  createdAt: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-001',
    userId: 'usr-001',
    title: 'New Student Enrollment',
    body: 'Ananya Iyer completed enrollment in Batch FSD-2026-Q4. KYC verification pending.',
    channel: 'IN_APP',
    category: 'ADMISSIONS',
    isRead: false,
    link: '/students',
    createdAt: '2026-11-24T02:10:00.000Z',
  },
  {
    id: 'notif-002',
    userId: 'usr-001',
    title: 'Tax Invoice Payment Confirmed',
    body: 'Received ₹45,000 for Invoice INV-2026-0042 via UPI (UTR: 902819284912).',
    channel: 'IN_APP',
    category: 'BILLING',
    isRead: false,
    link: '/invoices',
    createdAt: '2026-11-23T20:30:00.000Z',
  },
  {
    id: 'notif-003',
    userId: 'usr-001',
    title: 'Task Deliverable Submitted for Review',
    body: 'David Chen submitted Q4 Compliance Audit Report for Task TSK-102.',
    channel: 'IN_APP',
    category: 'TASKS',
    isRead: false,
    link: '/tasks',
    createdAt: '2026-11-23T18:15:00.000Z',
  },
  {
    id: 'notif-004',
    userId: 'usr-001',
    title: 'Batch Capacity Reached (90%)',
    body: 'Cohort "UI/UX Advanced Lab (UX-2026-A)" has reached 27/30 registered seats.',
    channel: 'IN_APP',
    category: 'ACADEMIC',
    isRead: true,
    readAt: '2026-11-23T12:00:00.000Z',
    link: '/batches',
    createdAt: '2026-11-23T11:45:00.000Z',
  },
  {
    id: 'notif-005',
    userId: 'usr-001',
    title: 'Security Alert: Password Policy Audit',
    body: 'Quarterly credential rotation completed successfully with 0 policy exceptions.',
    channel: 'IN_APP',
    category: 'SECURITY',
    isRead: true,
    readAt: '2026-11-22T15:00:00.000Z',
    link: '/audit-logs',
    createdAt: '2026-11-22T14:30:00.000Z',
  },
];

const NOTIFICATIONS_STORAGE_KEY = 'seg_crm_notifications_v1';

function getStoredNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_NOTIFICATIONS;
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

function saveStoredNotifications(list: NotificationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export const notificationsService = {
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const res: any = await apiClient.get('/notifications');
      if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {}
    return getStoredNotifications();
  },

  async markAsRead(id: string): Promise<void> {
    try {
      await apiClient.patch(`/notifications/${id}/read`, {});
    } catch {}

    const list = getStoredNotifications();
    const idx = list.findIndex((n) => n.id === id);
    if (idx !== -1) {
      list[idx].isRead = true;
      list[idx].readAt = new Date().toISOString();
      saveStoredNotifications(list);
    }
  },

  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.post('/notifications/mark-all-read', {});
    } catch {}

    const list = getStoredNotifications();
    const updated = list.map((n) => ({
      ...n,
      isRead: true,
      readAt: n.readAt || new Date().toISOString(),
    }));
    saveStoredNotifications(updated);
  },

  async clearNotification(id: string): Promise<void> {
    const list = getStoredNotifications();
    const updated = list.filter((n) => n.id !== id);
    saveStoredNotifications(updated);
  },
};
