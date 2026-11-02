'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from './api-client';

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
  mfaEnabled: boolean;
  status: string;
}

interface AuthContextType {
  user: UserSummary | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<{ requiresMfa?: boolean; mfaToken?: string }>;
  verifyMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('netorbit_user');
      const token = localStorage.getItem('netorbit_access_token');
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // Storage error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, tenantSlug?: string) => {
    setIsLoading(true);
    try {
      if (tenantSlug) {
        localStorage.setItem('netorbit_tenant_slug', tenantSlug);
      } else {
        localStorage.removeItem('netorbit_tenant_slug');
      }

      const res = await apiClient.post('/auth/login', {
        email,
        password,
        tenantSlug: tenantSlug || undefined,
      });

      if (res.requiresMfa) {
        setIsLoading(false);
        return { requiresMfa: true, mfaToken: res.mfaToken };
      }

      const { user: userData, tokens } = res;
      localStorage.setItem('netorbit_access_token', tokens.accessToken);
      localStorage.setItem('netorbit_refresh_token', tokens.refreshToken);
      localStorage.setItem('netorbit_user', JSON.stringify(userData));

      setUser(userData);
      setIsLoading(false);
      router.push('/dashboard');
      return {};
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const verifyMfa = async (mfaToken: string, code: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/mfa/verify', {
        mfaToken,
        code,
      });

      const { user: userData, tokens } = res;
      localStorage.setItem('netorbit_access_token', tokens.accessToken);
      localStorage.setItem('netorbit_refresh_token', tokens.refreshToken);
      localStorage.setItem('netorbit_user', JSON.stringify(userData));

      setUser(userData);
      setIsLoading(false);
      router.push('/dashboard');
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('netorbit_refresh_token');
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore logout request errors
    } finally {
      localStorage.removeItem('netorbit_access_token');
      localStorage.removeItem('netorbit_refresh_token');
      localStorage.removeItem('netorbit_user');
      localStorage.removeItem('netorbit_tenant_slug');
      setUser(null);
      router.push('/login');
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return user.permissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.roles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        verifyMfa,
        logout,
        hasPermission,
        hasRole,
        isSuperAdmin: user?.isSuperAdmin ?? false,
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
