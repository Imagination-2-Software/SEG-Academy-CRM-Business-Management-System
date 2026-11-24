'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Receipt,
  Building2,
  UserSquare2,
  Users,
  CheckSquare,
  Bell,
  BarChart3,
  ShieldAlert,
  ArrowRight,
  Plus,
  X,
  CreditCard,
  FileCheck2,
} from 'lucide-react';

interface SearchItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Quick Actions' | 'Academic' | 'Finance' | 'Staff';
  subtitle?: string;
  href: string;
  icon: any;
}

const SEARCH_ITEMS: SearchItem[] = [
  // Navigation
  { id: 'nav-dash', title: 'Main Dashboard', category: 'Navigation', subtitle: 'Executive overview & operations', href: '/dashboard', icon: LayoutDashboard },
  { id: 'nav-students', title: 'Student Directory', category: 'Navigation', subtitle: 'Manage student records & KYC', href: '/students', icon: GraduationCap },
  { id: 'nav-courses', title: 'Courses & Batches', category: 'Navigation', subtitle: 'Academic offerings & schedules', href: '/courses', icon: BookOpen },
  { id: 'nav-invoices', title: 'Invoices & Billing', category: 'Navigation', subtitle: 'Tax invoices & receivables', href: '/invoices', icon: Receipt },
  { id: 'nav-payments', title: 'Payment Ledger', category: 'Navigation', subtitle: 'Bank & UPI payment transactions', href: '/payments', icon: CreditCard },
  { id: 'nav-depts', title: 'Departments & Divisions', category: 'Navigation', subtitle: 'Institutional organization', href: '/departments', icon: Building2 },
  { id: 'nav-teams', title: 'Teams Directory', category: 'Navigation', subtitle: 'Functional operational teams', href: '/teams', icon: Users },
  { id: 'nav-employees', title: 'Staff & Employees', category: 'Navigation', subtitle: 'Employee dossiers & HR', href: '/employees', icon: UserSquare2 },
  { id: 'nav-users', title: 'User Management', category: 'Navigation', subtitle: 'RBAC identity & credentials', href: '/users', icon: Users },
  { id: 'nav-tasks', title: 'Tasks & Reviews', category: 'Navigation', subtitle: 'Delegation & submissions', href: '/tasks', icon: CheckSquare },
  { id: 'nav-notifs', title: 'Notifications Center', category: 'Navigation', subtitle: 'Live system alerts & updates', href: '/notifications', icon: Bell },
  { id: 'nav-reports', title: 'Reports & Analytics', category: 'Navigation', subtitle: 'Financial & enrollment trends', href: '/reports', icon: BarChart3 },
  { id: 'nav-audit', title: 'Security & Audit Logs', category: 'Navigation', subtitle: 'Cryptographic access audit', href: '/audit-logs', icon: ShieldAlert },

  // Quick Actions
  { id: 'act-register-student', title: 'Register New Student', category: 'Quick Actions', subtitle: 'KYC onboarding & application', href: '/students/register', icon: Plus },
  { id: 'act-create-invoice', title: 'Generate Tax Invoice', category: 'Quick Actions', subtitle: 'Tuition invoice for student', href: '/invoices/create', icon: Plus },
  { id: 'act-new-batch', title: 'Schedule Batch Cohort', category: 'Quick Actions', subtitle: 'Intake dates & seat capacity', href: '/batches/create', icon: Plus },
  { id: 'act-new-course', title: 'Create Course Offering', category: 'Quick Actions', subtitle: 'Curriculum & tuition fee', href: '/courses/create', icon: Plus },
  { id: 'act-delegate-task', title: 'Delegate Operational Task', category: 'Quick Actions', subtitle: 'Assign duty to staff member', href: '/tasks/create', icon: Plus },
  { id: 'act-onboard-staff', title: 'Onboard Employee', category: 'Quick Actions', subtitle: 'Create employee record', href: '/employees/create', icon: Plus },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return SEARCH_ITEMS;
    const q = query.toLowerCase();
    return SEARCH_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          router.push(filteredItems[selectedIndex].href);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, router, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-muted/20">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search CRM navigation, workflows, and modules..."
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/40">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">No matching CRM modules found</p>
              <p className="text-[11px]">Try searching for students, invoices, batches, or staff actions.</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer text-xs transition-colors ${
                    isSelected ? 'bg-seg-plum text-white font-semibold' : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-md shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="truncate">
                      <div className="truncate">{item.title}</div>
                      {item.subtitle && (
                        <div
                          className={`text-[10px] truncate ${
                            isSelected ? 'text-white/80' : 'text-muted-foreground'
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className={`ml-2 rounded px-1.5 py-0.2 text-[9px] font-mono uppercase shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Command Palette Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-mono">SEG Academy Navigation Engine</span>
        </div>
      </div>
    </div>
  );
}
