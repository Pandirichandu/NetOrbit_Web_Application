'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  Server,
  Plus,
  Search,
  CheckCircle2,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  AlertCircle,
  X,
  Activity,
  Zap,
} from 'lucide-react';

export default function NasDevicesPage() {
  const { user, isSuperAdmin } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any | null>(null);
  const [viewingDevice, setViewingDevice] = useState<any | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Form State
  const initialFormData = {
    name: '',
    identifier: '',
    ipAddress: '',
    secret: '',
    type: 'mikrotik',
    coaPort: 3799,
    description: '',
    status: 'active',
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

  const fetchDevices = async () => {
    try {
      setLoading(true);
      let query = `?page=1&limit=50`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (typeFilter) query += `&type=${encodeURIComponent(typeFilter)}`;
      if (statusFilter) query += `&status=${encodeURIComponent(statusFilter)}`;

      const res = await apiClient.get(`/nas${query}`);
      const items = res?.data || res?.items || res || [];
      setDevices(Array.isArray(items) ? items : []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch NAS devices');
    } finally {
      setLoading(false);
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
    fetchDevices();
    fetchTenants();
  }, [search, typeFilter, statusFilter]);

  const handleOpenCreate = () => {
    setEditingDevice(null);
    setFormData({
      ...initialFormData,
      tenantId: user?.tenantId || (tenants[0]?.id ?? ''),
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (dev: any) => {
    setEditingDevice(dev);
    setFormData({
      name: dev.name,
      identifier: dev.identifier,
      ipAddress: dev.ipAddress,
      secret: '', // leave empty to keep unchanged
      type: dev.type || 'mikrotik',
      coaPort: dev.coaPort || 3799,
      description: dev.description || '',
      status: dev.status || 'active',
      tenantId: dev.tenantId || '',
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenView = (dev: any) => {
    setViewingDevice(dev);
    setTestResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Gateway name is required');
      return;
    }
    if (!formData.identifier.trim()) {
      setFormError('NAS Identifier is required');
      return;
    }
    if (!formData.ipAddress.trim()) {
      setFormError('IP Address is required');
      return;
    }
    if (!editingDevice && !formData.secret.trim()) {
      setFormError('RADIUS Shared Secret is required for new NAS');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        name: formData.name.trim(),
        identifier: formData.identifier.trim(),
        ipAddress: formData.ipAddress.trim(),
        type: formData.type,
        coaPort: Number(formData.coaPort) || 3799,
        description: formData.description?.trim() || undefined,
        status: formData.status,
      };

      if (formData.secret.trim()) {
        payload.secret = formData.secret.trim();
      }

      if (isSuperAdmin && formData.tenantId) {
        payload.tenantId = formData.tenantId;
      }

      if (editingDevice) {
        await apiClient.patch(`/nas/${editingDevice.id}`, payload);
        showToast('success', `NAS "${formData.name}" updated successfully`);
      } else {
        await apiClient.post('/nas', payload);
        showToast('success', `NAS "${formData.name}" registered successfully`);
      }

      setShowCreateModal(false);
      fetchDevices();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (dev: any) => {
    try {
      const updated = await apiClient.patch(`/nas/${dev.id}/status`, {});
      showToast('success', `NAS status set to ${updated.status || 'updated'}`);
      setDevices(devices.map((d) => (d.id === dev.id ? { ...d, status: updated.status } : d)));
    } catch (err: any) {
      showToast('error', err.message || 'Failed to toggle NAS status');
    }
  };

  const handleDelete = async (dev: any) => {
    if (!confirm(`Are you sure you want to delete NAS "${dev.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiClient.delete(`/nas/${dev.id}`);
      showToast('success', `NAS "${dev.name}" deleted successfully`);
      fetchDevices();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete NAS device');
    }
  };

  const handleTestConnection = async (devId: string) => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      const res = await apiClient.post(`/nas/${devId}/test-connection`, {});
      setTestResult(res);
      if (res.reachable) {
        showToast('success', `NAS response received: latency ${res.latencyMs}ms`);
      } else {
        showToast('error', `Connection test failed: ${res.message}`);
      }
    } catch (err: any) {
      setTestResult({ reachable: false, message: err.message });
      showToast('error', err.message || 'Test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const activeCount = devices.filter((d) => d.status === 'active').length;
  const totalCount = devices.length;

  return (
    <AdminLayout
      title="NAS Devices & Gateways"
      subtitle="Network Access Servers, BNG/BRAS gateways, RADIUS clients & CoA configuration"
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
              <span className="text-xs font-semibold uppercase tracking-wider">Total NAS Devices</span>
              <Server className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{totalCount}</div>
            <p className="text-xs text-slate-400 mt-1">Configured RADIUS Gateways</p>
          </div>

          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Devices</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">{activeCount}</div>
            <p className="text-xs text-slate-400 mt-1">Online & processing AAA traffic</p>
          </div>

          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Inactive Gateways</span>
              <Power className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 tracking-tight">{totalCount - activeCount}</div>
            <p className="text-xs text-slate-400 mt-1">Disabled or standby</p>
          </div>

          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">CoA / PoD Port</span>
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-400 tracking-tight">RFC 3576</div>
            <p className="text-xs text-slate-400 mt-1">UDP Port 3799 / Disconnect</p>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search NAS by name, identifier, or IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Vendors</option>
                <option value="mikrotik">MikroTik RouterOS</option>
                <option value="cisco">Cisco IOS-XE / ASA</option>
                <option value="huawei">Huawei NE / BNG</option>
                <option value="juniper">Juniper Junos</option>
                <option value="generic">Generic RFC 2865</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <button
                onClick={() => fetchDevices()}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
                title="Refresh list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition shadow-lg shadow-blue-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>Register NAS</span>
          </button>
        </div>

        {/* Table Listing */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Gateway / Name</th>
                  <th className="py-3.5 px-4 font-semibold">Identifier</th>
                  <th className="py-3.5 px-4 font-semibold">IP Address</th>
                  <th className="py-3.5 px-4 font-semibold">Vendor Type</th>
                  <th className="py-3.5 px-4 font-semibold">CoA Port</th>
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
                        <span>Loading NAS devices...</span>
                      </div>
                    </td>
                  </tr>
                ) : devices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Server className="w-8 h-8 text-slate-500 mx-auto" />
                        <div className="font-medium text-white text-sm">No NAS Devices Found</div>
                        <p className="text-xs text-slate-400">
                          Register your first BRAS / BNG router to accept RADIUS authentication requests.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  devices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-slate-800/30 transition group">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center space-x-2">
                          <Server className="w-4 h-4 text-blue-400 shrink-0" />
                          <span>{dev.name}</span>
                        </div>
                        {dev.description && (
                          <div className="text-xs text-slate-400 truncate max-w-xs">{dev.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-cyan-300">{dev.identifier}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-300">{dev.ipAddress}</td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {dev.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{dev.coaPort || 3799}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            dev.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              dev.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                            }`}
                          />
                          <span className="capitalize">{dev.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenView(dev)}
                            className="p-1.5 bg-slate-800 hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 rounded-lg transition"
                            title="View Details & Test"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(dev)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                            title="Edit NAS"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(dev)}
                            className={`p-1.5 rounded-lg transition ${
                              dev.status === 'active'
                                ? 'bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400'
                                : 'bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400'
                            }`}
                            title={dev.status === 'active' ? 'Deactivate NAS' : 'Activate NAS'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(dev)}
                            className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-lg transition"
                            title="Delete NAS"
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
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-base">
                  {editingDevice ? 'Edit NAS Gateway' : 'Register New NAS Gateway'}
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

              {isSuperAdmin && tenants.length > 0 && !editingDevice && (
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
                    Gateway Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Core-BRAS-01"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    NAS Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. mikrotik-core"
                    value={formData.identifier}
                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-cyan-300 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    IP Address / Host *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 192.168.1.1 or FQDN"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Vendor Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="mikrotik">MikroTik RouterOS</option>
                    <option value="cisco">Cisco IOS-XE / ASA</option>
                    <option value="huawei">Huawei NE / BNG</option>
                    <option value="juniper">Juniper Junos</option>
                    <option value="generic">Generic RFC 2865</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    RADIUS Shared Secret {editingDevice ? '(Leave empty to keep)' : '*'}
                  </label>
                  <input
                    type="password"
                    placeholder={editingDevice ? '••••••••••••' : 'Shared secret (min 6 chars)'}
                    value={formData.secret}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Encrypted at rest using AES-256-GCM.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    CoA / PoD Port
                  </label>
                  <input
                    type="number"
                    value={formData.coaPort}
                    onChange={(e) => setFormData({ ...formData, coaPort: parseInt(e.target.value) || 3799 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Standard RFC 3576 port is 3799.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description / Location
                </label>
                <textarea
                  rows={2}
                  placeholder="Primary gateway at Datacenter Rack 4B..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
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
                  <span>{editingDevice ? 'Save Changes' : 'Register NAS'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS / TEST CONNECTION MODAL */}
      {viewingDevice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{viewingDevice.name}</h3>
                  <p className="text-xs text-slate-400">{viewingDevice.identifier}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingDevice(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-400 block mb-0.5">IP Address:</span>
                  <span className="font-mono text-cyan-300 text-sm">{viewingDevice.ipAddress}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Vendor Architecture:</span>
                  <span className="text-white capitalize font-semibold">{viewingDevice.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">CoA / Disconnect Port:</span>
                  <span className="font-mono text-white">{viewingDevice.coaPort || 3799}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Operational Status:</span>
                  <span
                    className={`font-semibold capitalize ${
                      viewingDevice.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {viewingDevice.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Shared Secret:</span>
                  <span className="font-mono text-slate-400">•••••••••••• (Encrypted)</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Created At:</span>
                  <span className="text-slate-300">
                    {new Date(viewingDevice.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {viewingDevice.description && (
                <div className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 font-medium block mb-1">Notes:</span>
                  {viewingDevice.description}
                </div>
              )}

              {/* Connectivity Test Box */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ping & Connection Diagnostics</span>
                  </span>
                  <button
                    onClick={() => handleTestConnection(viewingDevice.id)}
                    disabled={testingConnection}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                  >
                    {testingConnection ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3" />
                    )}
                    <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg text-xs border flex items-start space-x-2 ${
                      testResult.reachable
                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                        : 'bg-red-950/40 border-red-800 text-red-300'
                    }`}
                  >
                    {testResult.reachable ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold">{testResult.message}</div>
                      {testResult.latencyMs !== undefined && (
                        <div className="text-[11px] opacity-80 mt-0.5">
                          Round-trip Latency: {testResult.latencyMs} ms
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingDevice(null)}
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
