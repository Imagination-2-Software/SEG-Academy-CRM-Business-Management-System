'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { apiClient, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AuthResponseData, StandardApiResponse } from '@/lib/api/types';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { SegLogo } from '@/components/ui/seg-logo';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const { user, isAuthenticated, isLoading: isAuthLoading, login } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If already authenticated, redirect immediately to dashboard or redirect destination
  useEffect(() => {
    if (mounted && !isAuthLoading && isAuthenticated) {
      router.replace(redirectUrl);
    }
  }, [mounted, isAuthLoading, isAuthenticated, redirectUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      const response: StandardApiResponse<AuthResponseData> = await apiClient.post(
        '/auth/login',
        { email, password },
        { requiresAuth: false },
      );

      if (response.success && response.data) {
        login(response.data);
        router.replace(redirectUrl);
      } else {
        setErrorMessage(response.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Unable to connect to the authentication service.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || isAuthLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading authentication interface...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
          <p className="text-xs text-muted-foreground">Redirecting to workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="border border-border/80 shadow-sm bg-card transition-shadow duration-200">
      <CardHeader className="space-y-1.5 pb-5 pt-6 px-6 sm:px-8">
        <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Sign In
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Enter your official SEG Academy email and password to access your workspace.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-6 sm:px-8 pb-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs sm:text-sm text-destructive leading-snug">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium text-foreground tracking-tight">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="name@segacademy.com"
                className="h-10 sm:h-11 pl-10 text-xs sm:text-sm transition-colors focus-visible:ring-1 focus-visible:ring-seg-plum"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-medium text-foreground tracking-tight">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-seg-orange hover:text-seg-orange-hover hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••••••••"
                className="h-10 sm:h-11 pl-10 text-xs sm:text-sm transition-colors focus-visible:ring-1 focus-visible:ring-seg-plum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2 pb-6 px-6 sm:px-8">
          <Button
            type="submit"
            className="w-full h-10 sm:h-11 bg-seg-plum text-white hover:bg-seg-plum-hover font-semibold text-xs sm:text-sm shadow-sm transition-all duration-150"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Authenticating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Sign In to Workspace
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/70 p-4 sm:p-6 md:p-8 dark:bg-slate-950">
      <div className="w-full max-w-[420px] space-y-6">
        {/* Brand Header with SEG Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <SegLogo size={52} showText={false} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-seg-plum dark:text-white">
              SEG ACADEMY <span className="text-seg-orange">CRM</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-normal">
              Internal Enterprise Management Portal
            </p>
          </div>
        </div>

        {/* Login Card with Suspense for useSearchParams */}
        <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading authentication interface...</div>}>
          <LoginForm />
        </Suspense>

        {/* Professional Subtle SEG Academy Footer */}
        <footer className="text-center space-y-1.5 pt-1">
          <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
            <span>&copy; 2026 SEG Academy</span>
            <span>&bull;</span>
            <span>Staff & Faculty Portal</span>
          </div>
          <p className="text-[10px] text-muted-foreground/75">
            Authorized administrative access only
          </p>
        </footer>
      </div>
    </div>
  );
}
