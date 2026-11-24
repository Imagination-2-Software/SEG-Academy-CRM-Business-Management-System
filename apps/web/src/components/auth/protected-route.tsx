'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermission?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermission,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-seg-plum border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">
            Verifying SEG Academy credentials...
          </p>
        </div>
      </div>
    );
  }

  // Block unauthenticated access
  if (!isAuthenticated) {
    return null;
  }

  // Check role authorization
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Access Restricted
          </h2>
          <p className="text-sm text-muted-foreground">
            Your assigned role ({user?.role?.name || user?.role?.code}) does not
            have authorization to access this area.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-seg-plum-hover"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Check permission authorization
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Insufficient Permissions
          </h2>
          <p className="text-sm text-muted-foreground">
            Missing required permission: <code className="rounded bg-muted px-1 py-0.5">{requiredPermission}</code>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
