'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { NAVIGATION_ITEMS } from './navigation';
import { cn } from '@/lib/utils';
import { SegLogo } from '@/components/ui/seg-logo';

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasRole, hasPermission } = useAuth();

  const filteredItems = NAVIGATION_ITEMS.filter((item) => {
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      if (!hasRole(item.requiredRoles)) return false;
    }
    if (item.requiredPermission) {
      if (!hasPermission(item.requiredPermission)) return false;
    }
    return true;
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card md:flex">
      {/* Brand Header with Authentic SEG Logo */}
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/dashboard" className="flex items-center">
          <SegLogo size={34} />
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Navigation
        </div>
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-seg-plum text-white dark:bg-seg-plum-deep'
                    : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isActive
                      ? 'text-white'
                      : 'text-muted-foreground group-hover:text-foreground',
                  )}
                />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="rounded-full bg-seg-orange px-2 py-0.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Status Footer */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-seg-plum-subtle text-xs font-bold text-seg-plum">
            {user?.fullName
              ? user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
              : 'SA'}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-xs font-bold text-foreground">
              {user?.fullName || 'Authenticated User'}
            </span>
            <span className="truncate text-[10px] font-medium text-muted-foreground">
              {user?.role?.name || user?.role?.code || 'Employee'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
