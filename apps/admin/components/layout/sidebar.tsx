'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  FileText,
  Settings,
  Radio,
  LogOut,
  ChevronRight,
  Package,
  Server,
  Activity,
  Wifi,
  LifeBuoy,
  Briefcase,
  Bell,
  Zap,
  Webhook as WebhookIcon,
  BarChart3,
  Network,
  Route,
  Globe,
  Database,
  Cpu,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function Sidebar() {
  const pathname = usePathname();
  const { user, isSuperAdmin, logout } = useAuth();

  const navItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      title: 'Tenants',
      href: '/tenants',
      icon: Building2,
      show: isSuperAdmin,
      badge: 'Super Admin',
    },
    {
      title: 'Tickets & Helpdesk',
      href: '/tickets',
      icon: LifeBuoy,
      show: true,
    },
    {
      title: 'CRM & Field Ops',
      href: '/crm',
      icon: Briefcase,
      show: true,
    },
    {
      title: 'SNMP & Topology',
      href: '/snmp',
      icon: Network,
      show: true,
    },
    {
      title: 'BGP & OSPF Routing',
      href: '/routing',
      icon: Route,
      show: true,
    },
    {
      title: 'RADIUS Mesh',
      href: '/radius-mesh',
      icon: Globe,
      show: true,
    },
    {
      title: 'Subscribers',
      href: '/subscribers',
      icon: Users,
      show: true,
    },
    {
      title: 'Packages & Plans',
      href: '/packages',
      icon: Package,
      show: true,
    },
    {
      title: 'NAS Gateways',
      href: '/nas',
      icon: Server,
      show: true,
    },
    {
      title: 'IPAM Subnets',
      href: '/ipam',
      icon: Database,
      show: true,
    },
    {
      title: 'DHCP Scopes',
      href: '/dhcp',
      icon: Cpu,
      show: true,
    },
    {
      title: 'RADIUS Users',
      href: '/radius',
      icon: ShieldCheck,
      show: true,
    },
    {
      title: 'Active Sessions',
      href: '/radius/sessions',
      icon: Activity,
      show: true,
    },
    {
      title: 'Hotspot Vouchers',
      href: '/vouchers',
      icon: Wifi,
      show: true,
    },
    {
      title: 'Billing & Invoices',
      href: '/billing',
      icon: FileText,
      show: true,
    },
    {
      title: 'Payments',
      href: '/payments',
      icon: FileText,
      show: true,
    },
    {
      title: 'Notifications',
      href: '/notifications',
      icon: Bell,
      show: true,
    },
    {
      title: 'Automation Engine',
      href: '/automation',
      icon: Zap,
      show: true,
    },
    {
      title: 'Developer Webhooks',
      href: '/webhooks',
      icon: WebhookIcon,
      show: true,
    },
    {
      title: 'Analytics & Reports',
      href: '/reports',
      icon: BarChart3,
      show: true,
    },
    {
      title: 'Audit Logs',
      href: '/audit',
      icon: ShieldCheck,
      show: true,
    },
    {
      title: 'Users & Staff',
      href: '/users',
      icon: Users,
      show: isSuperAdmin,
    },
    {
      title: 'Roles & RBAC',
      href: '/roles',
      icon: ShieldCheck,
      show: isSuperAdmin,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      show: true,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen fixed left-0 top-0 text-slate-700 z-30 select-none shadow-sm">
      <div className="flex flex-col h-[calc(100vh-80px)]">
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center space-x-3 bg-white">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="font-bold text-slate-900 tracking-tight flex items-center space-x-1.5">
              <span>NETORBIT</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-mono font-semibold">v1.0</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Enterprise ISP Platform</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-4 space-y-1 overflow-y-auto flex-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Administration
          </div>
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/radius' && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      isActive
                        ? 'bg-blue-700 text-blue-100 border-blue-500'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 text-blue-100" />}
                </Link>
              );
            })}
        </div>
      </div>

      {/* User Status & Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
              {user?.firstName?.[0] || 'U'}
              {user?.lastName?.[0] || ''}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
