'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/admin-layout';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  Plus,
  Search,
  CheckCircle2,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  AlertCircle,
  X,
  Radio,
  Activity,
  KeyRound,
  ArrowRight,
  Shield,
} from 'lucide-react';

export default function RadiusUsersPage() {
  const { user, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [authFilter, setAuthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [viewingUser, setViewingUser] = useState<any | null>(null);

  // Form State
  const initialFormData = {
    username: '',
    password: '',
    authType: 'mschapv2',
    status: 'active',
    simultaneousUse: 1,
    ipAddress: '',
    macAddress: '',
    subscriberId: '',
    packageId: '',
    tenantId: '',
  };
  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/radius/stats');
      setStats(res);
    } catch {
      // Fallback
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let query = `?page=1&limit=50`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (authFilter) query += `&authType=${encodeURIComponent(authFilter)}`;
      if (statusFilter) query += `&status=${encodeURIComponent(statusFilter)}`;

      const res = await apiClient.get(`/radius/users${query}`);
      const items = res?.data || res?.items || res || [];
      setUsers(Array.isArray(items) ? items : []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch RADIUS users');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscribersAndPackages = async () => {
    try {
      const [subsRes, pkgsRes] = await Promise.all([
        apiClient.get('/subscribers?limit=100'),
        apiClient.get('/packages?limit=100'),
      ]);
      const subItems = subsRes?.data || subsRes?.items || subsRes || [];
      const pkgItems = pkgsRes?.data || pkgsRes?.items || pkgsRes || [];
      setSubscribers(Array.isArray(subItems) ? subItems : []);
      setPackages(Array.isArray(pkgItems) ? pkgItems : []);
    } catch {
      // Ignore
    }
  };

  const fetchTenants = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await apiClient.get('/tenants');
      const items = res?.data || res?.items || res || [];
      setTenants(Array.isArray(items) ? items : []);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchSubscribersAndPackages();
    fetchTenants();
  }, [search, authFilter, statusFilter]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      ...initialFormData,
      tenantId: user?.tenantId || (tenants[0]?.id ?? ''),
      subscriberId: subscribers[0]?.id || '',
      packageId: packages[0]?.id || '',
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (u: any) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      password: '', // leave empty to keep unchanged
      authType: u.authType || 'mschapv2',
      status: u.status || 'active',
      simultaneousUse: u.simultaneousUse || 1,
      ipAddress: u.ipAddress || '',
      macAddress: u.macAddress || '',
      subscriberId: u.subscriberId || u.subscriber?.id || '',
      packageId: u.packageId || u.package?.id || '',
      tenantId: u.tenantId || '',
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.username.trim()) {
      setFormError('Username is required');
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      setFormError('Password is required for new RADIUS user');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        username: formData.username.trim(),
        authType: formData.authType,
        status: formData.status,
        simultaneousUse: Number(formData.simultaneousUse) || 1,
        ipAddress: formData.ipAddress?.trim() || undefined,
        macAddress: formData.macAddress?.trim() || undefined,
        subscriberId: formData.subscriberId || undefined,
        packageId: formData.packageId || undefined,
      };

      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      if (isSuperAdmin && formData.tenantId) {
        payload.tenantId = formData.tenantId;
      }

      if (editingUser) {
        await apiClient.patch(`/radius/users/${editingUser.id}`, payload);
        showToast('success', `RADIUS user "${formData.username}" updated`);
      } else {
        await apiClient.post('/radius/users', payload);
        showToast('success', `RADIUS user "${formData.username}" created`);
      }

      setShowCreateModal(false);
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (u: any) => {
    try {
      const nextStatus = u.status === 'active' ? 'suspended' : 'active';
      const updated = await apiClient.patch(`/radius/users/${u.id}/status`, { status: nextStatus });
      showToast('success', `User status updated to ${updated.status}`);
      setUsers(users.map((item) => (item.id === u.id ? { ...item, status: updated.status } : item)));
      fetchStats();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update user status');
    }
  };

  const handleDelete = async (u: any) => {
    if (!confirm(`Are you sure you want to delete RADIUS user "${u.username}"?`)) {
      return;
    }
    try {
      await apiClient.delete(`/radius/users/${u.id}`);
      showToast('success', `User "${u.username}" deleted`);
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete user');
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AdminLayout
      title="RADIUS AAA & Subscriber Access"
      subtitle="Subscriber credentials, RFC 2865 authentication, bandwidth authorization & session limits"
    >
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center space-x-3 text-sm transition-all duration-300 animate-slide-up ${
            notification.type === 'success'
              ? 'bg-slate-900 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-900 border-red-500/50 text-red-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total RADIUS Users</span>
              <KeyRound className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats?.totalUsers ?? users.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Configured credentials</p>
          </div>

          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Users</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              {stats?.activeUsers ?? users.filter((u) => u.status === 'active').length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Allowed to authenticate</p>
          </div>

          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Online Sessions</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-400 tracking-tight flex items-center space-x-2">
              <span>{stats?.activeSessions ?? 0}</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>
            <Link
              href="/radius/sessions"
              className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-flex items-center space-x-1"
            >
              <span>View live sessions</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Bandwidth Consumed</span>
              <Radio className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400 tracking-tight">
              {formatBytes(stats?.totalBytesConsumed || 0)}
            </div>
            <p className="text-xs text-slate-400 mt-1">RFC 2866 Accounting total</p>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by username, IP, or subscriber..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={authFilter}
                onChange={(e) => setAuthFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Auth Methods</option>
                <option value="pap">PAP (Plain Password)</option>
                <option value="chap">CHAP (MD5 Challenge)</option>
                <option value="mschapv2">MSCHAPv2 (Secure PPPoE)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="disabled">Disabled</option>
              </select>

              <button
                onClick={() => {
                  fetchUsers();
                  fetchStats();
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
                title="Refresh list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/radius/sessions"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Active Sessions</span>
            </Link>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition shadow-lg shadow-blue-900/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create RADIUS User</span>
            </button>
          </div>
        </div>

        {/* Table Listing */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Username / Account</th>
                  <th className="py-3.5 px-4 font-semibold">Subscriber</th>
                  <th className="py-3.5 px-4 font-semibold">Package / Rate Limit</th>
                  <th className="py-3.5 px-4 font-semibold">Auth Method</th>
                  <th className="py-3.5 px-4 font-semibold">Simultaneous</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                        <span>Loading RADIUS users...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <KeyRound className="w-8 h-8 text-slate-500 mx-auto" />
                        <div className="font-medium text-white text-sm">No RADIUS Users Found</div>
                        <p className="text-xs text-slate-400">
                          Create subscriber RADIUS credentials to enable PPPoE and IPoE network access.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition group">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center space-x-2">
                          <KeyRound className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="font-mono text-cyan-300">{u.username}</span>
                        </div>
                        {u.ipAddress && (
                          <div className="text-xs text-slate-400 font-mono">IP: {u.ipAddress}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {u.subscriber ? (
                          <div className="text-xs">
                            <span className="font-semibold text-white">
                              {u.subscriber.firstName} {u.subscriber.lastName}
                            </span>
                            <div className="text-slate-400 font-mono">{u.subscriber.accountNumber}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Unlinked</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {u.package ? (
                          <div>
                            <span className="text-xs font-semibold text-white">{u.package.name}</span>
                            <div className="text-xs text-slate-400 flex items-center space-x-2">
                              <span>↓ {u.package.downloadSpeedMbps}M</span>
                              <span>↑ {u.package.uploadSpeedMbps}M</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Default</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="uppercase px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/60">
                          {u.authType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-300">
                        {u.simultaneousUse || 1} session
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            u.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : u.status === 'suspended'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.status === 'active'
                                ? 'bg-emerald-400'
                                : u.status === 'suspended'
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                            }`}
                          />
                          <span className="capitalize">{u.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setViewingUser(u)}
                            className="p-1.5 bg-slate-800 hover:bg-cyan-600/20 hover:text-cyan-400 text-slate-300 rounded-lg transition"
                            title="View RADIUS Details"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                            title="Edit User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg transition ${
                              u.status === 'active'
                                ? 'bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400'
                                : 'bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400'
                            }`}
                            title={u.status === 'active' ? 'Suspend User' : 'Activate User'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-lg transition"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-base">
                  {editingUser ? 'Edit RADIUS User' : 'Create RADIUS User'}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              {isSuperAdmin && tenants.length > 0 && !editingUser && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Tenant Owner
                  </label>
                  <select
                    value={formData.tenantId}
                    onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Username / PPPoE Login *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sub_john_doe"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-cyan-300 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Password {editingUser ? '(Leave empty to keep)' : '*'}
                  </label>
                  <input
                    type="password"
                    placeholder={editingUser ? '••••••••••••' : 'Min 6 characters'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Authentication Protocol
                  </label>
                  <select
                    value={formData.authType}
                    onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="mschapv2">MSCHAPv2 (Recommended for PPPoE)</option>
                    <option value="chap">CHAP (MD5 Challenge)</option>
                    <option value="pap">PAP (Plain Password)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended (Reject Auth)</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Linked Subscriber
                  </label>
                  <select
                    value={formData.subscriberId}
                    onChange={(e) => setFormData({ ...formData, subscriberId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- None / Standalone --</option>
                    {subscribers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.accountNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Speed / Package Profile
                  </label>
                  <select
                    value={formData.packageId}
                    onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- None / Default --</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (↓{p.downloadSpeedMbps}M / ↑{p.uploadSpeedMbps}M)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Static IP Address (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10.100.1.50"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Simultaneous Sessions
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.simultaneousUse}
                    onChange={(e) => setFormData({ ...formData, simultaneousUse: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-900/30 flex items-center space-x-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingUser ? 'Save Changes' : 'Create User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{viewingUser.username}</h3>
                  <p className="text-xs text-slate-400 font-mono">Auth: {viewingUser.authType?.toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-400 block mb-0.5">Username:</span>
                  <span className="font-mono text-cyan-300 text-sm font-semibold">{viewingUser.username}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Password Storage:</span>
                  <span className="text-emerald-400 font-semibold">AES-256-GCM Encrypted</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Simultaneous Sessions:</span>
                  <span className="font-mono text-white">{viewingUser.simultaneousUse || 1} allowed</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Account Status:</span>
                  <span
                    className={`font-semibold capitalize ${
                      viewingUser.status === 'active'
                        ? 'text-emerald-400'
                        : viewingUser.status === 'suspended'
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {viewingUser.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Assigned Fixed IP:</span>
                  <span className="font-mono text-slate-300">{viewingUser.ipAddress || 'Dynamic Pool'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Package:</span>
                  <span className="text-white font-medium">{viewingUser.package?.name || 'Standard'}</span>
                </div>
              </div>

              {/* RADIUS Attributes Preview */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Generated RADIUS Reply Attributes
                </span>
                <div className="space-y-1 font-mono text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                  <div>Framed-Protocol = PPP</div>
                  <div>Service-Type = Framed-User</div>
                  {viewingUser.package && (
                    <>
                      <div>
                        {`Mikrotik-Rate-Limit = "${viewingUser.package.uploadSpeedMbps}M/${viewingUser.package.downloadSpeedMbps}M"`}
                      </div>
                      <div>
                        WISPr-Bandwidth-Max-Down = {viewingUser.package.downloadSpeedMbps * 1000000}
                      </div>
                      <div>WISPr-Bandwidth-Max-Up = {viewingUser.package.uploadSpeedMbps * 1000000}</div>
                    </>
                  )}
                  {viewingUser.ipAddress && <div>Framed-IP-Address = {viewingUser.ipAddress}</div>}
                  <div>Port-Limit = {viewingUser.simultaneousUse || 1}</div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
