'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  Wrench,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  ChevronRight,
  X,
  Radio,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  interestedPackage?: string;
  status: string;
  notes?: string;
  convertedSubscriberId?: string | null;
  convertedAt?: string | null;
  createdAt: string;
}

interface Installation {
  id: string;
  customerName: string;
  contactPhone: string;
  address: string;
  scheduledDate: string;
  status: string;
  notes?: string;
  technician?: {
    id: string;
    name: string;
    mobile: string;
  } | null;
}

interface Technician {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  serviceZone?: string;
  status: string;
}

interface Complaint {
  id: string;
  customerName: string;
  phone: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
}

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState<'leads' | 'installations' | 'technicians' | 'complaints'>('leads');
  const [loading, setLoading] = useState(true);

  // Data states
  const [leads, setLeads] = useState<Lead[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  // Modals
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showTechModal, setShowTechModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  // Forms
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', email: '', address: '', interestedPackage: '', notes: '' });
  const [techForm, setTechForm] = useState({ name: '', mobile: '', email: '', serviceZone: '', status: 'ACTIVE' });
  const [installForm, setInstallForm] = useState({ customerName: '', contactPhone: '', address: '', scheduledDate: '', technicianId: '', notes: '' });
  const [convertForm, setConvertForm] = useState({ username: '', password: '', packageId: '' });
  const [packages, setPackages] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchPackages();
  }, [activeTab]);

  async function fetchPackages() {
    try {
      const res = await apiClient.request('/packages?limit=50');
      setPackages(res.data || res || []);
    } catch (e) {
      // Ignore package fetch error on init
    }
  }

  async function fetchData() {
    setLoading(true);
    setActionMessage(null);
    try {
      if (activeTab === 'leads') {
        const res = await apiClient.request('/crm/leads');
        setLeads(res.data || res || []);
      } else if (activeTab === 'installations') {
        const res = await apiClient.request('/crm/installations');
        setInstallations(res.data || res || []);
      } else if (activeTab === 'technicians') {
        const res = await apiClient.request('/crm/technicians');
        setTechnicians(res.data || res || []);
      } else if (activeTab === 'complaints') {
        const res = await apiClient.request('/crm/complaints');
        setComplaints(res.data || res || []);
      }
    } catch (err) {
      console.error('Failed to load CRM data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.request('/crm/leads', {
        method: 'POST',
        body: JSON.stringify(leadForm),
      });
      setShowLeadModal(false);
      setLeadForm({ name: '', phone: '', email: '', address: '', interestedPackage: '', notes: '' });
      fetchData();
    } catch (err) {
      console.error('Failed to create lead:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateTechnician(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.request('/crm/technicians', {
        method: 'POST',
        body: JSON.stringify(techForm),
      });
      setShowTechModal(false);
      setTechForm({ name: '', mobile: '', email: '', serviceZone: '', status: 'ACTIVE' });
      fetchData();
    } catch (err) {
      console.error('Failed to create technician:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateInstallation(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.request('/crm/installations', {
        method: 'POST',
        body: JSON.stringify({
          ...installForm,
          technicianId: installForm.technicianId || undefined,
        }),
      });
      setShowInstallModal(false);
      setInstallForm({ customerName: '', contactPhone: '', address: '', scheduledDate: '', technicianId: '', notes: '' });
      fetchData();
    } catch (err) {
      console.error('Failed to schedule installation:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConvertLead(e: React.FormEvent) {
    e.preventDefault();
    if (!convertingLead) return;

    setIsSubmitting(true);
    try {
      const res = await apiClient.request(`/crm/leads/${convertingLead.id}/convert`, {
        method: 'POST',
        body: JSON.stringify(convertForm),
      });
      setShowConvertModal(false);
      setActionMessage(`Lead successfully converted to Subscriber! Subscriber ID: ${res.subscriber?.id}`);
      fetchData();
    } catch (err: any) {
      setActionMessage(`Conversion error: ${err.message || 'Failed to convert lead'}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateLeadStatus(leadId: string, status: string) {
    try {
      await apiClient.request(`/crm/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (e) {
      setActionMessage('Failed to update lead status');
    }
  }

  async function handleUpdateInstallStatus(installId: string, status: string) {
    try {
      await apiClient.request(`/crm/installations/${installId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (e) {
      setActionMessage('Failed to update installation status');
    }
  }

  const leadStatusBadge = (s: string) => {
    switch (s) {
      case 'NEW':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'CONTACTED':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'QUALIFIED':
        return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      case 'FEASIBILITY_CHECK':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'CONVERTED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'LOST':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <AdminLayout
      title="CRM & Field Service Management"
      subtitle="Lead pipelines, 1-click subscriber conversion, technician dispatch, and fiber installation work orders"
    >
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {activeTab === 'leads' && (
            <button
              onClick={() => setShowLeadModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              Add Lead
            </button>
          )}
          {activeTab === 'technicians' && (
            <button
              onClick={() => setShowTechModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              Add Technician
            </button>
          )}
          {activeTab === 'installations' && (
            <button
              onClick={async () => {
                await apiClient.request('/crm/technicians').then((res) => setTechnicians(res.data || res || []));
                setShowInstallModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              Schedule Work Order
            </button>
          )}
        </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800 text-blue-200 text-sm flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-blue-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('leads')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'leads'
              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Leads & Pipeline
        </button>
        <button
          onClick={() => setActiveTab('installations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'installations'
              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Field Installations
        </button>
        <button
          onClick={() => setActiveTab('technicians')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'technicians'
              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Technicians Directory
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'complaints'
              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Complaints Log
        </button>
      </div>

      {/* Tab 1: Leads */}
      {activeTab === 'leads' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Name / Company</th>
                  <th className="py-4 px-6">Contact</th>
                  <th className="py-4 px-6">Package Interest</th>
                  <th className="py-4 px-6">Pipeline Stage</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading lead pipeline...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No CRM leads found. Click &quot;Add Lead&quot; to capture a prospective subscriber.
                    </td>
                  </tr>
                ) : (
                  leads.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white">{l.name}</div>
                        {l.address && (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {l.address}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-slate-300 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          {l.phone}
                        </div>
                        {l.email && (
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            {l.email}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-medium">
                        {l.interestedPackage || 'Standard Broadband'}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${leadStatusBadge(l.status)}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        {l.status === 'CONVERTED' ? (
                          <span className="text-xs text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
                            Converted
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setConvertingLead(l);
                              setConvertForm({
                                username: l.email ? l.email.split('@')[0] : `user_${Math.floor(Math.random() * 9000 + 1000)}`,
                                password: 'Sub@' + Math.floor(Math.random() * 900000 + 100000),
                                packageId: packages[0]?.id || '',
                              });
                              setShowConvertModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
                          >
                            Convert to Subscriber
                          </button>
                        )}
                        <select
                          value={l.status}
                          onChange={(e) => handleUpdateLeadStatus(l.id, e.target.value)}
                          className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="NEW">New</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="QUALIFIED">Qualified</option>
                          <option value="FEASIBILITY_CHECK">Feasibility Check</option>
                          <option value="LOST">Lost</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Installations */}
      {activeTab === 'installations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Customer Name</th>
                  <th className="py-4 px-6">Site Address</th>
                  <th className="py-4 px-6">Assigned Technician</th>
                  <th className="py-4 px-6">Scheduled Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Loading field installations...
                    </td>
                  </tr>
                ) : installations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No installation work orders scheduled.
                    </td>
                  </tr>
                ) : (
                  installations.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white">{inst.customerName}</div>
                        <div className="text-xs text-slate-500">{inst.contactPhone}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        <div className="flex items-center gap-1.5 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {inst.address}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {inst.technician ? (
                          <div className="text-xs text-slate-300 font-medium">
                            {inst.technician.name} ({inst.technician.mobile})
                          </div>
                        ) : (
                          <span className="text-xs text-amber-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-300">
                        {new Date(inst.scheduledDate).toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {inst.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <select
                          value={inst.status}
                          onChange={(e) => handleUpdateInstallStatus(inst.id, e.target.value)}
                          className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="SCHEDULED">Scheduled</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Technicians Directory */}
      {activeTab === 'technicians' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 py-12 text-center text-slate-500">
              Loading technician directory...
            </div>
          ) : technicians.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-slate-500">
              No technicians registered in directory.
            </div>
          ) : (
            technicians.map((t) => (
              <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-base">{t.name}</div>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      t.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : t.status === 'BUSY'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.mobile}</span>
                  </div>
                  {t.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t.email}</span>
                    </div>
                  )}
                  {t.serviceZone && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-semibold text-indigo-400">{t.serviceZone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Complaints */}
      {activeTab === 'complaints' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6">Reported At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      No complaints currently logged.
                    </td>
                  </tr>
                ) : (
                  complaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white">{c.customerName}</div>
                        <div className="text-xs text-slate-500">{c.phone}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {c.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-300 text-xs">{c.description}</td>
                      <td className="py-4 px-6 text-xs text-slate-500">
                        {new Date(c.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Convert Lead to Subscriber Modal */}
      {showConvertModal && convertingLead && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                Convert Lead to Subscriber
              </h2>
              <button onClick={() => setShowConvertModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConvertLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Lead Prospect</label>
                <input
                  type="text"
                  disabled
                  value={`${convertingLead.name} (${convertingLead.phone})`}
                  className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-sm text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Package</label>
                <select
                  required
                  value={convertForm.packageId}
                  onChange={(e) => setConvertForm({ ...convertForm, packageId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select Package Plan</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ${p.price}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subscriber Username</label>
                <input
                  type="text"
                  required
                  value={convertForm.username}
                  onChange={(e) => setConvertForm({ ...convertForm, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Portal Password</label>
                <input
                  type="text"
                  required
                  value={convertForm.password}
                  onChange={(e) => setConvertForm({ ...convertForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition"
                >
                  {isSubmitting ? 'Converting...' : 'Confirm Conversion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Capture Prospect Lead
              </h2>
              <button onClick={() => setShowLeadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Name / Business Name</label>
                <input
                  type="text"
                  required
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Site Address</label>
                <input
                  type="text"
                  value={leadForm.address}
                  onChange={(e) => setLeadForm({ ...leadForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Interested Package</label>
                <input
                  type="text"
                  placeholder="e.g. Fiber 300M or Enterprise"
                  value={leadForm.interestedPackage}
                  onChange={(e) => setLeadForm({ ...leadForm, interestedPackage: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Technician Modal */}
      {showTechModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                Add Technician
              </h2>
              <button onClick={() => setShowTechModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTechnician} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Technician Name</label>
                <input
                  type="text"
                  required
                  value={techForm.name}
                  onChange={(e) => setTechForm({ ...techForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mobile Phone</label>
                <input
                  type="text"
                  required
                  value={techForm.mobile}
                  onChange={(e) => setTechForm({ ...techForm, mobile: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Service Zone</label>
                <input
                  type="text"
                  placeholder="e.g. North Zone / Downtown"
                  value={techForm.serviceZone}
                  onChange={(e) => setTechForm({ ...techForm, serviceZone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTechModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Save Technician
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Work Order Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-400" />
                Schedule Field Work Order
              </h2>
              <button onClick={() => setShowInstallModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateInstallation} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={installForm.customerName}
                  onChange={(e) => setInstallForm({ ...installForm, customerName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contact Phone</label>
                <input
                  type="text"
                  required
                  value={installForm.contactPhone}
                  onChange={(e) => setInstallForm({ ...installForm, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Site Address</label>
                <input
                  type="text"
                  required
                  value={installForm.address}
                  onChange={(e) => setInstallForm({ ...installForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={installForm.scheduledDate}
                    onChange={(e) => setInstallForm({ ...installForm, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assign Technician</label>
                  <select
                    value={installForm.technicianId}
                    onChange={(e) => setInstallForm({ ...installForm, technicianId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Create Work Order
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
