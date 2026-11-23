'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { apiClient, ApiClientError } from '@/lib/api';
import { Lock, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!token) {
    return (
      <CardContent className="space-y-4 pt-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Invalid Reset Request</h2>
        <p className="text-sm text-muted-foreground">
          Missing single-use reset token. Please request a new password reset link.
        </p>
        <Link href="/forgot-password">
          <Button variant="outline" className="w-full">
            Request New Link
          </Button>
        </Link>
      </CardContent>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post(
        '/auth/reset-password',
        { token, newPassword },
        { requiresAuth: false },
      );
      setSuccess(true);
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to reset password. The link may have expired or already been used.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <CardContent className="space-y-4 pt-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Password Reset Complete</h2>
        <p className="text-sm text-muted-foreground">
          Your password has been successfully updated and all previous sessions have been revoked.
        </p>
        <div className="pt-2">
          <Link href="/login">
            <Button className="w-full bg-seg-plum text-white hover:bg-seg-plum-hover">
              Sign In with New Password
            </Button>
          </Link>
        </div>
      </CardContent>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl">Set New Password</CardTitle>
        <CardDescription>
          Enter your new password (minimum 8 characters)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="••••••••••••"
              className="pl-9"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="••••••••••••"
              className="pl-9"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Button
          type="submit"
          className="w-full bg-seg-plum text-white hover:bg-seg-plum-hover"
          disabled={isLoading}
        >
          {isLoading ? 'Updating password...' : 'Update Password'}
        </Button>
      </CardFooter>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-seg-plum dark:text-white">
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Update your SEG Academy account security credentials
          </p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <Suspense fallback={<div className="p-6 text-center text-sm">Loading security parameters...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
