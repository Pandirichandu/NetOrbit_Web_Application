'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Play,
  RefreshCw,
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  ToggleLeft,
  ToggleRight,
  Shield,
  Activity,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  triggerEvent: string;
  actionType: string;
  actionPayload?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
}

interface AutomationExecution {
  id: string;
  ruleId?: string;
  triggerEvent: string;
  executedAt: string;
  affectedCount: number;
  status: string;
  details?: Record<string, any>;
  rule?: {
    name: string;
  };
}

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual sweep state
  const [isRunningSweep, setIsRunningSweep] = useState(false);
  const [sweepResult, setSweepResult] = useState<string | null>(null);

  // New Rule Modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    triggerEvent: 'EXPIRY_REACHED',
    actionType: 'SUSPEND_SUBSCRIBER',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAutomationData();
  }, []);

  async function fetchAutomationData() {
    setLoading(true);
    try {
      const res = await apiClient.request('/automation/rules');
      setRules(res.rules || []);
      setExecutions(res.executions || []);
    } catch (err) {
      console.error('Failed to load automation rules:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleRule(id: string) {
    try {
      await apiClient.request(`/automation/rules/${id}/toggle`, {
        method: 'PATCH',
      });
      fetchAutomationData();
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  }

  async function handleRunExpirySweep() {
    setIsRunningSweep(true);
    setSweepResult(null);
    try {
      const res = await apiClient.request('/automation/sweep/expiry', {
        method: 'POST',
      });
      setSweepResult(`Expiry Sweep complete: ${res.affectedSubscribers} subscribers processed. Sessions terminated: ${res.disconnectedSessions}`);
      fetchAutomationData();
    } catch (err: any) {
      setSweepResult(`Sweep error: ${err.message || 'Execution failed'}`);
    } finally {
      setIsRunningSweep(false);
    }
  }

  async function handleRunOverdueSweep() {
    setIsRunningSweep(true);
    setSweepResult(null);
    try {
      const res = await apiClient.request('/automation/sweep/overdue', {
        method: 'POST',
      });
      setSweepResult(`Overdue Sweep complete: ${res.overdueInvoicesMarked} invoices updated, ${res.remindersSent} notifications triggered.`);
      fetchAutomationData();
    } catch (err: any) {
      setSweepResult(`Sweep error: ${err.message || 'Execution failed'}`);
    } finally {
      setIsRunningSweep(false);
    }
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.request('/automation/rules', {
        method: 'POST',
        body: JSON.stringify(ruleForm),
      });
      setShowRuleModal(false);
      setRuleForm({
        name: '',
        description: '',
        triggerEvent: 'EXPIRY_REACHED',
        actionType: 'SUSPEND_SUBSCRIBER',
      });
      fetchAutomationData();
    } catch (err) {
      console.error('Failed to create rule:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminLayout
      title="Automation Engine"
      subtitle="Automated plan expiry enforcement, RADIUS CoA disconnects, and dunning overdue sweepers"
    >
      <div className="space-y-6">
        {/* Action Header */}
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={() => fetchAutomationData()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowRuleModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold shadow-md shadow-amber-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Create Rule
          </button>
        </div>

      {/* Sweep Action Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400" />
          On-Demand Background Sweepers
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Execute scheduled automation sweeps immediately. Expiry sweep checks expired accounts, updates statuses, and executes RFC 3576 RADIUS CoA session disconnects.
        </p>

        {sweepResult && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-200 text-xs flex items-center justify-between">
            <span>{sweepResult}</span>
            <button onClick={() => setSweepResult(null)} className="text-amber-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleRunExpirySweep}
            disabled={isRunningSweep}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition"
          >
            <Play className="w-3.5 h-3.5" />
            Run Plan Expiry Sweep & RADIUS CoA
          </button>
          <button
            onClick={handleRunOverdueSweep}
            disabled={isRunningSweep}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition"
          >
            <Play className="w-3.5 h-3.5" />
            Run Overdue Invoices Sweep
          </button>
        </div>
      </div>

      {/* Active Rules Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">Configured Automation Rules ({rules.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 py-12 text-center text-slate-500">Loading automation rules...</div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-base">{rule.name}</div>
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold transition"
                  >
                    {rule.isActive ? (
                      <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <ToggleRight className="w-4 h-4" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                        <ToggleLeft className="w-4 h-4" /> Disabled
                      </span>
                    )}
                  </button>
                </div>

                {rule.description && (
                  <p className="text-xs text-slate-400 leading-relaxed">{rule.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider block text-[10px] font-semibold mb-1">
                      Trigger Event
                    </span>
                    <span className="font-mono bg-slate-950 px-2 py-1 rounded text-amber-400 border border-slate-800">
                      {rule.triggerEvent}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider block text-[10px] font-semibold mb-1">
                      Action Type
                    </span>
                    <span className="font-mono bg-slate-950 px-2 py-1 rounded text-blue-400 border border-slate-800">
                      {rule.actionType}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Execution Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Automation Execution History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Trigger</th>
                <th className="py-4 px-6">Execution Time</th>
                <th className="py-4 px-6">Affected Records</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No executions recorded yet. Run a manual sweep to generate an execution log.
                  </td>
                </tr>
              ) : (
                executions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-6 font-mono text-xs text-amber-400">{ex.triggerEvent}</td>
                    <td className="py-4 px-6 text-xs text-slate-300">
                      {new Date(ex.executedAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 font-semibold text-white">{ex.affectedCount}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          ex.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}
                      >
                        {ex.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                      {ex.details ? JSON.stringify(ex.details) : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Define Automation Rule
              </h2>
              <button onClick={() => setShowRuleModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 80% Quota Exhaustion Warning"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Trigger Event</label>
                <select
                  value={ruleForm.triggerEvent}
                  onChange={(e) => setRuleForm({ ...ruleForm, triggerEvent: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="EXPIRY_REACHED">EXPIRY_REACHED</option>
                  <option value="INVOICE_OVERDUE">INVOICE_OVERDUE</option>
                  <option value="DATA_QUOTA_80_PERCENT">DATA_QUOTA_80_PERCENT</option>
                  <option value="PAYMENT_SUCCESS">PAYMENT_SUCCESS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Action Type</label>
                <select
                  value={ruleForm.actionType}
                  onChange={(e) => setRuleForm({ ...ruleForm, actionType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="SUSPEND_SUBSCRIBER">SUSPEND_SUBSCRIBER</option>
                  <option value="SEND_NOTIFICATION">SEND_NOTIFICATION</option>
                  <option value="DISCONNECT_SESSION_COA">DISCONNECT_SESSION_COA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe when and how this rule triggers..."
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                >
                  Save Automation Rule
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
