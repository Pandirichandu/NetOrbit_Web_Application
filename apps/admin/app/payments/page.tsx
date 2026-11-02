'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Radio,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/layout/admin-layout';

interface PaymentTransaction {
  id: string;
  gateway: string;
  gatewayTransactionId?: string;
  gatewayOrderId?: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
  } | null;
  subscriber?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  balanceAmount: number;
  subscriber?: {
    firstName: string;
    lastName: string;
  };
}

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<PaymentTransaction | null>(null);

  // Unpaid invoices for manual payment
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [gateway, setGateway] = useState('razorpay');
  const [method, setMethod] = useState('card');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verification form state
  const [verifyTxId, setVerifyTxId] = useState('');
  const [verifyGateway, setVerifyGateway] = useState('razorpay');
  const [verifyOrderId, setVerifyOrderId] = useState('');
  const [verifyPaymentId, setVerifyPaymentId] = useState('');
  const [verifySignature, setVerifySignature] = useState('');

  useEffect(() => {
    fetchTransactions();
    fetchUnpaidInvoices();
  }, [gatewayFilter, statusFilter]);

  async function fetchTransactions() {
    setLoading(true);
    setError(null);
    try {
      let url = '/payments?limit=50';
      if (gatewayFilter) url += `&gateway=${gatewayFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await apiClient.get(url);
      setTransactions(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnpaidInvoices() {
    try {
      const res = await apiClient.get('/billing/invoices?status=pending&limit=100');
      setInvoices(res.data || []);
    } catch {
      // ignore
    }
  }

  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/payments/create', {
        invoiceId: selectedInvoiceId || undefined,
        gateway,
        amount: Number(amount),
        currency: 'USD',
        paymentMethod: method,
        notes: notes || undefined,
      });

      setShowCreateModal(false);
      fetchTransactions();

      if (res.transaction && res.transaction.status === 'pending') {
        // Open verification modal pre-filled
        setSelectedTx(res.transaction);
        setVerifyTxId(res.transaction.id);
        setVerifyGateway(res.transaction.gateway);
        setVerifyOrderId(res.checkoutDetails?.gatewayOrderId || '');
        setVerifyPaymentId(`pay_${Date.now()}`);
        setVerifySignature('sandbox_verified_sig');
        setShowVerifyModal(true);
      }
    } catch (err: any) {
      alert(err.message || 'Payment initiation failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyPayment(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/payments/verify', {
        transactionId: verifyTxId,
        gatewayOrderId: verifyOrderId,
        gatewayTransactionId: verifyPaymentId,
        gatewaySignature: verifySignature,
        gatewayResponse: { mockTestSuccess: true },
      });
      setShowVerifyModal(false);
      fetchTransactions();
      alert('Payment verified successfully! Invoices and subscriber accounts reconciled.');
    } catch (err: any) {
      alert(err.message || 'Payment verification failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Summary Metrics
  const totalVolume = transactions.reduce((acc, tx) => acc + (tx.status === 'success' ? Number(tx.amount || 0) : 0), 0);
  const successCount = transactions.filter((tx) => tx.status === 'success').length;
  const failedCount = transactions.filter((tx) => tx.status === 'failed').length;
  const pendingCount = transactions.filter((tx) => tx.status === 'pending').length;

  return (
    <AdminLayout
      title="Payments Ledger"
      subtitle="Payment transactions, gateway reconciliation, manual receipting, and transaction audits"
    >
      <div className="space-y-6">
        {/* Action Header */}
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            id="new-payment-btn"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Initiate Payment
          </button>
        </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Settled Volume</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">${totalVolume.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Success Transactions</p>
            <p className="text-2xl font-bold text-white mt-1">{successCount}</p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Pending Orders</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Failed / Rejected</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{failedCount}</p>
          </div>
          <div className="p-3 bg-red-500/10 text-red-400 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Gateway Badges Showcase */}
      <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider mr-2">
          Supported Gateways:
        </span>
        {['Razorpay', 'Stripe', 'PayPal', 'PhonePe', 'Cashfree', 'Manual'].map((gw) => (
          <span
            key={gw}
            className="px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs font-medium text-slate-300 flex items-center gap-1.5 shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            {gw}
          </span>
        ))}
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
            placeholder="Search transaction ID, order #, subscriber..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
            className="bg-transparent border-none text-white text-sm focus:outline-none w-full placeholder-slate-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none border-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Gateways</option>
              <option value="razorpay" className="bg-slate-900">Razorpay</option>
              <option value="stripe" className="bg-slate-900">Stripe</option>
              <option value="paypal" className="bg-slate-900">PayPal</option>
              <option value="phonepe" className="bg-slate-900">PhonePe</option>
              <option value="cashfree" className="bg-slate-900">Cashfree</option>
              <option value="manual" className="bg-slate-900">Manual / Cash</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none border-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Statuses</option>
              <option value="success" className="bg-slate-900">Success</option>
              <option value="pending" className="bg-slate-900">Pending</option>
              <option value="failed" className="bg-slate-900">Failed</option>
            </select>
          </div>
          <button
            onClick={() => fetchTransactions()}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-300 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Transaction ID</th>
                <th className="py-3.5 px-4">Gateway</th>
                <th className="py-3.5 px-4">Order / Reference</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading payment records...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono text-xs text-indigo-400">
                      {tx.id.substring(0, 13)}...
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {tx.gateway}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {tx.gatewayTransactionId || tx.gatewayOrderId || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      ${Number(tx.amount).toFixed(2)} <span className="text-xs text-slate-500">{tx.currency}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {tx.invoice?.invoiceNumber || 'Direct Payment'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          tx.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : tx.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {tx.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedTx(tx);
                            setVerifyTxId(tx.id);
                            setVerifyGateway(tx.gateway);
                            setVerifyOrderId(tx.gatewayOrderId || '');
                            setVerifyPaymentId(`pay_${Date.now()}`);
                            setVerifySignature('sandbox_verified_sig');
                            setShowVerifyModal(true);
                          }}
                          className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold transition"
                        >
                          Verify Payment
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

      {/* Create Payment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              Initiate Payment Order
            </h2>
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Select Invoice to Settle (Optional)</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    const inv = invoices.find((i) => i.id === e.target.value);
                    if (inv) setAmount(Number(inv.balanceAmount));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">-- Direct Ad-hoc Payment --</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - Due: ${Number(inv.balanceAmount).toFixed(2)} ({inv.subscriber?.firstName} {inv.subscriber?.lastName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Payment Gateway</label>
                  <select
                    value={gateway}
                    onChange={(e) => setGateway(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="razorpay">Razorpay</option>
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                    <option value="phonepe">PhonePe</option>
                    <option value="cashfree">Cashfree</option>
                    <option value="manual">Manual / Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="card">Credit / Debit Card</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="netbanking">Net Banking</option>
                  <option value="wallet">Digital Wallet</option>
                  <option value="cash">Cash / Counter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Notes / Memo</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional reference memo..."
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
                  {isSubmitting ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify Payment Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Verify Gateway Payment
            </h2>
            <p className="text-xs text-slate-400">
              Performs cryptographic signature verification and reconciles linked invoices
            </p>

            {selectedTx && (
              <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction ID:</span>
                  <span className="font-mono text-cyan-400">{selectedTx.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gateway:</span>
                  <span className="uppercase text-amber-400 font-semibold">{verifyGateway}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="font-semibold text-emerald-400">{selectedTx.currency} {Number(selectedTx.amount).toFixed(2)}</span>
                </div>
              </div>
            )}
            <form onSubmit={handleVerifyPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Gateway Order ID</label>
                <input
                  type="text"
                  value={verifyOrderId}
                  onChange={(e) => setVerifyOrderId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Gateway Payment / Transaction ID</label>
                <input
                  type="text"
                  value={verifyPaymentId}
                  onChange={(e) => setVerifyPaymentId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Signature / Checksum Token</label>
                <input
                  type="text"
                  value={verifySignature}
                  onChange={(e) => setVerifySignature(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify & Reconcile'}
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
