'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { apiClient } from '@/lib/api-client';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Clock,
  Shield,
  Laptop,
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    try {
      const query = new URLSearchParams({
        limit: '25',
        ...(search ? { search } : {}),
        ...(resourceFilter ? { resourceType: resourceFilter } : {}),
      }).toString();

      const res = await apiClient.get(`/audit-logs?${query}`);
      const list = res?.data || res?.items || res || [];
      setLogs(Array.isArray(list) ? list : []);
    } catch {
      // Demo logs
      setLogs([
        {
          id: '1',
          action: 'auth.login',
          resourceType: 'auth',
          resourceId: 'u-admin-1',
          userEmail: 'admin@netorbit.local',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          metadata: { mfaVerified: false, authStrategy: 'jwt-rs256' },
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          action: 'tenant.create',
          resourceType: 'tenant',
          resourceId: 't-demo-isp',
          userEmail: 'admin@netorbit.local',
          ipAddress: '127.0.0.1',
          userAgent: 'NetOrbit Engine',
          metadata: { name: 'Orbit Fiber ISP', plan: 'enterprise', slug: 'demo-isp' },
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, resourceFilter]);

  return (
    <AdminLayout
      title="Audit Trail Logs"
      subtitle="Immutable event history capturing all administrative and operational changes"
      requiredPermission="audit:read"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search audit actions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Resource Types</option>
              <option value="auth">Authentication</option>
              <option value="tenant">Tenants</option>
              <option value="user">Users</option>
              <option value="role">Roles</option>
              <option value="subscriber">Subscribers</option>
              <option value="billing">Billing</option>
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">Action</th>
                  <th className="py-3.5 px-6">Resource</th>
                  <th className="py-3.5 px-6">Actor</th>
                  <th className="py-3.5 px-6">IP Address</th>
                  <th className="py-3.5 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Loading audit events...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No audit events recorded.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-6 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[11px] text-blue-400 font-semibold">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                          {log.resourceType}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-medium text-white truncate max-w-[180px]">
                        {log.userEmail || log.userId || 'system'}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px]">
                        {log.ipAddress || '—'}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                          title="View metadata"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Log Details */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-sm text-white">Audit Event Details</h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 rounded-xl">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Action</span>
                    <span className="font-mono text-blue-400 font-semibold">{selectedLog.action}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Resource</span>
                    <span className="text-slate-300">{selectedLog.resourceType} ({selectedLog.resourceId || '—'})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Actor</span>
                    <span className="text-slate-300">{selectedLog.userEmail || selectedLog.userId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">IP / Client</span>
                    <span className="text-slate-300 font-mono text-[11px]">{selectedLog.ipAddress || '—'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Payload Metadata:</span>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-56">
                    {JSON.stringify(selectedLog.metadata || selectedLog.details || {}, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
