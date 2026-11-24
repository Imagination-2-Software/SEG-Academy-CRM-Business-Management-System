'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { ProtectedRoute } from '@/components/auth/protected-route';

interface AppShellProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermission?: string;
}

export function AppShell({
  children,
  allowedRoles,
  requiredPermission,
}: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <ProtectedRoute
      allowedRoles={allowedRoles}
      requiredPermission={requiredPermission}
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex flex-col md:pl-64">
          <Header
            onMobileMenuToggle={() => setIsMobileMenuOpen((prev) => !prev)}
            isMobileMenuOpen={isMobileMenuOpen}
          />
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
