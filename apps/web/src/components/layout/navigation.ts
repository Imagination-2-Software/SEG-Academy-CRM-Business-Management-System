import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Receipt,
  Building2,
  CheckSquare,
  Bell,
  BarChart3,
  ShieldAlert,
  Settings,
} from 'lucide-react';

export interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  requiredRoles?: string[];
  requiredPermission?: string;
  badge?: string;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Student Management',
    href: '/students',
    icon: GraduationCap,
    requiredPermission: 'students:read',
  },
  {
    name: 'Courses & Batches',
    href: '/courses',
    icon: BookOpen,
    requiredPermission: 'courses:read',
  },
  {
    name: 'Invoices & Payments',
    href: '/invoices',
    icon: Receipt,
    requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'],
    requiredPermission: 'invoices:read',
  },
  {
    name: 'User Management',
    href: '/users',
    icon: Users,
    requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN'],
    requiredPermission: 'users:read',
  },
  {
    name: 'Departments & Teams',
    href: '/departments',
    icon: Building2,
    requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
  },
  {
    name: 'Tasks & Reviews',
    href: '/tasks',
    icon: CheckSquare,
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: Bell,
  },
  {
    name: 'Reports & Analytics',
    href: '/reports',
    icon: BarChart3,
    requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'],
  },
  {
    name: 'Security & Audit Logs',
    href: '/audit-logs',
    icon: ShieldAlert,
    requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN'],
  },
];
