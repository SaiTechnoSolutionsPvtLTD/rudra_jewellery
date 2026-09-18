import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const formatWeight = (value) => `${Number(value || 0).toFixed(3)} g`;
const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const tabLinks = [
  { label: 'Work in Progress', path: '/job-order/in-progress' },
  { label: 'Delay / Job Details', path: '/job-order/delay' },
  { label: 'Waste Details', path: '/job-order/waste', active: true },
  { label: 'Quality Check & Final Receive', path: '/job-order/quality-check' },
  { label: 'History', path: '/job-order/history' },
];

const fallbackRows = [
  { material_type: 'Gold (22K)', description: 'Gold jewellery', wastage: 1.05, total_weight: 150, rate: 6850 },
  { material_type: 'Diamond', description: 'Diamond VS1 / F', wastage: 0.02, total_weight: 25, rate: 9500 },
  { material_type: 'Stone', description: 'Ruby', wastage: 0.06, total_weight: 20, rate: 2500 },
  { material_type: 'Other (Beads)', description: 'Pearl', wastage: 0.03, total_weight: 5, rate: 1200 },
];

export default function WasteDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [ongoingOrders, setOngoingOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams(location.search);
    const requestedId = params.get('order_id');

    const loadOrder = async () => {
      try {
        const listResponse = await api.get('/work-orders', { params: { tab: 'ongoing' } });
        const list = listResponse.data?.data || [];
        setOngoingOrders(list);
        const orderId = requestedId || list[0]?.id;
        if (!orderId) return;
        const response = await api.get(`/work-orders/${orderId}`);
        if (mounted) setOrder(response.data?.data || null);
      } catch (error) {
        console.error('Failed to load waste details:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOrder();
    return () => {
      mounted = false;
    };
  }, [location.search]);

  const details = useMemo(() => {
    const allottedWeight = Number(order?.allotted_weight || 200);
    const receivedWeight = Number(order?.completed_weight || allottedWeight * 0.9);
    const scrapWeight = Math.max(0, allottedWeight - receivedWeight);
    const allowedPercent = Number(order?.wastage_allowed_percent || 1.75);
    const wastageValue = scrapWeight * Number(order?.making_charge_per_gram || 150);
    const makingCharges = Number(order?.total_making_charges || order?.total_price || 2500);
    const rows = Array.isArray(order?.items) && order.items.length > 0
      ? order.items.map((item) => ({
          material_type: item.material_type || item.variant || 'Material',
          description: item.material_subtitle || item.remark || '-',
          wastage: Number(item.wastage || 0),
          total_weight: Number(item.gold_weight || item.total_weight || 0),
          rate: Number(order?.making_charge_per_gram || 150),
        }))
      : fallbackRows;

    return { allottedWeight, receivedWeight, scrapWeight, allowedPercent, wastageValue, makingCharges, rows };
  }, [order]);

  const totalItems = details.rows.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startRecord = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(safePage * itemsPerPage, totalItems);
  const paginatedRows = details.rows.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const jobId = order?.design_code || order?.work_order_number || 'RJ-3836-000125';
  const clientId = order?.client?.client_code || (order?.client_id ? `CL-2024-00${order.client_id}` : 'CL-2024-00456');
  const clientName = order?.customer_name || order?.client?.full_name || order?.client?.name || 'Rajesh Vishwakarma';
  const karigarName = order?.karigar?.name || order?.karigar_name || 'Manikandan';
  const receivedDate = order?.allotted_date
    ? new Date(order.allotted_date).toLocaleDateString('en-GB')
    : '20/04/2026';
  const totalWastageCharges = details.rows.reduce((sum, row) => sum + row.wastage * row.rate, 0);
  const totalWasteValue = details.wastageValue + totalWastageCharges;
  const switchOrder = (event) => navigate(`/job-order/waste?order_id=${event.target.value}`);

  if (loading) {
    return <div className="min-h-[450px] flex items-center justify-center text-sm font-semibold text-stone-500">Loading waste details...</div>;
  }

  return (
    <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-gray-800">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-400 font-semibold mb-2">
            <span>Manufacturing</span><span>&gt;</span><span>Job Orders</span><span>&gt;</span><span>Reception</span><span>&gt;</span><span className="text-stone-600">Waste Details</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Waste Details - {jobId}</h1>
            <span className="px-3 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">Waste Value {formatCurrency(totalWasteValue)}</span>
            {ongoingOrders.length > 0 && (
              <select value={order?.id || ''} onChange={switchOrder} className="w-full sm:w-[420px] text-sm bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 font-semibold shadow-2xs cursor-pointer focus:outline-hidden focus:border-[#b01622]">
                {ongoingOrders.map((ongoingOrder) => <option key={ongoingOrder.id} value={ongoingOrder.id}>Switch: {ongoingOrder.design_code || ongoingOrder.work_order_number} ({ongoingOrder.product_name})</option>)}
              </select>
            )}
          </div>
        </div>
        <Link to={`/job-order/receive${order?.id ? `?order_id=${order.id}` : ''}`} className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-700 hover:bg-stone-50">Back to Receive Summary</Link>
      </div>

      <div className="border-b border-stone-200 flex items-center gap-6 overflow-x-auto no-scrollbar">
        {tabLinks.map((tab) => (
          <Link
            key={tab.path}
            to={`${tab.path}${order?.id ? `?order_id=${order.id}` : ''}`}
            className={`pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${tab.active ? 'border-[#9e1b27] text-[#9e1b27]' : 'border-transparent text-stone-500 hover:text-stone-900'}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-stone-200 p-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          ['Job ID', jobId],
          ['Client ID', clientId],
          ['Client Name', clientName],
          ['Assigned Karigar', karigarName],
          ['Received Date', receivedDate],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <span className="text-[11px] text-stone-400 block">{label}</span>
            <span className="text-xs font-bold text-gray-900 block mt-0.5 truncate" title={value}>{value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-8 bg-white rounded-lg border border-stone-200 p-4">
          <h2 className="text-sm font-black text-gray-900 mb-3">Waste Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            {[
              ['Total Material Weight (g)', formatWeight(details.allottedWeight)],
              ['Received Weight (g)', formatWeight(details.receivedWeight)],
              ['Total Wastage (g)', formatWeight(details.scrapWeight)],
              ['Total Wastage (%)', `${details.allowedPercent.toFixed(2)}%`],
              ['Wastage Value (Scrap)', formatCurrency(details.wastageValue)],
              ['Making Charges (per/gram)', `${formatCurrency(order?.making_charge_per_gram || 150)}/g`],
              ['Total Making Charges', formatCurrency(details.makingCharges)],
            ].map(([label, value]) => (
              <div key={label} className="border border-stone-200 rounded-md px-3 py-2">
                <span className="text-[11px] text-stone-400 block">{label}</span>
                <span className="text-xs font-bold text-gray-900 block mt-1">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-4 bg-white rounded-lg border border-stone-200 p-4">
          <h2 className="text-sm font-black text-gray-900 mb-3">Waste Value Calculation</h2>
          <div className="space-y-3 text-xs">
            {[
              ['Gold Value (22K per gram)', formatCurrency(Number(order?.allotted_weight || 200) * 6850)],
              ['Wastage Value (Scrap)', formatCurrency(details.wastageValue)],
              ['Other Material Wastage', formatCurrency(totalWastageCharges)],
              ['Making Charges', formatCurrency(details.makingCharges)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3"><span className="text-stone-500">{label}</span><span className="font-bold text-gray-900">{value}</span></div>
            ))}
            <div className="border-t border-stone-200 pt-3 mt-3 flex items-center justify-between text-xs font-black text-[#9e1b27]"><span>Total Waste Value</span><span>{formatCurrency(totalWasteValue)}</span></div>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200"><h2 className="text-sm font-black text-gray-900">Waste Breakdown Details</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] table-fixed text-xs border-collapse">
            <colgroup><col className="w-[155px]" /><col className="w-[370px]" /><col className="w-[130px]" /><col className="w-[120px]" /><col className="w-[110px]" /><col className="w-[145px]" /><col className="w-[145px]" /><col className="w-[145px]" /></colgroup>
            <thead><tr className="bg-stone-50 text-stone-500 uppercase tracking-wide border-b border-stone-200 text-[11px]"><th className="text-left px-4 py-3 align-middle">Material Type</th><th className="text-left px-3 py-3 align-middle">Qty / Description</th><th className="text-right px-3 py-3 align-middle">Wastage (Scrap) (g)</th><th className="text-right px-3 py-3 align-middle">Total Wt (g)</th><th className="text-right px-3 py-3 align-middle">Rate</th><th className="text-right px-3 py-3 align-middle">Wastage Charges</th><th className="text-right px-3 py-3 align-middle">Making Charges</th><th className="text-right px-4 py-3 align-middle">Total Wastage</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedRows.map((row, index) => {
                const wastageCharges = row.wastage * row.rate;
                const makingCharge = row.total_weight * Number(order?.making_charge_per_gram || 150);
                return <tr key={`${row.material_type}-${index}`}><td className="px-4 py-3 font-bold text-gray-900 align-middle">{row.material_type}</td><td className="px-3 py-3 text-stone-500 align-middle whitespace-normal leading-relaxed">{row.description}</td><td className="px-3 py-3 text-right font-bold align-middle whitespace-nowrap">{row.wastage.toFixed(3)}</td><td className="px-3 py-3 text-right font-bold align-middle whitespace-nowrap">{row.total_weight.toFixed(2)}</td><td className="px-3 py-3 text-right font-bold align-middle whitespace-nowrap">{formatCurrency(row.rate)}</td><td className="px-3 py-3 text-right font-bold text-[#b01622] align-middle whitespace-nowrap">{formatCurrency(wastageCharges)}</td><td className="px-3 py-3 text-right font-bold align-middle whitespace-nowrap">{formatCurrency(makingCharge)}</td><td className="px-4 py-3 text-right font-bold text-[#b01622] align-middle whitespace-nowrap">{formatCurrency(wastageCharges + makingCharge)}</td></tr>;
              })}
            </tbody>
            <tfoot><tr className="bg-stone-50 border-t-2 border-stone-200 font-bold"><td colSpan="2" className="px-4 py-3 text-right uppercase">Total</td><td className="px-3 py-3 text-right font-bold whitespace-nowrap">{details.rows.reduce((sum, row) => sum + row.wastage, 0).toFixed(3)}</td><td className="px-3 py-3 text-right font-bold whitespace-nowrap">{details.rows.reduce((sum, row) => sum + row.total_weight, 0).toFixed(2)}</td><td></td><td className="px-3 py-3 text-right font-bold text-[#b01622] whitespace-nowrap">{formatCurrency(totalWastageCharges)}</td><td></td><td className="px-4 py-3 text-right font-bold text-[#b01622] whitespace-nowrap">{formatCurrency(totalWasteValue)}</td></tr></tfoot>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-4 py-3 border-t border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
          <div>
            Showing {startRecord} to {endRecord} of {totalItems} entries
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
              className="w-7 h-7 rounded-md border border-stone-200 hover:bg-white flex items-center justify-center text-stone-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              &lt;
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${
                  safePage === pageNum
                    ? 'bg-[#b01622] text-white'
                    : 'border border-stone-200 hover:bg-white text-stone-700'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
              className="w-7 h-7 rounded-md border border-stone-200 hover:bg-white flex items-center justify-center text-stone-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              &gt;
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}