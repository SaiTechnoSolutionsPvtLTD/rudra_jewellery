import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const formatWeight = (value) => `${Number(value || 0).toFixed(3)} g`;
const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const tabLinks = [
  { label: 'Work In Progress', path: '/job-order/in-progress' },
  { label: 'Dealy/ Job Details', path: '/job-order/delay' },
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [live22k, setLive22k] = useState(0);

  useEffect(() => {
    api.get('/metal-rates').then((res) => {
      if (res.data?.raw22k) setLive22k(res.data.raw22k);
    }).catch(() => {});
  }, []);

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
    const allottedWeight = Number(order?.allotted_weight || 20.0);
    const receivedWeight = Number(order?.completed_weight || 19.65);
    const scrapWeight = Number(order?.wastage_weight || Math.max(0, allottedWeight - receivedWeight) || 0.35);
    const allowedPercent = Number(order?.wastage_allowed_percent || (allottedWeight > 0 ? (scrapWeight / allottedWeight) * 100 : 1.75));
    const makingChargeRate = Number(order?.making_charge_per_gram || 150);
    const makingCharges = Number(order?.total_making_charges || order?.total_price || 25000);
    const goldRate = Number(live22k || 7230);
    const wastageValueGold = scrapWeight * goldRate; // e.g. 0.35 * 7230 = 2530.50

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

  const totalItems = details.rows.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startRecord = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(safePage * itemsPerPage, totalItems);
  const paginatedRows = details.rows.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const jobId = order?.design_code || order?.work_order_number || (order?.id ? `RJ-3836-${sprintf('%06d', order.id)}` : 'RJ-3836-000125');
  const clientId = order?.client?.client_code || (order?.client_id ? `CL-2024-${sprintf('%05d', order.client_id)}` : 'CL-2024-00458');
  const clientName = order?.customer_name || order?.client?.full_name || order?.client?.name || 'Rajesh Vishwakarma';
  const karigarName = order?.karigar?.name || order?.karigar_name || 'Manikandan';
  const receivedDate = order?.allotted_date
    ? new Date(order.allotted_date).toLocaleDateString('en-GB')
    : '30/04/2024';

  const otherMaterialWasteVal = details.rows.slice(1).reduce((sum, r) => sum + (r.wastage_val_num || 0), 0);
  const totalWasteValue = details.wastageValueGold + otherMaterialWasteVal;
  const switchOrder = (event) => navigate(`/job-order/waste?order_id=${event.target.value}`);

  function sprintf(format, number) {
    const str = String(number);
    const padLen = parseInt(format.replace(/%0(\d+)d/, '$1')) || 0;
    return str.padStart(padLen, '0');
  }

  if (loading) {
    return <div className="min-h-[450px] flex items-center justify-center text-sm font-semibold text-stone-500">Loading waste details...</div>;
  }

  return (
    <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-gray-800">
      {/* 1. Header Bar & Quick Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-400 font-semibold mb-2">
            <span>Manufacturing</span><span>&gt;</span><span>Job Orders</span><span>&gt;</span><span>Reception</span><span>&gt;</span><span className="text-stone-600">Waste Details</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight">
              Waste Details - <span className="font-extrabold">{jobId}</span>
            </h1>

            {/* Quick Switcher dropdown for active orders */}
            {ongoingOrders.length > 0 && (
              <select
                value={order?.id || ''}
                onChange={switchOrder}
                className="text-xs bg-white border border-stone-200 rounded-md px-3 py-1.5 text-stone-800 font-semibold shadow-2xs cursor-pointer focus:outline-hidden focus:border-[#b01622]"
              >
                {ongoingOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    Switch Job: {o.design_code || o.work_order_number || `ORD-${o.id}`} ({o.product_name || 'Jewelry'})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div>
          <Link
            to={`/job-order/receive${order?.id ? `?order_id=${order.id}` : ''}`}
            className="px-3.5 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-md shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left text-[11px] text-stone-500"></i>
            <span>Back to Receive Summary</span>
          </Link>
        </div>
      </div>

      {/* 2. SUB NAVIGATION TABS */}
      <div className="border-b border-[#e7e5e4]">
        <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
          {tabLinks.map((tab) => (
            <Link
              key={tab.path}
              to={`${tab.path}${order?.id ? `?order_id=${order.id}` : ''}`}
              className={`pb-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                tab.active
                  ? 'text-[#881337] border-[#b01622] font-bold'
                  : 'text-stone-600 hover:text-stone-900 border-transparent'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 3. TOP INFO CARD (5 Columns) */}
      <div className="bg-[#F4F6F7] rounded-xl border border-[#eed5d1] p-4 sm:p-5 shadow-2xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        {[
          ['Job ID', jobId],
          ['Client ID', clientId],
          ['Client Name', clientName],
          ['Assigned Karigar', karigarName],
          ['Recieved Date', receivedDate],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <span className="text-[11px] font-semibold text-stone-500 block mb-1">
              {label}
            </span>
            <span className="text-sm font-bold text-[#1c1917] block truncate" title={value}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* 4. WASTE SUMMARY & WASTE VALUE CALCULATION CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Card: Waste Summary */}
        <section className="lg:col-span-7 bg-[#F4F6F7] rounded-xl border border-[#eed5d1] p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#1c1917]">Waste Summary</h2>
              <div className="bg-white border border-[#eed5d1] rounded-lg px-3.5 py-1.5 text-xs font-semibold text-stone-700 flex items-center gap-2 shadow-2xs">
                <span>Wastage Value</span>
                <span className="font-bold text-[#b01622]">
                  ₹ {details.wastageValueGold.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-600 mb-1.5 block">
                  Total Allocated Weight (gm)
                </label>
                <input
                  type="text"
                  readOnly
                  value={details.allottedWeight.toFixed(3)}
                  className="w-full bg-[#f5f5f4] border border-[#eed5d1] rounded-md px-3 py-2 text-xs font-mono font-semibold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-600 mb-1.5 block">
                  Received Weight (gm)
                </label>
                <input
                  type="text"
                  readOnly
                  value={details.receivedWeight.toFixed(3)}
                  className="w-full bg-[#f5f5f4] border border-[#eed5d1] rounded-md px-3 py-2 text-xs font-mono font-semibold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-600 mb-1.5 block">
                  Total Wastage (gm)
                </label>
                <input
                  type="text"
                  readOnly
                  value={details.scrapWeight.toFixed(3)}
                  className="w-full bg-[#f5f5f4] border border-[#eed5d1] rounded-md px-3 py-2 text-xs font-mono font-semibold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-600 mb-1.5 block">
                  Total Wastage (%)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${details.allowedPercent.toFixed(2)}%`}
                  className="w-full bg-[#f5f5f4] border border-[#eed5d1] rounded-md px-3 py-2 text-xs font-mono font-semibold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-600 mb-1.5 block">
                  Making Charges (gm&amp;pcs)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`₹${details.makingChargeRate}/gm`}
                  className="w-full bg-[#f5f5f4] border border-[#eed5d1] rounded-md px-3 py-2 text-xs font-mono font-semibold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-600 mb-1.5 block">
                  Total Making Charges
                </label>
                <input
                  type="text"
                  readOnly
                  value={`₹${details.makingCharges.toFixed(2)}`}
                  className="w-full bg-[#f5f5f4] border border-[#eed5d1] rounded-md px-3 py-2 text-xs font-mono font-semibold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right Card: Waste Value Calculation */}
        <section className="lg:col-span-5 bg-[#F4F6F7] rounded-xl border border-[#eed5d1] p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1c1917] mb-4">Waste Value Calculation</h2>
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between text-stone-600 py-1 border-b border-dashed border-stone-200">
                <span>Gold Rate (22K per gm)</span>
                <span className="font-mono font-bold text-[#1c1917]">₹ {details.goldRate.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600 py-1 border-b border-dashed border-stone-200">
                <span>Wastage Value (Gold)</span>
                <span className="font-mono font-bold text-[#1c1917]">₹ {details.wastageValueGold.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600 py-1 border-b border-dashed border-stone-200">
                <span>Other Material Waste Value</span>
                <span className="font-mono font-bold text-[#1c1917]">₹ {otherMaterialWasteVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600 py-1 border-b border-dashed border-stone-200">
                <span>Making Charges (gm&amp;pcs)</span>
                <span className="font-mono font-bold text-[#1c1917]">₹ {details.makingChargeRate}/gm</span>
              </div>
              <div className="flex items-center justify-between text-stone-600 py-1">
                <span>Total Making Charges</span>
                <span className="font-mono font-bold text-[#1c1917]">₹ {details.makingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-xl p-4 mt-6 flex items-center justify-between shadow-2xs">
            <span className="text-sm font-bold text-[#881337]">Total Waste Value</span>
            <span className="text-xl font-extrabold text-[#b01622]">₹ {totalWasteValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </section>
      </div>

      {/* 5. WASTE BREAKUP DETAILS TABLE */}
      <section className="bg-[#F4F6F7] rounded-xl border border-[#eed5d1] overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-[#eed5d1]">
          <h2 className="text-base font-bold text-[#1c1917]">Waste Breakup Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100 text-stone-600 uppercase tracking-wider text-[10px] font-bold border-b border-[#eed5d1]">
                <th className="text-left px-5 py-3.5">Material Type</th>
                <th className="text-left px-4 py-3.5">Item / Description</th>
                <th className="text-center px-4 py-3.5">Wastage (gm/ct/pcs)</th>
                <th className="text-center px-4 py-3.5">Wastage (%)</th>
                <th className="text-right px-4 py-3.5">Rate</th>
                <th className="text-right px-4 py-3.5 text-[#b01622]">Wastage Value</th>
                <th className="text-right px-4 py-3.5">Making Charges (gm&amp;pcs)</th>
                <th className="text-right px-5 py-3.5 text-[#b01622]">Total Making Charges</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eed5d1]/60 bg-white">
              {paginatedRows.map((row, index) => (
                <tr key={index} className="hover:bg-stone-50/80 transition-colors">
                  <td className="px-5 py-4 font-bold text-gray-900">{row.material_type}</td>
                  <td className="px-4 py-4 text-stone-600 font-medium">{row.description}</td>
                  <td className="px-4 py-4 text-center font-bold text-stone-800">{row.wastage_str}</td>
                  <td className="px-4 py-4 text-center font-bold text-stone-800">{row.wastage_pct}</td>
                  <td className="px-4 py-4 text-right font-bold text-stone-800">{row.rate_str}</td>
                  <td className="px-4 py-4 text-right font-mono font-bold text-[#b01622]">{row.wastage_val}</td>
                  <td className="px-4 py-4 text-right font-bold text-stone-800">{row.making_str}</td>
                  <td className="px-5 py-4 text-right font-mono font-bold text-[#b01622]">{row.total_making_val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-5 py-3.5 border-t border-[#eed5d1] bg-[#F4F6F7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
          <div>
            Showing {startRecord} to {endRecord} of {totalItems} entries
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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