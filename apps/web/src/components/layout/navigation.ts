import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Receipt,
  Building2,
  UserSquare2,
  CheckSquare,
  Bell,
  BarChart3,
  ShieldAlert,
  FileDown,
  RotateCcw,
} from 'lucide-react';

export interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  section: 'Overview' | 'Academics' | 'Finance' | 'Organization' | 'System';
  requiredRoles?: string[];
  requiredPermission?: string;
  badge?: string;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    section: 'Overview',
  },
  {
    name: 'Student Management',
    href: '/students',
    icon: GraduationCap,
    section: 'Academics',
    requiredPermission: 'students:read',
  },
  {
    name: 'Courses & Batches',
    href: '/courses',
    icon: BookOpen,
    section: 'Academics',
    requiredPermission: 'courses:read',
  },
  {
    name: 'Documents & KYC',
    href: '/documents',
    icon: ShieldAlert,
    section: 'Academics',
    requiredPermission: 'students:read',
  },
  {
    name: 'Invoices & Payments',
    href: '/invoices',
    icon: Receipt,
    section: 'Finance',
    requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'],
    requiredPermission: 'invoices:read',
  },
  {
    name: 'Credit & Debit Notes',
    href: '/credit-notes',
    icon: FileDown,
    section: 'Finance',
    requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'],
    requiredPermission: 'invoices:read',
  },
  {
    name: 'Tuition Refunds',
    href: '/refunds',
    icon: RotateCcw,
    section: 'Finance',
    requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'],
    requiredPermission: 'refunds:read',
  },
  {
    name: 'Departments & Teams',
    href: '/departments',
    icon: Building2,
    section: 'Organization',
    requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN'],
    requiredPermission: 'users:read',
  },
  {
    name: 'Staff & Employees',
    href: '/employees',
    icon: UserSquare2,
    section: 'Organization',
    requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN'],
    requiredPermission: 'users:read',
  },
  {
    name: 'Tasks & Reviews',
    href: '/tasks',
    icon: CheckSquare,
    section: 'Organization',
  },
  {
    name: 'User Management',
    href: '/users',
    icon: Users,
    section: 'System',
    requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN'],
    requiredPermission: 'users:read',
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: Bell,
    section: 'System',
  },
  {
    name: 'Reports & Analytics',
    href: '/reports',
    icon: BarChart3,
    section: 'System',
    requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'],
  },
  {
    name: 'Security & Audit Logs',
    href: '/audit-logs',
    icon: ShieldAlert,
    section: 'System',
    requiredRoles: ['FOUNDER_SUPER_ADMIN', 'ADMIN'],
  },
];
