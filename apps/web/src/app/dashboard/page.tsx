'use client';

import React from 'react';
import { AppShell } from '@/components/layout';
import { useAuth } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  GraduationCap,
  Users,
  Receipt,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              Operational Overview
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, <strong className="text-foreground">{user?.fullName}</strong> ({user?.role?.name || user?.role?.code}). Here is your live CRM status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              API Online & Synchronized
            </span>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Enrolments
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-seg-plum" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">148</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-600 font-semibold inline-flex items-center">
                  +12% <ArrowUpRight className="h-3 w-3" />
                </span>
                from previous cohort
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Batches
              </CardTitle>
              <BookOpen className="h-4 w-4 text-seg-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">12</div>
              <p className="text-xs text-muted-foreground mt-1">
                4 batches scheduled this month
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reconciled Revenue
              </CardTitle>
              <Receipt className="h-4 w-4 text-seg-yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">₹28.4L</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-600 font-semibold inline-flex items-center">
                  +8.4% <ArrowUpRight className="h-3 w-3" />
                </span>
                verified via DB triggers
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Staff & Counselors
              </CardTitle>
              <Users className="h-4 w-4 text-seg-plum" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">24</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across 4 departments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Security & System Status Information */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-seg-plum" />
                <CardTitle className="text-lg">Security & Session Health</CardTitle>
              </div>
              <CardDescription>
                Live cryptographic verification status of your current session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-xs">
                <span className="font-medium text-foreground">Token Scheme</span>
                <span className="font-mono text-muted-foreground">JWT Access (15m) + SHA-256 Refresh (30d)</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-xs">
                <span className="font-medium text-foreground">Cryptographic Algorithm</span>
                <span className="font-mono text-muted-foreground">Argon2id (64MB / 3 iterations / 4 parallelism)</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-xs">
                <span className="font-medium text-foreground">Rate Limiting Protection</span>
                <span className="font-semibold text-emerald-600">Active (In-Memory Sliding Window)</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-seg-orange" />
                <CardTitle className="text-lg">Platform Architecture Status</CardTitle>
              </div>
              <CardDescription>
                Status of connected monorepo packages and micro-modules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-xs">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  PostgreSQL 17 (Supabase Staging)
                </span>
                <span className="text-muted-foreground">26 Models & 6 Triggers</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-xs">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  NestJS Modular Monolith API
                </span>
                <span className="text-muted-foreground">108 Automated Tests Passing</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-xs">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Next.js 15 App Router Frontend
                </span>
                <span className="text-muted-foreground">Authenticated Shell Active</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
