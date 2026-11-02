'use client';

import React, { useState, useEffect } from 'react';
import {
  Webhook as WebhookIcon,
  Plus,
  RefreshCw,
  Trash2,
  Send,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Copy,
  Check,
  X,
  FileCode,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface Webhook {
  id: string;
  name: string;
  endpointUrl: string;
  maskedSecret: string;
  subscribedEvents: string[];
  isActive: boolean;
  eventsCount: number;
  createdAt: string;
}

interface WebhookEvent {
  id: string;
  eventType: string;
  responseCode: number;
  responseBody?: string;
  durationMs: number;
  isSuccess: boolean;
  deliveredAt: string;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    endpointUrl: '',
    subscribedEvents: ['subscriber.created', 'payment.success'],
  });
  const [createdWebhook, setCreatedWebhook] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Test Ping Modal / Output
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Delivery Events Logs Modal
  const [selectedWebhookForEvents, setSelectedWebhookForEvents] = useState<Webhook | null>(null);
  const [eventsLogs, setEventsLogs] = useState<WebhookEvent[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  async function fetchWebhooks() {
    setLoading(true);
    try {
      const res = await apiClient.request('/webhooks');
      setWebhooks(res || []);
    } catch (err) {
      console.error('Failed to load webhooks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterWebhook(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiClient.request('/webhooks', {
        method: 'POST',
        body: JSON.stringify(registerForm),
      });
      setCreatedWebhook(res);
      fetchWebhooks();
    } catch (err) {
      console.error('Failed to register webhook:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteWebhook(id: string) {
    if (!confirm('Are you sure you want to delete this developer webhook endpoint?')) return;
    try {
      await apiClient.request(`/webhooks/${id}`, { method: 'DELETE' });
      fetchWebhooks();
    } catch (err) {
      console.error('Failed to delete webhook:', err);
    }
  }

  async function handleTestPing(id: string) {
    setTestingWebhookId(id);
    setTestResult(null);
    try {
      const res = await apiClient.request(`/webhooks/${id}/test`, { method: 'POST' });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ error: err.message || 'Test ping delivery failed' });
    } finally {
      setTestingWebhookId(null);
    }
  }

  async function openEventsModal(wh: Webhook) {
    setSelectedWebhookForEvents(wh);
    setLoadingLogs(true);
    try {
      const res = await apiClient.request(`/webhooks/${wh.id}/events`);
      setEventsLogs(res || []);
    } catch (err) {
      console.error('Failed to fetch webhook events:', err);
    } finally {
      setLoadingLogs(false);
    }
  }

  const allAvailableEvents = [
    'subscriber.created',
    'subscriber.suspended',
    'invoice.created',
    'payment.success',
    'ticket.created',
    'session.disconnected',
  ];

  return (
    <AdminLayout
      title="Developer Webhooks"
      subtitle="Real-time outbound event subscriptions, HMAC-SHA256 timestamp signing, and delivery audit logs"
    >
      <div className="space-y-6">
        {/* Action Header */}
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={() => fetchWebhooks()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              setCreatedWebhook(null);
              setShowRegisterModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-md shadow-cyan-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Register Webhook
          </button>
        </div>

      {/* Test Result Banner */}
      {testResult && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <span className="font-bold text-white text-sm">
                Test Ping Delivery Result (HTTP {testResult.statusCode || 'Err'})
              </span>
            </div>
            <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 space-y-1">
            <div>Signature: <span className="text-cyan-400">{testResult.signature || 'N/A'}</span></div>
            <div>Timestamp: <span className="text-slate-400">{testResult.timestamp || 'N/A'}</span></div>
            <div>Duration: <span className="text-slate-400">{testResult.durationMs}ms</span></div>
            <div>Response: <span className="text-slate-300">{testResult.responsePreview || testResult.error}</span></div>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Name & Endpoint</th>
                <th className="py-4 px-6">Secret Key</th>
                <th className="py-4 px-6">Subscribed Events</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-500" />
                    Loading webhooks...
                  </td>
                </tr>
              ) : webhooks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No webhooks registered. Click &quot;Register Webhook&quot; to listen for ISP events.
                  </td>
                </tr>
              ) : (
                webhooks.map((wh) => (
                  <tr key={wh.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-white">{wh.name}</div>
                      <div className="font-mono text-xs text-cyan-400 mt-0.5">{wh.endpointUrl}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono text-xs text-slate-400">{wh.maskedSecret}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {wh.subscribedEvents?.map((ev) => (
                          <span
                            key={ev}
                            className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          wh.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        }`}
                      >
                        {wh.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleTestPing(wh.id)}
                        disabled={testingWebhookId === wh.id}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 text-xs font-semibold border border-cyan-500/30 transition"
                      >
                        {testingWebhookId === wh.id ? 'Sending...' : 'Test Ping'}
                      </button>
                      <button
                        onClick={() => openEventsModal(wh)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                      >
                        Logs ({wh.eventsCount})
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(wh.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Webhook Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <WebhookIcon className="w-5 h-5 text-cyan-400" />
                Register Developer Webhook
              </h2>
              <button
                onClick={() => {
                  setShowRegisterModal(false);
                  setCreatedWebhook(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdWebhook ? (
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-sm flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Webhook registered successfully! Save your signing secret now.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Signing Secret Key (Shown Only Once)
                  </label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-3 rounded-xl">
                    <span className="font-mono text-xs text-cyan-400 select-all flex-1 break-all">
                      {createdWebhook.secretKey}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdWebhook.secretKey);
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-400 mt-2">
                    NetOrbit uses HMAC-SHA256 signatures with this secret to sign outbound events in the x-netorbit-signature header.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => {
                      setShowRegisterModal(false);
                      setCreatedWebhook(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegisterWebhook} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Endpoint Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Accounting ERP Sync"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">HTTPS Endpoint URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://your-domain.com/api/webhooks/netorbit"
                    value={registerForm.endpointUrl}
                    onChange={(e) => setRegisterForm({ ...registerForm, endpointUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Subscribed Event Types</label>
                  <div className="grid grid-cols-2 gap-2">
                    {allAvailableEvents.map((ev) => {
                      const checked = registerForm.subscribedEvents.includes(ev);
                      return (
                        <label
                          key={ev}
                          className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRegisterForm({
                                  ...registerForm,
                                  subscribedEvents: [...registerForm.subscribedEvents, ev],
                                });
                              } else {
                                setRegisterForm({
                                  ...registerForm,
                                  subscribedEvents: registerForm.subscribedEvents.filter((item) => item !== ev),
                                });
                              }
                            }}
                            className="rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0"
                          />
                          <span className="font-mono text-[11px]">{ev}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold"
                  >
                    {isSubmitting ? 'Registering...' : 'Register Endpoint'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Events Log Drawer/Modal */}
      {selectedWebhookForEvents && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <h2 className="text-base font-bold text-white">Delivery History: {selectedWebhookForEvents.name}</h2>
                <p className="text-xs text-slate-400 font-mono">{selectedWebhookForEvents.endpointUrl}</p>
              </div>
              <button onClick={() => setSelectedWebhookForEvents(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {loadingLogs ? (
                <div className="py-8 text-center text-slate-500">Loading delivery attempts...</div>
              ) : eventsLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-500">No events delivered to this webhook yet.</div>
              ) : (
                eventsLogs.map((ev) => (
                  <div key={ev.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-400">{ev.eventType}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          HTTP {ev.responseCode}
                        </span>
                      </div>
                      <span className="text-slate-500">{new Date(ev.deliveredAt).toLocaleString()} ({ev.durationMs}ms)</span>
                    </div>
                    {ev.responseBody && (
                      <div className="font-mono text-slate-400 text-[11px] p-2 bg-slate-900 rounded border border-slate-800/60 overflow-x-auto">
                        {ev.responseBody}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
