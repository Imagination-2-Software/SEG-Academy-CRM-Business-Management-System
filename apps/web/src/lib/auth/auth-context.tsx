'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient, tokenStorage, ApiClientError } from '@/lib/api';
import { AuthUserInfo, AuthResponseData } from '@/lib/api/types';

interface AuthContextValue {
  user: AuthUserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: AuthResponseData) => void;
  logout: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  hasPermission: (permission: string) => boolean;
  setUser: (user: AuthUserInfo | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_STORAGE_KEY = 'seg_crm_user_profile';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load initial session on client mount
  useEffect(() => {
    const initializeSession = () => {
      try {
        const token = tokenStorage.getAccessToken();
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);

        if (token && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();

    // Listen for session expired events dispatched by ApiClient
    const handleAuthExpired = () => {
      setUser(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      tokenStorage.clearTokens();
      if (pathname && !pathname.startsWith('/login') && !pathname.startsWith('/forgot-password') && !pathname.startsWith('/reset-password')) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    };

    window.addEventListener('seg:auth:expired', handleAuthExpired);
    return () => {
      window.removeEventListener('seg:auth:expired', handleAuthExpired);
    };
  }, [pathname, router]);

  const login = useCallback(
    (authData: AuthResponseData) => {
      tokenStorage.saveTokens(authData.tokens);
      setUser(authData.user);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authData.user));
    },
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient.post(
          '/auth/logout',
          { refreshToken },
          { requiresAuth: false },
        );
      } catch (err) {
        // Silently handle logout failure on backend; client state must be cleared regardless
      }
    }

    tokenStorage.clearTokens();
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    router.push('/login');
  }, [router]);

  const hasRole = useCallback(
    (roles: string | string[]): boolean => {
      if (!user?.role?.code) return false;
      if (user.role.code === 'FOUNDER_SUPER_ADMIN') return true;

      const roleList = Array.isArray(roles) ? roles : [roles];
      return roleList.includes(user.role.code);
    },
    [user],
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      if (user.role?.code === 'FOUNDER_SUPER_ADMIN') return true;
      if (!user.permissions) return false;

      return (
        user.permissions.includes('*') ||
        user.permissions.includes(permission)
      );
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        hasPermission,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
