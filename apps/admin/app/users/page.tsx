'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { apiClient } from '@/lib/api-client';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  Mail,
  AlertCircle,
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [inviteData, setInviteData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    roleIds: [] as string[],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get(`/users?search=${encodeURIComponent(search)}`);
      const items = res?.items || res?.data || res || [];
      setUsers(Array.isArray(items) ? items : []);
    } catch {
      // Demo data fallback
      setUsers([
        {
          id: '1',
          email: 'admin@netorbit.local',
          firstName: 'System',
          lastName: 'SuperAdmin',
          status: 'active',
          isSuperAdmin: true,
          roles: [{ name: 'Super Administrator', slug: 'super_administrator' }],
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          email: 'tenant@demo-isp.com',
          firstName: 'Arthur',
          lastName: 'Dent',
          status: 'active',
          isSuperAdmin: false,
          roles: [{ name: 'Tenant Administrator', slug: 'tenant_administrator' }],
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await apiClient.get('/roles');
      const list = Array.isArray(res) ? res : res?.data || [];
      setRoles(list);
      if (list.length > 0 && inviteData.roleIds.length === 0) {
        setInviteData((prev) => ({ ...prev, roleIds: [list[0].id] }));
      }
    } catch {
      // Roles fallback
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [search]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteData.roleIds.length === 0) {
      setFormError('Please select at least one role');
      return;
    }
    setFormError(null);
    setSubmitting(true);

    try {
      await apiClient.post('/users/invite', inviteData);
      setShowModal(false);
      setInviteData({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        roleIds: roles.length > 0 ? [roles[0].id] : [],
      });
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to invite staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (user: any) => {
    try {
      const endpoint =
        user.status === 'active'
          ? `/users/${user.id}/deactivate`
          : `/users/${user.id}/reactivate`;
      await apiClient.patch(endpoint);
      fetchUsers();
    } catch (err: any) {
      alert(`Error toggling user: ${err.message}`);
    }
  };

  return (
    <AdminLayout
      title="User & Staff Management"
      subtitle="Configure internal operators, network engineers, and executive roles"
      requiredPermission="users:read"
    >
      <div className="space-y-6">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition shadow-lg shadow-blue-900/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Staff Member</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">User</th>
                  <th className="py-3.5 px-6">Email</th>
                  <th className="py-3.5 px-6">Assigned Roles</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Joined</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 px-6 font-semibold text-white flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400">
                          {u.firstName?.[0] || 'U'}
                        </div>
                        <span>
                          {u.firstName} {u.lastName}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">{u.email}</td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1">
                          {u.isSuperAdmin && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-800/40">
                              Super Admin
                            </span>
                          )}
                          {u.roles?.map((r: any) => (
                            <span
                              key={r.slug || r.id}
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-800/40"
                            >
                              {r.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            u.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                              : 'bg-red-500/10 text-red-400 border border-red-800/40'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>{u.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {!u.isSuperAdmin && (
                          <button
                            onClick={() => toggleUserStatus(u)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                              u.status === 'active'
                                ? 'text-red-400 hover:bg-red-500/10 border border-red-800/40'
                                : 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-800/40'
                            }`}
                          >
                            {u.status === 'active' ? 'Deactivate' : 'Reactivate'}
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

        {/* Modal: Invite Staff */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-base text-white">Invite Staff Member</h3>
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

              <form onSubmit={handleInvite} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane"
                      value={inviteData.firstName}
                      onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Doe"
                      value={inviteData.lastName}
                      onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    placeholder="jane.doe@isp.com"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone (Optional)</label>
                  <input
                    type="tel"
                    placeholder="+1 555-0199"
                    value={inviteData.phone}
                    onChange={(e) => setInviteData({ ...inviteData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Assigned Role</label>
                  <select
                    value={inviteData.roleIds[0] || ''}
                    onChange={(e) => setInviteData({ ...inviteData, roleIds: [e.target.value] })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
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
                    {submitting ? 'Inviting...' : 'Send Invitation'}
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
