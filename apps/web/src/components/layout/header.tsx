'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  Bell,
  LogOut,
  User,
  Menu,
  X,
  Search,
  ChevronRight,
  Shield,
  Settings,
  KeyRound,
} from 'lucide-react';
import { SegLogo } from '@/components/ui/seg-logo';
import { CommandPalette } from './command-palette';
import { NotificationsPopover } from './notifications-popover';
import { notificationsService } from '@/lib/api/notifications';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Header({ onMobileMenuToggle, isMobileMenuOpen }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  // Modals & Popovers
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Load unread count
  const refreshUnreadCount = async () => {
    try {
      const list = await notificationsService.getNotifications();
      setUnreadNotifCount(list.filter((n) => !n.isRead).length);
    } catch {}
  };

  useEffect(() => {
    refreshUnreadCount();
  }, []);

  // Global Keyboard Shortcut for ⌘K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format breadcrumbs from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbTitle =
    pathSegments.length > 0
      ? pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1).replace('-', ' ')
      : 'Dashboard';

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur md:px-8">
        {/* Mobile Menu & Brand */}
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
          <Link href="/dashboard">
            <SegLogo size={28} showText={false} />
          </Link>
        </div>

        {/* Desktop Breadcrumb Navigation */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            CRM
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-foreground font-semibold">{breadcrumbTitle}</span>
          {pathSegments.length > 1 && (
            <>
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-seg-plum font-semibold uppercase tracking-wider text-[11px]">
                {pathSegments[1].replace('-', ' ')}
              </span>
            </>
          )}
        </div>

        {/* Global Quick-Search Bar Trigger */}
        <div className="hidden items-center gap-4 lg:flex flex-1 max-w-sm mx-6">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="relative w-full flex items-center justify-between h-8 rounded-md border border-input/80 bg-muted/30 px-3 text-xs text-muted-foreground hover:border-seg-plum hover:bg-muted/50 transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Search CRM modules & workflows...</span>
            </div>
            <kbd className="flex items-center gap-0.5 rounded border border-border/70 bg-background px-1.5 py-0.2 text-[9px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Action Controls & User Menu */}
        <div className="flex items-center gap-3">
          {/* Mobile Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="lg:hidden rounded-lg p-2 text-foreground/70 hover:bg-muted"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Environment Status Badge */}
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-seg-plum/20 bg-seg-plum-subtle px-2.5 py-0.5 text-[11px] font-semibold text-seg-plum">
            <span className="h-1.5 w-1.5 rounded-full bg-seg-orange animate-pulse" />
            Production Sync
          </span>

          {/* Notifications Bell Trigger & Popover */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className="relative rounded-lg p-2 text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
              aria-label="View notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-seg-orange opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-seg-orange" />
                </span>
              )}
            </button>

            <NotificationsPopover
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              onNotificationsChanged={refreshUnreadCount}
            />
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex items-center gap-2 rounded-full p-0.5 ring-offset-background transition-colors hover:ring-2 hover:ring-seg-plum"
              aria-expanded={showProfileMenu}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-seg-plum text-xs font-bold text-white shadow-xs">
                {user?.fullName
                  ? user.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'SA'}
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border/80 bg-card p-2 text-card-foreground shadow-lg z-50 animate-in fade-in-50 zoom-in-95">
                <div className="border-b border-border/70 px-3 py-2 text-xs">
                  <p className="font-semibold text-foreground truncate">
                    {user?.fullName || 'Staff User'}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded bg-seg-plum/10 text-seg-plum px-1.5 py-0.5 text-[10px] font-semibold border border-seg-plum/20">
                      <Shield className="h-3 w-3" />
                      {user?.role?.name || user?.role?.code || 'Staff'}
                    </span>
                  </div>
                </div>

                <div className="py-1 text-xs divide-y divide-border/40">
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-foreground hover:bg-muted transition-colors font-medium"
                    >
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      href="/profile?tab=account"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-foreground hover:bg-muted transition-colors font-medium"
                    >
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Account Preferences</span>
                    </Link>

                    <Link
                      href="/profile?tab=security"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-foreground hover:bg-muted transition-colors font-medium"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Security & Sessions</span>
                    </Link>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out of Session</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette Dialog */}
      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
