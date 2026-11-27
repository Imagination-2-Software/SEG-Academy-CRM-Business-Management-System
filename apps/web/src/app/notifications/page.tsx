'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { notificationsService, NotificationItem, NotificationCategory } from '@/lib/api/notifications';
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  ExternalLink,
  GraduationCap,
  Receipt,
  BookOpen,
  CheckSquare,
  ShieldAlert,
  Clock,
  Filter,
} from 'lucide-react';

export default function NotificationsCenterPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    async function loadNotifications() {
      try {
        setError(null);
        const data = await notificationsService.getNotifications();
        setNotifications(data);
      } catch (err: any) {
        console.error('Failed to load notifications', err);
        setError(err?.message || 'Failed to load notifications from server.');
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
    } catch (err: any) {
      console.error('Failed to mark notification as read', err);
      setError(err?.message || 'Failed to update notification status.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
    } catch (err: any) {
      console.error('Failed to mark all as read', err);
      setError(err?.message || 'Failed to mark all notifications as read.');
    }
  };

  const handleClear = async (id: string) => {
    try {
      setClearingId(id);
      setError(null);
      await notificationsService.clearNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      console.error('Failed to clear notification', err);
      setError(err?.message || 'Failed to clear notification on server.');
    } finally {
      setClearingId(null);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === 'unread' && n.isRead) return false;
      if (categoryFilter !== 'ALL' && n.category !== categoryFilter) return false;
      return true;
    });
  }, [notifications, activeTab, categoryFilter]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'ADMISSIONS':
        return <GraduationCap className="h-4 w-4 text-blue-600" />;
      case 'BILLING':
        return <Receipt className="h-4 w-4 text-emerald-600" />;
      case 'ACADEMIC':
        return <BookOpen className="h-4 w-4 text-seg-orange" />;
      case 'TASKS':
        return <CheckSquare className="h-4 w-4 text-purple-600" />;
      case 'SECURITY':
      default:
        return <ShieldAlert className="h-4 w-4 text-amber-600" />;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-seg-plum/10 text-seg-plum">
                <Bell className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Notifications Center
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live activity alerts, admission updates, payment verifications, and compliance memos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5 text-seg-plum" />
                <span>Mark All as Read</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 font-semibold text-xs ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab & Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'bg-seg-plum text-white shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              All Alerts ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'unread'
                  ? 'bg-seg-plum text-white shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  activeTab === 'unread' ? 'bg-white text-seg-plum' : 'bg-seg-orange text-white'
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:border-seg-plum focus:outline-hidden"
            >
              <option value="ALL">All Categories</option>
              <option value="ADMISSIONS">Admissions & Students</option>
              <option value="BILLING">Billing & Payments</option>
              <option value="ACADEMIC">Batches & Courses</option>
              <option value="TASKS">Tasks & Submissions</option>
              <option value="SECURITY">Security & Access</option>
            </select>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-xs text-muted-foreground shadow-2xs">
              Loading notification updates...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center shadow-2xs space-y-2">
              <CheckCheck className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <h3 className="text-sm font-semibold text-foreground">You're All Caught Up</h3>
              <p className="text-xs text-muted-foreground">
                No notifications match your current filter selection.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex flex-col gap-3 rounded-xl border p-4 shadow-2xs transition-all sm:flex-row sm:items-center sm:justify-between ${
                  !notif.isRead
                    ? 'border-seg-plum/30 bg-seg-plum/[0.02] dark:bg-seg-plum/[0.05]'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 mt-0.5">
                    {getCategoryIcon(notif.category)}
                  </span>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-foreground truncate">
                        {notif.title}
                      </h4>
                      {!notif.isRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-seg-orange shrink-0" />
                      )}
                      <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-[9px] uppercase font-bold text-muted-foreground">
                        {notif.channel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {notif.body}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(notif.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {notif.link && (
                    <Link
                      href={notif.link}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-seg-plum hover:bg-muted"
                    >
                      <span>View</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}

                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      title="Mark as Read"
                      className="rounded-md border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleClear(notif.id)}
                    disabled={clearingId === notif.id}
                    title="Dismiss Notification"
                    className="rounded-md border border-border p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
