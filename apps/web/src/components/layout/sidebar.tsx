'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { NAVIGATION_ITEMS, NavigationItem } from './navigation';
import { cn } from '@/lib/utils';
import { SegLogo } from '@/components/ui/seg-logo';
import { X } from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isMobileOpen = false, onClose }: SidebarProps) {
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

  const sections: Array<NavigationItem['section']> = [
    'Overview',
    'Academics',
    'Finance',
    'Organization',
    'System',
  ];

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/70 bg-card shadow-xs transition-transform duration-200 ease-in-out md:translate-x-0 md:z-40',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}
    >
      {/* Brand Header with SEG Logo & Mobile Close Button */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 px-5">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
          <SegLogo size={32} />
        </Link>
        {isMobileOpen && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {sections.map((sectionName) => {
          const sectionItems = filteredItems.filter((i) => i.section === sectionName);
          if (sectionItems.length === 0) return null;

          return (
            <div key={sectionName} className="space-y-1">
              {sectionName !== 'Overview' && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {sectionName}
                </div>
              )}
              <nav className="space-y-0.5">
                {sectionItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname?.startsWith(`${item.href}`));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                        isActive
                          ? 'bg-seg-plum text-white shadow-xs font-semibold'
                          : 'text-foreground/75 hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-900',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-white'
                            : 'text-muted-foreground group-hover:text-foreground',
                        )}
                      />
                      <span className="flex-1 truncate">{item.name}</span>
                      {item.badge && (
                        <span className="rounded-full bg-seg-orange px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* User Status Footer */}
      <div className="shrink-0 border-t border-border/70 p-3 bg-muted/20">
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-seg-plum/10 text-xs font-bold text-seg-plum border border-seg-plum/20">
            {user?.fullName
              ? user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
              : 'SA'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate text-xs font-semibold text-foreground">
              {user?.fullName || 'Staff Member'}
            </span>
            <span className="truncate text-[10px] text-muted-foreground">
              {user?.role?.name || user?.role?.code || 'Staff'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
