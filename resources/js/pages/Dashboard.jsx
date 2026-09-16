import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const resolveItemImage = (item) => {
  const raw = item?.image_url || item?.product?.image_url || item?.product?.image;
  if (!raw) return '/placeholder-jewelry.png';
  if (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('/images/')) return raw;
  if (raw.startsWith('/storage/')) return raw;
  if (raw.startsWith('storage/')) return `/${raw}`;
  if (raw.startsWith('products/')) return `/storage/${raw}`;
  if (raw.startsWith('/')) return raw;
  return `/storage/${raw}`;
};

export default function Dashboard() {
  // Instant synchronous hydration from localStorage cache
  const [data, setData] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_dashboard_data');
      if (c) return JSON.parse(c);
    } catch (e) {}
    return null;
  });

  const [loading, setLoading] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_dashboard_data');
      if (c) return false;
    } catch (e) {}
    return true;
  });

  const [timeRange, setTimeRange] = useState('Month');
  const [activeChartPoint, setActiveChartPoint] = useState(null);

  // Live Job Order & Approval Cards State (Page 14)
  const [jobStats, setJobStats] = useState({
    summary: {
      active_work_orders: 0,
      total_allocated_weight: 0,
      total_completed_weight: 0,
      total_pending_weight: 0,
      gold_weight: 0,
      silver_weight: 0,
      diamond_weight: 0,
    },
    live_jobs: [],
    approval_cards: [],
  });
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchJobStats();
  }, [timeRange]);

  const fetchJobStats = async () => {
    try {
      const res = await api.get('/work-orders/dashboard-stats');
      if (res.data?.status === 'success') {
        setJobStats(res.data);
      }
    } catch (e) {
      console.error('Failed to load live job stats:', e);
    }
  };

  const handleDashboardApprove = async (orderId) => {
    try {
      setApprovingId(orderId);
      await api.post(`/work-orders/${orderId}/approve`);
      await api.post(`/work-orders/${orderId}/mark-ready`);
      await fetchJobStats();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to approve work order.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDashboardReturn = async (orderId) => {
    const reason = window.prompt('Enter reason for returning to artisan (e.g. Solder defect, loose stone):');
    if (!reason) return;
    try {
      setApprovingId(orderId);
      await api.post(`/work-orders/${orderId}/return`, { return_reason: reason });
      await fetchJobStats();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to return work order.');
    } finally {
      setApprovingId(null);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/dashboard', { params: { period: timeRange } });
      setData(res.data);
      if (res.data) {
        localStorage.setItem('rudhra_dashboard_data', JSON.stringify(res.data));
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-400">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622] mr-3"></i>
        <span className="text-sm font-semibold">Loading Rudhra Jewellers Dashboard...</span>
      </div>
    );
  }

  const summary = data?.summary || {
    totalSales: '₹24,85,600',
    salesGrowth: '+14.2% vs last month',
    activeClients: 13,
    clientsGrowth: '+8.5% new clients',
    totalProducts: 24,
    productsGrowth: '+12% in stock',
    activeArtisans: 8,
    artisansGrowth: '94% on-time rate',
  };

  const chartData = data?.chartData || [
    { month: 'Jan', revenue: 1450000, orders: 18 },
    { month: 'Feb', revenue: 1680000, orders: 22 },
    { month: 'Mar', revenue: 2100000, orders: 29 },
    { month: 'Apr', revenue: 1920000, orders: 25 },
    { month: 'May', revenue: 2450000, orders: 32 },
    { month: 'Jun', revenue: 2180000, orders: 28 },
    { month: 'Jul', revenue: 2890000, orders: 38 },
    { month: 'Aug', revenue: 3120000, orders: 42 },
    { month: 'Sep', revenue: 3480000, orders: 46 },
    { month: 'Oct', revenue: 3850000, orders: 51 },
    { month: 'Nov', revenue: 4200000, orders: 58 },
    { month: 'Dec', revenue: 4650000, orders: 64 },
  ];

  const recentInvoices = data?.recentInvoices || [];
  const topProducts = data?.topProducts || [];
  const categories = data?.categories || [];
  const target = data?.target || {
    target: '₹50,00,000',
    achieved: '₹38,40,000',
    percent: 77,
    pending: '₹11,60,000',
  };

  // SVG Chart Calculations
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 5000000);
  const chartWidth = 600;
  const chartHeight = 180;
  const points = chartData.map((d, i) => {
    const x = (i / (chartData.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - 20 - (d.revenue / maxRevenue) * (chartHeight - 40);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <div className="w-full pb-12 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      
      {/* 1. Header Bar matching Screen 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <span>Rudra Jewellers</span>
            <span>›</span>
            <span className="text-[#b01622] font-bold">Executive Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Executive Dashboard</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Month / Period Filter */}
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl px-4 py-2.5 pr-8 shadow-2xs hover:border-gray-300 focus:outline-none focus:border-[#b01622] cursor-pointer"
            >
              <option value="Month">Month (September)</option>
              <option value="Quarter">This Quarter</option>
              <option value="Year">Fiscal Year 2026</option>
            </select>
            <i className="fa-solid fa-chevron-down text-[9px] text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          </div>

          <Link
            to="/inventory"
            className="px-4 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-boxes-stacked text-[#b01622]"></i>
            <span>Manage Inventory</span>
          </Link>

          <Link
            to="/inventory/add-new/category"
            className="px-4 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* 2. Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Sales */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs hover:shadow-sm transition-all flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-sm shadow-2xs">
                <i className="fa-solid fa-wallet"></i>
              </div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Sales</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 tracking-tight pt-1">
              {summary.totalSales}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <i className="fa-solid fa-arrow-trend-up text-[10px]"></i>
              <span>{summary.salesGrowth}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Clients */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs hover:shadow-sm transition-all flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm shadow-2xs">
                <i className="fa-solid fa-users"></i>
              </div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Active Clients</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 tracking-tight pt-1">
              {summary.activeClients}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <i className="fa-solid fa-user-check text-[10px]"></i>
              <span>{summary.clientsGrowth}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Products / Inventory */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs hover:shadow-sm transition-all flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-sm shadow-2xs">
                <i className="fa-solid fa-gem"></i>
              </div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Inventory SKUs</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 tracking-tight pt-1">
              {summary.totalProducts}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <i className="fa-solid fa-boxes-stacked text-[10px]"></i>
              <span>{summary.productsGrowth}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Master Artisans */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs hover:shadow-sm transition-all flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center text-sm shadow-2xs">
                <i className="fa-solid fa-people-carry-box"></i>
              </div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Master Artisans</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 tracking-tight pt-1">
              {summary.activeArtisans}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <i className="fa-solid fa-circle-check text-[10px]"></i>
              <span>{summary.artisansGrowth}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Middle Section: Sales & Revenue Wave Chart + Target Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Interactive Red-Wave Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">Sales & Revenue Performance</h3>
                <p className="text-xs text-stone-400">Monthly bullion turnover and customer order execution</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#b01622]"></span> Revenue (₹)
                </span>
              </div>
            </div>

            {/* SVG Wave Curve */}
            <div className="relative w-full overflow-hidden pt-2 pb-4">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible">
                <defs>
                  <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b01622" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#b01622" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 1, 2, 3].map((g) => {
                  const y = 20 + g * 35;
                  return (
                    <line
                      key={g}
                      x1="20"
                      y1={y}
                      x2={chartWidth - 20}
                      y2={y}
                      stroke="#f1f1f1"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Area Gradient Fill */}
                <path d={areaD} fill="url(#redGradient)" />

                {/* Smooth Curve Stroke */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#b01622"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Interactive Points */}
                {points.map((p, idx) => (
                  <g key={idx} className="cursor-pointer">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={activeChartPoint?.month === p.month ? 6 : 4}
                      fill="#ffffff"
                      stroke="#b01622"
                      strokeWidth={activeChartPoint?.month === p.month ? 3 : 2}
                      onMouseEnter={() => setActiveChartPoint(p)}
                      onMouseLeave={() => setActiveChartPoint(null)}
                    />
                    <text
                      x={p.x}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      className="text-[10px] fill-stone-400 font-medium"
                    >
                      {p.month}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Tooltip Overlay */}
              {activeChartPoint && (
                <div
                  className="absolute bg-gray-900 text-white text-[11px] py-1.5 px-3 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(activeChartPoint.x / chartWidth) * 100}%`,
                    top: `${(activeChartPoint.y / chartHeight) * 100}%`,
                  }}
                >
                  <span className="font-bold">{activeChartPoint.month}:</span> ₹{activeChartPoint.revenue.toLocaleString('en-IN')}
                  <div className="text-[9.5px] text-stone-300">{activeChartPoint.orders} Orders</div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Chart KPI Strip */}
          <div className="pt-4 border-t border-stone-100 grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">YTD Total Revenue</span>
              <span className="text-base font-bold text-gray-900">{summary.totalSales}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Avg Ticket Size</span>
              <span className="text-base font-bold text-gray-900">₹85,400</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Sales Conversion</span>
              <span className="text-base font-bold text-emerald-600">84.6%</span>
            </div>
          </div>
        </div>

        {/* Right Col: Target & Monthly Milestone Progress */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 tracking-tight">Monthly Target</h3>
              <span className="text-[11px] font-bold text-[#b01622] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                September 2026
              </span>
            </div>

            {/* Circular Gauge / Radial Progress */}
            <div className="flex flex-col items-center justify-center my-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f5f5f4"
                    strokeWidth="9"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#b01622"
                    strokeWidth="9"
                    fill="transparent"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * target.percent) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-gray-900">{target.percent}%</span>
                  <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Achieved</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 mt-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-stone-100">
                <span className="text-stone-500">Monthly Target:</span>
                <span className="font-bold text-gray-900">{target.target}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-100">
                <span className="text-stone-500">Achieved To Date:</span>
                <span className="font-bold text-emerald-600">{target.achieved}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-stone-500">Pending to Goal:</span>
                <span className="font-bold text-amber-600">{target.pending}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100">
            <Link
              to="/clients/billing"
              className="w-full py-2.5 px-4 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold rounded-xl border border-stone-200 transition-colors flex items-center justify-center gap-2"
            >
              <span>View Invoices & Billing</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </Link>
          </div>
        </div>

      </div>

      {/* 4. Bottom 3-Column Section: Recent Invoices, Top Categories, Featured Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Recent Invoices / Orders */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Recent Customer Invoices</h3>
            <Link to="/clients/billing" className="text-[11px] font-bold text-[#b01622] hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-stone-100 text-xs">
            {recentInvoices.length === 0 ? (
              <div className="p-6 text-center text-stone-400">No recent invoices found.</div>
            ) : (
              recentInvoices.map((inv) => (
                <div key={inv.id} className="p-3.5 hover:bg-stone-50/70 transition-colors flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{inv.client_name}</div>
                    <div className="text-[11px] text-stone-400 font-mono mt-0.5">{inv.invoice_number} • {inv.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 font-mono">{inv.formatted_amount}</div>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Top Selling Categories */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Category Distribution</h3>
              <Link to="/masters/categories" className="text-[11px] font-bold text-[#b01622] hover:underline">
                Manage
              </Link>
            </div>
            <div className="space-y-3.5 text-xs">
              {categories.slice(0, 5).map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <div className="flex justify-between font-semibold text-stone-700">
                    <span>{cat.name}</span>
                    <span className="font-mono text-stone-500">{cat.products_count} Items</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#b01622] to-amber-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(15, cat.percentage || 25)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 mt-4 flex items-center justify-between text-xs text-stone-500">
            <span>Total Cataloged Master Categories:</span>
            <span className="font-bold text-gray-900">{categories.length}</span>
          </div>
        </div>

        {/* Column 3: Featured Products in Inventory */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Featured Inventory SKUs</h3>
            <Link to="/inventory" className="text-[11px] font-bold text-[#b01622] hover:underline">
              Inventory
            </Link>
          </div>
          <div className="divide-y divide-stone-100 text-xs">
            {topProducts.length === 0 ? (
              <div className="p-6 text-center text-stone-400">No inventory products found.</div>
            ) : (
              topProducts.map((p) => (
                <div key={p.id} className="p-3.5 hover:bg-stone-50/70 transition-colors flex items-center gap-3">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-10 h-10 rounded-xl object-cover border border-stone-200 bg-white shrink-0"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-jewelry.png';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 truncate">{p.name}</div>
                    <div className="text-[10.5px] text-stone-400 font-mono truncate">{p.code} • {p.weight}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                      {p.stock} in stock
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* PAGE 14: LIVE JOB CREATION STATUS & TOTAL MATERIALS ALLOCATED */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        
        {/* Left (2 Columns): LIVE JOB CREATION STATUS TABLE */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#b01622] animate-pulse"></div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight">Live Job Creation Status</h3>
                  <span className="text-[11px] text-stone-400 font-medium">
                    Real-time active artisan manufacturing orders from database
                  </span>
                </div>
              </div>
              <Link
                to="/job-order/in-progress"
                className="text-xs font-bold text-[#b01622] hover:underline flex items-center gap-1"
              >
                <span>View All Jobs</span>
                <i className="fa-solid fa-arrow-right text-[10px]"></i>
              </Link>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50/60 text-stone-600 font-semibold text-[11px]">
                    <th className="py-2.5 px-3.5 whitespace-nowrap">WO #</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Product</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Aachari</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Allotted Wt</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Completed Wt</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Pending Wt</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Current Stage</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {jobStats.live_jobs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-stone-400">
                        No active live jobs found.
                      </td>
                    </tr>
                  ) : (
                    jobStats.live_jobs.slice(0, 5).map((wo) => (
                      <tr key={wo.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-2.5 px-3.5 font-mono font-bold text-[#b01622] whitespace-nowrap">
                          {wo.work_order_number}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-gray-900 truncate max-w-[140px]" title={wo.product_name}>
                          {wo.product_name}
                        </td>
                        <td className="py-2.5 px-3 text-stone-700 whitespace-nowrap font-medium">
                          {wo.karigar_name || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                          {Number(wo.allotted_weight).toFixed(3)}g
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                          {Number(wo.completed_weight).toFixed(3)}g
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#b01622] whitespace-nowrap">
                          {Number(wo.pending_weight).toFixed(3)}g
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                            {wo.current_stage ? wo.current_stage.replace(/_/g, ' ') : 'Created'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            wo.status === 'pending_approval'
                              ? 'bg-amber-100 text-amber-900'
                              : wo.status === 'approved' || wo.status === 'ready'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-blue-50 text-blue-900'
                          }`}>
                            {wo.status ? wo.status.replace(/_/g, ' ') : 'ongoing'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Synchronized with Page 15 (New Work Order) & Page 16 (Receiver Work)</span>
            <Link to="/job-order/receive" className="font-bold text-[#b01622] hover:underline">
              Open Receiver Work &rarr;
            </Link>
          </div>
        </div>

        {/* Right (1 Column): TOTAL MATERIALS ALLOCATED */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Total Materials Allocated</h3>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                Active Vault
              </span>
            </div>

            {/* Total Allocated Banner */}
            <div className="bg-gradient-to-br from-red-50/60 to-amber-50/60 rounded-2xl p-4 border border-red-100 mb-4">
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-tight">Total Allotted Metal Weight</div>
              <div className="text-2xl font-black text-gray-900 font-mono tracking-tight mt-1">
                {Number(jobStats.summary.total_allocated_weight || 0).toFixed(3)} <span className="text-sm font-sans font-bold text-stone-500">grams</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium mt-1">
                <span>Active Runs: <strong className="text-gray-900">{jobStats.summary.active_work_orders || 0} Jobs</strong></span>
                <span>Pending: <strong className="text-[#b01622]">{Number(jobStats.summary.total_pending_weight || 0).toFixed(3)}g</strong></span>
              </div>
            </div>

            {/* Material Breakdown Gauges */}
            <div className="space-y-3.5 text-xs">
              
              {/* Gold */}
              <div>
                <div className="flex justify-between font-semibold text-stone-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Gold 22K / 18K Allocated</span>
                  </span>
                  <span className="font-mono font-bold text-gray-900">{Number(jobStats.summary.gold_weight || 0).toFixed(3)} g</span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(15, (jobStats.summary.gold_weight / (jobStats.summary.total_allocated_weight || 1)) * 100))}%` }}
                  ></div>
                </div>
              </div>

              {/* Silver */}
              <div>
                <div className="flex justify-between font-semibold text-stone-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                    <span>Silver 925 Allocated</span>
                  </span>
                  <span className="font-mono font-bold text-gray-900">{Number(jobStats.summary.silver_weight || 0).toFixed(3)} g</span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-stone-400 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(5, (jobStats.summary.silver_weight / (jobStats.summary.total_allocated_weight || 1)) * 100))}%` }}
                  ></div>
                </div>
              </div>

              {/* Diamond */}
              <div>
                <div className="flex justify-between font-semibold text-stone-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>Diamond Embellishments</span>
                  </span>
                  <span className="font-mono font-bold text-gray-900">{Number(jobStats.summary.diamond_weight || 0).toFixed(3)} ct</span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: '45%' }}
                  ></div>
                </div>
              </div>

            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 mt-4">
            <Link
              to="/job-order/new"
              className="w-full py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>Allocate New Job Order</span>
            </Link>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* BOTTOM: COMPLETED JOB / APPROVAL CARDS (Real-time DB sync) */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <i className="fa-solid fa-certificate text-amber-500"></i>
              <span>Completed Job / Approval Cards</span>
            </h3>
            <p className="text-[11px] text-stone-400 font-medium mt-0.5">
              Manufactured pieces completed by Aachari / Karigar awaiting Master Approver sign-off
            </p>
          </div>
          <Link
            to="/job-order/quality-check"
            className="text-xs font-bold text-[#b01622] hover:underline flex items-center gap-1"
          >
            <span>Open Quality Check Queue ({jobStats.approval_cards.length})</span>
            <i className="fa-solid fa-chevron-right text-[10px]"></i>
          </Link>
        </div>

        {jobStats.approval_cards.length === 0 ? (
          <div className="p-8 text-center text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
            <i className="fa-solid fa-circle-check text-2xl text-emerald-500 mb-2"></i>
            <p className="font-bold text-stone-600 text-xs">No jobs pending approval</p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              When an artisan completes a job order in Receiver Work, it automatically appears here for Quality Check.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {jobStats.approval_cards.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-2xl border border-stone-200 hover:border-stone-300 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Image Banner */}
                  <div className="relative h-36 bg-stone-100 overflow-hidden">
                    <img
                      src={resolveItemImage(card)}
                      alt={card.product_name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-jewelry.png'; }}
                    />
                    <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                      {card.work_order_number}
                    </div>
                    <div className="absolute top-2.5 right-2.5 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                      Awaiting Sign-off
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-2 text-xs">
                    <div className="font-bold text-gray-900 line-clamp-1" title={card.product_name}>
                      {card.product_name}
                    </div>
                    <div className="text-stone-500 text-[11px] flex items-center justify-between">
                      <span>Artisan:</span>
                      <strong className="text-gray-900">{card.karigar_name || 'Rajesh Varma'}</strong>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-stone-100 text-center font-mono">
                      <div className="bg-stone-50 p-1.5 rounded-lg">
                        <span className="text-[9px] text-stone-400 block font-sans">Allotted</span>
                        <span className="font-bold text-gray-900 text-[11px]">{Number(card.allotted_weight).toFixed(2)}g</span>
                      </div>
                      <div className="bg-emerald-50 p-1.5 rounded-lg">
                        <span className="text-[9px] text-emerald-600 block font-sans">Finished</span>
                        <span className="font-bold text-emerald-700 text-[11px]">{Number(card.completed_weight).toFixed(2)}g</span>
                      </div>
                      <div className="bg-red-50 p-1.5 rounded-lg">
                        <span className="text-[9px] text-red-500 block font-sans">Pending</span>
                        <span className="font-bold text-[#b01622] text-[11px]">{Number(card.pending_weight).toFixed(2)}g</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons (Approve & Return) */}
                <div className="p-3 bg-stone-50/80 border-t border-stone-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDashboardApprove(card.id)}
                    disabled={approvingId === card.id}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {approvingId === card.id ? (
                      <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                    ) : (
                      <i className="fa-solid fa-check text-xs"></i>
                    )}
                    <span>Approve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDashboardReturn(card.id)}
                    disabled={approvingId === card.id}
                    className="px-2.5 py-1.5 bg-white border border-stone-200 hover:bg-red-50 text-stone-600 hover:text-red-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    title="Return / Reject for Rework"
                  >
                    <i className="fa-solid fa-rotate-left text-xs"></i>
                  </button>

                  <Link
                    to={`/job-order/receive?order_id=${card.id}`}
                    className="px-2.5 py-1.5 bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                    title="View Full Details"
                  >
                    <i className="fa-regular fa-eye text-xs"></i>
                  </Link>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
