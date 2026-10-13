import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function JobOrderDelay() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const queryParams = new URLSearchParams(location.search);
  const queryOrderId = queryParams.get('order_id');

  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [delayStatus, setDelayStatus] = useState('Delay');
  const [delayReason, setDelayReason] = useState('Stone not available');
  const [delayDays, setDelayDays] = useState(5);
  const [expectedDate, setExpectedDate] = useState('2024-05-03');
  const [remarks, setRemarks] = useState('Required stones are out of stock. Waiting for new stock arrival.');

  const [delayHistory, setDelayHistory] = useState([]);

  // Format Helpers
  const formatWeight = (val, fallback = '0.000') => {
    if (val === undefined || val === null || val === '') return fallback;
    const num = parseFloat(val);
    if (isNaN(num)) return fallback;
    return num.toFixed(3);
  };

  const formatDateDisplay = (dateStr, fallback = '—') => {
    if (!dateStr) return fallback;
    const s = String(dateStr).trim();
    if (s.includes('-')) {
      const parts = s.split('T')[0].split('-');
      if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return s;
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const fetchOrdersList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/work-orders/delays');
      const list = res.data.data || [];
      setOrders(list);
      return list;
    } catch (err) {
      console.warn('Failed to load delayed orders list:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrderDetails = useCallback(async (id, isSilent = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      const res = await api.get(`/work-orders/${id}`);
      const o = res.data.data;
      setCurrentOrder(o);

      if (o.delay_history && Array.isArray(o.delay_history) && o.delay_history.length > 0) {
        setDelayHistory(o.delay_history);
      }

      setDelayDays(Number(o.delay_days || 0));
      setDelayReason(o.delay_reason || 'Stone not available');
      setRemarks(o.delay_remarks || o.karigar_notes || o.notes || '');
      setExpectedDate(o.delivery_date ? String(o.delivery_date).split('T')[0] : '');

    } catch (err) {
      console.error('Failed to load work order:', err);
      if (!isSilent) showToast?.('Failed to load work order details', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const list = await fetchOrdersList();
      if (!isMounted) return;

      if (queryOrderId) {
        const isDelayed = list.some((item) => String(item.id) === String(queryOrderId));
        if (isDelayed) {
          await fetchOrderDetails(queryOrderId);
        } else {
          setCurrentOrder(null);
        }
      } else {
        setCurrentOrder(null);
      }
    })();

    return () => { isMounted = false; };
  }, [queryOrderId, fetchOrdersList, fetchOrderDetails]);

  const handleSelectRow = (wo) => {
    navigate(`/job-order/delay?order_id=${wo.id}`);
  };

  const handleBackToList = () => {
    setCurrentOrder(null);
    navigate('/job-order/delay');
  };

  const handleDelayDaysChange = (newDays) => {
    const days = Math.max(0, parseInt(newDays, 10) || 0);
    setDelayDays(days);
    const baseStr = currentOrder?.delivery_date || new Date().toISOString();
    try {
      const baseDate = new Date(baseStr);
      baseDate.setDate(baseDate.getDate() + days);
      setExpectedDate(baseDate.toISOString().split('T')[0]);
    } catch {}
  };

  const handleExpectedDateChange = (newDateStr) => {
    setExpectedDate(newDateStr);
    const baseStr = currentOrder?.delivery_date || new Date().toISOString();
    try {
      const baseDate = new Date(baseStr);
      const newDate = new Date(newDateStr);
      const diffTime = newDate.getTime() - baseDate.getTime();
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      setDelayDays(diffDays);
    } catch {}
  };

  const handleSaveDelay = async (e) => {
    e.preventDefault();
    if (!currentOrder) return;
    try {
      setSaving(true);
      const payload = {
        is_delayed: true,
        delay_days: delayDays,
        delay_reason: delayReason,
        delay_remarks: remarks,
        delivery_date: expectedDate || null,
        remarks: remarks,
      };

      await api.post(`/work-orders/${currentOrder.id}/wip-update`, payload);
      showToast?.('Delay details updated successfully!', 'success');
      fetchOrderDetails(currentOrder.id, true);
      fetchOrdersList();
    } catch (err) {
      console.error('Failed to update delay details:', err);
      showToast?.(err.response?.data?.message || 'Failed to update delay details', 'error');
    } finally {
      setSaving(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredOrders = orders.filter(wo => {
    const term = searchTerm.toLowerCase();
    return (
      wo.work_order_number?.toLowerCase().includes(term) ||
      wo.product_name?.toLowerCase().includes(term) ||
      wo.karigar_name?.toLowerCase().includes(term) ||
      wo.karigar?.name?.toLowerCase().includes(term)
    );
  });

  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const subNavLinks = [
    { name: 'Work In Progress', path: '/job-order/in-progress' },
    { name: 'Delay / Job Details', path: '/job-order/delay', active: true },
    { name: 'Quality Check', path: '/job-order/quality-check' },
    { name: 'Ready', path: '/job-order/ready' },
    { name: 'Certification', path: '/job-order/certification' },
    { name: 'Hallmarking', path: '/job-order/hallmarking' },
    { name: 'History', path: '/job-order/history' }
  ];

  const jobId = currentOrder?.design_code || currentOrder?.work_order_number || (currentOrder?.id ? `WO-2026-000${currentOrder.id}` : 'WO-2026-0004');
  const clientId = currentOrder?.client?.client_code || (currentOrder?.client_id ? `CL-${currentOrder.client_id}` : 'CL-1001');
  const clientName = currentOrder?.customer_name || currentOrder?.client?.full_name || currentOrder?.client?.name || 'Malabar Gold & Diamonds';
  const karigarName = currentOrder?.karigar?.name || currentOrder?.karigar_name || 'Amit Varma (Artisan)';
  const allotmentDate = formatDateDisplay(currentOrder?.allotted_date || currentOrder?.created_at, '19/09/2026');

  if (loading && !currentOrder && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-stone-400 gap-3 font-['Inter',sans-serif]">
        <div className="w-10 h-10 border-4 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-stone-600">Loading Delay &amp; Job Details...</span>
      </div>
    );
  }

  return (
    <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-[#1c1917]">
      
      {/* 1. BREADCRUMB & TOP HEADER MATCHING WORK IN PROGRESS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[12px] text-stone-500 font-medium mb-1">
            <span>Manufacturing</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span>Job Orders</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span>Reception</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span className="text-stone-800 font-semibold">Delay / Job Details</span>
          </div>

          {/* Main Title & Search Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight">
              Dealy/ Job Details {currentOrder ? `- ${jobId}` : ''}
            </h1>

            {!currentOrder && (
              <div className="relative w-full sm:w-80">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Search Work Order No, Product, Artisan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-7 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622] shadow-2xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Back Buttons */}
        <div className="flex items-center gap-2">
          {currentOrder && (
            <button
              type="button"
              onClick={handleBackToList}
              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-md shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-list text-[11px] text-stone-600"></i>
              <span>All Delayed Jobs List</span>
            </button>
          )}

        </div>
      </div>

      {/* 2. SUB NAVIGATION TABS MATCHING IMAGE 1 EXACTLY */}
      <div className="border-b border-[#ebd0cb]">
        <div className="flex items-center gap-10 overflow-x-auto no-scrollbar">
          <Link
            to="/job-order/in-progress"
            className="pb-3 text-[14px] font-bold text-[#6e2d27] hover:text-[#b01622] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
          >
            Work In Progress
          </Link>

          <Link
            to="/job-order/delay"
            className="pb-3 text-[14px] font-bold text-[#5c2725] border-b-2 border-[#b01622] whitespace-nowrap cursor-pointer"
          >
            Delay / Job Details
          </Link>

          <Link
            to="/job-order/quality-check"
            className="pb-3 text-[14px] font-bold text-[#6e2d27] hover:text-[#b01622] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
          >
            Quality Check
          </Link>

          <Link
            to="/job-order/ready"
            className="pb-3 text-[14px] font-bold text-[#6e2d27] hover:text-[#b01622] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
          >
            Ready
          </Link>

          <Link
            to="/job-order/certification"
            className="pb-3 text-[14px] font-bold text-[#6e2d27] hover:text-[#b01622] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
          >
            Certification
          </Link>

          <Link
            to="/job-order/hallmarking"
            className="pb-3 text-[14px] font-bold text-[#6e2d27] hover:text-[#b01622] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
          >
            Hallmarking
          </Link>

          <Link
            to="/job-order/history"
            className="pb-3 text-[14px] font-bold text-[#6e2d27] hover:text-[#b01622] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
          >
            History
          </Link>
        </div>
      </div>

      {/* 3. CONDITIONAL RENDER: PRODUCT ROWS TABLE OR SPECIFIC PRODUCT DELAY FORM */}
      {!currentOrder ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#111827] tracking-tight">
                Delayed &amp; On-Hold Job Orders ({filteredOrders.length})
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Click any product row to view and update delay details.
              </p>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-stone-400">
              <i className="fa-solid fa-triangle-exclamation text-4xl text-stone-300 mb-2 block"></i>
              <p className="font-semibold text-base text-stone-700">No Delayed Jobs Found</p>
              <p className="text-xs text-stone-400 mt-1">All active jobs are running on schedule.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <th className="py-3 px-4">WORK ORDER NO</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Aachari / Artisan</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-center">Delay Days</th>
                    <th className="py-3 px-4 text-right">Pending Wt</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedOrders.map((wo) => (
                    <tr
                      key={wo.id}
                      onClick={() => handleSelectRow(wo)}
                      className="hover:bg-stone-50/80 transition-all cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#b01622]">
                        {wo.work_order_number}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-stone-900">
                        {wo.product_name}
                        <span className="block font-mono text-[10px] text-stone-400 font-normal">
                          {wo.karat || '22K'} Gold
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-700 font-medium">
                        {wo.karigar?.name || wo.karigar_name || 'In-House'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#b01622] font-semibold">
                        {formatDateDisplay(wo.delivery_date)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {wo.delay_days || 5} Days Overdue
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#b01622]">
                        {Number(wo.pending_weight || 0).toFixed(3)}g
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRow(wo);
                          }}
                          className="px-3.5 py-1 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap inline-flex items-center gap-1"
                        >
                          <span>Update Delay</span>
                          <i className="fa-solid fa-chevron-right text-[10px]"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredOrders.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-100 mt-4">
              <div className="text-xs text-stone-500 font-medium">
                Showing <span className="font-bold text-stone-800">{startIndex + 1}</span> to{' '}
                <span className="font-bold text-stone-800">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{' '}
                <span className="font-bold text-stone-800">{totalItems}</span> entries
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 bg-white border border-stone-200 rounded-md text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <i className="fa-solid fa-chevron-left text-[10px]"></i>
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) {
                        acc.push(<span key={`dots-${p}`} className="px-1 text-stone-400 text-xs font-bold">...</span>);
                      }
                      acc.push(
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            p === safePage
                              ? 'bg-[#b01622] text-white shadow-2xs'
                              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          {p}
                        </button>
                      );
                      return acc;
                    }, [])}
                </div>

                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 bg-white border border-stone-200 rounded-md text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <span>Next</span>
                  <i className="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* SINGLE DELAYED PRODUCT UPDATE FORM */
        <div className="space-y-6">
          
          {/* Top Info Bar */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <span className="text-[11px] font-semibold text-stone-400 block mb-1">Job ID</span>
              <span className="text-sm font-bold text-stone-900 block">{jobId}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-400 block mb-1">Client ID</span>
              <span className="text-sm font-bold text-stone-900 block">{clientId}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-400 block mb-1">Client Name</span>
              <span className="text-sm font-bold text-stone-900 block truncate" title={clientName}>{clientName}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-400 block mb-1">Assigned Karigar</span>
              <span className="text-sm font-bold text-stone-900 block truncate" title={karigarName}>{karigarName}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-400 block mb-1">Allotment Date</span>
              <span className="text-sm font-bold text-stone-900 block">{allotmentDate}</span>
            </div>
          </div>

          {/* Form & Summary 2-Column Grid */}
          <form onSubmit={handleSaveDelay} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left 8 Cols: Delay / Hold Details Form */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200/80 p-6 shadow-2xs space-y-5">
              <h2 className="text-base font-bold text-stone-900 tracking-tight">Delay / Hold Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Delay / Hold Status <span className="text-[#b01622]">*</span>
                  </label>
                  <select
                    value={delayStatus}
                    onChange={(e) => setDelayStatus(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="Delay">Delay</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Delay Reason <span className="text-[#b01622]">*</span>
                  </label>
                  <select
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="Stone not available">Stone not available</option>
                    <option value="Karigar Leave / Sick">Karigar Leave / Sick</option>
                    <option value="Design Revision Required">Design Revision Required</option>
                    <option value="Casting Defect / Rework">Casting Defect / Rework</option>
                    <option value="Hallmark Center Delay">Hallmark Center Delay</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Delay Days <span className="text-[#b01622]">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={delayDays}
                    onChange={(e) => handleDelayDaysChange(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Expected Completion Date <span className="text-[#b01622]">*</span>
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => handleExpectedDateChange(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Detailed Reason / Remarks <span className="text-[#b01622]">*</span>
                </label>
                <textarea
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs text-stone-800 placeholder-stone-400 focus:outline-hidden focus:border-[#b01622] resize-none"
                  placeholder="Explain the detailed cause of delay..."
                  required
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-lg font-bold text-xs transition-all shadow-xs cursor-pointer"
                >
                  {saving ? 'Saving Updates...' : 'Save Delay Update'}
                </button>
              </div>
            </div>

            {/* Right 4 Cols: Job & Item Summary */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-stone-200/80 p-6 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-stone-900 tracking-tight">Job &amp; Item Summary</h2>

              <div className="space-y-2.5 text-xs bg-stone-50/70 p-4 rounded-xl border border-stone-100">
                <div className="flex justify-between"><span className="text-stone-500">Job Type</span><span className="font-semibold text-stone-900">{currentOrder?.product_name || '22K Royal Kundan Bridals'}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Category</span><span className="font-semibold text-stone-900">{currentOrder?.category_name || 'Gold Necklaces'}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Material</span><span className="font-semibold text-stone-900">{currentOrder?.material_type || 'Gold 22K (916)'}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Purity</span><span className="font-semibold text-stone-900">{currentOrder?.karat || '22KT'}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Weight (Alloc.)</span><span className="font-semibold font-mono text-stone-900">{formatWeight(currentOrder?.allotted_weight || 120.000)} g</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Completed Weight</span><span className="font-semibold font-mono text-emerald-700">{formatWeight(currentOrder?.completed_weight || 40.000)} g</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Pending Weight</span><span className="font-bold font-mono text-[#b01622]">{formatWeight(currentOrder?.pending_weight || 80.000)} g</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Due Date</span><span className="font-semibold text-stone-900">{formatDateDisplay(currentOrder?.delivery_date, '26/09/2026')}</span></div>
                <div className="flex justify-between border-t border-stone-200 pt-2"><span className="text-stone-500">New Expected Date</span><span className="font-bold text-[#b01622]">{formatDateDisplay(expectedDate, '26/09/2026')}</span></div>
              </div>

              <div className="bg-red-50/50 rounded-xl p-4 border border-red-100 text-center">
                <span className="text-[10.5px] font-bold text-stone-500 uppercase tracking-wider block">Total Amount</span>
                <span className="text-xl font-black text-[#b01622] font-mono block mt-0.5">
                  {formatCurrency(currentOrder?.total_price || 838800)}
                </span>
              </div>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}
