'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Bell, LogOut, User, Menu, X, Shield, Search, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SegLogo } from '@/components/ui/seg-logo';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Header({ onMobileMenuToggle, isMobileMenuOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
      {/* Mobile Brand & Menu Button */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={onMobileMenuToggle}
          className="rounded-lg p-2 text-foreground/80 hover:bg-muted"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
        <SegLogo size={28} showText={false} />
      </div>

      {/* Global Quick-Search Bar (Linear / Attio inspired) */}
      <div className="hidden items-center gap-4 md:flex flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search students, batches, courses... (Press ⌘K)"
            className="h-9 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-12 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-seg-plum"
          />
          <div className="absolute right-2.5 top-2.5 flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Command className="h-2.5 w-2.5" /> K
          </div>
        </div>
      </div>

      {/* Action Controls & User Menu */}
      <div className="flex items-center gap-3">
        {/* Environment Badge */}
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-seg-plum/20 bg-seg-plum-subtle px-2.5 py-0.5 text-[11px] font-semibold text-seg-plum">
          <span className="h-1.5 w-1.5 rounded-full bg-seg-orange animate-pulse" />
          CRM Live
        </span>

        {/* Notifications Icon Button */}
        <button
          className="relative rounded-lg p-2 text-foreground/70 hover:bg-muted hover:text-foreground"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-seg-orange" />
        </button>

        {/* Profile Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="flex items-center gap-2 rounded-full p-0.5 ring-offset-background transition-colors hover:ring-2 hover:ring-seg-plum"
            aria-expanded={showProfileMenu}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-seg-plum text-xs font-bold text-white shadow-sm">
              {user?.fullName
                ? user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                : 'SA'}
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 text-card-foreground shadow-xl z-50">
              <div className="border-b border-border/80 px-3 py-2 text-xs">
                <p className="font-bold text-foreground">{user?.fullName}</p>
                <p className="truncate text-muted-foreground">{user?.email}</p>
                <p className="mt-1 inline-block rounded bg-seg-plum-subtle px-1.5 py-0.5 text-[10px] font-semibold text-seg-plum">
                  {user?.role?.name || user?.role?.code}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
