import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import MaterialAllocationModal from '../components/MaterialAllocationModal';
import BenchMetalModal from '../components/BenchMetalModal';

const resolveItemImage = (item) => {
  const raw = item?.image_url || item?.product?.image_url || item?.product?.image || item?.image;
  if (!raw) return 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=80';
  if (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('/images/')) return raw;
  if (raw.startsWith('/storage/')) return raw;
  if (raw.startsWith('storage/')) return `/${raw}`;
  if (raw.startsWith('products/')) return `/storage/${raw}`;
  if (raw.startsWith('/')) return raw;
  return `/storage/${raw}`;
};

export default function Dashboard() {
  const { showPrompt, showConfirm, showToast } = useToast();

  // Modal states for Allocated Materials and Bench Metal
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isBenchModalOpen, setIsBenchModalOpen] = useState(false);
  const [karigarsList, setKarigarsList] = useState([]);

  const [data, setData] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_dashboard_data');
      if (c) return JSON.parse(c);
    } catch (e) { }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_dashboard_data');
      if (c) return false;
    } catch (e) { }
    return true;
  });

  const [timeRange, setTimeRange] = useState('Month');
  const [salesOverviewPeriod, setSalesOverviewPeriod] = useState('This Month');
  const [goldValuesPeriod, setGoldValuesPeriod] = useState('This Month');
  const [topCategoriesPeriod, setTopCategoriesPeriod] = useState('This Month');
  const [actionRequiresPeriod, setActionRequiresPeriod] = useState('This Month');
  const [activePoint, setActivePoint] = useState(null);

  const handleGlobalTimeRangeChange = (newPeriod) => {
    setTimeRange(newPeriod);
    setSalesOverviewPeriod(newPeriod);
    setGoldValuesPeriod(newPeriod);
    setTopCategoriesPeriod(newPeriod);
    setActionRequiresPeriod(newPeriod);
  };


  // Live Job Order & Approval Cards State (with Instant LocalStorage Cache)
  const [jobStats, setJobStats] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_job_stats');
      if (c) {
        const parsed = JSON.parse(c);
        if (parsed?.live_jobs?.length > 0) return parsed;
      }
    } catch (e) { }
    return {
      summary: {
        active_work_orders: 0,
        allocated_weight: 0,
        pending_weight: 0,
        gold_weight: 0,
        silver_weight: 0,
        diamond_weight: 0,
      },
      live_jobs: [],
      approval_cards: [],
    };
  });

  const [jobsLoading, setJobsLoading] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_job_stats');
      if (c) {
        const parsed = JSON.parse(c);
        if (parsed?.live_jobs?.length > 0) return false;
      }
    } catch (e) { }
    return true;
  });

  const [approvingId, setApprovingId] = useState(null);

  // Pre-cache card images immediately in browser memory
  useEffect(() => {
    if (jobStats?.approval_cards?.length > 0) {
      jobStats.approval_cards.forEach((card) => {
        const src = resolveItemImage(card);
        if (src) {
          const img = new Image();
          img.src = src;
        }
      });
    }
  }, [jobStats]);

  useEffect(() => {
    fetchDashboardData();
    fetchJobStats();
    fetchKarigars();
  }, [timeRange]);

  const fetchKarigars = async () => {
    try {
      const res = await api.get('/karigars?all=true');
      if (res?.data?.data && Array.isArray(res.data.data)) {
        setKarigarsList(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch karigars list:', e);
    }
  };

  const fetchJobStats = async () => {
    try {
      const res = await api.get('/work-orders/dashboard-stats', {
        params: { range: timeRange, period: timeRange }
      });
      if (res.data?.status === 'success' || res.data?.summary || res.data?.data) {
        const payload = res.data.data || res.data.summary || res.data;
        const newStats = {
          summary: payload,
          live_jobs: res.data.live_jobs || payload.live_jobs || [],
          approval_cards: res.data.approval_cards || payload.approval_cards || [],
        };
        setJobStats(newStats);
        try {
          localStorage.setItem('rudhra_job_stats', JSON.stringify(newStats));
        } catch (e) { }
      }
    } catch (e) {
      console.error('Failed to load live job stats:', e);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleDashboardApprove = async (orderId) => {
    const confirmed = await showConfirm({
      title: 'Approve Work Order',
      message: 'Are you sure you want to approve this work order and mark it as Ready for Delivery?',
      icon: 'fa-solid fa-circle-check',
      confirmText: 'Approve Work Order'
    });
    if (!confirmed) return;

    try {
      setApprovingId(orderId);
      await api.post(`/work-orders/${orderId}/approve`);
      await api.post(`/work-orders/${orderId}/mark-ready`);
      showToast('Work order approved successfully!', 'success', 'Approved');
      await fetchJobStats();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to approve work order.', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDashboardReturn = async (orderId) => {
    const reason = await showPrompt({
      title: 'Return to Artisan',
      message: 'Enter reason for returning to artisan (e.g. Solder defect, loose stone):',
      placeholder: 'Enter return reason details...',
      icon: 'fa-solid fa-rotate-left',
      confirmText: 'Submit Return'
    });

    if (!reason || !reason.trim()) return;
    try {
      setApprovingId(orderId);
      await api.post(`/work-orders/${orderId}/return`, { return_reason: reason.trim() });
      showToast('Work order returned to artisan.', 'info', 'Returned');
      await fetchJobStats();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to return work order.', 'error');
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
      <div className="flex items-center justify-center h-80 text-stone-400 font-['Inter',sans-serif]">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622] mr-3"></i>
        <span className="text-xs font-semibold">Loading Rudhra Jewellers Executive Dashboard...</span>
      </div>
    );
  }

  // Dynamic up-to-date date context
  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleString('default', { month: 'short' }); // e.g. "Sep"
  const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const prevMonthName = prevMonthDate.toLocaleString('default', { month: 'short' }); // e.g. "Aug"

  // Dynamic Sales Overview Data based on API data
  const getSalesOverviewData = () => {
    let pts = data?.summary?.chartPoints || [];

    if (!pts || pts.length === 0) {
      pts = [
        { date: 'Start', val: 0, label: '₹0L' },
        { date: 'Today', val: 0, label: '₹0L' },
      ];
    }

    const maxChartVal = Math.max(10, ...pts.map(p => p.val || 0)) * 1.25;
    const totalSalesVal = data?.summary?.todaysSaleRaw || data?.summary?.totalSalesRaw || 0;
    const totalOrdersVal = data?.summary?.totalOrders || 0;
    const computedAvgOrder = totalOrdersVal > 0 ? Math.round(totalSalesVal / totalOrdersVal) : 0;

    return {
      points: pts,
      maxVal: maxChartVal,
      yAxisLabels: [
        { label: `₹${Math.round(maxChartVal)}L`, val: maxChartVal },
        { label: `₹${Math.round(maxChartVal * 0.66)}L`, val: maxChartVal * 0.66 },
        { label: `₹${Math.round(maxChartVal * 0.33)}L`, val: maxChartVal * 0.33 },
        { label: '₹0', val: 0 },
      ],
      totalSales: data?.summary?.todaysSaleFormatted || '₹0',
      totalOrders: String(totalOrdersVal),
      avgOrderValue: '₹' + new Intl.NumberFormat('en-IN').format(computedAvgOrder),
      growth: data?.summary?.sales_metric?.change || data?.summary?.salesGrowth || '+0.0%',
    };
  };

  const salesData = getSalesOverviewData(timeRange);
  const salesPoints = salesData.points;
  const maxVal = salesData.maxVal;

  const chartWidth = 550;
  const chartHeight = 175;
  const paddingLeft = 55;
  const paddingRight = 55;
  const usableWidth = chartWidth - paddingLeft - paddingRight;

  const points = salesPoints.map((p, i) => {
    const step = salesPoints.length > 1 ? usableWidth / (salesPoints.length - 1) : usableWidth / 2;
    const x = paddingLeft + i * step;
    const y = chartHeight - 32 - (p.val / (maxVal || 1)) * (chartHeight - 55);
    return { x, y, ...p };
  });

  const pathD = points.length === 1
    ? `M ${paddingLeft},${points[0].y} L ${chartWidth - paddingRight},${points[0].y}`
    : points.reduce((acc, p, i) => {
        if (i === 0) return `M ${p.x},${p.y}`;
        const prev = points[i - 1];
        const cx1 = prev.x + (p.x - prev.x) / 2;
        const cy1 = prev.y;
        const cx2 = prev.x + (p.x - prev.x) / 2;
        const cy2 = p.y;
        return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${p.x},${p.y}`;
      }, '');

  const areaD = `${pathD} L ${chartWidth - paddingRight},${chartHeight - 25} L ${paddingLeft},${chartHeight - 25} Z`;

  // Dynamic Average 24K Gold Values based on selected period
  const getGoldValuesData = (period) => {
    const p = (period || 'Month').toLowerCase();
    const key = p.includes('today') ? 'today' : (p.includes('week') ? 'week' : (p.includes('quarter') ? 'quarter' : (p.includes('year') ? 'year' : (p.includes('all') ? 'all' : 'month'))));
    const gObj = data?.summary?.goldAverages?.[key];

    const buy24k = data?.summary?.avg24kBuyingRate10gFormatted || '₹0';
    const sell24k = data?.summary?.avg24kSellingRate10gFormatted || '₹0';

    if (gObj) {
      return {
        buyingVal: gObj.buyingVal || buy24k.replace('₹', '').trim(),
        buyingChange: gObj.buyingChange || '+0.0%',
        buyingVs: gObj.buyingVs || 'vs Previous',
        sellingVal: gObj.sellingVal || sell24k.replace('₹', '').trim(),
        sellingChange: gObj.sellingChange || '+0.0%',
        sellingVs: gObj.sellingVs || 'vs Previous',
      };
    }
    return {
      buyingVal: buy24k.replace('₹', '').trim(),
      buyingChange: '+0.0%',
      buyingVs: 'vs Previous',
      sellingVal: sell24k.replace('₹', '').trim(),
      sellingChange: '+0.0%',
      sellingVs: 'vs Previous',
    };
  };

  const goldData = getGoldValuesData(timeRange);

  // Dynamic Top Selling Categories Data based on DB stats
  const getTopCategoriesData = () => {
    return data?.topCategories || [];
  };

  const topCatData = getTopCategoriesData();

  // Dynamic Action Requires Data based on DB stats
  const getActionRequiresData = () => {
    return data?.actionRequires || [];
  };

  const actionReqData = getActionRequiresData();

  return (
    <div className="w-full pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-stone-800">

      {/* 1. Header Control Bar: Quick Points Title & Period Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Quick Points</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-9 h-9 bg-white border border-stone-200 rounded-xl flex items-center justify-center text-stone-500 hover:text-stone-800 shadow-2xs cursor-pointer transition-colors"
            title="Filter Settings"
          >
            <i className="fa-solid fa-sliders text-xs"></i>
          </button>
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => handleGlobalTimeRangeChange(e.target.value)}
              className="appearance-none bg-white border border-stone-200 text-stone-700 text-xs font-semibold rounded-xl px-4 py-2 pr-8 shadow-2xs hover:border-stone-300 focus:outline-hidden focus:border-[#b01622] cursor-pointer"
            >
              <option value="Today">Today</option>
              <option value="Week">This Week</option>
              <option value="Month">This Month</option>
              <option value="Quarter">This Quarter</option>
              <option value="Year">This Year</option>
              <option value="All">All Time</option>
            </select>
            <i className="fa-solid fa-chevron-down text-[9px] text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          </div>
        </div>
      </div>

      {/* 2. Section 1: Quick Points 5 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">

        {/* Card 1: Sale */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8.5 h-8.5 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-cart-shopping"></i>
              </div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight truncate">
                {timeRange === 'Today' ? "Today's Sale" : timeRange === 'Week' ? "This Week's Sale" : timeRange === 'Month' ? "This Month's Sale" : timeRange === 'Quarter' ? "Quarter Sale" : "Yearly Sale"}
              </span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight mt-3">
              {data?.summary?.todaysSaleFormatted || '₹0'}
            </div>
          </div>
          {(() => {
            const m = data?.summary?.sales_metric || { change: data?.summary?.salesGrowth || '+0.0%', is_increase: true, vs_label: 'vs Last Month' };
            const isInc = m.is_increase !== false;
            return (
              <div className={`text-[11px] font-bold flex items-center gap-1 mt-3 ${isInc ? 'text-emerald-600' : 'text-rose-500'}`}>
                <i className={`fa-solid ${isInc ? 'fa-arrow-up' : 'fa-arrow-down'} text-[9px]`}></i>
                <span>{m.change} <span className="font-semibold text-stone-400 ml-0.5">{m.vs_label || 'vs Previous'}</span></span>
              </div>
            );
          })()}
        </div>

        {/* Card 2: Orders */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8.5 h-8.5 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm shrink-0">
                <i className="fa-regular fa-clipboard"></i>
              </div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight truncate">Orders</span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight mt-3">
              {data?.summary?.ordersFormatted || '₹0'}
            </div>
          </div>
          {(() => {
            const m = data?.summary?.orders_metric || { change: '+0.0%', is_increase: true, vs_label: 'vs Last Month' };
            const isInc = m.is_increase !== false;
            return (
              <div className={`text-[11px] font-bold flex items-center gap-1 mt-3 ${isInc ? 'text-emerald-600' : 'text-rose-500'}`}>
                <i className={`fa-solid ${isInc ? 'fa-arrow-up' : 'fa-arrow-down'} text-[9px]`}></i>
                <span>{m.change} <span className="font-semibold text-stone-400 ml-0.5">{m.vs_label || 'vs Previous'}</span></span>
              </div>
            );
          })()}
        </div>

        {/* Card 3: Inventory Value */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8.5 h-8.5 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-store"></i>
              </div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight truncate">Inventory Value</span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight mt-3">
              {data?.summary?.inventoryValueFormatted || '₹0'}
            </div>
          </div>
          {(() => {
            const m = data?.summary?.inventory_metric || { change: '+0.0%', is_increase: true, vs_label: 'vs Last Month' };
            const isInc = m.is_increase !== false;
            return (
              <div className={`text-[11px] font-bold flex items-center gap-1 mt-3 ${isInc ? 'text-emerald-600' : 'text-rose-500'}`}>
                <i className={`fa-solid ${isInc ? 'fa-arrow-up' : 'fa-arrow-down'} text-[9px]`}></i>
                <span>{m.change} <span className="font-semibold text-stone-400 ml-0.5">{m.vs_label || 'vs Previous'}</span></span>
              </div>
            );
          })()}
        </div>

        {/* Card 4: Customers */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8.5 h-8.5 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-user-check"></i>
              </div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight truncate">Customers</span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight mt-3">
              {data?.summary?.customersCount ?? 0}
            </div>
          </div>
          {(() => {
            const m = data?.summary?.customers_metric || { change: '+0.0%', is_increase: true, vs_label: 'vs Last Month' };
            const isInc = m.is_increase !== false;
            return (
              <div className={`text-[11px] font-bold flex items-center gap-1 mt-3 ${isInc ? 'text-emerald-600' : 'text-rose-500'}`}>
                <i className={`fa-solid ${isInc ? 'fa-arrow-up' : 'fa-arrow-down'} text-[9px]`}></i>
                <span>{m.change} <span className="font-semibold text-stone-400 ml-0.5">{m.vs_label || 'vs Previous'}</span></span>
              </div>
            );
          })()}
        </div>

        {/* Card 5: Pending Order */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8.5 h-8.5 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-user-clock"></i>
              </div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight truncate">Pending Order</span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight mt-3">
              {data?.summary?.pendingOrdersCount ?? 0}
            </div>
          </div>
          {(() => {
            const m = data?.summary?.pending_metric || { change: '+0.0%', is_increase: true, vs_label: 'vs Last Month' };
            const isInc = m.is_increase !== false;
            return (
              <div className={`text-[11px] font-bold flex items-center gap-1 mt-3 ${isInc ? 'text-emerald-600' : 'text-rose-500'}`}>
                <i className={`fa-solid ${isInc ? 'fa-arrow-up' : 'fa-arrow-down'} text-[9px]`}></i>
                <span>{m.change} <span className="font-semibold text-stone-400 ml-0.5">{m.vs_label || 'vs Previous'}</span></span>
              </div>
            );
          })()}
        </div>

      </div>

      {/* 3. Section 2: Middle Row (Sales Overview + Average Gold Values) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

        {/* Left: Sales Overview (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-1">
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Sales Overview</h3>
          </div>

          {/* SVG Wave Area Chart */}
          <div className="relative w-full pt-1">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-48 overflow-visible">
              <defs>
                <linearGradient id="redWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b01622" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#b01622" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Y Axis Grid lines & labels */}
              {salesData.yAxisLabels.map((g, idx) => {
                const y = chartHeight - 32 - (g.val / maxVal) * (chartHeight - 55);
                return (
                  <g key={idx}>
                    <line
                      x1="50"
                      y1={y}
                      x2={chartWidth - 15}
                      y2={y}
                      stroke="#f5f5f4"
                      strokeDasharray="3 3"
                    />
                    <text x="44" y={y + 3} textAnchor="end" className="text-[9px] fill-stone-400 font-medium font-mono">
                      {g.label}
                    </text>
                  </g>
                );
              })}

              {/* Area fill */}
              <path d={areaD} fill="url(#redWaveGrad)" />

              {/* Line stroke */}
              <path d={pathD} fill="none" stroke="#b01622" strokeWidth="2.5" strokeLinecap="round" />

              {/* Points */}
              {points.map((p, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === points.length - 1;
                const anchor = isFirst ? "start" : isLast ? "end" : "middle";
                return (
                  <g key={idx} className="cursor-pointer">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={activePoint?.date === p.date ? 5 : 3.5}
                      fill="#b01622"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      onMouseEnter={() => setActivePoint(p)}
                      onMouseLeave={() => setActivePoint(null)}
                    />
                    <text x={p.x} y={chartHeight - 8} textAnchor={anchor} className="text-[10px] fill-stone-500 font-semibold">
                      {p.date}
                    </text>
                  </g>
                );
              })}
            </svg>

            {activePoint && (
              <div
                className="absolute bg-stone-900 text-white text-[11px] py-1 px-2.5 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full font-mono font-bold"
                style={{
                  left: `${(activePoint.x / chartWidth) * 100}%`,
                  top: `${(activePoint.y / chartHeight) * 100}%`,
                }}
              >
                {activePoint.date}: {activePoint.label}
              </div>
            )}
          </div>

          {/* Sales Overview Footer Strip */}
          <div className="pt-3 border-t border-stone-100 grid grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-stone-400 block">Total Sales</span>
              <span className="font-extrabold text-stone-900 font-mono">{salesData.totalSales}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-stone-400 block">Total Orders</span>
              <span className="font-extrabold text-stone-900 font-mono">{salesData.totalOrders}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-stone-400 block">Average Order Value</span>
              <span className="font-extrabold text-stone-900 font-mono">{salesData.avgOrderValue}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-stone-400 block">Growth</span>
              <span className="font-extrabold text-emerald-600 flex items-center gap-0.5">
                <i className="fa-solid fa-arrow-up text-[9px]"></i>
                <span>{salesData.growth}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Average Gold Values (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-1">
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Average Gold Values</h3>
          </div>

          <div className="space-y-3">
            {/* Avg Buying Value Box */}
            <div className="bg-stone-50/60 border border-stone-200/60 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 text-[#b01622] flex items-center justify-center text-base shrink-0">
                  <i className="fa-solid fa-arrow-trend-down"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-500 block">Avg Buying Value</span>
                  <div className="text-lg font-extrabold text-stone-900 font-mono leading-tight">
                    ₹ {goldData.buyingVal} <span className="text-xs font-medium text-stone-400">/ 10g</span>
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                <span>{goldData.buyingChange?.startsWith('+') ? goldData.buyingChange : `+ ${goldData.buyingChange}`}</span>
                <span className="text-[10px] text-stone-400 font-normal ml-0.5">{goldData.buyingVs}</span>
              </div>
            </div>

            {/* Avg Selling Value Box */}
            <div className="bg-stone-50/60 border border-stone-200/60 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-base shrink-0">
                  <i className="fa-solid fa-arrow-trend-up"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-500 block">Avg Selling Value</span>
                  <div className="text-lg font-extrabold text-stone-900 font-mono leading-tight">
                    ₹ {goldData.sellingVal} <span className="text-xs font-medium text-stone-400">/ 10g</span>
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                <span>{goldData.sellingChange?.startsWith('+') ? goldData.sellingChange : `+ ${goldData.sellingChange}`}</span>
                <span className="text-[10px] text-stone-400 font-normal ml-0.5">{goldData.sellingVs}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Section 3: Bottom Row (3 Columns - Equal Size Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">

        {/* Column 1: Recent Orders */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-stone-900">Recent Orders</h3>
              <Link to="/job-order" className="text-xs font-bold text-[#b01622] hover:underline">
                View All
              </Link>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs align-top">
                <thead>
                  <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                    <th className="pb-2">Order ID</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data?.recentOrders && data.recentOrders.length > 0 ? (
                    data.recentOrders.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50">
                        <td className="py-2.5 font-mono text-stone-500 font-medium">{row.id}</td>
                        <td className="py-2.5 font-bold text-stone-900">{row.name}</td>
                        <td className="py-2.5 text-right">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${row.style}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {(!data?.recentOrders || data.recentOrders.length === 0) && (
            <div className="py-8 flex flex-col items-center justify-center text-stone-400 font-medium my-auto">
              <i className="fa-regular fa-clipboard text-2xl text-stone-300 mb-1.5"></i>
              <span className="text-xs font-semibold">No data</span>
            </div>
          )}
        </div>

        {/* Column 2: Top Selling Categories */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-stone-900">Top Selling Categories</h3>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs align-top">
                <thead>
                  <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                    <th className="pb-2">Category</th>
                    <th className="pb-2 text-right">Sales (₹)</th>
                    <th className="pb-2 text-right">Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {topCatData && topCatData.length > 0 ? (
                    topCatData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50">
                        <td className="py-2.5 font-bold text-stone-900 flex items-center gap-1.5">
                          <span>{row.icon}</span>
                          <span>{row.name}</span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-stone-900">{row.sales}</td>
                        <td className={`py-2.5 text-right font-bold ${row.is_increase === false ? 'text-rose-600' : 'text-emerald-600'}`}>{row.growth}</td>
                      </tr>
                    ))
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {(!topCatData || topCatData.length === 0) && (
            <div className="py-8 flex flex-col items-center justify-center text-stone-400 font-medium my-auto space-y-2">
              <i className="fa-solid fa-layer-group text-2xl text-stone-300"></i>
              <span className="text-xs font-semibold">No Categories in Masters</span>
              <Link to="/masters/category" className="text-[11px] font-bold text-[#b01622] hover:underline flex items-center gap-1">
                <i className="fa-solid fa-plus text-[9px]"></i>
                <span>Add Category in Masters</span>
              </Link>
            </div>
          )}
        </div>

        {/* Column 3: Action Required */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-stone-900">Action Required</h3>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs align-top">
                <thead>
                  <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                    <th className="pb-2">Item / Alert</th>
                    <th className="pb-2 text-right">Details</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {actionReqData && actionReqData.length > 0 ? (
                    actionReqData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50">
                        <td className="py-2.5 font-bold text-stone-900 flex items-center gap-1.5">
                          <span>{row.icon}</span>
                          <span>{row.name}</span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-stone-900">{row.sales}</td>
                        <td className="py-2.5 text-right font-bold text-amber-600">{row.growth}</td>
                      </tr>
                    ))
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {(!actionReqData || actionReqData.length === 0) && (
            <div className="py-8 flex flex-col items-center justify-center text-stone-400 font-medium my-auto">
              <i className="fa-solid fa-circle-check text-2xl text-emerald-400 mb-1.5"></i>
              <span className="text-xs font-semibold">No data</span>
            </div>
          )}
        </div>

      </div>

      {/* 5. Section 4: Live Manufacturing Jobs & Work Order Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 items-start">
        {/* Left (2 Columns): LIVE JOB CREATION STATUS TABLE */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
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

            <div className="overflow-x-auto custom-scrollbar pb-1">
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50/60 text-stone-600 font-semibold text-[11px]">
                    <th className="py-2.5 px-3.5 whitespace-nowrap">WORK ORDER NO</th>
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
                  {jobsLoading && jobStats.live_jobs.length === 0 ? (
                    [1, 2, 3, 4].map((n) => (
                      <tr key={n} className="animate-pulse">
                        <td className="py-3 px-3.5"><div className="h-3.5 bg-stone-200/80 rounded w-24"></div></td>
                        <td className="py-3 px-3"><div className="h-3.5 bg-stone-200/80 rounded w-28"></div></td>
                        <td className="py-3 px-3"><div className="h-3.5 bg-stone-200/80 rounded w-20"></div></td>
                        <td className="py-3 px-3 text-right"><div className="h-3.5 bg-stone-200/80 rounded w-14 ml-auto"></div></td>
                        <td className="py-3 px-3 text-right"><div className="h-3.5 bg-stone-200/80 rounded w-14 ml-auto"></div></td>
                        <td className="py-3 px-3 text-right"><div className="h-3.5 bg-stone-200/80 rounded w-14 ml-auto"></div></td>
                        <td className="py-3 px-3"><div className="h-3.5 bg-stone-200/80 rounded w-16"></div></td>
                        <td className="py-3 px-3 text-center"><div className="h-3.5 bg-stone-200/80 rounded-full w-14 mx-auto"></div></td>
                      </tr>
                    ))
                  ) : jobStats.live_jobs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-stone-400 font-medium">
                        No active live jobs found.
                      </td>
                    </tr>
                  ) : (
                    jobStats.live_jobs.slice(0, 5).map((wo) => (
                      <tr
                        key={wo.id}
                        onClick={() => navigate(`/job-order/in-progress?order_id=${wo.id}`)}
                        className="hover:bg-stone-50/60 transition-colors cursor-pointer group"
                      >
                        <td className="py-2.5 px-3.5 font-mono font-bold text-[#b01622] group-hover:underline whitespace-nowrap">
                          {wo.work_order_number}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-gray-900 truncate max-w-[140px]" title={wo.product_name || wo.item_type}>
                          {wo.product_name || wo.item_type || wo.product?.name || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-stone-700 whitespace-nowrap font-medium">
                          {wo.karigar_name || wo.artisan_name || wo.karigar?.name || '-'}
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
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${wo.status === 'pending_approval'
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

          <div className="p-3 bg-stone-50 border-t border-stone-100 flex items-center justify-end text-xs text-stone-500">
            <Link to="/job-order/receive" className="font-bold text-[#b01622] hover:underline">
              Open Receiver Work &rarr;
            </Link>
          </div>
        </div>

        {/* Right (1 Column): TOTAL MATERIALS ALLOCATED & METAL ON BENCH */}
        {(() => {
          const activeList = jobStats.all_active_jobs || jobStats.live_jobs || [];
          const sumAllotted = activeList.reduce((acc, wo) => acc + Number(wo.allotted_weight || 0), 0);
          const sumPending = activeList.reduce((acc, wo) => acc + Number(wo.pending_weight || 0), 0);

          const allocatedWeightVal = Number(
            jobStats.summary?.allocated_weight ??
            jobStats.summary?.total_allocated_weight ??
            sumAllotted
          );
          const pendingWeightVal = Number(
            jobStats.summary?.pending_weight ??
            jobStats.summary?.total_pending_weight ??
            sumPending
          );
          const activeJobsCount = Number(
            jobStats.summary?.total_active ??
            jobStats.summary?.active_work_orders ??
            activeList.length
          );
          const goldWeightVal = Number(
            jobStats.summary?.gold_weight ?? 0
          );
          const silverWeightVal = Number(jobStats.summary?.silver_weight ?? 0);
          const diamondWeightVal = Number(jobStats.summary?.diamond_weight ?? 0);

          const sumKarigarBench = karigarsList.reduce((acc, k) => acc + Number(k.current_gold_balance_grams || 0), 0);
          const totalBenchMetalVal = sumKarigarBench > 0 ? sumKarigarBench : (pendingWeightVal > 0 ? pendingWeightVal : 0);

          return (
            <div className="flex flex-col gap-4">
              {/* CARD 1: TOTAL MATERIALS ALLOCATED */}
              <div
                onClick={() => setIsMaterialModalOpen(true)}
                className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-5 flex flex-col justify-between hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
                title="Click to open pop-up displaying material allocation per karigar"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 group-hover:text-[#b01622] transition-colors">
                      <span>Total Materials Allocated</span>
                      <i className="fa-solid fa-up-right-from-square text-[10px] text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                    </h3>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      Active Vault
                    </span>
                  </div>

                  {/* Total Allocated Banner */}
                  <div className="bg-gradient-to-br from-red-50/60 to-amber-50/60 rounded-2xl p-4 border border-red-100 mb-4">
                    <div className="text-[11px] font-bold text-stone-500 uppercase tracking-tight">TOTAL ALLOTTED METAL WEIGHT</div>
                    <div className="text-2xl font-black text-gray-900 font-mono tracking-tight mt-1">
                      {allocatedWeightVal.toFixed(3)} <span className="text-sm font-sans font-bold text-stone-500">grams</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium mt-1">
                      <span>Active Runs: <strong className="text-gray-900">{activeJobsCount} Jobs</strong></span>
                      <span>Pending: <strong className="text-[#b01622]">{pendingWeightVal.toFixed(3)}g</strong></span>
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
                        <span className="font-mono font-bold text-gray-900">{goldWeightVal.toFixed(3)} g</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${allocatedWeightVal > 0 && goldWeightVal > 0 ? Math.min(100, (goldWeightVal / allocatedWeightVal) * 100) : 0}%` }}
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
                        <span className="font-mono font-bold text-gray-900">{silverWeightVal.toFixed(3)} g</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className="h-full bg-stone-400 rounded-full transition-all duration-500"
                          style={{ width: `${allocatedWeightVal > 0 && silverWeightVal > 0 ? Math.min(100, (silverWeightVal / allocatedWeightVal) * 100) : 0}%` }}
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
                        <span className="font-mono font-bold text-gray-900">{diamondWeightVal.toFixed(3)} ct</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${diamondWeightVal > 0 ? Math.min(100, (diamondWeightVal / (allocatedWeightVal || 1)) * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 mt-4" onClick={(e) => e.stopPropagation()}>
                  <Link
                    to="/job-order/new"
                    className="w-full py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-plus text-xs"></i>
                    <span>Allocate New Job Order</span>
                  </Link>
                </div>
              </div>

              {/* CARD 2: METAL ON BENCH */}
              <div
                onClick={() => setIsBenchModalOpen(true)}
                className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-5 flex items-center justify-between hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
                title="Click to open pop-up displaying metal on bench balance per karigar"
              >
                <div>
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>METAL ON BENCH</span>
                    <i className="fa-solid fa-up-right-from-square text-[10px] text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                  </div>
                  <div className="text-3xl font-black text-stone-900 font-sans tracking-tight leading-none flex items-baseline gap-1 mt-1">
                    <span>{totalBenchMetalVal.toFixed(3)}</span>
                    <span className="text-sm font-bold text-amber-700">g</span>
                  </div>
                  <div className="text-xs text-amber-700 font-medium mt-2">
                    Pure 24K / 22K balance
                  </div>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-800 flex items-center justify-center text-xl shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-cubes-stacked"></i>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 6. Section 5: Quality Check Queue (Final Approval) */}
      <div className="mb-8">
        <div className="border-b border-[#eceff3] pb-2.5 mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#111827] tracking-tight">
            Quality Check Queue (Final Approval)
          </h2>
          <span className="text-[11px] font-semibold text-stone-400">
            {jobStats.approval_cards.length} item{jobStats.approval_cards.length === 1 ? '' : 's'} awaiting manager inspection
          </span>
        </div>

        {/* Horizontal Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {jobStats.approval_cards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-xl border border-[#eceff3] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-3.5 flex flex-col justify-between hover:border-gray-300 transition-colors min-h-[290px]"
            >
              <div>
                {/* Image Box */}
                <div className="relative h-44 rounded-lg overflow-hidden bg-stone-100 mb-3">
                  <img
                    src={resolveItemImage(card)}
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
                    {card.qc_code || card.work_order_number}
                  </span>
                </div>

                {/* Artisan Info */}
                <p className="text-[10.5px] text-[#6b7280] mt-0.5 mb-3">
                  Artisan: {card.karigar_name || card.artisan_name || '-'}
                </p>
              </div>

              {/* Action Buttons: Approve & Reject */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  disabled={approvingId === card.id}
                  onClick={() => handleDashboardApprove(card.id)}
                  className="py-1.5 px-3 bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-bold text-xs rounded-md transition-colors text-center cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                >
                  {approvingId === card.id ? (
                    <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  ) : (
                    'Approve'
                  )}
                </button>
                <button
                  type="button"
                  disabled={approvingId === card.id}
                  onClick={() => handleDashboardReturn(card.id)}
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
            className="border-2 border-dashed border-[#d1d5db] hover:border-gray-400 rounded-xl bg-white p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[290px]"
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
      </div>

      {/* Material Allocation & Bench Metal Pop-up Modals */}
      <MaterialAllocationModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        summaryData={jobStats.summary || {}}
        liveJobs={jobStats.all_active_jobs || jobStats.live_jobs || []}
      />

      <BenchMetalModal
        isOpen={isBenchModalOpen}
        onClose={() => setIsBenchModalOpen(false)}
        totalBenchMetal={karigarsList.reduce((acc, k) => acc + Number(k.current_gold_balance_grams || 0), 0)}
        karigarsList={karigarsList}
        liveJobs={jobStats.all_active_jobs || jobStats.live_jobs || []}
      />

    </div>
  );
}
