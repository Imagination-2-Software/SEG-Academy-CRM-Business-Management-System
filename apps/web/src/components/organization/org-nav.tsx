'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Users2, UserSquare2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OrgNav() {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Departments',
      href: '/departments',
      icon: Building2,
      isActive:
        pathname === '/departments' ||
        pathname?.startsWith('/departments/create') ||
        (pathname?.startsWith('/departments/') && !pathname.includes('/teams')),
    },
    {
      name: 'Teams',
      href: '/teams',
      icon: Users2,
      isActive: pathname === '/teams' || pathname?.startsWith('/teams/'),
    },
    {
      name: 'Employees Directory',
      href: '/employees',
      icon: UserSquare2,
      isActive: pathname === '/employees' || pathname?.startsWith('/employees/'),
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
