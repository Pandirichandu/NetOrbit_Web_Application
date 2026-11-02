'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Plus,
  RefreshCw,
  CheckCircle,
  Cpu,
  Layers,
  Network,
  Lock,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface DhcpScope {
  id: string;
  name: string;
  interfaceName: string;
  leaseTimeSeconds: number;
  domainName: string;
  dnsServers: string;
  gateway?: string;
  subnetMask: string;
  status: string;
  createdAt: string;
}

interface DhcpLease {
  id: string;
  ipAddress: string;
  macAddress: string;
  hostname?: string;
  isStatic: boolean;
  status: string;
  startsAt: string;
  expiresAt: string;
  scope?: {
    name: string;
  };
}

export default function DhcpPage() {
  const [scopes, setScopes] = useState<DhcpScope[]>([]);
  const [leases, setLeases] = useState<DhcpLease[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [showStaticModal, setShowStaticModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scope form state
  const [scopeName, setScopeName] = useState('');
  const [interfaceName, setInterfaceName] = useState('ether2-lan');
  const [leaseTime, setLeaseTime] = useState(86400);
  const [domainName, setDomainName] = useState('lan.netorbit.local');
  const [gateway, setGateway] = useState('192.168.10.1');

  // Static Reservation form state
  const [selectedScopeId, setSelectedScopeId] = useState('');
  const [staticIp, setStaticIp] = useState('');
  const [staticMac, setStaticMac] = useState('');
  const [staticHostname, setStaticHostname] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [scopesRes, leasesRes] = await Promise.all([
        apiClient.get('/dhcp/scopes').catch(() => []),
        apiClient.get('/dhcp/leases?limit=50').catch(() => ({ data: [] })),
      ]);
      setScopes(scopesRes || []);
      setLeases(leasesRes.data || []);
      if (scopesRes && scopesRes.length > 0) {
        setSelectedScopeId(scopesRes[0].id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateScope(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/dhcp/scopes', {
        name: scopeName,
        interfaceName,
        leaseTimeSeconds: Number(leaseTime),
        domainName,
        gateway: gateway || undefined,
      });
      setShowScopeModal(false);
      setScopeName('');
      fetchData();
      alert('DHCP Scope successfully created!');
    } catch (err: any) {
      alert(err.message || 'Failed to create DHCP scope');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateStatic(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedScopeId) {
      alert('Please select a DHCP scope');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/dhcp/leases/static', {
        scopeId: selectedScopeId,
        ipAddress: staticIp,
        macAddress: staticMac,
        hostname: staticHostname || undefined,
      });
      setShowStaticModal(false);
      setStaticIp('');
      setStaticMac('');
      setStaticHostname('');
      fetchData();
      alert('Static DHCP reservation successfully created!');
    } catch (err: any) {
      alert(err.message || 'Failed to create static reservation');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReleaseLease(id: string) {
    if (!confirm('Release this lease?')) return;
    try {
      await apiClient.post(`/dhcp/leases/${id}/release`, {});
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to release lease');
    }
  }

  const staticCount = leases.filter((l) => l.isStatic).length;
  const activeCount = leases.filter((l) => l.status === 'active').length;

  return (
    <AdminLayout
      title="DHCP Scopes & Leases"
      subtitle="Dynamic host configuration scopes, lease lifetime, static MAC-to-IP binding, and IPAM integration"
    >
      <div className="space-y-6">
        {/* Action Header */}
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={() => setShowStaticModal(true)}
            id="create-static-reservation-btn"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            Static Reservation
          </button>
          <button
            onClick={() => setShowScopeModal(true)}
            id="create-dhcp-scope-btn"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Add DHCP Scope
          </button>
        </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Configured Scopes</p>
            <p className="text-2xl font-bold text-white mt-1">{scopes.length}</p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Cpu className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Leases</p>
            <p className="text-2xl font-bold text-white mt-1">{leases.length}</p>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Active Leases</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Static Reservations</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{staticCount}</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Lock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Scopes Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-5 space-y-4">
        <h2 className="text-md font-bold text-white flex items-center gap-2">
          <Network className="w-5 h-5 text-indigo-400" />
          Active DHCP Scopes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scopes.map((s) => (
            <div key={s.id} className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <span className="font-bold text-white">{s.name}</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] uppercase font-bold">
                  {s.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1 font-mono">
                <div>Interface: <span className="text-slate-200">{s.interfaceName}</span></div>
                <div>Gateway: <span className="text-slate-200">{s.gateway || 'N/A'}</span></div>
                <div>Domain: <span className="text-slate-200">{s.domainName}</span></div>
                <div>Lease Time: <span className="text-slate-200">{Math.round(s.leaseTimeSeconds / 3600)} hrs</span></div>
              </div>
            </div>
          ))}
          {scopes.length === 0 && (
            <div className="col-span-full py-4 text-center text-slate-500 text-sm">
              No DHCP scopes configured. Click &quot;Add DHCP Scope&quot; above.
            </div>
          )}
        </div>
      </div>

      {/* Leases Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-2">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-md font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            DHCP Leases & Reservations Table
          </h2>
          <button
            onClick={() => fetchData()}
            className="p-1.5 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">MAC Address</th>
                <th className="py-3.5 px-4">Hostname</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Expires At</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    Loading DHCP leases...
                  </td>
                </tr>
              ) : leases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No active DHCP leases or static reservations.
                  </td>
                </tr>
              ) : (
                leases.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-bold text-white">{l.ipAddress}</td>
                    <td className="py-3.5 px-4 text-slate-300">{l.macAddress}</td>
                    <td className="py-3.5 px-4 font-sans text-slate-400">{l.hostname || 'None'}</td>
                    <td className="py-3.5 px-4 font-sans">
                      {l.isStatic ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                          <Lock className="w-3 h-3" />
                          Static
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Dynamic</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          l.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-400">
                      {new Date(l.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      {l.status === 'active' && (
                        <button
                          onClick={() => handleReleaseLease(l.id)}
                          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold transition"
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

      {/* Create Scope Modal */}
      {showScopeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Create DHCP Scope
            </h2>
            <form onSubmit={handleCreateScope} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Scope Name</label>
                <input
                  type="text"
                  value={scopeName}
                  onChange={(e) => setScopeName(e.target.value)}
                  placeholder="e.g. Office LAN Pool"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Interface</label>
                  <input
                    type="text"
                    value={interfaceName}
                    onChange={(e) => setInterfaceName(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Lease Time (Seconds)</label>
                  <input
                    type="number"
                    min="300"
                    value={leaseTime}
                    onChange={(e) => setLeaseTime(Number(e.target.value))}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Domain Name</label>
                  <input
                    type="text"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Default Gateway</label>
                  <input
                    type="text"
                    value={gateway}
                    onChange={(e) => setGateway(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScopeModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
                >
                  {isSubmitting ? 'Creating...' : 'Create Scope'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Static Reservation Modal */}
      {showStaticModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              Create Static MAC-to-IP Binding
            </h2>
            <form onSubmit={handleCreateStatic} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Select DHCP Scope</label>
                <select
                  value={selectedScopeId}
                  onChange={(e) => setSelectedScopeId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  {scopes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.interfaceName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">IP Address</label>
                  <input
                    type="text"
                    value={staticIp}
                    onChange={(e) => setStaticIp(e.target.value)}
                    required
                    placeholder="192.168.10.50"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">MAC Address</label>
                  <input
                    type="text"
                    value={staticMac}
                    onChange={(e) => setStaticMac(e.target.value)}
                    required
                    placeholder="00:11:22:33:44:55"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Device Hostname (Optional)</label>
                <input
                  type="text"
                  value={staticHostname}
                  onChange={(e) => setStaticHostname(e.target.value)}
                  placeholder="printer-office.lan"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStaticModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition"
                >
                  {isSubmitting ? 'Binding...' : 'Bind IP to MAC'}
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
