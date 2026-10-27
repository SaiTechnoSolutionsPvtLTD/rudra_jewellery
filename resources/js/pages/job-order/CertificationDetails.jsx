import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function CertificationDetails({ isSubTab = false }) {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Form state
  const [certNo, setCertNo] = useState('');
  const [certAgency, setCertAgency] = useState('GIA - Gemological Institute of America');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const queryId = new URLSearchParams(location.search).get('order_id');

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/work-orders', { params: { tab: 'certification' } });
      const list = res.data?.data || [];
      setWorkOrders(list);

      if (queryId) {
        const found = list.find(o => String(o.id) === String(queryId));
        if (found) {
          handleSelectOrder(found);
        }
      } else {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Failed to fetch certification work orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [location.search, queryId]);

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setCertNo(order.certification_no || '');
    setCertAgency(order.certification_agency || 'GIA - Gemological Institute of America');
    setError('');
    setSuccessMsg('');
    if (!isSubTab) {
      navigate(`/job-order/certification?order_id=${order.id}`);
    }
  };

  const handleBackToList = () => {
    setSelectedOrder(null);
    if (!isSubTab) {
      navigate('/job-order/certification');
    }
  };

  const handleSaveCertification = async (moveToHallmarking = false) => {
    if (!selectedOrder) return;

    if (moveToHallmarking && !certNo.trim()) {
      setError('Please enter a valid Certification Number before moving to Hallmarking.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const payload = {
        work_order_item_id: selectedOrder.items?.[0]?.id || null,
        certification_no: certNo,
        certification_agency: certAgency,
        move_to_hallmarking: moveToHallmarking
      };

      const res = await api.post(`/work-orders/${selectedOrder.id}/update-certification`, payload);

      if (res.data.status === 'success') {
        showToast('Certification details saved successfully!', 'success');
        if (moveToHallmarking) {
          setTimeout(() => {
            setSelectedOrder(null);
            navigate('/job-order/hallmarking');
          }, 600);
        } else {
          fetchWorkOrders();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update Certification details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipCertification = async (orderId) => {
    try {
      setSubmitting(true);
      const res = await api.post(`/work-orders/${orderId}/update-certification`, {
        action: 'skip'
      });
      if (res.data.status === 'success') {
        showToast('Certification explicitly marked as Not Required / Skipped', 'info');
        fetchWorkOrders();
        setSelectedOrder(null);
        navigate('/job-order/hallmarking');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to skip certification', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredOrders = workOrders.filter(wo => {
    // Only display received pieces that are awaiting certification
    const recQty = wo.received_qty || 0;
    if (recQty <= 0) return false;
    const certQty = wo.certified_qty || 0;
    const certStatus = wo.certification_status;
    if (['completed', 'skipped', 'not_required'].includes(certStatus) && certQty >= recQty) {
      return false;
    }

    const term = searchTerm.toLowerCase();
    return (
      wo.work_order_number?.toLowerCase().includes(term) ||
      wo.product_name?.toLowerCase().includes(term) ||
      wo.karat?.toLowerCase().includes(term)
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
    { label: 'Certification', path: '/job-order/certification', active: true },
    { label: 'Hallmarking', path: '/job-order/hallmarking' },
    { label: 'History', path: '/job-order/history' }
  ];

  const jobId = selectedOrder?.design_code || selectedOrder?.work_order_number || (selectedOrder?.id ? `WO-${selectedOrder.id}` : '');

  return (
    <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-[#1c1917]">
      
      {/* 1. BREADCRUMB & TOP HEADER (hidden if embedded inside History tab) */}
      {!isSubTab && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-[12px] text-stone-500 font-medium mb-1">
                <span>Manufacturing</span>
                <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
                <span>Job Orders</span>
                <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
                <span>Reception</span>
                <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
                <span className="text-stone-800 font-semibold">Certification</span>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight">
                  Product Certification {selectedOrder ? `- ${jobId}` : ''}
                </h1>

                {!selectedOrder && (
                  <div className="relative w-full sm:w-80">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                    <input
                      type="text"
                      placeholder="Search Work Order No, Product, Karat..."
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
                  <span>Back to Certification List</span>
                </button>
              )}

              <Link
                to="/job-order/receive"
                className="px-3.5 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-md shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-arrow-left text-[11px] text-stone-500"></i>
                <span>Back to Receive Summary</span>
              </Link>
            </div>
          </div>

          {/* 2. SUB NAVIGATION TABS */}
          <div className="border-b border-[#ebd0cb]">
            <div className="flex items-center gap-10 overflow-x-auto no-scrollbar">
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
        </>
      )}

      {/* Embedded SubTab Header Search if isSubTab */}
      {isSubTab && !selectedOrder && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Products Pending Certification</h3>
            <p className="text-xs text-stone-500">Manage gemological and diamond certificates for received products.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search by WO#, Product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
            />
          </div>
        </div>
      )}

      {isSubTab && selectedOrder && (
        <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200">
          <span className="text-xs font-bold text-stone-800">
            Editing Certification for <span className="font-mono text-[#b01622]">{selectedOrder.work_order_number}</span> ({selectedOrder.product_name})
          </span>
          <button
            type="button"
            onClick={handleBackToList}
            className="px-3 py-1 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Back to List
          </button>
        </div>
      )}

      {/* 3. MAIN CONTENT: ROWS TABLE OR DETAIL FORM */}
      {!selectedOrder ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#111827] tracking-tight">
                Products Pending Certification ({filteredOrders.length})
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Click any product row to enter certificate details.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-stone-400">
              <i className="fa-solid fa-circle-notch fa-spin text-xl text-[#b01622] mr-2"></i>
              Loading certification items...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <i className="fa-solid fa-award text-3xl text-stone-300 mb-2 block"></i>
              <p className="font-semibold text-stone-600">No Items Pending Certification</p>
              <p className="text-[11px] text-stone-400 mt-1">QC passed products will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs bg-white">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">S.NO</th>
                    <th className="py-3 px-4">WORK ORDER NO</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Aachari / Artisan</th>
                    <th className="py-3 px-4 text-right">Gross Wt</th>
                    <th className="py-3 px-4 text-right">Net Wt</th>
                    <th className="py-3 px-4">Cert Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedOrders.map((wo, idx) => (
                    <tr
                      key={wo.id}
                      onClick={() => handleSelectOrder(wo)}
                      className="hover:bg-stone-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-stone-400 text-xs">
                        {startIndex + idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#b01622]">
                        {wo.work_order_number}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-stone-900">
                        {wo.product_name}
                        <span className="font-mono text-[10px] text-stone-400 block font-normal">
                          {wo.karat || '22K'} Gold
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-700 font-medium">
                        {wo.karigar?.name || wo.karigar_name || 'In-House'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                        {Number(wo.gross_weight || wo.actual_gross_weight || 0).toFixed(3)}g
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {Number(wo.net_weight || wo.actual_net_weight || 0).toFixed(3)}g
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                          wo.certification_no
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {wo.certification_no ? wo.certification_no : 'Pending Certificate'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectOrder(wo);
                          }}
                          className="px-3.5 py-1 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap inline-flex items-center gap-1"
                        >
                          <span>Add Certification</span>
                          <i className="fa-solid fa-chevron-right text-[9px]"></i>
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
        /* DETAIL FORM */
        <div className="bg-[#F4F6F7] rounded-xl border border-[#eed5d1] p-6 shadow-2xs max-w-3xl mx-auto space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#eed5d1]">
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">Enter Certification Details</h2>
              <span className="font-mono text-xs text-stone-500">
                {selectedOrder.work_order_number} • {selectedOrder.product_name}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              QC Passed
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200 font-semibold">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-stone-800 block mb-1">Certification Agency / Laboratory *</label>
              <select
                value={certAgency}
                onChange={(e) => setCertAgency(e.target.value)}
                className="w-full p-2.5 bg-white border border-stone-200 rounded-xl font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
              >
                <option value="GIA - Gemological Institute of America">GIA - Gemological Institute of America</option>
                <option value="IGI - International Gemological Institute">IGI - International Gemological Institute</option>
                <option value="SGL - Solitaire Gem Labs">SGL - Solitaire Gem Labs</option>
                <option value="BIS - Bureau of Indian Standards">BIS - Bureau of Indian Standards</option>
                <option value="In-House Hallmark Certification">In-House Hallmark Certification</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-800 block mb-1">Certificate Number / Report ID *</label>
              <input
                type="text"
                placeholder="e.g. GIA-2024-987654 or IGI-5489012"
                value={certNo}
                onChange={(e) => setCertNo(e.target.value)}
                className="w-full p-2.5 bg-white border border-stone-200 rounded-xl font-mono font-bold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
              />
              <p className="text-[10.5px] text-stone-400 mt-1">
                Certificate number will dynamically display on product tags and inventory product views.
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <div className="flex justify-between text-stone-600">
                <span>Product Name:</span>
                <span className="font-bold text-stone-900">{selectedOrder.product_name}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Gold Purity:</span>
                <span className="font-bold text-stone-900">{selectedOrder.karat || '22K'}</span>
              </div>
            </div>

            <div className="pt-3 space-y-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveCertification(false)}
                className="w-full py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-award text-xs"></i>
                <span>Complete Certification</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSkipCertification(selectedOrder.id)}
                className="w-full py-2 bg-stone-100 border border-stone-300 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-ban text-xs text-stone-500"></i>
                <span>Mark Certification as Not Required / Skip</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
