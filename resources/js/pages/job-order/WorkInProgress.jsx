import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function WorkInProgress() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Query parameter order_id
  const queryParams = new URLSearchParams(location.search);
  const queryOrderId = queryParams.get('order_id');

  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(queryOrderId || null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Real Pagination for Timeline table
  const [timelinePage, setTimelinePage] = useState(1);
  const timelinesPerPage = 4;

  // Sub-Navigation tabs matching screenshot
  const [activeSubTab, setActiveSubTab] = useState('in-progress');

  // Formatter helpers
  const formatWeight = (val, fallback = '0.000') => {
    if (val === undefined || val === null || val === '') return fallback;
    const num = parseFloat(val);
    if (isNaN(num)) return fallback;
    return num.toFixed(3);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '—';
    const s = String(dateStr).trim();
    if (s.includes('-')) {
      const parts = s.split('T')[0].split('-');
      if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return s;
  };

  const formatTimelineDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {
      return dateStr;
    }
  };

  // Fetch all orders for switcher & locating current job
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

  // Fetch single work order with timelines, client, karigar, product
  const fetchOrderDetails = useCallback(async (id, isSilent = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      const res = await api.get(`/work-orders/${id}`);
      const o = res.data.data;
      setCurrentOrder(o);
      setSelectedOrderId(o.id);
    } catch (err) {
      console.error('Failed to load work order:', err);
      if (!isSilent) showToast?.('Failed to load work order details', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const list = await fetchOrdersList();
      if (!isMounted) return;

      let targetId = queryOrderId;
      if (!targetId && list.length > 0) {
        // Prioritize in-progress or ongoing jobs
        const inProg = list.find((o) => ['in_progress', 'ongoing', 'assigned'].includes(o.status));
        targetId = inProg ? inProg.id : list[0].id;
      }
      if (targetId) {
        fetchOrderDetails(targetId);
      } else {
        setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [queryOrderId, fetchOrdersList, fetchOrderDetails]);

  // Automatic Real-Time Synchronization: Poll every 4 seconds
  // so updates made in Karigar Management or Receive Work Order reflect instantly without manual reload
  useEffect(() => {
    if (!selectedOrderId) return;
    const interval = setInterval(() => {
      fetchOrderDetails(selectedOrderId, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedOrderId, fetchOrderDetails]);

  // Switch Order from Dropdown
  const handleSwitchOrder = (orderId) => {
    setSelectedOrderId(orderId);
    setTimelinePage(1);
    navigate(`/job-order/in-progress?order_id=${orderId}`, { replace: true });
    fetchOrderDetails(orderId);
  };

  // Dedicated Action: Work Completed (Send for QC)
  const handleWorkCompletedQC = async () => {
    if (!currentOrder) return;
    const confirmed = await showConfirm({
      title: 'Submit for Quality Check',
      message: 'Confirm submitting this completed jewelry piece for Master Artisan Quality Check (QC)?',
      icon: 'fa-solid fa-[#b01622] fa-circle-check',
      confirmText: 'Submit for QC'
    });
    if (!confirmed) return;
    try {
      setActionLoading(true);
      const payload = {
        completed_weight: currentOrder.completed_weight || currentOrder.allotted_weight,
        current_stage: 'quality_check',
        status: 'pending_approval',
        update_type: 'Sent for QC',
        details: 'Crafting completed. Submitted for Master Artisan Quality Check (QC)',
        remarks: 'Work completed. Quality inspection pending.',
      };

      const res = await api.post(`/work-orders/${currentOrder.id}/timeline-update`, payload);
      setCurrentOrder(res.data.data);
      showToast?.('Work marked as Completed and submitted for Quality Check!', 'success');
      fetchOrderDetails(currentOrder.id, true);
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Failed to submit for QC', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for update badge styling matching screenshot
  const renderUpdateBadge = (label) => {
    const s = String(label || '').toLowerCase();
    if (s.includes('started') || s.includes('created')) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-stone-200 text-stone-700">
          Work Started
        </span>
      );
    }
    if (s.includes('delay') || s.includes('hold')) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          Delay / Hold
        </span>
      );
    }
    if (s.includes('qc') || s.includes('quality') || s.includes('completed') || s.includes('sent for qc')) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Sent for QC
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#ffe4e6] text-[#9f1239] border border-rose-200">
        Progress Update
      </span>
    );
  };

  // Computed weights and status directly from database
  const allocatedWeight = currentOrder ? parseFloat(currentOrder.allotted_weight || 0) : 0;
  const completedWeight = currentOrder ? parseFloat(currentOrder.completed_weight || 0) : 0;
  const pendingWeight = Math.max(0, allocatedWeight - completedWeight);
  const progressPercent = allocatedWeight > 0 ? Math.min(100, (completedWeight / allocatedWeight) * 100) : 0;

  // Status computation matching project workflow
  const computeStatusLabel = () => {
    if (!currentOrder) return 'In Progress (Partial)';
    if (currentOrder.status === 'delayed') return 'Delayed / On Hold';
    if (currentOrder.current_stage === 'work_completed' || currentOrder.status === 'pending_approval') return 'Work Completed';
    if (currentOrder.current_stage === 'work_started') return 'Work Started';
    if (currentOrder.current_stage === 'received_by_artisan' || currentOrder.status === 'assigned') return 'Waiting for Material';
    return 'In Progress (Partial)';
  };

  // Real Database Details
  const jobId = currentOrder?.design_code || currentOrder?.work_order_number || (currentOrder?.id ? `ORD-${currentOrder.id}` : '—');
  const clientId = currentOrder?.client?.client_code || (currentOrder?.client_id ? `CL-${currentOrder.client_id}` : '—');
  const clientName = currentOrder?.customer_name || currentOrder?.client?.full_name || currentOrder?.client?.name || currentOrder?.client_name || '—';
  const karigarName = currentOrder?.karigar?.name || currentOrder?.karigar_name || 'Unassigned';
  const workStartedDate = formatDateDisplay(currentOrder?.allotted_date || currentOrder?.created_at);

  const jobType = currentOrder?.product_name || 'Custom Jewellery';
  const categoryName = currentOrder?.category?.name || 'Jewellery';
  const materialType = currentOrder?.material_type || 'Gold';
  const purityLabel = currentOrder?.purity || 'Standard';
  const expectedDate = formatDateDisplay(currentOrder?.delivery_date);
  const remarksText = currentOrder?.karigar_notes || currentOrder?.notes || currentOrder?.karigar_data?.remarks || 'No remarks recorded.';

  // Real Timelines from Database
  const rawTimelines = currentOrder?.timelines || [];
  const timelines = rawTimelines.length > 0 ? rawTimelines : [
    {
      id: 'initial',
      created_at: currentOrder?.created_at || new Date().toISOString(),
      action_by_name: karigarName,
      stage_label: 'Work Started',
      notes: 'Work started at workshop',
      completed_weight_at_step: 0.000,
    }
  ];

  // Real Pagination Calculation
  const totalTimelines = timelines.length;
  const totalPages = Math.max(1, Math.ceil(totalTimelines / timelinesPerPage));
  const safePage = Math.min(timelinePage, totalPages);
  const startIndex = (safePage - 1) * timelinesPerPage;
  const paginatedTimelines = timelines.slice(startIndex, startIndex + timelinesPerPage);

  if (loading && !currentOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-stone-400 gap-3 font-['Inter',sans-serif]">
        <div className="w-10 h-10 border-4 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-stone-600">Loading Work in Progress details...</span>
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="w-full pb-20 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 font-semibold mb-1">
              <span>Manufacturing</span>
              <i className="fa-solid fa-chevron-right text-[8px] text-stone-300"></i>
              <Link to="/job-order" className="hover:text-stone-900 transition-colors">Job Orders</Link>
              <i className="fa-solid fa-chevron-right text-[8px] text-stone-300"></i>
              <Link to="/job-order/receive" className="hover:text-stone-900 transition-colors">Reception</Link>
              <i className="fa-solid fa-chevron-right text-[8px] text-stone-300"></i>
              <span className="text-stone-700 font-bold">Work in Progress</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Work in Progress</h1>
          </div>
          <Link
            to="/job-order/receive"
            className="px-4 py-2 bg-white border border-stone-300 text-stone-800 text-xs font-semibold rounded-lg shadow-2xs hover:bg-stone-50"
          >
            Back to Receive Summary
          </Link>
        </div>

        <div className="border-b border-stone-200 flex items-center gap-8 overflow-x-auto no-scrollbar">
          <Link to="/job-order/in-progress" className="pb-3 text-sm font-bold text-[#b01622] border-b-2 border-[#b01622]">Work in Progress</Link>
          <Link to="/job-order/delay" className="pb-3 text-sm font-medium text-stone-500 hover:text-stone-900 border-b-2 border-transparent">Delay / Job Details</Link>
          <Link to="/job-order/waste" className="pb-3 text-sm font-medium text-stone-500 hover:text-stone-900 border-b-2 border-transparent">Waste Details</Link>
          <Link to="/job-order/quality-check" className="pb-3 text-sm font-medium text-stone-500 hover:text-stone-900 border-b-2 border-transparent">Quality Check &amp; Final Receive</Link>
          <Link to="/job-order/history" className="pb-3 text-sm font-medium text-stone-500 hover:text-stone-900 border-b-2 border-transparent">History</Link>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-full bg-red-50 text-[#b01622] flex items-center justify-center text-2xl">
            <i className="fa-solid fa-hammer"></i>
          </div>
          <h2 className="text-lg font-bold text-gray-900">No Active Work in Progress Jobs</h2>
          <p className="text-xs text-stone-500 max-w-md">
            There are currently no active manufacturing job orders in progress in the database.
          </p>
          <Link
            to="/job-order/new"
            className="px-4 py-2.5 bg-[#b01622] text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-[#8e111a] transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Create New Job Order</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-20 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
      
      {/* 1. TOP HEADER & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb: Manufacturing > Job Orders > Reception > Work in Progress */}
          <div className="flex items-center gap-2 text-xs text-stone-500 font-semibold mb-1">
            <span>Manufacturing</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-300"></i>
            <Link to="/job-order" className="hover:text-stone-900 transition-colors">Job Orders</Link>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-300"></i>
            <Link to="/job-order/receive" className="hover:text-stone-900 transition-colors">Reception</Link>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-300"></i>
            <span className="text-stone-700 font-bold">Work in Progress</span>
          </div>

          {/* Title with Job ID */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Work In Progress (Partial / Waiting) - {jobId}
            </h1>

            {/* Quick Switcher dropdown for actual project work orders */}
            {orders.length > 0 && (
              <select
                value={selectedOrderId || ''}
                onChange={(e) => handleSwitchOrder(e.target.value)}
                className="w-full sm:w-[420px] text-sm bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 font-semibold shadow-2xs cursor-pointer focus:outline-hidden focus:border-[#b01622]"
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

        {/* Back to Receive Summary button matching screenshot */}
        <div className="flex items-center gap-3">
          <Link
            to="/job-order/receive"
            className="px-4 py-2 bg-white border border-stone-300 hover:border-stone-400 text-stone-800 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left text-[11px] text-stone-500"></i>
            <span>Back to Receive Summary</span>
          </Link>
        </div>
      </div>

      {/* 2. SUB-VIEW TABS STRIP (Red Underline on Work in Progress) */}
      <div className="border-b border-stone-200">
        <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSubTab('in-progress')}
            className="pb-3 text-sm font-bold text-[#b01622] border-b-2 border-[#b01622] flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Work in Progress</span>
          </button>

          <Link
            to={`/job-order/delay${currentOrder?.id ? `?order_id=${currentOrder.id}` : ''}`}
            className="pb-3 text-sm font-bold text-stone-500 hover:text-stone-900 border-b-2 border-transparent hover:border-stone-300 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Delay / Job Details</span>
          </Link>

          <Link
            to={`/job-order/waste${currentOrder?.id ? `?order_id=${currentOrder.id}` : ''}`}
            className="pb-3 text-sm font-bold text-stone-500 hover:text-stone-900 border-b-2 border-transparent hover:border-stone-300 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Waste Details</span>
          </Link>

          <Link
            to={`/job-order/quality-check${currentOrder?.id ? `?order_id=${currentOrder.id}` : ''}`}
            className="pb-3 text-sm font-bold text-stone-500 hover:text-stone-900 border-b-2 border-transparent hover:border-stone-300 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Quality Check & Final Receive</span>
          </Link>

          <Link
            to={`/job-order/history${currentOrder?.id ? `?order_id=${currentOrder.id}` : ''}`}
            className="pb-3 text-sm font-bold text-stone-500 hover:text-stone-900 border-b-2 border-transparent hover:border-stone-300 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>History</span>
          </Link>
        </div>
      </div>

      {/* 3. FIVE-COLUMN INFO CARD (Top Strip) */}
      <div className="bg-white rounded-xl border border-stone-200/90 p-4 shadow-2xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div>
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
            Job ID
          </span>
          <span className="text-sm font-black text-gray-900 block mt-0.5">
            {jobId}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
            Client ID
          </span>
          <span className="text-sm font-black text-gray-900 block mt-0.5">
            {clientId}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
            Client Name
          </span>
          <span className="text-sm font-black text-gray-900 block mt-0.5 truncate">
            {clientName}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
            Assigned Karigar
          </span>
          <span className="text-sm font-black text-gray-900 block mt-0.5 truncate">
            {karigarName}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
            Work Started
          </span>
          <span className="text-sm font-black text-gray-900 block mt-0.5">
            {workStartedDate}
          </span>
        </div>
      </div>

      {/* 4. MAIN TWO-COLUMN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Progress Overview & Next Actions (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card 1: Progress Overview (Readonly display reflecting Karigar Management & Reception updates) */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                Progress Overview
              </h3>
              <span className="text-[11px] text-stone-400 font-medium flex items-center gap-1.5">
                <i className="fa-solid fa-arrows-rotate text-[10px] text-[#b01622]"></i>
                <span>Live auto-synced with Karigar & Reception updates</span>
              </span>
            </div>

            {/* Row 1: Current Status * */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                Current Status <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={computeStatusLabel()}
                  className="w-full bg-stone-50/80 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 cursor-default focus:outline-hidden"
                />
                <i className="fa-solid fa-chevron-down text-stone-400 text-xs absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              </div>
            </div>

            {/* Row 2: Completed Weight (gm) & Total Allocated Weight (gm) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Completed Weight (gm)
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatWeight(completedWeight)}
                  className="w-full bg-stone-50/80 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-gray-900 cursor-default focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Total Allocated Weight (gm)
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatWeight(allocatedWeight)}
                  className="w-full bg-stone-100/80 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-stone-600 cursor-default focus:outline-hidden"
                />
              </div>
            </div>

            {/* Row 3: Pending Weight (gm), Progress (%), Expected Completion Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Pending Weight (gm)
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatWeight(pendingWeight)}
                  className="w-full bg-stone-100/80 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-stone-600 cursor-default focus:outline-hidden"
                />
              </div>

              {/* Progress (%) Bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-600 mb-1.5">
                  <span>Progress (%)</span>
                  <span className="font-bold text-gray-900">{progressPercent.toFixed(2)}%</span>
                </div>
                <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200/80">
                  <div
                    className="h-full bg-[#b01622] rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Expected Completion Date */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Expected Completion Date
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={expectedDate}
                    className="w-full bg-stone-50/80 border border-stone-200 rounded-xl pl-3.5 pr-8 py-2 text-xs font-medium text-gray-900 cursor-default focus:outline-hidden"
                  />
                  <i className="fa-regular fa-calendar text-stone-400 text-xs absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                </div>
              </div>
            </div>

            {/* Row 4: Remarks */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                Remarks
              </label>
              <textarea
                rows={2}
                readOnly
                value={remarksText}
                className="w-full bg-stone-50/80 border border-stone-200 rounded-xl p-3 text-xs text-gray-800 focus:outline-hidden resize-none cursor-default"
              ></textarea>
            </div>
          </div>

          {/* Card 2: NEXT ACTION */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 block">
                NEXT ACTION
              </span>
              <span className="text-[10.5px] text-stone-400">
                Updates managed directly via Receive Order & Karigar Management
              </span>
            </div>

            {/* Row of 3 Action Buttons matching screenshot */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Button 1: Mark as Delay / Hold (Links directly to Receive Order) */}
              <Link
                to={`/job-order/receive?order_id=${currentOrder?.id}`}
                className="px-4 py-2 bg-white border border-stone-300 hover:border-stone-400 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
                title="Update delay or hold state in Receive Work Order"
              >
                <i className="fa-solid fa-circle-info text-stone-400 text-xs"></i>
                <span>Mark as Delay / Hold</span>
              </Link>

              {/* Button 2: Add Update / Remarks (Links to Karigar Management) */}
              <Link
                to={`/karigar`}
                className="px-4 py-2 bg-white border border-stone-300 hover:border-stone-400 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
                title="Update artisan craft weights & notes in Karigar Management"
              >
                <i className="fa-solid fa-pencil text-stone-400 text-xs"></i>
                <span>Add Update / Remarks</span>
              </Link>

              {/* Button 3: New Sub Timeline (Links to Reception Workstation) */}
              <Link
                to={`/job-order/receive?order_id=${currentOrder?.id}`}
                className="px-4 py-2 bg-white border border-stone-300 hover:border-stone-400 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
                title="Add material components or timeline stages in Reception"
              >
                <i className="fa-solid fa-chart-line text-stone-400 text-xs"></i>
                <span>New Sub Timeline</span>
              </Link>
            </div>

            {/* Big Action Button: Work Completed (Send for QC) */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleWorkCompletedQC}
                disabled={actionLoading}
                className="px-6 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                <span>Work Completed (Send for QC)</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Item Details Card (4 cols on lg) */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-gray-900 pb-1 border-b border-stone-100">
              Item Details
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-stone-50">
                <span className="text-stone-500 font-medium">Job Type</span>
                <span className="font-bold text-gray-900">{jobType}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-stone-50">
                <span className="text-stone-500 font-medium">Category</span>
                <span className="font-bold text-gray-900">{categoryName}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-stone-50">
                <span className="text-stone-500 font-medium">Material</span>
                <span className="font-bold text-gray-900">{materialType}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-stone-50">
                <span className="text-stone-500 font-medium">Purity</span>
                <span className="font-bold text-gray-900">{purityLabel}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-stone-50">
                <span className="text-stone-500 font-medium">Weight (Alloc)</span>
                <span className="font-mono font-bold text-gray-900">{formatWeight(allocatedWeight)} gm</span>
              </div>

              {/* Completed (gm) highlighted in bold crimson red font exactly as in screenshot */}
              <div className="flex items-center justify-between py-1.5 border-b border-stone-50 bg-red-50/40 px-2 rounded-lg">
                <span className="text-stone-700 font-semibold">Completed (gm)</span>
                <span className="font-mono text-sm font-black text-[#b01622]">
                  {formatWeight(completedWeight)} gm
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-stone-500 font-medium">Pending (gm)</span>
                <span className="font-mono font-bold text-gray-900">{formatWeight(pendingWeight)} gm</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM SECTION: WORK PROGRESS TIMELINE CARD */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        
        {/* Table Title Banner */}
        <div className="p-4 border-b border-stone-200/80 bg-stone-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-sm tracking-tight">
              Work Progress Timeline
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-stone-200 text-stone-700">
              {totalTimelines} Updates
            </span>
          </div>

          <button
            type="button"
            onClick={() => fetchOrderDetails(selectedOrderId)}
            className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-arrows-rotate text-[11px]"></i>
            <span>Refresh</span>
          </button>
        </div>

        {/* Timeline Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200/80 bg-stone-50/30 text-stone-500 font-black uppercase text-[10.5px] tracking-wider">
                <th className="py-3 px-4">UPDATE DATE</th>
                <th className="py-3 px-4">UPDATED BY</th>
                <th className="py-3 px-4">UPDATE TYPE</th>
                <th className="py-3 px-4">DETAILS</th>
                <th className="py-3 px-4 text-right">UPDATED WEIGHT (GM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedTimelines.map((step, idx) => (
                <tr key={step.id || idx} className="hover:bg-stone-50/60 transition-colors">
                  {/* UPDATE DATE */}
                  <td className="py-3 px-4 text-stone-700 font-medium whitespace-nowrap">
                    {formatTimelineDate(step.created_at)}
                  </td>

                  {/* UPDATED BY */}
                  <td className="py-3 px-4 text-stone-900 font-semibold whitespace-nowrap">
                    {step.action_by_name || karigarName}
                  </td>

                  {/* UPDATE TYPE */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {renderUpdateBadge(step.stage_label || step.stage)}
                  </td>

                  {/* DETAILS */}
                  <td className="py-3 px-4 text-stone-700">
                    {step.notes || step.stage_label || 'Work progress recorded'}
                  </td>

                  {/* UPDATED WEIGHT (GM) */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                    {formatWeight(step.completed_weight_at_step !== undefined ? step.completed_weight_at_step : completedWeight)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* REAL WORKING PAGINATION FOOTER */}
        <div className="p-3.5 border-t border-stone-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-stone-500">
            Showing {totalTimelines === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + timelinesPerPage, totalTimelines)} of {totalTimelines} updates
          </span>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {/* Previous Page Button */}
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setTimelinePage((prev) => Math.max(1, prev - 1))}
              className="w-7 h-7 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-50 flex items-center justify-center text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <i className="fa-solid fa-chevron-left text-[10px]"></i>
            </button>

            {/* Dynamic Page Buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const isActive = pageNum === safePage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setTimelinePage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#b01622] text-white shadow-2xs'
                      : 'border border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next Page Button */}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setTimelinePage((prev) => Math.min(totalPages, prev + 1))}
              className="w-7 h-7 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-50 flex items-center justify-center text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
