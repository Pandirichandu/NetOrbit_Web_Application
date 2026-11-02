'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Building2, Shield, CheckCircle2, Sun, Moon } from 'lucide-react';

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user, isSuperAdmin } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('netorbit_theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('netorbit_theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('netorbit_theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <header className="h-16 bg-white/90 backdrop-blur border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-3">
        {/* System Health Badge */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>System Healthy</span>
        </div>

        {/* Tenant or Super Admin Context */}
        <div className="flex items-center space-x-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs">
          {isSuperAdmin ? (
            <>
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-semibold text-amber-800">Global Admin Scope</span>
            </>
          ) : (
            <>
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold text-slate-700">Tenant Workspace</span>
            </>
          )}
        </div>

        {/* Theme Mode Switcher */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition flex items-center justify-center shadow-xs"
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 text-xs">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
            {user?.firstName?.[0] || 'A'}
          </div>
          <span className="hidden sm:inline font-semibold text-slate-800">
            {user?.firstName} {user?.lastName}
          </span>
        </div>
      </div>
    </header>
  );
}
