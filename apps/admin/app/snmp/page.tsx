'use client';

import React, { useState, useEffect } from 'react';
import {
  Network,
  Server,
  Activity,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Radio,
  Share2,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
  X,
  Clock,
  HardDrive,
  Trash2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface SnmpDevice {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  version: string;
  vendor: string;
  model: string;
  status: string;
  uptimeSeconds: number;
  sysName?: string;
  sysDescr?: string;
  sysLocation?: string;
  communityString?: string;
  pollingIntervalSeconds: number;
  interfacesCount?: number;
  interfaces?: NetworkInterface[];
  lastPolledAt?: string;
  createdAt: string;
}

interface NetworkInterface {
  id: string;
  deviceId: string;
  ifIndex: number;
  name: string;
  alias?: string;
  macAddress?: string;
  adminStatus: string;
  operStatus: string;
  speedBps: number;
  inOctets: number;
  outOctets: number;
  inErrors?: number;
  outErrors?: number;
}

interface TopologyData {
  totalDevices: number;
  totalLinks: number;
  nodes: {
    id: string;
    label: string;
    ipAddress: string;
    vendor: string;
    model: string;
    status: string;
    uptimeSeconds: number;
    interfacesCount: number;
  }[];
  edges: {
    id: string;
    source: string;
    sourceName: string;
    sourceInterface: string;
    target: string;
    targetName: string;
    targetInterface: string;
    speedGbps: string;
    linkType: string;
    status: string;
  }[];
}

export default function SnmpPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'topology' | 'interfaces'>('inventory');
  const [devices, setDevices] = useState<SnmpDevice[]>([]);
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pollingId, setPollingId] = useState<string | null>(null);

  // Discovery Sweep Modal
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [sweepCidr, setSweepCidr] = useState('10.200.1.0/24');
  const [sweepCommunity, setSweepCommunity] = useState('isp-secure-community-2026');
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<any | null>(null);

  // Register Device Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ipAddress: '',
    port: 161,
    version: 'v2c',
    communityString: 'public',
    vendor: 'MikroTik',
    model: 'CCR2004-16G-2S+',
    pollingIntervalSeconds: 60,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [devRes, topRes, ifRes] = await Promise.all([
        apiClient.get('/snmp/devices'),
        apiClient.get('/snmp/topology'),
        apiClient.get('/snmp/interfaces'),
      ]);
      setDevices(Array.isArray(devRes) ? devRes : []);
      setTopology(topRes || null);
      setInterfaces(Array.isArray(ifRes) ? ifRes : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch SNMP infrastructure data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePollDevice = async (id: string) => {
    setPollingId(id);
    try {
      await apiClient.post(`/snmp/devices/${id}/poll`);
      await loadData();
    } catch (err: any) {
      alert(`SNMP Poll error: ${err.message}`);
    } finally {
      setPollingId(null);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm('Are you sure you want to remove this device from monitoring?')) return;
    try {
      await apiClient.delete(`/snmp/devices/${id}`);
      await loadData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/snmp/devices', formData);
      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      alert(`Registration error: ${err.message}`);
    }
  };

  const handleRunDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSweeping(true);
    setSweepResult(null);
    try {
      const res = await apiClient.post('/snmp/discover', {
        subnetCidr: sweepCidr,
        communityString: sweepCommunity,
      });
      setSweepResult(res);
      await loadData();
    } catch (err: any) {
      alert(`Discovery sweep error: ${err.message}`);
    } finally {
      setSweeping(false);
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0m';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatTraffic = (bytes: number) => {
    if (!bytes) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb > 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const filteredDevices = devices.filter(
    (d) =>
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.ipAddress?.includes(search) ||
      d.vendor?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AdminLayout
      title="SNMP Discovery & Topology"
      subtitle="Verifiable device inventory, LLDP/CDP topology visualization, and automated metric sweeps"
    >
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
            <Network className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">SNMP Discovery & Network Topology</h1>
            <p className="text-sm text-slate-400">Verifiable device inventory, LLDP/CDP topology visualization, and automated metric sweeps</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDiscoverModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 rounded-xl border border-slate-700 font-medium transition-all text-sm"
          >
            <Radio className="w-4 h-4" />
            Discovery Sweep
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/25 font-medium transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Device
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'inventory'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Server className="w-4 h-4" />
          Device Inventory ({devices.length})
        </button>
        <button
          onClick={() => setActiveTab('topology')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'topology'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Share2 className="w-4 h-4" />
          Topology Map ({topology?.totalLinks || 0} Links)
        </button>
        <button
          onClick={() => setActiveTab('interfaces')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'interfaces'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Layers className="w-4 h-4" />
          Network Interfaces ({interfaces.length})
        </button>
      </div>

      {/* TAB 1: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by hostname, IP address, or vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Table */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading SNMP network devices...</div>
            ) : filteredDevices.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No SNMP network devices registered yet.</div>
            ) : (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Device</th>
                    <th className="py-3.5 px-4">IP Address</th>
                    <th className="py-3.5 px-4">Vendor & Model</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Uptime</th>
                    <th className="py-3.5 px-4">Interfaces</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDevices.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div className="flex items-center gap-2.5">
                          <Cpu className="w-4 h-4 text-indigo-400" />
                          <div>
                            <div>{d.name}</div>
                            <div className="text-xs text-slate-500">{d.sysName || 'SNMP v2c/v3 Agent'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-indigo-300">
                        {d.ipAddress}:{d.port}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700">
                          {d.vendor} {d.model}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            d.status === 'ONLINE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${d.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">{formatUptime(d.uptimeSeconds)}</td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-300">
                        {d.interfacesCount || (d.interfaces ? d.interfaces.length : 0)} ports
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePollDevice(d.id)}
                            disabled={pollingId === d.id}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg border border-slate-700 transition"
                            title="Execute immediate SNMP poll"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${pollingId === d.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleDeleteDevice(d.id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg border border-slate-700 transition"
                            title="Remove device"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TOPOLOGY MAP */}
      {activeTab === 'topology' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-indigo-400" />
              Discovered Topology Graph
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Relationships established via LLDP / CDP neighbor discovery. Nodes represent live infrastructure routers and switches.
            </p>

            {topology && topology.nodes.length > 0 ? (
              <div className="space-y-6">
                {/* Node Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topology.nodes.map((node) => (
                    <div
                      key={node.id}
                      className="p-5 bg-slate-800/50 border border-slate-700/60 rounded-xl hover:border-indigo-500/40 transition-all shadow-lg"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                            <Cpu className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-base">{node.label}</h4>
                            <div className="text-xs font-mono text-indigo-300">{node.ipAddress}</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded border border-emerald-500/20">
                          {node.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 space-y-1 mb-3">
                        <div>Hardware: <span className="text-slate-200">{node.vendor} {node.model}</span></div>
                        <div>Uptime: <span className="text-slate-200">{formatUptime(node.uptimeSeconds)}</span></div>
                        <div>Interfaces Discovered: <span className="text-indigo-400 font-semibold">{node.interfacesCount}</span></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Links */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Active Physical Links ({topology.edges.length})</h4>
                  <div className="space-y-2">
                    {topology.edges.map((edge) => (
                      <div
                        key={edge.id}
                        className="flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-white">{edge.sourceName}</span>
                          <span className="text-xs text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
                            {edge.sourceInterface}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-500" />
                          <span className="font-semibold text-white">{edge.targetName}</span>
                          <span className="text-xs text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
                            {edge.targetInterface}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-300 text-xs font-bold rounded border border-purple-500/20">
                            {edge.speedGbps}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded">
                            {edge.linkType}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">No topology nodes or links found.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INTERFACES */}
      {activeTab === 'interfaces' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Interface</th>
                <th className="py-3.5 px-4">Alias / Description</th>
                <th className="py-3.5 px-4">MAC Address</th>
                <th className="py-3.5 px-4">Admin / Oper Status</th>
                <th className="py-3.5 px-4">Speed</th>
                <th className="py-3.5 px-4">In Traffic</th>
                <th className="py-3.5 px-4">Out Traffic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {interfaces.map((iface) => (
                <tr key={iface.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-mono font-medium text-white">{iface.name}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-400">{iface.alias || '-'}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{iface.macAddress || '-'}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded border border-emerald-500/20">
                      {iface.adminStatus} / {iface.operStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-purple-300 font-semibold">
                    {(iface.speedBps / 1000000000).toFixed(0)} Gbps
                  </td>
                  <td className="py-3.5 px-4 text-xs text-emerald-400 font-mono">{formatTraffic(iface.inOctets)}</td>
                  <td className="py-3.5 px-4 text-xs text-blue-400 font-mono">{formatTraffic(iface.outOctets)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DISCOVERY SWEEP MODAL */}
      {showDiscoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-indigo-400" />
                Network Subnet Discovery Sweep
              </h3>
              <button onClick={() => setShowDiscoverModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRunDiscovery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Subnet CIDR (Anti-SSRF Validated /24-/30)</label>
                <input
                  type="text"
                  value={sweepCidr}
                  onChange={(e) => setSweepCidr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  placeholder="10.200.1.0/24"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">SNMP Community String</label>
                <input
                  type="password"
                  value={sweepCommunity}
                  onChange={(e) => setSweepCommunity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  placeholder="Community secret"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscoverModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sweeping}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
                >
                  {sweeping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                  {sweeping ? 'Scanning Subnet...' : 'Execute Sweep'}
                </button>
              </div>
            </form>

            {sweepResult && (
              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 text-xs space-y-2">
                <div className="text-emerald-400 font-bold">Sweep Complete!</div>
                <div>Subnet: {sweepResult.subnetScanned}</div>
                <div>Addresses Scanned: {sweepResult.devicesScanned}</div>
                <div>Responding Devices: <span className="text-white font-bold">{sweepResult.responsiveCount}</span></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD DEVICE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Register SNMP Device
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDevice} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Hostname / Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    placeholder="Core-Router-01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">IP Address</label>
                  <input
                    type="text"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    placeholder="10.200.1.1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Vendor</label>
                  <select
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option value="MikroTik">MikroTik RouterOS</option>
                    <option value="Cisco">Cisco Systems</option>
                    <option value="VyOS">VyOS Software</option>
                    <option value="Generic">Generic SNMP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Community String</label>
                  <input
                    type="password"
                    value={formData.communityString}
                    onChange={(e) => setFormData({ ...formData, communityString: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    placeholder="Encrypted at rest"
                  />
                </div>
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold"
                >
                  Register Device
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
