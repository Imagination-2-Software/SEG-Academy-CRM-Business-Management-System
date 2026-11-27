'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SegLogo } from '@/components/ui/seg-logo';
import { NAVIGATION_ITEMS, NavigationItem } from '@/components/layout/navigation';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  Users,
  Receipt,
  BookOpen,
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileCheck2,
  CalendarCheck,
  ChevronRight,
  Menu,
  X,
  Search,
  Bell,
  User,
  Shield,
  Eye,
} from 'lucide-react';

// Realistic mock user for preview purposes
const DEMO_USER = {
  fullName: 'XYZ',
  role: {
    name: 'Academic Operations Manager',
    code: 'ACAD_OPS',
  },
  email: 'xyz@example.com',
};

export default function DashboardPreviewPage() {
  // Ensure preview route is strictly inaccessible in production
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const sections: Array<NavigationItem['section']> = [
    'Overview',
    'Academics',
    'Finance',
    'Organization',
    'System',
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Notice Banner: Clearly mark preview / demo data */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-500/30 bg-amber-50 dark:bg-amber-950/80 px-4 py-2 text-xs text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2 font-medium">
          <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong className="font-semibold">Preview – Demo Data</strong> &bull; Development Inspection Mode (No Authentication Required)
          </span>
        </div>
        <span className="hidden sm:inline-block rounded bg-amber-200/80 dark:bg-amber-900/60 px-2 py-0.5 text-[11px] font-mono font-medium text-amber-900 dark:text-amber-100">
          Dev Only
        </span>
      </div>

      {/* Sidebar for Preview Layout */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border/70 bg-card shadow-xs transition-transform duration-200 ease-in-out md:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 px-5">
          <Link href="/dashboard-preview" className="flex items-center gap-2">
            <SegLogo size={32} />
          </Link>
          {isMobileMenuOpen && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {sections.map((sectionName) => {
            const sectionItems = NAVIGATION_ITEMS.filter((i) => i.section === sectionName);
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
                    const isActive = item.href === '/dashboard';
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.href}
                        className={cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 cursor-default',
                          isActive
                            ? 'bg-seg-plum text-white shadow-xs font-semibold'
                            : 'text-foreground/75 hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-900',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground',
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border/70 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-seg-plum text-white font-semibold text-xs">
              SJ
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground truncate">{DEMO_USER.fullName}</div>
              <div className="text-[11px] text-muted-foreground truncate">{DEMO_USER.role.name}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex flex-col md:pl-64">
        {/* Header Preview */}
        <header className="sticky top-9 z-20 flex h-16 w-full items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="rounded-lg p-2 text-foreground/80 hover:bg-muted"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <SegLogo size={28} />
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span>Overview</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              <span>Search operations...</span>
              <kbd className="rounded border border-border/80 bg-background px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
            </div>

            <button
              className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-seg-orange" />
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-border/60">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-seg-plum text-white text-xs font-semibold">
                SJ
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-medium text-foreground">{DEMO_USER.fullName}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3 text-seg-plum" />
                  {DEMO_USER.role.code}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-4 md:p-8">
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/70">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Operational Overview
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Welcome back, <span className="font-semibold text-foreground">{DEMO_USER.fullName}</span> • {DEMO_USER.role.name}
                </p>
              </div>
              <div className="flex items-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Operations
                </span>
              </div>
            </div>

            {/* Core Metric Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {/* Active Enrolments */}
              <div className="group block rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-plum/40 hover:shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">Active Enrolments</span>
                  <div className="rounded-md bg-seg-plum/10 p-1.5 text-seg-plum group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-tabular text-foreground">148</div>
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="text-emerald-600 font-semibold inline-flex items-center">
                    +12% <ArrowUpRight className="h-3 w-3" />
                  </span>
                  <span>vs previous intake</span>
                </div>
              </div>

              {/* Active Batches */}
              <div className="group block rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-orange/40 hover:shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">Active Batches</span>
                  <div className="rounded-md bg-seg-orange/10 p-1.5 text-seg-orange group-hover:scale-105 transition-transform">
                    <BookOpen className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-tabular text-foreground">12</div>
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="font-medium text-foreground">4 cohorts</span>
                  <span>running this month</span>
                </div>
              </div>

              {/* Reconciled Revenue */}
              <div className="group block rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-yellow/40 hover:shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">Reconciled Revenue</span>
                  <div className="rounded-md bg-seg-yellow/10 p-1.5 text-seg-yellow group-hover:scale-105 transition-transform">
                    <Receipt className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-tabular text-foreground">₹28.4L</div>
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="text-emerald-600 font-semibold inline-flex items-center">
                    +8.4% <ArrowUpRight className="h-3 w-3" />
                  </span>
                  <span>this fiscal quarter</span>
                </div>
              </div>

              {/* Staff & Faculty */}
              <div className="group block rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-plum/40 hover:shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">Staff & Faculty</span>
                  <div className="rounded-md bg-seg-plum/10 p-1.5 text-seg-plum group-hover:scale-105 transition-transform">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-tabular text-foreground">24</div>
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="font-medium text-foreground">5</span>
                  <span>operational departments</span>
                </div>
              </div>
            </div>

            {/* Operational Split: Quick Workflows + Action Status */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Quick Operational Workflows (Left 2 cols) */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Operational Shortcuts
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="group flex items-start gap-3.5 rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-plum/50 hover:bg-muted/40 cursor-default">
                    <div className="rounded-lg bg-seg-plum/10 p-2.5 text-seg-plum group-hover:bg-seg-plum group-hover:text-white transition-colors shrink-0">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-foreground group-hover:text-seg-plum transition-colors flex items-center gap-1">
                        Register New Student
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        Onboard applicant, generate student code, and collect KYC documents
                      </p>
                    </div>
                  </div>

                  <div className="group flex items-start gap-3.5 rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-yellow/50 hover:bg-muted/40 cursor-default">
                    <div className="rounded-lg bg-seg-yellow/10 p-2.5 text-seg-yellow group-hover:bg-seg-yellow group-hover:text-slate-950 transition-colors shrink-0">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-foreground group-hover:text-seg-plum transition-colors flex items-center gap-1">
                        Generate Invoice
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        Bill enrolled students with course line-items and tax calculation
                      </p>
                    </div>
                  </div>

                  <div className="group flex items-start gap-3.5 rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-orange/50 hover:bg-muted/40 cursor-default">
                    <div className="rounded-lg bg-seg-orange/10 p-2.5 text-seg-orange group-hover:bg-seg-orange group-hover:text-white transition-colors shrink-0">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-foreground group-hover:text-seg-plum transition-colors flex items-center gap-1">
                        Schedule Batch Cohort
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        Configure capacity limits, curriculum, and semester intake dates
                      </p>
                    </div>
                  </div>

                  <div className="group flex items-start gap-3.5 rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-plum/50 hover:bg-muted/40 cursor-default">
                    <div className="rounded-lg bg-seg-plum/10 p-2.5 text-seg-plum group-hover:bg-seg-plum group-hover:text-white transition-colors shrink-0">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-foreground group-hover:text-seg-plum transition-colors flex items-center gap-1">
                        Onboard Staff / Faculty
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        Create employee record and assign to departmental team
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Items & Status (Right 1 col) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Action Items & Status
                  </h2>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2.5">
                  <div className="group flex items-center justify-between p-2 -mx-2 rounded-lg text-xs hover:bg-muted/50 transition-colors cursor-default">
                    <span className="text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Pending Invoices
                    </span>
                    <span className="font-semibold text-foreground text-xs font-tabular group-hover:text-seg-plum flex items-center gap-1 transition-colors">
                      7 Due
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                    </span>
                  </div>

                  <div className="group flex items-center justify-between p-2 -mx-2 rounded-lg text-xs hover:bg-muted/50 transition-colors cursor-default">
                    <span className="text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
                      <CalendarCheck className="h-3.5 w-3.5 text-seg-plum shrink-0" /> Upcoming Cohort Starts
                    </span>
                    <span className="font-semibold text-foreground text-xs font-tabular group-hover:text-seg-plum flex items-center gap-1 transition-colors">
                      2 this week
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                    </span>
                  </div>

                  <div className="group flex items-center justify-between p-2 -mx-2 rounded-lg text-xs hover:bg-muted/50 transition-colors cursor-default">
                    <span className="text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
                      <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Pending KYC Reviews
                    </span>
                    <span className="font-semibold text-foreground text-xs font-tabular group-hover:text-seg-plum flex items-center gap-1 transition-colors">
                      4 Verifications
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 -mx-2 rounded-lg text-xs border-t border-border/50 pt-2.5">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-seg-orange shrink-0" /> Batch Capacity Avg
                    </span>
                    <span className="text-emerald-600 font-semibold text-xs font-tabular">
                      82% Full
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
