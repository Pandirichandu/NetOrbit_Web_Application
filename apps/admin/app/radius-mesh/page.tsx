'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Wifi,
  Activity,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Radio,
  Server,
  Zap,
  ShieldCheck,
  Send,
  Sliders,
  Trash2,
  Clock,
  X,
  Gauge,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface RadiusMeshNode {
  id: string;
  nodeId: string;
  name: string;
  region: string;
  ipAddress: string;
  authPort: number;
  acctPort: number;
  coaPort: number;
  status: string;
  role: string;
  priority: number;
  latencyMs: number;
  loadFactor: number;
  activeSessionsCount: number;
  lastHeartbeatAt?: string;
  createdAt: string;
}

interface MeshEvent {
  id: string;
  nodeId: string;
  eventType: string;
  sessionId?: string;
  username?: string;
  details?: string;
  timestamp: string;
  node?: {
    name: string;
    region: string;
  };
}

export default function RadiusMeshPage() {
  const [nodes, setNodes] = useState<RadiusMeshNode[]>([]);
  const [events, setEvents] = useState<MeshEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Proxy Test Console State
  const [testType, setTestType] = useState<'auth' | 'acct' | 'coa'>('auth');
  const [testUsername, setTestUsername] = useState('demo_subscriber_01');
  const [testNasIp, setTestNasIp] = useState('10.200.0.1');
  const [testRegion, setTestRegion] = useState('us-east');
  const [routingPolicy, setRoutingPolicy] = useState('GEOGRAPHIC_AFFINITY');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);

  // Register Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [nodeForm, setNodeForm] = useState({
    nodeId: '',
    name: '',
    region: 'us-east',
    ipAddress: '',
    sharedSecret: '',
    role: 'PRIMARY',
    priority: 10,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nodeRes, eventRes] = await Promise.all([
        apiClient.get('/radius-mesh/nodes'),
        apiClient.get('/radius-mesh/events'),
      ]);
      setNodes(Array.isArray(nodeRes) ? nodeRes : []);
      setEvents(Array.isArray(eventRes) ? eventRes : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch RADIUS mesh data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      let res;
      if (testType === 'auth') {
        res = await apiClient.post('/radius-mesh/proxy/auth', {
          username: testUsername,
          nasIp: testNasIp,
          region: testRegion,
          routingPolicy,
        });
      } else if (testType === 'acct') {
        res = await apiClient.post('/radius-mesh/proxy/acct', {
          sessionId: `SESS-${Date.now()}`,
          acctStatusType: 'Interim-Update',
          username: testUsername,
          nasIp: testNasIp,
          region: testRegion,
          inputOctets: 104857600,
          outputOctets: 524288000,
        });
      } else {
        res = await apiClient.post('/radius-mesh/proxy/coa', {
          sessionId: `SESS-COA-${Date.now()}`,
          username: testUsername,
          targetRegion: testRegion,
          disconnect: true,
        });
      }
      setTestResult(res);
      await loadData();
    } catch (err: any) {
      alert(`Proxy request failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleRegisterNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/radius-mesh/nodes', nodeForm);
      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  const handleDeleteNode = async (id: string) => {
    if (!confirm('Decommission this regional RADIUS node?')) return;
    try {
      await apiClient.delete(`/radius-mesh/nodes/${id}`);
      await loadData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  return (
    <AdminLayout
      title="RADIUS Geo-Distributed Mesh"
      subtitle="Multi-region AAA proxy forwarding with automated failover, accounting deduplication, and edge CoA dispatch"
    >
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
            <Globe className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Geo-Distributed RADIUS Proxy Mesh</h1>
            <p className="text-sm text-slate-400">Multi-region AAA proxy forwarding with automated failover, accounting deduplication, and edge CoA dispatch</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-500/25 font-medium transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Register Mesh Node
          </button>
        </div>
      </div>

      {/* Regional Nodes Grid */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Server className="w-5 h-5 text-cyan-400" />
          Active Regional Mesh Nodes ({nodes.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {nodes.map((n) => (
            <div
              key={n.id}
              className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl backdrop-blur-xl space-y-4 hover:border-cyan-500/40 transition-all shadow-lg"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-cyan-400 font-mono">{n.region}</div>
                  <h4 className="font-bold text-white text-base">{n.name}</h4>
                  <div className="text-xs font-mono text-slate-400">{n.ipAddress}:{n.authPort}</div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded border border-emerald-500/20">
                  {n.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800 text-center">
                <div>
                  <div className="text-[11px] text-slate-400">Latency</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">{n.latencyMs}ms</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Load</div>
                  <div className="text-sm font-bold text-purple-300 font-mono">{(n.loadFactor * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Sessions</div>
                  <div className="text-sm font-bold text-cyan-300 font-mono">{n.activeSessionsCount}</div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-semibold">
                  Role: {n.role} (Pri: {n.priority})
                </span>
                <button
                  onClick={() => handleDeleteNode(n.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition"
                  title="Decommission node"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Mesh Proxy Testing & Event Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Console */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl backdrop-blur-xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            Distributed Mesh Request Simulator
          </h3>
          <p className="text-xs text-slate-400">
            Verify regional request routing, failover mechanisms, deduplication, and CoA edge dispatch.
          </p>

          <div className="flex gap-2 border-b border-slate-800 pb-3">
            {(['auth', 'acct', 'coa'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTestType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                  testType === t ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'auth' ? 'Auth Proxy' : t === 'acct' ? 'Accounting Dedup' : 'CoA Dispatch'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Subscriber Username</label>
              <input
                type="text"
                value={testUsername}
                onChange={(e) => setTestUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">NAS IP Address</label>
              <input
                type="text"
                value={testNasIp}
                onChange={(e) => setTestNasIp(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Preferred Region</label>
              <select
                value={testRegion}
                onChange={(e) => setTestRegion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              >
                <option value="us-east">US East</option>
                <option value="us-west">US West</option>
                <option value="eu-central">EU Central</option>
                <option value="ap-southeast">AP Southeast (Simulate Offline)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Routing Strategy</label>
              <select
                value={routingPolicy}
                onChange={(e) => setRoutingPolicy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              >
                <option value="GEOGRAPHIC_AFFINITY">Geographic Affinity</option>
                <option value="LOWEST_LATENCY">Lowest Latency</option>
                <option value="PRIORITY">Priority Score</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleRunTest}
            disabled={testing}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
          >
            {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Execute Proxy Request
          </button>

          {testResult && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1.5 font-mono">
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Response Received: {testResult.status || 'OK'}
              </div>
              <div>Target Node: <span className="text-cyan-400">{testResult.forwardedToNodeId || testResult.routedViaNodeId}</span></div>
              <div>Region: <span className="text-white">{testResult.targetRegion}</span></div>
              {testResult.failoverOccurred && (
                <div className="text-amber-400">Failover Engaged: {testResult.failoverReason}</div>
              )}
              {testResult.isDuplicate && (
                <div className="text-amber-400 font-bold">Packet Deduplicated (Idempotent Drop)</div>
              )}
            </div>
          )}
        </div>

        {/* Live Event Stream */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl backdrop-blur-xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Distributed Mesh Forwarding Events
          </h3>
          <p className="text-xs text-slate-400">
            Audit stream of cross-node authentication delegations, accounting syncs, and failover redirects.
          </p>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {events.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">No mesh events recorded yet.</div>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-[10px] font-bold border border-cyan-500/20">
                        {ev.eventType}
                      </span>
                      <span>User: {ev.username || 'System'}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Node: {ev.node?.name || ev.nodeId}</div>
                  </div>
                  <div className="text-[11px] text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* REGISTER NODE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Register Regional RADIUS Node
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterNode} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Node Identifier</label>
                  <input
                    type="text"
                    value={nodeForm.nodeId}
                    onChange={(e) => setNodeForm({ ...nodeForm, nodeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    placeholder="us-east-proxy-01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={nodeForm.name}
                    onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    placeholder="US East Gateway"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Geographic Region</label>
                  <input
                    type="text"
                    value={nodeForm.region}
                    onChange={(e) => setNodeForm({ ...nodeForm, region: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    placeholder="us-east"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Management IP Address</label>
                  <input
                    type="text"
                    value={nodeForm.ipAddress}
                    onChange={(e) => setNodeForm({ ...nodeForm, ipAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    placeholder="198.51.100.25"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
                  <select
                    value={nodeForm.role}
                    onChange={(e) => setNodeForm({ ...nodeForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option value="PRIMARY">PRIMARY</option>
                    <option value="SECONDARY">SECONDARY</option>
                    <option value="EDGE_PROXY">EDGE_PROXY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Priority (1-100)</label>
                  <input
                    type="number"
                    value={nodeForm.priority}
                    onChange={(e) => setNodeForm({ ...nodeForm, priority: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Shared Mesh Secret</label>
                <input
                  type="password"
                  value={nodeForm.sharedSecret}
                  onChange={(e) => setNodeForm({ ...nodeForm, sharedSecret: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  placeholder="Encrypted at rest with AES-256-GCM"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold"
                >
                  Register Node
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
