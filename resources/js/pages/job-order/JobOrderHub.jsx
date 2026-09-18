import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import WorkInProgress from './WorkInProgress';
import WasteDetails from './WasteDetails';
import QualityCheckDetails from './QualityCheckDetails';
import HistoryDetails from './HistoryDetails';

export const resolveItemImage = (item) => {
  const raw = item?.image_url || item?.product?.image_url || item?.product?.image;
  if (!raw) return '/placeholder-jewelry.png';
  if (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('/images/')) return raw;
  if (raw.startsWith('/storage/')) return raw;
  if (raw.startsWith('storage/')) return `/${raw}`;
  if (raw.startsWith('products/')) return `/storage/${raw}`;
  if (raw.startsWith('/')) return raw;
  return `/storage/${raw}`;
};

const TABS = [
  { id: 'in-progress', label: 'Work in Progress', icon: 'fa-solid fa-spinner', countKey: 'in_progress' },
  { id: 'delay', label: 'Delay / Job Details', icon: 'fa-solid fa-triangle-exclamation', countKey: 'delayed' },
  { id: 'waste', label: 'Waste Details', icon: 'fa-solid fa-recycle', countKey: 'waste' },
  { id: 'quality-check', label: 'Quality Check', icon: 'fa-solid fa-clipboard-check', countKey: 'quality_check' },
  { id: 'final-receive', label: 'Final Receive', icon: 'fa-solid fa-circle-check', countKey: 'final_receive' },
  { id: 'history', label: 'History & Audit', icon: 'fa-solid fa-clock-rotate-left', countKey: 'history' },
];

