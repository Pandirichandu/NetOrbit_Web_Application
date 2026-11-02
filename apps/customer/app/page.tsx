'use client';

import React, { useState } from 'react';
import {
  Wifi,
  ShieldCheck,
  Download,
  Upload,
  Layers,
  CheckCircle2,
  CreditCard,
  Zap,
  CheckCircle,
  LifeBuoy,
  MessageSquare,
  Send,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';

export default function CustomerPortalHomePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'billing' | 'tickets'>('overview');

  // Customer Tickets State
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState('TECHNICAL');
  const [newTicketPriority, setNewTicketPriority] = useState('MEDIUM');
  const [newTicketDesc, setNewTicketDesc] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketReply, setTicketReply] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Customer Invoices Sample & Payment State
  const [invoices, setInvoices] = useState([
    {
      id: 'inv-customer-1',
      invoiceNumber: 'ISP-INV-2026-00042',
      dueDate: '2026-10-25',
      amount: 49.99,
      status: 'pending',
      plan: 'Fiber Pro 100M',
    },
    {
      id: 'inv-customer-0',
      invoiceNumber: 'ISP-INV-2026-00018',
      dueDate: '2026-09-25',
      amount: 49.99,
      status: 'paid',
      plan: 'Fiber Pro 100M',
    },
  ]);

  const [payingInvoice, setPayingInvoice] = useState<any>(null);
  const [selectedGateway, setSelectedGateway] = useState('razorpay');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const samplePackages = [
    {
      id: 'pkg-1',
      name: 'Fiber Basic 30M',
      price: 29.99,
      download: 30,
      upload: 15,
      quota: '250 GB',
      popular: false,
      features: ['Standard Support', 'Wi-Fi 5 Router', 'Free Installation'],
    },
    {
      id: 'pkg-2',
      name: 'Fiber Pro 100M',
      price: 49.99,
      download: 100,
      upload: 50,
      quota: 'Unlimited',
      popular: true,
      features: ['Priority Support', 'Wi-Fi 6 Router', 'Unlimited Data', 'Free Cloud Storage'],
    },
    {
      id: 'pkg-3',
      name: 'Fiber Ultra 300M',
      price: 79.99,
      download: 300,
      upload: 150,
      quota: 'Unlimited',
      popular: false,
      features: ['24/7 VIP Support', 'Mesh Wi-Fi Included', 'Static IP Available', 'Zero Throttling'],
    },
  ];

  function handlePay(invoice: any) {
    setPaymentSuccess(false);
    setPayingInvoice(invoice);
  }

  function confirmPayment() {
    if (!payingInvoice) return;
    setPaymentSuccess(true);
    setInvoices((prev) =>
      prev.map((i) => (i.id === payingInvoice.id ? { ...i, status: 'paid' } : i)),
    );
    setTimeout(() => {
      setPayingInvoice(null);
      setPaymentSuccess(false);
    }, 2000);
  }

  async function fetchTickets() {
    setLoadingTickets(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('netorbit_access_token') : null;
      const res = await fetch('http://localhost:3001/api/v1/tickets', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.data || data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTickets(false);
    }
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingTicket(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('netorbit_access_token') : null;
      const res = await fetch('http://localhost:3001/api/v1/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subject: newTicketSubject,
          category: newTicketCategory,
          priority: newTicketPriority,
          description: newTicketDesc,
        }),
      });
      if (res.ok) {
        setShowCreateTicketModal(false);
        setNewTicketSubject('');
        setNewTicketDesc('');
        fetchTickets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingTicket(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !ticketReply.trim()) return;
    setIsSendingReply(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('netorbit_access_token') : null;
      const res = await fetch(`http://localhost:3001/api/v1/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          comment: ticketReply,
          isInternal: false,
        }),
      });
      if (res.ok) {
        setTicketReply('');
        const det = await fetch(`http://localhost:3001/api/v1/tickets/${selectedTicket.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (det.ok) {
          const detData = await det.json();
          setSelectedTicket(detData);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingReply(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-950/60 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-600/30">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">NetOrbit</span>
            <span className="text-xs text-blue-400 font-mono ml-2 px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/60">
              Customer Portal
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
              activeTab === 'overview'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            My Subscription
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
              activeTab === 'billing'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Billing & Invoices
          </button>
          <button
            onClick={() => {
              setActiveTab('tickets');
              fetchTickets();
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
              activeTab === 'tickets'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            Support & Tickets
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
              activeTab === 'plans'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Upgrade Plan
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-6 py-12 w-full space-y-10 flex-1">
        {activeTab === 'overview' ? (
          <>
            {/* Hero / Subscription Card */}
            <div className="space-y-4 text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-900/40 border border-blue-700/40 rounded-full text-blue-400 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Subscriber Self-Service Portal</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Welcome, Sarah Connor
              </h1>
              <p className="text-slate-400 text-sm">
                Account Number: <span className="font-mono text-white font-semibold">SUB-1001</span> • Resistance Cybernetics
              </p>
            </div>

            {/* Active Plan Detail Box */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-blue-900/50 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-800/80">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold text-white tracking-tight">Fiber Pro 100M</span>
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>Active Subscription</span>
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">High-speed broadband for HD multi-device streaming and remote work.</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-white">$49.99</span>
                    <span className="text-slate-400 text-xs block">/ month</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition"
                  >
                    <Zap className="w-4 h-4" />
                    Renew Plan
                  </button>
                </div>
              </div>

              {/* Bandwidth & Usage Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center text-xs text-slate-400 mb-1">
                    <Download className="w-4 h-4 text-emerald-400 mr-1.5" />
                    <span>Download Speed</span>
                  </div>
                  <span className="text-xl font-bold text-white">100 Mbps</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">SLA Guaranteed</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center text-xs text-slate-400 mb-1">
                    <Upload className="w-4 h-4 text-blue-400 mr-1.5" />
                    <span>Upload Speed</span>
                  </div>
                  <span className="text-xl font-bold text-white">50 Mbps</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Low-Latency QoS</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center text-xs text-slate-400 mb-1">
                    <Layers className="w-4 h-4 text-indigo-400 mr-1.5" />
                    <span>Data Quota</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-400">Unlimited</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">No FUP Throttling</span>
                </div>
              </div>

              {/* Connection Information */}
              <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block mb-1">Broadband Username</span>
                  <span className="font-mono text-slate-200 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 inline-block">
                    sarah_connor
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block mb-1">Installation Address</span>
                  <span className="text-slate-200">8404 Tech Center Blvd, Los Angeles, CA 90001</span>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'billing' ? (
          /* Billing & Invoices Tab */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                <CreditCard className="w-6 h-6 text-blue-400" />
                Invoices & Payment History
              </h2>
              <p className="text-slate-400 text-xs">Review monthly statements and make secure online payments</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/60 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Invoice #</th>
                      <th className="py-3.5 px-4">Service Plan</th>
                      <th className="py-3.5 px-4">Due Date</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/30">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4 text-white">{inv.plan}</td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs">{inv.dueDate}</td>
                        <td className="py-3.5 px-4 font-bold text-white">${inv.amount}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                              inv.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {inv.status === 'pending' && (
                            <button
                              onClick={() => handlePay(inv)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow transition"
                            >
                              Pay Now
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'plans' ? (
          /* Available Plans View */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Available Internet Plans</h2>
              <p className="text-slate-400 text-xs">Browse ISP packages offered by Orbit Fiber Communications</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 pt-4">
              {samplePackages.map((pkg) => (
                <div
                  key={pkg.name}
                  className={`p-6 rounded-2xl border transition-all ${
                    pkg.popular
                      ? 'bg-slate-900 border-blue-500/50 shadow-xl shadow-blue-950/40 relative'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-bold uppercase rounded-full tracking-wider shadow">
                      Most Popular
                    </div>
                  )}
                  <h3 className="font-bold text-lg text-white">{pkg.name}</h3>
                  <div className="mt-2 mb-4">
                    <span className="text-3xl font-extrabold text-white">${pkg.price}</span>
                    <span className="text-xs text-slate-400"> / month</span>
                  </div>

                  <div className="space-y-2 py-3 border-y border-slate-800 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Download</span>
                      <span className="font-semibold text-emerald-400">{pkg.download} Mbps</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Upload</span>
                      <span className="font-semibold text-blue-400">{pkg.upload} Mbps</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Quota</span>
                      <span className="font-semibold text-white">{pkg.quota}</span>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2 text-xs text-slate-400">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => {
                      alert(`Plan upgrade to ${pkg.name} requested! A billing adjustment invoice has been issued.`);
                      setActiveTab('billing');
                    }}
                    className="w-full mt-6 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
                  >
                    Select Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'tickets' ? (
          /* Support & Tickets Tab */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <LifeBuoy className="w-6 h-6 text-blue-400" />
                  Support Tickets & Inquiries
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Submit technical issues, track real-time resolution SLA, and discuss directly with support engineers
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchTickets}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
                <button
                  onClick={() => setShowCreateTicketModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Open Support Ticket
                </button>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3 px-6">Ticket #</th>
                      <th className="py-3 px-6">Subject</th>
                      <th className="py-3 px-6">Category</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6">Date</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {loadingTickets ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                          Loading your tickets...
                        </td>
                      </tr>
                    ) : tickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          You do not have any open support tickets. Click "Open Support Ticket" if you need technical assistance.
                        </td>
                      </tr>
                    ) : (
                      tickets.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-4 px-6 font-mono text-blue-400 font-medium">
                            {t.ticketNumber}
                          </td>
                          <td className="py-4 px-6 font-semibold text-white">
                            {t.subject}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {t.category}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                                t.status === 'RESOLVED' || t.status === 'CLOSED'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : t.status === 'IN_PROGRESS'
                                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-400">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={async () => {
                                const token = typeof window !== 'undefined' ? localStorage.getItem('netorbit_access_token') : null;
                                const det = await fetch(`http://localhost:3001/api/v1/tickets/${t.id}`, {
                                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                                });
                                if (det.ok) {
                                  const detData = await det.json();
                                  setSelectedTicket(detData);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-semibold transition"
                            >
                              View Thread
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Customer Ticket Detail & Discussion Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-blue-400 text-sm">
                  {selectedTicket.ticketNumber}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">
                  {selectedTicket.status}
                </span>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div>
                <h3 className="text-base font-bold text-white mb-2">{selectedTicket.subject}</h3>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Discussion comments */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  Conversation ({selectedTicket.comments?.length || 0})
                </h4>

                <div className="space-y-2">
                  {selectedTicket.comments?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No replies yet. Our support engineers are looking into this ticket.</p>
                  ) : (
                    selectedTicket.comments?.map((c: any) => (
                      <div key={c.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between items-center text-[11px] text-slate-400">
                          <span className="font-semibold text-white">
                            {c.user ? `${c.user.firstName} ${c.user.lastName}` : 'Support Agent'}
                          </span>
                          <span>{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-300 whitespace-pre-wrap">{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-800 space-y-3">
                  <textarea
                    rows={3}
                    required
                    placeholder="Type your response to support..."
                    value={ticketReply}
                    onChange={(e) => setTicketReply(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSendingReply || !ticketReply.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSendingReply ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Open Support Ticket Modal */}
      {showCreateTicketModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-blue-400" />
                Submit New Support Inquiry
              </h2>
              <button onClick={() => setShowCreateTicketModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Slow upload speed during mornings"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={newTicketCategory}
                    onChange={(e) => setNewTicketCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="TECHNICAL">Technical Issue</option>
                    <option value="BILLING">Billing Question</option>
                    <option value="PROVISIONING">Speed / Package Change</option>
                    <option value="GENERAL">General Support</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={newTicketPriority}
                    onChange={(e) => setNewTicketPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
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
                  placeholder="Describe your issue with as much detail as possible..."
                  value={newTicketDesc}
                  onChange={(e) => setNewTicketDesc(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateTicketModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {isSubmittingTicket ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400" />
              Pay Invoice: {payingInvoice.invoiceNumber}
            </h2>
            <div className="p-3 bg-slate-800 rounded-xl text-xs flex justify-between items-center text-slate-300">
              <span>Amount Due</span>
              <span className="font-bold text-white text-base">${payingInvoice.amount}</span>
            </div>

            {paymentSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-emerald-400">Payment Successful!</div>
                <div className="text-xs text-slate-400">Your subscription has been renewed.</div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Select Payment Gateway
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['Razorpay', 'Stripe', 'PayPal', 'PhonePe', 'Cashfree'].map((gw) => (
                    <button
                      key={gw}
                      type="button"
                      onClick={() => setSelectedGateway(gw.toLowerCase())}
                      className={`p-2.5 rounded-xl border font-semibold text-center transition ${
                        selectedGateway === gw.toLowerCase()
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {gw}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setPayingInvoice(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmPayment}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Pay ${payingInvoice.amount} with {selectedGateway.toUpperCase()}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-6 text-center text-xs text-slate-500 bg-slate-950/40">
        &copy; 2026 NetOrbit Platform. Carrier-grade Enterprise ISP Management System.
      </footer>
    </main>
  );
}
