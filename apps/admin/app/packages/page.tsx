'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Power,
  ArrowUpDown,
  Download,
  Upload,
  Clock,
  Layers,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';

export default function PackagesPage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [viewingPackage, setViewingPackage] = useState<any | null>(null);

  // Form State
  const initialFormData = {
    name: '',
    slug: '',
    description: '',
    type: 'broadband',
    price: 49.99,
    currency: 'USD',
    billingCycle: 'monthly',
    validityDays: 30,
    downloadSpeedMbps: 100,
    uploadSpeedMbps: 50,
    dataQuotaGb: '' as any,
    burstSpeedMbps: '' as any,
    speedAfterQuotaMbps: '' as any,
    isActive: true,
    isPublic: true,
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

  const fetchPackages = async () => {
    try {
      setLoading(true);
      let query = `?page=1&limit=50`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (typeFilter) query += `&type=${encodeURIComponent(typeFilter)}`;
      if (statusFilter) query += `&isActive=${statusFilter === 'active'}`;

      const res = await apiClient.get(`/packages${query}`);
      const items = res?.data || res?.items || res || [];
      setPackages(Array.isArray(items) ? items : []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await apiClient.get('/tenants');
      const items = res?.data || res?.items || res || [];
      const arr = Array.isArray(items) ? items : [];
      setTenants(arr);
      if (arr.length > 0 && !selectedTenantId) {
        setSelectedTenantId(arr[0].id);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchPackages();
    fetchTenants();
  }, [search, typeFilter, statusFilter]);

  const handleOpenCreate = () => {
    setEditingPackage(null);
    setFormData({
      ...initialFormData,
      tenantId: user?.tenantId || selectedTenantId || (tenants[0]?.id ?? ''),
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (pkg: any) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      slug: pkg.slug,
      description: pkg.description || '',
      type: pkg.type,
      price: pkg.price,
      currency: pkg.currency || 'USD',
      billingCycle: pkg.billingCycle,
      validityDays: pkg.validityDays,
      downloadSpeedMbps: pkg.downloadSpeedMbps,
      uploadSpeedMbps: pkg.uploadSpeedMbps,
      dataQuotaGb: pkg.dataQuotaGb ?? '',
      burstSpeedMbps: pkg.burstSpeedMbps ?? '',
      speedAfterQuotaMbps: pkg.speedAfterQuotaMbps ?? '',
      isActive: pkg.isActive,
      isPublic: pkg.isPublic,
      tenantId: pkg.tenantId || '',
    });
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const resolvedTenantId =
      user?.tenantId || formData.tenantId || selectedTenantId || (tenants.length > 0 ? tenants[0].id : undefined);

    const payload = {
      ...formData,
      tenantId: editingPackage ? undefined : resolvedTenantId,
      price: Number(formData.price),
      validityDays: Number(formData.validityDays),
      downloadSpeedMbps: Number(formData.downloadSpeedMbps),
      uploadSpeedMbps: Number(formData.uploadSpeedMbps),
      dataQuotaGb: formData.dataQuotaGb ? Number(formData.dataQuotaGb) : null,
      burstSpeedMbps: formData.burstSpeedMbps ? Number(formData.burstSpeedMbps) : null,
      speedAfterQuotaMbps: formData.speedAfterQuotaMbps ? Number(formData.speedAfterQuotaMbps) : null,
    };

    try {
      if (editingPackage) {
        await apiClient.put(`/packages/${editingPackage.id}`, payload);
        showToast('success', `Package '${payload.name}' updated successfully`);
        setEditingPackage(null);
      } else {
        await apiClient.post('/packages', payload);
        showToast('success', `Package '${payload.name}' created successfully`);
        setShowCreateModal(false);
      }
      fetchPackages();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save package');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (pkg: any) => {
    try {
      if (pkg.isActive) {
        await apiClient.patch(`/packages/${pkg.id}/deactivate`);
        showToast('success', `Package '${pkg.name}' deactivated`);
      } else {
        await apiClient.patch(`/packages/${pkg.id}/activate`);
        showToast('success', `Package '${pkg.name}' activated`);
      }
      fetchPackages();
    } catch (err: any) {
      showToast('error', err.message || 'Status toggle failed');
    }
  };

  const handleDelete = async (pkg: any) => {
    if (!confirm(`Are you sure you want to retire package '${pkg.name}'?`)) return;
    try {
      await apiClient.delete(`/packages/${pkg.id}`);
      showToast('success', `Package '${pkg.name}' deleted successfully`);
      fetchPackages();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete package');
    }
  };

  return (
    <AdminLayout
      title="ISP Packages"
      subtitle="Configure broadband plans, speeds, quotas, and pricing"
      requiredPermission="packages:read"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">ISP Packages</h1>
                <p className="text-sm text-slate-400">Configure broadband plans, speeds, quotas, and pricing</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-blue-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create Package</span>
          </button>
        </div>

        {/* Toast Notification */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search by package name, slug, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="broadband">Broadband</option>
              <option value="fiber">Fiber</option>
              <option value="dedicated">Dedicated</option>
              <option value="hotspot">Hotspot</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Package Table */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Package</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Bandwidth (Down / Up)</th>
                  <th className="px-6 py-4">Data Allowance</th>
                  <th className="px-6 py-4">Price & Validity</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                      <p>Loading ISP packages...</p>
                    </td>
                  </tr>
                ) : packages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      <p className="text-base font-medium text-slate-400">No service packages found</p>
                      <p className="text-xs text-slate-500 mt-1">Get started by creating your first broadband package.</p>
                    </td>
                  </tr>
                ) : (
                  packages.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-semibold text-white text-base">{pkg.name}</span>
                          <span className="block text-xs font-mono text-slate-500">{pkg.slug}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-slate-800 text-slate-300 border border-slate-700">
                          {pkg.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3 text-xs">
                          <span className="flex items-center text-emerald-400">
                            <Download className="w-3.5 h-3.5 mr-1" />
                            {pkg.downloadSpeedMbps} Mbps
                          </span>
                          <span className="flex items-center text-blue-400">
                            <Upload className="w-3.5 h-3.5 mr-1" />
                            {pkg.uploadSpeedMbps} Mbps
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs">
                          {pkg.dataQuotaGb ? `${pkg.dataQuotaGb} GB` : <span className="text-emerald-400 font-semibold">Unlimited</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">
                          ${Number(pkg.price).toFixed(2)}
                          <span className="text-xs text-slate-400 font-normal"> / {pkg.validityDays} days</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(pkg)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                            pkg.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${pkg.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                          <span>{pkg.isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setViewingPackage(pkg)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            title="View Details"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(pkg)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                            title="Edit Package"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(pkg)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                            title="Delete Package"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Create / Edit Package Modal */}
        {(showCreateModal || editingPackage) && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-white text-lg">
                    {editingPackage ? `Edit Package: ${editingPackage.name}` : 'Create New ISP Package'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPackage(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-sm flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {user?.isSuperAdmin && !editingPackage && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Target Tenant *</label>
                    <select
                      value={formData.tenantId}
                      onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      required
                    >
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.slug})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Package Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fiber Ultra 200M"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Slug (URL / Radius Identifier)</label>
                    <input
                      type="text"
                      placeholder="Auto-generated if left blank"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Service Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="broadband">Broadband</option>
                      <option value="fiber">Fiber</option>
                      <option value="dedicated">Dedicated Line</option>
                      <option value="hotspot">Hotspot</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Validity (Days) *</label>
                    <input
                      type="number"
                      required
                      value={formData.validityDays}
                      onChange={(e) => setFormData({ ...formData, validityDays: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-blue-400 tracking-wider">Bandwidth & Traffic Limits</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Download Speed (Mbps) *</label>
                      <input
                        type="number"
                        required
                        value={formData.downloadSpeedMbps}
                        onChange={(e) => setFormData({ ...formData, downloadSpeedMbps: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Upload Speed (Mbps) *</label>
                      <input
                        type="number"
                        required
                        value={formData.uploadSpeedMbps}
                        onChange={(e) => setFormData({ ...formData, uploadSpeedMbps: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Data Quota (GB, null=unlimited)</label>
                      <input
                        type="number"
                        placeholder="Unlimited"
                        value={formData.dataQuotaGb}
                        onChange={(e) => setFormData({ ...formData, dataQuotaGb: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Provide features and customer-facing plan notes..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center space-x-6 pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span className="text-sm text-slate-300">Active Package</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                      className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span className="text-sm text-slate-300">Public (Show in Customer Self-Service)</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingPackage(null);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition flex items-center space-x-2"
                  >
                    {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    <span>{editingPackage ? 'Save Changes' : 'Create Package'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {viewingPackage && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <div className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-white text-lg">{viewingPackage.name}</h3>
                </div>
                <button onClick={() => setViewingPackage(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs text-slate-500 block uppercase">Price & Validity</span>
                    <span className="font-semibold text-white text-lg">${Number(viewingPackage.price).toFixed(2)}</span>
                    <span className="text-xs text-slate-400 block">{viewingPackage.validityDays} Days</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block uppercase">Service Type</span>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/40 text-blue-300 border border-blue-800/60 capitalize">
                      {viewingPackage.type}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-500 flex items-center mb-1">
                      <Download className="w-3.5 h-3.5 text-emerald-400 mr-1" /> Download Speed
                    </span>
                    <span className="font-bold text-white text-base">{viewingPackage.downloadSpeedMbps} Mbps</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-500 flex items-center mb-1">
                      <Upload className="w-3.5 h-3.5 text-blue-400 mr-1" /> Upload Speed
                    </span>
                    <span className="font-bold text-white text-base">{viewingPackage.uploadSpeedMbps} Mbps</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-500 block">Data Allowance</span>
                  <span className="font-semibold text-white">
                    {viewingPackage.dataQuotaGb ? `${viewingPackage.dataQuotaGb} GB Fair Usage Policy` : 'Unlimited Bandwidth'}
                  </span>
                </div>

                {viewingPackage.description && (
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 block">Description</span>
                    <p className="text-slate-300 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                      {viewingPackage.description}
                    </p>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setViewingPackage(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
