import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { printElement } from '../utils/printHelper';

export default function CustomerDetailDrawer({ client, isOpen, onClose, onRefreshClients }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState(null);

  // Record Payment Modal State
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [paymentTargetInvoiceId, setPaymentTargetInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Edit Payment Modal State
  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash');
  const [editPaymentReference, setEditPaymentReference] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(false);

  // Price List Activation State
  const [activatingVersion, setActivatingVersion] = useState(false);

  const { showToast } = useToast();

  const fetchCustomerDetails = async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/sales/customers/${client.id}`);
      setCustomerData(res.data);
    } catch (err) {
      console.error('Failed to load customer profile and transaction history:', err);
      showToast?.('Failed to load complete customer records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && client?.id) {
      fetchCustomerDetails();
    } else {
      setCustomerData(null);
      setSelectedInvoiceForModal(null);
      setShowRecordPaymentModal(false);
      setEditingPayment(null);
    }
  }, [isOpen, client?.id]);

  if (!isOpen || !client) return null;

  const summary = customerData?.account_summary || customerData?.stats || {};
  const invoices = customerData?.invoices || customerData?.sales || [];
  const payments = customerData?.payments || [];
  const priceList = customerData?.price_list || null;
  const priceListHistory = customerData?.price_list_history || [];

  // Filter invoices by invoice number or product name
  const filteredInvoices = invoices.filter((inv) => {
    if (!invoiceSearch.trim()) return true;
    const term = invoiceSearch.toLowerCase();
    const invNo = String(inv.invoice_no || '').toLowerCase();
    const itemsMatch = Array.isArray(inv.itemsRelation)
      ? inv.itemsRelation.some((it) => String(it.product_name || it.product_code || '').toLowerCase().includes(term))
      : false;
    return invNo.includes(term) || itemsMatch;
  });

  // Outstanding invoices eligible for new payment recording
  const outstandingInvoices = invoices.filter((inv) => Number(inv.due_amount || 0) > 0);

  const handleOpenRecordPayment = (preselectedInvoice = null) => {
    if (preselectedInvoice) {
      setPaymentTargetInvoiceId(preselectedInvoice.id);
      setPaymentAmount(preselectedInvoice.due_amount || '');
    } else if (outstandingInvoices.length > 0) {
      setPaymentTargetInvoiceId('auto_all');
      const totalDue = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.due_amount || 0), 0);
      setPaymentAmount(totalDue > 0 ? totalDue.toFixed(2) : '');
    } else {
      setPaymentTargetInvoiceId('auto_all');
      setPaymentAmount('');
    }
    setPaymentMethod('cash');
    setPaymentReference('');
    setShowRecordPaymentModal(true);
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      showToast?.('Please enter a valid payment amount greater than zero.', 'error');
      return;
    }

    setRecordingPayment(true);
    try {
      if (paymentTargetInvoiceId === 'auto_all' || !paymentTargetInvoiceId) {
        await api.post(`/clients/${client.id}/payments`, {
          amount: amt,
          payment_method: paymentMethod,
          reference: paymentReference,
          paid_at: new Date().toISOString(),
        });
        showToast?.('Customer payment recorded and allocated across outstanding balances.', 'success');
      } else {
        await api.post(`/sales/${paymentTargetInvoiceId}/payments`, {
          amount: amt,
          payment_method: paymentMethod,
          reference: paymentReference,
          paid_at: new Date().toISOString(),
        });
        showToast?.('Payment successfully recorded and allocated to invoice.', 'success');
      }
      setShowRecordPaymentModal(false);
      await fetchCustomerDetails();
      onRefreshClients?.();
    } catch (err) {
      console.error(err);
      showToast?.(err.response?.data?.message || 'Failed to record payment.', 'error');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleOpenEditPayment = (payment) => {
    setEditingPayment(payment);
    setEditPaymentAmount(payment.amount || '');
    setEditPaymentMethod(payment.payment_method || 'cash');
    setEditPaymentReference(payment.reference || '');
  };

  const handleUpdatePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!editingPayment) return;
    const amt = parseFloat(editPaymentAmount);
    if (!amt || amt <= 0) {
      showToast?.('Please enter a valid payment amount greater than zero.', 'error');
      return;
    }

    setUpdatingPayment(true);
    try {
      await api.put(`/sales/${editingPayment.invoice_id}/payments/${editingPayment.id}`, {
        amount: amt,
        payment_method: editPaymentMethod,
        reference: editPaymentReference,
      });
      showToast?.('Payment record updated and invoice balance recalculated.', 'success');
      setEditingPayment(null);
      await fetchCustomerDetails();
      onRefreshClients?.();
    } catch (err) {
      console.error(err);
      showToast?.(err.response?.data?.message || 'Failed to update payment record.', 'error');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleDeletePaymentSubmit = async (payment) => {
    if (!window.confirm(`Are you sure you want to cancel payment of ₹${Number(payment.amount).toLocaleString('en-IN')}? This will restore the invoice balance due.`)) {
      return;
    }

    try {
      await api.delete(`/sales/${payment.invoice_id}/payments/${payment.id}`);
      showToast?.('Payment cancelled and invoice balance recalculated.', 'success');
      await fetchCustomerDetails();
      onRefreshClients?.();
    } catch (err) {
      console.error(err);
      showToast?.('Failed to delete payment record.', 'error');
    }
  };

  const handleActivatePriceListVersion = async (versionId) => {
    setActivatingVersion(true);
    try {
      const res = await api.post(`/clients/${client.id}/price-list/activate/${versionId}`);
      showToast?.(res.data?.message || 'Price list version activated successfully.', 'success');
      await fetchCustomerDetails();
      onRefreshClients?.();
    } catch (err) {
      console.error(err);
      showToast?.('Failed to activate price list version.', 'error');
    } finally {
      setActivatingVersion(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-4xl bg-stone-50 h-full shadow-2xl flex flex-col z-10 border-l border-stone-200 font-sans">
        
        {/* 1. Header with customer avatar, name, code & close button */}
        <div className="bg-white border-b border-stone-200 px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {client.avatar_url || client.avatar ? (
              <img
                src={client.avatar_url || client.avatar}
                alt={client.full_name}
                className="w-13 h-13 rounded-full object-cover border-2 border-amber-200 shadow-xs"
              />
            ) : (
              <div className="w-13 h-13 rounded-full bg-[#fde8e8] text-[#b01622] flex items-center justify-center text-base font-black border border-[#fbd5d5] shadow-xs">
                {(client.full_name || 'CL').substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-stone-900 tracking-tight">
                  {client.full_name || client.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                  {client.client_code}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  (client.status || 'active').toLowerCase() === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {client.status || 'active'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1 flex items-center gap-3">
                {client.primary_phone && (
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-phone text-stone-400 text-[10px]"></i>
                    {client.primary_phone}
                  </span>
                )}
                {client.email && (
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-envelope text-stone-400 text-[10px]"></i>
                    {client.email}
                  </span>
                )}
                {client.membership_tier && (
                  <span className="flex items-center gap-1 font-semibold text-amber-700">
                    <i className="fa-solid fa-crown text-amber-500 text-[10px]"></i>
                    {client.membership_tier.toUpperCase()} TIER
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {outstandingInvoices.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenRecordPayment()}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-hand-holding-dollar text-xs"></i>
                <span>Record Payment</span>
              </button>
            )}
            <Link
              to={`/sales?customer=${encodeURIComponent(client.full_name)}&client_id=${client.id}`}
              className="px-3.5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-cart-plus text-xs"></i>
              <span>New Sale</span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-500 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-times text-sm"></i>
            </button>
          </div>
        </div>

        {/* 2. Navigation Tabs */}
        <div className="bg-white border-b border-stone-200 px-6 flex items-center gap-2 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#b01622] text-[#b01622] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <i className="fa-solid fa-chart-line"></i>
            <span>Overview &amp; Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'invoices'
                ? 'border-[#b01622] text-[#b01622] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <i className="fa-solid fa-file-invoice"></i>
            <span>Invoices ({invoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'payments'
                ? 'border-[#b01622] text-[#b01622] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <i className="fa-solid fa-receipt"></i>
            <span>Payments ({payments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('price_list')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'price_list'
                ? 'border-[#b01622] text-[#b01622] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <i className="fa-solid fa-tags"></i>
            <span>Customer Price List</span>
          </button>
        </div>

        {/* 3. Main Drawer Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-24 text-center text-stone-400">
              <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622] mb-3"></i>
              <p className="text-xs font-semibold">Loading consolidated account summary &amp; transaction records...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & LEDGER */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Financial Balance Summary Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-stone-200/90 shadow-2xs">
                      <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Total Billed</p>
                      <p className="text-xl font-black text-stone-900 mt-1 font-mono">
                        ₹{Number(summary.total_billed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{summary.total_invoices || 0} Total Orders</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-stone-200/90 shadow-2xs">
                      <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Total Paid</p>
                      <p className="text-xl font-black text-emerald-700 mt-1 font-mono">
                        ₹{Number(summary.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-emerald-600/80 mt-0.5">{summary.paid_invoices_count || 0} Invoices Fully Paid</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-stone-200/90 shadow-2xs">
                      <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Invoice Dues</p>
                      <p className="text-xl font-black text-amber-700 mt-1 font-mono">
                        ₹{Number(summary.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-amber-600/80 mt-0.5">
                        {summary.unpaid_invoices_count || 0} Unpaid · {summary.partially_paid_invoices_count || 0} Partial
                      </p>
                    </div>

                    <div className="bg-[#fef2f2] p-4 rounded-xl border border-red-200 shadow-2xs">
                      <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wider">Total Customer Due</p>
                      <p className="text-xl font-black text-[#b01622] mt-1 font-mono">
                        ₹{Number(summary.total_customer_outstanding || summary.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-red-600/80 mt-0.5">
                        {Number(summary.opening_balance || 0) > 0 ? `Incl. ₹${Number(summary.opening_balance).toLocaleString('en-IN')} Opening` : 'Net Outstanding Due'}
                      </p>
                    </div>
                  </div>

                  {/* Profile & Billing Attributes Grid */}
                  <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3.5 pb-2 border-b border-stone-100 flex items-center justify-between">
                      <span>Customer Profile &amp; Billing Data</span>
                      <Link
                        to={`/clients/${client.id}/edit`}
                        className="text-[#b01622] hover:underline normal-case text-xs font-semibold"
                      >
                        Edit Profile <i className="fa-solid fa-arrow-up-right-from-square text-[10px] ml-1"></i>
                      </Link>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3.5 gap-x-6 text-xs">
                      <div>
                        <span className="text-stone-400 block font-medium">Full Name</span>
                        <span className="font-semibold text-stone-800">{client.full_name}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-medium">Customer Code</span>
                        <span className="font-mono font-bold text-stone-800">{client.client_code}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-medium">Primary Mobile</span>
                        <span className="font-mono font-semibold text-stone-800">{client.primary_phone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-medium">Secondary Mobile</span>
                        <span className="font-mono text-stone-800">{client.secondary_phone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-medium">Email Address</span>
                        <span className="text-stone-800">{client.email || '—'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-medium">PAN Number</span>
                        <span className="font-mono font-semibold text-stone-800">{client.pan_number || '—'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-medium">Aadhar Number</span>
                        <span className="font-mono text-stone-800">{client.aadhar_number || '—'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-medium">GSTIN</span>
                        <span className="font-mono text-stone-800">{client.gst_number || '—'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-medium">Company Name</span>
                        <span className="text-stone-800">{client.company_name || '—'}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-stone-400 block font-medium">Billing Address</span>
                        <span className="text-stone-800">
                          {[client.street_address, client.city, client.state, client.zip_code].filter(Boolean).join(', ') || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-medium">Pure Gold on Ledger</span>
                        <span className="font-mono font-bold text-amber-700">
                          {Number(client.gold_balance_grams || 0).toFixed(3)} g
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Active Price List Summary Card */}
                  <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-5 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs">
                          <i className="fa-solid fa-tags"></i>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                            Customer Assigned Price List: Version {priceList?.version || '01'}
                          </h4>
                          <p className="text-[11px] text-amber-800/80">
                            Status: <strong className="uppercase">{priceList?.status || 'Active'}</strong> · Effective From: {priceList?.effective_from ? new Date(priceList.effective_from).toLocaleDateString('en-IN') : 'Standard'}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/clients/${client.id}/price-list`}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                        <span>Edit Rates</span>
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                      <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                        <span className="text-stone-500 block text-[10px] font-semibold">24K Gold Rate / g</span>
                        <span className="font-mono font-black text-stone-900 text-sm">
                          ₹{Number(priceList?.gold_rates?.rate_24k || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                        <span className="text-stone-500 block text-[10px] font-semibold">22K Gold Rate / g</span>
                        <span className="font-mono font-black text-stone-900 text-sm">
                          ₹{Number(priceList?.gold_rates?.rate_22k || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                        <span className="text-stone-500 block text-[10px] font-semibold">18K Gold Rate / g</span>
                        <span className="font-mono font-black text-stone-900 text-sm">
                          ₹{Number(priceList?.gold_rates?.rate_18k || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                        <span className="text-stone-500 block text-[10px] font-semibold">Making Charges</span>
                        <span className="font-semibold text-stone-900 text-xs">
                          {priceList?.making_charges?.[0]?.labour_charge || 'Standard Rate'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: INVOICES & PURCHASE HISTORY */}
              {activeTab === 'invoices' && (
                <div className="space-y-4">
                  {/* Search and Action Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative flex-1 w-full">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400"></i>
                      <input
                        type="text"
                        value={invoiceSearch}
                        onChange={(e) => setInvoiceSearch(e.target.value)}
                        placeholder="Search invoices by number, ornament name..."
                        className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                      />
                    </div>
                    {outstandingInvoices.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenRecordPayment()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-receipt text-xs"></i>
                        <span>Pay Outstanding</span>
                      </button>
                    )}
                  </div>

                  {/* Invoices Table */}
                  <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                          <th className="px-4 py-3">Invoice No &amp; Date</th>
                          <th className="px-3 py-3">Products &amp; Tags</th>
                          <th className="px-3 py-3 text-right">Weights (Gross/Net/Fine)</th>
                          <th className="px-3 py-3 text-center">Price Ver.</th>
                          <th className="px-3 py-3 text-right">Total</th>
                          <th className="px-3 py-3 text-right">Due</th>
                          <th className="px-3 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredInvoices.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="px-4 py-8 text-center text-stone-400">
                              No invoices found for this customer.
                            </td>
                          </tr>
                        ) : (
                          filteredInvoices.map((inv) => {
                            const rawItems = inv.itemsRelation || [];
                            const grossWt = rawItems.reduce((acc, it) => acc + Number(it.gross_weight || 0), 0);
                            const netWt = rawItems.reduce((acc, it) => acc + Number(it.net_weight || 0), 0);
                            const fineWt = rawItems.reduce((acc, it) => acc + Number(it.fine_gold_weight || 0), 0);
                            const diaWt = rawItems.reduce((acc, it) => acc + Number(it.diamond_weight || 0), 0);

                            return (
                              <tr key={inv.id} className="hover:bg-stone-50/60 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="font-bold text-stone-900 font-mono text-xs">{inv.invoice_no}</div>
                                  <div className="text-[10px] text-stone-400">
                                    {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN') : '—'}
                                  </div>
                                </td>
                                <td className="px-3 py-3 max-w-[200px]">
                                  {rawItems.length > 0 ? (
                                    <div className="space-y-0.5">
                                      {rawItems.slice(0, 2).map((it, i) => (
                                        <div key={i} className="truncate text-stone-800 font-medium">
                                          {it.product_name}
                                          {it.details?.tag_numbers?.[0] && (
                                            <span className="ml-1 text-[10px] font-mono text-stone-400">
                                              ({it.details.tag_numbers[0]})
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                      {rawItems.length > 2 && (
                                        <span className="text-[10px] text-stone-400 italic">+{rawItems.length - 2} more items</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-stone-400">Jewellery Sale</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                                  <div className="text-stone-800 font-bold">{grossWt.toFixed(3)}g / {netWt.toFixed(3)}g</div>
                                  <div className="text-[10px] text-amber-700">24K: {fineWt.toFixed(3)}g {diaWt > 0 && `· Dia: ${diaWt.toFixed(2)}ct`}</div>
                                </td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-mono font-bold text-[10px]">
                                    v{inv.price_list_version || '01'}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                                  ₹{Number(inv.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-3 text-right font-mono font-bold whitespace-nowrap">
                                  <span className={Number(inv.due_amount || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}>
                                    ₹{Number(inv.due_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    (inv.status || '').toLowerCase() === 'paid'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : (inv.status || '').toLowerCase() === 'partial'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}>
                                    {inv.status || 'Unpaid'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedInvoiceForModal(inv)}
                                      className="p-1 text-stone-400 hover:text-[#b01622] transition-colors cursor-pointer"
                                      title="View Detailed Snapshot & Print Invoice"
                                    >
                                      <i className="fa-solid fa-eye text-xs"></i>
                                    </button>
                                    {Number(inv.due_amount || 0) > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenRecordPayment(inv)}
                                        className="p-1 text-stone-400 hover:text-emerald-600 transition-colors cursor-pointer"
                                        title="Record Payment for this Invoice"
                                      >
                                        <i className="fa-solid fa-money-bill-wave text-xs"></i>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: PAYMENT HISTORY & RECORD PAYMENTS */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-stone-500 font-medium">
                      All payment transactions recorded and allocated against invoices.
                    </p>
                    {outstandingInvoices.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenRecordPayment()}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-plus text-xs"></i>
                        <span>Record Payment</span>
                      </button>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                          <th className="px-4 py-3">Receipt / ID</th>
                          <th className="px-3 py-3">Date</th>
                          <th className="px-3 py-3">Invoice Number</th>
                          <th className="px-3 py-3">Payment Method</th>
                          <th className="px-3 py-3">Reference / Txn</th>
                          <th className="px-3 py-3 text-right">Amount Paid</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-4 py-8 text-center text-stone-400">
                              No payments recorded yet for this customer.
                            </td>
                          </tr>
                        ) : (
                          payments.map((p) => (
                            <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-stone-800">
                                #{p.id}
                              </td>
                              <td className="px-3 py-3 text-stone-600 whitespace-nowrap">
                                {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN') : '—'}
                              </td>
                              <td className="px-3 py-3 font-mono font-bold text-[#b01622] whitespace-nowrap">
                                {p.invoice?.invoice_no || `INV-${p.invoice_id}`}
                              </td>
                              <td className="px-3 py-3 uppercase text-stone-700 font-semibold whitespace-nowrap">
                                {p.payment_method || 'Cash'}
                              </td>
                              <td className="px-3 py-3 text-stone-500 font-mono text-[11px]">
                                {p.reference || '—'}
                              </td>
                              <td className="px-3 py-3 text-right font-mono font-black text-emerald-700 whitespace-nowrap text-sm">
                                ₹{Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2 text-stone-400">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditPayment(p)}
                                    className="hover:text-amber-600 transition-colors p-1 cursor-pointer"
                                    title="Edit Payment Record"
                                  >
                                    <i className="fa-regular fa-pen-to-square text-xs"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePaymentSubmit(p)}
                                    className="hover:text-red-600 transition-colors p-1 cursor-pointer"
                                    title="Delete / Reverse Payment"
                                  >
                                    <i className="fa-regular fa-trash-can text-xs"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: CUSTOMER PRICE LIST & VERSIONS */}
              {activeTab === 'price_list' && (
                <div className="space-y-6">
                  {/* Current Active Price List Card */}
                  <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <div>
                        <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                          <span>Active Price List — Version {priceList?.version || '01'}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                            Active Version
                          </span>
                        </h4>
                        <p className="text-xs text-stone-400 mt-0.5">
                          Effective From: {priceList?.effective_from ? new Date(priceList.effective_from).toLocaleDateString('en-IN') : 'Standard'}
                        </p>
                      </div>
                      <Link
                        to={`/clients/${client.id}/price-list`}
                        className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-code-branch text-xs"></i>
                        <span>Create / Manage Versions</span>
                      </Link>
                    </div>

                    {/* Gold Rates Breakdown */}
                    <div>
                      <h5 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                        Metal Rates (₹ / Gram)
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                          <span className="text-stone-400 block text-[10px]">24K Gold</span>
                          <span className="font-mono font-bold text-stone-900 text-sm">
                            ₹{Number(priceList?.gold_rates?.rate_24k || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                          <span className="text-stone-400 block text-[10px]">22K Gold (916)</span>
                          <span className="font-mono font-bold text-stone-900 text-sm">
                            ₹{Number(priceList?.gold_rates?.rate_22k || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                          <span className="text-stone-400 block text-[10px]">18K Gold (750)</span>
                          <span className="font-mono font-bold text-stone-900 text-sm">
                            ₹{Number(priceList?.gold_rates?.rate_18k || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                          <span className="text-stone-400 block text-[10px]">14K Gold</span>
                          <span className="font-mono font-bold text-stone-900 text-sm">
                            ₹{Number(priceList?.gold_rates?.rate_14k || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Making Charges */}
                    {Array.isArray(priceList?.making_charges) && priceList.making_charges.length > 0 && (
                      <div>
                        <h5 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                          Applicable Making Charges
                        </h5>
                        <div className="space-y-1.5">
                          {priceList.making_charges.map((mc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg text-xs border border-stone-200">
                              <span className="font-semibold text-stone-800">{mc.type_design || 'Standard Setting'}</span>
                              <div className="flex items-center gap-3 font-mono">
                                <span className="text-stone-500">Wastage: {mc.wastage_percent || '6%'}</span>
                                <span className="font-bold text-[#b01622]">{mc.labour_charge || 'Standard'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Version History Table */}
                  <div className="bg-white rounded-xl border border-stone-200 shadow-2xs p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                      Historical Price List Versions
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                            <th className="px-4 py-2.5">Version</th>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3 py-2.5">Effective From</th>
                            <th className="px-3 py-2.5">Effective To</th>
                            <th className="px-4 py-2.5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {priceListHistory.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-4 py-4 text-center text-stone-400">
                                Only version 01 is configured.
                              </td>
                            </tr>
                          ) : (
                            priceListHistory.map((pl) => {
                              const isActive = pl.status === 'active';
                              return (
                                <tr key={pl.id} className="hover:bg-stone-50/60">
                                  <td className="px-4 py-2.5 font-mono font-bold text-stone-900">
                                    v{pl.version}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      isActive
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-stone-100 text-stone-600'
                                    }`}>
                                      {pl.status || 'archived'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-stone-600 font-mono">
                                    {pl.effective_from ? new Date(pl.effective_from).toLocaleDateString('en-IN') : '—'}
                                  </td>
                                  <td className="px-3 py-2.5 text-stone-500">
                                    {pl.effective_to || 'Open'}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    {isActive ? (
                                      <span className="text-[10px] font-bold text-emerald-600">Currently Active</span>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={activatingVersion}
                                        onClick={() => handleActivatePriceListVersion(pl.id)}
                                        className="px-2.5 py-1 bg-stone-100 hover:bg-emerald-600 hover:text-white text-stone-700 text-[10px] font-bold rounded shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                      >
                                        Activate
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: RECORD PAYMENT MODAL */}
      {showRecordPaymentModal && (
        <div className="fixed inset-0 z-60 overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs" onClick={() => setShowRecordPaymentModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 z-10 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <i className="fa-solid fa-hand-holding-dollar text-emerald-600"></i>
                <span>Record Invoice Payment</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRecordPaymentModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Select Outstanding Invoice</label>
                <select
                  value={paymentTargetInvoiceId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPaymentTargetInvoiceId(id);
                    if (id === 'auto_all') {
                      const totalDue = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.due_amount || 0), 0);
                      setPaymentAmount(totalDue > 0 ? totalDue.toFixed(2) : '');
                    } else {
                      const matched = outstandingInvoices.find((i) => i.id === Number(id));
                      if (matched) setPaymentAmount(matched.due_amount);
                    }
                  }}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white font-mono"
                  required
                >
                  <option value="auto_all">⚡ Auto-Allocate Across Open Invoices (FIFO / On-Account)</option>
                  {outstandingInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_no} — Due: ₹{Number(inv.due_amount).toLocaleString('en-IN')} (Total: ₹{Number(inv.total_amount).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono font-bold text-stone-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer / NEFT / IMPS</option>
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Reference / Transaction Number (Optional)</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Txn ID, UTR or Cheque No."
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowRecordPaymentModal(false)}
                  className="px-4 py-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {recordingPayment ? 'Recording...' : 'Submit Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PAYMENT MODAL */}
      {editingPayment && (
        <div className="fixed inset-0 z-60 overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs" onClick={() => setEditingPayment(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 z-10 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square text-amber-600"></i>
                <span>Edit Payment #{editingPayment.id}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleUpdatePaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Invoice Number</label>
                <div className="px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 font-mono font-bold text-stone-700">
                  {editingPayment.invoice?.invoice_no || `INV-${editingPayment.invoice_id}`}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Corrected Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editPaymentAmount}
                  onChange={(e) => setEditPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono font-bold text-stone-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Payment Method</label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer / NEFT / IMPS</option>
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Reference Number</label>
                <input
                  type="text"
                  value={editPaymentReference}
                  onChange={(e) => setEditPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-4 py-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPayment}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {updatingPayment ? 'Updating...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INVOICE DETAILS & PRINT MODAL */}
      {selectedInvoiceForModal && (
        <div className="fixed inset-0 z-60 overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs" onClick={() => setSelectedInvoiceForModal(null)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col z-10 animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Tax Invoice Snapshot — {selectedInvoiceForModal.invoice_no}
                </h3>
                <p className="text-xs text-stone-400">
                  Issued on {selectedInvoiceForModal.invoice_date ? new Date(selectedInvoiceForModal.invoice_date).toLocaleDateString('en-IN') : '—'} · Price List Version: v{selectedInvoiceForModal.price_list_version || '01'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printElement('customer-invoice-print-area', `Invoice ${selectedInvoiceForModal.invoice_no}`)}
                  className="px-3 py-1.5 bg-[#b01622] hover:bg-[#8e111a] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-print"></i>
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForModal(null)}
                  className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
            </div>

            {/* Modal Body / Printable Area */}
            <div id="customer-invoice-print-area" className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-sans">
              <div className="flex items-start justify-between pb-4 border-b border-stone-200">
                <div>
                  <h2 className="text-lg font-black text-[#b01622] uppercase tracking-wide">RUDRA JEWELLERY</h2>
                  <p className="text-[11px] text-stone-500">Fine Gold &amp; Diamond Jewellery</p>
                  <p className="text-[11px] text-stone-500">Coimbatore, Tamil Nadu</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-0.5 rounded bg-stone-100 font-bold font-mono text-stone-800 text-xs">
                    {selectedInvoiceForModal.invoice_no}
                  </span>
                  <div className="text-[11px] text-stone-500 mt-1">
                    Date: {selectedInvoiceForModal.invoice_date ? new Date(selectedInvoiceForModal.invoice_date).toLocaleDateString('en-IN') : '—'}
                  </div>
                </div>
              </div>

              {/* Billed To */}
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                <span className="text-[10px] font-bold uppercase text-stone-400 block">Billed To</span>
                <span className="font-bold text-stone-900 text-sm">{selectedInvoiceForModal.client_name || client.full_name}</span>
                <div className="text-stone-600 text-[11px]">
                  Customer Code: {client.client_code} · Phone: {client.primary_phone || '—'}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-600 font-bold text-[10px] uppercase">
                    <th className="p-2">Item Description</th>
                    <th className="p-2 text-right">Gross Wt</th>
                    <th className="p-2 text-right">Net Wt</th>
                    <th className="p-2 text-right">24K Fine</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {(selectedInvoiceForModal.itemsRelation || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium text-stone-800">
                        {it.product_name}
                        {it.details?.tag_numbers?.[0] && (
                          <div className="text-[10px] text-stone-400 font-mono">Tag: {it.details.tag_numbers[0]}</div>
                        )}
                      </td>
                      <td className="p-2 text-right font-mono">{Number(it.gross_weight || 0).toFixed(3)}g</td>
                      <td className="p-2 text-right font-mono">{Number(it.net_weight || 0).toFixed(3)}g</td>
                      <td className="p-2 text-right font-mono text-amber-700 font-bold">{Number(it.fine_gold_weight || 0).toFixed(3)}g</td>
                      <td className="p-2 text-right font-mono">₹{Number(it.rate || 0).toLocaleString('en-IN')}</td>
                      <td className="p-2 text-right font-mono font-bold text-stone-900">
                        ₹{Number(it.line_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Breakdown */}
              <div className="flex justify-end pt-3 border-t border-stone-200">
                <div className="w-64 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Grand Total:</span>
                    <strong className="text-stone-900 font-bold">
                      ₹{Number(selectedInvoiceForModal.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Paid Amount:</span>
                    <strong>₹{Number(selectedInvoiceForModal.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="flex justify-between text-red-600 font-bold text-sm pt-1 border-t border-stone-200">
                    <span>Balance Due:</span>
                    <span>₹{Number(selectedInvoiceForModal.due_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
