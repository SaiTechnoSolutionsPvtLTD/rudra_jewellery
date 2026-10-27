import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { cleanProductName } from '../../utils/formatters';

export default function ReadyDetails() {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const queryId = new URLSearchParams(location.search).get('order_id');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/work-orders/ready-pieces');
      const list = res.data?.data || [];
      setWorkOrders(list);

      if (queryId) {
        const found = list.find(o => String(o.work_order_id || o.id) === String(queryId));
        if (found) {
          setSelectedOrder(found);
        }
      } else {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Failed to fetch ready pieces:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [location.search, queryId]);

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    navigate(`/job-order/ready?order_id=${order.work_order_id || order.id}`);
  };

  const handleBackToList = () => {
    setSelectedOrder(null);
    navigate('/job-order/ready');
  };

  const handleFinalizeInventory = async (woId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/work-orders/${woId}/finalize-inventory`);
      if (res.data.status === 'success') {
        showToast(res.data.message || 'Inventory posted successfully!', 'success');
        fetchWorkOrders();
        if (selectedOrder && (selectedOrder.work_order_id === woId || selectedOrder.id === woId)) {
          setSelectedOrder(res.data.data);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to finalize inventory', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrders = workOrders.filter(wo => {
    const term = searchTerm.toLowerCase();
    const designNo = wo.design_no || wo.items?.[0]?.design_no || wo.design_code || '';
    const woNum = wo.work_order_number || '';
    const prodName = wo.product_name || '';
    const pieceNum = String(wo.piece_number || '');
    const karat = wo.gold_karat || wo.karat || '';
    const artisan = wo.artisan_name || wo.karigar?.name || '';

    return (
      woNum.toLowerCase().includes(term) ||
      prodName.toLowerCase().includes(term) ||
      designNo.toLowerCase().includes(term) ||
      pieceNum.includes(term) ||
      karat.toLowerCase().includes(term) ||
      artisan.toLowerCase().includes(term)
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
    { label: 'Ready', path: '/job-order/ready', active: true },
    { label: 'Certification', path: '/job-order/certification' },
    { label: 'Hallmarking', path: '/job-order/hallmarking' },
    { label: 'History', path: '/job-order/history' }
  ];

  const jobId = selectedOrder?.design_code || selectedOrder?.work_order_number || (selectedOrder?.id ? `WO-${selectedOrder.id}` : '');

  return (
    <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-[#1c1917]">
      
      {/* BREADCRUMB & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] text-stone-500 font-medium mb-1">
            <span>Manufacturing</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span>Job Orders</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span>QC Approved</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span className="text-stone-800 font-semibold">Ready</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight">
              Ready Products Hub {selectedOrder ? `- ${jobId}` : ''}
            </h1>

            {!selectedOrder && (
              <div className="relative w-full sm:w-80">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Search Work Order No, Design, Product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-7 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622] shadow-2xs"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedOrder && (
            <button
              type="button"
              onClick={handleBackToList}
              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-md shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left text-[11px] text-stone-600"></i>
              <span>Back to Ready List</span>
            </button>
          )}

        </div>
      </div>

      {/* SUB NAVIGATION TABS */}
      <div className="border-b border-[#ebd0cb]">
        <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
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

      {/* MAIN CONTENT: TABLE OR DETAIL VIEW */}
      {!selectedOrder ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#111827] tracking-tight">
                Products Ready for Physical Receiving ({filteredOrders.length})
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                QC approved items awaiting physical piece receiving. Once received, products move directly to Certification.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-stone-400">
              <i className="fa-solid fa-circle-notch fa-spin text-xl text-[#b01622] mr-2"></i>
              Loading ready products...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <i className="fa-solid fa-box text-3xl text-stone-300 mb-2 block"></i>
              <p className="font-semibold text-stone-600">No Ready Products Found</p>
              <p className="text-[11px] text-stone-400 mt-1">QC passed products will appear here immediately.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs bg-white">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">S.NO</th>
                    <th className="py-3 px-4">WORK ORDER & DESIGN</th>
                    <th className="py-3 px-4">PRODUCT & ARTISAN</th>
                    <th className="py-3 px-4 text-center">QUANTITIES (APP / REC / FIN)</th>
                    <th className="py-3 px-4 text-right">QC MEASUREMENTS</th>
                    <th className="py-3 px-4 text-center">CERTIFICATION</th>
                    <th className="py-3 px-4 text-center">HALLMARKING</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap min-w-[140px]">POSTING STATUS</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedOrders.map((wo, idx) => {
                    const designNo = wo.design_no || wo.items?.[0]?.design_no || wo.design_code || 'D-WO-' + (wo.work_order_id || wo.id);
                    const certStatus = wo.certification_status || 'pending';
                    const hallStatus = wo.hallmarking_status || 'pending';
                    const targetWoId = wo.work_order_id || wo.id;
                    const targetPieceId = wo.piece_id || wo.id;

                    return (
                      <tr
                        key={`${targetWoId}-${targetPieceId}`}
                        className="hover:bg-stone-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-stone-400 text-xs">
                          {startIndex + idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-bold text-[#b01622] block">{wo.work_order_number}</span>
                          <span className="text-[10.5px] text-stone-500 font-semibold">{designNo}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          {cleanProductName(wo.product_name, designNo)}
                          <span className="font-mono text-[10px] text-stone-500 block font-normal">
                            Artisan: {wo.artisan_name || wo.karigar?.name || wo.karigar_name || 'In-House'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200 inline-block shadow-2xs">
                            Piece #{wo.piece_number || 1}
                          </span>
                          <span className="text-[10px] text-stone-400 block mt-0.5">1 pc ready</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-[11px]">
                          <span className="block font-bold text-stone-900">Gross: {wo.gross_weight != null ? `${Number(wo.gross_weight).toFixed(3)}g` : '—'}</span>
                          <span className="block font-semibold text-emerald-700">Net: {wo.net_gold_weight != null ? `${Number(wo.net_gold_weight).toFixed(3)}g` : '—'}{wo.gold_karat || wo.karat ? ` (${wo.gold_karat || wo.karat})` : ''}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {certStatus === 'completed' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 block">
                              <i className="fa-solid fa-check text-[9px] mr-1"></i>
                              {wo.pricing_details?.certification_no || wo.certification_no || 'Certified'}
                            </span>
                          ) : certStatus === 'skipped' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-500 border border-stone-200 block">
                              Skipped
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 block">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {hallStatus === 'completed' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 block">
                              <i className="fa-solid fa-shield-halved text-[9px] mr-1"></i>
                              {wo.pricing_details?.huid || wo.huid || 'Hallmarked'}
                            </span>
                          ) : hallStatus === 'skipped' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-500 border border-stone-200 block">
                              Skipped
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 block">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {wo.is_inventory_posted ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap inline-flex items-center justify-center">
                              Posted to Stock
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-800 border border-purple-200 whitespace-nowrap inline-flex items-center justify-center">
                              Ready for Receive
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleSelectOrder(wo)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded text-[11px] font-bold transition-all cursor-pointer"
                              title="View Details"
                            >
                              <i className="fa-solid fa-eye text-[10px] mr-1"></i>
                              Details
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/job-order/receive?order_id=${targetWoId}&piece_id=${targetPieceId}`)}
                              className="px-3 py-1 bg-[#b01622] hover:bg-[#8f1019] text-white rounded text-[11px] font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                              title="Physical Receive"
                            >
                              <i className="fa-solid fa-box-archive text-[10px]"></i>
                              <span>Receive Piece #{wo.piece_number || 1}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                            safePage === page
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
      ) : (
        /* DETAIL VIEW */
        <div className="bg-[#F4F6F7] rounded-xl border border-[#eed5d1] p-6 shadow-2xs max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#eed5d1]">
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">{selectedOrder.product_name}</h2>
              <span className="font-mono text-xs text-stone-500">
                Work Order: {selectedOrder.work_order_number} | Design: {selectedOrder.items?.[0]?.design_no || selectedOrder.design_code}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              QC Approved Ready
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* QUANTITIES DASHBOARD CARD */}
            <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-stone-200 text-center font-mono">
              <div>
                <span className="text-[10px] text-stone-400 block font-sans">APPROVED</span>
                <span className="font-bold text-stone-900 text-sm">{selectedOrder.ready_qty || selectedOrder.qc_approved_qty || 1}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-sans font-semibold text-blue-600">RECEIVED</span>
                <span className="font-bold text-blue-700 text-sm">{selectedOrder.received_qty || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-sans font-semibold text-amber-600">REMAINING</span>
                <span className="font-bold text-amber-700 text-sm">{Math.max(0, (selectedOrder.ready_qty || 1) - (selectedOrder.received_qty || 0))}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-sans font-semibold text-emerald-600">FINALIZED</span>
                <span className="font-bold text-emerald-700 text-sm">{selectedOrder.finalized_qty || 0}</span>
              </div>
            </div>

            {/* PROCESS STATUS BADGES */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold border ${
                selectedOrder.certification_status === 'completed' 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : selectedOrder.certification_status === 'skipped'
                  ? 'bg-stone-100 text-stone-600 border-stone-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <i className="fa-solid fa-award"></i> Cert: {selectedOrder.certification_status === 'skipped' ? 'Skipped' : selectedOrder.certification_status === 'completed' ? 'Completed' : '—'}
              </span>

              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold border ${
                selectedOrder.hallmarking_status === 'completed' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : selectedOrder.hallmarking_status === 'skipped'
                  ? 'bg-stone-100 text-stone-600 border-stone-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <i className="fa-solid fa-shield-halved"></i> Hallmarking: {selectedOrder.hallmarking_status === 'skipped' ? 'Skipped' : selectedOrder.hallmarking_status === 'completed' ? 'Completed' : '—'}
              </span>
            </div>

            {/* MEASUREMENTS & ARTISAN */}
            <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-stone-200">
              <div>
                <span className="text-stone-400 block">Purity:</span>
                <span className="font-bold text-stone-900">{selectedOrder.karat || '22K'} Gold</span>
              </div>
              <div>
                <span className="text-stone-400 block">Artisan / Karigar:</span>
                <span className="font-bold text-stone-900">{selectedOrder.karigar?.name || selectedOrder.karigar_name || 'In-House'}</span>
              </div>
              <div>
                <span className="text-stone-400 block">QC Gross Weight:</span>
                <span className="font-bold text-stone-900 font-mono">{Number(selectedOrder.gross_weight || selectedOrder.actual_gross_weight || 0).toFixed(3)}g</span>
              </div>
              <div>
                <span className="text-stone-400 block">QC Net Weight:</span>
                <span className="font-bold text-emerald-700 font-mono">{Number(selectedOrder.net_weight || selectedOrder.actual_net_weight || 0).toFixed(3)}g</span>
              </div>
            </div>

            {/* NAVIGATION & ACTION BUTTONS */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(`/job-order/receive?order_id=${selectedOrder.id}`)}
                className="col-span-2 py-3 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl font-bold text-sm shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-box-archive text-sm"></i>
                <span>Proceed to Receive Work Order</span>
              </button>

              <button
                type="button"
                onClick={() => navigate(`/job-order/history?tab=certification&order_id=${selectedOrder.id}`)}
                className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-award text-xs"></i>
                <span>Certification (in History)</span>
              </button>

              <button
                type="button"
                onClick={() => navigate(`/job-order/history?tab=hallmarking&order_id=${selectedOrder.id}`)}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-shield-halved text-xs"></i>
                <span>Hallmarking (in History)</span>
              </button>

              <button
                type="button"
                onClick={() => navigate(`/job-order/history?order_id=${selectedOrder.id}`)}
                className="py-2.5 bg-stone-700 hover:bg-stone-800 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                <span>View Timeline History</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
