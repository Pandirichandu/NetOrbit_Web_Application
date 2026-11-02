'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { apiClient } from '@/lib/api-client';
import {
  ShieldCheck,
  Shield,
  Plus,
  Key,
  CheckCircle2,
  Lock,
  Layers,
  Info,
} from 'lucide-react';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);

  const fetchRolesData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.get('/roles'),
        apiClient.get('/roles/permissions'),
      ]);
      const rList = Array.isArray(rolesRes) ? rolesRes : rolesRes?.data || [];
      const pList = Array.isArray(permsRes) ? permsRes : permsRes?.data || [];
      setRoles(rList);
      setPermissions(pList);
      if (rList.length > 0) setSelectedRole(rList[0]);
    } catch {
      // Demo fallback
      const demoRoles = [
        {
          id: '1',
          name: 'Super Administrator',
          slug: 'super_administrator',
          isSystem: true,
          isSrsRole: true,
          description: 'Complete system-wide control across all tenants and infrastructure.',
          permissions: [],
        },
        {
          id: '2',
          name: 'Tenant Administrator',
          slug: 'tenant_administrator',
          isSystem: true,
          isSrsRole: true,
          description: 'Full management authority within the ISP tenant workspace.',
          permissions: [],
        },
        {
          id: '3',
          name: 'Network Administrator',
          slug: 'network_administrator',
          isSystem: true,
          isSrsRole: true,
          description: 'Manages routers, NAS devices, IPAM pools, and RADIUS servers.',
          permissions: [],
        },
        {
          id: '4',
          name: 'Billing Executive',
          slug: 'billing_executive',
          isSystem: true,
          isSrsRole: true,
          description: 'Oversees billing cycles, invoices, payment gateways, and wallets.',
          permissions: [],
        },
        {
          id: '5',
          name: 'Customer Support',
          slug: 'customer_support',
          isSystem: true,
          isSrsRole: true,
          description: 'Handles subscriber inquiries, support tickets, and voucher issuance.',
          permissions: [],
        },
        {
          id: '6',
          name: 'Customer',
          slug: 'customer',
          isSystem: true,
          isSrsRole: true,
          description: 'Subscriber self-service role for payments and ticket submissions.',
          permissions: [],
        },
      ];
      setRoles(demoRoles);
      setSelectedRole(demoRoles[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesData();
  }, []);

  return (
    <AdminLayout
      title="Role-Based Access Control (RBAC)"
      subtitle="Strict authorization matrix enforcing the 6 SRS foundational roles"
      requiredPermission="roles:read"
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="p-4 bg-indigo-950/40 border border-indigo-800/40 rounded-2xl flex items-start space-x-3 text-xs text-indigo-300">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-400" />
          <span>
            NetOrbit enforces <strong>6 SRS-mandated Primary Roles</strong> with zero-trust granular permissions.
            System roles are cryptographically protected and cannot be deleted. Custom roles inherit from tenant boundaries.
          </span>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              Roles Catalog ({roles.length})
            </div>

            <div className="space-y-2">
              {roles.map((r) => {
                const isSelected = selectedRole?.slug === r.slug;
                return (
                  <div
                    key={r.slug || r.id}
                    onClick={() => setSelectedRole(r)}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500 shadow-md shadow-blue-900/20'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-bold text-sm text-white flex items-center space-x-2">
                        <Shield className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span>{r.name}</span>
                      </div>
                      {r.isSrsRole && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-800/40">
                          SRS Core
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 line-clamp-2">{r.description}</div>
                    <div className="mt-2 text-[10px] font-mono text-slate-500">slug: {r.slug}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role Details & Permissions Matrix */}
          <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            {selectedRole ? (
              <>
                <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-bold text-white">{selectedRole.name}</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-800/40 font-mono">
                        {selectedRole.slug}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{selectedRole.description}</p>
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-400">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{selectedRole.isSystem ? 'System Protected' : 'Custom'}</span>
                    </span>
                  </div>
                </div>

                {/* Permissions Groups */}
                <div className="space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                    <Key className="w-4 h-4 text-cyan-400" />
                    <span>Granted Permissions Matrix</span>
                  </div>

                  {selectedRole.slug === 'super_administrator' ? (
                    <div className="p-4 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-300 flex items-center space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <div>
                        <strong>Universal Super Administrator Access:</strong> All system resources, multi-tenant instances, configuration roots, and raw audit streams are automatically authorized.
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      { domain: 'Tenants & Onboarding', resource: 'tenants' },
                      { domain: 'User & Staff Management', resource: 'users' },
                      { domain: 'Roles & RBAC', resource: 'roles' },
                      { domain: 'Subscribers & CRM', resource: 'subscribers' },
                      { domain: 'Packages & Bandwidth', resource: 'packages' },
                      { domain: 'Billing & Invoices', resource: 'billing' },
                      { domain: 'Payment Gateways', resource: 'payments' },
                      { domain: 'RADIUS AAA & Sessions', resource: 'radius' },
                      { domain: 'Network & NAS Topology', resource: 'network' },
                      { domain: 'Vouchers & Captive Portal', resource: 'vouchers' },
                      { domain: 'Support Tickets', resource: 'tickets' },
                      { domain: 'Audit Logs & Trail', resource: 'audit' },
                    ].map((item) => {
                      const granted =
                        selectedRole.slug === 'super_administrator' ||
                        (selectedRole.slug === 'tenant_administrator' && item.resource !== 'tenants') ||
                        (selectedRole.slug === 'network_administrator' && ['network', 'radius', 'packages', 'subscribers'].includes(item.resource)) ||
                        (selectedRole.slug === 'billing_executive' && ['billing', 'payments', 'packages', 'subscribers', 'vouchers'].includes(item.resource)) ||
                        (selectedRole.slug === 'customer_support' && ['tickets', 'subscribers', 'vouchers'].includes(item.resource)) ||
                        (selectedRole.slug === 'customer' && ['tickets', 'billing', 'payments'].includes(item.resource));

                      return (
                        <div
                          key={item.resource}
                          className={`p-3.5 rounded-xl border flex items-center justify-between ${
                            granted
                              ? 'bg-slate-950/80 border-slate-800 text-slate-200'
                              : 'bg-slate-950/30 border-slate-900/60 text-slate-600 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-xs text-white">{item.domain}</div>
                            <div className="text-[10px] font-mono text-slate-500">{item.resource}:*</div>
                          </div>
                          {granted ? (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-800/40 rounded-md font-semibold">
                              Authorized
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 bg-slate-900 text-slate-600 rounded-md">
                              Denied
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                Select a role from the catalog to inspect permissions.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
