import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function BillingDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { showToast } = useToast();
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [deleteTargetInv, setDeleteTargetInv] = useState(null);

  // New invoice form
  const [newClient, setNewClient] = useState('Meera Singhania|meera.s@regal.com|elite');
  const [newAmount, setNewAmount] = useState('');
  const [newGst, setNewGst] = useState('5');
  const [newStatus, setNewStatus] = useState('paid');

  useEffect(() => {
    api.get('/billing')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622] mr-2"></i>
        Loading billing data...
      </div>
    );
  }

  const stats = data?.stats || {};
  const invoices = data?.invoices || [];

  const filteredInvoices = invoices.filter(inv => {
    const matchTier = tierFilter === 'all' || inv.tierKey === tierFilter;
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchTier && matchStatus;
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleCreateInvoice = (e) => {
    e.preventDefault();
    const parts = newClient.split('|');
    const name = parts[0];
    const email = parts[1];
    const tierKey = parts[2];
    const amount = parseFloat(newAmount) || 0;
    const gstRate = parseFloat(newGst) || 5;
    const gst = (amount * gstRate) / 100;
    const total = amount + gst;

    const newInv = {
      id: `INV- 2026-${Math.floor(1000 + Math.random() * 9000)}`,
      client: name,
      email,
      tier: tierKey.toUpperCase(),
      tierKey,
      date: 'Today',
      amount,
      gst,
      total,
      status: newStatus,
      initials: name.split(' ').map(n => n[0]).join('')
    };

    setData(prev => ({
      ...prev,
      invoices: [newInv, ...prev.invoices]
    }));

    setShowCreateModal(false);
    setNewAmount('');
    showToast(`Invoice ${newInv.id} created successfully!`, 'success', 'Invoice Generated');
  };

  const handleExportReport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Invoice ID,Client Name,Date,Amount,GST,Total,Status\n" +
      invoices.map(i => `${i.id},${i.client},${i.date},${i.amount},${i.gst},${i.total},${i.status}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "billing_report_2026.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Billing report exported to CSV', 'info', 'Export Complete');
  };

  const handleConfirmDeleteInvoice = () => {
    if (!deleteTargetInv) return;
    setData(prev => ({
      ...prev,
      invoices: prev.invoices.filter(i => i.id !== deleteTargetInv.id)
    }));
    showToast(`Invoice ${deleteTargetInv.id} deleted successfully`, 'success', 'Deleted');
    setDeleteTargetInv(null);
  };

  return (
    <div className="w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            ADMINISTRATIVE PORTAL <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-500">BILLING OVERVIEW</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Dashboard</h1>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleExportReport} className="px-4 py-2.5 bg-white border border-[#b01622] text-[#b01622] hover:bg-red-50 text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors">
            <i className="fa-solid fa-arrow-up-from-bracket text-xs"></i>
            EXPORT REPORT
          </button>

          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors">
            <i className="fa-solid fa-plus text-xs"></i>
            CREATE INVOICE
          </button>
        </div>
      </div>

      {/* 4 Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-base">
              <i className="fa-regular fa-file-lines"></i>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Today Invoices</p>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.todayInvoices}</div>
            <div className="flex items-center text-xs font-semibold text-emerald-600 gap-1">
              <i className="fa-solid fa-arrow-trend-up text-[10px]"></i> 10.2% <span className="text-gray-400 font-normal">vs last month</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-base">
              <i className="fa-regular fa-credit-card"></i>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Today's Billings</p>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.todayBillings}</div>
            <div className="flex items-center text-xs font-semibold text-emerald-600 gap-1">
              <i className="fa-solid fa-arrow-trend-up text-[10px]"></i> 15.5% <span className="text-gray-400 font-normal">vs yesterday</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-base">
              <i className="fa-regular fa-clock"></i>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Pending Bills</p>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.pendingBills}</div>
            <div className="flex items-center text-xs font-semibold text-rose-500 gap-1">
              <i className="fa-solid fa-arrow-trend-down text-[10px]"></i> 5.3% <span className="text-gray-400 font-normal">vs last month</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-base">
              <i className="fa-solid fa-user-plus"></i>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Total Revenue (FY)</p>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalRevenue}</div>
            <div className="flex items-center text-xs font-semibold text-emerald-600 gap-1">
              <i className="fa-solid fa-arrow-trend-up text-[10px]"></i> 8.2% <span className="text-gray-400 font-normal">vs last year</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">DATE RANGE</label>
              <button className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="fa-regular fa-calendar text-gray-400"></i>
                  Last 30 Days
                </span>
                <i className="fa-solid fa-chevron-down text-gray-400 text-[10px]"></i>
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">CLIENT TIER</label>
              <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#b01622]">
                <option value="all">All Tiers</option>
                <option value="elite">Platinum Elite</option>
                <option value="gold">Gold Member</option>
                <option value="silver">Silver Member</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">PAYMENT STATUS</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#b01622]">
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">INVOICE TYPE</label>
              <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#b01622]">
                <option value="tax">B2B Tax Invoice</option>
                <option value="retail">Retail Invoice</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end lg:self-center">
            <Link to="/clients/create" className="px-4 py-2.5 bg-[#b01622] text-white text-xs font-bold rounded-lg hover:bg-[#90121b] transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap">
              <i className="fa-solid fa-bars-staggered text-xs"></i>
              Quick Add Clients
            </Link>
            <button onClick={() => { setTierFilter('all'); setStatusFilter('all'); }} className="text-xs font-bold text-gray-500 hover:text-gray-900 px-3 py-2.5 transition-colors">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-900">Recent Invoices</h2>
        <span className="text-xs text-gray-500">Showing {filteredInvoices.length} entries</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f6eee9] border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4">INVOICE ID</th>
                <th className="px-6 py-4">CLIENT DETAILS</th>
                <th className="px-6 py-4">DATE</th>
                <th className="px-6 py-4 text-right">AMOUNT</th>
                <th className="px-6 py-4 text-right">GST</th>
                <th className="px-6 py-4 text-right">TOTAL</th>
                <th className="px-6 py-4 text-center">STATUS</th>
                <th className="px-6 py-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {paginatedInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 font-bold text-[#b01622] text-xs">{inv.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#fde68a] text-[#854d0e] flex items-center justify-center font-bold text-xs shrink-0">
                        {inv.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm">{inv.client}</span>
                          <span className="bg-[#fde68a] text-[#854d0e] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{inv.tier}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{inv.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-600">{inv.date}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-800">₹ {inv.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-gray-500">₹ {inv.gst?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">₹ {inv.total?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                      inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                      inv.status === 'pending' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        inv.status === 'paid' ? 'bg-emerald-500' :
                        inv.status === 'pending' ? 'bg-red-500' : 'bg-amber-500'
                      }`}></span>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <button onClick={() => setSelectedInvoice(inv)} className="p-1 hover:text-gray-700 transition-colors" title="View Invoice"><i className="fa-regular fa-eye text-sm"></i></button>
                      <button onClick={() => window.print()} className="p-1 hover:text-gray-700 transition-colors" title="Print Invoice"><i className="fa-solid fa-print text-sm"></i></button>
                      <button onClick={() => setDeleteTargetInv(inv)} className="p-1 hover:text-red-600 transition-colors" title="Delete Invoice"><i className="fa-regular fa-trash-can text-sm"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredInvoices.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
          onItemsPerPageChange={(num) => {
            setItemsPerPage(num);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <h3 className="text-lg font-bold text-gray-900">Create New Invoice</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Client</label>
                <select value={newClient} onChange={(e) => setNewClient(e.target.value)} required className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#b01622]">
                  <option value="Meera Singhania|meera.s@regal.com|elite">Meera Singhania (Platinum Elite)</option>
                  <option value="Rajesh Khanna|khanna.ra@rkgroup.in|gold">Rajesh Khanna (Gold Member)</option>
                  <option value="Ananya Iyer|ananya.i@techcorp.com|silver">Ananya Iyer (Silver Member)</option>
                  <option value="Vikram Malhotra|vikram.m@heritage.in|elite">Vikram Malhotra (Platinum Elite)</option>
                  <option value="Sneha Reddy|sneha@reddy.me|gold">Sneha Reddy (Gold Member)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (₹)</label>
                  <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} required placeholder="85000" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#b01622]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">GST Rate (%)</label>
                  <input type="number" value={newGst} onChange={(e) => setNewGst(e.target.value)} required placeholder="5" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#b01622]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} required className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#b01622]">
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#b01622] hover:bg-[#90121b] text-white rounded-lg text-sm font-semibold shadow-sm">Generate Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW INVOICE PREVIEW MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <div className="text-xs font-bold text-[#b01622]">{selectedInvoice.id}</div>
                <h3 className="text-base font-bold text-gray-900">{selectedInvoice.client}</h3>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-600 text-lg">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Invoice Date:</span>
                <span className="font-semibold text-gray-900">{selectedInvoice.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Payment Status:</span>
                <span className="font-bold text-emerald-600 uppercase">{selectedInvoice.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Subtotal Amount:</span>
                <span className="font-semibold text-gray-900">₹ {selectedInvoice.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">GST Tax (5%):</span>
                <span className="font-semibold text-gray-900">₹ {selectedInvoice.gst?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold bg-red-50 p-2.5 rounded-lg text-gray-900">
                <span>Total Amount:</span>
                <span className="text-[#b01622]">₹ {selectedInvoice.total?.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex-1 py-2 bg-[#b01622] text-white text-xs font-semibold rounded-lg hover:bg-[#90121b] transition-colors flex items-center justify-center gap-2">
                <i className="fa-solid fa-print"></i> Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE INVOICE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetInv}
        title="Delete Billing Invoice?"
        message={
          deleteTargetInv
            ? `Are you sure you want to delete invoice "${deleteTargetInv.id}" for ${deleteTargetInv.client}? This record will be permanently removed.`
            : ''
        }
        confirmText="Delete Invoice"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteInvoice}
        onCancel={() => setDeleteTargetInv(null)}
      />

    </div>
  );
}
