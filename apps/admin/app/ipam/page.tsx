'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Database,
  Network,
  Cpu,
  Layers,
  Activity,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface IpPool {
  id: string;
  name: string;
  subnet: string;
  startIp: string;
  endIp: string;
  gateway?: string;
  dnsServers?: string;
  type: string;
  totalIps: number;
  allocatedIps: number;
  reservedIps: number;
  isActive: boolean;
  createdAt: string;
}

interface IpAllocation {
  id: string;
  ipAddress: string;
  macAddress?: string;
  status: string;
  allocatedToType: string;
  allocatedToId?: string;
  reservedReason?: string;
  allocatedAt: string;
}

export default function IpamPage() {
  const [pools, setPools] = useState<IpPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activePool, setActivePool] = useState<IpPool | null>(null);
  const [allocations, setAllocations] = useState<IpAllocation[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);

  // Pool form state
  const [name, setName] = useState('');
  const [subnet, setSubnet] = useState('192.168.100.0/24');
  const [startIp, setStartIp] = useState('192.168.100.10');
  const [endIp, setEndIp] = useState('192.168.100.250');
  const [gateway, setGateway] = useState('192.168.100.1');
  const [dnsServers, setDnsServers] = useState('8.8.8.8, 1.1.1.1');
  const [poolType, setPoolType] = useState('dynamic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Allocate IP form state
  const [specificIp, setSpecificIp] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [allocType, setAllocType] = useState('subscriber');
  const [reserveReason, setReserveReason] = useState('');

  useEffect(() => {
    fetchPools();
  }, [typeFilter]);

  async function fetchPools() {
    setLoading(true);
    try {
      let url = '/ipam/pools?limit=50';
      if (typeFilter) url += `&type=${typeFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await apiClient.get(url);
      setPools(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePool(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/ipam/pools', {
        name,
        subnet,
        startIp,
        endIp,
        gateway: gateway || undefined,
        dnsServers: dnsServers || undefined,
        type: poolType,
      });
      setShowCreateModal(false);
      resetPoolForm();
      fetchPools();
      alert('IP Pool successfully created!');
    } catch (err: any) {
      alert(err.message || 'Failed to create IP pool');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function openAllocations(pool: IpPool) {
    setActivePool(pool);
    setAllocLoading(true);
    try {
      const res = await apiClient.get(`/ipam/pools/${pool.id}/allocations`);
      setAllocations(res || []);
    } catch {
      setAllocations([]);
    } finally {
      setAllocLoading(false);
    }
  }

  async function handleAllocate(e: React.FormEvent) {
    e.preventDefault();
    if (!activePool) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(`/ipam/pools/${activePool.id}/allocate`, {
        ipAddress: specificIp || undefined,
        macAddress: macAddress || undefined,
        allocatedToType: allocType,
        status: 'allocated',
        reservedReason: reserveReason || undefined,
      });
      setShowAllocateModal(false);
      setSpecificIp('');
      setMacAddress('');
      setReserveReason('');
      openAllocations(activePool);
      fetchPools();
      alert('IP successfully allocated!');
    } catch (err: any) {
      alert(err.message || 'Allocation failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRelease(allocId: string) {
    if (!confirm('Release this IP back to the pool?')) return;
    try {
      await apiClient.post(`/ipam/allocations/${allocId}/release`, {});
      if (activePool) openAllocations(activePool);
      fetchPools();
    } catch (err: any) {
      alert(err.message || 'Failed to release IP');
    }
  }

  function resetPoolForm() {
    setName('');
    setSubnet('192.168.100.0/24');
    setStartIp('192.168.100.10');
    setEndIp('192.168.100.250');
    setGateway('192.168.100.1');
    setDnsServers('8.8.8.8, 1.1.1.1');
  }

  // Summary Metrics
  const totalCapacity = pools.reduce((acc, p) => acc + (p.totalIps || 0), 0);
  const totalAllocated = pools.reduce((acc, p) => acc + (p.allocatedIps || 0) + (p.reservedIps || 0), 0);
  const totalFree = Math.max(0, totalCapacity - totalAllocated);

  return (
    <AdminLayout
      title="IPAM & Subnets"
      subtitle="Subnet planning, CIDR verification, dynamic/static pool allocations, and IP utilization tracking"
    >
      <div className="space-y-6">
        {/* Action Header */}
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            id="create-ip-pool-btn"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Add IP Pool
          </button>
        </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Configured Pools</p>
            <p className="text-2xl font-bold text-white mt-1">{pools.length}</p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Server className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total IP Capacity</p>
            <p className="text-2xl font-bold text-white mt-1">{totalCapacity.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Assigned IPs</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{totalAllocated.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Available Free IPs</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{totalFree.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <Cpu className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search pool name or subnet CIDR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPools()}
            className="bg-transparent border-none text-white text-sm focus:outline-none w-full placeholder-slate-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none border-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Pool Types</option>
              <option value="dynamic" className="bg-slate-900">Dynamic</option>
              <option value="static" className="bg-slate-900">Static</option>
              <option value="pppoe" className="bg-slate-900">PPPoE</option>
              <option value="hotspot" className="bg-slate-900">Hotspot</option>
              <option value="cgnat" className="bg-slate-900">CGNAT</option>
            </select>
          </div>
          <button
            onClick={() => fetchPools()}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-300 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pools Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Pool Name</th>
                <th className="py-3.5 px-4">Subnet CIDR</th>
                <th className="py-3.5 px-4">Range (Start - End)</th>
                <th className="py-3.5 px-4">Gateway</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Utilization</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading IP pools...
                  </td>
                </tr>
              ) : pools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No IP pools configured yet. Click &quot;Add IP Pool&quot; to allocate address spaces.
                  </td>
                </tr>
              ) : (
                pools.map((p) => {
                  const used = (p.allocatedIps || 0) + (p.reservedIps || 0);
                  const pct = p.totalIps > 0 ? Math.round((used / p.totalIps) * 100) : 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <Server className="w-4 h-4 text-indigo-400" />
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-indigo-300">
                        {p.subnet}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {p.startIp} &rarr; {p.endIp}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {p.gateway || 'None'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {p.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>{used} / {p.totalIps}</span>
                            <span className="font-bold">{pct}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct > 85 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openAllocations(p)}
                          className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold transition"
                        >
                          Allocations
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

      {/* Add Pool Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Create IP Pool (IPAM)
            </h2>
            <form onSubmit={handleCreatePool} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Pool Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fiber Core Subnet"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Subnet CIDR</label>
                  <input
                    type="text"
                    value={subnet}
                    onChange={(e) => setSubnet(e.target.value)}
                    required
                    placeholder="192.168.100.0/24"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Pool Type</label>
                  <select
                    value={poolType}
                    onChange={(e) => setPoolType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="dynamic">Dynamic</option>
                    <option value="static">Static</option>
                    <option value="pppoe">PPPoE</option>
                    <option value="hotspot">Hotspot</option>
                    <option value="cgnat">CGNAT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Start IP</label>
                  <input
                    type="text"
                    value={startIp}
                    onChange={(e) => setStartIp(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">End IP</label>
                  <input
                    type="text"
                    value={endIp}
                    onChange={(e) => setEndIp(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Default Gateway (Optional)</label>
                  <input
                    type="text"
                    value={gateway}
                    onChange={(e) => setGateway(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">DNS Servers</label>
                  <input
                    type="text"
                    value={dnsServers}
                    onChange={(e) => setDnsServers(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
                >
                  {isSubmitting ? 'Creating...' : 'Save Pool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocations Drawer / Modal */}
      {activePool && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  Allocations for {activePool.name}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {activePool.subnet} ({activePool.startIp} &rarr; {activePool.endIp})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAllocateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Allocate IP
                </button>
                <button
                  onClick={() => setActivePool(null)}
                  className="p-1.5 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">MAC Address</th>
                    <th className="py-2.5 px-3">Target</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {allocLoading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                        Loading allocations...
                      </td>
                    </tr>
                  ) : allocations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                        No active allocations yet. All addresses in range are available.
                      </td>
                    </tr>
                  ) : (
                    allocations.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-bold text-white">{a.ipAddress}</td>
                        <td className="py-2 px-3 text-slate-400">{a.macAddress || 'N/A'}</td>
                        <td className="py-2 px-3 font-sans capitalize text-slate-300">
                          {a.allocatedToType}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              a.status === 'allocated'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : a.status === 'reserved'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {a.status !== 'released' && (
                            <button
                              onClick={() => handleRelease(a.id)}
                              className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-[10px] font-semibold transition"
                            >
                              Release
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
        </div>
      )}

      {/* Allocate IP Modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-md font-bold text-white">Allocate / Reserve IP Address</h2>
            <form onSubmit={handleAllocate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Specific IP (Optional - Leave blank to auto-allocate)
                </label>
                <input
                  type="text"
                  value={specificIp}
                  onChange={(e) => setSpecificIp(e.target.value)}
                  placeholder={`Range: ${activePool?.startIp} - ${activePool?.endIp}`}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Client MAC Address</label>
                <input
                  type="text"
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value)}
                  placeholder="00:11:22:33:44:55"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Allocation Type</label>
                <select
                  value={allocType}
                  onChange={(e) => setAllocType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="subscriber">Subscriber</option>
                  <option value="nas">NAS Device</option>
                  <option value="static_client">Static Client / Server</option>
                  <option value="reserved">Reserved Pool Block</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Reservation / Allocation Reason</label>
                <input
                  type="text"
                  value={reserveReason}
                  onChange={(e) => setReserveReason(e.target.value)}
                  placeholder="VIP Subscriber Router"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
                >
                  {isSubmitting ? 'Allocating...' : 'Confirm'}
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