export default function JobOrderHub({ initialTab = 'in-progress' }) {
  const { showConfirm, showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path or prop
  const currentPath = location.pathname.split('/').pop();
  const [activeTab, setActiveTab] = useState(
    TABS.some(t => t.id === currentPath) ? currentPath : initialTab
  );

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Selected Order for Timeline Drawer or Action Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (TABS.some(t => t.id === currentPath)) {
      setActiveTab(currentPath);
    }
  }, [currentPath]);

  useEffect(() => {
    fetchOrders(activeTab);
  }, [activeTab]);

  const fetchOrders = async (tab) => {
    try {
      setLoading(true);
      const apiTabMap = {
        'in-progress': 'in_progress',
        'delay': 'delayed',
        'waste': 'waste',
        'quality-check': 'quality_check',
        'final-receive': 'final_receive',
        'history': 'history',
      };

      const res = await api.get('/work-orders', {
        params: { tab: apiTabMap[tab] || 'all', search }
      });
      setOrders(res.data.data || []);
    } catch (err) {
      console.error('Failed to load work orders for tab:', tab, err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tabId) => {
    if (tabId === 'in-progress') {
      navigate('/job-order/in-progress');
      return;
    }
    setActiveTab(tabId);
    navigate(`/job-order/${tabId}`);
  };

  // Quality Approval Action
  const handleApprove = async (orderId) => {
    const confirmed = await showConfirm({
      title: 'Approve Work Order',
      message: 'Are you sure you want to approve this work order? It will be marked as Ready for delivery.',
      icon: 'fa-solid fa-circle-check',
      confirmText: 'Approve Order'
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.post(`/work-orders/${orderId}/approve`);
      await api.post(`/work-orders/${orderId}/mark-ready`);
      showToast('Work order approved successfully!', 'success');
      fetchOrders(activeTab);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve work order.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject / Return Action
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !rejectReason) return;
    try {
      setActionLoading(true);
      await api.post(`/work-orders/${selectedOrder.id}/return`, {
        return_reason: rejectReason,
        returned_weight: selectedOrder.completed_weight,
      });
      showToast('Work order returned to artisan.', 'info');
      setShowRejectModal(false);
      setRejectReason('');
      fetchOrders(activeTab);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to return work order.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Final Receive Action
  const handleFinalReceive = async (orderId) => {
    const confirmed = await showConfirm({
      title: 'Final Receive Confirmation',
      message: 'Confirm final receive of finished jewelry item into store inventory?',
      icon: 'fa-solid fa-box-archive',
      confirmText: 'Confirm Final Receive'
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.post(`/work-orders/${orderId}/final-receive`);
      showToast('Final receive completed. Product added to inventory.', 'success');
      fetchOrders(activeTab);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to complete final receive.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewHistory = async (order) => {
    try {
      const res = await api.get(`/work-orders/${order.id}`);
      setSelectedOrder(res.data.data);
      setShowHistoryModal(true);
    } catch (err) {
      setSelectedOrder(order);
      setShowHistoryModal(true);
    }
  };

  if (activeTab === 'in-progress') {
    return <WorkInProgress />;
  }

  if (activeTab === 'waste') {
    return <WasteDetails />;
  }

  if (activeTab === 'quality-check') {
    return <QualityCheckDetails />;
  }

  if (activeTab === 'history') {
    return <HistoryDetails />;
  }

  return (
    <div className="w-full pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
      
      {/* 1. Header with Breadcrumb & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 font-semibold mb-1">
            <Link to="/dashboard" className="hover:text-stone-900">Dashboard</Link>
            <i className="fa-solid fa-chevron-right text-[9px] text-stone-300"></i>
            <span>Job Order Workflow</span>
            <i className="fa-solid fa-chevron-right text-[9px] text-stone-300"></i>
            <span className="text-[#b01622] font-bold">
              {TABS.find(t => t.id === activeTab)?.label}
            </span>
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <span>Job Order Management</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-50 text-[#b01622] border border-red-200/80 font-bold">
              Synchronized Workflow
            </span>
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time control tower for active manufacturing, artisan deadlines, waste, quality approval and delivery history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/job-order/new"
            className="px-4 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-800 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-plus text-[#b01622]"></i>
            <span>New Work Order</span>
          </Link>
          <Link
            to="/job-order/receive"
            className="px-4 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-dolly"></i>
            <span>Receive Work Order</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Headings Navigation (Click Headings to Navigate to that Page) */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
        <div className="px-4 py-2.5 bg-stone-50/80 border-b border-stone-200/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-layer-group text-[#b01622] text-xs"></i>
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">Job Order Sub-Views</span>
          </div>
          <span className="text-[11px] text-stone-400 font-medium">Click any heading to navigate to that page</span>
        </div>

        <div className="p-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 min-w-[150px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#b01622] text-white shadow-xs ring-2 ring-[#b01622]/20'
                    : 'bg-stone-50/60 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/60'
                }`}
              >
                <i className={`${tab.icon} text-xs`}></i>
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-3.5 flex items-center justify-between gap-3 text-xs">
        <div className="relative min-w-[280px] flex-1 max-w-md">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders(activeTab)}
            placeholder="Search orders, artisans, items, metals..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-hidden focus:border-[#b01622] focus:bg-white"
          />
        </div>

        <button
          type="button"
          onClick={() => fetchOrders(activeTab)}
          className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <i className="fa-solid fa-rotate-right text-xs"></i>
          <span>Refresh View</span>
        </button>
      </div>

      {/* 4. Tab Specific Data Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
        
        {/* Table Title Banner */}
        <div className="p-4 border-b border-stone-200/80 bg-stone-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm tracking-tight">
              {TABS.find(t => t.id === activeTab)?.label}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-stone-200 text-stone-700">
              {orders.length} items
            </span>
          </div>

          {activeTab === 'delay' && (
            <span className="text-xs font-bold text-red-600 flex items-center gap-1.5">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>Allotted delivery deadline has passed</span>
            </span>
          )}

          {activeTab === 'waste' && (
            <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
              <i className="fa-solid fa-scale-unbalanced"></i>
              <span>Live material scrap & wastage variance</span>
            </span>
          )}

          {activeTab === 'quality-check' && (
            <span className="text-xs font-bold text-[#b01622] flex items-center gap-1.5">
              <i className="fa-solid fa-signature"></i>
              <span>Requires Master Artisan / Approver Sign-off</span>
            </span>
          )}
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[1020px]">
            <thead>
              <tr className="border-b border-stone-200/80 bg-stone-50/50 text-stone-700 font-semibold text-xs">
                <th className="py-3 px-4 whitespace-nowrap">Order #</th>
                <th className="py-3 px-3 whitespace-nowrap">Product / Item</th>
                <th className="py-3 px-3 whitespace-nowrap">Karigar / Aachari</th>
                <th className="py-3 px-3 whitespace-nowrap">Material</th>
                
                {/* Conditional Column Headers based on Tab */}
                {activeTab === 'waste' ? (
                  <>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Allotted Wt</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Finished Wt</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Scrap / Loss</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Allowed %</th>
                    <th className="py-3 px-3 whitespace-nowrap">Variance Status</th>
                  </>
                ) : activeTab === 'delay' ? (
                  <>
                    <th className="py-3 px-3 whitespace-nowrap">Due Date</th>
                    <th className="py-3 px-3 whitespace-nowrap">Delay Duration</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Completed Wt</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Pending Wt</th>
                    <th className="py-3 px-3 whitespace-nowrap">Artisan Workshop</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Allotted Wt</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Completed Wt</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Pending Wt</th>
                    <th className="py-3 px-3 whitespace-nowrap">Due Date</th>
                    <th className="py-3 px-3 whitespace-nowrap">Current Stage</th>
                  </>
                )}

                <th className="py-3 px-4 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-stone-400">
                    <i className="fa-solid fa-circle-notch fa-spin text-xl text-[#b01622] mr-2"></i>
                    Loading {TABS.find(t => t.id === activeTab)?.label}...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-stone-400 space-y-2">
                    <i className="fa-solid fa-clipboard-check text-3xl text-stone-300"></i>
                    <p className="font-semibold text-stone-600">No records found in this view</p>
                    <p className="text-[11px] text-stone-400">
                      All jobs are currently synchronized with the live database.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((wo) => {
                  const scrapWt = Math.max(0, wo.allotted_weight - wo.completed_weight);
                  const allowedScrap = (wo.allotted_weight * (wo.wastage_allowed_percent || 0)) / 100;
                  const isWithinWastage = scrapWt <= (allowedScrap + 0.05);

                  return (
                    <tr key={wo.id} className="hover:bg-stone-50/70 transition-colors">
                      {/* Order Number */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-[#b01622] bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                          {wo.work_order_number}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={resolveItemImage(wo)}
                            alt={wo.product_name}
                            loading="eager"
                            decoding="async"
                            width="32"
                            height="32"
                            className="w-8 h-8 rounded-lg object-cover border border-stone-200 bg-stone-100 shrink-0"
                            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-jewelry.png'; }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 text-xs truncate max-w-[170px]">
                              {wo.product_name}
                            </div>
                            <span className="font-mono text-[10px] text-stone-400 block">
                              {wo.design_code || 'DES-AUTO'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Karigar */}
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-stone-800">
                        <div>{wo.karigar_name || '—'}</div>
                        <span className="text-[10px] text-stone-400 block">{wo.karigar?.workshop_name}</span>
                      </td>

                      {/* Material */}
                      <td className="py-3 px-3 whitespace-nowrap text-stone-600 font-medium">
                        {wo.material_type}
                      </td>

                      {/* Dynamic Columns based on Active Tab */}
                      {activeTab === 'waste' ? (
                        <>
                          <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                            {Number(wo.allotted_weight).toFixed(3)} g
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {Number(wo.completed_weight).toFixed(3)} g
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#b01622] whitespace-nowrap">
                            {scrapWt.toFixed(3)} g
                          </td>
                          <td className="py-3 px-3 text-right font-mono whitespace-nowrap text-stone-600">
                            {wo.wastage_allowed_percent}% ({allowedScrap.toFixed(3)}g)
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isWithinWastage
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {isWithinWastage ? 'Normal Limit' : 'Excess Scrap'}
                            </span>
                          </td>
                        </>
                      ) : activeTab === 'delay' ? (
                        <>
                          <td className="py-3 px-3 font-mono font-bold text-red-600 whitespace-nowrap">
                            {wo.delivery_date ? new Date(wo.delivery_date).toLocaleDateString('en-GB') : '—'}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                              {wo.delay_days} days overdue
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                            {Number(wo.completed_weight).toFixed(3)} g
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#b01622] whitespace-nowrap">
                            {Number(wo.pending_weight).toFixed(3)} g
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-stone-600">
                            {wo.karigar?.workshop_address || wo.karigar?.city || 'Master Workshop'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                            {Number(wo.allotted_weight).toFixed(3)} g
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                            {Number(wo.completed_weight).toFixed(3)} g
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#b01622] whitespace-nowrap">
                            {Number(wo.pending_weight).toFixed(3)} g
                          </td>
                          <td className="py-3 px-3 font-mono text-stone-600 whitespace-nowrap">
                            {wo.delivery_date ? new Date(wo.delivery_date).toLocaleDateString('en-GB') : '—'}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-stone-100 text-stone-800 border border-stone-200">
                              {wo.current_stage ? wo.current_stage.replace(/_/g, ' ') : 'Created'}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          
                          {/* Quality Check Approval & Return Actions */}
                          {activeTab === 'quality-check' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(wo.id)}
                                disabled={actionLoading}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(wo);
                                  setShowRejectModal(true);
                                }}
                                disabled={actionLoading}
                                className="px-3 py-1 bg-white border border-red-300 hover:bg-red-50 text-red-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                Return
                              </button>
                            </>
                          )}

                          {/* Final Receive Action */}
                          {activeTab === 'final-receive' && (
                            <button
                              type="button"
                              onClick={() => handleFinalReceive(wo.id)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
                            >
                              <i className="fa-solid fa-box-open text-xs"></i>
                              <span>Final Receive</span>
                            </button>
                          )}

                          {/* History & Timeline Drawer Button */}
                          <button
                            type="button"
                            onClick={() => handleViewHistory(wo)}
                            className="w-7 h-7 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 flex items-center justify-center transition-colors cursor-pointer"
                            title="View Full Lifecycle History"
                          >
                            <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                          </button>

                          {/* Open in Work in Progress */}
                          <Link
                            to={`/job-order/in-progress?order_id=${wo.id}`}
                            className="w-7 h-7 rounded-lg hover:bg-red-50 text-stone-500 hover:text-[#b01622] flex items-center justify-center transition-colors cursor-pointer"
                            title="Open Work in Progress (Partial/Waiting)"
                          >
                            <i className="fa-solid fa-spinner text-xs"></i>
                          </Link>

                          {/* Open in Receive Work Order */}
                          <Link
                            to={`/job-order/receive?order_id=${wo.id}`}
                            className="w-7 h-7 rounded-lg hover:bg-amber-50 text-stone-500 hover:text-amber-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="Open in Receive Work Order"
                          >
                            <i className="fa-solid fa-dolly text-xs"></i>
                          </Link>

                          {/* Print PDF Button */}
                          <a
                            href={`/work-orders/${wo.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-lg hover:bg-red-50 text-stone-500 hover:text-[#b01622] flex items-center justify-center transition-colors cursor-pointer"
                            title="Print Work Order PDF"
                          >
                            <i className="fa-solid fa-print text-xs"></i>
                          </a>

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

      {/* 5. AUDIT HISTORY & TIMELINE MODAL */}
      {showHistoryModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4.5 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-amber-400"></i>
                  <span>Work Order Lifecycle History</span>
                </h3>
                <span className="font-mono text-xs text-stone-300">
                  {selectedOrder.work_order_number} • {selectedOrder.product_name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-3 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <span className="text-[10px] text-stone-400 block font-bold">Allotted Weight</span>
                  <span className="font-mono font-bold text-gray-900 text-sm">{Number(selectedOrder.allotted_weight).toFixed(3)}g</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block font-bold">Completed Weight</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">{Number(selectedOrder.completed_weight).toFixed(3)}g</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block font-bold">Artisan</span>
                  <span className="font-bold text-gray-900">{selectedOrder.karigar_name || 'Unassigned'}</span>
                </div>
              </div>

              <h4 className="font-bold text-stone-800 uppercase tracking-tight text-[11px] pt-2">
                Audit Timeline Events
              </h4>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                {(selectedOrder.timelines || []).map((tl, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#b01622] ring-4 ring-white"></div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-xs">{tl.stage_label || tl.stage}</span>
                      <span className="font-mono text-[10.5px] text-stone-400">
                        {tl.created_at ? new Date(tl.created_at).toLocaleString('en-GB') : '—'}
                      </span>
                    </div>
                    <p className="text-stone-600 text-[11px] mt-0.5">{tl.notes || 'Status progression recorded.'}</p>
                    <span className="text-[10px] text-stone-400 font-semibold block mt-0.5">
                      Recorded by: {tl.action_by_name || 'System'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 text-right">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-stone-800 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. RETURN / REJECT REASON MODAL */}
      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-md p-6 animate-in fade-in">
            <h3 className="font-bold text-base text-gray-900 mb-1 flex items-center gap-2">
              <i className="fa-solid fa-rotate-left text-[#b01622]"></i>
              Return Work Order to Artisan
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Specify reason for returning {selectedOrder.work_order_number} for rework or recasting.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-800 block mb-1">Return Reason / Quality Defect *</label>
                <textarea
                  rows="3"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Solder porosity visible under 10x loupe. Re-buff and mount 2 loose diamonds..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#b01622] focus:outline-hidden"
                  required
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 font-bold text-stone-700 hover:bg-stone-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  {actionLoading ? 'Submitting...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
