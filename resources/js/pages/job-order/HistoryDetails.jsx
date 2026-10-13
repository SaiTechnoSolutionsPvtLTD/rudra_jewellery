import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';

export default function HistoryDetails() {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    let mounted = true;
    const loadHistory = async () => {
      try {
        setLoading(true);
        const queryId = new URLSearchParams(location.search).get('order_id');
        const res = await api.get('/work-orders', { params: { tab: 'history' } });
        const list = res.data?.data || [];

        if (mounted) {
          setCompletedOrders(list);
          if (queryId) {
            const found = list.find(o => String(o.id) === String(queryId));
            if (found) {
              setSelectedOrder(found);
              setShowTimelineModal(true);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load completed history:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadHistory();
    return () => { mounted = false; };
  }, [location.search]);

  const handleRowClick = async (order) => {
    try {
      const response = await api.get(`/work-orders/${order.id}`);
      setSelectedOrder(response.data?.data || order);
    } catch (e) {
      setSelectedOrder(order);
    }
    setShowTimelineModal(true);
  };

  const filteredOrders = completedOrders.filter(wo => {
    const term = searchTerm.toLowerCase();
    return (
      wo.work_order_number?.toLowerCase().includes(term) ||
      wo.product_name?.toLowerCase().includes(term) ||
      wo.karigar_name?.toLowerCase().includes(term) ||
      wo.certification_no?.toLowerCase().includes(term) ||
      wo.huid?.toLowerCase().includes(term)
    );
  });

  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const subNavLinks = [
    { label: 'Work In Progress', path: '/job-order/in-progress' },
    { label: 'Delay / Job Details', path: '/job-order/delay' },
    { label: 'Quality Check', path: '/job-order/quality-check' },
    { label: 'Ready', path: '/job-order/ready' },
    { label: 'Certification', path: '/job-order/certification' },
    { label: 'Hallmarking', path: '/job-order/hallmarking' },
    { label: 'History', path: '/job-order/history', active: true }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-stone-400 gap-3 font-['Inter',sans-serif]">
        <div className="w-10 h-10 border-4 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-stone-600">Loading History Details...</span>
      </div>
    );
  }

  return (
    <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-[#1c1917]">

      {/* 1. BREADCRUMB & TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[12px] text-stone-500 font-medium mb-1">
            <span>Manufacturing</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span>Job Orders</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span className="text-stone-800 font-semibold">Completed Works History</span>
          </div>

          {/* Main Title & Search Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight">
              Completed Projects &amp; History
            </h1>

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
          </div>
        </div>

      </div>

      {/* 2. STANDARDIZED WORKFLOW SUB-NAVIGATION TABS */}
      <div className="border-b border-[#ebd0cb]">
        <div className="flex items-center gap-8 sm:gap-10 overflow-x-auto no-scrollbar">
          {subNavLinks.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`pb-3 text-[14px] font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                tab.active
                  ? 'text-[#5c2725] border-[#b01622]'
                  : 'text-[#6e2d27] hover:text-[#b01622] border-transparent'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 3. COMPLETED HISTORY TABLE */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#111827] tracking-tight">
                Completed Projects &amp; History ({filteredOrders.length})
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Click any row to view full history tracking &amp; audit timeline.
              </p>
            </div>
          </div>

        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            <i className="fa-solid fa-clock-rotate-left text-4xl text-stone-300 mb-2 block"></i>
            <p className="font-semibold text-base text-stone-700">No Completed Projects Found</p>
            <p className="text-xs text-stone-400 mt-1">Archived job orders will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3 px-4">WORK ORDER NO</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Aachari / Artisan</th>
                  <th className="py-3 px-4 text-right">Allotted Wt</th>
                  <th className="py-3 px-4 text-right">Final Wt</th>
                  <th className="py-3 px-4">Certification</th>
                  <th className="py-3 px-4">HUID Code</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedOrders.map((wo) => (
                  <tr
                    key={wo.id}
                    onClick={() => handleRowClick(wo)}
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
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-stone-700">
                      {Number(wo.allotted_weight || 0).toFixed(3)}g
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                      {Number(wo.completed_weight || wo.gross_weight || 0).toFixed(3)}g
                    </td>
                    <td className="py-3.5 px-4">
                      {wo.certification_no ? (
                        <span className="font-mono text-xs font-semibold text-blue-700">
                          {wo.certification_no}
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {wo.huid ? (
                        <span className="font-mono text-xs font-semibold text-emerald-700">
                          {wo.huid}
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Completed
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(wo);
                        }}
                        className="px-3.5 py-1 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap inline-flex items-center gap-1"
                      >
                        <span>History Tracking</span>
                        <i className="fa-solid fa-chevron-right text-[10px]"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PAGINATION CONTROLS */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t border-stone-200/80 text-xs">
                <div className="text-stone-500 font-medium">
                  Showing <span className="font-semibold text-stone-800">{totalItems === 0 ? 0 : startIndex + 1}</span> to{' '}
                  <span className="font-semibold text-stone-800">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{' '}
                  <span className="font-semibold text-stone-800">{totalItems}</span> entries
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                  >
                    <i className="fa-solid fa-chevron-left text-[10px] mr-1"></i>
                    Previous
                  </button>
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${safePage === page
                          ? 'bg-[#b01622] text-white shadow-2xs'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                  >
                    Next
                    <i className="fa-solid fa-chevron-right text-[10px] ml-1"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Timeline Modal */}
      {showTimelineModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-[#b01622] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-rose-200"></i>
                  <span>Work Order Lifecycle History</span>
                </h3>
                <span className="font-mono text-xs text-rose-100">
                  {selectedOrder.work_order_number} • {selectedOrder.product_name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTimelineModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-4 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <span className="text-[10px] text-stone-400 block font-bold">Metal Purity</span>
                  <span className="font-bold text-stone-900">{selectedOrder.karat || '22K'} Gold</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block font-bold">Final Weight</span>
                  <span className="font-mono font-bold text-emerald-700">{Number(selectedOrder.completed_weight || selectedOrder.gross_weight || 0).toFixed(3)}g</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block font-bold">Certification</span>
                  <span className="font-mono font-bold text-blue-700">{selectedOrder.certification_no || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block font-bold">HUID Code</span>
                  <span className="font-mono font-bold text-emerald-700">{selectedOrder.huid || 'N/A'}</span>
                </div>
              </div>

              <h4 className="font-bold text-stone-900 uppercase tracking-tight text-[11px] pt-2">
                Audit Timeline Events
              </h4>

              <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                {(selectedOrder.timelines && selectedOrder.timelines.length > 0
                  ? selectedOrder.timelines
                  : [
                    { stage_label: 'Work Order Created', created_at: selectedOrder.created_at, notes: 'Order generated & assigned' },
                    { stage_label: 'Quality Check Approved', created_at: selectedOrder.approved_at || selectedOrder.updated_at, notes: 'Passed quality check inspection' },
                    { stage_label: 'Completed & Received', created_at: selectedOrder.updated_at, notes: 'Final receive to inventory completed' }
                  ]
                ).map((tl, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#b01622] ring-4 ring-white"></div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs">{tl.stage_label || tl.stage}</span>
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

            <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <a
                href={`/work-orders/${selectedOrder.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-white border border-stone-300 text-stone-800 font-bold text-xs rounded-lg hover:bg-stone-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <i className="fa-solid fa-print text-xs"></i> Print Audit PDF
              </a>
              <button
                type="button"
                onClick={() => setShowTimelineModal(false)}
                className="px-4 py-1.5 bg-[#b01622] text-white hover:bg-[#8f1019] rounded-lg font-bold text-xs cursor-pointer transition-all shadow-2xs"
              >
                Close Tracking
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}