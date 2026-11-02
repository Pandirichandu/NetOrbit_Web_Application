'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  RefreshCw,
  Send,
  Edit,
  CheckCircle,
  AlertTriangle,
  Clock,
  X,
  FileText,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface NotificationLog {
  id: string;
  recipient: string;
  channel: string;
  subject?: string;
  message: string;
  status: string;
  sentAt?: string | null;
  errorDetails?: string | null;
  createdAt: string;
}

interface NotificationTemplate {
  id: string;
  eventKey: string;
  channel: string;
  subject: string;
  bodyTemplate: string;
  isActive: boolean;
  updatedAt: string;
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'logs' | 'templates' | 'send'>('logs');
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);

  // Send form
  const [sendForm, setSendForm] = useState({
    recipient: '',
    channel: 'EMAIL',
    subject: '',
    message: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);

  // Edit template modal
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    setSendFeedback(null);
    try {
      if (activeTab === 'logs') {
        const res = await apiClient.request('/notifications');
        setLogs(res.data || res || []);
      } else if (activeTab === 'templates') {
        const res = await apiClient.request('/notifications/templates');
        setTemplates(res.data || res || []);
      }
    } catch (err) {
      console.error('Failed to load notifications data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault();
    setIsSending(true);
    setSendFeedback(null);
    try {
      const res = await apiClient.request('/notifications/send', {
        method: 'POST',
        body: JSON.stringify(sendForm),
      });
      setSendFeedback(`Notification queued successfully! Status: ${res.status}`);
      setSendForm({ recipient: '', channel: 'EMAIL', subject: '', message: '' });
    } catch (err: any) {
      setSendFeedback(`Failed to send notification: ${err.message || 'Error'}`);
    } finally {
      setIsSending(false);
    }
  }

  async function handleUpdateTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTemplate) return;

    setIsUpdatingTemplate(true);
    try {
      await apiClient.request(`/notifications/templates/${editingTemplate.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          subject: editingTemplate.subject,
          bodyTemplate: editingTemplate.bodyTemplate,
          isActive: editingTemplate.isActive,
        }),
      });
      setEditingTemplate(null);
      fetchData();
    } catch (err) {
      console.error('Failed to update template:', err);
    } finally {
      setIsUpdatingTemplate(false);
    }
  }

  const channelIcon = (ch: string) => {
    switch (ch) {
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-blue-400" />;
      case 'SMS':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'WHATSAPP':
        return <MessageSquare className="w-4 h-4 text-green-400" />;
      default:
        return <Bell className="w-4 h-4 text-purple-400" />;
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'SENT':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'FAILED':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
  };

  return (
    <AdminLayout
      title="Notifications Engine"
      subtitle="Multi-channel template management, dispatch logs, MailHog development SMTP, and in-app alerts"
    >
      <div className="space-y-6">
        {/* Action Header */}
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'logs'
              ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Dispatch History
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'templates'
              ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Notification Templates
        </button>
        <button
          onClick={() => setActiveTab('send')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'send'
              ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Send className="w-4 h-4" />
          Quick Dispatch
        </button>
      </div>

      {/* Tab 1: Dispatch History */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Channel</th>
                  <th className="py-4 px-6">Recipient</th>
                  <th className="py-4 px-6">Subject / Preview</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      Loading notification logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No notification dispatches recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {channelIcon(log.channel)}
                          <span className="text-xs font-medium text-slate-300">{log.channel}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-300">{log.recipient}</td>
                      <td className="py-4 px-6">
                        {log.subject && <div className="font-semibold text-white text-xs">{log.subject}</div>}
                        <div className="text-xs text-slate-400 line-clamp-1">{log.message}</div>
                        {log.errorDetails && (
                          <div className="text-[11px] text-red-400 mt-1">{log.errorDetails}</div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString() : 'Pending'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Notification Templates */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 py-12 text-center text-slate-500">Loading templates...</div>
          ) : (
            templates.map((tmpl) => (
              <div key={tmpl.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {channelIcon(tmpl.channel)}
                    <span className="font-mono text-xs font-bold text-purple-400">{tmpl.eventKey}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        tmpl.isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      }`}
                    >
                      {tmpl.isActive ? 'Active' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => setEditingTemplate(tmpl)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Subject</div>
                  <div className="text-sm font-medium text-white">{tmpl.subject}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Body Template</div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 whitespace-pre-wrap">
                    {tmpl.bodyTemplate}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Quick Dispatch */}
      {activeTab === 'send' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-purple-400" />
            Send Ad-Hoc Notification
          </h2>
          {sendFeedback && (
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800 text-purple-200 text-xs">
              {sendFeedback}
            </div>
          )}
          <form onSubmit={handleSendNotification} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Channel</label>
                <select
                  value={sendForm.channel}
                  onChange={(e) => setSendForm({ ...sendForm, channel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="EMAIL">Email (MailHog)</option>
                  <option value="IN_APP">In-App</option>
                  <option value="SMS">SMS Gateway</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Recipient</label>
                <input
                  type="text"
                  required
                  placeholder="email@example.com or phone"
                  value={sendForm.recipient}
                  onChange={(e) => setSendForm({ ...sendForm, recipient: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
              <input
                type="text"
                required
                placeholder="Notification Subject"
                value={sendForm.subject}
                onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Message Body</label>
              <textarea
                rows={4}
                required
                placeholder="Enter notification message..."
                value={sendForm.message}
                onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition"
            >
              {isSending ? 'Dispatching...' : 'Dispatch Notification'}
            </button>
          </form>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                Edit Template: {editingTemplate.eventKey}
              </h2>
              <button onClick={() => setEditingTemplate(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Template Content</label>
                <textarea
                  rows={6}
                  required
                  value={editingTemplate.bodyTemplate}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, bodyTemplate: e.target.value })}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Supported placeholders: {'{{name}}'}, {'{{username}}'}, {'{{packageName}}'}, {'{{amount}}'}, {'{{invoiceNumber}}'}, {'{{ticketNumber}}'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tmplActive"
                  checked={editingTemplate.isActive}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-0"
                />
                <label htmlFor="tmplActive" className="text-xs text-slate-300 select-none cursor-pointer">
                  Template is Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTemplate}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {isUpdatingTemplate ? 'Saving...' : 'Save Template'}
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
