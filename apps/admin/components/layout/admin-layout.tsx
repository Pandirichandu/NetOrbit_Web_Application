'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  requiredPermission?: string;
  superAdminOnly?: boolean;
}

export function AdminLayout({
  children,
  title,
  subtitle,
  requiredPermission,
  superAdminOnly,
}: AdminLayoutProps) {
  const { isAuthenticated, isLoading, hasPermission, isSuperAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="text-sm font-medium">Loading NetOrbit Enterprise...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (superAdminOnly && !isSuperAdmin) {
    return (
      <div className="flex h-screen bg-slate-50 text-slate-900">
        <Sidebar />
        <div className="flex-1 ml-64 p-8 flex flex-col items-center justify-center text-center">
          <div className="p-6 bg-white border border-red-200 rounded-2xl max-w-md space-y-3 shadow-sm">
            <h2 className="text-lg font-bold text-red-600">Access Restricted</h2>
            <p className="text-sm text-slate-600">
              This module requires Super Administrator privileges. Your account does not have access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex h-screen bg-slate-50 text-slate-900">
        <Sidebar />
        <div className="flex-1 ml-64 p-8 flex flex-col items-center justify-center text-center">
          <div className="p-6 bg-white border border-red-200 rounded-2xl max-w-md space-y-3 shadow-sm">
            <h2 className="text-lg font-bold text-red-600">Permission Required</h2>
            <p className="text-sm text-slate-600">
              You lack the permission: <code className="text-red-700 bg-red-50 px-2 py-0.5 rounded font-mono">{requiredPermission}</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Header title={title} subtitle={subtitle} />
        <main className="p-8 flex-1">{children}</main>
      </div>
    </div>
  );
}
