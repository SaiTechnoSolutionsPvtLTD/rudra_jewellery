import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import MaterialAllocationModal from '../components/MaterialAllocationModal';
import BenchMetalModal from '../components/BenchMetalModal';

const resolveItemImage = (item) => {
  const raw = item?.image_url || item?.product?.image_url || item?.product?.image || item?.image;
  if (!raw) return '/images/placeholder-jewelry.svg';
  if (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('/images/')) return raw;
  if (raw.startsWith('/storage/')) return raw;
  if (raw.startsWith('storage/')) return `/${raw}`;
  if (raw.startsWith('products/')) return `/storage/${raw}`;
  if (raw.startsWith('/')) return raw;
  return `/storage/${raw}`;
};

const formatINR = (val) => {
  const num = Number(val || 0);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function Dashboard() {
  const { showPrompt, showConfirm, showToast } = useToast();

  // Modal states for Allocated Materials and Bench Metal
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isBenchModalOpen, setIsBenchModalOpen] = useState(false);
  const [karigarsList, setKarigarsList] = useState([]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [timeRange, setTimeRange] = useState('Month');
  const [isFetchingPeriod, setIsFetchingPeriod] = useState(false);
  const [salesOverviewPeriod, setSalesOverviewPeriod] = useState('This Month');
  const [goldValuesPeriod, setGoldValuesPeriod] = useState('This Month');
  const [topCategoriesPeriod, setTopCategoriesPeriod] = useState('This Month');
  const [actionRequiresPeriod, setActionRequiresPeriod] = useState('This Month');
  const [activePoint, setActivePoint] = useState(null);

  // Pagination for Live Job Creation Status Table
  const [liveJobsPage, setLiveJobsPage] = useState(1);
  const itemsPerPage = 10;

  const handleGlobalTimeRangeChange = (newPeriod) => {
    setTimeRange(newPeriod);
    setSalesOverviewPeriod(newPeriod);
    setGoldValuesPeriod(newPeriod);
    setTopCategoriesPeriod(newPeriod);
    setActionRequiresPeriod(newPeriod);
    setLiveJobsPage(1);
    fetchDashboardData(newPeriod);
    fetchJobStats(newPeriod);
  };


  // Live Job Order & Approval Cards State
  const [jobStats, setJobStats] = useState({
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
  });

  const [jobsLoading, setJobsLoading] = useState(true);

  const [approvingId, setApprovingId] = useState(null);
  const [liveRates, setLiveRates] = useState(null);


  const fetchLiveMetalRates = async () => {
    try {
      const res = await api.get('/metal-rates');
      if (res.data) setLiveRates(res.data);
    } catch (e) {
      console.error('Failed to fetch metal rates in dashboard:', e);
    }
  };

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
    try {
      localStorage.removeItem('rudhra_dashboard_data');
      localStorage.removeItem('rudhra_job_stats');
    } catch (e) { }

    fetchDashboardData();
    fetchJobStats();
    fetchKarigars();
    fetchLiveMetalRates();

    const handleSync = (e) => {
      if (e?.detail) setLiveRates((prev) => ({ ...prev, ...e.detail }));
      fetchLiveMetalRates();
    };

    const handleDataSync = () => {
      fetchDashboardData();
      fetchJobStats();
    };

    window.addEventListener('rudhra_metal_rates_updated', handleSync);
    window.addEventListener('rudhra_price_list_updated', handleSync);
    window.addEventListener('rudhra_invoices_updated', handleDataSync);
    window.addEventListener('rudhra_workorder_updated', handleDataSync);
    window.addEventListener('rudhra_purchase_updated', handleDataSync);
    window.addEventListener('rudhra_inventory_updated', handleDataSync);
    return () => {
      window.removeEventListener('rudhra_metal_rates_updated', handleSync);
      window.removeEventListener('rudhra_price_list_updated', handleSync);
      window.removeEventListener('rudhra_invoices_updated', handleDataSync);
      window.removeEventListener('rudhra_workorder_updated', handleDataSync);
      window.removeEventListener('rudhra_purchase_updated', handleDataSync);
      window.removeEventListener('rudhra_inventory_updated', handleDataSync);
    };
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

  const fetchJobStats = async (overridePeriod) => {
    const p = overridePeriod || timeRange;
    try {
      const res = await api.get('/work-orders/dashboard-stats', {
        params: { range: p, period: p, per_page: 100 }
      });
      if (res.data?.status === 'success' || res.data?.summary || res.data?.data) {
        const payload = res.data.data || res.data.summary || res.data;
        const newStats = {
          summary: payload,
          live_jobs: res.data.live_jobs || payload.live_jobs || [],
          approval_cards: res.data.approval_cards || payload.approval_cards || [],
        };
        setJobStats(newStats);
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

  const fetchDashboardData = async (overridePeriod, forceRefresh = false) => {
    const p = overridePeriod || timeRange;
    setIsFetchingPeriod(true);
    try {
      const params = { period: p };
      if (forceRefresh) params.refresh = 1;
      const res = await api.get('/dashboard', { params });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsFetchingPeriod(false);
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-80 text-stone-400 font-['Inter',sans-serif]">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622] mr-3"></i>
        <span className="text-xs font-semibold">Loading Rudra Jewellery Executive Dashboard...</span>
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
        { date: 'Start', val: 0, label: '₹0' },
        { date: 'Today', val: 0, label: '₹0' },
      ];
    }

    const maxValRaw = Math.max(...pts.map(p => Number(p.val || 0)), 0);
    const maxChartVal = maxValRaw > 0 ? maxValRaw * 1.25 : 0;
    const totalSalesVal = data?.summary?.todaysSaleRaw || data?.summary?.totalSalesRaw || 0;
    const rawOrders = data?.summary?.ordersFormatted ?? data?.summary?.totalOrders ?? data?.summary?.ordersCount ?? 0;
    const totalOrdersVal = parseInt(String(rawOrders).replace(/[^0-9]/g, '') || '0', 10);
    const computedAvgOrder = totalOrdersVal > 0 ? Math.round(totalSalesVal / totalOrdersVal) : 0;

    let yAxisLabels = [];
    if (maxChartVal <= 0) {
      yAxisLabels = [
        { label: '', val: 0 },
        { label: '', val: 0 },
        { label: '', val: 0 },
        { label: '₹0', val: 0 },
      ];
    } else if (maxChartVal >= 100000) {
      yAxisLabels = [
        { label: `₹${(maxChartVal / 100000).toFixed(1)}L`, val: maxChartVal },
        { label: `₹${((maxChartVal * 0.66) / 100000).toFixed(1)}L`, val: maxChartVal * 0.66 },
        { label: `₹${((maxChartVal * 0.33) / 100000).toFixed(1)}L`, val: maxChartVal * 0.33 },
        { label: '₹0', val: 0 },
      ];
    } else if (maxChartVal >= 1000) {
      yAxisLabels = [
        { label: `₹${(maxChartVal / 1000).toFixed(0)}K`, val: maxChartVal },
        { label: `₹${((maxChartVal * 0.66) / 1000).toFixed(0)}K`, val: maxChartVal * 0.66 },
        { label: `₹${((maxChartVal * 0.33) / 1000).toFixed(0)}K`, val: maxChartVal * 0.33 },
        { label: '₹0', val: 0 },
      ];
    } else {
      yAxisLabels = [
        { label: `₹${Math.round(maxChartVal)}`, val: maxChartVal },
        { label: `₹${Math.round(maxChartVal * 0.66)}`, val: maxChartVal * 0.66 },
        { label: `₹${Math.round(maxChartVal * 0.33)}`, val: maxChartVal * 0.33 },
        { label: '₹0', val: 0 },
      ];
    }

    return {
      points: pts,
      maxVal: maxChartVal,
      yAxisLabels,
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
    const y = maxVal > 0 ? chartHeight - 32 - (p.val / maxVal) * (chartHeight - 55) : chartHeight - 32;
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

  // Dynamic Average Gold Values based on transaction data for selected period
  const getGoldValuesData = (period) => {
    const p = (period || 'Month').toLowerCase();
    const vsLabel = p.includes('today') ? 'vs Yesterday' : (p.includes('week') ? 'vs Last Week' : (p.includes('quarter') ? 'vs Last Quarter' : (p.includes('year') ? 'vs Last Year' : (p.includes('all') ? 'All Time' : 'vs Last Month'))));
    const key = p.includes('today') ? 'today' : (p.includes('week') ? 'week' : (p.includes('quarter') ? 'quarter' : (p.includes('year') ? 'year' : (p.includes('all') ? 'all' : 'month'))));
    const gObj = data?.summary?.currentGoldAverage || data?.summary?.goldAverages?.[key];

    if (gObj) {
      return {
        buyingVal: gObj.buyingVal ?? '0',
        buyingChange: gObj.buyingChange ?? 'N/A',
        buyingVs: gObj.buyingVs || vsLabel,
        prevBuyingVal: gObj.prevBuyingVal ?? 'N/A',
        buyingDiff: gObj.buyingDiff ?? 'N/A',
        buyingDirection: gObj.buyingDirection || 'na',
        buyingIsIncrease: gObj.buyingIsIncrease,
        hasBuyingData: Boolean(gObj.hasBuyingData),

        sellingVal: gObj.sellingVal ?? '0',
        sellingChange: gObj.sellingChange ?? 'N/A',
        sellingVs: gObj.sellingVs || vsLabel,
        prevSellingVal: gObj.prevSellingVal ?? 'N/A',
        sellingDiff: gObj.sellingDiff ?? 'N/A',
        sellingDirection: gObj.sellingDirection || 'na',
        sellingIsIncrease: gObj.sellingIsIncrease,
        hasSellingData: Boolean(gObj.hasSellingData),

        unit: gObj.unit || 'g',
      };
    }
    return {
      buyingVal: '0',
      buyingChange: 'N/A',
      buyingVs: vsLabel,
      prevBuyingVal: 'N/A',
      buyingDiff: 'N/A',
      buyingDirection: 'na',
      buyingIsIncrease: null,
      hasBuyingData: false,

      sellingVal: '0',
      sellingChange: 'N/A',
      sellingVs: vsLabel,
      prevSellingVal: 'N/A',
      sellingDiff: 'N/A',
      sellingDirection: 'na',
      sellingIsIncrease: null,
      hasSellingData: false,

      unit: 'g',
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

      {/* 2. Section 1: Quick Points 6 Stat Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 transition-all duration-200 ${isFetchingPeriod ? 'opacity-40 animate-pulse pointer-events-none' : 'opacity-100'}`}>

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
              {data?.summary?.ordersFormatted ?? (data?.summary?.totalOrders !== undefined ? String(data?.summary?.totalOrders) : '0')}
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

        {/* Card 3: Inventory Products */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8.5 h-8.5 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-store"></i>
              </div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight truncate">Inventory Products (Total Stock)</span>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <div className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
                {data?.summary?.inventoryProductsFormatted ?? (data?.summary?.inventoryProductsCount !== undefined ? String(data?.summary?.inventoryProductsCount) : (data?.summary?.inventoryValueFormatted || '0'))}
              </div>
              <span className="text-[10px] font-bold text-stone-400 uppercase">Units</span>
            </div>
          </div>
          {(() => {
            const m = data?.summary?.inventory_products_metric || data?.summary?.inventory_metric || { change: '+0.0%', is_increase: true, vs_label: 'vs Last Month' };
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
                const totalSteps = Math.max(1, salesData.yAxisLabels.length - 1);
                const ratio = maxVal > 0 ? (g.val / maxVal) : (totalSteps - idx) / totalSteps;
                const y = chartHeight - 32 - ratio * (chartHeight - 55);
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
                    {g.label ? (
                      <text x="44" y={y + 3} textAnchor="end" className="text-[9px] fill-stone-400 font-medium font-mono">
                        {g.label}
                      </text>
                    ) : null}
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

        {/* Right: Average Gold Values (5 cols) - Matching Image 2 */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/80 shadow-2xs flex flex-col justify-between space-y-4 h-full">
          {/* Header */}
          <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Average Gold Values</h3>
            <span className="text-[10px] font-semibold text-stone-500 bg-stone-100/80 px-2 py-0.5 rounded-md border border-stone-200/60">
              Transaction Avg
            </span>
          </div>

          {/* Average Gold Values Cards matching Image 2 with Green & Red themes */}
          <div className="space-y-4 my-auto">
            {/* Avg Buying Value Box - Green Theme */}
            <div className="bg-emerald-50/40 hover:bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-colors shadow-2xs">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base shrink-0 shadow-2xs ${
                  goldData.buyingDirection === 'up'
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                    : goldData.buyingDirection === 'down'
                    ? 'bg-rose-500 text-white shadow-rose-500/20'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200/80'
                }`}>
                  <i className={`fa-solid ${
                    goldData.buyingDirection === 'up'
                      ? 'fa-arrow-trend-up'
                      : goldData.buyingDirection === 'down'
                      ? 'fa-arrow-trend-down'
                      : 'fa-coins'
                  }`}></i>
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold text-emerald-950 block mb-0.5">Avg Buying Value</span>
                  <div className="text-xl sm:text-2xl font-bold text-stone-900 font-mono tracking-tight flex items-baseline gap-1">
                    <span>₹ {goldData.buyingVal}</span>
                    <span className="text-xs font-semibold text-emerald-700">/</span>
                    <span className="text-xs font-semibold text-emerald-700">{goldData.unit || 'g'}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-sm sm:text-base font-bold flex items-center justify-end gap-1 ${
                  goldData.buyingDirection === 'up'
                    ? 'text-emerald-700'
                    : goldData.buyingDirection === 'down'
                    ? 'text-rose-600'
                    : 'text-emerald-700/80'
                }`}>
                  {goldData.buyingDirection === 'up' && <i className="fa-solid fa-arrow-up text-xs"></i>}
                  {goldData.buyingDirection === 'down' && <i className="fa-solid fa-arrow-down text-xs"></i>}
                  {goldData.buyingDirection === 'flat' && <i className="fa-solid fa-minus text-xs"></i>}
                  <span>{goldData.buyingChange?.replace('+', '').trim() || 'N/A'}</span>
                </div>
                <div className="text-xs text-stone-500 font-medium mt-0.5">
                  {goldData.buyingVs}
                </div>
                <div className="text-[10px] text-stone-400 font-medium mt-0.5" title="Previous period average and absolute difference">
                  Prev: {goldData.prevBuyingVal !== 'N/A' ? `₹${goldData.prevBuyingVal}` : 'N/A'} • Diff: {goldData.buyingDiff || 'N/A'}
                </div>
              </div>
            </div>

            {/* Avg Selling Value Box - Red Theme */}
            <div className="bg-rose-50/40 hover:bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-colors shadow-2xs">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base shrink-0 shadow-2xs ${
                  goldData.sellingDirection === 'up'
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                    : goldData.sellingDirection === 'down'
                    ? 'bg-rose-500 text-white shadow-rose-500/20'
                    : 'bg-rose-100 text-rose-700 border border-rose-200/80'
                }`}>
                  <i className={`fa-solid ${
                    goldData.sellingDirection === 'up'
                      ? 'fa-arrow-trend-up'
                      : goldData.sellingDirection === 'down'
                      ? 'fa-arrow-trend-down'
                      : 'fa-coins'
                  }`}></i>
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold text-rose-950 block mb-0.5">Avg Selling Value</span>
                  <div className="text-xl sm:text-2xl font-bold text-stone-900 font-mono tracking-tight flex items-baseline gap-1">
                    <span>₹ {goldData.sellingVal}</span>
                    <span className="text-xs font-semibold text-rose-700">/</span>
                    <span className="text-xs font-semibold text-rose-700">{goldData.unit || 'g'}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-sm sm:text-base font-bold flex items-center justify-end gap-1 ${
                  goldData.sellingDirection === 'up'
                    ? 'text-emerald-700'
                    : goldData.sellingDirection === 'down'
                    ? 'text-rose-600'
                    : 'text-rose-700/80'
                }`}>
                  {goldData.sellingDirection === 'up' && <i className="fa-solid fa-arrow-up text-xs"></i>}
                  {goldData.sellingDirection === 'down' && <i className="fa-solid fa-arrow-down text-xs"></i>}
                  {goldData.sellingDirection === 'flat' && <i className="fa-solid fa-minus text-xs"></i>}
                  <span>{goldData.sellingChange?.replace('+', '').trim() || 'N/A'}</span>
                </div>
                <div className="text-xs text-stone-500 font-medium mt-0.5">
                  {goldData.sellingVs}
                </div>
                <div className="text-[10px] text-stone-400 font-medium mt-0.5" title="Previous period average and absolute difference">
                  Prev: {goldData.prevSellingVal !== 'N/A' ? `₹${goldData.prevSellingVal}` : 'N/A'} • Diff: {goldData.sellingDiff || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Section 3: Bottom Row (3 Columns - Equal Size Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">

        {/* Column 1: Recent Orders */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
              <h3 className="text-base font-bold text-stone-900 tracking-tight">Recent Orders</h3>
              <Link to="/job-order" className="text-xs font-bold text-[#b01622] hover:underline">
                View All
              </Link>
            </div>

            <div className="w-full">
              <table className="w-full text-left border-collapse text-xs align-top table-fixed">
                <thead>
                  <tr className="text-[11px] font-semibold text-stone-400 border-b border-stone-100">
                    <th className="pb-3 text-stone-400 font-semibold w-10 text-center">S.No</th>
                    <th className="pb-3 text-stone-400 font-semibold w-[30%] pr-2">Order ID</th>
                    <th className="pb-3 text-stone-400 font-semibold w-[34%] pr-2">Customer</th>
                    <th className="pb-3 text-stone-400 font-semibold text-right w-[26%]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data?.recentOrders && data.recentOrders.length > 0 ? (
                    data.recentOrders.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-3 text-center font-mono text-stone-400 text-xs">{idx + 1}</td>
                        <td className="py-3 font-mono text-stone-700 font-bold text-xs truncate pr-2" title={row.id}>{row.id}</td>
                        <td className="py-3 font-semibold text-stone-900 text-xs truncate pr-2" title={row.name}>{row.name}</td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold whitespace-nowrap ${row.style}`}>
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
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
              <h3 className="text-base font-bold text-stone-900 tracking-tight">Top Selling Categories</h3>
            </div>

            <div className="w-full">
              <table className="w-full text-left border-collapse text-xs align-top table-fixed">
                <thead>
                  <tr className="text-[11px] font-semibold text-stone-400 border-b border-stone-100">
                    <th className="pb-3 text-stone-400 font-semibold w-10 text-center">S.No</th>
                    <th className="pb-3 text-stone-400 font-semibold w-[38%] pr-1">Category</th>
                    <th className="pb-3 text-stone-400 font-semibold text-right w-[28%] pr-1">Sales (₹)</th>
                    <th className="pb-3 text-stone-400 font-semibold text-right w-[24%]">Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {topCatData && topCatData.length > 0 ? (
                    topCatData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-2.5 text-center font-mono text-stone-400 text-xs">{idx + 1}</td>
                        <td className="py-2.5 font-semibold text-stone-900 text-xs truncate pr-1" title={row.name}>
                          <span className="inline-flex items-center gap-1.5 truncate max-w-full">
                            <span className="text-sm shrink-0">{row.icon}</span>
                            <span className="truncate">{row.name}</span>
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-stone-900 text-xs truncate pr-1" title={row.sales}>{row.sales}</td>
                        <td className={`py-2.5 text-right font-bold text-xs truncate ${row.is_increase === false ? 'text-rose-600' : 'text-[#16a34a]'}`} title={row.growth}>{row.growth}</td>
                      </tr>
                    ))
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {(!topCatData || topCatData.length === 0) && (
            <div className="py-8 flex flex-col items-center justify-center text-stone-400 font-medium my-auto space-y-2">
              <i className="fa-solid fa-chart-pie text-2xl text-stone-300"></i>
              <span className="text-xs font-semibold">No sales data available</span>
            </div>
          )}
        </div>

        {/* Column 3: Action Required */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
              <h3 className="text-base font-bold text-stone-900 tracking-tight">Action Requires</h3>
            </div>

            <div className="w-full">
              <table className="w-full text-left border-collapse text-xs align-top table-fixed">
                <thead>
                  <tr className="text-[11px] font-semibold text-stone-400 border-b border-stone-100">
                    <th className="pb-3 text-stone-400 font-semibold w-10 text-center">S.No</th>
                    <th className="pb-3 text-stone-400 font-semibold w-[38%] pr-1">Category</th>
                    <th className="pb-3 text-stone-400 font-semibold text-right w-[28%] pr-1">Sales (₹)</th>
                    <th className="pb-3 text-stone-400 font-semibold text-right w-[24%]">Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {actionReqData && actionReqData.length > 0 ? (
                    actionReqData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-2.5 text-center font-mono text-stone-400 text-xs">{idx + 1}</td>
                        <td className="py-2.5 font-semibold text-stone-900 text-xs truncate pr-1" title={row.name}>
                          <span className="inline-flex items-center gap-1.5 truncate max-w-full">
                            <span className="text-sm shrink-0">{row.icon}</span>
                            <span className="truncate">{row.name}</span>
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-stone-900 text-xs truncate pr-1" title={row.sales}>{row.sales}</td>
                        <td className={`py-2.5 text-right font-bold text-xs truncate ${row.is_increase === false ? 'text-rose-600' : 'text-[#16a34a]'}`} title={row.growth}>{row.growth}</td>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 items-stretch">
        {/* Left (2 Columns): LIVE JOB CREATION STATUS TABLE */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden flex flex-col justify-between h-full">
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
                to="/job-order"
                className="text-xs font-bold text-[#b01622] hover:underline flex items-center gap-1"
              >
                <span>View All Jobs</span>
                <i className="fa-solid fa-arrow-right text-[10px]"></i>
              </Link>
            </div>

            <div className="overflow-x-auto custom-scrollbar flex-1 flex flex-col justify-between">
              <table className="w-full text-left text-xs border-collapse min-w-[720px] my-auto">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50/60 text-stone-600 font-semibold text-[11px]">
                    <th className="py-3 px-3 text-center w-12 whitespace-nowrap">S.NO</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">WORK ORDER NO</th>
                    <th className="py-3 px-3 whitespace-nowrap">Product</th>
                    <th className="py-3 px-3 whitespace-nowrap">Aachari</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Allotted Wt</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Completed Wt</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Pending Wt</th>
                    <th className="py-3 px-3 whitespace-nowrap">Stage</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {jobsLoading && jobStats.live_jobs.length === 0 ? (
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <tr key={n} className="animate-pulse">
                        <td className="py-4 px-3 text-center"><div className="h-3.5 bg-stone-200/80 rounded w-6 mx-auto"></div></td>
                        <td className="py-4 px-3.5"><div className="h-3.5 bg-stone-200/80 rounded w-24"></div></td>
                        <td className="py-4 px-3"><div className="h-3.5 bg-stone-200/80 rounded w-28"></div></td>
                        <td className="py-4 px-3"><div className="h-3.5 bg-stone-200/80 rounded w-20"></div></td>
                        <td className="py-4 px-3 text-right"><div className="h-3.5 bg-stone-200/80 rounded w-14 ml-auto"></div></td>
                        <td className="py-4 px-3 text-right"><div className="h-3.5 bg-stone-200/80 rounded w-14 ml-auto"></div></td>
                        <td className="py-4 px-3 text-right"><div className="h-3.5 bg-stone-200/80 rounded w-14 ml-auto"></div></td>
                        <td className="py-4 px-3"><div className="h-3.5 bg-stone-200/80 rounded w-16"></div></td>
                        <td className="py-4 px-3 text-center"><div className="h-3.5 bg-stone-200/80 rounded-full w-14 mx-auto"></div></td>
                      </tr>
                    ))
                  ) : jobStats.live_jobs.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-stone-400 font-medium">
                        No active live jobs found.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const totalLive = jobStats.live_jobs.length;
                      const paginatedJobs = jobStats.live_jobs.slice((liveJobsPage - 1) * itemsPerPage, liveJobsPage * itemsPerPage);

                      return paginatedJobs.map((wo, idx) => {
                        const rowNum = (liveJobsPage - 1) * itemsPerPage + idx + 1;
                        return (
                          <tr
                            key={wo.id}
                            onClick={() => navigate('/job-order')}
                            className="hover:bg-stone-50/60 transition-colors cursor-pointer group"
                          >
                            <td className="py-4 px-3 text-center font-mono text-stone-400 font-medium whitespace-nowrap">
                              {rowNum}
                            </td>
                            <td className="py-4 px-3.5 font-mono font-bold text-[#b01622] group-hover:underline whitespace-nowrap">
                              {wo.work_order_number}
                            </td>
                            <td className="py-4 px-3 font-bold text-gray-900 truncate max-w-[140px]" title={wo.product_name || wo.item_type}>
                              {wo.product_name || wo.item_type || wo.product?.name || '-'}
                            </td>
                            <td className="py-4 px-3 text-stone-700 whitespace-nowrap font-medium truncate max-w-[130px]" title={wo.karigar_name || wo.artisan_name || wo.karigar?.name}>
                              {wo.karigar_name || wo.artisan_name || wo.karigar?.name || '-'}
                            </td>
                            <td className="py-4 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                              {Number(wo.allotted_weight).toFixed(3)}g
                            </td>
                            <td className="py-4 px-3 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                              {Number(wo.completed_weight).toFixed(3)}g
                            </td>
                            <td className="py-4 px-3 text-right font-mono font-bold text-[#b01622] whitespace-nowrap">
                              {Number(wo.pending_weight).toFixed(3)}g
                            </td>
                            <td className="py-4 px-3 whitespace-nowrap">
                              <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                                {wo.current_stage ? wo.current_stage.replace(/_/g, ' ') : 'Created'}
                              </span>
                            </td>
                            <td className="py-4 px-3 text-center whitespace-nowrap">
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
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Footer with Pagination Controls */}
          {(() => {
            const totalLive = jobStats.live_jobs.length;
            const totalLivePages = Math.ceil(totalLive / itemsPerPage) || 1;
            const startItem = totalLive > 0 ? (liveJobsPage - 1) * itemsPerPage + 1 : 0;
            const endItem = Math.min(liveJobsPage * itemsPerPage, totalLive);

            return (
              <div className="p-3.5 bg-stone-50/80 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-stone-500 font-medium">
                  Showing <span className="font-bold text-stone-800">{startItem}</span> to{' '}
                  <span className="font-bold text-stone-800">{endItem}</span> of{' '}
                  <span className="font-bold text-stone-800">{totalLive}</span> active jobs
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={liveJobsPage === 1}
                      onClick={() => setLiveJobsPage(p => Math.max(1, p - 1))}
                      className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <svg className="w-2.5 h-2.5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>Prev</span>
                    </button>

                    <span className="text-xs font-bold text-stone-700 px-2">
                      {liveJobsPage} / {totalLivePages}
                    </span>

                    <button
                      type="button"
                      disabled={liveJobsPage >= totalLivePages}
                      onClick={() => setLiveJobsPage(p => Math.min(totalLivePages, p + 1))}
                      className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <span>Next</span>
                      <svg className="w-2.5 h-2.5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <Link to="/job-order/receive" className="font-bold text-[#b01622] hover:underline border-l border-stone-200 pl-3">
                    Open Receiver Work &rarr;
                  </Link>
                </div>
              </div>
            );
          })()}
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

          // Fine Gold 24K Pure equivalent (converting 22K: 22/24, 18K: 18/24, etc.)
          const fineGoldAllocatedVal = Number(
            jobStats.summary?.fine_gold_weight ??
            activeList.reduce((acc, j) => acc + (j.fine_weight || (Number(j.allotted_weight || 0) * (22 / 24))), 0)
          );
          const fineGoldPendingVal = Number(
            jobStats.summary?.fine_gold_pending_weight ??
            activeList.reduce((acc, j) => acc + (j.fine_pending_weight || (Number(j.pending_weight || 0) * (22 / 24))), 0)
          );

          // Dynamic calculation per material if jobStats values aren't explicitly non-zero
          const calcGoldFromJobs = activeList.filter(j => {
            const m = (j.material || j.material_type || '').toLowerCase();
            return !m.includes('silver') && !m.includes('diamond');
          }).reduce((acc, j) => acc + Number(j.allotted_weight || 0), 0);

          const calcSilverFromJobs = activeList.filter(j => {
            const m = (j.material || j.material_type || '').toLowerCase();
            return m.includes('silver');
          }).reduce((acc, j) => acc + Number(j.allotted_weight || 0), 0);

          const calcDiamondFromJobs = activeList.reduce((acc, j) => {
            const dia = Number(j.diamond_allotted || (String(j.material || j.material_type || '').toLowerCase().includes('diamond') ? j.allotted_weight : 0));
            return acc + Math.max(0, dia);
          }, 0);

          const diamondPiecesVal = Number(
            jobStats.summary?.diamond_pieces ??
            activeList.reduce((acc, j) => acc + Number(j.diamond_count || 0), 0)
          );
          const diamondPiecesPendingVal = Number(
            jobStats.summary?.diamond_pieces_pending ??
            activeList.reduce((acc, j) => acc + Number(j.diamond_pending_count || j.diamond_count || 0), 0)
          );

          // Artisan Total Cash Balances
          const totalCashBalanceVal = Number(
            jobStats.summary?.total_karigar_cash_balance ??
            karigarsList.reduce((acc, k) => acc + Number(k.cash_balance || 0), 0)
          );

          const goldWeightVal = jobStats.summary?.gold_weight !== undefined && jobStats.summary?.gold_weight !== null ? Number(jobStats.summary.gold_weight) : calcGoldFromJobs;
          const silverWeightVal = jobStats.summary?.silver_weight !== undefined && jobStats.summary?.silver_weight !== null ? Number(jobStats.summary.silver_weight) : calcSilverFromJobs;
          const diamondWeightVal = jobStats.summary?.diamond_weight !== undefined && jobStats.summary?.diamond_weight !== null ? Number(jobStats.summary.diamond_weight) : calcDiamondFromJobs;

          // Multi-Material Bench Metal calculation across Karigars & Active Jobs
          const sumBaseKarigarGold = karigarsList.reduce((acc, k) => acc + Number(k.current_gold_balance_grams || 0), 0);
          
          const goldPendingFromJobs = activeList.filter(j => {
            const m = (j.material || j.material_type || '').toLowerCase();
            return !m.includes('silver') && !m.includes('diamond');
          }).reduce((acc, j) => acc + Number(j.pending_weight || 0), 0);

          const silverPendingFromJobs = activeList.filter(j => {
            const m = (j.material || j.material_type || '').toLowerCase();
            return m.includes('silver');
          }).reduce((acc, j) => acc + Number(j.pending_weight || 0), 0);

          const diamondPendingFromJobs = activeList.reduce((acc, j) => {
            const diaPending = j.diamond_pending != null
              ? Number(j.diamond_pending)
              : Math.max(0, Number(j.diamond_allotted || (String(j.material || j.material_type || '').toLowerCase().includes('diamond') ? j.allotted_weight : 0)) - Number(j.diamond_received || 0));
            return acc + Math.max(0, diaPending);
          }, 0);

          const benchGoldVal = goldPendingFromJobs > 0 ? goldPendingFromJobs : sumBaseKarigarGold;
          const benchSilverVal = silverPendingFromJobs;
          const benchDiamondVal = diamondPendingFromJobs > 0
            ? diamondPendingFromJobs
            : Number(jobStats.summary?.diamond_pending ?? jobStats.summary?.diamond_weight ?? 0);

          return (
            <div className="flex flex-col gap-4">
              {/* CARD 1: TOTAL MATERIALS ALLOCATED */}
              <div
                onClick={() => setIsMaterialModalOpen(true)}
                className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-5 flex flex-col justify-between hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
                title="Click to open pop-up displaying material allocation per karigar"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 group-hover:text-[#b01622] transition-colors">
                      <span>Total Materials Allocated</span>
                      <i className="fa-solid fa-up-right-from-square text-[10px] text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      Active Vault
                    </span>
                  </div>

                  {/* Total Allocated Banner */}
                  <div className="bg-gradient-to-br from-red-50/60 to-amber-50/60 rounded-2xl p-4 border border-red-100 mb-3.5">
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-tight">TOTAL ALLOTTED GROSS WEIGHT</div>
                    <div className="text-2xl font-black text-gray-900 font-mono tracking-tight mt-0.5">
                      {allocatedWeightVal.toFixed(3)} <span className="text-xs font-sans font-bold text-stone-500">grams</span>
                    </div>
                    {/* Converted Pure 24K Fine Gold Badge */}
                    <div className="mt-2 pt-2 border-t border-red-200/60 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-900 flex items-center gap-1">
                        <i className="fa-solid fa-gem text-amber-600 text-[10px]"></i>
                        <span>Pure 24K Fine Gold:</span>
                      </span>
                      <span className="font-mono font-black text-amber-950 bg-amber-100/90 px-1.5 py-0.5 rounded">
                        {fineGoldAllocatedVal.toFixed(3)} g
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10.5px] text-stone-500 font-medium mt-1.5">
                      <span>Active Runs: <strong className="text-gray-900">{activeJobsCount} Jobs</strong></span>
                      <span>Pending Fine: <strong className="text-[#b01622]">{fineGoldPendingVal.toFixed(3)}g</strong></span>
                    </div>
                  </div>

                  {/* Material Breakdown Gauges */}
                  <div className="space-y-3 text-xs">
                    {/* Gold */}
                    <div>
                      <div className="flex justify-between font-semibold text-stone-700 mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>Gold (22K / 18K Allocated)</span>
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
                        <span className="font-mono font-bold text-gray-900">
                          {diamondWeightVal.toFixed(3)} ct <span className="text-[10px] text-stone-400">({diamondPiecesVal} pcs)</span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${diamondWeightVal > 0 ? Math.min(100, (diamondWeightVal / (allocatedWeightVal || 1)) * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Cash Balances Strip */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                        <i className="fa-solid fa-coins text-emerald-600"></i>
                        <span>Karigar Cash Balance:</span>
                      </span>
                      <span className="font-mono font-black text-emerald-900 text-xs">
                        {formatINR(Math.abs(totalCashBalanceVal))}
                        <span className="text-[9.5px] font-sans ml-1 text-emerald-700">({totalCashBalanceVal >= 0 ? 'Payable' : 'Advance'})</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 mt-3" onClick={(e) => e.stopPropagation()}>
                  <Link
                    to="/job-order/new"
                    className="w-full py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-plus text-xs"></i>
                    <span>Allocate New Job Order</span>
                  </Link>
                </div>
              </div>

              {/* CARD 2: METAL ON BENCH (ALL MATERIALS & CASH DISPLAYED) */}
              <div
                onClick={() => setIsBenchModalOpen(true)}
                className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-5 flex flex-col justify-between hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
                title="Click to open pop-up displaying all metals & materials on bench balance per artisan"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>METAL &amp; MATERIALS ON BENCH</span>
                      <i className="fa-solid fa-up-right-from-square text-[10px] text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                      Artisan Benches
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-1">
                    <div className="text-3xl font-black text-stone-900 font-sans tracking-tight leading-none flex items-baseline gap-1">
                      <span>{benchGoldVal.toFixed(3)}</span>
                      <span className="text-sm font-bold text-amber-700">g</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">24K Fine Equivalent</span>
                      <span className="text-sm font-black text-amber-900 font-mono">
                        {(fineGoldPendingVal > 0 ? fineGoldPendingVal : benchGoldVal * (22 / 24)).toFixed(3)}g
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-stone-500 font-medium mt-1">
                    Primary 24K / 22K gold held by working artisans
                  </div>

                  {/* All Materials & Cash 4 Pill Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-stone-100 text-xs">
                    <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-200/60 text-center">
                      <span className="text-[9px] font-bold text-amber-800 uppercase block truncate">Gold 24K Fine</span>
                      <span className="font-mono font-black text-stone-900 text-xs">{(fineGoldPendingVal > 0 ? fineGoldPendingVal : benchGoldVal * (22 / 24)).toFixed(3)}g</span>
                    </div>
                    <div className="bg-stone-100/70 p-2 rounded-xl border border-stone-200/60 text-center">
                      <span className="text-[9px] font-bold text-stone-600 uppercase block truncate">Silver 925</span>
                      <span className="font-mono font-black text-stone-900 text-xs">{benchSilverVal.toFixed(3)}g</span>
                    </div>
                    <div className="bg-blue-50/70 p-2 rounded-xl border border-blue-200/60 text-center">
                      <span className="text-[9px] font-bold text-blue-700 uppercase block truncate">Diamonds</span>
                      <span className="font-mono font-black text-stone-900 text-xs">{benchDiamondVal.toFixed(3)}ct</span>
                      <span className="text-[8.5px] text-stone-400 block font-mono">{diamondPiecesPendingVal} pcs</span>
                    </div>
                    <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-200/60 text-center">
                      <span className="text-[9px] font-bold text-emerald-800 uppercase block truncate">Artisan Cash</span>
                      <span className="font-mono font-black text-emerald-900 text-[11px] truncate block">{formatINR(totalCashBalanceVal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
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
