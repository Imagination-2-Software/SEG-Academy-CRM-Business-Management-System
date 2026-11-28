'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import {
  GraduationCap,
  Users,
  Receipt,
  BookOpen,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileCheck2,
  CalendarCheck,
  ChevronRight,
} from 'lucide-react';

interface DashboardStats {
  activeEnrolments: number;
  activeBatches: number;
  reconciledRevenue: number;
  totalEmployees: number;
  pendingInvoices: number;
  upcomingCohorts: number;
  pendingKyc: number;
  capacityAvg: number;
}

export default function DashboardPage() {
  const { user, hasRole, hasPermission } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeEnrolments: 0,
    activeBatches: 0,
    reconciledRevenue: 0,
    totalEmployees: 0,
    pendingInvoices: 0,
    upcomingCohorts: 0,
    pendingKyc: 0,
    capacityAvg: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOperationalMetrics() {
      try {
        const res: any = await apiClient.get('/dashboard/overview');
        if (res?.data) {
          const d = res.data;
          setStats({
            activeEnrolments: Number(d.activeEnrolments) || 0,
            activeBatches: Number(d.activeBatches) || 0,
            reconciledRevenue: Number(d.reconciledRevenue) || 0,
            totalEmployees: Number(d.totalEmployees) || 0,
            pendingInvoices: Number(d.pendingInvoices) || 0,
            upcomingCohorts: Number(d.upcomingCohorts) || 0,
            pendingKyc: Number(d.pendingKyc) || 0,
            capacityAvg: Number(d.capacityAvg) || 0,
          });
        }
      } catch (err) {
        // Fallback to verified 0 counts on initial blank production database or network failure
        console.error('Failed to load operational overview metrics:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadOperationalMetrics();
  }, []);

  const formatCurrency = (val: number) => {
    if (val === 0) return '₹0';
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)}L`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/70">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Operational Overview
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Welcome back, <span className="font-semibold text-foreground">{user?.fullName || 'Administrator'}</span>
              {user?.role?.name ? ` • ${user.role.name}` : user?.role?.code ? ` • ${user.role.code}` : ' • Staff'}
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
          <Link href="/students" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
            <div className="rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-plum/40 hover:shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Active Enrolments</span>
                <div className="rounded-md bg-seg-plum/10 p-1.5 text-seg-plum group-hover:scale-105 transition-transform">
                  <GraduationCap className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-tabular text-foreground">
                {isLoading ? '...' : stats.activeEnrolments}
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span>Total registered students</span>
              </div>
            </div>
          </Link>

          {/* Active Batches */}
          <Link href="/batches" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
            <div className="rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-orange/40 hover:shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Active Batches</span>
                <div className="rounded-md bg-seg-orange/10 p-1.5 text-seg-orange group-hover:scale-105 transition-transform">
                  <BookOpen className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-tabular text-foreground">
                {isLoading ? '...' : stats.activeBatches}
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span>Active cohort sessions</span>
              </div>
            </div>
          </Link>

          {/* Reconciled Revenue */}
          <Link href="/invoices" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
            <div className="rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-yellow/40 hover:shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Reconciled Revenue</span>
                <div className="rounded-md bg-seg-yellow/10 p-1.5 text-seg-yellow group-hover:scale-105 transition-transform">
                  <Receipt className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-tabular text-foreground">
                {isLoading ? '...' : formatCurrency(stats.reconciledRevenue)}
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span>Settled tax payments</span>
              </div>
            </div>
          </Link>

          {/* Staff & Faculty */}
          <Link href="/employees" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
            <div className="rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-plum/40 hover:shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Staff & Faculty</span>
                <div className="rounded-md bg-seg-plum/10 p-1.5 text-seg-plum group-hover:scale-105 transition-transform">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-tabular text-foreground">
                {isLoading ? '...' : stats.totalEmployees}
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span>Internal staff members</span>
              </div>
            </div>
          </Link>
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
              {(hasPermission('students:create') || hasPermission('students:write')) && (
                <Link
                  href="/students/register"
                  className="group flex items-start gap-3.5 rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-plum/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
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
                </Link>
              )}

              {(hasPermission('invoices:create') || hasPermission('invoices:write')) && (
                <Link
                  href="/invoices/create"
                  className="group flex items-start gap-3.5 rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-yellow/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
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
                </Link>
              )}

              {(hasPermission('batches:create') || hasPermission('batches:write')) && (
                <Link
                  href="/batches/create"
                  className="group flex items-start gap-3.5 rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-orange/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
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
                </Link>
              )}

              {(hasRole(['FOUNDER_SUPER_ADMIN', 'ADMIN']) || hasPermission('users:create')) && (
                <Link
                  href="/employees/create"
                  className="group flex items-start gap-3.5 rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-seg-plum/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
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
                </Link>
              )}

              {/* General Staff / Faculty Shortcut to Tasks & Reviews */}
              <Link
                href="/tasks"
                className="group flex items-start gap-3.5 rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-purple-500/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="rounded-lg bg-purple-500/10 p-2.5 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground group-hover:text-seg-plum transition-colors flex items-center gap-1">
                    Operational Tasks & Reviews
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    View assigned duties, track deliverables, and manage curriculum reviews
                  </p>
                </div>
              </Link>
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
              <Link
                href="/invoices"
                className="group flex items-center justify-between p-2 -mx-2 rounded-lg text-xs hover:bg-muted/50 transition-colors"
              >
                <span className="text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Pending Invoices
                </span>
                <span className="font-semibold text-foreground text-xs font-tabular group-hover:text-seg-plum flex items-center gap-1 transition-colors">
                  {isLoading ? '...' : `${stats.pendingInvoices} Due`}
                  <ChevronRight className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                </span>
              </Link>

              <Link
                href="/batches"
                className="group flex items-center justify-between p-2 -mx-2 rounded-lg text-xs hover:bg-muted/50 transition-colors"
              >
                <span className="text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
                  <CalendarCheck className="h-3.5 w-3.5 text-seg-plum shrink-0" /> Upcoming Cohort Starts
                </span>
                <span className="font-semibold text-foreground text-xs font-tabular group-hover:text-seg-plum flex items-center gap-1 transition-colors">
                  {isLoading ? '...' : `${stats.upcomingCohorts} upcoming`}
                  <ChevronRight className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                </span>
              </Link>

              <Link
                href="/students"
                className="group flex items-center justify-between p-2 -mx-2 rounded-lg text-xs hover:bg-muted/50 transition-colors"
              >
                <span className="text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
                  <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Pending KYC Reviews
                </span>
                <span className="font-semibold text-foreground text-xs font-tabular group-hover:text-seg-plum flex items-center gap-1 transition-colors">
                  {isLoading ? '...' : `${stats.pendingKyc} Verifications`}
                  <ChevronRight className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                </span>
              </Link>

              <div className="flex items-center justify-between p-2 -mx-2 rounded-lg text-xs border-t border-border/50 pt-2.5">
                <span className="text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-seg-orange shrink-0" /> Batch Capacity Avg
                </span>
                <span className="text-foreground font-semibold text-xs font-tabular">
                  {isLoading ? '...' : stats.activeBatches > 0 ? `${stats.capacityAvg}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
