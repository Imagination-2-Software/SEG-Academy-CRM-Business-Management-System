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

export const notificationsService = {
  /**
   * Fetch current user notifications from the backend API.
   * Throws on network/server error so caller can display error state or handle retry.
   */
  async getNotifications(): Promise<NotificationItem[]> {
    const res: any = await apiClient.get('/notifications');
    if (res && res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  },

  /**
   * Mark a specific notification as read on the backend.
   */
  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`, {});
  },

  /**
   * Mark all notifications as read for current user on the backend.
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notifications/mark-all-read', {});
  },

  /**
   * Delete/clear a notification permanently from the backend database.
   * Throws an error if deletion fails or if the user is unauthorized.
   */
  async clearNotification(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },
};
