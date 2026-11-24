'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { notificationsService, NotificationItem } from '@/lib/api/notifications';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  GraduationCap,
  Receipt,
  BookOpen,
  CheckSquare,
  ShieldAlert,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationsChanged?: () => void;
}

export function NotificationsPopover({ isOpen, onClose, onNotificationsChanged }: NotificationsPopoverProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const data = await notificationsService.getNotifications();
      setNotifications(data);
    }
    if (isOpen) {
      load();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadItems = notifications.filter((n) => !n.isRead);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationsService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (onNotificationsChanged) onNotificationsChanged();
  };

  const handleMarkAll = async () => {
    await notificationsService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (onNotificationsChanged) onNotificationsChanged();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-xl border border-border/80 bg-card p-3 shadow-xl animate-in fade-in-50 zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/70 pb-2.5 px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-foreground">Notifications</span>
          {unreadItems.length > 0 && (
            <span className="rounded-full bg-seg-orange px-1.5 py-0.2 text-[9px] font-bold text-white">
              {unreadItems.length} New
            </span>
          )}
        </div>
        {unreadItems.length > 0 && (
          <button
            onClick={handleMarkAll}
            className="text-[11px] font-medium text-seg-plum hover:underline flex items-center gap-1"
          >
            <CheckCheck className="h-3 w-3" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-border/40 py-1">
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No notification alerts at this time.
          </div>
        ) : (
          notifications.slice(0, 5).map((n) => (
            <div
              key={n.id}
              className={`p-2.5 text-xs transition-colors rounded-lg flex items-start justify-between gap-2.5 ${
                !n.isRead ? 'bg-seg-plum/[0.04]' : 'hover:bg-muted/40'
              }`}
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground truncate">{n.title}</span>
                  {!n.isRead && (
                    <span className="h-1.5 w-1.5 rounded-full bg-seg-orange shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {n.body}
                </p>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                {n.link && (
                  <Link
                    href={n.link}
                    onClick={onClose}
                    className="p-1 text-muted-foreground hover:text-seg-plum rounded"
                    title="View Resource"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
                {!n.isRead && (
                  <button
                    onClick={(e) => handleMarkAsRead(n.id, e)}
                    className="p-1 text-muted-foreground hover:text-foreground rounded"
                    title="Mark as Read"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/70 pt-2 px-1 text-center">
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-[11px] font-semibold text-seg-plum hover:underline inline-flex items-center gap-1"
        >
          <span>View All Notifications Center</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
