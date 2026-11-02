'use client';

import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Shield,
  Send,
  User,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface TicketComment {
  id: string;
  comment: string;
  isInternal: boolean;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  slaDueAt: string;
  isSlaBreached?: boolean;
  createdAt: string;
  subscriber?: {
    id: string;
    accountNumber: string;
    firstName: string;
    lastName: string;
    username: string;
  } | null;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  comments?: TicketComment[];
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create Ticket Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubject, setCreateSubject] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createCategory, setCreateCategory] = useState('TECHNICAL');
  const [createPriority, setCreatePriority] = useState('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Comment State
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, categoryFilter]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (search) params.append('search', search);

      const res = await apiClient.request(`/tickets?${params.toString()}`);
      const items = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : Array.isArray(res?.data) ? res.data : [];
      setTickets(items);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openTicketDetail(ticketId: string) {
    setLoadingDetail(true);
    try {
      const res = await apiClient.request(`/tickets/${ticketId}`);
      setSelectedTicket(res);
    } catch (err) {
      console.error('Error fetching ticket details:', err);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!createSubject.trim() || !createDesc.trim()) return;

    setIsSubmitting(true);
    try {
      await apiClient.request('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: createSubject,
          description: createDesc,
          category: createCategory,
          priority: createPriority,
        }),
      });
      setShowCreateModal(false);
      setCreateSubject('');
      setCreateDesc('');
      fetchTickets();
    } catch (err) {
      console.error('Failed to create ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;

    setIsSendingComment(true);
    try {
      await apiClient.request(`/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          comment: newComment,
          isInternal: isInternalComment,
        }),
      });
      setNewComment('');
      // Refresh detail
      openTicketDetail(selectedTicket.id);
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSendingComment(false);
    }
  }

  async function handleUpdateStatus(ticketId: string, status: string) {
    try {
      await apiClient.request(`/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (selectedTicket && selectedTicket.id === ticketId) {
        openTicketDetail(ticketId);
      }
      fetchTickets();
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  }

  const priorityColor = (p: string) => {
    switch (p) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'OPEN':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'WAITING_CUSTOMER':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'RESOLVED':
        return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      case 'CLOSED':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <AdminLayout
      title="Helpdesk & Support Ticketing"
      subtitle="Enterprise SLA tracking, ticket lifecycle management, and multi-tiered discussion threads"
    >
      <div className="space-y-6">
        {/* Page Top Action Bar */}
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={() => fetchTickets()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickets by subject, number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTickets()}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_CUSTOMER">Waiting Customer</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low (72h SLA)</option>
          <option value="MEDIUM">Medium (24h SLA)</option>
          <option value="HIGH">High (8h SLA)</option>
          <option value="CRITICAL">Critical (2h SLA)</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Categories</option>
          <option value="TECHNICAL">Technical</option>
          <option value="BILLING">Billing</option>
          <option value="PROVISIONING">Provisioning</option>
          <option value="GENERAL">General</option>
        </select>
      </div>

      {/* Tickets List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Ticket #</th>
                <th className="py-4 px-6">Subject</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Priority</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">SLA Due Date</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading support tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No tickets found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const isBreached =
                    t.slaDueAt && new Date() > new Date(t.slaDueAt) && t.status !== 'RESOLVED' && t.status !== 'CLOSED';
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                      onClick={() => openTicketDetail(t.id)}
                    >
                      <td className="py-4 px-6 font-mono font-medium text-blue-400">
                        {t.ticketNumber}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-white line-clamp-1">{t.subject}</div>
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {t.subscriber ? `${t.subscriber.firstName} ${t.subscriber.lastName} (${t.subscriber.username})` : 'System Ticket'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${priorityColor(t.priority)}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusColor(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{t.slaDueAt ? new Date(t.slaDueAt).toLocaleString() : 'N/A'}</span>
                        </div>
                        {isBreached && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 mt-1">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            SLA BREACHED
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTicketDetail(t.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-medium transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details & Discussion Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-blue-400 text-base">
                  {selectedTicket.ticketNumber}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusColor(selectedTicket.status)}`}>
                  {selectedTicket.status}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${priorityColor(selectedTicket.priority)}`}>
                  {selectedTicket.priority}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Subject & Description */}
              <div>
                <h2 className="text-lg font-bold text-white mb-2">{selectedTicket.subject}</h2>
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Status Update Quick Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-medium text-slate-400 mr-2">Quick Status:</span>
                {['IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedTicket.id, st)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                      selectedTicket.status === st
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Mark {st.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Discussion Thread */}
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Discussion Thread ({selectedTicket.comments?.length || 0})
                </h3>

                <div className="space-y-3">
                  {selectedTicket.comments?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No comments yet on this ticket.</p>
                  ) : (
                    selectedTicket.comments?.map((c) => (
                      <div
                        key={c.id}
                        className={`p-4 rounded-xl border text-sm ${
                          c.isInternal
                            ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-2">
                          <div className="flex items-center gap-2 font-semibold">
                            <User className="w-3.5 h-3.5" />
                            <span>
                              {c.user ? `${c.user.firstName} ${c.user.lastName}` : 'Support Agent'}
                            </span>
                            {c.isInternal && (
                              <span className="flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">
                                <Shield className="w-3 h-3" />
                                INTERNAL NOTE
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendComment} className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Write a response or internal note..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                      />
                      <span>Mark as Internal Note (hidden from customer)</span>
                    </label>
                    <button
                      type="submit"
                      disabled={isSendingComment || !newComment.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSendingComment ? 'Sending...' : 'Post Comment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-blue-400" />
                Open New Support Ticket
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fiber link down on Sector 4"
                  value={createSubject}
                  onChange={(e) => setCreateSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="TECHNICAL">Technical</option>
                    <option value="BILLING">Billing</option>
                    <option value="PROVISIONING">Provisioning</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="LOW">Low (72h SLA)</option>
                    <option value="MEDIUM">Medium (24h SLA)</option>
                    <option value="HIGH">High (8h SLA)</option>
                    <option value="CRITICAL">Critical (2h SLA)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Detailed Description</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the issue, symptoms, affected nodes..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition"
                >
                  {isSubmitting ? 'Creating...' : 'Submit Ticket'}
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
