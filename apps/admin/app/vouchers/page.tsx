'use client';

import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Ban,
  Copy,
  Check,
  Wifi,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface Voucher {
  id: string;
  code: string;
  pin?: string;
  batchNumber?: string;
  durationMinutes: number;
  dataQuotaMb?: number;
  price: number;
  status: string;
  usedCount: number;
  maxUses: number;
  expiresAt?: string;
  redeemedAt?: string;
  createdAt: string;
  package?: {
    id: string;
    name: string;
  } | null;
}

interface PackageOption {
  id: string;
  name: string;
  price: number;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate form state
  const [count, setCount] = useState(10);
  const [prefix, setPrefix] = useState('NET');
  const [durationMinutes, setDurationMinutes] = useState(1440);
  const [dataQuotaMb, setDataQuotaMb] = useState(5120);
  const [price, setPrice] = useState(5.0);
  const [selectedPkgId, setSelectedPkgId] = useState('');
  const [batchName, setBatchName] = useState('');

  // Redeem form state
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemPin, setRedeemPin] = useState('');
  const [redeemMac, setRedeemMac] = useState('aa:bb:cc:dd:ee:ff');
  const [redeemResult, setRedeemResult] = useState<any>(null);

  useEffect(() => {
    fetchVouchers();
    fetchPackages();
  }, [statusFilter]);

  async function fetchVouchers() {
    setLoading(true);
    try {
      let url = '/vouchers?limit=50';
      if (statusFilter) url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await apiClient.get(url);
      setVouchers(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function fetchPackages() {
    try {
      const res = await apiClient.get('/packages?limit=100');
      setPackages(res.data || []);
    } catch {
      // ignore
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/vouchers/generate', {
        count: Number(count),
        prefix,
        durationMinutes: Number(durationMinutes),
        dataQuotaMb: Number(dataQuotaMb) || undefined,
        price: Number(price),
        packageId: selectedPkgId || undefined,
        batchNumber: batchName || undefined,
      });
      setShowGenerateModal(false);
      fetchVouchers();
      alert(`Successfully generated ${count} vouchers!`);
    } catch (err: any) {
      alert(err.message || 'Failed to generate vouchers');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRedeemTest(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setRedeemResult(null);
    try {
      const res = await apiClient.post('/vouchers/redeem', {
        code: redeemCode,
        pin: redeemPin || undefined,
        macAddress: redeemMac || undefined,
      });
      setRedeemResult(res);
      fetchVouchers();
    } catch (err: any) {
      alert(err.message || 'Redemption failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Are you sure you want to revoke this voucher?')) return;
    try {
      await apiClient.patch(`/vouchers/${id}/revoke`, {});
      fetchVouchers();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke voucher');
    }
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  // Summary Metrics
  const activeCount = vouchers.filter((v) => v.status === 'active').length;
  const redeemedCount = vouchers.filter((v) => v.status === 'redeemed').length;
  const revokedCount = vouchers.filter((v) => v.status === 'revoked').length;

  return (
    <AdminLayout
      title="Hotspot Vouchers"
      subtitle="Cryptographic voucher generation, quota limits, redemption lifecycle, and hotspot access tokens"
    >
      <div className="space-y-6">
        {/* Action Header */}
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={() => {
              setRedeemResult(null);
              setShowRedeemModal(true);
            }}
            id="test-redeem-btn"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <Wifi className="w-4 h-4 text-cyan-400" />
            Test Redemption
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            id="generate-vouchers-btn"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Generate Batch
          </button>
        </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Vouchers</p>
            <p className="text-2xl font-bold text-white mt-1">{vouchers.length}</p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Ticket className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Active Inventory</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Redeemed Tokens</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{redeemedCount}</p>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <Wifi className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Revoked / Expired</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{revokedCount}</p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
            <Ban className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search code or batch number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchVouchers()}
            className="bg-transparent border-none text-white text-sm focus:outline-none w-full placeholder-slate-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none border-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Statuses</option>
              <option value="active" className="bg-slate-900">Active</option>
              <option value="redeemed" className="bg-slate-900">Redeemed</option>
              <option value="expired" className="bg-slate-900">Expired</option>
              <option value="revoked" className="bg-slate-900">Revoked</option>
            </select>
          </div>
          <button
            onClick={() => fetchVouchers()}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-300 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Voucher Code</th>
                <th className="py-3.5 px-4">PIN</th>
                <th className="py-3.5 px-4">Batch #</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Quota</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading vouchers...
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No vouchers generated yet. Click &quot;Generate Batch&quot; to create access codes.
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white tracking-wider">{v.code}</span>
                        <button
                          onClick={() => copyToClipboard(v.code)}
                          className="text-slate-500 hover:text-indigo-400 transition"
                          title="Copy Code"
                        >
                          {copiedCode === v.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {v.pin || 'None'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {v.batchNumber || 'Ad-hoc'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {Math.round(v.durationMinutes / 60)} hrs
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {v.dataQuotaMb ? `${(v.dataQuotaMb / 1024).toFixed(1)} GB` : 'Unlimited'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400">
                      ${Number(v.price).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          v.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : v.status === 'redeemed'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {v.status === 'active' && (
                        <button
                          onClick={() => handleRevoke(v.id)}
                          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Batch Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Generate Voucher Batch
            </h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Batch Count</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Code Prefix</label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                    required
                    maxLength={6}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm uppercase font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Link Package (Optional)</label>
                <select
                  value={selectedPkgId}
                  onChange={(e) => setSelectedPkgId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">-- Generic Hotspot Profile --</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - ${Number(pkg.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="15"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Data Quota (MB)</label>
                  <input
                    type="number"
                    min="0"
                    value={dataQuotaMb}
                    onChange={(e) => setDataQuotaMb(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Price per Voucher ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Batch Label</label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g. VIP-CONFERENCE-2026"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
                >
                  {isSubmitting ? 'Generating...' : 'Generate Vouchers'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Redemption Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wifi className="w-5 h-5 text-cyan-400" />
              Hotspot Voucher Redemption Simulator
            </h2>
            <form onSubmit={handleRedeemTest} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Voucher Code</label>
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. NET-ABCD-1234"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">PIN (If Required)</label>
                  <input
                    type="text"
                    value={redeemPin}
                    onChange={(e) => setRedeemPin(e.target.value)}
                    placeholder="4-digit PIN"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Client MAC Address</label>
                  <input
                    type="text"
                    value={redeemMac}
                    onChange={(e) => setRedeemMac(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              {redeemResult && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1 text-xs">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    Voucher Authenticated & Redeemed!
                  </div>
                  <div className="text-slate-300">
                    Duration: {redeemResult.bandwidthProfile?.durationMinutes || 1440} minutes
                  </div>
                  <div className="text-slate-300">
                    Speed Limits: {redeemResult.bandwidthProfile?.downloadSpeedMbps || 20} Mbps Down /{' '}
                    {redeemResult.bandwidthProfile?.uploadSpeedMbps || 10} Mbps Up
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRedeemModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold transition"
                >
                  {isSubmitting ? 'Redeeming...' : 'Test Redeem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
