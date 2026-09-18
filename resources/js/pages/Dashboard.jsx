import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

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
  const [salesOverviewPeriod, setSalesOverviewPeriod] = useState('This Month');
  const [goldValuesPeriod, setGoldValuesPeriod] = useState('Today');
  const [topCategoriesPeriod, setTopCategoriesPeriod] = useState('This Month');
  const [actionRequiresPeriod, setActionRequiresPeriod] = useState('This Month');
  const [activePoint, setActivePoint] = useState(null);

  // Live Job Order & Approval Cards State (with Instant LocalStorage Cache)
  const [jobStats, setJobStats] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_job_stats');
      if (c) {
        const parsed = JSON.parse(c);
        if (parsed?.live_jobs?.length > 0) return parsed;
      }
    } catch (e) {}
    return {
      summary: {
        active_work_orders: 4,
        allocated_weight: 125.447,
        pending_weight: 65.247,
        gold_weight: 125.447,
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
    } catch (e) {}
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
  }, [timeRange]);

  const fetchJobStats = async () => {
    try {
      const res = await api.get('/work-orders/dashboard-stats');
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
        } catch (e) {}
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

  // Dynamic Sales Overview Data based on selected period ("This Month", "Last Month", "This Year")
  const getSalesOverviewData = (period) => {
    if (period === 'Last Month') {
      return {
        points: [
          { date: `1 ${prevMonthName}`, val: 4.2, label: '₹4.2L' },
          { date: `5 ${prevMonthName}`, val: 7.8, label: '₹7.8L' },
          { date: `11 ${prevMonthName}`, val: 12.5, label: '₹12.5L' },
          { date: `16 ${prevMonthName}`, val: 14.8, label: '₹14.8L' },
          { date: `21 ${prevMonthName}`, val: 18.2, label: '₹18.2L' },
          { date: `26 ${prevMonthName}`, val: 11.0, label: '₹11.0L' },
          { date: `31 ${prevMonthName}`, val: 21.5, label: '₹21.5L' },
        ],
        maxVal: 25,
        yAxisLabels: [
          { label: '₹25L', val: 25 },
          { label: '₹20L', val: 20 },
          { label: '₹15L', val: 15 },
          { label: '₹10L', val: 10 },
          { label: '₹5L', val: 5 },
          { label: '₹0', val: 0 },
        ],
        totalSales: '₹3,12,80,400',
        totalOrders: '345',
        avgOrderValue: '₹90,668',
        growth: '18.2%',
      };
    }

    if (period === 'This Year') {
      return {
        points: [
          { date: 'Jan', val: 18.5, label: '₹18.5L' },
          { date: 'Mar', val: 22.4, label: '₹22.4L' },
          { date: 'May', val: 25.8, label: '₹25.8L' },
          { date: 'Jul', val: 29.1, label: '₹29.1L' },
          { date: 'Sep', val: 32.6, label: '₹32.6L' },
          { date: 'Nov', val: 38.0, label: '₹38.0L' },
          { date: 'Dec', val: 42.5, label: '₹42.5L' },
        ],
        maxVal: 50,
        yAxisLabels: [
          { label: '₹50L', val: 50 },
          { label: '₹40L', val: 40 },
          { label: '₹30L', val: 30 },
          { label: '₹20L', val: 20 },
          { label: '₹10L', val: 10 },
          { label: '₹0', val: 0 },
        ],
        totalSales: '₹28,54,56,700',
        totalOrders: '3,840',
        avgOrderValue: '₹74,338',
        growth: '31.4%',
      };
    }

    // Default: 'This Month' (Up to date for current month!)
    const totalSalesVal = data?.summary?.totalSalesRaw || 28545670;
    const totalOrdersVal = data?.summary?.totalOrders || 320;
    const computedAvgOrder = Math.round(totalSalesVal / totalOrdersVal);

    return {
      points: [
        { date: `1 ${currentMonthName}`, val: 3.5, label: '₹3.5L' },
        { date: `5 ${currentMonthName}`, val: 6.5, label: '₹6.5L' },
        { date: `11 ${currentMonthName}`, val: 10.2, label: '₹10.2L' },
        { date: `16 ${currentMonthName}`, val: 16.0, label: '₹16.0L' },
        { date: `21 ${currentMonthName}`, val: 17.5, label: '₹17.5L' },
        { date: `26 ${currentMonthName}`, val: 8.0, label: '₹8.0L' },
        { date: `30 ${currentMonthName}`, val: 19.8, label: '₹19.8L' },
      ],
      maxVal: 20,
      yAxisLabels: [
        { label: '₹20L', val: 20 },
        { label: '₹15L', val: 15 },
        { label: '₹10L', val: 10 },
        { label: '₹5L', val: 5 },
        { label: '₹0', val: 0 },
      ],
      totalSales: data?.summary?.totalSalesFormatted || '₹2,85,45,670',
      totalOrders: String(totalOrdersVal),
      avgOrderValue: '₹' + new Intl.NumberFormat('en-IN').format(computedAvgOrder),
      growth: '24.5%',
    };
  };

  const salesData = getSalesOverviewData(salesOverviewPeriod);
  const salesPoints = salesData.points;
  const maxVal = salesData.maxVal;

  const chartWidth = 550;
  const chartHeight = 160;

  const points = salesPoints.map((p, i) => {
    const x = (i / (salesPoints.length - 1)) * (chartWidth - 50) + 35;
    const y = chartHeight - 20 - (p.val / maxVal) * (chartHeight - 40);
    return { x, y, ...p };
  });

  const pathD = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - 15} L ${points[0].x} ${chartHeight - 15} Z`;

  // Dynamic Average Gold Values Data based on selected period
  const getGoldValuesData = (period) => {
    if (period === 'This Week') {
      return {
        buyingVal: '61,850',
        buyingChange: '1.8%',
        buyingVs: 'vs Last Week',
        sellingVal: '68,200',
        sellingChange: '2.5%',
        sellingVs: 'vs Last Week',
      };
    }
    if (period === 'This Month') {
      return {
        buyingVal: '60,950',
        buyingChange: '4.2%',
        buyingVs: 'vs Last Month',
        sellingVal: '67,400',
        sellingChange: '4.8%',
        sellingVs: 'vs Last Month',
      };
    }
    return {
      buyingVal: '62,450',
      buyingChange: '2.4%',
      buyingVs: 'vs Yesterday',
      sellingVal: '68,900',
      sellingChange: '3.1%',
      sellingVs: 'vs Yesterday',
    };
  };

  const goldData = getGoldValuesData(goldValuesPeriod);

  // Dynamic Top Selling Categories Data based on selected period
  const getTopCategoriesData = (period) => {
    if (period === 'This Year') {
      return [
        { icon: '✨', name: 'Gold Necklace', sales: '₹ 9,85,45,670', growth: '↑ 34.2%' },
        { icon: '✨', name: 'Gold Ring', sales: '₹ 7,65,32,450', growth: '↑ 24.8%' },
        { icon: '💎', name: 'Diamond Earrings', sales: '₹ 5,45,67,890', growth: '↑ 29.1%' },
        { icon: '✨', name: 'Gold Bracelet', sales: '₹ 4,32,48,230', growth: '↑ 21.6%' },
      ];
    }
    return data?.topCategories || [
      { icon: '✨', name: 'Gold Necklace', sales: '₹ 85,45,670', growth: '↑ 28.5%' },
      { icon: '✨', name: 'Gold Ring', sales: '₹ 65,32,450', growth: '↑ 18.2%' },
      { icon: '💎', name: 'Diamond Earrings', sales: '₹ 45,67,890', growth: '↑ 22.7%' },
      { icon: '✨', name: 'Gold Bracelet', sales: '₹ 32,48,230', growth: '↑ 15.4%' },
    ];
  };

  const topCatData = getTopCategoriesData(topCategoriesPeriod);

  // Dynamic Action Requires Data based on selected period
  const getActionRequiresData = (period) => {
    if (period === 'This Year') {
      return [
        { icon: '⚠️', name: 'Low Stock Warning', sales: '42 Items', growth: 'Action Req' },
        { icon: '⌛', name: 'Crafting Approvals', sales: '18 Orders', growth: 'Pending' },
        { icon: '🚨', name: 'Overdue Artisan Work', sales: '7 Orders', growth: 'High Priority' },
        { icon: '🔍', name: 'QC Final Inspection', sales: '12 Items', growth: 'In QC' },
      ];
    }
    return [
      { icon: '✨', name: 'Gold Necklace', sales: '₹ 85,45,670', growth: '↑ 28.5%' },
      { icon: '✨', name: 'Gold Ring', sales: '₹ 65,32,450', growth: '↑ 18.2%' },
      { icon: '💎', name: 'Diamond Earrings', sales: '₹ 45,67,890', growth: '↑ 22.7%' },
      { icon: '✨', name: 'Gold Bracelet', sales: '₹ 32,48,230', growth: '↑ 15.4%' },
    ];
  };

  const actionReqData = getActionRequiresData(actionRequiresPeriod);

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
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none bg-white border border-stone-200 text-stone-700 text-xs font-semibold rounded-xl px-4 py-2 pr-8 shadow-2xs hover:border-stone-300 focus:outline-hidden focus:border-[#b01622] cursor-pointer"
            >
              <option value="Month">Month</option>
              <option value="Quarter">Quarter</option>
              <option value="Year">Year</option>
            </select>
            <i className="fa-solid fa-chevron-down text-[9px] text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          </div>
        </div>
      </div>

      {/* 2. Section 1: Quick Points 5 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Today's Sale */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8.5 h-8.5 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-cart-shopping"></i>
              </div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight truncate">Today's Sale</span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight mt-3">
              {data?.summary?.todaysSaleFormatted || '₹24,75,000'}
            </div>
          </div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-3">
            <i className="fa-solid fa-arrow-up text-[9px]"></i>
            <span>12.45% <span className="font-semibold text-stone-400 ml-0.5">vs Yesterday</span></span>
          </div>
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
              {data?.summary?.ordersFormatted || '₹24,75,000'}
            </div>
          </div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-3">
            <i className="fa-solid fa-arrow-up text-[9px]"></i>
            <span>12.45% <span className="font-semibold text-stone-400 ml-0.5">vs 5m</span></span>
          </div>
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
              {data?.summary?.inventoryValueFormatted || '₹24,75,000'}
            </div>
          </div>
          <div className="text-[11px] font-bold text-rose-500 flex items-center gap-1 mt-3">
            <i className="fa-solid fa-arrow-down text-[9px]"></i>
            <span>12.45% <span className="font-semibold text-stone-400 ml-0.5">vs Last Month</span></span>
          </div>
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
              {data?.summary?.customersCount ?? 20}
            </div>
          </div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-3">
            <i className="fa-solid fa-arrow-up text-[9px]"></i>
            <span>12.45% <span className="font-semibold text-stone-400 ml-0.5">vs Last Year</span></span>
          </div>
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
              {data?.summary?.pendingOrdersCount ?? 20}
            </div>
          </div>
          <div className="text-[11px] font-bold text-rose-500 flex items-center gap-1 mt-3">
            <i className="fa-solid fa-arrow-down text-[9px]"></i>
            <span>12.45% <span className="font-semibold text-stone-400 ml-0.5">vs Last Year</span></span>
          </div>
        </div>

      </div>

      {/* 3. Section 2: Middle Row (Sales Overview + Average Gold Values) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left: Sales Overview (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Sales Overview</h3>
            <div className="relative">
              <select
                value={salesOverviewPeriod}
                onChange={(e) => setSalesOverviewPeriod(e.target.value)}
                className="appearance-none bg-white border border-stone-200 text-stone-700 text-xs font-semibold rounded-xl px-3 py-1.5 pr-7 focus:outline-hidden focus:border-[#b01622] cursor-pointer"
              >
                <option value="This Month">This Month</option>
                <option value="Last Month">Last Month</option>
                <option value="This Year">This Year</option>
              </select>
              <i className="fa-solid fa-chevron-down text-[8px] text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
            </div>
          </div>

          {/* SVG Wave Area Chart */}
          <div className="relative w-full overflow-hidden pt-1">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible">
              <defs>
                <linearGradient id="redWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b01622" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#b01622" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Y Axis Grid lines & labels */}
              {salesData.yAxisLabels.map((g, idx) => {
                const y = chartHeight - 20 - (g.val / maxVal) * (chartHeight - 40);
                return (
                  <g key={idx}>
                    <line
                      x1="35"
                      y1={y}
                      x2={chartWidth - 10}
                      y2={y}
                      stroke="#f5f5f4"
                      strokeDasharray="3 3"
                    />
                    <text x="30" y={y + 3} textAnchor="end" className="text-[9px] fill-stone-400 font-medium font-mono">
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
              {points.map((p, idx) => (
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
                  <text x={p.x} y={chartHeight - 4} textAnchor="middle" className="text-[9.5px] fill-stone-400 font-medium">
                    {p.date}
                  </text>
                </g>
              ))}
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
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Average Gold Values</h3>
            <div className="relative">
              <select
                value={goldValuesPeriod}
                onChange={(e) => setGoldValuesPeriod(e.target.value)}
                className="appearance-none bg-white border border-stone-200 text-stone-700 text-xs font-semibold rounded-xl px-3 py-1.5 pr-7 focus:outline-hidden focus:border-[#b01622] cursor-pointer"
              >
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>
              <i className="fa-solid fa-chevron-down text-[8px] text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
            </div>
          </div>

          <div className="space-y-3">
            {/* Avg Buying Value Box */}
            <div className="bg-stone-50/60 border border-stone-200/60 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 text-[#b01622] flex items-center justify-center text-base shrink-0">
                  <i className="fa-solid fa-[#b01622] fa-arrow-trend-down"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-500 block">Avg Buying Value</span>
                  <div className="text-lg font-extrabold text-stone-900 font-mono leading-tight">
                    ₹ {goldData.buyingVal} <span className="text-xs font-medium text-stone-400">/ 10g</span>
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                <i className="fa-solid fa-plus text-[9px]"></i>
                <span>{goldData.buyingChange}</span>
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
                <i className="fa-solid fa-plus text-[9px]"></i>
                <span>{goldData.sellingChange}</span>
                <span className="text-[10px] text-stone-400 font-normal ml-0.5">{goldData.sellingVs}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Section 3: Bottom Row (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        
        {/* Column 1: Recent Orders */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900">Recent Orders</h3>
            <Link to="/job-order" className="text-xs font-bold text-[#b01622] hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                  <th className="pb-2">Order ID</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(data?.recentOrders || [
                  { id: 'ORD-2026-1058', name: 'Rahul Mehta', status: 'In Progress', style: 'bg-blue-50 text-blue-600' },
                  { id: 'ORD-2026-1057', name: 'Neha Sharma', status: 'Pending', style: 'bg-amber-50 text-amber-700' },
                  { id: 'ORD-2026-1056', name: 'Sanjay Verma', status: 'Quality Check', style: 'bg-purple-50 text-purple-700' },
                  { id: 'ORD-2026-1055', name: 'Priya Singh', status: 'Delivered', style: 'bg-emerald-50 text-emerald-700' },
                ]).map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/50">
                    <td className="py-2.5 font-mono text-stone-500 font-medium">{row.id}</td>
                    <td className="py-2.5 font-bold text-stone-900">{row.name}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${row.style}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 2: Top Selling Categories */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900">Top Selling Categories</h3>
            <div className="relative">
              <select
                value={topCategoriesPeriod}
                onChange={(e) => setTopCategoriesPeriod(e.target.value)}
                className="appearance-none bg-white border border-stone-200 text-stone-700 text-[11px] font-semibold rounded-lg px-2.5 py-1 pr-6 focus:outline-hidden focus:border-[#b01622] cursor-pointer"
              >
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
              </select>
              <i className="fa-solid fa-chevron-down text-[8px] text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                  <th className="pb-2">Category</th>
                  <th className="pb-2 text-right">Sales (₹)</th>
                  <th className="pb-2 text-right">Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {topCatData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/50">
                    <td className="py-2.5 font-bold text-stone-900 flex items-center gap-1.5">
                      <span>{row.icon}</span>
                      <span>{row.name}</span>
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-stone-900">{row.sales}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">{row.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 3: Action Requires */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900">Action Requires</h3>
            <div className="relative">
              <select
                value={actionRequiresPeriod}
                onChange={(e) => setActionRequiresPeriod(e.target.value)}
                className="appearance-none bg-white border border-stone-200 text-stone-700 text-[11px] font-semibold rounded-lg px-2.5 py-1 pr-6 focus:outline-hidden focus:border-[#b01622] cursor-pointer"
              >
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
              </select>
              <i className="fa-solid fa-chevron-down text-[8px] text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                  <th className="pb-2">Category</th>
                  <th className="pb-2 text-right">Sales (₹)</th>
                  <th className="pb-2 text-right">Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {actionReqData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/50">
                    <td className="py-2.5 font-bold text-stone-900 flex items-center gap-1.5">
                      <span>{row.icon}</span>
                      <span>{row.name}</span>
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-stone-900">{row.sales}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">{row.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                      <tr key={wo.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-2.5 px-3.5 font-mono font-bold text-[#b01622] whitespace-nowrap">
                          {wo.work_order_number}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-gray-900 truncate max-w-[140px]" title={wo.product_name || wo.item_type}>
                          {wo.product_name || wo.item_type || wo.product?.name || '22K Gold Antique Bangle'}
                        </td>
                        <td className="py-2.5 px-3 text-stone-700 whitespace-nowrap font-medium">
                          {wo.karigar_name || wo.artisan_name || wo.karigar?.name || 'Manikandan'}
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

          <div className="p-3 bg-stone-50 border-t border-stone-100 flex items-center justify-end text-xs text-stone-500">
            <Link to="/job-order/receive" className="font-bold text-[#b01622] hover:underline">
              Open Receiver Work &rarr;
            </Link>
          </div>
        </div>

        {/* Right (1 Column): TOTAL MATERIALS ALLOCATED */}
        {(() => {
          const liveList = jobStats.live_jobs || [];
          const sumAllotted = liveList.reduce((acc, wo) => acc + Number(wo.allotted_weight || 0), 0);
          const sumPending = liveList.reduce((acc, wo) => acc + Number(wo.pending_weight || 0), 0);

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
            liveList.length
          );
          const goldWeightVal = Number(
            jobStats.summary?.gold_weight ?? (allocatedWeightVal > 0 ? allocatedWeightVal : 125.447)
          );
          const silverWeightVal = Number(jobStats.summary?.silver_weight ?? 0);
          const diamondWeightVal = Number(jobStats.summary?.diamond_weight ?? 0);

          return (
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
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(15, (goldWeightVal / (allocatedWeightVal || 1)) * 100))}%` }}
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
                        className="h-full bg-stone-400 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, (silverWeightVal / (allocatedWeightVal || 1)) * 100))}%` }}
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
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: diamondWeightVal > 0 ? '45%' : '0%' }}
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
              className="bg-white rounded-xl border border-[#eceff3] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-3 flex flex-col justify-between hover:border-gray-300 transition-colors"
            >
              <div>
                {/* Image Box */}
                <div className="relative h-32 rounded-lg overflow-hidden bg-stone-100 mb-3">
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
                  Artisan: {card.karigar_name || card.artisan_name || 'Rajesh Varma'}
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
      </div>

    </div>
  );
}
