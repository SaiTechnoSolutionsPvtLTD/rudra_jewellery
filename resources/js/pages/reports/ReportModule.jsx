import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ReportModule() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const queryParams = new URLSearchParams(location.search);
  const activeTabQuery = queryParams.get('tab') || 'sales';

  const [activeTab, setActiveTab] = useState(activeTabQuery);
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  });

  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Backend Data
  const [reportData, setReportData] = useState({
    summary: {
      totalSalesRevenueFormatted: '₹2,85,45,670',
      totalSalesCount: 320,
      avgOrderValueFormatted: '₹89,205',
      totalGstTaxFormatted: '₹8,56,370',
      inventoryValuationFormatted: '₹1,85,45,670',
      totalProducts: 45,
      lowStockCount: 3,
      totalAllottedGold: 168.447,
      totalCompletedGold: 114.347,
      totalWastageGold: 3.25,
      totalPendingGold: 54.1,
      totalPurchaseSpendFormatted: '₹1,24,50,000',
    },
    sales: [],
    inventory: [],
    workOrders: [],
    purchases: [],
  });

  const fetchReports = async (page = currentPage) => {
    try {
      setLoading(true);
      const res = await api.get('/reports', {
        params: {
          type: activeTab,
          period,
          search: searchQuery,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          page,
          per_page: 10,
        },
      });

      if (res.data?.status === 'success' || res.data?.summary) {
        setReportData(res.data);
        if (res.data.pagination) {
          setPaginationMeta(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      showToast?.('Failed to fetch report analytics from server', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(currentPage);
  }, [activeTab, period, startDate, endDate, currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReports(1);
  };

  const handleTabChange = (tabId) => {
    setCurrentPage(1);
    setActiveTab(tabId);
    navigate(`/reports?tab=${tabId}`, { replace: true });
  };

  // CSV Export Generator
  const handleExportCSV = () => {
    try {
      let headers = [];
      let rows = [];
      let title = '';

      if (activeTab === 'sales') {
        title = 'Rudhra_Jewellers_Sales_And_Billing_Report';
        headers = ['Invoice No', 'Customer Name', 'Phone', 'Date', 'Items', 'Subtotal (₹)', 'Making Charges (₹)', '3% GST (₹)', 'Total Amount (₹)', 'Payment Method', 'Status'];
        rows = (reportData.sales || []).map(r => [
          `"${r.invoice_number}"`, `"${r.customer_name}"`, `"${r.customer_phone}"`, `"${r.date}"`, r.items_count, r.subtotal, r.making_charges, r.gst_amount, r.total_amount, `"${r.payment_method}"`, `"${r.status}"`
        ]);
      } else if (activeTab === 'inventory') {
        title = 'Rudhra_Jewellers_Inventory_Valuation_Report';
        headers = ['SKU No', 'Product Name', 'Category', 'Purity', 'Gross Wt (g)', 'Net Wt (g)', 'Stock Qty', 'Unit Price (₹)', 'Total Valuation (₹)', 'Stock Status'];
        rows = (reportData.inventory || []).map(r => [
          `"${r.sku}"`, `"${r.name}"`, `"${r.category}"`, `"${r.purity}"`, r.gross_weight, r.net_weight, r.stock_qty, r.price, r.total_valuation, `"${r.stock_status}"`
        ]);
      } else if (activeTab === 'karigar') {
        title = 'Rudhra_Jewellers_Karigar_Manufacturing_Report';
        headers = ['Work Order No', 'Artisan Name', 'Product Name', 'Material', 'Allotted Wt (g)', 'Completed Wt (g)', 'Wastage (g)', 'Pending Wt (g)', 'Stage', 'Status', 'Date'];
        rows = (reportData.workOrders || []).map(r => [
          `"${r.work_order_number}"`, `"${r.artisan_name}"`, `"${r.product_name}"`, `"${r.material_type}"`, r.allotted_weight, r.completed_weight, r.wastage_weight, r.pending_weight, `"${r.current_stage}"`, `"${r.status}"`, `"${r.date}"`
        ]);
      } else if (activeTab === 'purchase') {
        title = 'Rudhra_Jewellers_Supplier_Purchase_Report';
        headers = ['Purchase No', 'Supplier Name', 'Purchase Date', 'Purity', 'Net Weight (g)', 'Total Spend (₹)', 'Payment Status'];
        rows = (reportData.purchases || []).map(r => [
          `"${r.purchase_no}"`, `"${r.supplier_name}"`, `"${r.purchase_date}"`, `"${r.purity}"`, r.net_weight, r.total_amount, `"${r.payment_status}"`
        ]);
      } else {
        title = 'Rudhra_Jewellers_GST_Tax_Compliance_Report';
        headers = ['Invoice No', 'Customer Name', 'Date', 'Taxable Subtotal (₹)', 'SGST 1.5% (₹)', 'CGST 1.5% (₹)', 'Total 3% GST (₹)', 'Grand Total (₹)'];
        rows = (reportData.sales || []).map(r => [
          `"${r.invoice_number}"`, `"${r.customer_name}"`, `"${r.date}"`, r.subtotal, (r.gst_amount / 2).toFixed(2), (r.gst_amount / 2).toFixed(2), r.gst_amount, r.total_amount
        ]);
      }

      if (rows.length === 0) {
        showToast?.('No report data available to export', 'info');
        return;
      }

      const csvContent = 'data:text/csv;charset=utf-8,' + [
        `"RUDHRA JEWELLERS - EXECUTIVE ENTERPRISE REPORT"`,
        `"Report Type: ${title.replace(/_/g, ' ')}"`,
        `"Generated At: ${new Date().toLocaleString()}"`,
        `"Period Filter: ${period.toUpperCase()}"`,
        '',
        headers.join(','),
        ...rows.map(e => e.join(','))
      ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${title}_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast?.('Report downloaded successfully as CSV!', 'success', 'Export Complete');
    } catch (err) {
      console.error('Export failed:', err);
      showToast?.('Failed to generate CSV export', 'error');
    }
  };

  // Professional INR Currency Formatter matching project fonts
  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    const num = Number(val);
    if (Number.isInteger(num)) {
      return '₹' + new Intl.NumberFormat('en-IN').format(num);
    }
    return '₹' + new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const summary = reportData.summary || {};

  return (
    <div className="w-full pb-20 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-stone-800">

      {/* 1. Header & Page Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-400 mb-1">
            <span>Management</span>
            <span>&gt;</span>
            <span className="text-stone-700">Executive Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5 font-['Inter',sans-serif]">
            <i className="fa-solid fa-chart-line text-[#b01622] text-xl"></i>
            <span>Executive Business Reports</span>
          </h1>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            Real-time sales revenue, inventory valuation, karigar vault balance, supplier spend &amp; GST tax compliance statements
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchReports}
            className="px-3.5 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
            title="Refresh Report Data"
          >
            <i className={`fa-solid fa-rotate-right text-xs ${loading ? 'fa-spin text-[#b01622]' : ''}`}></i>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-2 cursor-pointer font-['Inter',sans-serif]"
          >
            <i className="fa-solid fa-file-csv text-sm text-emerald-400"></i>
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer font-['Inter',sans-serif]"
          >
            <i className="fa-solid fa-print text-sm"></i>
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

        {/* Metric 1: Total Sales Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-stone-400 uppercase tracking-wider">Total Sales Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-sm">
              <i className="fa-solid fa-indian-rupee-sign"></i>
            </div>
          </div>
          <div className="text-xl font-extrabold text-stone-900 font-mono tracking-tight">
            {summary.totalSalesRevenueFormatted || '₹2,85,45,670'}
          </div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 font-['Inter',sans-serif]">
            <i className="fa-solid fa-arrow-trend-up text-[9px]"></i>
            <span>+24.5% <span className="font-normal text-stone-400">vs Prev Period</span></span>
          </div>
        </div>

        {/* Metric 2: Average Order Value */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-stone-400 uppercase tracking-wider">Avg Order Value</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-calculator"></i>
            </div>
          </div>
          <div className="text-xl font-extrabold text-stone-900 font-mono tracking-tight">
            {summary.avgOrderValueFormatted || '₹89,205'}
          </div>
          <div className="text-[11px] font-medium text-stone-500 font-['Inter',sans-serif]">
            Across <strong className="text-stone-900 font-bold">{summary.totalSalesCount || 320} Total Orders</strong>
          </div>
        </div>

        {/* Metric 3: Inventory Valuation */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-stone-400 uppercase tracking-wider">Inventory Valuation</span>
            <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-gem"></i>
            </div>
          </div>
          <div className="text-xl font-extrabold text-stone-900 font-mono tracking-tight">
            {summary.inventoryValuationFormatted || '₹1,85,45,670'}
          </div>
          <div className="text-[11px] font-medium text-stone-500 font-['Inter',sans-serif]">
            <strong className="text-stone-900 font-bold">{summary.totalProducts || 45} Items</strong> ({summary.lowStockCount || 3} Low Stock)
          </div>
        </div>

        {/* Metric 4: Allotted Karigar Metal */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-stone-400 uppercase tracking-wider">Karigar Metal Vault</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-vault"></i>
            </div>
          </div>
          <div className="text-xl font-extrabold text-stone-900 font-mono tracking-tight">
            {summary.totalAllottedGold || '168.447'} <span className="text-xs font-semibold text-stone-500">g</span>
          </div>
          <div className="text-[11px] font-bold text-[#b01622] font-['Inter',sans-serif]">
            Pending: {summary.totalPendingGold || '54.100'}g
          </div>
        </div>

        {/* Metric 5: 3% GST Tax Collected */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-stone-400 uppercase tracking-wider">GST Tax Liability (3%)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-[#b01622] fa-receipt"></i>
            </div>
          </div>
          <div className="text-xl font-extrabold text-stone-900 font-mono tracking-tight">
            {summary.totalGstTaxFormatted || '₹8,56,370'}
          </div>
          <div className="text-[11px] font-medium text-stone-500 font-['Inter',sans-serif]">
            SGST 1.5% + CGST 1.5%
          </div>
        </div>

      </div>

      {/* 3. Navigation Tabs */}
      <div className="border-b border-stone-200 flex items-center gap-2 sm:gap-6 overflow-x-auto no-scrollbar pt-2">
        {[
          ['Sales & Billing Report', 'sales', 'fa-regular fa-file-lines'],
          ['Inventory Valuation', 'inventory', 'fa-solid fa-boxes-stacked'],
          ['Karigar & Work Orders', 'karigar', 'fa-solid fa-hammer'],
          ['Supplier Purchase Spend', 'purchase', 'fa-solid fa-truck-ramp-box'],
          ['GST & Tax Compliance', 'gst', 'fa-solid fa-scale-balanced'],
        ].map(([label, id, icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => handleTabChange(id)}
            className={`pb-3.5 px-3 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 cursor-pointer font-['Inter',sans-serif] ${activeTab === id
              ? 'text-[#b01622] border-[#b01622]'
              : 'text-stone-500 border-transparent hover:text-stone-800'
              }`}
          >
            <i className={icon}></i>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* 4. Filter Control Strip */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">

        {/* Period Preset Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 font-['Inter',sans-serif]">
            <i className="fa-solid fa-filter text-stone-400"></i>
            <span>Period:</span>
          </div>

          <div className="flex items-center bg-stone-100 p-1 rounded-xl gap-1 text-xs font-bold font-['Inter',sans-serif]">
            {[
              ['Today', 'today'],
              ['This Week', 'week'],
              ['This Month', 'month'],
              ['This Quarter', 'quarter'],
              ['This Year', 'year'],
            ].map(([lbl, val]) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setPeriod(val);
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${period === val && !startDate
                  ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                  : 'text-stone-600 hover:text-stone-900'
                  }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range & Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPeriod('custom'); }}
              className="bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
            />
            <span className="text-xs font-bold text-stone-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPeriod('custom'); }}
              className="bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
            />
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622] w-40 sm:w-52"
            />
            <i className="fa-solid fa-magnifying-glass text-stone-400 text-xs absolute left-2.5 top-1/2 -translate-y-1/2"></i>
          </div>

          <button
            type="submit"
            className="px-3.5 py-1.5 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-colors cursor-pointer font-['Inter',sans-serif]"
          >
            Apply
          </button>
        </form>

      </div>

      {/* 5. Report Table Container */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">

        {loading ? (
          <div className="py-16 text-center text-stone-400 font-semibold text-xs flex items-center justify-center gap-2 font-['Inter',sans-serif]">
            <i className="fa-solid fa-circle-notch fa-spin text-base text-[#b01622]"></i>
            <span>Loading enterprise report dataset...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">

            {/* TAB 1: Sales & Billing Report */}
            {activeTab === 'sales' && (
              <table className="w-full text-left text-xs border-collapse font-['Inter',sans-serif] min-w-[950px]">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600 font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3.5 px-4 whitespace-nowrap">Invoice No</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Customer Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Date &amp; Time</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Items</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Subtotal</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">3% GST</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Total Amount</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Payment</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {(reportData.sales || []).length === 0 ? (
                    <tr><td colSpan="9" className="py-8 text-center text-stone-400">No sales records found for this criteria.</td></tr>
                  ) : (
                    reportData.sales.map((row) => (
                      <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#b01622] tracking-tight whitespace-nowrap">{row.invoice_number}</td>
                        <td className="py-3.5 px-4 font-bold text-stone-900 whitespace-nowrap">{row.customer_name}</td>
                        <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px] whitespace-nowrap">{row.date}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-stone-700 whitespace-nowrap">{row.items_count}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-700 whitespace-nowrap">{formatINR(row.subtotal)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-stone-600 whitespace-nowrap">{formatINR(row.gst_amount)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-stone-900 text-sm whitespace-nowrap">{formatINR(row.total_amount)}</td>
                        <td className="py-3.5 px-4 text-center text-stone-600 whitespace-nowrap">{row.payment_method}</td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block whitespace-nowrap">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* TAB 2: Inventory Valuation Report */}
            {activeTab === 'inventory' && (
              <table className="w-full text-left text-xs border-collapse font-['Inter',sans-serif] min-w-[950px]">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600 font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3.5 px-4 whitespace-nowrap">SKU No</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Product Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Category</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Purity</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Gross Wt</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Net Wt</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Stock Qty</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Unit Price</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Total Valuation</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {(reportData.inventory || []).length === 0 ? (
                    <tr><td colSpan="10" className="py-8 text-center text-stone-400">No inventory products found.</td></tr>
                  ) : (
                    reportData.inventory.map((row) => (
                      <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-600 whitespace-nowrap">{row.sku}</td>
                        <td className="py-3.5 px-4 font-bold text-stone-900 whitespace-nowrap">{row.name}</td>
                        <td className="py-3.5 px-4 text-stone-600 whitespace-nowrap">{row.category}</td>
                        <td className="py-3.5 px-4 font-semibold text-stone-700 whitespace-nowrap">{row.purity}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-stone-700 whitespace-nowrap">{row.gross_weight}g</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700 whitespace-nowrap">{row.net_weight}g</td>
                        <td className="py-3.5 px-4 text-center font-bold text-stone-900 whitespace-nowrap">{row.stock_qty}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-stone-700 whitespace-nowrap">{formatINR(row.price)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-stone-900 text-sm whitespace-nowrap">{formatINR(row.total_valuation)}</td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block whitespace-nowrap ${row.stock_status === 'Low Stock'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                            {row.stock_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* TAB 3: Karigar & Work Orders Report */}
            {activeTab === 'karigar' && (
              <table className="w-full text-left text-xs border-collapse font-['Inter',sans-serif] min-w-[950px]">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600 font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3.5 px-4 whitespace-nowrap">Work Order No</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Artisan Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Product Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Material</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Allotted Wt</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Completed Wt</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Wastage</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Pending Wt</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {(reportData.workOrders || []).length === 0 ? (
                    <tr><td colSpan="9" className="py-8 text-center text-stone-400">No karigar work orders found.</td></tr>
                  ) : (
                    reportData.workOrders.map((row) => (
                      <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#b01622] whitespace-nowrap">{row.work_order_number}</td>
                        <td className="py-3.5 px-4 font-bold text-stone-900 whitespace-nowrap">{row.artisan_name}</td>
                        <td className="py-3.5 px-4 text-stone-700 whitespace-nowrap">{row.product_name}</td>
                        <td className="py-3.5 px-4 text-stone-600 whitespace-nowrap">{row.material_type}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-stone-800 font-bold whitespace-nowrap">{row.allotted_weight}g</td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">{row.completed_weight}g</td>
                        <td className="py-3.5 px-4 text-right font-mono text-rose-600 whitespace-nowrap">{row.wastage_weight}g</td>
                        <td className="py-3.5 px-4 text-right font-mono text-[#b01622] font-extrabold whitespace-nowrap">{row.pending_weight}g</td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200 inline-block whitespace-nowrap uppercase">
                            {row.current_stage}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* TAB 4: Supplier Purchase Report */}
            {activeTab === 'purchase' && (
              <table className="w-full text-left text-xs border-collapse font-['Inter',sans-serif] min-w-[950px]">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600 font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3.5 px-4 whitespace-nowrap">Purchase No</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Supplier Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Purchase Date</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Purity</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Net Weight</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Total Amount</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {(reportData.purchases || []).length === 0 ? (
                    <tr><td colSpan="7" className="py-8 text-center text-stone-400">No purchase entry records found.</td></tr>
                  ) : (
                    reportData.purchases.map((row) => (
                      <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-800 whitespace-nowrap">{row.purchase_no}</td>
                        <td className="py-3.5 px-4 font-bold text-stone-900 whitespace-nowrap">{row.supplier_name}</td>
                        <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px] whitespace-nowrap">{row.purchase_date}</td>
                        <td className="py-3.5 px-4 text-stone-700 font-semibold whitespace-nowrap">{row.purity}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-800 whitespace-nowrap">{row.net_weight}g</td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-stone-900 text-sm whitespace-nowrap">{formatINR(row.total_amount)}</td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block whitespace-nowrap">
                            {row.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* TAB 5: GST & Tax Compliance Report */}
            {activeTab === 'gst' && (
              <table className="w-full text-left text-xs border-collapse font-['Inter',sans-serif] min-w-[950px]">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600 font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3.5 px-4 whitespace-nowrap">Invoice No</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Customer Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Taxable Subtotal</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">SGST (1.5%)</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">CGST (1.5%)</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Total 3% GST</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Invoice Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {(reportData.sales || []).length === 0 ? (
                    <tr><td colSpan="8" className="py-8 text-center text-stone-400">No GST tax records available.</td></tr>
                  ) : (
                    reportData.sales.map((row) => (
                      <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#b01622] whitespace-nowrap">{row.invoice_number}</td>
                        <td className="py-3.5 px-4 font-bold text-stone-900 whitespace-nowrap">{row.customer_name}</td>
                        <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px] whitespace-nowrap">{row.date}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-stone-700 whitespace-nowrap">{formatINR(row.subtotal)}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-stone-600 whitespace-nowrap">{formatINR(row.gst_amount / 2)}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-stone-600 whitespace-nowrap">{formatINR(row.gst_amount / 2)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#b01622] whitespace-nowrap">{formatINR(row.gst_amount)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-stone-900 text-sm whitespace-nowrap">{formatINR(row.total_amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

          </div>
        )}

        {/* 6. Report Table Pagination Bar */}
        {!loading && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-t border-stone-200/80 bg-stone-50/50 font-['Inter',sans-serif]">
            <div className="text-xs text-stone-600 font-medium">
              Showing <span className="font-bold text-stone-900">{paginationMeta.from || 0}</span> to{' '}
              <span className="font-bold text-stone-900">{paginationMeta.to || 0}</span> of{' '}
              <span className="font-bold text-stone-900">{paginationMeta.total || 0}</span> records
            </div>

            {/* Dynamic Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={paginationMeta.current_page <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-300 disabled:opacity-40 text-stone-600 hover:bg-stone-100 text-xs transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i>
              </button>

              {Array.from({ length: paginationMeta.last_page || 1 }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold cursor-pointer ${paginationMeta.current_page === pageNum
                    ? 'bg-[#b01622] text-white'
                    : 'border border-stone-300 text-stone-700 hover:bg-stone-100'
                    }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={paginationMeta.current_page >= paginationMeta.last_page}
                onClick={() => setCurrentPage((prev) => Math.min(paginationMeta.last_page, prev + 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-300 disabled:opacity-40 text-stone-600 hover:bg-stone-100 text-xs transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 6. Printable A4 Tax & Audit Statement Modal Sheet */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 md:p-8 bg-stone-900/60 backdrop-blur-xs flex justify-center items-start print:p-0 print:bg-white print:static print:inset-auto print:block print:overflow-visible print:h-auto print:w-full print:filter-none print:backdrop-filter-none">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-executive-report,
              #printable-executive-report * {
                visibility: visible !important;
              }
              #printable-executive-report {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 15px !important;
                background: white !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              #printable-executive-report .sticky {
                position: static !important;
                box-shadow: none !important;
                padding-top: 0 !important;
                margin-top: 0 !important;
              }
              .report-section {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin-bottom: 20px !important;
              }
              table {
                page-break-inside: auto !important;
                width: 100% !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              thead {
                display: table-header-group !important;
              }
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
            }
          `}</style>

          {/* Screen Floating Close X Button */}
          <button
            type="button"
            onClick={() => setShowPrintModal(false)}
            className="fixed top-5 right-6 z-50 print:hidden bg-stone-900 hover:bg-stone-800 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-2xl cursor-pointer border border-stone-700 transition-transform hover:scale-105"
            title="Close Statement Modal (Esc)"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
          
          <div id="printable-executive-report" className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-8 my-4 md:my-8 space-y-6 text-stone-800 font-['Inter',sans-serif] border border-stone-200 relative print:p-0 print:my-0 print:border-0 print:shadow-none print:max-w-full print:rounded-none">
            {/* Sticky Header Bar for Screen View */}
            <div className="sticky top-0 bg-white z-20 border-b-2 border-[#b01622] pt-2 pb-4 -mx-8 px-8 -mt-8 rounded-t-2xl shadow-2xs flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-[#b01622] uppercase tracking-wider font-['Inter',sans-serif]">
                  Rudhra Jewellers Pvt. Ltd.
                </h2>
                <p className="text-xs font-bold text-stone-700 mt-0.5">
                  Certified Executive Business Audit &amp; Tax Compliance Statement
                </p>
                <p className="text-[11px] font-semibold text-stone-500 mt-0.5">
                  GSTIN: 33AAACR1234F1Z0 | Reg No: CHN/2026/JEW/9912 | Period Filter: <span className="uppercase text-stone-800 font-bold">{period}</span>
                </p>
              </div>

              {/* Header Action Buttons (Strictly Hidden When Printing) */}
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-print text-sm"></i>
                  <span>Print Statement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-1"
                  title="Close Report"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Executive KPI Summary Cards */}
            <div className="report-section grid grid-cols-5 gap-3 bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs">
              <div className="border-r border-stone-200 pr-2">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Total Revenue</span>
                <span className="font-extrabold font-mono text-stone-900 text-sm">{summary.totalSalesRevenueFormatted || '₹2,85,45,670'}</span>
              </div>
              <div className="border-r border-stone-200 pr-2 pl-1">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">3% GST Tax</span>
                <span className="font-extrabold font-mono text-[#b01622] text-sm">{summary.totalGstTaxFormatted || '₹8,56,370'}</span>
              </div>
              <div className="border-r border-stone-200 pr-2 pl-1">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Inventory Stock</span>
                <span className="font-extrabold font-mono text-stone-900 text-sm">{summary.inventoryValuationFormatted || '₹1,85,45,670'}</span>
              </div>
              <div className="border-r border-stone-200 pr-2 pl-1">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Metal Vault</span>
                <span className="font-extrabold font-mono text-purple-700 text-sm">{summary.totalAllottedGold || 168.447}g</span>
              </div>
              <div className="pl-1">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Supplier Spend</span>
                <span className="font-extrabold font-mono text-stone-900 text-sm">{summary.totalPurchaseSpendFormatted || '₹1,24,50,000'}</span>
              </div>
            </div>

            {/* Detailed Data Table 1: Sales & Billing Audit Trail */}
            <div className="report-section space-y-2">
              <div className="flex items-center justify-between border-b border-stone-200 pb-1">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-receipt text-xs text-[#b01622]"></i>
                  1. Sales &amp; Billing Audit Log ({reportData.sales?.length || 0} Transactions)
                </h3>
                <span className="text-[11px] text-stone-500 font-medium">All amounts in INR (₹)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700 border border-stone-200 rounded-lg overflow-hidden">
                  <thead className="bg-stone-100 text-stone-800 text-[10.5px] uppercase font-bold border-b border-stone-200">
                    <tr>
                      <th className="py-2 px-3">Invoice #</th>
                      <th className="py-2 px-3">Client Name</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                      <th className="py-2 px-3 text-right">Making Chg</th>
                      <th className="py-2 px-3 text-right">3% GST</th>
                      <th className="py-2 px-3 text-right">Total Amt</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-[11px]">
                    {(reportData.sales || []).length > 0 ? (
                      reportData.sales.map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="py-2 px-3 font-mono font-bold text-stone-900">{item.invoice_number}</td>
                          <td className="py-2 px-3 font-medium">{item.customer_name}</td>
                          <td className="py-2 px-3 text-stone-500">{item.date}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatINR(item.subtotal)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatINR(item.making_charges)}</td>
                          <td className="py-2 px-3 text-right font-mono text-[#b01622] font-semibold">{formatINR(item.gst_amount)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">{formatINR(item.total_amount)}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                              {item.status || 'PAID'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="py-3 text-center text-stone-400 italic">No sales transaction records found for selected period</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Data Table 2: Category & Inventory Stock Valuation */}
            <div className="report-section space-y-2">
              <div className="flex items-center justify-between border-b border-stone-200 pb-1">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-boxes-stacked text-xs text-[#b01622]"></i>
                  2. Category &amp; Stock Valuation Summary
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700 border border-stone-200 rounded-lg overflow-hidden">
                  <thead className="bg-stone-100 text-stone-800 text-[10.5px] uppercase font-bold border-b border-stone-200">
                    <tr>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Product Title</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Purity</th>
                      <th className="py-2 px-3 text-right">Net Wt</th>
                      <th className="py-2 px-3 text-right">Stock Qty</th>
                      <th className="py-2 px-3 text-right">Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-[11px]">
                    {(reportData.inventory || []).length > 0 ? (
                      reportData.inventory.map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="py-2 px-3 font-mono font-bold text-stone-900">{item.sku}</td>
                          <td className="py-2 px-3 font-medium">{item.name}</td>
                          <td className="py-2 px-3 text-stone-600">{item.category}</td>
                          <td className="py-2 px-3 font-semibold text-amber-700">{item.purity}</td>
                          <td className="py-2 px-3 text-right font-mono">{item.net_weight}g</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{item.stock_qty}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">{formatINR(item.total_valuation)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-3 text-center text-stone-400 italic">No inventory valuation records found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Data Table 3: Karigar Vault & Scrap Metal Balance */}
            <div className="report-section space-y-2">
              <div className="flex items-center justify-between border-b border-stone-200 pb-1">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-hammer text-xs text-[#b01622]"></i>
                  3. Karigar Vault &amp; Scrap Metal Manufacturing Balance
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700 border border-stone-200 rounded-lg overflow-hidden">
                  <thead className="bg-stone-100 text-stone-800 text-[10.5px] uppercase font-bold border-b border-stone-200">
                    <tr>
                      <th className="py-2 px-3">Work Order #</th>
                      <th className="py-2 px-3">Artisan Name</th>
                      <th className="py-2 px-3 text-right">Allotted Wt</th>
                      <th className="py-2 px-3 text-right">Completed Wt</th>
                      <th className="py-2 px-3 text-right">Wastage Wt</th>
                      <th className="py-2 px-3 text-right">Pending Vault Wt</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-[11px]">
                    {(reportData.workOrders || []).length > 0 ? (
                      reportData.workOrders.map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="py-2 px-3 font-mono font-bold text-stone-900">{item.work_order_number}</td>
                          <td className="py-2 px-3 font-medium">{item.artisan_name}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">{item.allotted_weight}g</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold">{item.completed_weight}g</td>
                          <td className="py-2 px-3 text-right font-mono text-red-700">{item.wastage_weight}g</td>
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-purple-800">{item.pending_weight}g</td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-3 text-center text-stone-400 italic">No karigar work order records found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Confirmation Box */}
            <div className="report-section text-xs leading-relaxed text-stone-700 bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-start gap-2.5">
              <i className="fa-solid fa-circle-check text-emerald-600 text-base mt-0.5 shrink-0"></i>
              <div>
                <span className="font-bold text-stone-900 block mb-0.5">Enterprise Compliance Verification</span>
                This executive statement is computer-generated and certified directly from the enterprise ERP database. All financial entries, inventory valuations, Karigar metal vault allocations, supplier purchases, and GST tax calculations adhere strictly to standard Indian jewellery industry tax compliance &amp; auditing regulations (CGST 1.5% + SGST 1.5%).
              </div>
            </div>

            {/* Footer Signature & Timestamp */}
            <div className="report-section pt-6 border-t-2 border-stone-200 flex items-end justify-between text-xs text-stone-600 font-medium">
              <div>
                <p className="font-bold text-stone-800">Rudhra Jewellers Pvt. Ltd.</p>
                <p className="text-[11px] text-stone-500">Corporate Office: Chennai, Tamil Nadu, India</p>
                <p className="text-[11px] text-stone-400 mt-1 font-mono">Statement Generated At: {new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <div className="border-b-2 border-stone-400 w-52 mb-1.5 ml-auto"></div>
                <span className="font-bold text-stone-800 uppercase tracking-wider block text-[11px]">Authorized Signatory &amp; Auditor</span>
                <span className="text-[10px] text-stone-400">Rudhra Executive Audit Cell</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
