'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  LifeBuoy,
  Download,
  RefreshCw,
  Clock,
  Radio,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface KpiData {
  mrr: number;
  arpu: number;
  totalSubscribers: number;
  activeSubscribers: number;
  churnRate: number;
  pendingReceivables: number;
  activeSessions: number;
  openTickets: number;
}

interface RevenueReport {
  dailyRevenue: { date: string; total: number; count: number }[];
  monthlyRevenue: { month: string; total: number; count: number }[];
  reconciliation: { gateway: string; totalTransactions: number; successfulCount: number; settledAmount: number }[];
  agingReceivables: { days0_30: number; days31_60: number; days61_90: number; days90Plus: number };
}

interface BandwidthReport {
  topConsumers: { username: string; totalBytes: number; totalIn: number; totalOut: number; sessions: number }[];
  usageByPackage: { packageName: string; price: number; downloadSpeed: string; uploadSpeed: string; subscriberCount: number }[];
  trends: { date: string; totalGb: number; sessionCount: number }[];
}

export default function ReportsPage() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [bandwidth, setBandwidth] = useState<BandwidthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingExport, setDownloadingExport] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const [kpiRes, revRes, bwRes] = await Promise.all([
        apiClient.request('/analytics/dashboard'),
        apiClient.request('/reports/revenue'),
        apiClient.request('/reports/bandwidth'),
      ]);
      setKpis(kpiRes);
      setRevenue(revRes);
      setBandwidth(bwRes);
    } catch (err) {
      console.error('Failed to load analytics & reports:', err);
    } finally {
      setLoading(false);
    }
  }

  async function triggerCsvExport(type: string) {
    setDownloadingExport(type);
    try {
      const token = localStorage.getItem('netorbit_access_token');
      const tenantSlug = localStorage.getItem('netorbit_tenant_slug');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;

      const res = await fetch(`http://localhost:3001/api/v1/reports/export/${type}`, { headers });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `netorbit_${type}_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Export failed for ${type}:`, err);
    } finally {
      setDownloadingExport(null);
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AdminLayout
      title="Analytics & Financial Reports"
      subtitle="Real-time MRR, ARPU, churn rates, payment reconciliation, bandwidth utilization, and CSV exports"
    >
      <div className="space-y-8">
        {/* Action Header */}
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={() => fetchReports()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

      {/* CSV Exports Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            One-Click Tenant Data Export (CSV)
          </h2>
          <span className="text-xs text-slate-400">Strictly tenant-isolated data streams</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {['subscribers', 'invoices', 'payments', 'tickets'].map((type) => (
            <button
              key={type}
              onClick={() => triggerCsvExport(type)}
              disabled={downloadingExport === type}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-emerald-500 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export {type.toUpperCase()} CSV
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Monthly Recurring Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            ${kpis?.mrr.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            Real-time active plan value
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Average Revenue / User</span>
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            ${kpis?.arpu.toFixed(2) || '0.00'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Per active subscriber / month</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Active Subscribers</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {kpis?.activeSubscribers || 0}
            <span className="text-xs text-slate-500 font-normal ml-1">/ {kpis?.totalSubscribers || 0} total</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Churn rate: <span className="text-amber-400 font-semibold">{kpis?.churnRate || 0}%</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Active Sessions</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {kpis?.activeSessions || 0}
          </div>
          <div className="text-[11px] text-cyan-400 mt-1">Live RADIUS NAS sessions</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Pending Receivables</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            ${kpis?.pendingReceivables.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Unpaid pending & overdue statements</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Open Support Tickets</span>
            <LifeBuoy className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {kpis?.openTickets || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Pending customer tickets</div>
        </div>
      </div>

      {/* Revenue Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Reconciliation by Gateway */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400" />
            Gateway Reconciliation & Settlement
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5">Gateway</th>
                  <th className="py-2.5">Transactions</th>
                  <th className="py-2.5">Successful</th>
                  <th className="py-2.5 text-right">Settled Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {revenue?.reconciliation.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">No payment transactions recorded</td>
                  </tr>
                ) : (
                  revenue?.reconciliation.map((r) => (
                    <tr key={r.gateway}>
                      <td className="py-3 font-semibold text-white uppercase">{r.gateway}</td>
                      <td className="py-3">{r.totalTransactions}</td>
                      <td className="py-3 text-emerald-400 font-semibold">{r.successfulCount}</td>
                      <td className="py-3 text-right font-bold text-white">
                        ${r.settledAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aging Receivables Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Aging Receivables (Days Past Due)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-xs block mb-1">Current (0–30 Days)</span>
              <span className="text-xl font-bold text-white">
                ${revenue?.agingReceivables.days0_30.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-amber-400 text-xs block mb-1">31–60 Days Overdue</span>
              <span className="text-xl font-bold text-amber-300">
                ${revenue?.agingReceivables.days31_60.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-orange-400 text-xs block mb-1">61–90 Days Overdue</span>
              <span className="text-xl font-bold text-orange-300">
                ${revenue?.agingReceivables.days61_90.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-red-400 text-xs block mb-1">90+ Days (High Risk)</span>
              <span className="text-xl font-bold text-red-400">
                ${revenue?.agingReceivables.days90Plus.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bandwidth Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Data Consumers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Top Bandwidth Consumers (RADIUS Accounting)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5">Subscriber</th>
                  <th className="py-2.5">Upload</th>
                  <th className="py-2.5">Download</th>
                  <th className="py-2.5 text-right">Total Consumed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {bandwidth?.topConsumers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">No RADIUS accounting data available</td>
                  </tr>
                ) : (
                  bandwidth?.topConsumers.map((c) => (
                    <tr key={c.username}>
                      <td className="py-3 font-mono font-medium text-white">{c.username}</td>
                      <td className="py-3">{formatBytes(c.totalIn)}</td>
                      <td className="py-3">{formatBytes(c.totalOut)}</td>
                      <td className="py-3 text-right font-bold text-cyan-400">
                        {formatBytes(c.totalBytes)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Usage by ISP Package */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Subscriber Distribution by Package
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5">Plan Name</th>
                  <th className="py-2.5">Speed (Down/Up)</th>
                  <th className="py-2.5">Monthly Fee</th>
                  <th className="py-2.5 text-right">Subscribers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {bandwidth?.usageByPackage.map((p) => (
                  <tr key={p.packageName}>
                    <td className="py-3 font-semibold text-white">{p.packageName}</td>
                    <td className="py-3 text-slate-400 font-mono">
                      {p.downloadSpeed}/{p.uploadSpeed}
                    </td>
                    <td className="py-3">${p.price.toFixed(2)}</td>
                    <td className="py-3 text-right font-bold text-emerald-400">
                      {p.subscriberCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
