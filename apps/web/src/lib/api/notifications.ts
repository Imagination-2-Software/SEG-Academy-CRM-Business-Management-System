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

const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

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
