'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/admin-layout';
import { apiClient } from '@/lib/api-client';
import {
  Activity,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Wifi,
  Download,
  Upload,
  Clock,
  LogOut,
  ShieldAlert,
} from 'lucide-react';

export default function RadiusSessionsPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [disconnectingSession, setDisconnectingSession] = useState<any | null>(null);
  const [disconnectReason, setDisconnectReason] = useState('Admin Disconnect via Web Portal');
  const [submittingDisconnect, setSubmittingDisconnect] = useState(false);

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      let query = `?page=1&limit=50`;
      if (search) {
        query += `&username=${encodeURIComponent(search)}`;
      }

      const endpoint = activeTab === 'history' ? '/radius/accounting' : '/radius/sessions';
      const res = await apiClient.get(`${endpoint}${query}`);
      const items = res?.data || res?.items || res || [];
      setSessions(Array.isArray(items) ? items : []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [activeTab, search]);

  const handleDisconnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disconnectingSession) return;

    try {
      setSubmittingDisconnect(true);
      const res = await apiClient.post(`/radius/sessions/${disconnectingSession.id}/disconnect`, {
        reason: disconnectReason,
      });

      showToast('success', res.message || `Session disconnected (RFC 3576 PoD transmitted)`);
      setDisconnectingSession(null);
      fetchSessions();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to disconnect session');
    } finally {
      setSubmittingDisconnect(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const activeSessionsCount = sessions.filter((s) => (s.statusType || s.acctStatusType) !== 'Stop').length;

  return (
    <AdminLayout
      title="Active Sessions & Accounting"
      subtitle="RFC 2866 interim tracking, bandwidth utilization & RFC 3576 Disconnect-Request (PoD)"
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
        {/* Navigation Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
          {/* Segmented Control */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'active'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Active Sessions ({activeSessionsCount})</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping ml-1" />
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Accounting History</span>
            </button>
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by username or session ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition w-64"
              />
            </div>

            <button
              onClick={() => fetchSessions()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href="/radius"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition border border-slate-700"
            >
              Back to RADIUS
            </Link>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Subscriber / Username</th>
                  <th className="py-3.5 px-4 font-semibold">Framed IP</th>
                  <th className="py-3.5 px-4 font-semibold">NAS / Gateway</th>
                  <th className="py-3.5 px-4 font-semibold">Session ID</th>
                  <th className="py-3.5 px-4 font-semibold">Duration</th>
                  <th className="py-3.5 px-4 font-semibold">Bandwidth (Down / Up)</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  {activeTab === 'active' && (
                    <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                        <span>Loading sessions...</span>
                      </div>
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Activity className="w-8 h-8 text-slate-500 mx-auto" />
                        <div className="font-medium text-white text-sm">
                          {activeTab === 'active' ? 'No Active Sessions' : 'No Accounting Records'}
                        </div>
                        <p className="text-xs text-slate-400">
                          {activeTab === 'active'
                            ? 'No subscriber is currently connected or transmitting traffic.'
                            : 'Historical accounting records will appear as sessions terminate.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition group">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center space-x-2">
                          <Wifi className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="font-mono text-cyan-300">{s.username}</span>
                        </div>
                        {s.callingStationId && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            MAC: {s.callingStationId}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-white">
                        {s.framedIpAddress || 'Dynamic'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-mono text-slate-300">{s.nasIpAddress}</div>
                        {s.nasIdentifier && (
                          <div className="text-[11px] text-slate-500 font-mono">{s.nasIdentifier}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-[140px] truncate" title={s.acctSessionId}>
                        {s.acctSessionId}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-200">
                        {formatDuration(s.acctSessionTime)}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="text-cyan-300 flex items-center space-x-0.5">
                            <Download className="w-3 h-3 text-cyan-400" />
                            <span>{formatBytes(s.acctInputOctets)}</span>
                          </span>
                          <span className="text-purple-300 flex items-center space-x-0.5">
                            <Upload className="w-3 h-3 text-purple-400" />
                            <span>{formatBytes(s.acctOutputOctets)}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const status = s.statusType || s.acctStatusType;
                          const isOnline = status !== 'Stop';
                          return (
                            <>
                              <span
                                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  isOnline
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                                  }`}
                                />
                                <span>{isOnline ? 'Online' : 'Stopped'}</span>
                              </span>
                              {(s.acctTerminateCause || s.terminateCause) && (
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {s.acctTerminateCause || s.terminateCause}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      {activeTab === 'active' && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setDisconnectingSession(s)}
                            className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition"
                            title="Disconnect Session (RFC 3576)"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Disconnect</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DISCONNECT CONFIRMATION MODAL (RFC 3576) */}
      {disconnectingSession && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-base">Terminate Active Session</h3>
              </div>
              <button
                onClick={() => setDisconnectingSession(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDisconnect} className="p-6 space-y-4">
              <p className="text-xs text-slate-300">
                Are you sure you want to terminate this active subscriber session? An RFC 3576
                Packet of Disconnect (PoD) will be transmitted to the gateway router.
              </p>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Username: </span>
                  <span className="text-cyan-300 font-bold">{disconnectingSession.username}</span>
                </div>
                <div>
                  <span className="text-slate-400">Session ID: </span>
                  <span className="text-slate-300">{disconnectingSession.acctSessionId}</span>
                </div>
                <div>
                  <span className="text-slate-400">NAS IP: </span>
                  <span className="text-slate-300">{disconnectingSession.nasIpAddress}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Termination Reason
                </label>
                <input
                  type="text"
                  required
                  value={disconnectReason}
                  onChange={(e) => setDisconnectReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDisconnectingSession(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDisconnect}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-red-900/30 flex items-center space-x-1.5"
                >
                  {submittingDisconnect && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Disconnect</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
