'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  CheckCircle,
  Clock,
  DollarSign,
  Zap,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface Invoice {
  id: string;
  invoiceNumber: string;
  billingCycle: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  subscriber?: {
    id: string;
    accountNumber: string;
    username: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface SubscriberOption {
  id: string;
  username: string;
  accountNumber: string;
  firstName: string;
  lastName: string;
}

interface PackageOption {
  id: string;
  name: string;
  price: number;
  billingCycle: string;
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  // Form options
  const [subscribers, setSubscribers] = useState<SubscriberOption[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);

  // Create form state
  const [selectedSubId, setSelectedSubId] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [itemDescription, setItemDescription] = useState('Fiber Internet Service');
  const [itemPrice, setItemPrice] = useState(50);
  const [taxRate, setTaxRate] = useState(18);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recharge form state
  const [rechargeSubId, setRechargeSubId] = useState('');
  const [rechargePkgId, setRechargePkgId] = useState('');
  const [rechargeGateway, setRechargeGateway] = useState('manual');
  const [rechargeMethod, setRechargeMethod] = useState('cash');

  useEffect(() => {
    fetchInvoices();
    fetchOptions();
  }, [statusFilter]);

  async function fetchInvoices() {
    setLoading(true);
    setError(null);
    try {
      let url = '/billing/invoices?limit=50';
      if (statusFilter) url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await apiClient.get(url);
      setInvoices(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOptions() {
    try {
      const [subsRes, pkgsRes] = await Promise.all([
        apiClient.get('/subscribers?limit=100').catch(() => ({ data: [] })),
        apiClient.get('/packages?limit=100').catch(() => ({ data: [] })),
      ]);
      setSubscribers(subsRes.data || []);
      setPackages(pkgsRes.data || []);
    } catch {
      // silently ignore option fetch errors
    }
  }

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/billing/invoices', {
        subscriberId: selectedSubId || undefined,
        billingCycle,
        dueDate,
        taxRate: Number(taxRate),
        items: [
          {
            description: itemDescription,
            quantity: 1,
            unitPrice: Number(itemPrice),
            amount: Number(itemPrice),
          },
        ],
        notes: notes || undefined,
      });
      setShowCreateModal(false);
      resetForm();
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecharge(e: React.FormEvent) {
    e.preventDefault();
    if (!rechargeSubId || !rechargePkgId) {
      alert('Please select both subscriber and package');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/billing/recharge', {
        subscriberId: rechargeSubId,
        packageId: rechargePkgId,
        paymentGateway: rechargeGateway,
        paymentMethod: rechargeMethod,
        notes: 'Front-desk admin plan renewal',
      });
      setShowRechargeModal(false);
      fetchInvoices();
      alert('Subscriber successfully recharged and plan renewed!');
    } catch (err: any) {
      alert(err.message || 'Recharge failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVoid(id: string) {
    if (!confirm('Are you sure you want to void this invoice?')) return;
    try {
      await apiClient.post(`/billing/invoices/${id}/void`, {});
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Failed to void invoice');
    }
  }

  function resetForm() {
    setSelectedSubId('');
    setItemDescription('Fiber Internet Service');
    setItemPrice(50);
    setNotes('');
  }

  // Summary Metrics
  const totalInvoiced = invoices.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + Number(inv.paidAmount || 0), 0);
  const totalBalance = invoices.reduce((acc, inv) => acc + Number(inv.balanceAmount || 0), 0);
  const pendingCount = invoices.filter((inv) => inv.status === 'pending').length;

  return (
    <AdminLayout
      title="Billing & Invoices"
      subtitle="Automated invoice generation, tax calculations, plan renewals, and payment reconciliation"
    >
      <div className="space-y-6">
        {/* Action Header */}
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={() => setShowRechargeModal(true)}
            id="recharge-plan-btn"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 transition"
          >
            <Zap className="w-4 h-4" />
            Recharge Subscriber
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            id="create-invoice-btn"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Invoiced</p>
            <p className="text-2xl font-bold text-white mt-1">${totalInvoiced.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Collected Revenue</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">${totalPaid.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Outstanding Balance</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">${totalBalance.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Pending Invoices</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice # or subscriber..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchInvoices()}
            className="bg-transparent border-none text-white text-sm focus:outline-none w-full placeholder-slate-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none border-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Statuses</option>
              <option value="pending" className="bg-slate-900">Pending</option>
              <option value="paid" className="bg-slate-900">Paid</option>
              <option value="partially_paid" className="bg-slate-900">Partially Paid</option>
              <option value="void" className="bg-slate-900">Void</option>
            </select>
          </div>
          <button
            onClick={() => fetchInvoices()}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-300 transition"
            title="Refresh Table"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Subscriber</th>
                <th className="py-3.5 px-4">Cycle</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Balance</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No invoices found. Generate an invoice or recharge a subscriber.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      {inv.subscriber ? (
                        <div>
                          <div className="text-white font-medium">
                            {inv.subscriber.firstName} {inv.subscriber.lastName}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {inv.subscriber.accountNumber} ({inv.subscriber.username})
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Ad-hoc Customer</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 uppercase text-xs tracking-wider text-slate-400">
                      {inv.billingCycle}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      ${Number(inv.totalAmount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-400">
                      ${Number(inv.balanceAmount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          inv.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : inv.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : inv.status === 'partially_paid'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {inv.status === 'pending' && (
                        <button
                          onClick={() => handleVoid(inv.id)}
                          className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold transition"
                        >
                          Void
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

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Generate Manual Invoice</h2>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Subscriber (Optional)</label>
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">-- Ad-hoc / Walk-in Customer --</option>
                  {subscribers.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.firstName} {sub.lastName} ({sub.accountNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Billing Cycle</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi_annual">Semi-Annual</option>
                    <option value="annual">Annual</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Service Item Description</label>
                <input
                  type="text"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Subtotal Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(Number(e.target.value))}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
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
                  {isSubmitting ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              Recharge Subscriber Plan
            </h2>
            <p className="text-xs text-slate-400">
              Instantly activates or extends subscription validity, creates paid invoice & records transaction
            </p>
            <form onSubmit={handleRecharge} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Subscriber Account</label>
                <select
                  value={rechargeSubId}
                  onChange={(e) => setRechargeSubId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">-- Choose Subscriber --</option>
                  {subscribers.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.firstName} {sub.lastName} ({sub.accountNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">ISP Plan / Package</label>
                <select
                  value={rechargePkgId}
                  onChange={(e) => setRechargePkgId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">-- Choose Plan --</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - ${Number(pkg.price).toFixed(2)} ({pkg.billingCycle})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Payment Gateway</label>
                  <select
                    value={rechargeGateway}
                    onChange={(e) => setRechargeGateway(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="manual">Manual Cash / POS</option>
                    <option value="razorpay">Razorpay</option>
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                    <option value="phonepe">PhonePe</option>
                    <option value="cashfree">Cashfree</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
                  <select
                    value={rechargeMethod}
                    onChange={(e) => setRechargeMethod(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRechargeModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Recharge'}
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
