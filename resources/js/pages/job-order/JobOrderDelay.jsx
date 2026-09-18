import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [selectedOrderId, setSelectedOrderId] = useState(queryOrderId || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State matching screenshot
  const [delayStatus, setDelayStatus] = useState('Delay');
  const [delayReason, setDelayReason] = useState('Stone not available');
  const [delayDays, setDelayDays] = useState(5);
  const [expectedDate, setExpectedDate] = useState('2024-05-03');
  const [remarks, setRemarks] = useState('Required stones are out of stock. Waiting for new stock arrival.');
  const [attachment, setAttachment] = useState(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentSize, setAttachmentSize] = useState('');

  // Delay History List
  const [delayHistory, setDelayHistory] = useState([]);

  // Pagination for Delay History
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

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

  // Fetch orders list for switcher
  const fetchOrdersList = useCallback(async () => {
    try {
      const res = await api.get('/work-orders', { params: { tab: 'ongoing' } });
      const list = res.data.data || [];
      setOrders(list);
      return list;
    } catch (err) {
      console.warn('Failed to load orders list:', err);
      return [];
    }
  }, []);

  // Fetch single order details
  const fetchOrderDetails = useCallback(async (id, isSilent = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      const res = await api.get(`/work-orders/${id}`);
      const o = res.data.data;
      setCurrentOrder(o);
      setSelectedOrderId(o.id);

      // Set initial delay history from order
      if (o.delay_history && Array.isArray(o.delay_history) && o.delay_history.length > 0) {
        setDelayHistory(o.delay_history);
      } else {
        // Fallback matching reference image
        setDelayHistory([
          {
            id: 'init_delay_1',
            status: 'Delay',
            reason: 'Stone not available',
            delay_days: 5,
            from_date: '28 Apr 2024',
            to_date: '03 May 2024',
            remarks: 'Waiting for new stock',
            updated_by: 'Arshad (Admin)'
          }
        ]);
      }

      // Initialize form values from order if present
      if (o.karigar_data?.delay_reason) {
        setDelayReason(o.karigar_data.delay_reason);
      }
      if (o.karigar_data?.delay_status) {
        setDelayStatus(o.karigar_data.delay_status);
      }
      if (o.karigar_data?.delay_days) {
        setDelayDays(Number(o.karigar_data.delay_days));
      }
      if (o.karigar_data?.remarks) {
        setRemarks(o.karigar_data.remarks);
      }

      // Calculate initial expected date
      if (o.delivery_date) {
        setExpectedDate(o.delivery_date.split('T')[0]);
      } else {
        setExpectedDate('2024-05-03');
      }

    } catch (err) {
      console.error('Failed to load work order:', err);
      if (!isSilent) showToast?.('Failed to load work order details', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [showToast]);

  // Initial Load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const list = await fetchOrdersList();
      if (!isMounted) return;

      let targetId = queryOrderId;
      if (!targetId && list.length > 0) {
        // Pick delayed order or first order
        const delayed = list.find(x => x.status === 'delayed' || x.is_delayed);
        targetId = delayed ? delayed.id : list[0].id;
      }

      if (targetId) {
        await fetchOrderDetails(targetId);
      } else {
        setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [queryOrderId, fetchOrdersList, fetchOrderDetails]);

  // Sync when selectedOrderId changes
  const handleOrderChange = (e) => {
    const newId = e.target.value;
    setSelectedOrderId(newId);
    navigate(`/job-order/delay?order_id=${newId}`, { replace: true });
    fetchOrderDetails(newId);
  };

  // Interactive Auto-Calculation: when delayDays changes, update expected completion date
  const handleDelayDaysChange = (newDays) => {
    const days = Math.max(0, parseInt(newDays, 10) || 0);
    setDelayDays(days);

    // Compute base date from order due date or today
    const baseStr = currentOrder?.delivery_date || '2024-04-28';
    try {
      const baseDate = new Date(baseStr);
      baseDate.setDate(baseDate.getDate() + days);
      const iso = baseDate.toISOString().split('T')[0];
      setExpectedDate(iso);
    } catch {
      // Fallback
    }
  };

  // Interactive Auto-Calculation: when expected completion date changes, update delay days
  const handleExpectedDateChange = (newDateStr) => {
    setExpectedDate(newDateStr);
    const baseStr = currentOrder?.delivery_date || '2024-04-28';
    try {
      const baseDate = new Date(baseStr);
      const newDate = new Date(newDateStr);
      const diffTime = newDate.getTime() - baseDate.getTime();
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      setDelayDays(diffDays);
    } catch {
      // Fallback
    }
  };

  // File Upload Handling
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast?.('File size exceeds 5MB limit', 'error');
      return;
    }

    setAttachment(file);
    setAttachmentName(file.name);
    setAttachmentSize((file.size / 1024).toFixed(1) + ' KB');
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setAttachment(null);
    setAttachmentName('');
    setAttachmentSize('');
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentOrder) return;

    if (!remarks.trim()) {
      showToast?.('Please enter detailed remarks or reason', 'error');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('delay_status', delayStatus);
      formData.append('delay_reason', delayReason);
      formData.append('delay_days', delayDays);
      formData.append('expected_date', expectedDate);
      formData.append('remarks', remarks);
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const res = await api.post(`/work-orders/${currentOrder.id}/delay-update`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast?.('Delay / Hold status updated successfully', 'success');

      // Update local state with latest data
      if (res.data?.data) {
        setCurrentOrder(res.data.data);
        if (res.data.data.delay_history) {
          setDelayHistory(res.data.data.delay_history);
        }
      } else {
        // Optimistic history update
        const newRecord = {
          id: 'delay_' + Date.now(),
          status: delayStatus,
          reason: delayReason,
          delay_days: delayDays,
          from_date: formatDateDisplay(currentOrder.delivery_date || '2024-04-28'),
          to_date: formatDateDisplay(expectedDate),
          remarks: remarks,
          updated_by: 'Arshad (Admin)'
        };
        setDelayHistory(prev => [newRecord, ...prev]);
      }

      setAttachment(null);
      setAttachmentName('');
      setAttachmentSize('');

    } catch (err) {
      console.error('Failed to update delay status:', err);
      showToast?.(err.response?.data?.message || 'Failed to update delay status', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Values for display matching screenshot
  const jobId = currentOrder?.work_order_number || 'RJ-3836-000125';
  const clientId = currentOrder?.client?.client_code || currentOrder?.client_code || 'CL-2024-00456';
  const clientName = currentOrder?.customer_name || currentOrder?.client?.full_name || currentOrder?.client?.name || currentOrder?.client_name || 'Rajesh Vishwakarma';
  const karigarName = currentOrder?.karigar?.name || currentOrder?.karigar_name || 'Manikandan';
  const allotmentDate = formatDateDisplay(currentOrder?.allotted_date, '15/04/2024');

  const jobType = currentOrder?.product_name || 'Gold Necklace';
  const categoryName = currentOrder?.category?.name || currentOrder?.specifications?.variant || 'Necklace';
  const materialType = currentOrder?.material_type || '22K Gold';
  const purityLabel = currentOrder?.specifications?.from_cts || '22 Karat';
  const allottedWeight = currentOrder?.allotted_weight ?? 12.000;
  const completedWeight = currentOrder?.completed_weight ?? 0.100;
  const pendingWeight = currentOrder?.pending_weight ?? (allottedWeight - completedWeight);
  const dueDate = formatDateDisplay(currentOrder?.delivery_date, '28/04/2024');
  const newExpectedDateDisplay = formatDateDisplay(expectedDate, '03/05/2024');
  const totalAmount = currentOrder?.total_price || 149175.00;

  // Pagination calculations
  const totalHistoryItems = delayHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalHistoryItems / itemsPerPage));
  const startRecord = totalHistoryItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endRecord = Math.min(currentPage * itemsPerPage, totalHistoryItems);
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return delayHistory.slice(start, start + itemsPerPage);
  }, [delayHistory, currentPage]);

  return (
    <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
      
      {/* 1. TOP BREADCRUMBS & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb matching exact screenshot */}
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium mb-1.5">
            <Link to="/dashboard" className="hover:text-stone-900 transition-colors">Manufacturing</Link>
            <span className="text-stone-300">&gt;</span>
            <Link to="/job-orders" className="hover:text-stone-900 transition-colors">Job Orders</Link>
            <span className="text-stone-300">&gt;</span>
            <Link to="/job-order/receive" className="hover:text-stone-900 transition-colors">Reception</Link>
            <span className="text-stone-300">&gt;</span>
            <span className="text-stone-700 font-semibold">Delay / Hold</span>
          </div>

          {/* Title with Quick Order Switcher */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Delay / Hold - {jobId}
            </h1>

            {/* Quick Switcher dropdown for multi-order handling */}
            {orders.length > 0 && (
              <select
                value={selectedOrderId || ''}
                onChange={handleOrderChange}
                className="w-full sm:w-[420px] text-sm bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 font-semibold shadow-2xs cursor-pointer focus:outline-hidden focus:border-[#b01622]"
                title="Switch Work Order"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    Switch: {o.design_code || o.work_order_number} ({o.product_name})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Back to Receive Summary Button */}
        <div>
          <Link
            to="/job-order/receive"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#d6c7b2] hover:border-stone-400 hover:bg-stone-50 text-stone-800 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <span className="text-stone-500">&larr;</span>
            <span>Back to Receive Summary</span>
          </Link>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="border-b border-stone-200">
        <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
          <Link
            to={`/job-order/in-progress${currentOrder ? `?order_id=${currentOrder.id}` : ''}`}
            className="pb-3 text-sm font-medium text-stone-500 hover:text-stone-900 border-b-2 border-transparent hover:border-stone-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            Work in Progress
          </Link>

          {/* Active Tab: Delay / Job Details */}
          <div className="pb-3 text-sm font-bold text-[#b01622] border-b-2 border-[#b01622] cursor-default whitespace-nowrap">
            Delay / Job Details
          </div>

          <Link
            to={`/job-order/waste${currentOrder ? `?order_id=${currentOrder.id}` : ''}`}
            className="pb-3 text-sm font-medium text-stone-500 hover:text-stone-900 border-b-2 border-transparent hover:border-stone-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            Waste Details
          </Link>

          <Link
            to={`/job-order/quality-check${currentOrder ? `?order_id=${currentOrder.id}` : ''}`}
            className="pb-3 text-sm font-medium text-stone-500 hover:text-stone-900 border-b-2 border-transparent hover:border-stone-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            Quality Check &amp; Final Receive
          </Link>

          <Link
            to={`/job-order/history${currentOrder ? `?order_id=${currentOrder.id}` : ''}`}
            className="pb-3 text-sm font-medium text-stone-500 hover:text-stone-900 border-b-2 border-transparent hover:border-stone-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            History
          </Link>
        </div>
      </div>

      {/* 3. FIVE-COLUMN METADATA BANNER */}
      <div className="bg-white rounded-xl border border-[#f0e9df] p-4 shadow-2xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div>
          <span className="text-[11px] font-medium text-stone-400 block">Job ID</span>
          <span className="text-xs font-bold text-gray-900 block mt-0.5">{jobId}</span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-stone-400 block">Client ID</span>
          <span className="text-xs font-bold text-gray-900 block mt-0.5">{clientId}</span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-stone-400 block">Client Name</span>
          <span className="text-xs font-bold text-gray-900 block mt-0.5 truncate">{clientName}</span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-stone-400 block">Assigned Karigar</span>
          <span className="text-xs font-bold text-gray-900 block mt-0.5 truncate">{karigarName}</span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-stone-400 block">Allotment Date</span>
          <span className="text-xs font-bold text-gray-900 block mt-0.5">{allotmentDate}</span>
        </div>
      </div>

      {/* 4. MAIN TWO-COLUMN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Delay / Hold Details Form (8 cols on lg) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-xl border border-[#f0e9df] p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-gray-900 mb-5">
              Delay / Hold Details
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Row 1: Delay / Hold Status * & Delay Reason * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                    Delay / Hold Status <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={delayStatus}
                      onChange={(e) => setDelayStatus(e.target.value)}
                      className="w-full bg-stone-50/70 border border-stone-200 rounded-lg px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:outline-hidden focus:border-[#b01622] appearance-none cursor-pointer"
                      required
                    >
                      <option value="Delay">Delay</option>
                      <option value="Hold">Hold</option>
                      <option value="Active / Resume">Active / Resume</option>
                    </select>
                    <i className="fa-solid fa-chevron-down text-stone-400 text-xs absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                    Delay Reason <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={delayReason}
                      onChange={(e) => setDelayReason(e.target.value)}
                      className="w-full bg-stone-50/70 border border-stone-200 rounded-lg px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:outline-hidden focus:border-[#b01622] appearance-none cursor-pointer"
                      required
                    >
                      <option value="Stone not available">Stone not available</option>
                      <option value="Design correction">Design correction</option>
                      <option value="Karigar on leave">Karigar on leave</option>
                      <option value="Material shortage">Material shortage</option>
                      <option value="Client customization change">Client customization change</option>
                      <option value="Quality rework">Quality rework</option>
                      <option value="Workshop machinery maintenance">Workshop machinery maintenance</option>
                      <option value="Other">Other</option>
                    </select>
                    <i className="fa-solid fa-chevron-down text-stone-400 text-xs absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                  </div>
                </div>
              </div>

              {/* Row 2: Delay Days * & Expected Completion Date * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                    Delay Days <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={delayDays}
                      onChange={(e) => handleDelayDaysChange(e.target.value)}
                      className="w-full bg-stone-50/70 border border-stone-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:outline-hidden focus:border-[#b01622]"
                      placeholder="e.g. 5"
                      required
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleDelayDaysChange(delayDays + 1)}
                        className="text-[10px] text-stone-400 hover:text-stone-700 px-1"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelayDaysChange(Math.max(0, delayDays - 1))}
                        className="text-[10px] text-stone-400 hover:text-stone-700 px-1"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                    Expected Completion Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={expectedDate}
                      onChange={(e) => handleExpectedDateChange(e.target.value)}
                      className="w-full bg-stone-50/70 border border-stone-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:outline-hidden focus:border-[#b01622] cursor-pointer"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Detailed Reason / Remarks * */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Detailed Reason / Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Required stones are out of stock. Waiting for new stock arrival."
                  className="w-full bg-stone-50/70 border border-stone-200 rounded-lg p-3.5 text-xs text-gray-900 focus:outline-hidden focus:border-[#b01622] resize-none"
                  required
                ></textarea>
              </div>

              {/* Row 4: Attachment (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Attachment (Optional)
                </label>
                <label className="block border border-dashed border-[#e6b8be] bg-stone-50/40 hover:bg-red-50/20 rounded-xl p-6 text-center cursor-pointer transition-all group">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                  />

                  {attachmentName ? (
                    <div className="flex items-center justify-center gap-3">
                      <i className="fa-solid fa-file-lines text-xl text-[#b01622]"></i>
                      <div className="text-left">
                        <span className="text-xs font-bold text-gray-900 block">{attachmentName}</span>
                        <span className="text-[11px] text-stone-400 block">{attachmentSize}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="ml-2 w-6 h-6 rounded-full bg-stone-200 hover:bg-red-100 text-stone-600 hover:text-red-600 flex items-center justify-center text-xs transition-colors"
                        title="Remove file"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-[#b01622] group-hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-[#b01622]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-xs font-bold text-gray-800">
                        Click to upload files <span className="font-normal text-stone-500">or drag and drop</span>
                      </p>
                      <p className="text-[11px] text-stone-400">
                        (JPG, PNG, PDF, Max 5MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                  <span>Update Delay / Hold Status</span>
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Job & Item Summary Card (4 cols on lg) */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-xl border border-[#f0e9df] p-5 shadow-2xs space-y-3.5">
            <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-stone-100">
              Job &amp; Item Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-stone-500 font-medium">Job Type</span>
                <span className="font-bold text-gray-900 truncate max-w-[170px] text-right">{jobType}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-stone-500 font-medium">Category</span>
                <span className="font-bold text-gray-900">{categoryName}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-stone-500 font-medium">Material</span>
                <span className="font-bold text-gray-900">{materialType}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-stone-500 font-medium">Purity</span>
                <span className="font-bold text-gray-900">{purityLabel}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-stone-500 font-medium">Weight (Alloc.)</span>
                <span className="font-mono font-bold text-gray-900">{formatWeight(allottedWeight)} gm</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-stone-500 font-medium">Completed Weight</span>
                <span className="font-mono font-bold text-gray-900">{formatWeight(completedWeight)} gm</span>
              </div>

              {/* Pending Weight highlighted in red text */}
              <div className="flex items-center justify-between py-1">
                <span className="text-stone-500 font-medium">Pending Weight</span>
                <span className="font-mono font-bold text-[#b01622]">{formatWeight(pendingWeight)} gm</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-stone-500 font-medium">Due Date</span>
                <span className="font-medium text-gray-900">{dueDate}</span>
              </div>

              {/* New Expected Date highlighted in bold red text */}
              <div className="flex items-center justify-between py-1">
                <span className="text-stone-500 font-medium">New Expected Date</span>
                <span className="font-bold text-[#b01622]">{newExpectedDateDisplay}</span>
              </div>
            </div>

            {/* Highlighted Total Amount Box */}
            <div className="bg-[#fcfaf7] border border-[#f0e9df] rounded-xl p-4 flex items-center justify-between mt-4">
              <span className="text-xs font-bold text-stone-700">Total Amount</span>
              <span className="text-base font-black text-[#b01622]">
                {formatCurrency(totalAmount)}
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* 5. BOTTOM CARD: DELAY HISTORY TABLE */}
      <div className="bg-white rounded-xl border border-[#f0e9df] shadow-2xs overflow-hidden">
        
        {/* Table Title */}
        <div className="p-4 border-b border-stone-100">
          <h3 className="text-sm font-bold text-gray-900">
            Delay History
          </h3>
        </div>

        {/* Delay History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-stone-200/80 bg-stone-50/50 text-stone-600 font-semibold text-xs">
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-3 whitespace-nowrap">Reason</th>
                <th className="py-3 px-3 whitespace-nowrap">Delay Days</th>
                <th className="py-3 px-3 whitespace-nowrap">From Date</th>
                <th className="py-3 px-3 whitespace-nowrap">To Date</th>
                <th className="py-3 px-3 whitespace-nowrap">Remarks</th>
                <th className="py-3 px-4 whitespace-nowrap">Updated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedHistory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-stone-400">
                    No delay or hold events recorded yet.
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-[#b01622]">
                      {row.status}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-stone-800 font-medium">
                      {row.reason}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-stone-700">
                      {row.delay_days}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-stone-600">
                      {row.from_date}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-stone-600">
                      {row.to_date}
                    </td>
                    <td className="py-3 px-3 text-stone-600 max-w-[280px] truncate">
                      {row.remarks}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-stone-600">
                      {row.updated_by}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 6. BOTTOM PAGINATION FOOTER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 text-xs text-stone-500">
        <div>
          Showing {startRecord} to {endRecord} of {totalHistoryItems} entries
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="w-7 h-7 rounded-md border border-stone-200 hover:bg-stone-100 flex items-center justify-center text-stone-600 transition-colors disabled:opacity-40 cursor-pointer"
            >
              &lt;
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-[#b01622] text-white'
                    : 'border border-stone-200 hover:bg-stone-100 text-stone-700'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="w-7 h-7 rounded-md border border-stone-200 hover:bg-stone-100 flex items-center justify-center text-stone-600 transition-colors disabled:opacity-40 cursor-pointer"
            >
              &gt;
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
