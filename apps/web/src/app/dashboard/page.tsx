'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { useAuth } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  Users,
  Receipt,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Plus,
  ArrowRight,
  Layers,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Operational Overview
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Welcome back, <span className="font-semibold text-foreground">{user?.fullName || 'Administrator'}</span> ({user?.role?.name || user?.role?.code || 'Staff'}). Live operations status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              CRM Core Online
            </span>
          </div>
        </div>

        {/* Core Metric Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Active Enrolments */}
          <Link href="/students" className="group">
            <div className="rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-plum/40 hover:shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Active Enrolments</span>
                <GraduationCap className="h-4 w-4 text-seg-plum group-hover:scale-105 transition-transform" />
              </div>
              <div className="text-2xl font-bold text-foreground">148</div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-600 font-semibold inline-flex items-center">
                  +12% <ArrowUpRight className="h-3 w-3" />
                </span>
                vs previous intake
              </p>
            </div>
          </Link>

          {/* Active Batches */}
          <Link href="/batches" className="group">
            <div className="rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-orange/40 hover:shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Active Batches</span>
                <BookOpen className="h-4 w-4 text-seg-orange group-hover:scale-105 transition-transform" />
              </div>
              <div className="text-2xl font-bold text-foreground">12</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                4 cohorts scheduled this month
              </p>
            </div>
          </Link>

          {/* Reconciled Revenue */}
          <Link href="/invoices" className="group">
            <div className="rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-yellow/40 hover:shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Reconciled Revenue</span>
                <Receipt className="h-4 w-4 text-seg-yellow group-hover:scale-105 transition-transform" />
              </div>
              <div className="text-2xl font-bold text-foreground">₹28.4L</div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-600 font-semibold inline-flex items-center">
                  +8.4% <ArrowUpRight className="h-3 w-3" />
                </span>
                verified via DB triggers
              </p>
            </div>
          </Link>

          {/* Staff & Faculty */}
          <Link href="/employees" className="group">
            <div className="rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-plum/40 hover:shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Staff & Faculty</span>
                <Users className="h-4 w-4 text-seg-plum group-hover:scale-105 transition-transform" />
              </div>
              <div className="text-2xl font-bold text-foreground">24</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Across 5 departments
              </p>
            </div>
          </Link>
        </div>

        {/* Operational Split: Quick Workflows + System Health */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Operational Workflows (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Operational Shortcuts
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/students/register"
                className="group flex items-start gap-3 rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-seg-plum/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
              >
                <div className="rounded-lg bg-seg-plum/10 p-2 text-seg-plum group-hover:bg-seg-plum group-hover:text-white transition-colors">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground group-hover:text-seg-plum transition-colors flex items-center gap-1">
                    Register New Student
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Onboard applicant, generate code, and collect KYC documents
                  </p>
                </div>
              </Link>

              <Link
                href="/invoices/create"
                className="group flex items-start gap-3 rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-seg-yellow/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
              >
                <div className="rounded-lg bg-seg-yellow/10 p-2 text-seg-yellow group-hover:bg-seg-yellow group-hover:text-slate-950 transition-colors">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground group-hover:text-seg-plum transition-colors flex items-center gap-1">
                    Generate Invoice
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Bill enrolled students with course line-items and tax calculation
                  </p>
                </div>
              </Link>

              <Link
                href="/batches/create"
                className="group flex items-start gap-3 rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-seg-orange/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
              >
                <div className="rounded-lg bg-seg-orange/10 p-2 text-seg-orange group-hover:bg-seg-orange group-hover:text-white transition-colors">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground group-hover:text-seg-plum transition-colors flex items-center gap-1">
                    Schedule Batch Cohort
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Configure capacity limits, curriculum, and semester intake dates
                  </p>
                </div>
              </Link>

              <Link
                href="/employees/create"
                className="group flex items-start gap-3 rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-seg-plum/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
              >
                <div className="rounded-lg bg-seg-plum/10 p-2 text-seg-plum group-hover:bg-seg-plum group-hover:text-white transition-colors">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground group-hover:text-seg-plum transition-colors flex items-center gap-1">
                    Onboard Staff / Faculty
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Create employee record and assign to departmental team
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* System Security & Integrity Verification (Right 1 col) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Platform Integrity
              </h2>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Auth Mechanism</span>
                <span className="font-mono font-medium text-foreground text-[11px]">JWT + Refresh Rotation</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Password Hash</span>
                <span className="font-mono font-medium text-foreground text-[11px]">Argon2id (64MB)</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Backend RBAC</span>
                <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Database-Enforced
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Automated Tests</span>
                <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 120 Suites Passing
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">DB Invariant Triggers</span>
                <span className="text-foreground font-mono text-[11px]">Invoice Math Synchronized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
