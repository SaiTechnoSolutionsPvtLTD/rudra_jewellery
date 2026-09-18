import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const resolveItemImage = (item) => {
  const raw =
    item?.image_url ||
    item?.specifications?.image ||
    item?.product?.image_url ||
    item?.product?.image;
  if (!raw) return '/images/samples/peacock_choker.jpg';
  if (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('/images/')) return raw;
  if (raw.startsWith('/storage/')) return raw;
  if (raw.startsWith('storage/')) return `/${raw}`;
  if (raw.startsWith('products/')) return `/storage/${raw}`;
  if (raw.startsWith('/')) return raw;
  return `/storage/${raw}`;
};

export default function JobCreationDashboard() {
  const navigate = useNavigate();
  const toast = useToast();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('wip');

  // Filter range
  const [timeRange, setTimeRange] = useState('Month');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterRef = useRef(null);

  // Row 3-dots action menu
  const [activeMenuId, setActiveMenuId] = useState(null);
  const actionMenuRef = useRef(null);

  // Modals state
  const [selectedJob, setSelectedJob] = useState(null);
  const [showQuickViewModal, setShowQuickViewModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Pagination state (driven entirely by backend data)
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 4,
    total: 0,
    from: 0,
    to: 0,
  });

  // KPI Metrics (driven entirely by project database)
  const [metrics, setMetrics] = useState({
    active_artisans: 0,
    active_artisans_growth: 'Active',
    pending_orders: 0,
    overdue_items: 0,
    qc_pending: 0,
    qc_pending_trend: '0 this week',
    completed_jobs: 0,
    completed_value: '₹0',
  });

  // Table, Materials & Cards state
  const [liveJobs, setLiveJobs] = useState([]);
  const [qcItems, setQcItems] = useState([]);
  const [materialAllocations, setMaterialAllocations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dismiss dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterDropdownOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real stats and paginated live jobs from API
  useEffect(() => {
    fetchDashboardStats(currentPage);
  }, [timeRange, currentPage]);

  const fetchDashboardStats = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get('/work-orders/dashboard-stats', {
        params: { range: timeRange, page, per_page: 4 },
      });

      if (res.data?.status === 'success') {
        const d = res.data.data || res.data;

        setMetrics({
          active_artisans: d.active_artisans ?? 0,
          active_artisans_growth: d.active_artisans_growth ?? 'Active',
          pending_orders: d.pending_orders ?? 0,
          overdue_items: d.overdue_count ?? 0,
          qc_pending: d.qc_pending ?? 0,
          qc_pending_trend: d.qc_pending_trend ?? '0 this week',
          completed_jobs: d.completed_jobs ?? 0,
          completed_value: d.completed_value
            ? `₹${Number(d.completed_value).toLocaleString('en-IN')}`
            : '₹0',
        });

        // Real Live Jobs
        setLiveJobs(Array.isArray(d.live_jobs) ? d.live_jobs : []);

        // Real Material Allocations
        setMaterialAllocations(Array.isArray(d.material_allocations) ? d.material_allocations : []);

        // Real Audit Logs
        setAuditLogs(Array.isArray(d.audit_logs) ? d.audit_logs : []);

        // Real QC Approval Cards
        setQcItems(Array.isArray(d.approval_cards) ? d.approval_cards : []);

        // Real Pagination Meta
        if (d.pagination) {
          setPaginationMeta({
            current_page: d.pagination.current_page || 1,
            last_page: d.pagination.last_page || 1,
            per_page: d.pagination.per_page || 4,
            total: d.pagination.total || 0,
            from: d.pagination.from || 0,
            to: d.pagination.to || 0,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load real dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Download Report functionality (CSV Export of real current data)
  const handleDownloadReport = () => {
    try {
      if (liveJobs.length === 0) {
        toast.info('No live jobs data available to export.');
        return;
      }
      const headers = ['Order ID', 'Artisan Name', 'Product / Item Type', 'Stage', 'Allotted Wt (g)', 'Completed Wt (g)', 'Pending Wt (g)', 'Due Date', 'Overdue'];
      const rows = liveJobs.map((j) => [
        `"${j.work_order_number}"`,
        `"${j.artisan_name}"`,
        `"${j.item_type}"`,
        `"${j.stage}"`,
        `"${j.allotted_weight || 0}"`,
        `"${j.completed_weight || 0}"`,
        `"${j.pending_weight || 0}"`,
        `"${j.due_date}"`,
        `"${j.is_overdue ? 'YES' : 'NO'}"`,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
          `"Rudra Jewellery - Artisan Performance & Job Distribution Report"`,
          `"Generated At: ${new Date().toLocaleString()}"`,
          `"Time Range: ${timeRange}"`,
          `"Active Artisans: ${metrics.active_artisans}"`,
          `"Pending Orders: ${metrics.pending_orders}"`,
          '',
          headers.join(','),
          ...rows.map((e) => e.join(',')),
        ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Artisan_Job_Report_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report downloaded successfully!');
    } catch (err) {
      toast.error('Failed to generate report.');
    }
  };

  // Approve QC item (real backend mutation)
  const handleApproveQC = async (item) => {
    try {
      setActionLoading(true);
      await api.post(`/work-orders/${item.id}/approve`);
      await api.post(`/work-orders/${item.id}/mark-ready`);
      toast.success(`${item.product_name} (${item.qc_code}) approved and marked Ready!`);
      fetchDashboardStats(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve work order.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Reject Modal
  const handleOpenReject = (item) => {
    setRejectingItem(item);
    setRejectReason('');
    setShowRejectModal(true);
  };

  // Confirm Reject (real backend mutation)
  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    try {
      setActionLoading(true);
      await api.post(`/work-orders/${rejectingItem.id}/return`, {
        return_reason: rejectReason || 'Returned from QC for rectification',
      });
      toast.info(`${rejectingItem.product_name} returned to ${rejectingItem.artisan_name} for rework.`);
      setShowRejectModal(false);
      setRejectingItem(null);
      fetchDashboardStats(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to return work order.');
    } finally {
      setActionLoading(false);
    }
  };

  // Tab click navigation
  const handleTabClick = (tabId, route) => {
    setActiveTab(tabId);
    if (route) {
      navigate(route);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-gray-800 antialiased -m-6 p-8">
      
      {/* 1. Header & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#111827] tracking-tight leading-tight">
            Dashboard
          </h1>
          <p className="text-[13px] text-[#6b7280] font-normal mt-1">
            Real-time Artisan performance and order distribution tracking.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Download Report Button */}
          <button
            type="button"
            onClick={handleDownloadReport}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-[#374151] text-xs font-semibold rounded-md border border-[#d1d5db] transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <i className="fa-solid fa-arrow-down-to-line text-xs text-gray-500"></i>
            <span>Download Report</span>
          </button>

          {/* New Work Order Button */}
          <Link
            to="/job-order/new"
            className="px-4 py-2 bg-[#9e1b27] hover:bg-[#83141f] text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            <span>New Work Order</span>
          </Link>
        </div>
      </div>

      {/* 2. Filter Dropdown (Month ⌵) */}
      <div className="flex justify-end mt-4 mb-3">
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#e5e7eb] rounded-full text-xs font-medium text-[#4b5563] hover:border-gray-300 hover:text-gray-900 transition-colors cursor-pointer shadow-2xs"
          >
            <i className="fa-solid fa-filter text-[11px] text-[#9ca3af]"></i>
            <span>{timeRange}</span>
            <i className={`fa-solid fa-chevron-down text-[9px] text-[#9ca3af] transition-transform ${filterDropdownOpen ? 'rotate-180' : ''}`}></i>
          </button>

          {filterDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
              {['Today', 'This Week', 'Month', 'This Quarter', 'This Year'].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => {
                    setTimeRange(range);
                    setFilterDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-red-50 text-[#9e1b27] font-bold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Tab Navigation Bar */}
      <div className="border-b border-[#f0f2f5] mt-1 mb-6">
        <nav className="flex items-center gap-8 -mb-px overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleTabClick('wip', '/job-order/in-progress')}
            className={`pb-3 text-[13px] font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
              activeTab === 'wip'
                ? 'border-[#9e1b27] text-[#9e1b27] font-bold'
                : 'border-transparent text-[#6b7280] hover:text-[#111827]'
            }`}
          >
            Work In Progress
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('delay', '/job-order/delay')}
            className={`pb-3 text-[13px] font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
              activeTab === 'delay'
                ? 'border-[#9e1b27] text-[#9e1b27] font-bold'
                : 'border-transparent text-[#6b7280] hover:text-[#111827]'
            }`}
          >
            Dealy/ Job Details
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('waste', '/job-order/waste')}
            className={`pb-3 text-[13px] font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
              activeTab === 'waste'
                ? 'border-[#9e1b27] text-[#9e1b27] font-bold'
                : 'border-transparent text-[#6b7280] hover:text-[#111827]'
            }`}
          >
            Waste Details
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('qc', '/job-order/quality-check')}
            className={`pb-3 text-[13px] font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
              activeTab === 'qc'
                ? 'border-[#9e1b27] text-[#9e1b27] font-bold'
                : 'border-transparent text-[#6b7280] hover:text-[#111827]'
            }`}
          >
            Quality Check & Final Receive
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('history', '/job-order/history')}
            className={`pb-3 text-[13px] font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-[#9e1b27] text-[#9e1b27] font-bold'
                : 'border-transparent text-[#6b7280] hover:text-[#111827]'
            }`}
          >
            History
          </button>
        </nav>
      </div>

      {/* 4. Top KPI Metric Cards (Real Database Values) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
        
        {/* Card 1: ACTIVE ARTISANS */}
        <div className="bg-white rounded-xl border border-[#eceff3] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded-md bg-[#fee2e2]/60 text-[#dc2626] flex items-center justify-center text-sm">
              <i className="fa-solid fa-briefcase"></i>
            </div>
            <span className="inline-flex items-center text-[10px] font-bold text-[#16a34a] bg-[#ecfdf5] px-2 py-0.5 rounded-full">
              {metrics.active_artisans_growth}
            </span>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-bold text-[#9ca3af] tracking-wider uppercase block">
              ACTIVE ARTISANS
            </span>
            <div className="text-2xl font-bold text-[#111827] mt-0.5">
              {loading ? '...' : metrics.active_artisans}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-[#16a34a] mt-1.5">
              <i className="fa-solid fa-arrow-trend-up text-[10px]"></i>
              <span>Network registered artisans</span>
            </div>
          </div>
        </div>

        {/* Card 2: PENDING ORDERS */}
        <div className="bg-white rounded-xl border border-[#eceff3] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded-md bg-[#fef3c7]/60 text-[#d97706] flex items-center justify-center text-sm">
              <i className="fa-solid fa-clipboard-list"></i>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-bold text-[#9ca3af] tracking-wider uppercase block">
              PENDING ORDERS
            </span>
            <div className="text-2xl font-bold text-[#111827] mt-0.5">
              {loading ? '...' : metrics.pending_orders}
            </div>
            <div className={`flex items-center gap-1.5 text-[11px] font-medium mt-1.5 ${
              metrics.overdue_items > 0 ? 'text-[#dc2626]' : 'text-gray-500'
            }`}>
              <i className={`fa-solid ${metrics.overdue_items > 0 ? 'fa-triangle-exclamation' : 'fa-clock'} text-[10px]`}></i>
              <span>{metrics.overdue_items} Overdue items</span>
            </div>
          </div>
        </div>

        {/* Card 3: QC PENDING */}
        <div className="bg-white rounded-xl border border-[#eceff3] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded-md bg-[#ecfccb]/70 text-[#65a30d] flex items-center justify-center text-sm">
              <i className="fa-solid fa-money-bill-wave"></i>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-bold text-[#9ca3af] tracking-wider uppercase block">
              QC PENDING
            </span>
            <div className="text-2xl font-bold text-[#111827] mt-0.5">
              {loading ? '...' : metrics.qc_pending}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-[#92400e] mt-1.5">
              <span className="inline-flex items-center gap-1 bg-[#fef3c7] text-[#92400e] text-[10px] font-semibold px-1.5 py-0.5 rounded">
                <i className="fa-solid fa-arrow-up text-[9px]"></i>
                <span>{metrics.qc_pending_trend}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: COMPLETED JOBS */}
        <div className="bg-white rounded-xl border border-[#eceff3] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded-md bg-[#fef9c3]/70 text-[#ca8a04] flex items-center justify-center text-sm">
              <i className="fa-solid fa-circle-check"></i>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-bold text-[#9ca3af] tracking-wider uppercase block">
              COMPLETED JOBS
            </span>
            <div className="text-2xl font-bold text-[#111827] mt-0.5">
              {loading ? '...' : metrics.completed_jobs}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-normal text-[#6b7280] mt-1.5">
              <i className="fa-regular fa-clock text-[10px] text-[#9ca3af]"></i>
              <span>Value: <span className="font-semibold text-gray-700">{metrics.completed_value}</span></span>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Middle Section: Live Job Creation Status (Left) + Material Allocation (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 items-start">
        
        {/* Left Column: Live Job Creation Status */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#eceff3] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#111827] tracking-tight">
              Live Job creation Status
            </h2>
            <Link
              to="/job-order"
              className="text-xs font-bold text-[#9e1b27] hover:underline"
            >
              View Full Queue
            </Link>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[560px]">
              <thead>
                <tr className="text-[10px] font-bold text-[#9ca3af] tracking-wider uppercase border-b border-gray-100">
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">ARTISAN NAME</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">ORDER ID</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">ITEM TYPE</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">STAGE</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">DUE DATE</th>
                  <th className="py-2.5 px-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading && liveJobs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400 text-xs">
                      <i className="fa-solid fa-spinner fa-spin text-[#9e1b27] mr-2"></i>
                      Loading live jobs...
                    </td>
                  </tr>
                ) : liveJobs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400 text-xs">
                      No active work orders found. Click "+ New Work Order" to create one.
                    </td>
                  </tr>
                ) : (
                  liveJobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => navigate(`/job-order/${job.id}`)}
                      className="hover:bg-[#fafafa] transition-colors group cursor-pointer"
                    >
                      
                      {/* Artisan Name with Avatar */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${job.avatar_color}`}>
                            {job.initials}
                          </div>
                          <span className="font-semibold text-gray-900 text-xs">
                            {job.artisan_name}
                          </span>
                        </div>
                      </td>

                      {/* Order ID */}
                      <td className="py-3.5 px-3 font-medium text-gray-500 text-xs whitespace-nowrap">
                        {job.work_order_number}
                      </td>

                      {/* Item Type */}
                      <td className="py-3.5 px-3 font-medium text-gray-800 text-xs">
                        <div className="max-w-[150px] truncate" title={job.item_type}>
                          {job.item_type}
                        </div>
                      </td>

                      {/* Stage Pill */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${job.stage_class}`}>
                          {job.stage}
                        </span>
                      </td>

                      {/* Due Date (Red if overdue) */}
                      <td className={`py-3.5 px-3 text-xs whitespace-nowrap font-medium ${
                        job.is_overdue ? 'text-[#dc2626] font-bold' : 'text-gray-500'
                      }`}>
                        {job.due_date}
                      </td>

                      {/* 3-dots Actions Menu */}
                      <td className="py-3.5 px-2 text-right relative whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === job.id ? null : job.id);
                          }}
                          className="w-6 h-6 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center text-xs transition-colors cursor-pointer"
                        >
                          <i className="fa-solid fa-ellipsis-vertical"></i>
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === job.id && (
                          <div
                            ref={actionMenuRef}
                            className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30 text-left animate-in fade-in zoom-in-95 duration-75"
                          >
                            <Link
                              to={`/job-order/${job.id}`}
                              className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                            >
                              <i className="fa-solid fa-file-invoice text-stone-400 text-[11px]"></i>
                              <span>View Work Order</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowQuickViewModal(true);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <i className="fa-solid fa-eye text-stone-400 text-[11px]"></i>
                              <span>Quick View Details</span>
                            </button>
                            <Link
                              to="/job-order/receive"
                              className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                            >
                              <i className="fa-solid fa-arrows-spin text-stone-400 text-[11px]"></i>
                              <span>Update Stage</span>
                            </Link>
                            <a
                              href={`/work-orders/${job.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full px-3 py-2 text-xs text-[#9e1b27] hover:bg-red-50 flex items-center gap-2 font-semibold border-t border-gray-100"
                            >
                              <i className="fa-solid fa-file-pdf text-[11px]"></i>
                              <span>Download Work Order PDF</span>
                            </a>
                          </div>
                        )}
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination directly inside Live Job creation Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-3 border-t border-gray-100">
            <div className="text-[11px] text-[#6b7280]">
              Showing{' '}
              <span className="font-semibold text-gray-900">{paginationMeta.from || 0}</span> to{' '}
              <span className="font-semibold text-gray-900">{paginationMeta.to || 0}</span> of{' '}
              <span className="font-semibold text-gray-900">{paginationMeta.total || 0}</span> work orders
            </div>

            {/* Dynamic Pagination Controls */}
            <div className="flex items-center gap-1">
              {/* Previous */}
              <button
                type="button"
                disabled={paginationMeta.current_page <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="w-6 h-6 flex items-center justify-center rounded border border-[#e5e7eb] disabled:opacity-40 text-gray-500 hover:bg-gray-50 text-[11px] transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-chevron-left text-[9px]"></i>
              </button>

              {/* Numbered Page Buttons */}
              {Array.from({ length: paginationMeta.last_page || 1 }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-6 h-6 flex items-center justify-center rounded text-[11px] font-semibold cursor-pointer ${
                    paginationMeta.current_page === pageNum
                      ? 'bg-[#9e1b27] text-white'
                      : 'border border-[#e5e7eb] text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              {/* Next */}
              <button
                type="button"
                disabled={paginationMeta.current_page >= paginationMeta.last_page}
                onClick={() => setCurrentPage((prev) => Math.min(paginationMeta.last_page, prev + 1))}
                className="w-6 h-6 flex items-center justify-center rounded border border-[#e5e7eb] disabled:opacity-40 text-gray-500 hover:bg-gray-50 text-[11px] transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-chevron-right text-[9px]"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Material Allocation (Real Data from Project DB) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-[#eceff3] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#111827] tracking-tight mb-5">
              Material Allocation
            </h2>

            {/* List of Material Allocations */}
            {materialAllocations.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                No active material allocations recorded.
              </div>
            ) : (
              <div className="space-y-4">
                {materialAllocations.map((alloc, i) => (
                  <div
                    key={i}
                    className="pl-3 py-0.5 border-l-4"
                    style={{ borderColor: alloc.color || '#78591e' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-gray-900 leading-snug">
                          {alloc.artisan_name}
                        </div>
                        <div className="text-[10.5px] text-[#9ca3af]">
                          {alloc.material_title}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-gray-900 leading-snug">
                          {alloc.issued_weight}
                        </div>
                        <div className="text-[10.5px] text-[#9ca3af]">
                          {alloc.balance_weight}
                        </div>
                      </div>
                    </div>

                    {/* Horizontal Bar */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          backgroundColor: alloc.color || '#78591e',
                          width: `${Math.min(100, Math.max(8, alloc.percent || 15))}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Audit Log Button */}
          <button
            type="button"
            onClick={() => setShowAuditModal(true)}
            className="w-full mt-6 py-2.5 px-4 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#374151] font-semibold text-xs rounded-lg border border-[#e2e8f0] transition-colors text-center cursor-pointer shadow-2xs"
          >
            Detailed Audit Log
          </button>
        </div>

      </div>

      {/* 6. Bottom Section: Quality Check Queue (Final Approval - Real Database Items) */}
      <div className="mb-8">
        <div className="border-b border-[#eceff3] pb-2.5 mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#111827] tracking-tight">
            Quality Check Queue (Final Approval)
          </h2>
          <span className="text-[11px] font-semibold text-stone-400">
            {qcItems.length} item{qcItems.length === 1 ? '' : 's'} awaiting manager inspection
          </span>
        </div>

        {/* Horizontal Cards Grid */}
        {qcItems.length === 0 ? (
          <div className="bg-stone-50 border border-dashed border-stone-200 rounded-xl p-8 text-center text-xs text-stone-400">
            <i className="fa-solid fa-circle-check text-2xl text-emerald-500 mb-2 block"></i>
            <span className="font-semibold text-gray-700 block">No jobs currently pending Quality Check inspection</span>
            <span className="text-[11px] text-gray-400 mt-1 block">
              When an artisan completes a piece in Receive Work Order, it will appear here for floor manager approval.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {qcItems.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-xl border border-[#eceff3] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-3 flex flex-col justify-between hover:border-gray-300 transition-colors"
              >
                <div>
                  {/* Image Box - Optimized and fast loading */}
                  <div className="relative h-32 rounded-lg overflow-hidden bg-stone-100 mb-3">
                    <img
                      src={card.image_url}
                      alt={card.product_name}
                      loading="eager"
                      fetchPriority="high"
                      decoding="sync"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    {card.is_priority && (
                      <span className="absolute top-2 right-2 bg-[#ea580c] text-white text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wider shadow-2xs uppercase">
                        PRIORITY
                      </span>
                    )}
                  </div>

                  {/* Title & QC Code */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-900 truncate max-w-[140px]" title={card.product_name}>
                      {card.product_name}
                    </h3>
                    <span className="text-[10px] font-semibold text-[#9ca3af]">
                      {card.qc_code}
                    </span>
                  </div>

                  {/* Artisan Info */}
                  <p className="text-[10.5px] text-[#6b7280] mt-0.5 mb-3">
                    Artisan: {card.artisan_name}
                  </p>
                </div>

                {/* Action Buttons: Approve & Reject */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleApproveQC(card)}
                    className="py-1.5 px-3 bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-bold text-xs rounded-md transition-colors text-center cursor-pointer shadow-2xs"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleOpenReject(card)}
                    className="py-1.5 px-3 bg-white hover:bg-red-50 disabled:opacity-50 text-[#ef4444] border border-[#ef4444] font-bold text-xs rounded-md transition-colors text-center cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}

            {/* Quick link card to QC Hub */}
            <Link
              to="/job-order/quality-check"
              className="border-2 border-dashed border-[#d1d5db] hover:border-gray-400 rounded-xl bg-white p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[220px]"
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-2.5 text-lg">
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </div>
              <span className="text-xs font-bold text-gray-900">
                Quality Check Hub
              </span>
              <p className="text-[10px] text-gray-400 mt-1 max-w-[150px] leading-tight">
                View all items & inspection history
              </p>
            </Link>
          </div>
        )}
      </div>

      {/* MODAL 1: Real Detailed Audit Log Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#9e1b27]/10 text-[#9e1b27] flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-scale-balanced"></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Artisan Material Audit Log</h3>
                  <p className="text-[11px] text-gray-500">Live metals & stones balance reconciliation from database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center text-xs cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase">
                    <th className="py-2">Artisan</th>
                    <th className="py-2">Material</th>
                    <th className="py-2 text-right">Issued</th>
                    <th className="py-2 text-right">Returned</th>
                    <th className="py-2 text-right">Scrap/Loss</th>
                    <th className="py-2 text-right">Current Vault Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-4 text-center text-gray-400">
                        No active audit balances found.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td className="py-3 font-semibold text-gray-900">{log.artisan_name}</td>
                        <td className="py-3 text-stone-600">{log.material}</td>
                        <td className="py-3 text-right font-mono font-bold">{log.issued}</td>
                        <td className="py-3 text-right font-mono text-emerald-600">{log.returned}</td>
                        <td className="py-3 text-right font-mono text-amber-600">{log.loss}</td>
                        <td className="py-3 text-right font-mono font-bold text-[#9e1b27]">{log.vault_balance}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-100 bg-stone-50 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">Calculated directly from registered karigars and active work orders</span>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-1.5 bg-[#9e1b27] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Quick View Job Modal */}
      {showQuickViewModal && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-stone-50">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#9e1b27] bg-red-50 px-2 py-0.5 rounded">
                  {selectedJob.work_order_number}
                </span>
                <h3 className="font-bold text-gray-900 text-sm mt-1">{selectedJob.item_type}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickViewModal(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center text-xs cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Artisan:</span>
                <span className="font-bold text-gray-900">{selectedJob.artisan_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Current Manufacturing Stage:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedJob.stage_class}`}>
                  {selectedJob.stage}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Material Specification:</span>
                <span className="font-medium text-gray-900">{selectedJob.material}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Allotted Weight:</span>
                <span className="font-mono font-bold text-gray-900">{selectedJob.allotted_weight}g</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Completed Weight:</span>
                <span className="font-mono font-bold text-emerald-600">{selectedJob.completed_weight}g</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Pending Weight:</span>
                <span className="font-mono font-bold text-[#9e1b27]">{selectedJob.pending_weight}g</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Delivery Due Date:</span>
                <span className={`font-bold ${selectedJob.is_overdue ? 'text-red-600' : 'text-gray-900'}`}>
                  {selectedJob.due_date} {selectedJob.is_overdue ? '(OVERDUE)' : ''}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-stone-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowQuickViewModal(false)}
                className="px-4 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
              <Link
                to="/job-order/receive"
                className="px-4 py-1.5 bg-[#9e1b27] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Open Receiver Work
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Reject / Return Modal */}
      {showRejectModal && rejectingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-rose-50/50">
              <h3 className="font-bold text-rose-900 text-sm flex items-center gap-1.5">
                <i className="fa-solid fa-circle-exclamation text-rose-600"></i>
                <span>Reject & Return for Rework</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="w-6 h-6 rounded-full hover:bg-gray-200 text-gray-400 flex items-center justify-center text-xs cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-600">
                Returning <strong className="text-gray-900">{rejectingItem.product_name}</strong> ({rejectingItem.work_order_number || rejectingItem.qc_code}) back to artisan <strong className="text-gray-900">{rejectingItem.artisan_name}</strong>.
              </p>
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Rejection Reason / Required Rectifications:
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Loose prong setting, surface porosity on clasp..."
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-hidden resize-none"
                ></textarea>
              </div>
            </div>

            <div className="p-3 border-t border-gray-100 bg-stone-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmReject}
                className="px-4 py-1.5 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-2xs"
              >
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
