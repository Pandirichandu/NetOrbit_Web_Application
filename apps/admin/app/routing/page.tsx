'use client';

import React, { useState, useEffect } from 'react';
import {
  Route,
  Activity,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Terminal,
  FileCode,
  X,
  Clock,
  Trash2,
  Check,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface BgpPeer {
  id: string;
  name: string;
  description?: string;
  localAsn: number;
  remoteAsn: number;
  peerIp: string;
  status: string;
  prefixesReceived: number;
  prefixesAdvertised: number;
  uptimeSeconds: number;
  isActive: boolean;
  createdAt: string;
}

interface OspfProcess {
  id: string;
  processId: number;
  routerId: string;
  areaId: string;
  authType: string;
  status: string;
  interfacesCount: number;
  neighbors?: {
    id: string;
    neighborId: string;
    ipAddress: string;
    interfaceName: string;
    state: string;
    priority: number;
    deadTimeSeconds: number;
  }[];
}

interface RoutingRevision {
  id: string;
  deviceId: string;
  protocol: string;
  rawConfig: string;
  appliedDiff?: string;
  deployedBy: string;
  deployedAt: string;
  rollbackTargetId?: string;
  status: string;
}

export default function RoutingPage() {
  const [activeTab, setActiveTab] = useState<'bgp' | 'ospf' | 'deploy'>('bgp');
  const [bgpPeers, setBgpPeers] = useState<BgpPeer[]>([]);
  const [ospfProcesses, setOspfProcesses] = useState<OspfProcess[]>([]);
  const [revisions, setRevisions] = useState<RoutingRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deploy / Validator form state
  const [vendor, setVendor] = useState<'MIKROTIK_ROUTEROS' | 'CISCO_IOS_XE' | 'GENERIC_VYOS'>('MIKROTIK_ROUTEROS');
  const [protocol, setProtocol] = useState<'BGP' | 'OSPF'>('BGP');
  const [configCommands, setConfigCommands] = useState(
    '/routing bgp connection add name=Transit-AS174 remote.address=198.51.100.1 as=174 connect=yes listen=yes',
  );
  const [confirmHighImpact, setConfirmHighImpact] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any | null>(null);
  const [deployResult, setDeployResult] = useState<any | null>(null);
  const [validating, setValidating] = useState(false);
  const [deploying, setDeploying] = useState(false);

  // Add BGP Peer modal
  const [showAddBgp, setShowAddBgp] = useState(false);
  const [bgpForm, setBgpForm] = useState({
    name: '',
    description: '',
    localAsn: 64512,
    remoteAsn: 174,
    peerIp: '',
    md5Secret: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bgpRes, ospfRes, revRes] = await Promise.all([
        apiClient.get('/routing/bgp/peers'),
        apiClient.get('/routing/ospf/processes'),
        apiClient.get('/routing/config/revisions'),
      ]);
      setBgpPeers(Array.isArray(bgpRes) ? bgpRes : []);
      setOspfProcesses(Array.isArray(ospfRes) ? ospfRes : []);
      setRevisions(Array.isArray(revRes) ? revRes : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch routing configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleValidateConfig = async () => {
    setValidating(true);
    setDryRunResult(null);
    try {
      const res = await apiClient.post('/routing/config/validate', {
        vendor,
        protocol,
        commands: configCommands,
      });
      setDryRunResult(res);
    } catch (err: any) {
      alert(`Syntax error: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  const handleDeployConfig = async () => {
    if (!confirmHighImpact) {
      alert('High-impact operations require explicit safety confirmation.');
      return;
    }
    setDeploying(true);
    setDeployResult(null);
    try {
      const res = await apiClient.post('/routing/config/deploy', {
        vendor,
        protocol,
        commands: configCommands,
        confirmHighImpact: true,
      });
      setDeployResult(res);
      await loadData();
    } catch (err: any) {
      alert(`Deployment failed: ${err.message}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleRollback = async (revisionId: string) => {
    if (!confirm('Rollback will revert routing rules to this historical snapshot. Continue?')) return;
    try {
      await apiClient.post('/routing/config/rollback', {
        revisionId,
        confirmHighImpact: true,
      });
      alert('Configuration successfully rolled back!');
      await loadData();
    } catch (err: any) {
      alert(`Rollback error: ${err.message}`);
    }
  };

  const handleCreateBgp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/routing/bgp/peers', bgpForm);
      setShowAddBgp(false);
      await loadData();
    } catch (err: any) {
      alert(`Failed to add BGP peer: ${err.message}`);
    }
  };

  const handleDeleteBgp = async (id: string) => {
    if (!confirm('Remove BGP peer?')) return;
    try {
      await apiClient.delete(`/routing/bgp/peers/${id}`);
      await loadData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  return (
    <AdminLayout
      title="BGP & OSPF Dynamic Routing"
      subtitle="Carrier-grade dynamic routing management with vendor adapters, safe dry-runs, and instant rollback"
    >
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20 text-white">
            <Route className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">BGP & OSPF Routing Engine</h1>
            <p className="text-sm text-slate-400">Carrier-grade dynamic routing management with vendor adapters, safe dry-runs, and instant rollback</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddBgp(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-500/25 font-medium transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Add BGP Peer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('bgp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'bgp'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Activity className="w-4 h-4" />
          BGP Peers ({bgpPeers.length})
        </button>
        <button
          onClick={() => setActiveTab('ospf')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'ospf'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Cpu className="w-4 h-4" />
          OSPF Backbone ({ospfProcesses.length})
        </button>
        <button
          onClick={() => setActiveTab('deploy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'deploy'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Safe Config Deploy & Rollback ({revisions.length} Revisions)
        </button>
      </div>

      {/* TAB 1: BGP PEERS */}
      {activeTab === 'bgp' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading BGP peering sessions...</div>
          ) : bgpPeers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No BGP peers configured.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Peer Name</th>
                  <th className="py-3.5 px-4">Local ASN / Remote ASN</th>
                  <th className="py-3.5 px-4">Neighbor IP</th>
                  <th className="py-3.5 px-4">Session State</th>
                  <th className="py-3.5 px-4">Prefixes Recv / Adv</th>
                  <th className="py-3.5 px-4">Uptime</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bgpPeers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div>{p.name}</div>
                      <div className="text-xs text-slate-500">{p.description || 'Dynamic BGP Session'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      AS{p.localAsn} &rarr; <span className="text-emerald-400 font-bold">AS{p.remoteAsn}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">{p.peerIp}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold">
                      <span className="text-emerald-400">{p.prefixesReceived.toLocaleString()}</span> /{' '}
                      <span className="text-slate-400">{p.prefixesAdvertised}</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {Math.floor(p.uptimeSeconds / 86400)}d {Math.floor((p.uptimeSeconds % 86400) / 3600)}h
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteBgp(p.id)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg border border-slate-700 transition"
                        title="Delete peer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: OSPF PROCESSES */}
      {activeTab === 'ospf' && (
        <div className="space-y-6">
          {ospfProcesses.map((proc) => (
            <div key={proc.id} className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl backdrop-blur-xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">OSPF Process #{proc.processId}</h3>
                    <div className="text-xs text-slate-400">Router-ID: <span className="font-mono text-emerald-400">{proc.routerId}</span> &bull; Backbone Area: <span className="font-mono text-purple-300">{proc.areaId}</span></div>
                  </div>
                </div>

                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">
                  {proc.status}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Adjacent OSPF Neighbors ({proc.neighbors?.length || 0})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {proc.neighbors?.map((n) => (
                    <div key={n.id} className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl flex justify-between items-center text-sm">
                      <div>
                        <div className="font-mono text-white font-bold">{n.neighborId}</div>
                        <div className="text-xs text-slate-400">IP: {n.ipAddress} on <span className="text-indigo-400">{n.interfaceName}</span></div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded border border-emerald-500/20">
                          {n.state} (Dead: {n.deadTimeSeconds}s)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SAFE DEPLOYMENT & ROLLBACK */}
      {activeTab === 'deploy' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: CLI & Validation Workbench */}
          <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl backdrop-blur-xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              Routing Configuration Workbench
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Target Vendor Adapter</label>
                <select
                  value={vendor}
                  onChange={(e: any) => setVendor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value="MIKROTIK_ROUTEROS">MikroTik RouterOS v7</option>
                  <option value="CISCO_IOS_XE">Cisco IOS-XE / IOS</option>
                  <option value="GENERIC_VYOS">VyOS / Linux FRRouting</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Routing Protocol</label>
                <select
                  value={protocol}
                  onChange={(e: any) => setProtocol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value="BGP">BGP (Border Gateway Protocol)</option>
                  <option value="OSPF">OSPF (Open Shortest Path First)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">CLI Configuration Payload</label>
              <textarea
                rows={6}
                value={configCommands}
                onChange={(e) => setConfigCommands(e.target.value)}
                className="w-full p-3 bg-slate-950 font-mono text-xs text-emerald-300 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Safety Confirmation Checkbox */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-amber-300">High-Impact Routing Mutation Protection</div>
                <div className="text-xs text-slate-400 mb-2">
                  Applying unverified routing tables can disrupt carrier transit. Local validation and explicit operator acknowledgment are mandatory.
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-white font-semibold">
                  <input
                    type="checkbox"
                    checked={confirmHighImpact}
                    onChange={(e) => setConfirmHighImpact(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  I explicitly confirm and authorize this routing configuration deployment
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleValidateConfig}
                disabled={validating}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm border border-slate-700 flex items-center justify-center gap-2"
              >
                {validating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-indigo-400" />}
                Dry-Run Validate
              </button>
              <button
                type="button"
                onClick={handleDeployConfig}
                disabled={deploying || !confirmHighImpact}
                className={`flex-1 py-2.5 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 ${
                  confirmHighImpact
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {deploying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Deploy to Hardware
              </button>
            </div>

            {dryRunResult && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                <div className="font-bold text-emerald-400">Local Syntax Validation Passed: {dryRunResult.isValid ? 'YES' : 'NO'}</div>
                {dryRunResult.warnings?.length > 0 && (
                  <div className="text-amber-400">Warnings: {dryRunResult.warnings.join(', ')}</div>
                )}
              </div>
            )}

            {deployResult && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs space-y-1">
                <div className="font-bold text-emerald-300">Deployment Acknowledged by Device!</div>
                <div>Revision ID: <span className="font-mono text-white">{deployResult.revisionId}</span></div>
                <div>Routing Adjacency Established: <span className="text-emerald-400 font-bold">{deployResult.routingAdjacencyEstablished ? 'YES' : 'NO'}</span></div>
              </div>
            )}
          </div>

          {/* Right: Revision History & Rollback */}
          <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl backdrop-blur-xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-purple-400" />
              Revision History & Rollback Targets
            </h3>
            <p className="text-xs text-slate-400">
              Audit log of previous configuration commits with cryptographic diffs and instant one-click rollback.
            </p>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {revisions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No configuration revisions recorded.</div>
              ) : (
                revisions.map((rev) => (
                  <div key={rev.id} className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                          <span>Rev #{rev.id.substring(0, 8)}</span>
                          <span className="px-2 py-0.2 bg-purple-500/10 text-purple-300 rounded text-[10px] border border-purple-500/20">
                            {rev.protocol}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">By {rev.deployedBy} &bull; {new Date(rev.deployedAt).toLocaleString()}</div>
                      </div>
                      <button
                        onClick={() => handleRollback(rev.id)}
                        className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-xs font-semibold border border-purple-500/30 flex items-center gap-1.5 transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Rollback
                      </button>
                    </div>

                    <pre className="p-2.5 bg-slate-950 rounded-lg text-[11px] font-mono text-emerald-400/90 overflow-x-auto whitespace-pre-wrap border border-slate-900">
                      {rev.appliedDiff || rev.rawConfig}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD BGP PEER MODAL */}
      {showAddBgp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Configure BGP Peering Session
              </h3>
              <button onClick={() => setShowAddBgp(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBgp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Session Name</label>
                <input
                  type="text"
                  value={bgpForm.name}
                  onChange={(e) => setBgpForm({ ...bgpForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  placeholder="Transit-Upstream-AS174"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Local ASN</label>
                  <input
                    type="number"
                    value={bgpForm.localAsn}
                    onChange={(e) => setBgpForm({ ...bgpForm, localAsn: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Remote ASN</label>
                  <input
                    type="number"
                    value={bgpForm.remoteAsn}
                    onChange={(e) => setBgpForm({ ...bgpForm, remoteAsn: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Neighbor IP</label>
                  <input
                    type="text"
                    value={bgpForm.peerIp}
                    onChange={(e) => setBgpForm({ ...bgpForm, peerIp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    placeholder="198.51.100.1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">MD5 Secret (Encrypted)</label>
                  <input
                    type="password"
                    value={bgpForm.md5Secret}
                    onChange={(e) => setBgpForm({ ...bgpForm, md5Secret: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    placeholder="Optional MD5 auth"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBgp(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold"
                >
                  Save BGP Peer
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
