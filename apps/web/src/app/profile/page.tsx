'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout';
import { useAuth } from '@/lib/auth';
import { usersService } from '@/lib/api/users';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Shield,
  KeyRound,
  Bell,
  Mail,
  Phone,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Lock,
  LogOut,
  Clock,
  Laptop,
} from 'lucide-react';

function ProfileContent() {
  const { user, logout } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'profile' | 'account' | 'security') || 'profile';

  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'security'>(initialTab);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'security' || tabParam === 'account' || tabParam === 'profile') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingPassword) return;

    setPasswordError(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setPasswordError('Please provide your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await usersService.changePassword(currentPassword, newPassword);

      setSuccessMessage(res.message || 'Password changed successfully. Your account is secured with Argon2id.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password change failed:', err);
      setPasswordError(err.message || 'Failed to change password. Please verify your current password.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Profile Dossier Header */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-2xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-seg-plum text-2xl font-black text-white shadow-xs">
                {user?.fullName
                  ? user.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'SA'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {user?.fullName || 'Administrator'}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-md border border-seg-plum/20 bg-seg-plum/5 px-2 py-0.5 text-xs font-semibold text-seg-plum">
                    <Shield className="h-3 w-3" />
                    {user?.role?.name || user?.role?.code || 'Staff'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{user?.email}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 self-start sm:self-center"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border/80 pb-px">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'profile'
                ? 'border-seg-plum text-seg-plum'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-4 w-4" />
            <span>My Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'account'
                ? 'border-seg-plum text-seg-plum'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Account Preferences</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'security'
                ? 'border-seg-plum text-seg-plum'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>Security & Sessions</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: Profile Overview */}
        {activeTab === 'profile' && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-semibold text-foreground border-b border-border/80 pb-2.5">
              Personal Information & Assignment
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
                <span className="text-muted-foreground">Full Name</span>
                <div className="font-semibold text-foreground mt-1 text-sm">{user?.fullName}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
                <span className="text-muted-foreground">Registered Email</span>
                <div className="font-semibold text-foreground mt-1 font-mono">{user?.email}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
                <span className="text-muted-foreground">Assigned Role</span>
                <div className="font-semibold text-seg-plum mt-1">{user?.role?.name || user?.role?.code}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
                <span className="text-muted-foreground">System Identifier</span>
                <div className="font-mono text-muted-foreground mt-1 text-[11px]">{user?.id}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Account Preferences */}
        {activeTab === 'account' && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-semibold text-foreground border-b border-border/80 pb-2.5">
              Notification Channels & Subscriptions
            </h2>
            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-background cursor-pointer">
                <div>
                  <div className="font-semibold text-foreground">In-App Notification Alerts</div>
                  <div className="text-[11px] text-muted-foreground">Receive real-time badges and bell alerts for task assignments.</div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-seg-plum focus:ring-seg-plum" />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-background cursor-pointer">
                <div>
                  <div className="font-semibold text-foreground">Email Notifications</div>
                  <div className="text-[11px] text-muted-foreground">Receive email digests for invoices, payments, and batch rosters.</div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-seg-plum focus:ring-seg-plum" />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-background cursor-pointer">
                <div>
                  <div className="font-semibold text-foreground">SMS Alerts (Urgent Only)</div>
                  <div className="text-[11px] text-muted-foreground">SMS alerts for critical compliance deadlines and security alerts.</div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-seg-plum focus:ring-seg-plum" />
              </label>
            </div>
          </div>
        )}

        {/* Tab 3: Security & Sessions */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Active Session Card */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-3">
              <h2 className="text-sm font-semibold text-foreground border-b border-border/80 pb-2.5">
                Active Authenticated Session
              </h2>
              <div className="flex items-center justify-between text-xs p-3 rounded-lg border border-border/60 bg-muted/20">
                <div className="flex items-center gap-3">
                  <Laptop className="h-5 w-5 text-seg-plum" />
                  <div>
                    <div className="font-semibold text-foreground">Current Browser Session</div>
                    <div className="text-[11px] text-muted-foreground">15-min rotating JWT with cryptographic replay protection</div>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  Active & Verified
                </span>
              </div>
            </div>

            {/* Change Password Form */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
              <h2 className="text-sm font-semibold text-foreground border-b border-border/80 pb-2.5">
                Change Account Password
              </h2>

              {passwordError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-3 text-xs max-w-md">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:border-seg-plum focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">New Password (min 8 chars)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:border-seg-plum focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:border-seg-plum focus:outline-hidden"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-seg-plum px-4 py-2 text-xs font-semibold text-white hover:bg-seg-plum/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmittingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex h-64 items-center justify-center">
            <p className="text-xs text-muted-foreground">Loading profile information...</p>
          </div>
        </AppShell>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
