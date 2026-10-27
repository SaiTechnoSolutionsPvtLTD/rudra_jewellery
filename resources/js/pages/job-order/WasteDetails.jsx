import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const formatWeight = (value) => `${Number(value || 0).toFixed(3)} g`;
const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function WasteDetails() {
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [ongoingOrders, setOngoingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [live22k, setLive22k] = useState(0);

  const queryId = new URLSearchParams(location.search).get('order_id');

  useEffect(() => {
    api.get('/metal-rates').then((res) => {
      if (res.data?.raw22k) setLive22k(res.data.raw22k);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadOrder = async () => {
      try {
        setLoading(true);
        const listResponse = await api.get('/work-orders', { params: { tab: 'waste' } });
        let list = listResponse.data?.data || [];
        if (list.length === 0) {
          const fallback = await api.get('/work-orders', { params: { tab: 'ongoing' } });
          list = fallback.data?.data || [];
        }
        setOngoingOrders(list);

        if (queryId) {
          const response = await api.get(`/work-orders/${queryId}`);
          if (mounted) setOrder(response.data?.data || null);
        } else {
          setOrder(null);
        }
      } catch (error) {
        console.error('Failed to load waste details:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOrder();
    return () => { mounted = false; };
  }, [location.search, queryId]);

  const handleSelectRow = (wo) => {
    navigate(`/job-order/waste?order_id=${wo.id}`);
  };

  const handleBackToList = () => {
    setOrder(null);
    navigate('/job-order/waste');
  };

  const details = useMemo(() => {
    const allottedWeight = Number(order?.allotted_weight || 20.0);
    const receivedWeight = Number(order?.completed_weight || 19.65);
    const scrapWeight = Number(order?.wastage_weight || Math.max(0, allottedWeight - receivedWeight) || 0.35);
    const allowedPercent = Number(order?.wastage_allowed_percent || (allottedWeight > 0 ? (scrapWeight / allottedWeight) * 100 : 1.75));
    const makingChargeRate = Number(order?.making_charge_per_gram || 150);
    const makingCharges = Number(order?.total_making_charges || order?.total_price || 25000);
    const goldRate = Number(live22k || 7230);
    const wastageValueGold = scrapWeight * goldRate;

    const itemsList = Array.isArray(order?.items) && order.items.length > 0
      ? order.items.map((item) => {
          const itemWeight = Number(item.gold_weight || item.total_weight || item.weight || 0);
          const itemWastage = Number(item.wastage || (itemWeight * 0.015) || 0);
          const itemRate = Number(item.rate || goldRate);
          const itemMakingRate = Number(item.making_charge || makingChargeRate);
          const itemWastageVal = itemWastage * itemRate;
          const itemMakingVal = itemWeight * itemMakingRate;
          return {
            material_type: item.material_type || item.variant || 'Gold (22K)',
            description: item.material_subtitle || item.remark || item.name || 'Gold',
            wastage_str: `${itemWastage.toFixed(3)} gm`,
            wastage_pct: `${(allowedPercent || 1.5).toFixed(2)}%`,
            rate_str: `₹${itemRate.toLocaleString('en-IN')} / gm`,
            wastage_val: `₹${itemWastageVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            making_str: `₹${itemMakingRate}/gm`,
            total_making_val: `₹${itemMakingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            wastage_val_num: itemWastageVal,
          };
        })
      : [
          {
            material_type: 'Gold (22K)',
            description: order?.product_name || 'Gold',
            wastage_str: `${(scrapWeight * 0.857).toFixed(3)} gm`,
            wastage_pct: `${(allowedPercent * 0.857).toFixed(2)}%`,
            rate_str: `₹${goldRate.toLocaleString('en-IN')} / gm`,
            wastage_val: `₹${(scrapWeight * 0.857 * goldRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            making_str: `₹${makingChargeRate}/gm`,
            total_making_val: `₹${makingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            wastage_val_num: scrapWeight * 0.857 * goldRate,
          },
          {
            material_type: 'Diamond',
            description: 'Diamond (VVS1 / G)',
            wastage_str: '0.020 ct',
            wastage_pct: '1.00%',
            rate_str: '₹45,000 / ct',
            wastage_val: '₹900.00',
            making_str: '₹10/Pcs',
            total_making_val: '₹45,000.00',
            wastage_val_num: 900,
          },
          {
            material_type: 'Stone',
            description: 'Ruby',
            wastage_str: '2 pcs',
            wastage_pct: '0.00%',
            rate_str: '₹0.00 / pcs',
            wastage_val: '₹0.00',
            making_str: '₹20/Pcs',
            total_making_val: '₹45,000.00',
            wastage_val_num: 0,
          },
        ];

    return {
      allottedWeight,
      receivedWeight,
      scrapWeight,
      allowedPercent,
      makingChargeRate,
      makingCharges,
      goldRate,
      wastageValueGold,
      rows: itemsList,
    };
  }, [order, live22k]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredOrders = ongoingOrders.filter(wo => {
    const term = searchTerm.toLowerCase();
    return (
      wo.work_order_number?.toLowerCase().includes(term) ||
      wo.product_name?.toLowerCase().includes(term) ||
      wo.karigar_name?.toLowerCase().includes(term)
    );
  });

  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const subNavLinks = [
    { name: 'Work In Progress', path: '/job-order/in-progress' },
    { name: 'Delay / Job Details', path: '/job-order/delay' },
    { name: 'Waste Details', path: '/job-order/waste', active: true },
    { name: 'Quality Check', path: '/job-order/quality-check' },
    { name: 'Ready', path: '/job-order/ready' },
    { name: 'Certification', path: '/job-order/certification' },
    { name: 'Hallmarking', path: '/job-order/hallmarking' },
    { name: 'History', path: '/job-order/history' }
  ];

  const jobId = order?.design_code || order?.work_order_number || (order?.id ? `WO-2026-000${order.id}` : 'WO-2026-0004');
  const clientId = order?.client?.client_code || (order?.client_id ? `CL-${order.client_id}` : 'CL-1001');
  const clientName = order?.customer_name || order?.client?.full_name || order?.client?.name || 'Malabar Gold & Diamonds';
  const karigarName = order?.karigar?.name || order?.karigar_name || 'Amit Varma (Artisan)';

  if (loading && !order && ongoingOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-stone-400 gap-3 font-['Inter',sans-serif]">
        <div className="w-10 h-10 border-4 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-stone-600">Loading Waste Details...</span>
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
            <span>Reception</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span className="text-stone-800 font-semibold">Waste Details</span>
          </div>

          {/* Main Title & Search Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight">
              Waste Details {order ? `- ${jobId}` : ''}
            </h1>

            {!order && (
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
          {order && (
            <button
              type="button"
              onClick={handleBackToList}
              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-md shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-list text-[11px] text-stone-600"></i>
              <span>All Waste Details List</span>
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
            className="pb-3 text-[14px] font-bold text-[#6e2d27] hover:text-[#b01622] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
          >
            Delay / Job Details
          </Link>

          <Link
            to="/job-order/waste"
            className="pb-3 text-[14px] font-bold text-[#5c2725] border-b-2 border-[#b01622] whitespace-nowrap cursor-pointer"
          >
            Waste Details
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

      {/* 3. CONDITIONAL RENDER: PRODUCT ROWS TABLE OR SPECIFIC PRODUCT WASTE DETAIL */}
      {!order ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#111827] tracking-tight">
                Material Scrap &amp; Wastage Job Orders ({filteredOrders.length})
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Click any product row to view detailed waste breakdown &amp; scrap metrics.
              </p>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-stone-400">
              <i className="fa-solid fa-recycle text-4xl text-stone-300 mb-2 block"></i>
              <p className="font-semibold text-base text-stone-700">No Job Orders Found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">S.NO</th>
                    <th className="py-3 px-4">WORK ORDER NO</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Aachari / Artisan</th>
                    <th className="py-3 px-4 text-right">Allotted Wt</th>
                    <th className="py-3 px-4 text-right">Finished Wt</th>
                    <th className="py-3 px-4 text-right">Scrap Loss</th>
                    <th className="py-3 px-4 text-center">Wastage Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedOrders.map((wo, idx) => {
                    const scrapWt = Math.max(0, (wo.allotted_weight || 0) - (wo.completed_weight || 0));
                    const allowedScrap = ((wo.allotted_weight || 0) * (wo.wastage_allowed_percent || 1.75)) / 100;
                    const isWithin = scrapWt <= (allowedScrap + 0.05);

                    return (
                      <tr
                        key={wo.id}
                        onClick={() => handleSelectRow(wo)}
                        className="hover:bg-stone-50/80 transition-all cursor-pointer group"
                      >
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-stone-400 text-xs">
                          {startIndex + idx + 1}
                        </td>
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
                          {Number(wo.completed_weight || 0).toFixed(3)}g
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#b01622]">
                          {scrapWt.toFixed(3)}g
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isWithin
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            {isWithin ? 'Normal Limit' : 'Excess Scrap'}
                          </span>
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
                            <span>Waste Details</span>
                            <i className="fa-solid fa-chevron-right text-[10px]"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
        /* SPECIFIC PRODUCT WASTE BREAKDOWN VIEW */
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
              <span className="text-[11px] font-semibold text-stone-400 block mb-1">Status</span>
              <span className="text-sm font-bold text-[#b01622] block uppercase">{order?.status || 'In Progress'}</span>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-stone-400 block">Allotted Weight</span>
              <span className="text-lg font-bold text-stone-900 font-mono block mt-1">{formatWeight(details.allottedWeight)}</span>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-stone-400 block">Completed Weight</span>
              <span className="text-lg font-bold text-emerald-700 font-mono block mt-1">{formatWeight(details.receivedWeight)}</span>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-stone-400 block">Scrap / Loss Weight</span>
              <span className="text-lg font-bold text-[#b01622] font-mono block mt-1">{formatWeight(details.scrapWeight)}</span>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-stone-400 block">Scrap Market Value</span>
              <span className="text-lg font-bold text-[#b01622] font-mono block mt-1">{formatCurrency(details.wastageValueGold)}</span>
            </div>
          </div>

          {/* Detailed Items Scrap Table */}
          <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs p-5 space-y-3">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Material Scrap &amp; Making Charges Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">S.NO</th>
                    <th className="py-3 px-4">Material</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Wastage</th>
                    <th className="py-3 px-4 text-right">Wastage %</th>
                    <th className="py-3 px-4 text-right">Metal Rate</th>
                    <th className="py-3 px-4 text-right">Scrap Value</th>
                    <th className="py-3 px-4 text-right">Making Rate</th>
                    <th className="py-3 px-4 text-right">Total Making</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {details.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/80 transition-all">
                      <td className="py-3 px-3 text-center font-mono font-bold text-stone-400 text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900">{row.material_type}</td>
                      <td className="py-3 px-4 text-stone-700">{row.description}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#b01622]">{row.wastage_str}</td>
                      <td className="py-3 px-4 text-right font-mono text-stone-700">{row.wastage_pct}</td>
                      <td className="py-3 px-4 text-right font-mono text-stone-700">{row.rate_str}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#b01622]">{row.wastage_val}</td>
                      <td className="py-3 px-4 text-right font-mono text-stone-700">{row.making_str}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{row.total_making_val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}