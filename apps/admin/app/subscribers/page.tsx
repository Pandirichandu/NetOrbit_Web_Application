'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  UserCheck,
  UserPlus,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  Layers,
  Download,
  Upload,
  Phone,
  Mail,
  MapPin,
  Shield,
  Wifi,
  Package,
  X,
  AlertCircle,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export default function SubscribersPage() {
  const { user } = useAuth();
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [packageFilter, setPackageFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<any | null>(null);
  const [viewingSubscriber, setViewingSubscriber] = useState<any | null>(null);
  const [changingPackageSub, setChangingPackageSub] = useState<any | null>(null);
  const [newPackageId, setNewPackageId] = useState('');

  // Form State
  const initialFormData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    companyName: '',
    nationalId: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    packageId: '',
    username: '',
    password: '',
    ipAssignmentType: 'dynamic',
    staticIp: '',
    macAddress: '',
    autoRenew: true,
    createPortalUser: true,
    notes: '',
    tenantId: '',
  };
  const [formData, setFormData] = useState(initialFormData);
  const [formTab, setFormTab] = useState<'profile' | 'address' | 'package'>('profile');
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
      const res = await apiClient.get('/packages?limit=100');
      const items = res?.data || res?.items || res || [];
      setPackages(Array.isArray(items) ? items : []);
    } catch {
      // Ignore
    }
  };

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      let query = `?page=1&limit=50`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) query += `&status=${encodeURIComponent(statusFilter)}`;
      if (packageFilter) query += `&packageId=${encodeURIComponent(packageFilter)}`;

      const res = await apiClient.get(`/subscribers${query}`);
      const items = res?.data || res?.items || res || [];
      setSubscribers(Array.isArray(items) ? items : []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch subscribers');
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
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [search, statusFilter, packageFilter]);

  // Stats calculation
  const totalSubscribers = subscribers.length;
  const activeCount = subscribers.filter((s) => s.status === 'active').length;
  const suspendedCount = subscribers.filter((s) => s.status === 'suspended').length;
  const pendingCount = subscribers.filter((s) => s.status === 'pending').length;

  const handleOpenCreate = () => {
    setEditingSubscriber(null);
    setFormData({
      ...initialFormData,
      tenantId: user?.tenantId || selectedTenantId || (tenants[0]?.id ?? ''),
    });
    setFormTab('profile');
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (sub: any) => {
    setEditingSubscriber(sub);
    setFormData({
      firstName: sub.firstName,
      lastName: sub.lastName,
      email: sub.email,
      phone: sub.phone,
      alternatePhone: sub.alternatePhone || '',
      companyName: sub.companyName || '',
      nationalId: sub.nationalId || '',
      addressLine1: sub.addressLine1,
      addressLine2: sub.addressLine2 || '',
      city: sub.city,
      state: sub.state,
      postalCode: sub.postalCode,
      country: sub.country || 'US',
      packageId: sub.packageId || '',
      username: sub.username,
      password: '',
      ipAssignmentType: sub.ipAssignmentType || 'dynamic',
      staticIp: sub.staticIp || '',
      macAddress: sub.macAddress || '',
      autoRenew: sub.autoRenew ?? true,
      createPortalUser: false,
      notes: sub.notes || '',
      tenantId: sub.tenantId || '',
    });
    setFormTab('profile');
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
      tenantId: editingSubscriber ? undefined : resolvedTenantId,
      packageId: formData.packageId || undefined,
      password: formData.password || undefined,
    };

    try {
      if (editingSubscriber) {
        await apiClient.put(`/subscribers/${editingSubscriber.id}`, payload);
        showToast('success', `Subscriber '${formData.firstName} ${formData.lastName}' updated successfully`);
        setEditingSubscriber(null);
      } else {
        await apiClient.post('/subscribers', payload);
        showToast('success', `Subscriber '${formData.firstName} ${formData.lastName}' registered successfully`);
        setShowCreateModal(false);
      }
      fetchSubscribers();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (sub: any, newStatus: string) => {
    try {
      await apiClient.patch(`/subscribers/${sub.id}/status`, {
        status: newStatus,
        reason: `Status changed to ${newStatus} via Admin Console`,
      });
      showToast('success', `Subscriber status set to '${newStatus}'`);
      fetchSubscribers();
      if (viewingSubscriber && viewingSubscriber.id === sub.id) {
        setViewingSubscriber({ ...viewingSubscriber, status: newStatus });
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update status');
    }
  };

  const handleChangePackage = async () => {
    if (!changingPackageSub || !newPackageId) return;
    try {
      await apiClient.patch(`/subscribers/${changingPackageSub.id}/package`, {
        packageId: newPackageId,
      });
      showToast('success', `Assigned package updated for subscriber`);
      setChangingPackageSub(null);
      fetchSubscribers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to change package');
    }
  };

  const handleDelete = async (sub: any) => {
    if (!confirm(`Are you sure you want to terminate and remove subscriber '${sub.firstName} ${sub.lastName}'?`)) return;
    try {
      await apiClient.delete(`/subscribers/${sub.id}`);
      showToast('success', `Subscriber removed successfully`);
      fetchSubscribers();
      if (viewingSubscriber?.id === sub.id) setViewingSubscriber(null);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete subscriber');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Active</span>
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Suspended</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            <span>Pending</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>Expired</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 capitalize">
            {status}
          </span>
        );
    }
  };

  return (
    <AdminLayout
      title="Subscribers"
      subtitle="Manage broadband customers, packages, credentials, and lifecycle"
      requiredPermission="subscribers:read"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Subscribers</h1>
                <p className="text-sm text-slate-400">Manage broadband customers, packages, credentials, and lifecycle</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-blue-900/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Subscriber</span>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl backdrop-blur-sm">
            <span className="text-xs font-semibold uppercase text-slate-500 block">Total Subscribers</span>
            <span className="text-2xl font-bold text-white mt-1 block">{totalSubscribers}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl backdrop-blur-sm">
            <span className="text-xs font-semibold uppercase text-emerald-400 block">Active Connections</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">{activeCount}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl backdrop-blur-sm">
            <span className="text-xs font-semibold uppercase text-amber-400 block">Suspended</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">{suspendedCount}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl backdrop-blur-sm">
            <span className="text-xs font-semibold uppercase text-blue-400 block">Pending Activation</span>
            <span className="text-2xl font-bold text-blue-400 mt-1 block">{pendingCount}</span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, account #, email, phone, or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>

            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Packages</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} (${Number(pkg.price).toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subscribers Table */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Account / Subscriber</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Assigned Plan</th>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Expires</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                      <p>Loading subscribers...</p>
                    </td>
                  </tr>
                ) : subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <UserCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      <p className="text-base font-medium text-slate-400">No subscribers found</p>
                      <p className="text-xs text-slate-500 mt-1">Register a new subscriber to begin provisioning.</p>
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-white">
                              {sub.firstName} {sub.lastName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800/60">
                              {sub.accountNumber}
                            </span>
                          </div>
                          {sub.companyName && (
                            <span className="text-xs text-slate-400 block">{sub.companyName}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5 text-xs">
                          <span className="text-slate-300 flex items-center">
                            <Mail className="w-3 h-3 mr-1 text-slate-500" />
                            {sub.email}
                          </span>
                          <span className="text-slate-400 flex items-center">
                            <Phone className="w-3 h-3 mr-1 text-slate-500" />
                            {sub.phone}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {sub.package ? (
                          <div>
                            <span className="font-medium text-white block">{sub.package.name}</span>
                            <span className="text-xs text-emerald-400">
                              {sub.package.downloadSpeedMbps}M / {sub.package.uploadSpeedMbps}M
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">No plan assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {sub.username}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {sub.expiryDate ? new Date(sub.expiryDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setViewingSubscriber(sub)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            title="View Details"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setChangingPackageSub(sub);
                              const tenantPkgs = packages.filter((p) => !sub.tenantId || p.tenantId === sub.tenantId);
                              setNewPackageId(tenantPkgs[0]?.id || sub.packageId || '');
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                            title="Change Package"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(sub)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                            title="Edit Subscriber"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {sub.status === 'active' ? (
                            <button
                              onClick={() => handleStatusChange(sub, 'suspended')}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                              title="Suspend Subscriber"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(sub, 'active')}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                              title="Activate Subscriber"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(sub)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                            title="Terminate Subscriber"
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

        {/* Create / Edit Subscriber Modal */}
        {(showCreateModal || editingSubscriber) && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-white text-lg">
                    {editingSubscriber
                      ? `Edit Subscriber: ${editingSubscriber.firstName} ${editingSubscriber.lastName}`
                      : 'Register New Subscriber'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingSubscriber(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step / Tab navigation */}
              <div className="flex border-b border-slate-800 bg-slate-950/30 px-6">
                <button
                  type="button"
                  onClick={() => setFormTab('profile')}
                  className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                    formTab === 'profile'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  1. Profile & Contact
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('address')}
                  className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                    formTab === 'address'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  2. Installation Address
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('package')}
                  className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                    formTab === 'package'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  3. Plan & Credentials
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-sm flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Tab 1: Profile & Contact */}
                {formTab === 'profile' && (
                  <div className="space-y-4">
                    {user?.isSuperAdmin && !editingSubscriber && (
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
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">First Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Last Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Primary Phone *</label>
                        <input
                          type="text"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Company / Organization</label>
                        <input
                          type="text"
                          placeholder="Optional"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">National ID / KYC Number</label>
                        <input
                          type="text"
                          placeholder="Optional"
                          value={formData.nationalId}
                          onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setFormTab('address')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition flex items-center space-x-1"
                      >
                        <span>Next: Installation Address</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 2: Address */}
                {formTab === 'address' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 742 Evergreen Terrace"
                        value={formData.addressLine1}
                        onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">State / Province *</label>
                        <input
                          type="text"
                          required
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Postal Code *</label>
                        <input
                          type="text"
                          required
                          value={formData.postalCode}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setFormTab('profile')}
                        className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormTab('package')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition flex items-center space-x-1"
                      >
                        <span>Next: Plan & Credentials</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 3: Package & Auth */}
                {formTab === 'package' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Assigned ISP Package</label>
                      <select
                        value={formData.packageId}
                        onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select Package...</option>
                        {packages
                          .filter((p) => !formData.tenantId || p.tenantId === formData.tenantId)
                          .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} - ${Number(p.price).toFixed(2)}/mo ({p.downloadSpeedMbps}M / {p.uploadSpeedMbps}M)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Subscriber Username *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. john_broadband"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                          {editingSubscriber ? 'New Password (leave blank to keep)' : 'Initial Password'}
                        </label>
                        <input
                          type="password"
                          placeholder="Min 6 characters"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">IP Assignment</label>
                        <select
                          value={formData.ipAssignmentType}
                          onChange={(e) => setFormData({ ...formData, ipAssignmentType: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="dynamic">Dynamic</option>
                          <option value="static">Static IP</option>
                          <option value="pppoe">PPPoE</option>
                          <option value="dhcp">DHCP Reservation</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Static IP</label>
                        <input
                          type="text"
                          placeholder="e.g. 192.168.1.10"
                          value={formData.staticIp}
                          onChange={(e) => setFormData({ ...formData, staticIp: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">MAC Address</label>
                        <input
                          type="text"
                          placeholder="00:1A:2B:3C:4D:5E"
                          value={formData.macAddress}
                          onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 pt-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.autoRenew}
                          onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                          className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                        />
                        <span className="text-sm text-slate-300">Auto-Renew Subscription</span>
                      </label>

                      {!editingSubscriber && (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.createPortalUser}
                            onChange={(e) => setFormData({ ...formData, createPortalUser: e.target.checked })}
                            className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                          />
                          <span className="text-sm text-slate-300">Create Customer Portal Login</span>
                        </label>
                      )}
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setFormTab('address')}
                        className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition flex items-center space-x-2"
                      >
                        {submitting && (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        )}
                        <span>{editingSubscriber ? 'Update Subscriber' : 'Register Subscriber'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Change Package Modal */}
        {changingPackageSub && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <h3 className="font-semibold text-white text-base">Change Package Plan</h3>
                <button onClick={() => setChangingPackageSub(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-400">
                  Select a new ISP service package for subscriber{' '}
                  <span className="text-white font-medium">
                    {changingPackageSub.firstName} {changingPackageSub.lastName}
                  </span>
                  .
                </p>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">New Package</label>
                  <select
                    value={newPackageId}
                    onChange={(e) => setNewPackageId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {packages
                      .filter((p) => !changingPackageSub.tenantId || p.tenantId === changingPackageSub.tenantId)
                      .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - ${Number(p.price).toFixed(2)}/mo ({p.downloadSpeedMbps}M / {p.uploadSpeedMbps}M)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setChangingPackageSub(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleChangePackage}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition"
                  >
                    Confirm Change
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Subscriber Modal */}
        {viewingSubscriber && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                    {viewingSubscriber.firstName[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base">
                      {viewingSubscriber.firstName} {viewingSubscriber.lastName}
                    </h3>
                    <span className="text-xs font-mono text-slate-400">{viewingSubscriber.accountNumber}</span>
                  </div>
                </div>
                <button onClick={() => setViewingSubscriber(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-slate-400 text-xs uppercase font-medium">Subscription Status</span>
                  {getStatusBadge(viewingSubscriber.status)}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 block uppercase">Email</span>
                    <span className="font-medium text-white">{viewingSubscriber.email}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block uppercase">Phone</span>
                    <span className="font-medium text-white">{viewingSubscriber.phone}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider block">
                    Active Internet Plan
                  </span>
                  {viewingSubscriber.package ? (
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white text-base">{viewingSubscriber.package.name}</span>
                        <span className="font-semibold text-emerald-400">
                          ${Number(viewingSubscriber.package.price).toFixed(2)}/mo
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-slate-400">
                        <span className="flex items-center text-emerald-400">
                          <Download className="w-3.5 h-3.5 mr-1" />
                          {viewingSubscriber.package.downloadSpeedMbps} Mbps Down
                        </span>
                        <span className="flex items-center text-blue-400">
                          <Upload className="w-3.5 h-3.5 mr-1" />
                          {viewingSubscriber.package.uploadSpeedMbps} Mbps Up
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic text-xs">No active plan assigned</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-500 block mb-1">Broadband Username</span>
                    <span className="font-mono text-sm text-white">{viewingSubscriber.username}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-500 block mb-1">IP Assignment</span>
                    <span className="capitalize text-sm text-white">{viewingSubscriber.ipAssignmentType || 'Dynamic'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-500 block uppercase">Installation Address</span>
                  <p className="text-slate-300 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-start">
                    <MapPin className="w-4 h-4 text-slate-500 mr-2 shrink-0 mt-0.5" />
                    <span>
                      {viewingSubscriber.addressLine1}
                      {viewingSubscriber.addressLine2 && `, ${viewingSubscriber.addressLine2}`}, {viewingSubscriber.city},{' '}
                      {viewingSubscriber.state} {viewingSubscriber.postalCode}, {viewingSubscriber.country}
                    </span>
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setViewingSubscriber(null)}
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
