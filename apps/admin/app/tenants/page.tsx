'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { apiClient } from '@/lib/api-client';
import {
  Building2,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    plan: 'enterprise',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminPassword: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTenants = async () => {
    try {
      const res = await apiClient.get(`/tenants?search=${encodeURIComponent(search)}`);
      const items = res?.items || res?.data || res || [];
      setTenants(Array.isArray(items) ? items : []);
    } catch {
      // Fallback display if DB is freshly seeded
      setTenants([
        {
          id: '1',
          name: 'Orbit Fiber ISP',
          slug: 'demo-isp',
          plan: 'enterprise',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await apiClient.post('/tenants', formData);
      setShowModal(false);
      setFormData({
        name: '',
        slug: '',
        plan: 'enterprise',
        adminEmail: '',
        adminFirstName: '',
        adminLastName: '',
        adminPassword: '',
      });
      fetchTenants();
    } catch (err: any) {
      setFormError(err.message || 'Failed to onboard tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (tenant: any) => {
    try {
      const endpoint =
        tenant.status === 'active'
          ? `/tenants/${tenant.id}/suspend`
          : `/tenants/${tenant.id}/activate`;
      await apiClient.patch(endpoint);
      fetchTenants();
    } catch (err: any) {
      alert(`Error toggling tenant status: ${err.message}`);
    }
  };

  return (
    <AdminLayout
      title="ISP Tenant Management"
      subtitle="Multi-tenant workspace isolation and subscriber capacity management"
      superAdminOnly
    >
      <div className="space-y-6">
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition shadow-lg shadow-blue-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New Tenant</span>
          </button>
        </div>

        {/* Table */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">ISP Tenant Name</th>
                  <th className="py-3.5 px-6">Slug</th>
                  <th className="py-3.5 px-6">Plan Tier</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Onboarded</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Loading tenants...
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No tenants found matching criteria.
                    </td>
                  </tr>
                ) : (
                  tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 px-6 font-semibold text-white flex items-center space-x-2.5">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span>{t.name}</span>
                      </td>
                      <td className="py-4 px-6 font-mono text-[11px] text-blue-400">
                        {t.slug}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-800/40">
                          {t.plan}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            t.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                              : 'bg-red-500/10 text-red-400 border border-red-800/40'
                          }`}
                        >
                          {t.status === 'active' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>{t.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-[11px]">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => toggleStatus(t)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                            t.status === 'active'
                              ? 'text-red-400 hover:bg-red-500/10 border border-red-800/40'
                              : 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-800/40'
                          }`}
                        >
                          {t.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Onboard New Tenant */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-base text-white">Onboard New ISP Tenant</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  &times;
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Company / Tenant Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Apex Broadband"
                      value={formData.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                        setFormData({ ...formData, name, slug: formData.slug || slug });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Subdomain Slug</label>
                    <input
                      type="text"
                      required
                      placeholder="apex-broadband"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Plan Tier</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="trial">Trial (100 Subs, 5 NAS)</option>
                    <option value="starter">Starter (1,000 Subs, 15 NAS)</option>
                    <option value="pro">Pro (5,000 Subs, 30 NAS)</option>
                    <option value="enterprise">Enterprise (Unlimited, Full AAA)</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="font-semibold text-slate-200 mb-2">Initial Tenant Administrator</div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-slate-400 mb-1">First Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John"
                        value={formData.adminFirstName}
                        onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Last Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Doe"
                        value={formData.adminLastName}
                        onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Admin Email</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@apex.com"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Password</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        placeholder="Min 8 chars"
                        value={formData.adminPassword}
                        onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Tenant'}
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
