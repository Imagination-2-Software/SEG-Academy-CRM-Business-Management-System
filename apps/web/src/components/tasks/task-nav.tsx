'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TaskNav() {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Task Dashboard',
      href: '/tasks',
      icon: LayoutDashboard,
      isActive: pathname === '/tasks',
    },
    {
      name: 'All Tasks Directory',
      href: '/tasks/all',
      icon: ListTodo,
      isActive: pathname === '/tasks/all' || (pathname?.startsWith('/tasks/') && pathname !== '/tasks/create' && pathname !== '/tasks'),
    },
    {
      name: 'Create Task',
      href: '/tasks/create',
      icon: PlusCircle,
      isActive: pathname === '/tasks/create',
    },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-border/80 pb-px">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition-colors',
              tab.isActive
                ? 'border-seg-plum text-seg-plum dark:border-seg-plum-hover dark:text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
