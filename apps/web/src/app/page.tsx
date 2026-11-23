'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

/**
 * Root Application Entry Route ('/')
 *
 * SEG Academy CRM is an internal employee-only administrative portal.
 * - Authenticated users are automatically directed to '/dashboard'.
 * - Unauthenticated users are redirected to the Login page ('/login').
 */
export default function RootEntryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-seg-plum border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">
          Checking SEG Academy authentication session...
        </p>
      </div>
    </div>
  );
}
