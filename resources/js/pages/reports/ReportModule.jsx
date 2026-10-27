import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { sanitizeErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getStoredCompanyInfo, fetchCompanyInfo } from '../../utils/companyInfoService';
import { printElement } from '../../utils/printHelper';
import ConvertPurchasePaymentModeModal from '../../components/ConvertPurchasePaymentModeModal';
import SupplierLedgerModal from '../../components/SupplierLedgerModal';
import * as XLSX from 'xlsx';

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

  // Dynamic Company Master Info
  const [companyInfo, setCompanyInfo] = useState(() => getStoredCompanyInfo());

  // Ref and handler for Filter Strip Slider
  const filterSliderRef = useRef(null);

  const scrollFilterSlider = (direction) => {
    if (filterSliderRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      filterSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetchCompanyInfo().then(info => {
      if (info) setCompanyInfo(info);
    });
    const handleCompanyUpdate = (e) => {
      if (e?.detail) setCompanyInfo(e.detail);
    };
    window.addEventListener('rudhra_company_info_updated', handleCompanyUpdate);
    return () => window.removeEventListener('rudhra_company_info_updated', handleCompanyUpdate);
  }, []);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [convertPurchaseModal, setConvertPurchaseModal] = useState(null);
  const [settlementSupplierId, setSettlementSupplierId] = useState(null);
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showPrintModal) {
        setShowPrintModal(false);
      }
    };
    if (showPrintModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPrintModal]);

  // Backend Data
  const [reportData, setReportData] = useState({
    summary: {
      totalSalesRevenueFormatted: '₹0',
      totalSalesCount: 0,
      avgOrderValueFormatted: '₹0',
      totalGstTaxFormatted: '₹0',
      inventoryValuationFormatted: '₹0',
      totalProducts: 0,
      lowStockCount: 0,
      totalAllottedGold: 0,
      totalCompletedGold: 0,
      totalWastageGold: 0,
      totalPendingGold: 0,
      totalPurchaseSpendFormatted: '₹0',
    },
    sales: [],
    inventory: [],
    workOrders: [],
    purchases: [],
  });

  // Daily Gold Rates State
  const [goldRates, setGoldRates] = useState([]);
  const [goldRatesLoading, setGoldRatesLoading] = useState(false);
  const [goldRatesPerPage, setGoldRatesPerPage] = useState(10);
  const [showGoldRateModal, setShowGoldRateModal] = useState(false);
  const [showGoldRatePrintModal, setShowGoldRatePrintModal] = useState(false);
  const [savingGoldRate, setSavingGoldRate] = useState(false);
  const [goldRateForm, setGoldRateForm] = useState({
    rate_date: new Date().toISOString().split('T')[0],
    gold_24k_10g: '',
    gold_24k_1g: '',
    gold_22k_10g: '',
    gold_22k_1g: '',
    gold_18k_1g: '',
    gold_14k_1g: '',
    silver_1kg: '',
    silver_1g: '',
    source: 'manual',
    notes: '',
  });

  // Purchase Payment Status Modal State
  const [paymentModalRow, setPaymentModalRow] = useState(null);
  const [paymentStatusForm, setPaymentStatusForm] = useState({
    payment_status: 'paid',
    paid_amount: '',
    payment_notes: '',
  });
  const [updatingPayment, setUpdatingPayment] = useState(false);

  // Karigar Monthly & Flexible Accounting Report State
  const [karigarList, setKarigarList] = useState([]);
  const [selectedKarigarId, setSelectedKarigarId] = useState('all');
  const [karigarPeriodType, setKarigarPeriodType] = useState('monthly'); // 'weekly', 'monthly', 'yearly', 'custom'
  const [karigarWeekOffset, setKarigarWeekOffset] = useState(0); // 0 = current week, -1 = last week
  const [karigarStartDate, setKarigarStartDate] = useState('');
  const [karigarEndDate, setKarigarEndDate] = useState('');
  const [karigarMonth, setKarigarMonth] = useState(String(new Date().getMonth() + 1));
  const [karigarYear, setKarigarYear] = useState(new Date().getFullYear());
  const [karigarWorkOrderFilter, setKarigarWorkOrderFilter] = useState('all');
  const [karigarMaterialTypeFilter, setKarigarMaterialTypeFilter] = useState('all'); // 'all', 'gold', 'silver', 'diamond', 'stone', 'cash'
  const [karigarMonthlyReportData, setKarigarMonthlyReportData] = useState([]);
  const [karigarOverallSummary, setKarigarOverallSummary] = useState(null);
  const [loadingKarigarReport, setLoadingKarigarReport] = useState(false);
  const [karigarSubTab, setKarigarSubTab] = useState('both'); // 'both' | 'material' | 'financial' | 'work_orders'
  const [expandedKarigarLogs, setExpandedKarigarLogs] = useState({});

  const toggleKarigarLog = (kId) => {
    setExpandedKarigarLogs(prev => ({ ...prev, [kId]: !prev[kId] }));
  };

  const fetchKarigarMonthlyReport = async () => {
    try {
      setLoadingKarigarReport(true);
      const res = await api.get('/reports/karigar-monthly', {
        params: {
          period_type: karigarPeriodType,
          week_offset: karigarPeriodType === 'weekly' ? karigarWeekOffset : undefined,
          year: karigarYear,
          month: karigarPeriodType === 'monthly' ? karigarMonth : undefined,
          karigar_id: selectedKarigarId !== 'all' ? selectedKarigarId : undefined,
          work_order_id: karigarWorkOrderFilter !== 'all' ? karigarWorkOrderFilter : undefined,
          material_type: karigarMaterialTypeFilter !== 'all' && karigarMaterialTypeFilter !== 'cash' ? karigarMaterialTypeFilter : undefined,
          start_date: karigarPeriodType === 'custom' ? (karigarStartDate || undefined) : undefined,
          end_date: karigarPeriodType === 'custom' ? (karigarEndDate || undefined) : undefined,
        }
      });
      if (res.data?.status === 'success') {
        setKarigarMonthlyReportData(res.data.data || []);
        if (res.data.overall_summary || res.data.summary) {
          setKarigarOverallSummary(res.data.overall_summary || res.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load karigar report', err);
    } finally {
      setLoadingKarigarReport(false);
    }
  };

  useEffect(() => {
    api.get('/karigars', { params: { per_page: 100 } }).then(res => {
      if (res.data?.status === 'success' || Array.isArray(res.data?.data)) {
        setKarigarList(res.data.data || []);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'karigar') {
      fetchKarigarMonthlyReport();
    }
  }, [activeTab, karigarPeriodType, karigarWeekOffset, karigarYear, karigarMonth, selectedKarigarId, karigarWorkOrderFilter, karigarMaterialTypeFilter, karigarStartDate, karigarEndDate]);

  // Supplier Monthly / Periodic Ledger Report State
  const [supplierPeriodType, setSupplierPeriodType] = useState('monthly'); // 'monthly' | 'yearly' | 'custom'
  const [supplierMonth, setSupplierMonth] = useState(new Date().getMonth() + 1);
  const [supplierYear, setSupplierYear] = useState(new Date().getFullYear());
  const [supplierStartDate, setSupplierStartDate] = useState('');
  const [supplierEndDate, setSupplierEndDate] = useState('');
  const [selectedSupplierReportId, setSelectedSupplierReportId] = useState('all');
  const [supplierPurchaseTypeFilter, setSupplierPurchaseTypeFilter] = useState('all');
  const [supplierSettlementModeFilter, setSupplierSettlementModeFilter] = useState('all');
  const [supplierReportData, setSupplierReportData] = useState([]);
  const [supplierOverallSummary, setSupplierOverallSummary] = useState(null);
  const [loadingSupplierReport, setLoadingSupplierReport] = useState(false);
  const [expandedSupplierLogs, setExpandedSupplierLogs] = useState({});
  const [supplierList, setSupplierList] = useState([]);

  const toggleSupplierLog = (sId) => {
    setExpandedSupplierLogs(prev => ({ ...prev, [sId]: !prev[sId] }));
  };

  const fetchSupplierMonthlyReport = async () => {
    try {
      setLoadingSupplierReport(true);
      const res = await api.get('/reports/supplier-monthly', {
        params: {
          period_type: supplierPeriodType,
          year: supplierYear,
          month: supplierPeriodType === 'monthly' ? supplierMonth : undefined,
          supplier_id: selectedSupplierReportId !== 'all' ? selectedSupplierReportId : undefined,
          purchase_type: supplierPurchaseTypeFilter !== 'all' ? supplierPurchaseTypeFilter : undefined,
          settlement_mode: supplierSettlementModeFilter !== 'all' ? supplierSettlementModeFilter : undefined,
          start_date: supplierPeriodType === 'custom' ? (supplierStartDate || undefined) : undefined,
          end_date: supplierPeriodType === 'custom' ? (supplierEndDate || undefined) : undefined,
        }
      });
      if (res.data?.status === 'success') {
        setSupplierReportData(res.data.data || []);
        if (res.data.summary) {
          setSupplierOverallSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load supplier monthly report', err);
    } finally {
      setLoadingSupplierReport(false);
    }
  };

  useEffect(() => {
    api.get('/suppliers').then(res => {
      if (res.data?.status === 'success' || Array.isArray(res.data?.data)) {
        setSupplierList(res.data.data || []);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'supplier_ledger') {
      fetchSupplierMonthlyReport();
    }
  }, [activeTab, supplierPeriodType, supplierYear, supplierMonth, selectedSupplierReportId, supplierPurchaseTypeFilter, supplierSettlementModeFilter, supplierStartDate, supplierEndDate]);

  // Handle Excel Export for Supplier Monthly Ledger
  const handleExportSupplierExcel = () => {
    try {
      if (!supplierReportData || supplierReportData.length === 0) {
        showToast?.('No supplier ledger records to export.', 'warning');
        return;
      }

      const wb = XLSX.utils.book_new();

      // Sheet 1: Supplier Balances & Reconciliation
      const balancesHeader = [
        ['RUDRA JEWELLERY - SUPPLIER LEDGER & ACCOUNTS RECONCILIATION STATEMENT'],
        [`Period Mode: ${supplierPeriodType.toUpperCase()} | Generated: ${new Date().toLocaleString()}`],
        [],
        [
          'S.No', 'Supplier Code', 'Supplier Name', 'Phone',
          'Opening Cash Due (₹)', 'Period Purchases Cash (₹)', 'Period Cash Paid (₹)', 'Closing Cash Due (₹)', 'Cash Reconciled?',
          'Opening 24K Gold Due (g)', 'Period 24K Gold Purchases (g)', 'Period 24K Gold Settled (g)', 'Closing 24K Gold Due (g)', 'Gold Reconciled?',
          'Opening Silver Due (g)', 'Period Silver Purchases (g)', 'Period Silver Settled (g)', 'Closing Silver Due (g)', 'Silver Reconciled?'
        ]
      ];

      const balancesRows = supplierReportData.map((item, idx) => {
        const s = item.supplier || {};
        const op = item.opening_balance || {};
        const pp = item.period_purchases || {};
        const ps = item.period_settlements || {};
        const cl = item.closing_balance || {};
        const rec = item.reconciliation || {};

        return [
          idx + 1,
          s.supplier_code || '',
          s.name || '',
          s.phone || '',
          Number(op.cash_balance || 0),
          Number(pp.cash_balance || 0),
          Number(ps.cash_paid || 0),
          Number(cl.cash_balance || 0),
          rec.cash_reconciled ? 'MATCH' : 'MISMATCH',
          Number(op.gold_fine_grams || 0).toFixed(3),
          Number(pp.gold_fine_grams || 0).toFixed(3),
          Number(ps.gold_fine_grams || 0).toFixed(3),
          Number(cl.gold_fine_grams || 0).toFixed(3),
          rec.gold_reconciled ? 'MATCH' : 'MISMATCH',
          Number(op.silver_grams || 0).toFixed(3),
          Number(pp.silver_grams || 0).toFixed(3),
          Number(ps.silver_grams || 0).toFixed(3),
          Number(cl.silver_grams || 0).toFixed(3),
          rec.silver_reconciled ? 'MATCH' : 'MISMATCH'
        ];
      });

      const wsBalances = XLSX.utils.aoa_to_sheet([...balancesHeader, ...balancesRows]);
      XLSX.utils.book_append_sheet(wb, wsBalances, 'Supplier_Balances');

      // Sheet 2: Purchases Log
      const purchasesHeader = [
        ['RUDRA JEWELLERY - SUPPLIER PERIOD PURCHASES LOG'],
        [`Generated: ${new Date().toLocaleString()}`],
        [],
        ['Purchase No', 'Date', 'Supplier Code', 'Supplier Name', 'Purchase Type', 'Item Name', 'Gross Wt', 'Net Wt', 'Purity', '24K Pure Wt (g)', 'Diamond Carats', 'Rate', 'Total Amount (₹)', 'Settlement Mode', 'Payment Status']
      ];

      const purchasesRows = [];
      supplierReportData.forEach(item => {
        const s = item.supplier || {};
        (item.purchases || []).forEach(p => {
          purchasesRows.push([
            p.purchase_no,
            p.purchase_date,
            s.supplier_code || '',
            s.name || '',
            p.purchase_type,
            p.item_name || 'N/A',
            Number(p.weight || 0),
            Number(p.net_weight || p.weight || 0),
            p.purity || 'N/A',
            Number(p.fine_weight || 0),
            Number(p.diamond_weight || 0),
            Number(p.rate || 0),
            Number(p.total_amount || 0),
            (Number(p.rate || 0) <= 0) ? 'Metal Payable' : 'Monetary',
            p.payment_status || 'unpaid'
          ]);
        });
      });

      const wsPurchases = XLSX.utils.aoa_to_sheet([...purchasesHeader, ...purchasesRows]);
      XLSX.utils.book_append_sheet(wb, wsPurchases, 'Purchases_Log');

      // Sheet 3: Settlements Log
      const settlementsHeader = [
        ['RUDRA JEWELLERY - SUPPLIER PERIOD SETTLEMENTS & PAYMENTS LOG'],
        [`Generated: ${new Date().toLocaleString()}`],
        [],
        ['Voucher / ID', 'Date', 'Supplier Code', 'Supplier Name', 'Settlement Type', 'Amount (₹)', 'Gold Wt (g)', 'Purity', 'Fine Gold (g)', 'Silver Wt (g)', 'Payment Mode', 'Reference No', 'Notes']
      ];

      const settlementsRows = [];
      supplierReportData.forEach(item => {
        const s = item.supplier || {};
        (item.settlements || []).forEach(st => {
          settlementsRows.push([
            st.voucher_number || `#${st.id}`,
            st.settlement_date,
            s.supplier_code || '',
            s.name || '',
            st.settlement_type,
            Number(st.cash_amount || 0),
            Number(st.gold_weight || 0),
            st.gold_purity || '',
            Number(st.gold_fine_weight || 0),
            Number(st.silver_weight || 0),
            st.payment_mode || '',
            st.reference_number || '',
            st.notes || ''
          ]);
        });
      });

      const wsSettlements = XLSX.utils.aoa_to_sheet([...settlementsHeader, ...settlementsRows]);
      XLSX.utils.book_append_sheet(wb, wsSettlements, 'Settlements_Log');

      const filePeriod = supplierPeriodType === 'monthly'
        ? `${supplierYear}_Month_${supplierMonth}`
        : supplierPeriodType === 'yearly'
        ? `Year_${supplierYear}`
        : `Custom_${supplierStartDate || 'Start'}_to_${supplierEndDate || 'End'}`;

      XLSX.writeFile(wb, `Supplier_Audit_Ledger_${filePeriod}.xlsx`);
      showToast?.('Exported Supplier Excel workbook successfully!', 'success', 'Export Complete');
    } catch (err) {
      console.error('Excel Export failed:', err);
      showToast?.('Failed to generate Excel file: ' + err.message, 'error');
    }
  };

  // Handle CSV Export for Supplier Monthly Ledger
  const handleExportSupplierCSV = () => {
    try {
      if (!supplierReportData || supplierReportData.length === 0) {
        showToast?.('No supplier ledger records to export.', 'warning');
        return;
      }
      const headers = [
        'Supplier Code', 'Supplier Name', 'Phone',
        'Opening Cash Due', 'Purchases Cash', 'Cash Paid', 'Closing Cash Due',
        'Opening 24K Gold (g)', 'Purchases 24K Gold (g)', 'Settled 24K Gold (g)', 'Closing 24K Gold (g)',
        'Opening Silver (g)', 'Purchases Silver (g)', 'Settled Silver (g)', 'Closing Silver (g)',
        'Reconciliation Status'
      ];
      const rows = supplierReportData.map(item => {
        const s = item.supplier || {};
        const op = item.opening_balance || {};
        const pp = item.period_purchases || {};
        const ps = item.period_settlements || {};
        const cl = item.closing_balance || {};
        const rec = item.reconciliation || {};
        return [
          `"${s.supplier_code || ''}"`,
          `"${s.name || ''}"`,
          `"${s.phone || ''}"`,
          Number(op.cash_balance || 0),
          Number(pp.cash_balance || 0),
          Number(ps.cash_paid || 0),
          Number(cl.cash_balance || 0),
          Number(op.gold_fine_grams || 0).toFixed(3),
          Number(pp.gold_fine_grams || 0).toFixed(3),
          Number(ps.gold_fine_grams || 0).toFixed(3),
          Number(cl.gold_fine_grams || 0).toFixed(3),
          Number(op.silver_grams || 0).toFixed(3),
          Number(pp.silver_grams || 0).toFixed(3),
          Number(ps.silver_grams || 0).toFixed(3),
          Number(cl.silver_grams || 0).toFixed(3),
          rec.is_perfect ? '"RECONCILED - PERFECT MATCH"' : '"CHECK MISMATCH"'
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [
        `"RUDRA JEWELLERY - SUPPLIER LEDGER STATEMENT"`,
        `"Period: ${supplierPeriodType.toUpperCase()} | Generated: ${new Date().toLocaleString()}"`,
        '',
        headers.join(','),
        ...rows.map(e => e.join(','))
      ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Supplier_Ledger_${supplierPeriodType}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast?.(`Exported ${rows.length} supplier ledgers successfully as CSV!`, 'success');
    } catch (err) {
      console.error('CSV Export failed:', err);
      showToast?.('Failed to generate CSV export', 'error');
    }
  };


  // Trigger purchase due date notifications check on mount
  useEffect(() => {
    api.get('/purchase-entries/due-reminders')
      .then(res => {
        if (res.data?.dispatched_count > 0) {
          showToast?.(`Dispatched ${res.data.dispatched_count} supplier payment due reminders!`, 'info');
        }
      })
      .catch(() => {});
  }, []);

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
      showToast?.(sanitizeErrorMessage(err, 'Unable to connect to the server. Please try again later.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGoldRates = async () => {
    try {
      setGoldRatesLoading(true);
      const res = await api.get('/gold-rates', {
        params: {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
      });
      if (res.data?.status === 'success') {
        setGoldRates(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load gold rates:', err);
    } finally {
      setGoldRatesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'gold_rates') {
      fetchGoldRates();
    } else if (activeTab === 'supplier_ledger') {
      setLoading(false);
    } else if (activeTab === 'karigar' && karigarSubTab !== 'work_orders') {
      setLoading(false);
    } else {
      fetchReports(currentPage);
    }
  }, [activeTab, period, startDate, endDate, currentPage, karigarSubTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    if (activeTab === 'gold_rates') {
      fetchGoldRates();
    } else if (activeTab === 'supplier_ledger') {
      fetchSupplierMonthlyReport();
    } else if (activeTab === 'karigar' && karigarSubTab !== 'work_orders') {
      fetchKarigarMonthlyReport();
    } else {
      fetchReports(1);
    }
  };

  const handleTabChange = (tabId) => {
    setCurrentPage(1);
    setActiveTab(tabId);
    navigate(`/reports?tab=${tabId}`, { replace: true });
  };

  // Payment Status Updation Handler
  const handleOpenPaymentModal = (row) => {
    setPaymentModalRow(row);
    setPaymentStatusForm({
      payment_status: row.payment_status || 'paid',
      paid_amount: row.paid_amount ?? row.total_amount ?? 0,
      payment_notes: '',
    });
  };

  const handleSavePaymentStatus = async (e) => {
    e.preventDefault();
    if (!paymentModalRow) return;
    try {
      setUpdatingPayment(true);
      const res = await api.patch(`/purchase-entries/${paymentModalRow.id}/payment-status`, {
        payment_status: paymentStatusForm.payment_status,
        paid_amount: parseFloat(paymentStatusForm.paid_amount) || 0,
        payment_notes: paymentStatusForm.payment_notes,
      });

      if (res.data?.status === 'success') {
        showToast?.(`Purchase ${paymentModalRow.purchase_no} payment status updated to ${paymentStatusForm.payment_status.toUpperCase()}! Notification dispatched.`, 'success');
        setPaymentModalRow(null);
        fetchReports(currentPage);
      }
    } catch (err) {
      console.error('Failed to update payment status:', err);
      showToast?.(err.response?.data?.message || 'Failed to update payment status', 'error');
    } finally {
      setUpdatingPayment(false);
    }
  };

  // Daily Gold Rate Store Handler
  const handleSaveGoldRate = async (e) => {
    e.preventDefault();
    try {
      setSavingGoldRate(true);
      const res = await api.post('/gold-rates', goldRateForm);
      if (res.data?.status === 'success') {
        showToast?.('Daily gold rate stored successfully!', 'success');
        setShowGoldRateModal(false);
        setGoldRateForm({
          rate_date: new Date().toISOString().split('T')[0],
          gold_24k_10g: '',
          gold_24k_1g: '',
          gold_22k_10g: '',
          gold_22k_1g: '',
          gold_18k_1g: '',
          gold_14k_1g: '',
          silver_1kg: '',
          silver_1g: '',
          source: 'manual',
          notes: '',
        });
        window.dispatchEvent(new CustomEvent('rudhra_metal_rates_updated', { detail: res.data.data }));
        window.dispatchEvent(new CustomEvent('rudhra_price_list_updated', { detail: res.data.data }));
        fetchGoldRates();
      }
    } catch (err) {
      console.error('Failed to save gold rate:', err);
      showToast?.(err.response?.data?.message || 'Failed to record gold rate', 'error');
    } finally {
      setSavingGoldRate(false);
    }
  };

  const handleDeleteGoldRate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recorded gold rate entry?')) return;
    try {
      await api.delete(`/gold-rates/${id}`);
      showToast?.('Daily gold rate record removed.', 'info');
      fetchGoldRates();
    } catch (err) {
      console.error('Failed to delete gold rate:', err);
      showToast?.('Failed to delete gold rate', 'error');
    }
  };

  // Due Date Badge Calculation
  const getDueBadge = (row) => {
    const isPaid = (row.payment_status || '').toLowerCase() === 'paid';
    if (isPaid) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 whitespace-nowrap">
          <i className="fa-solid fa-circle-check text-[9px]"></i> Fully Paid
        </span>
      );
    }
    if (!row.due_date) {
      return <span className="text-stone-400 font-mono text-[10.5px]">No Due Date</span>;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(row.due_date);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 inline-flex items-center gap-1 whitespace-nowrap">
          <i className="fa-solid fa-triangle-exclamation text-[9px]"></i> Overdue ({Math.abs(diffDays)}d)
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-300 animate-pulse inline-flex items-center gap-1 whitespace-nowrap">
          <i className="fa-solid fa-bell text-[9px]"></i> Due Today!
        </span>
      );
    }
    if (diffDays <= 2) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1 whitespace-nowrap">
          <i className="fa-solid fa-clock text-[9px]"></i> Due in {diffDays}d
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-800 border border-yellow-300 inline-flex items-center gap-1 whitespace-nowrap">
          <i className="fa-regular fa-clock text-[9px]"></i> Due in {diffDays}d
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1 whitespace-nowrap">
        Due in {diffDays}d
      </span>
    );
  };

  // Helper for Nil / Empty field handling - returns '-' for missing values, while preserving numbers/zeros
  const formatNil = (val) => {
    if (val === null || val === undefined || val === '' || val === 'null' || val === 'N/A' || val === 'undefined') {
      return '-';
    }
    return val;
  };

  // CSV Export Generator (Fetches complete filtered dataset from database)
  const handleExportCSV = async () => {
    try {
      showToast?.('Preparing full report dataset export...', 'info');

      // Request full filtered dataset from backend
      const res = await api.get('/reports', {
        params: {
          type: activeTab,
          period,
          search: searchQuery,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          export: 1,
        },
      });

      const exportData = res.data?.status === 'success' || res.data?.summary ? res.data : reportData;

      let headers = [];
      let rows = [];
      let title = '';

      const esc = (val) => `"${String(formatNil(val)).replace(/"/g, '""')}"`;
      const num = (val) => (typeof val === 'number' ? val : (parseFloat(val) || 0));

      if (activeTab === 'sales') {
        title = 'Rudra_Jewellery_Sales_And_Billing_Report';
        headers = ['Invoice No', 'Customer Name', 'Phone', 'Date', 'Items', 'Subtotal (₹)', 'Making Charges (₹)', '3% GST (₹)', 'Total Amount (₹)', 'Payment Method', 'Status'];
        rows = (exportData.sales || []).map(r => [
          esc(r.invoice_number), esc(r.customer_name), esc(r.customer_phone), esc(r.date), num(r.items_count), num(r.subtotal), num(r.making_charges), num(r.gst_amount), num(r.total_amount), esc(r.payment_method), esc(r.status)
        ]);
      } else if (activeTab === 'inventory') {
        title = 'Rudra_Jewellery_Inventory_Report';
        headers = ['SKU No', 'Product Name', 'Category', 'Purity', 'Gross Wt (g)', 'Net Wt (g)', 'Dia Wt (ct)', 'Stock Qty', 'Stock Status'];
        rows = (exportData.inventory || []).map(r => [
          esc(r.sku), esc(r.name), esc(r.category), esc(r.purity), num(r.gross_weight), num(r.net_weight), num(r.diamond_weight), num(r.stock_qty), esc(r.stock_status)
        ]);
      } else if (activeTab === 'karigar') {
        if (karigarSubTab !== 'work_orders' && karigarMonthlyReportData.length > 0) {
          title = `Rudra_Jewellery_Karigar_Monthly_Accounting_${karigarYear}_${karigarMonth}`;
          headers = [
            'Artisan Name', 'Karigar Code', 'Opening Pure Gold (g)', 'Period Issued Fine (g)',
            'Period Received Fine (g)', 'Approved Wastage Fine (g)', 'Closing Pure Gold (g)',
            'Opening Payable (₹)', 'Period MC Earned (₹)', 'Period Paid (₹)', 'Period Advances (₹)', 'Closing Net Payable (₹)'
          ];
          rows = karigarMonthlyReportData.map(r => [
            esc(r.karigar?.name),
            esc(r.karigar?.karigar_code),
            num(r.material_report?.opening_gold_fine),
            num(r.material_report?.period_gold_issued_fine),
            num(r.material_report?.period_gold_received_fine),
            num(r.material_report?.period_gold_wastage_fine),
            num(r.material_report?.closing_gold_fine),
            num(r.financial_report?.opening_net_payable),
            num(r.financial_report?.period_earned),
            num(r.financial_report?.period_paid),
            num(r.financial_report?.period_advances),
            num(r.financial_report?.closing_net_payable),
          ]);
        } else {
          title = 'Rudra_Jewellery_Karigar_Manufacturing_Report';
          headers = ['Work Order No', 'Artisan Name', 'Product Name', 'Material', 'Allotted Wt (g)', 'Completed Wt (g)', 'Wastage (g)', 'Pending Wt (g)', 'Stage', 'Status', 'Date'];
          rows = (exportData.workOrders || []).map(r => [
            esc(r.work_order_number), esc(r.artisan_name), esc(r.product_name), esc(r.material_type), num(r.allotted_weight), num(r.completed_weight), num(r.wastage_weight), num(r.pending_weight), esc(r.current_stage), esc(r.status), esc(r.date)
          ]);
        }
      } else if (activeTab === 'purchase') {
        title = 'Rudra_Jewellery_Supplier_Purchase_Report';
        headers = ['Purchase No', 'Supplier Name', 'Purchase Date', 'Due Date', 'Credit Days', 'Purity', 'Net Weight (g)', '24K Pure Equiv Wt (g)', 'Rate (₹/g)', 'Payable Type', 'Total Bill (₹)', 'Paid Amount (₹)', 'Money Balance (₹)', 'Gold Balance (g 24K)', 'Payment Status'];
        rows = (exportData.purchases || []).map(r => [
          esc(r.purchase_no), esc(r.supplier_name), esc(r.purchase_date), esc(r.due_date || 'N/A'), num(r.credit_days || 0), esc(r.purity), num(r.net_weight || r.weight), num(r.fine_weight_24k || r.fine_weight || 0), num(r.rate || 0), esc(r.payable_type || (r.is_unpriced ? 'gold' : 'monetary')), r.payable_type === 'gold' ? '-' : num(r.total_amount), r.payable_type === 'gold' ? '-' : num(r.paid_amount || 0), r.payable_type === 'gold' ? '-' : num(r.balance_amount || 0), r.payable_type === 'gold' ? num(r.gold_balance || r.fine_weight_24k) : 0, esc(r.payment_status)
        ]);
      } else if (activeTab === 'gold_rates') {
        title = 'Rudra_Jewellery_Metal_Rate_History_Report';
        headers = ['Rate Date', 'Gold 24K (1g ₹)', 'Gold 22K (1g ₹)', 'Gold 18K (1g ₹)', 'Gold 14K (1g ₹)', 'Silver (1g ₹)', 'Gold 24K (10g ₹)', 'Gold 22K (10g ₹)', 'Source', 'Last Updated', 'Notes'];
        rows = goldRates.map(r => [
          esc(r.rate_date), num(r.gold_24k_1g), num(r.gold_22k_1g), num(r.gold_18k_1g), num(r.gold_14k_1g), num(r.silver_1g), num(r.gold_24k_10g), num(r.gold_22k_10g), esc(r.source), esc(r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'), esc(r.notes)
        ]);
      } else {
        title = 'Rudra_Jewellery_GST_Tax_Compliance_Report';
        headers = ['Invoice No', 'Customer Name', 'Date', 'Taxable Subtotal (₹)', 'SGST 1.5% (₹)', 'CGST 1.5% (₹)', 'Total 3% GST (₹)', 'Grand Total (₹)'];
        rows = (exportData.sales || []).map(r => [
          esc(r.invoice_number), esc(r.customer_name), esc(r.date), num(r.subtotal), (num(r.gst_amount) / 2).toFixed(2), (num(r.gst_amount) / 2).toFixed(2), num(r.gst_amount), num(r.total_amount)
        ]);
      }

      if (rows.length === 0) {
        showToast?.('No report data available to export', 'info');
        return;
      }

      const csvContent = 'data:text/csv;charset=utf-8,' + [
        `"RUDRA JEWELLERY - EXECUTIVE ENTERPRISE REPORT"`,
        `"Report Type: ${title.replace(/_/g, ' ')}"`,
        `"Generated At: ${new Date().toLocaleString()}"`,
        `"Period Filter: ${period.toUpperCase()}"`,
        `"Total Records Exported: ${rows.length}"`,
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

      showToast?.(`Exported ${rows.length} records successfully as CSV!`, 'success', 'Export Complete');
    } catch (err) {
      console.error('Export failed:', err);
      showToast?.('Failed to generate CSV export', 'error');
    }
  };

  // Helper for computing readable weekly range labels
  const getWeekRangeLabel = (offset) => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMonday + (offset * 7));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const fmt = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const yearStr = endOfWeek.getFullYear();
    const prefix = offset === 0 ? 'Current Week: ' : offset === -1 ? 'Last Week: ' : offset === 1 ? 'Next Week: ' : `${Math.abs(offset)}w ${offset < 0 ? 'ago' : 'ahead'}: `;
    return `${prefix}${fmt(startOfWeek)} - ${fmt(endOfWeek)}, ${yearStr}`;
  };

  // Professional Multi-Sheet Excel (.xlsx) Exporter for Karigar Ledgers & Balances
  const handleExportKarigarExcel = () => {
    try {
      if (!karigarMonthlyReportData || karigarMonthlyReportData.length === 0) {
        showToast?.('No karigar accounting records to export.', 'warning');
        return;
      }

      const wb = XLSX.utils.book_new();

      // --- SHEET 1: ARTISAN BALANCES SUMMARY ---
      const balancesHeader = [
        ['RUDRA JEWELLERY - ARTISAN MATERIAL & CASH AUDIT STATEMENT'],
        [`Period Mode: ${karigarPeriodType.toUpperCase()} | Generated: ${new Date().toLocaleString()}`],
        [],
        [
          'S.No',
          'Karigar Code',
          'Artisan Name',
          'Workshop',
          'Phone',
          'Status',
          'Opening Fine 24K (g)',
          'Period Issued Fine 24K (g)',
          'Period Received Fine 24K (g)',
          'Period Wastage Fine 24K (g)',
          'Closing Fine 24K (g)',
          'Opening Silver (g)',
          'Closing Silver (g)',
          'Opening Diamonds (ct)',
          'Opening Diamonds (pcs)',
          'Closing Diamonds (ct)',
          'Closing Diamonds (pcs)',
          'Opening Cash Payable (₹)',
          'Period MC Earned (₹)',
          'Period Cash Paid (₹)',
          'Period Advances (₹)',
          'Closing Cash Balance (₹)',
          'Cash Status'
        ]
      ];

      const balancesRows = karigarMonthlyReportData.map((item, idx) => {
        const k = item.karigar || {};
        const mr = item.material_report || {};
        const fr = item.financial_report || {};
        const closingPayable = Number(fr.closing_net_payable || 0);

        return [
          idx + 1,
          k.karigar_code || '',
          k.name || '',
          k.workshop_name || '',
          k.primary_phone || '',
          k.status || 'Active',
          Number(mr.opening_gold_fine || 0).toFixed(3),
          Number(mr.period_gold_issued_fine || 0).toFixed(3),
          Number(mr.period_gold_received_fine || 0).toFixed(3),
          Number(mr.period_gold_wastage_fine || 0).toFixed(3),
          Number(mr.closing_gold_fine || 0).toFixed(3),
          Number(mr.opening_silver_weight || 0).toFixed(3),
          Number(mr.closing_silver_weight || 0).toFixed(3),
          Number(mr.opening_diamond_carats || 0).toFixed(3),
          Number(mr.opening_diamond_pieces || 0),
          Number(mr.closing_diamond_carats || 0).toFixed(3),
          Number(mr.closing_diamond_pieces || 0),
          Number(fr.opening_net_payable || 0),
          Number(fr.period_earned || 0),
          Number(fr.period_paid || 0),
          Number(fr.period_advances || 0),
          closingPayable,
          closingPayable > 0 ? 'Payable to Artisan' : closingPayable < 0 ? 'Excess Advance with Artisan' : 'Settled'
        ];
      });

      // Compute Total Row
      const totalOpeningFine = karigarMonthlyReportData.reduce((s, r) => s + Number(r.material_report?.opening_gold_fine || 0), 0);
      const totalIssuedFine = karigarMonthlyReportData.reduce((s, r) => s + Number(r.material_report?.period_gold_issued_fine || 0), 0);
      const totalRecFine = karigarMonthlyReportData.reduce((s, r) => s + Number(r.material_report?.period_gold_received_fine || 0), 0);
      const totalWastageFine = karigarMonthlyReportData.reduce((s, r) => s + Number(r.material_report?.period_gold_wastage_fine || 0), 0);
      const totalClosingFine = karigarMonthlyReportData.reduce((s, r) => s + Number(r.material_report?.closing_gold_fine || 0), 0);

      const totalOpeningSilver = karigarMonthlyReportData.reduce((s, r) => s + Number(r.material_report?.opening_silver_weight || 0), 0);
      const totalClosingSilver = karigarMonthlyReportData.reduce((s, r) => s + Number(r.material_report?.closing_silver_weight || 0), 0);

      const totalOpeningDiaCt = karigarMonthlyReportData.reduce((s, r) => s + Number(r.material_report?.opening_diamond_carats || 0), 0);
      const totalOpeningDiaPcs = karigarMonthlyReportData.reduce((s, r) => s + Number(r.material_report?.opening_diamond_pieces || 0), 0);
      const totalClosingDiaCt = karigarMonthlyReportData.reduce((s, r) => s + Number(r.material_report?.closing_diamond_carats || 0), 0);
      const totalClosingDiaPcs = karigarMonthlyReportData.reduce((s, r) => s + Number(r.material_report?.closing_diamond_pieces || 0), 0);

      const totalOpeningCash = karigarMonthlyReportData.reduce((s, r) => s + Number(r.financial_report?.opening_net_payable || 0), 0);
      const totalEarnedCash = karigarMonthlyReportData.reduce((s, r) => s + Number(r.financial_report?.period_earned || 0), 0);
      const totalPaidCash = karigarMonthlyReportData.reduce((s, r) => s + Number(r.financial_report?.period_paid || 0), 0);
      const totalAdvanceCash = karigarMonthlyReportData.reduce((s, r) => s + Number(r.financial_report?.period_advances || 0), 0);
      const totalClosingCash = karigarMonthlyReportData.reduce((s, r) => s + Number(r.financial_report?.closing_net_payable || 0), 0);

      const balancesTotalRow = [
        'TOTAL',
        '',
        `Total Artisans: ${karigarMonthlyReportData.length}`,
        '',
        '',
        '',
        totalOpeningFine.toFixed(3),
        totalIssuedFine.toFixed(3),
        totalRecFine.toFixed(3),
        totalWastageFine.toFixed(3),
        totalClosingFine.toFixed(3),
        totalOpeningSilver.toFixed(3),
        totalClosingSilver.toFixed(3),
        totalOpeningDiaCt.toFixed(3),
        totalOpeningDiaPcs,
        totalClosingDiaCt.toFixed(3),
        totalClosingDiaPcs,
        totalOpeningCash,
        totalEarnedCash,
        totalPaidCash,
        totalAdvanceCash,
        totalClosingCash,
        totalClosingCash >= 0 ? 'Net Payable' : 'Net Advance'
      ];

      const wsBalances = XLSX.utils.aoa_to_sheet([...balancesHeader, ...balancesRows, balancesTotalRow]);
      XLSX.utils.book_append_sheet(wb, wsBalances, 'Artisan_Balances');

      // --- SHEET 2: MATERIAL MOVEMENT LEDGER ---
      const materialRows = [
        ['RUDRA JEWELLERY - KARIGAR MATERIAL TRANSACTIONS LOG'],
        [`Generated: ${new Date().toLocaleString()}`],
        [],
        ['Date', 'Artisan Code', 'Artisan Name', 'Transaction Type', 'Work Order #', 'Material Type', 'Purity', 'Gross Weight (g)', 'Touch %', 'Fine Gold 24K (g)', 'Diamond Carats', 'Diamond Pieces', 'Approved Wastage (g)', 'Notes']
      ];

      karigarMonthlyReportData.forEach((item) => {
        const k = item.karigar || {};
        (item.material_transactions || []).forEach((tx) => {
          materialRows.push([
            tx.transaction_date || '',
            k.karigar_code || '',
            k.name || '',
            tx.transaction_type ? tx.transaction_type.replace(/_/g, ' ') : '',
            tx.work_order?.work_order_number || (tx.work_order_id ? `#${tx.work_order_id}` : '-'),
            tx.material_type || 'Gold',
            tx.purity || '24K',
            Number(tx.weight || 0).toFixed(3),
            Number(tx.touch_percentage || 0).toFixed(2),
            Number(tx.fine_weight || 0).toFixed(3),
            Number(tx.diamond_carats || 0).toFixed(3),
            Number(tx.diamond_pieces || 0),
            Number(tx.wastage_weight || 0).toFixed(3),
            tx.notes || ''
          ]);
        });
      });

      const wsMaterial = XLSX.utils.aoa_to_sheet(materialRows);
      XLSX.utils.book_append_sheet(wb, wsMaterial, 'Material_Movements');

      // --- SHEET 3: CASH & MAKING CHARGES SETTLEMENTS ---
      const financialRows = [
        ['RUDRA JEWELLERY - KARIGAR FINANCIAL & MC SETTLEMENTS'],
        [`Generated: ${new Date().toLocaleString()}`],
        [],
        ['Date', 'Artisan Code', 'Artisan Name', 'Transaction Type', 'Work Order #', 'Amount (₹)', 'Payment Mode', 'Reference / Voucher #', 'Notes']
      ];

      karigarMonthlyReportData.forEach((item) => {
        const k = item.karigar || {};
        (item.financial_transactions || []).forEach((tx) => {
          financialRows.push([
            tx.date || tx.created_at?.slice(0, 10) || '',
            k.karigar_code || '',
            k.name || '',
            tx.type || 'Payment',
            tx.work_order_id ? `#${tx.work_order_id}` : '-',
            Number(tx.amount || 0),
            tx.mode || 'Cash',
            tx.reference_number || '-',
            tx.description || tx.notes || ''
          ]);
        });
      });

      const wsFinancial = XLSX.utils.aoa_to_sheet(financialRows);
      XLSX.utils.book_append_sheet(wb, wsFinancial, 'Cash_Settlements');

      // Filename
      const filePeriod = karigarPeriodType === 'weekly' 
        ? `Week_${karigarWeekOffset >= 0 ? '+' : ''}${karigarWeekOffset}`
        : karigarPeriodType === 'monthly'
        ? `${karigarYear}_Month_${karigarMonth}`
        : karigarPeriodType === 'yearly'
        ? `Year_${karigarYear}`
        : `Custom_${karigarStartDate || 'Start'}_to_${karigarEndDate || 'End'}`;

      XLSX.writeFile(wb, `Karigar_Ledger_Balances_${filePeriod}.xlsx`);
      showToast?.('Exported Karigar Excel workbook successfully!', 'success', 'Export Complete');
    } catch (err) {
      console.error('Excel Export failed:', err);
      showToast?.('Failed to generate Excel file: ' + err.message, 'error');
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

  // Tab-Aware Pagination Logic
  const supplierPerPage = 10;
  const supplierTotal = supplierReportData.length;
  const supplierLastPage = Math.max(1, Math.ceil(supplierTotal / supplierPerPage));
  const validSupplierPage = Math.min(Math.max(1, currentPage), supplierLastPage);
  const supplierFrom = supplierTotal > 0 ? (validSupplierPage - 1) * supplierPerPage + 1 : 0;
  const supplierTo = Math.min(supplierTotal, validSupplierPage * supplierPerPage);
  const paginatedSupplierData = supplierReportData.slice(
    (validSupplierPage - 1) * supplierPerPage,
    validSupplierPage * supplierPerPage
  );

  const karigarPerPage = 10;
  const karigarTotal = karigarMonthlyReportData.length;
  const karigarLastPage = Math.max(1, Math.ceil(karigarTotal / karigarPerPage));
  const validKarigarPage = Math.min(Math.max(1, currentPage), karigarLastPage);
  const karigarFrom = karigarTotal > 0 ? (validKarigarPage - 1) * karigarPerPage + 1 : 0;
  const karigarTo = Math.min(karigarTotal, validKarigarPage * karigarPerPage);
  const paginatedKarigarData = karigarMonthlyReportData.slice(
    (validKarigarPage - 1) * karigarPerPage,
    validKarigarPage * karigarPerPage
  );

  const activePagination = activeTab === 'supplier_ledger'
    ? {
        current_page: validSupplierPage,
        last_page: supplierLastPage,
        per_page: supplierPerPage,
        total: supplierTotal,
        from: supplierFrom,
        to: supplierTo,
      }
    : (activeTab === 'karigar' && karigarSubTab !== 'work_orders')
    ? {
        current_page: validKarigarPage,
        last_page: karigarLastPage,
        per_page: karigarPerPage,
        total: karigarTotal,
        from: karigarFrom,
        to: karigarTo,
      }
    : paginationMeta;

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

{activeTab === 'supplier_ledger' && (
            <>
              <button
                type="button"
                onClick={handleExportSupplierExcel}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-2 cursor-pointer font-['Inter',sans-serif]"
              >
                <i className="fa-solid fa-file-excel text-sm text-emerald-300"></i>
                <span>Export Supplier Excel</span>
              </button>
              <button
                type="button"
                onClick={handleExportSupplierCSV}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-2 cursor-pointer font-['Inter',sans-serif]"
              >
                <i className="fa-solid fa-file-csv text-sm text-emerald-400"></i>
                <span>Export CSV</span>
              </button>
            </>
          )}
          {activeTab !== 'supplier_ledger' && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-2 cursor-pointer font-['Inter',sans-serif]"
          >
            <i className="fa-solid fa-file-csv text-sm text-emerald-400"></i>
            <span>Export CSV</span>
          </button>
          )}

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
            {loading ? (
              <div className="h-7 w-28 bg-stone-100 animate-pulse rounded-md my-0.5"></div>
            ) : (
              summary.totalSalesRevenueFormatted || '₹0'
            )}
          </div>
          {(() => {
            const growthText = summary.salesGrowth || '+0.0%';
            const isNegative = growthText.startsWith('-');
            const growthColorClass = isNegative ? 'text-rose-600' : 'text-emerald-600';
            const growthIconClass = isNegative ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up';
            return (
              <div className={`text-[11px] font-bold ${growthColorClass} flex items-center gap-1 font-['Inter',sans-serif]`}>
                {loading ? (
                  <div className="h-3 w-20 bg-stone-100 animate-pulse rounded-xs"></div>
                ) : (
                  <>
                    <i className={`fa-solid ${growthIconClass} text-[9px]`}></i>
                    <span>{growthText} <span className="font-normal text-stone-400">{summary.prevPeriodLabel || 'vs Prev Period'}</span></span>
                  </>
                )}
              </div>
            );
          })()}
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
            {loading ? (
              <div className="h-7 w-24 bg-stone-100 animate-pulse rounded-md my-0.5"></div>
            ) : (
              summary.avgOrderValueFormatted || '₹0'
            )}
          </div>
          <div className="text-[11px] font-medium text-stone-500 font-['Inter',sans-serif]">
            {loading ? (
              <div className="h-3 w-24 bg-stone-100 animate-pulse rounded-xs"></div>
            ) : (
              <>Across <strong className="text-stone-900 font-bold">{summary.totalSalesCount ?? 0} Total Orders</strong></>
            )}
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
            {loading ? (
              <div className="h-7 w-28 bg-stone-100 animate-pulse rounded-md my-0.5"></div>
            ) : (
              summary.inventoryValuationFormatted || '₹0'
            )}
          </div>
          <div className="text-[11px] font-medium text-stone-500 font-['Inter',sans-serif]">
            {loading ? (
              <div className="h-3 w-28 bg-stone-100 animate-pulse rounded-xs"></div>
            ) : (
              <><strong className="text-stone-900 font-bold">{summary.totalProducts ?? 0} Items</strong> ({summary.lowStockCount ?? 0} Low Stock)</>
            )}
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
            {loading ? (
              <div className="h-7 w-20 bg-stone-100 animate-pulse rounded-md my-0.5"></div>
            ) : (
              <>{summary.totalAllottedGold ?? '0.000'} <span className="text-xs font-semibold text-stone-500">g</span></>
            )}
          </div>
          <div className="text-[11px] font-bold text-[#b01622] font-['Inter',sans-serif]">
            {loading ? (
              <div className="h-3 w-20 bg-stone-100 animate-pulse rounded-xs"></div>
            ) : (
              <>Pending: {summary.totalPendingGold ?? '0.000'}g</>
            )}
          </div>
        </div>

        {/* Metric 5: 3% GST Tax Collected */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-stone-400 uppercase tracking-wider">GST Tax Liability (3%)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-receipt"></i>
            </div>
          </div>
          <div className="text-xl font-extrabold text-stone-900 font-mono tracking-tight">
            {loading ? (
              <div className="h-7 w-24 bg-stone-100 animate-pulse rounded-md my-0.5"></div>
            ) : (
              summary.totalGstTaxFormatted || '₹0'
            )}
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
          ['Supplier Audit Ledger', 'supplier_ledger', 'fa-solid fa-book-bookmark'],
          ['Supplier Purchase Spend', 'purchase', 'fa-solid fa-truck-ramp-box'],
          ['GST & Tax Compliance', 'gst', 'fa-solid fa-scale-balanced'],
          ['Metal Rate History', 'gold_rates', 'fa-solid fa-coins'],
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

      {/* 4. Filter Control Strip (Single Row Slider Container) */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-stone-200/80 shadow-2xs flex items-center gap-2 relative group">
        
        {/* Left Slider Arrow Button */}
        <button
          type="button"
          onClick={() => scrollFilterSlider('left')}
          className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-2xs z-10"
          title="Slide Left"
        >
          <i className="fa-solid fa-chevron-left text-[11px]"></i>
        </button>

        {/* Scrollable Slider Track */}
        <div
          ref={filterSliderRef}
          className="flex-1 flex flex-nowrap items-center gap-3 overflow-x-auto scroll-smooth no-scrollbar py-0.5"
        >
          {/* Period Preset Dropdown & Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 font-['Inter',sans-serif]">
              <i className="fa-solid fa-filter text-stone-400"></i>
              <span>Period:</span>
            </div>

            <div className="flex items-center bg-stone-100 p-1 rounded-xl gap-0.5 text-xs font-bold font-['Inter',sans-serif]">
              {[
                ['Today', 'today'],
                ['Weekly', 'week'],
                ['Monthly', 'month'],
                ['Quarterly', 'quarter'],
                ['Yearly', 'year'],
                ['All Time', 'all'],
              ].map(([lbl, val]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setPeriod(val);
                    setStartDate('');
                    setEndDate('');
                  }}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${period === val && !startDate
                    ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                    : 'text-stone-600 hover:text-stone-900'
                    }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range, Search Input & Apply Button in Same Row */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2.5 shrink-0 flex-nowrap">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPeriod('custom'); }}
                className="bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
              />
              <span className="text-xs font-bold text-stone-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPeriod('custom'); }}
                className="bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
              />
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-3 py-1 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622] w-36 sm:w-44"
              />
              <i className="fa-solid fa-magnifying-glass text-stone-400 text-xs absolute left-2.5 top-1/2 -translate-y-1/2"></i>
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-colors cursor-pointer font-['Inter',sans-serif] whitespace-nowrap"
            >
              Apply
            </button>
          </form>
        </div>

        {/* Right Slider Arrow Button */}
        <button
          type="button"
          onClick={() => scrollFilterSlider('right')}
          className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-2xs z-10"
          title="Slide Right"
        >
          <i className="fa-solid fa-chevron-right text-[11px]"></i>
        </button>
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
                    <th className="py-3.5 px-4 text-center w-14 whitespace-nowrap">S.No</th>
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
                    <tr><td colSpan="10" className="py-8 text-center text-stone-400">No sales records found for this criteria.</td></tr>
                  ) : (
                    reportData.sales.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono text-stone-500 font-semibold">{idx + 1}</td>
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
                    <th className="py-3.5 px-4 text-center w-14 whitespace-nowrap">S.No</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">SKU No</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Product Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Category</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Purity</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Gross Wt</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Net Wt</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Dia Wt</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Stock Qty</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {(reportData.inventory || []).length === 0 ? (
                    <tr><td colSpan="10" className="py-8 text-center text-stone-400">No inventory products found.</td></tr>
                  ) : (
                    reportData.inventory.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono text-stone-500 font-semibold">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-600 whitespace-nowrap">{row.sku}</td>
                        <td className="py-3.5 px-4 font-bold text-stone-900 whitespace-nowrap">{row.name}</td>
                        <td className="py-3.5 px-4 text-stone-600 whitespace-nowrap">{row.category}</td>
                        <td className="py-3.5 px-4 font-semibold text-stone-700 whitespace-nowrap">{row.purity}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-stone-700 whitespace-nowrap">{Number(row.gross_weight || 0).toFixed(3)}g</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700 whitespace-nowrap">{Number(row.net_weight || 0).toFixed(3)}g</td>
                        <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                          {Number(row.diamond_weight || 0) > 0 ? (
                            <span className="font-bold text-blue-700">{Number(row.diamond_weight).toFixed(3)} ct</span>
                          ) : (
                            <span className="text-stone-300 font-medium">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-stone-900 whitespace-nowrap">{row.stock_qty}</td>
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

            {/* TAB 3: Karigar Monthly Accounting & Manufacturing Ledger Report */}
            {activeTab === 'karigar' && (
              <div className="space-y-5 p-4 bg-stone-50/50">
                {/* Karigar Report Controls Strip */}
                <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Period Mode Selector Pills */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Period:</span>
                      <div className="flex items-center bg-stone-100 p-0.5 rounded-xl text-xs font-bold">
                        {[
                          ['Weekly', 'weekly'],
                          ['Monthly', 'monthly'],
                          ['Yearly', 'yearly'],
                          ['Custom Date', 'custom'],
                        ].map(([lbl, val]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setKarigarPeriodType(val);
                              if (val === 'weekly') setKarigarWeekOffset(0);
                            }}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                              karigarPeriodType === val
                                ? 'bg-[#b01622] text-white shadow-2xs font-extrabold'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sub-view View Switcher & Excel Export Button */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportKarigarExcel}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        title="Download complete multi-sheet accounting spreadsheet"
                      >
                        <i className="fa-solid fa-file-excel text-sm"></i>
                        <span>Export Excel (.xlsx)</span>
                      </button>

                      <div className="flex items-center bg-stone-100 p-0.5 rounded-xl gap-0.5 text-xs font-bold">
                        {[
                          ['Both Reports', 'both'],
                          ['Material Ledger', 'material'],
                          ['Financial & MC', 'financial'],
                          ['Work Orders', 'work_orders'],
                        ].map(([lbl, val]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setKarigarSubTab(val)}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                              karigarSubTab === val
                                ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Period Filter Controls Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Weekly Controls */}
                      {karigarPeriodType === 'weekly' && (
                        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2 py-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setKarigarWeekOffset(prev => prev - 1)}
                            className="p-1 hover:bg-stone-200 rounded text-stone-600 font-bold transition-colors cursor-pointer"
                            title="Previous Week"
                          >
                            <i className="fa-solid fa-chevron-left text-xs"></i>
                          </button>
                          <span className="font-mono text-xs font-bold text-stone-800 px-2">
                            {getWeekRangeLabel(karigarWeekOffset)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setKarigarWeekOffset(prev => prev + 1)}
                            className="p-1 hover:bg-stone-200 rounded text-stone-600 font-bold transition-colors cursor-pointer"
                            title="Next Week"
                          >
                            <i className="fa-solid fa-chevron-right text-xs"></i>
                          </button>
                          {karigarWeekOffset !== 0 && (
                            <button
                              type="button"
                              onClick={() => setKarigarWeekOffset(0)}
                              className="ml-1 px-2 py-0.5 bg-stone-200 hover:bg-stone-300 rounded text-[10px] font-bold text-stone-700 transition-colors cursor-pointer"
                            >
                              This Week
                            </button>
                          )}
                        </div>
                      )}

                      {/* Monthly Controls */}
                      {karigarPeriodType === 'monthly' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-stone-500 uppercase">Month:</span>
                          <select
                            value={karigarMonth}
                            onChange={(e) => setKarigarMonth(e.target.value)}
                            className="bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                          >
                            <option value="all">Full Year</option>
                            <option value="1">01 - January</option>
                            <option value="2">02 - February</option>
                            <option value="3">03 - March</option>
                            <option value="4">04 - April</option>
                            <option value="5">05 - May</option>
                            <option value="6">06 - June</option>
                            <option value="7">07 - July</option>
                            <option value="8">08 - August</option>
                            <option value="9">09 - September</option>
                            <option value="10">10 - October</option>
                            <option value="11">11 - November</option>
                            <option value="12">12 - December</option>
                          </select>
                        </div>
                      )}

                      {/* Year Picker (visible for monthly & yearly) */}
                      {(karigarPeriodType === 'monthly' || karigarPeriodType === 'yearly') && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-stone-500 uppercase">Year:</span>
                          <select
                            value={karigarYear}
                            onChange={(e) => setKarigarYear(Number(e.target.value))}
                            className="bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                          >
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                            <option value={2027}>2027</option>
                          </select>
                        </div>
                      )}

                      {/* Custom Date Range Picker */}
                      {karigarPeriodType === 'custom' && (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-bold text-stone-500 uppercase">From:</span>
                            <input
                              type="date"
                              value={karigarStartDate}
                              onChange={(e) => setKarigarStartDate(e.target.value)}
                              className="bg-stone-50 border border-stone-300 rounded-xl px-2 py-1 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-bold text-stone-500 uppercase">To:</span>
                            <input
                              type="date"
                              value={karigarEndDate}
                              onChange={(e) => setKarigarEndDate(e.target.value)}
                              className="bg-stone-50 border border-stone-300 rounded-xl px-2 py-1 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                            />
                          </div>
                        </div>
                      )}

                      {/* Artisan Filter */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-stone-500 uppercase">Artisan:</span>
                        <select
                          value={selectedKarigarId}
                          onChange={(e) => setSelectedKarigarId(e.target.value)}
                          className="bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622] max-w-xs"
                        >
                          <option value="all">All Karigars ({karigarList.length})</option>
                          {karigarList.map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.name} ({k.karigar_code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Material & Cash Category Filter */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-stone-500 uppercase">Material &amp; Cash:</span>
                        <select
                          value={karigarMaterialTypeFilter}
                          onChange={(e) => setKarigarMaterialTypeFilter(e.target.value)}
                          className="bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                        >
                          <option value="all">All Materials &amp; Cash</option>
                          <option value="gold">Gold (24K Pure Fine)</option>
                          <option value="silver">Silver</option>
                          <option value="diamond">Diamonds (ct &amp; pcs)</option>
                          <option value="stone">Colour Stones</option>
                          <option value="cash">Cash / Making Charges (₹)</option>
                        </select>
                      </div>
                    </div>

                    <div className="text-[11px] text-stone-500 font-mono">
                      Showing {karigarMonthlyReportData.length} artisan ledger(s)
                    </div>
                  </div>
                </div>

                {/* Overall Summary KPI Strip */}
                {(() => {
                  const reports = karigarMonthlyReportData || [];
                  const summary = karigarOverallSummary || {};
                  
                  const totalClosingFine = summary.closing_fine_gold !== undefined 
                    ? Number(summary.closing_fine_gold) 
                    : reports.reduce((s, r) => s + Number(r.material_report?.closing_gold_fine || 0), 0);
                  const totalOpeningFine = summary.opening_fine_gold !== undefined
                    ? Number(summary.opening_fine_gold)
                    : reports.reduce((s, r) => s + Number(r.material_report?.opening_gold_fine || 0), 0);
                  const totalPeriodIssuedFine = summary.issued_fine_gold !== undefined
                    ? Number(summary.issued_fine_gold)
                    : reports.reduce((s, r) => s + Number(r.material_report?.period_gold_issued_fine || 0), 0);
                  const totalPeriodRecFine = summary.received_fine_gold !== undefined
                    ? Number(summary.received_fine_gold)
                    : reports.reduce((s, r) => s + Number(r.material_report?.period_gold_received_fine || 0), 0);
                  const totalPeriodWastageFine = summary.wastage_fine_gold !== undefined
                    ? Number(summary.wastage_fine_gold)
                    : reports.reduce((s, r) => s + Number(r.material_report?.period_gold_wastage_fine || 0), 0);

                  const totalClosingSilver = summary.closing_silver_weight !== undefined
                    ? Number(summary.closing_silver_weight)
                    : reports.reduce((s, r) => s + Number(r.material_report?.closing_silver_weight || 0), 0);

                  const totalClosingDiaCt = summary.closing_diamond_carats !== undefined
                    ? Number(summary.closing_diamond_carats)
                    : reports.reduce((s, r) => s + Number(r.material_report?.closing_diamond_carats || 0), 0);
                  const totalClosingDiaPcs = summary.closing_diamond_pieces !== undefined
                    ? Number(summary.closing_diamond_pieces)
                    : reports.reduce((s, r) => s + Number(r.material_report?.closing_diamond_pieces || 0), 0);

                  const totalClosingStone = summary.closing_stone_weight !== undefined
                    ? Number(summary.closing_stone_weight)
                    : reports.reduce((s, r) => s + Number(r.material_report?.closing_stone_weight || 0), 0);

                  const totalOpeningCash = summary.opening_cash_balance !== undefined
                    ? Number(summary.opening_cash_balance)
                    : reports.reduce((s, r) => s + Number(r.financial_report?.opening_net_payable || 0), 0);
                  const totalEarnedCash = summary.period_earned !== undefined
                    ? Number(summary.period_earned)
                    : reports.reduce((s, r) => s + Number(r.financial_report?.period_earned || 0), 0);
                  const totalPaidCash = summary.period_paid !== undefined
                    ? Number(summary.period_paid)
                    : reports.reduce((s, r) => s + Number(r.financial_report?.period_paid || 0), 0);
                  const totalClosingCash = summary.closing_cash_balance !== undefined
                    ? Number(summary.closing_cash_balance)
                    : reports.reduce((s, r) => s + Number(r.financial_report?.closing_net_payable || 0), 0);

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-4 rounded-2xl shadow-sm border border-stone-700">
                      {/* Card 1: Pure Fine Gold */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-amber-400/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">Overall 24K Pure Fine Gold</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 font-mono">100% PURE</span>
                        </div>
                        <p className="text-xl font-mono font-extrabold text-amber-300 mt-1">
                          {totalClosingFine.toFixed(3)} <span className="text-xs font-normal text-amber-200">g 24K</span>
                        </p>
                        <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">
                          Opening: {totalOpeningFine.toFixed(3)}g • In: +{totalPeriodIssuedFine.toFixed(3)}g • Ret: -{totalPeriodRecFine.toFixed(3)}g • Wst: -{totalPeriodWastageFine.toFixed(3)}g
                        </p>
                      </div>

                      {/* Card 2: Diamonds & Stones */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-blue-400/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider block">Overall Diamond Balance</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-200 font-mono">DIAMONDS</span>
                        </div>
                        <p className="text-xl font-mono font-extrabold text-blue-300 mt-1">
                          {totalClosingDiaCt.toFixed(3)} <span className="text-xs font-normal text-blue-200">ct</span>
                          <span className="text-xs font-bold text-stone-300 ml-1.5 font-mono">({totalClosingDiaPcs} pcs)</span>
                        </p>
                        <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">
                          Across all artisans • Colour Stones: <span className="text-stone-300 font-mono">{totalClosingStone.toFixed(3)} ct/g</span>
                        </p>
                      </div>

                      {/* Card 3: Silver Balance */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-slate-400/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wider block">Overall Silver Balance</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-400/10 text-slate-200 font-mono">SILVER</span>
                        </div>
                        <p className="text-xl font-mono font-extrabold text-slate-200 mt-1">
                          {totalClosingSilver.toFixed(3)} <span className="text-xs font-normal text-slate-300">g</span>
                        </p>
                        <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">
                          92.5 Sterling / Raw Silver on Artisan Bench
                        </p>
                      </div>

                      {/* Card 4: Artisan Cash Balance */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-emerald-400/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider block">Overall Cash Balance</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                            totalClosingCash > 0 ? 'bg-rose-500/20 text-rose-300' : totalClosingCash < 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {totalClosingCash > 0 ? 'PAYABLE' : totalClosingCash < 0 ? 'ADVANCE' : 'SETTLED'}
                          </span>
                        </div>
                        <p className={`text-xl font-mono font-extrabold mt-1 ${
                          totalClosingCash > 0 ? 'text-rose-400' : totalClosingCash < 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {formatINR(totalClosingCash)}
                        </p>
                        <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">
                          Opening: {formatINR(totalOpeningCash)} • MC: +{formatINR(totalEarnedCash)} • Paid: -{formatINR(totalPaidCash)}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* SubTab 4: Standard Work Orders Table */}
                {karigarSubTab === 'work_orders' ? (
                  <table className="w-full text-left text-xs border-collapse font-['Inter',sans-serif] min-w-[950px] bg-white rounded-2xl overflow-hidden border border-stone-200">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600 font-bold uppercase tracking-wider text-[10.5px]">
                        <th className="py-3.5 px-4 text-center w-14 whitespace-nowrap">S.No</th>
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
                        <tr><td colSpan="10" className="py-8 text-center text-stone-400">No karigar work orders found.</td></tr>
                      ) : (
                        reportData.workOrders.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="py-3.5 px-4 text-center font-mono text-stone-500 font-semibold">{idx + 1}</td>
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
                ) : (
                  /* Karigar Accounting Cards */
                  <div className="space-y-6">
                    {loadingKarigarReport ? (
                      <div className="py-12 text-center text-stone-400 space-y-2 bg-white rounded-2xl border border-stone-200">
                        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622]"></i>
                        <p className="text-xs font-semibold">Generating monthly material & financial ledger report...</p>
                      </div>
                    ) : karigarMonthlyReportData.length === 0 ? (
                      <div className="py-12 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
                        <i className="fa-solid fa-folder-open text-3xl mb-2 text-stone-300"></i>
                        <p className="text-xs font-semibold">No accounting movements on record for this selected period.</p>
                      </div>
                    ) : (
                      paginatedKarigarData.map((report) => {
                        const { karigar, material_report, financial_report, material_transactions, financial_transactions } = report;
                        const isExpanded = !!expandedKarigarLogs[karigar.id];
                        const closingGold = Number(material_report?.closing_gold_fine || 0);
                        const isGoldNegative = closingGold < 0;
                        const closingPayable = Number(financial_report?.closing_net_payable || 0);

                        return (
                          <div key={karigar.id} className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden space-y-4 p-5">
                            {/* Artisan Card Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center text-sm font-bold">
                                  {karigar.name?.charAt(0) || 'K'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-stone-900 text-sm">{karigar.name}</h3>
                                    <span className="font-mono px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                                      {karigar.karigar_code}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      {karigar.status || 'Active'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-stone-500 mt-0.5">
                                    {karigar.workshop_name ? `${karigar.workshop_name} • ` : ''}Phone: {karigar.primary_phone || '—'} • Specialization: {karigar.specialization || 'General Goldsmith'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${
                                  closingPayable > 0 ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                  closingPayable < 0 ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                  'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}>
                                  {closingPayable < 0 ? `Advance Balance: ${formatINR(Math.abs(closingPayable))}` : `Payable: ${formatINR(closingPayable)}`}
                                </span>
                              </div>
                            </div>

                            {/* SECTION A: MATERIAL ACCOUNTING REPORT */}
                            {(karigarSubTab === 'both' || karigarSubTab === 'material') && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    <span>Material Movement & Reconciliation</span>
                                  </h4>
                                  <span className="text-[11px] text-stone-400 font-medium">Unit: Grams (g) Pure Gold 24K</span>
                                </div>

                                {/* Opening Balances Pill Bar */}
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 text-center text-xs">
                                  <div>
                                    <span className="text-[10px] text-stone-400 uppercase font-semibold">Opening Pure Gold</span>
                                    <p className="font-mono font-bold text-stone-900 mt-0.5">
                                      {Number(material_report?.opening_gold_fine || 0).toFixed(3)}g
                                    </p>
                                  </div>
                                  <div className="border-l border-stone-200">
                                    <span className="text-[10px] text-stone-400 uppercase font-semibold">Opening Net Gold</span>
                                    <p className="font-mono font-bold text-stone-900 mt-0.5">
                                      {Number(material_report?.opening_gold_net || 0).toFixed(3)}g
                                    </p>
                                  </div>
                                  <div className="border-l border-stone-200">
                                    <span className="text-[10px] text-stone-400 uppercase font-semibold">Opening Silver</span>
                                    <p className="font-mono font-bold text-stone-700 mt-0.5">
                                      {Number(material_report?.opening_silver_weight || 0).toFixed(3)}g
                                    </p>
                                  </div>
                                  <div className="border-l border-stone-200">
                                    <span className="text-[10px] text-stone-400 uppercase font-semibold">Opening Diamonds</span>
                                    <p className="font-mono font-bold text-blue-900 mt-0.5">
                                      {Number(material_report?.opening_diamond_carats || 0).toFixed(3)} ct ({material_report?.opening_diamond_pieces || 0} pcs)
                                    </p>
                                  </div>
                                  <div className="border-l border-stone-200">
                                    <span className="text-[10px] text-stone-400 uppercase font-semibold">Opening Stones</span>
                                    <p className="font-mono font-bold text-emerald-900 mt-0.5">
                                      {Number(material_report?.opening_stone_weight || 0).toFixed(3)}
                                    </p>
                                  </div>
                                </div>

                                {/* Gold Balances by Purity Table */}
                                <div className="border border-stone-200 rounded-xl overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-stone-50 text-stone-600 font-bold uppercase text-[10px] tracking-wider border-b border-stone-200">
                                        <th className="py-2 px-3">Purity</th>
                                        <th className="py-2 px-3 text-right">Touch %</th>
                                        <th className="py-2 px-3 text-right">Issued Fine Wt</th>
                                        <th className="py-2 px-3 text-right">Received Fine Wt</th>
                                        <th className="py-2 px-3 text-right">Approved Wastage Fine</th>
                                        <th className="py-2 px-3 text-right">Closing Fine Wt</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 font-medium">
                                      {(material_report?.gold_by_purity || []).length === 0 ? (
                                        <tr><td colSpan="6" className="py-3 text-center text-stone-400 italic">No gold movement during this period.</td></tr>
                                      ) : (
                                        material_report.gold_by_purity.map((g, idx) => {
                                          const outFine = Number(g.issued_fine || 0) - Number(g.received_fine || 0) - Number(g.wastage_fine || 0);
                                          return (
                                            <tr key={idx} className="hover:bg-stone-50/50">
                                              <td className="py-2 px-3 font-bold text-stone-900">{g.purity}</td>
                                              <td className="py-2 px-3 text-right font-mono text-stone-600">{Number(g.touch || 0).toFixed(2)}%</td>
                                              <td className="py-2 px-3 text-right font-mono text-stone-800">
                                                {Number(g.issued_fine || 0).toFixed(3)}g
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono text-emerald-700">
                                                {Number(g.received_fine || 0).toFixed(3)}g
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono text-stone-600">
                                                {Number(g.wastage_fine || 0).toFixed(3)}g
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">
                                                {outFine < 0 ? (
                                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                    Excess Returned: {outFine.toFixed(3)}g
                                                  </span>
                                                ) : (
                                                  <span>{outFine.toFixed(3)}g</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-stone-50/80 font-bold border-t border-stone-200 text-stone-900">
                                        <td className="py-2 px-3">Period Movement Total</td>
                                        <td></td>
                                        <td className="py-2 px-3 text-right font-mono text-stone-900">{Number(material_report?.period_gold_issued_fine || 0).toFixed(3)}g</td>
                                        <td className="py-2 px-3 text-right font-mono text-emerald-800">{Number(material_report?.period_gold_received_fine || 0).toFixed(3)}g</td>
                                        <td className="py-2 px-3 text-right font-mono text-stone-700">{Number(material_report?.period_gold_wastage_fine || 0).toFixed(3)}g</td>
                                        <td className="py-2 px-3 text-right font-mono text-[#b01622] font-extrabold">
                                          {isGoldNegative ? (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                              Closing Balance: {closingGold.toFixed(3)}g (Excess Returned)
                                            </span>
                                          ) : (
                                            <span>Closing: {closingGold.toFixed(3)}g</span>
                                          )}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>

                                {/* Closing Diamond, Silver & Stone Balances Strip */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-stone-100/70 p-2.5 rounded-xl border border-stone-200 text-xs">
                                  <div className="flex items-center justify-between px-2">
                                    <span className="text-[10px] text-stone-500 font-bold uppercase">Closing Diamonds:</span>
                                    <span className="font-mono font-extrabold text-blue-900">
                                      {Number(material_report?.closing_diamond_carats || 0).toFixed(3)} ct
                                      <span className="text-[11px] font-semibold text-stone-600 ml-1">
                                        ({material_report?.closing_diamond_pieces || 0} pcs)
                                      </span>
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between px-2 sm:border-l border-stone-200">
                                    <span className="text-[10px] text-stone-500 font-bold uppercase">Closing Silver:</span>
                                    <span className="font-mono font-bold text-stone-800">
                                      {Number(material_report?.closing_silver_weight || 0).toFixed(3)}g
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between px-2 sm:border-l border-stone-200">
                                    <span className="text-[10px] text-stone-500 font-bold uppercase">Closing Stones:</span>
                                    <span className="font-mono font-bold text-emerald-800">
                                      {Number(material_report?.closing_stone_weight || 0).toFixed(3)} ct/g
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* SECTION B: FINANCIAL ACCOUNTING REPORT */}
                            {(karigarSubTab === 'both' || karigarSubTab === 'financial') && (
                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span>Financial & Making Charges Accounting</span>
                                  </h4>
                                  <span className="text-[11px] text-stone-400 font-medium">Formula: Closing = Opening + MC Earned - Paid - Advances</span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200/80 text-center text-xs">
                                  <div>
                                    <span className="text-[10px] text-stone-400 uppercase font-semibold">Opening Payable</span>
                                    <p className="font-mono font-bold text-stone-900 mt-0.5">
                                      {formatINR(financial_report?.opening_net_payable)}
                                    </p>
                                  </div>
                                  <div className="border-l border-stone-200">
                                    <span className="text-[10px] text-stone-400 uppercase font-semibold">+ MC Earned</span>
                                    <p className="font-mono font-bold text-stone-900 mt-0.5">
                                      +{formatINR(financial_report?.period_earned)}
                                    </p>
                                  </div>
                                  <div className="border-l border-stone-200">
                                    <span className="text-[10px] text-stone-400 uppercase font-semibold">- Payments Settled</span>
                                    <p className="font-mono font-bold text-emerald-700 mt-0.5">
                                      -{formatINR(financial_report?.period_paid)}
                                    </p>
                                  </div>
                                  <div className="border-l border-stone-200">
                                    <span className="text-[10px] text-stone-400 uppercase font-semibold">- Advances Paid</span>
                                    <p className="font-mono font-bold text-amber-700 mt-0.5">
                                      -{formatINR(financial_report?.period_advances)}
                                    </p>
                                  </div>
                                  <div className="border-l border-stone-200 bg-white rounded-lg p-1">
                                    <span className="text-[10px] text-stone-600 uppercase font-bold">= Net Closing Payable</span>
                                    <p className={`font-mono font-extrabold text-sm mt-0.5 ${
                                      closingPayable > 0 ? 'text-rose-600' : closingPayable < 0 ? 'text-amber-700' : 'text-emerald-700'
                                    }`}>
                                      {formatINR(closingPayable)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Collapsible Period Transactions Audit Accordion */}
                            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                              <span className="text-[11px] text-stone-500">
                                Recorded <strong>{(material_transactions || []).length}</strong> material movement(s) & <strong>{(financial_transactions || []).length}</strong> financial transaction(s) this period.
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleKarigarLog(karigar.id)}
                                className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`}></i>
                                <span>{isExpanded ? 'Hide Transactions' : 'View Detailed Movements'}</span>
                              </button>
                            </div>

                            {/* Expanded Audit Log Tables */}
                            {isExpanded && (
                              <div className="space-y-4 pt-2 border-t border-stone-100 animate-fade-in">
                                <div>
                                  <h5 className="font-bold text-stone-800 text-[11px] uppercase tracking-wider mb-2">
                                    Material Movement Logs ({material_transactions.length})
                                  </h5>
                                  <div className="border border-stone-200 rounded-xl overflow-x-auto max-h-56 overflow-y-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead className="sticky top-0 bg-stone-50 text-stone-600 font-bold uppercase text-[9.5px]">
                                        <tr>
                                          <th className="py-2 px-3">Date</th>
                                          <th className="py-2 px-3">Type</th>
                                          <th className="py-2 px-3">Work Order</th>
                                          <th className="py-2 px-3">Item / Purity</th>
                                          <th className="py-2 px-3 text-right">Net Wt</th>
                                          <th className="py-2 px-3 text-right">Fine Wt</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-stone-100 font-medium">
                                        {material_transactions.length === 0 ? (
                                          <tr><td colSpan="6" className="py-3 text-center text-stone-400 italic">No material logs.</td></tr>
                                        ) : (
                                          material_transactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-stone-50/50">
                                              <td className="py-1.5 px-3 font-mono text-[11px] text-stone-500">{tx.transaction_date}</td>
                                              <td className="py-1.5 px-3">
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-stone-100 text-stone-700">
                                                  {tx.transaction_type.replace(/_/g, ' ')}
                                                </span>
                                              </td>
                                              <td className="py-1.5 px-3 font-mono font-semibold text-[#b01622]">
                                                {tx.work_order?.work_order_number || (tx.work_order_id ? `WO#${tx.work_order_id}` : 'Direct')}
                                              </td>
                                              <td className="py-1.5 px-3 font-medium text-stone-800">{tx.material_item || tx.purity || tx.material_type}</td>
                                              <td className="py-1.5 px-3 text-right font-mono text-stone-800">{Number(tx.net_weight || tx.weight || 0).toFixed(3)}g</td>
                                              <td className="py-1.5 px-3 text-right font-mono font-bold text-amber-800">
                                                {tx.material_type === 'gold' ? `${Number(tx.fine_weight || tx.company_gold_weight || 0).toFixed(3)}g` : '—'}
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                <div>
                                  <h5 className="font-bold text-stone-800 text-[11px] uppercase tracking-wider mb-2">
                                    Financial Settlements & Making Charges Logs ({financial_transactions.length})
                                  </h5>
                                  <div className="border border-stone-200 rounded-xl overflow-x-auto max-h-56 overflow-y-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead className="sticky top-0 bg-stone-50 text-stone-600 font-bold uppercase text-[9.5px]">
                                        <tr>
                                          <th className="py-2 px-3">Date</th>
                                          <th className="py-2 px-3">Type</th>
                                          <th className="py-2 px-3">Reference / Order</th>
                                          <th className="py-2 px-3 text-right">Amount (₹)</th>
                                          <th className="py-2 px-3">Payment Mode</th>
                                          <th className="py-2 px-3">Notes</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-stone-100 font-medium">
                                        {financial_transactions.length === 0 ? (
                                          <tr><td colSpan="6" className="py-3 text-center text-stone-400 italic">No financial transaction logs.</td></tr>
                                        ) : (
                                          financial_transactions.map((pay) => (
                                            <tr key={pay.id} className="hover:bg-stone-50/50">
                                              <td className="py-1.5 px-3 font-mono text-[11px] text-stone-500">{pay.transaction_date}</td>
                                              <td className="py-1.5 px-3">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                                  pay.transaction_type === 'payable' ? 'bg-amber-100 text-amber-900' :
                                                  pay.transaction_type === 'payment' ? 'bg-emerald-100 text-emerald-900' :
                                                  'bg-blue-100 text-blue-900'
                                                }`}>
                                                  {pay.transaction_type}
                                                </span>
                                              </td>
                                              <td className="py-1.5 px-3 font-mono font-semibold text-[#b01622]">
                                                {pay.work_order?.work_order_number || (pay.received_piece?.receive_order_number || 'Direct')}
                                              </td>
                                              <td className="py-1.5 px-3 text-right font-mono font-bold text-stone-900">{formatINR(pay.amount)}</td>
                                              <td className="py-1.5 px-3 uppercase text-[10px] text-stone-600 font-semibold">{pay.payment_mode || 'cash'}</td>
                                              <td className="py-1.5 px-3 text-stone-500 text-[11px]">{pay.notes || '—'}</td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3.5: Comprehensive Supplier Audit Ledger & Reconciliation */}
            {activeTab === 'supplier_ledger' && (
              <div className="w-full space-y-5">
                {/* Filter & Period Strip */}
                <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Period Type */}
                      <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-xl p-1 shadow-2xs">
                        {['monthly', 'yearly', 'custom'].map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setSupplierPeriodType(mode)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${
                              supplierPeriodType === mode
                                ? 'bg-[#b01622] text-white shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>

                      {/* Month Picker */}
                      {supplierPeriodType === 'monthly' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-stone-500 uppercase">Month:</span>
                          <select
                            value={supplierMonth}
                            onChange={(e) => setSupplierMonth(Number(e.target.value))}
                            className="bg-white border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#b01622]"
                          >
                            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((mName, idx) => (
                              <option key={idx + 1} value={idx + 1}>
                                {String(idx + 1).padStart(2, '0')} - {mName}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Year Picker */}
                      {(supplierPeriodType === 'monthly' || supplierPeriodType === 'yearly') && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-stone-500 uppercase">Year:</span>
                          <select
                            value={supplierYear}
                            onChange={(e) => setSupplierYear(Number(e.target.value))}
                            className="bg-white border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#b01622]"
                          >
                            {[2024, 2025, 2026, 2027].map(yr => (
                              <option key={yr} value={yr}>{yr}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Custom Date Range */}
                      {supplierPeriodType === 'custom' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={supplierStartDate}
                            onChange={(e) => setSupplierStartDate(e.target.value)}
                            className="bg-white border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800"
                          />
                          <span className="text-xs text-stone-400">to</span>
                          <input
                            type="date"
                            value={supplierEndDate}
                            onChange={(e) => setSupplierEndDate(e.target.value)}
                            className="bg-white border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800"
                          />
                        </div>
                      )}

                      {/* Supplier Selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-stone-500 uppercase">Supplier:</span>
                        <select
                          value={selectedSupplierReportId}
                          onChange={(e) => setSelectedSupplierReportId(e.target.value)}
                          className="bg-white border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800 max-w-xs focus:outline-none focus:border-[#b01622]"
                        >
                          <option value="all">All Suppliers ({supplierList.length})</option>
                          {supplierList.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.supplier_code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Purchase Type Filter */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-stone-500 uppercase">Category:</span>
                        <select
                          value={supplierPurchaseTypeFilter}
                          onChange={(e) => setSupplierPurchaseTypeFilter(e.target.value)}
                          className="bg-white border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#b01622]"
                        >
                          <option value="all">All Categories</option>
                          <option value="gold">Gold Bullion</option>
                          <option value="silver">Silver Bullion</option>
                          <option value="diamond">Diamonds</option>
                          <option value="finished">Finished Jewellery</option>
                        </select>
                      </div>

                      {/* Settlement Mode Filter */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-stone-500 uppercase">Mode:</span>
                        <select
                          value={supplierSettlementModeFilter}
                          onChange={(e) => setSupplierSettlementModeFilter(e.target.value)}
                          className="bg-white border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#b01622]"
                        >
                          <option value="all">All Modes</option>
                          <option value="monetary">Priced (Monetary ₹)</option>
                          <option value="metal">Unpriced (Metal Quantity)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={fetchSupplierMonthlyReport}
                        className="px-3.5 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Reload Supplier Report"
                      >
                        <i className={`fa-solid fa-rotate-right text-xs ${loadingSupplierReport ? 'fa-spin text-[#b01622]' : ''}`}></i>
                        <span>Refresh</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportSupplierExcel}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-file-excel text-xs"></i>
                        <span>Excel</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Overall Summary KPI Strip */}
                {(() => {
                  const s = supplierOverallSummary || {};
                  const opCash = Number(s.opening_cash ?? s.opening_cash_balance ?? 0);
                  const purCash = Number(s.purchases_cash ?? s.period_monetary_payable ?? s.period_monetary_purchased ?? 0);
                  const setCash = Number(s.settlements_cash ?? s.period_cash_settled ?? 0);
                  const clCash = Number(s.closing_cash ?? s.closing_cash_balance ?? 0);

                  const opGold = Number(s.opening_gold_fine ?? s.opening_fine_gold_24k ?? 0);
                  const purGold = Number(s.purchases_gold_fine ?? s.period_unpriced_gold_fine ?? 0);
                  const totGoldPurchasedFine = Number(s.total_gold_fine_purchased ?? purGold);
                  const totGoldGross = Number(s.total_gold_gross_purchased ?? 0);
                  const setGold = Number(s.settlements_gold_fine ?? s.period_gold_settled_24k ?? 0);
                  const clGold = Number(s.closing_gold_fine ?? s.closing_fine_gold_24k ?? 0);

                  const opSil = Number(s.opening_silver ?? s.opening_silver_weight ?? 0);
                  const purSil = Number(s.purchases_silver ?? 0);
                  const totSilPurchased = Number(s.total_silver_net_purchased ?? purSil);
                  const setSil = Number(s.settlements_silver ?? 0);
                  const clSil = Number(s.closing_silver ?? s.closing_silver_weight ?? 0);
                  const totDiaCts = Number(s.total_diamond_carats_purchased ?? 0);

                  const isCashDiffZero = Math.abs((opCash + purCash - setCash) - clCash) < 0.01;
                  const isGoldDiffZero = Math.abs((opGold + purGold - setGold) - clGold) < 0.001;
                  const isSilDiffZero = Math.abs((opSil + purSil - setSil) - clSil) < 0.001;

                  const allReconciled = s.reconciliation_status?.all_reconciled ?? s.reconciled_all ?? (isCashDiffZero && isGoldDiffZero && isSilDiffZero);

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-4 rounded-2xl shadow-sm border border-stone-700">
                      {/* Metric 1: 24K Pure Gold */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-amber-400/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">
                            {clGold > 0 ? '24K Gold Bullion Payable' : '24K Pure Gold Purchased'}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                            clGold > 0 ? 'bg-amber-400/10 text-amber-300' : (totGoldPurchasedFine > 0 ? 'bg-emerald-400/10 text-emerald-300' : 'bg-stone-500/10 text-stone-400')
                          }`}>
                            {clGold > 0 ? 'METAL DUE' : (totGoldPurchasedFine > 0 ? 'STOCK RECEIVED' : 'NO DUE')}
                          </span>
                        </div>
                        <div className="mt-1 text-lg font-mono font-extrabold text-amber-200">
                          {clGold > 0 ? `${clGold.toFixed(3)} g` : `${totGoldPurchasedFine.toFixed(3)} g`}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-1 font-mono flex items-center justify-between">
                          <span>Op: {opGold.toFixed(3)}g</span>
                          <span>+Pur: {(totGoldPurchasedFine > 0 ? totGoldPurchasedFine : purGold).toFixed(3)}g</span>
                          <span>-Set: {setGold.toFixed(3)}g</span>
                        </div>
                      </div>

                      {/* Metric 2: Silver / Diamonds */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-slate-300/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wider block">
                            {totDiaCts > 0 && clSil === 0 ? 'Diamonds Purchased' : 'Silver Bullion Payable'}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                            clSil > 0 ? 'bg-slate-300/10 text-slate-200' : (totDiaCts > 0 ? 'bg-cyan-400/10 text-cyan-300' : 'bg-stone-500/10 text-stone-400')
                          }`}>
                            {clSil > 0 ? 'SILVER DUE' : (totDiaCts > 0 ? 'DIAMONDS' : 'NO DUE')}
                          </span>
                        </div>
                        <div className="mt-1 text-lg font-mono font-extrabold text-slate-200">
                          {totDiaCts > 0 && clSil === 0 ? `${totDiaCts.toFixed(3)} ct` : `${clSil.toFixed(3)} g`}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-1 font-mono flex items-center justify-between">
                          <span>Op: {opSil.toFixed(3)}g</span>
                          <span>+Pur: {(totSilPurchased > 0 ? totSilPurchased : purSil).toFixed(3)}g</span>
                          <span>-Set: {setSil.toFixed(3)}g</span>
                        </div>
                      </div>

                      {/* Metric 3: Money Due (Cash Balance) */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-emerald-400/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">Net Cash Debt Payable</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-300 font-mono">MONETARY DUE</span>
                        </div>
                        <div className="mt-1 text-lg font-mono font-extrabold text-emerald-200">
                          {formatINR(clCash)}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-1 font-mono flex items-center justify-between">
                          <span>Op: {formatINR(opCash)}</span>
                          <span>+Pur: {formatINR(purCash)}</span>
                          <span>-Paid: {formatINR(setCash)}</span>
                        </div>
                      </div>

                      {/* Metric 4: Mathematical Reconciliation Integrity */}
                      <div className={`p-3 rounded-xl border transition-colors ${
                        allReconciled
                          ? 'bg-emerald-950/40 border-emerald-500/60'
                          : 'bg-rose-950/40 border-rose-500/60'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-300">
                            Reconciliation Integrity
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                            allReconciled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {allReconciled ? '100% RECONCILED' : 'DISCREPANCY'}
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-stone-200">
                          {allReconciled ? (
                            <span className="text-emerald-400 flex items-center gap-1.5">
                              <i className="fa-solid fa-circle-check text-sm"></i>
                              Opening + Purchases - Settlements = Closing
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1.5">
                              <i className="fa-solid fa-triangle-exclamation text-sm"></i>
                              Balance Mismatch Detected
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-1">
                          Strict mathematical equation verified across all suppliers &amp; metal balances.
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Supplier Ledgers Listing */}
                {loadingSupplierReport ? (
                  <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                    <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#b01622] mb-3"></i>
                    <p className="text-xs text-stone-500 font-semibold">Generating Supplier Monthly Audit Ledger...</p>
                  </div>
                ) : supplierReportData.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
                    <i className="fa-solid fa-file-invoice text-4xl mb-3 text-stone-300"></i>
                    <p className="text-sm font-bold text-stone-600">No Supplier Records Found</p>
                    <p className="text-xs text-stone-400 mt-1">Try expanding your period range or selecting a different supplier.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedSupplierData.map((item) => {
                      const s = item.supplier || {};
                      const op = item.opening_balance || {};
                      const pp = item.period_purchases || item.period_totals || {};
                      const ps = item.period_settlements || {};
                      const cl = item.closing_balance || {};
                      const rec = item.reconciliation || item.reconciliation_status || {};
                      const isExpanded = Boolean(expandedSupplierLogs[s.id]);

                      const opGold = Number(op.gold_fine_grams ?? op.gold_fine_24k ?? 0);
                      const ppGold = Number(pp.gold_fine_grams ?? pp.unpriced_gold_purchased_24k ?? 0);
                      const psGold = Number(ps.gold_fine_grams ?? pp.gold_settled_24k ?? 0);
                      const clGold = Number(cl.gold_fine_grams ?? cl.gold_fine_24k ?? 0);
                      const isGoldReconciled = rec.gold_reconciled !== undefined
                        ? Boolean(rec.gold_reconciled)
                        : (Math.abs((opGold + ppGold - psGold) - clGold) < 0.001);

                      // Physical metal & material totals received from supplier in period
                      const totGoldFine = Number(pp.total_gold_fine_24k ?? item.period_totals?.gold_fine_24k ?? ppGold);
                      const totGoldGross = Number(pp.total_gold_gross_wt ?? item.period_totals?.gold_gross_weight ?? 0);
                      const totGoldNet = Number(pp.total_gold_net_wt ?? item.period_totals?.gold_net_weight ?? 0);
                      const totSilGross = Number(pp.total_silver_gross_wt ?? item.period_totals?.silver_gross_weight ?? 0);
                      const totSilNet = Number(pp.total_silver_net_wt ?? item.period_totals?.silver_net_weight ?? 0);
                      const totDiaCarats = Number(pp.diamond_carats ?? item.period_totals?.diamond_carats ?? 0);
                      const totDiaPieces = Number(pp.diamond_pieces ?? item.period_totals?.diamond_stones ?? 0);
                      const goldPurities = item.breakdowns?.gold_by_purity || [];
                      const diamondStamps = item.breakdowns?.diamonds_by_stamp || [];

                      const opSil = Number(op.silver_grams ?? op.silver_weight ?? 0);
                      const ppSil = Number(pp.silver_grams ?? pp.unpriced_silver_purchased ?? 0);
                      const psSil = Number(ps.silver_grams ?? pp.silver_settled ?? 0);
                      const clSil = Number(cl.silver_grams ?? cl.silver_weight ?? 0);
                      const isSilverReconciled = rec.silver_reconciled !== undefined
                        ? Boolean(rec.silver_reconciled)
                        : (Math.abs((opSil + ppSil - psSil) - clSil) < 0.001);

                      const opCash = Number(op.cash_balance ?? op.cash_payable ?? 0);
                      const ppCash = Number(pp.cash_balance ?? pp.monetary_new_payable ?? 0);
                      const psCash = Number(ps.cash_paid ?? pp.cash_settled ?? 0);
                      const clCash = Number(cl.cash_balance ?? cl.cash_payable ?? 0);
                      const isCashReconciled = rec.cash_reconciled !== undefined
                        ? Boolean(rec.cash_reconciled)
                        : (Math.abs((opCash + ppCash - psCash) - clCash) < 0.01);

                      const isPerfect = rec.is_perfect !== undefined
                        ? Boolean(rec.is_perfect)
                        : (rec.all_reconciled ?? (cl.reconciled ?? (isGoldReconciled && isSilverReconciled && isCashReconciled)));

                      const purchasesCount = (item.purchases || []).length || pp.count || 0;
                      const settlementsCount = (item.settlements || []).length || ps.count || 0;

                      return (
                        <div
                          key={s.id}
                          className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden transition-all"
                        >
                          {/* Supplier Header Bar */}
                          <div className="p-4 bg-stone-50/70 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#b01622]/10 text-[#b01622] flex items-center justify-center text-base font-bold">
                                <i className="fa-solid fa-truck-field"></i>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-extrabold text-stone-900">{s.name}</h3>
                                  <span className="font-mono text-[10px] font-bold text-[#b01622] bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                    {s.supplier_code}
                                  </span>
                                  {isPerfect ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                      <i className="fa-solid fa-check text-[9px]"></i>
                                      Reconciled
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1">
                                      <i className="fa-solid fa-exclamation text-[9px]"></i>
                                      Mismatch
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2.5 flex-wrap">
                                  {s.company_name && <span>{s.company_name}</span>}
                                  {s.phone && <span>&bull; {s.phone}</span>}
                                  <span>&bull; Purchases in Period: <strong className="text-stone-800">{purchasesCount}</strong></span>
                                  <span>&bull; Settlements in Period: <strong className="text-stone-800">{settlementsCount}</strong></span>
                                  {totGoldFine > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1 font-mono">
                                      <i className="fa-solid fa-cube text-amber-600 text-[9px]"></i>
                                      Gold: {totGoldFine.toFixed(3)}g 24K ({totGoldNet.toFixed(3)}g Net)
                                    </span>
                                  )}
                                  {totSilNet > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300 font-mono">
                                      Silver: {totSilNet.toFixed(3)}g
                                    </span>
                                  )}
                                  {totDiaCarats > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-300 font-mono">
                                      Dia: {totDiaCarats.toFixed(3)}ct ({totDiaPieces} pcs)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start md:self-auto">
                              <button
                                type="button"
                                onClick={() => setSettlementSupplierId(s.id)}
                                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                title="Record Cash, Gold, or Silver Settlement to Supplier"
                              >
                                <i className="fa-solid fa-receipt text-emerald-600 text-[10px]"></i>
                                <span>Settle / Pay</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleSupplierLog(s.id)}
                                className="px-3.5 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <span>{isExpanded ? 'Hide Transactions' : 'View Transactions'}</span>
                                <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`}></i>
                              </button>
                            </div>
                          </div>

                          {/* 4-Column Accounting Balances Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse font-['Inter',sans-serif]">
                              <thead>
                                <tr className="bg-stone-100/60 text-stone-600 text-[10.5px] uppercase font-bold border-b border-stone-200">
                                  <th className="py-2.5 px-4">Account / Material Unit</th>
                                  <th className="py-2.5 px-4 text-right">Opening Balance</th>
                                  <th className="py-2.5 px-4 text-right">Period Purchases (+)</th>
                                  <th className="py-2.5 px-4 text-right">Period Settlements (-)</th>
                                  <th className="py-2.5 px-4 text-right">Closing Balance</th>
                                  <th className="py-2.5 px-4 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100 font-medium">
                                {/* Row 1: 24K Pure Gold */}
                                <tr className="hover:bg-stone-50/50">
                                  <td className="py-2.5 px-4 text-amber-950">
                                    <div className="font-bold flex items-center gap-1.5">
                                      <i className="fa-solid fa-cube text-amber-600 text-[11px]"></i>
                                      24K Pure Gold Fine Weight (g)
                                    </div>
                                    {totGoldNet > 0 && (
                                      <div className="text-[10px] text-stone-500 font-mono pl-4 mt-0.5">
                                        Physical Metal Received: Gross {totGoldGross.toFixed(3)}g &bull; Net {totGoldNet.toFixed(3)}g
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-stone-700">
                                    {opGold.toFixed(3)} g
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <span className="font-mono font-bold text-amber-900 block">
                                      +{(totGoldFine > 0 ? totGoldFine : ppGold).toFixed(3)} g
                                    </span>
                                    {ppCash > 0 && ppGold === 0 && (
                                      <span className="text-[9.5px] font-bold text-emerald-700 block font-mono">
                                        Priced (₹{formatINR(ppCash)})
                                      </span>
                                    )}
                                    {ppGold > 0 && (
                                      <span className="text-[9.5px] font-bold text-amber-700 block font-mono">
                                        Unpriced Bullion Due: +{ppGold.toFixed(3)}g
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                                    <span>-{psGold.toFixed(3)} g</span>
                                    {ppCash > 0 && psGold === 0 && (
                                      <span className="text-[9.5px] text-stone-400 block font-sans font-normal">
                                        Settled via Cash Bill
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <span className="font-mono font-extrabold text-amber-950 text-sm block">
                                      {clGold.toFixed(3)} g
                                    </span>
                                    {clGold === 0 && totGoldFine > 0 && (
                                      <span className="text-[9.5px] text-emerald-600 font-semibold block">
                                        Metal Stocked (Cash Debt)
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      isGoldReconciled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                      {isGoldReconciled ? 'Reconciled' : 'Mismatch'}
                                    </span>
                                  </td>
                                </tr>

                                {/* Row 1B: Breakdown of Purities Purchased in Period (e.g. 24K, 22K, 18K) */}
                                {goldPurities.map((gb, gbIdx) => (
                                  <tr key={`purity-${gbIdx}`} className="hover:bg-amber-50/40 bg-amber-50/15 text-[11.5px]">
                                    <td className="py-2 px-4 pl-7 text-stone-800">
                                      <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                        <span className="font-bold text-stone-900">Gold Karat: {gb.purity}</span>
                                        <span className="text-[10px] text-stone-500 font-mono">({gb.count} {gb.count === 1 ? 'entry' : 'entries'})</span>
                                      </div>
                                      <div className="text-[10px] text-stone-500 font-mono pl-3.5">
                                        Gross: {Number(gb.gross_weight).toFixed(3)}g &bull; Net: {Number(gb.net_weight).toFixed(3)}g
                                      </div>
                                    </td>
                                    <td className="py-2 px-4 text-right font-mono text-stone-400 text-xs">—</td>
                                    <td className="py-2 px-4 text-right font-mono font-bold text-amber-950 text-xs">
                                      +{Number(gb.fine_weight_24k).toFixed(3)} g (24K)
                                    </td>
                                    <td className="py-2 px-4 text-right font-mono text-stone-400 text-xs">—</td>
                                    <td className="py-2 px-4 text-right font-mono font-bold text-stone-800 text-xs">
                                      {gb.total_amount > 0 ? formatINR(gb.total_amount) : `${Number(gb.fine_weight_24k).toFixed(3)}g Metal`}
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-900 border-amber-300">
                                        Vault Stocked
                                      </span>
                                    </td>
                                  </tr>
                                ))}

                                {/* Row 2: Silver Bullion (only if silver balance exists or silver was purchased) */}
                                {(opSil > 0 || ppSil > 0 || psSil > 0 || clSil > 0 || totSilNet > 0) && (
                                  <tr className="hover:bg-stone-50/50">
                                    <td className="py-2.5 px-4 text-slate-800">
                                      <div className="font-bold flex items-center gap-1.5">
                                        <i className="fa-solid fa-coins text-slate-500 text-[11px]"></i>
                                        Silver Bullion Weight (g)
                                      </div>
                                      {totSilNet > 0 && (
                                        <div className="text-[10px] text-stone-500 font-mono pl-4 mt-0.5">
                                          Physical Silver: Net {totSilNet.toFixed(3)}g {totSilGross > 0 ? `• Gross ${totSilGross.toFixed(3)}g` : ''}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono text-stone-700">
                                      {opSil.toFixed(3)} g
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                      +{(totSilNet > 0 ? totSilNet : ppSil).toFixed(3)} g
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                                      -{psSil.toFixed(3)} g
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono font-extrabold text-slate-900 text-sm">
                                      {clSil.toFixed(3)} g
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                        isSilverReconciled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                      }`}>
                                        {isSilverReconciled ? 'Reconciled' : 'Mismatch'}
                                      </span>
                                    </td>
                                  </tr>
                                )}

                                {/* Row 3: Diamonds */}
                                {(totDiaCarats > 0 || totDiaPieces > 0) && (
                                  <tr className="hover:bg-stone-50/50 bg-cyan-50/10">
                                    <td className="py-2.5 px-4 font-bold text-cyan-900 flex items-center gap-1.5">
                                      <i className="fa-solid fa-gem text-cyan-600 text-[11px]"></i>
                                      Diamonds Purchased in Period
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono text-stone-400">—</td>
                                    <td className="py-2.5 px-4 text-right font-mono font-bold text-cyan-900">
                                      +{totDiaCarats.toFixed(3)} ct ({totDiaPieces} pcs)
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono text-stone-400">—</td>
                                    <td className="py-2.5 px-4 text-right font-mono font-extrabold text-cyan-950 text-sm">
                                      {totDiaCarats.toFixed(3)} ct
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-cyan-50 text-cyan-800 border-cyan-200">
                                        Vault Stocked
                                      </span>
                                    </td>
                                  </tr>
                                )}

                                {/* Row 4: Monetary Cash Balance */}
                                <tr className="hover:bg-stone-50/50 bg-stone-50/30">
                                  <td className="py-2.5 px-4 font-bold text-stone-900 flex items-center gap-1.5">
                                    <i className="fa-solid fa-indian-rupee-sign text-emerald-600 text-[11px]"></i>
                                    Priced Money Payable (₹)
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-stone-700 font-semibold">
                                    {formatINR(opCash)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-stone-900">
                                    +{formatINR(ppCash)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                                    -{formatINR(psCash)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-extrabold text-[#b01622] text-sm">
                                    {formatINR(clCash)}
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      isCashReconciled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                      {isCashReconciled ? 'Reconciled' : 'Mismatch'}
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Expandable Itemized Purchases & Settlements Tables */}
                          {isExpanded && (
                            <div className="p-4 bg-stone-50/50 border-t border-stone-200 space-y-4 animate-fade-in">
                              {/* 1. Period Purchases */}
                              <div>
                                <h4 className="text-xs font-bold text-stone-800 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                  <i className="fa-solid fa-bag-shopping text-stone-600"></i>
                                  Itemized Purchases ({(item.purchases || []).length} Entries)
                                </h4>
                                {(item.purchases || []).length === 0 ? (
                                  <p className="text-xs text-stone-400 italic">No purchases recorded in this period.</p>
                                ) : (
                                  <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-stone-100/70 text-stone-600 text-[10.5px] uppercase font-bold border-b border-stone-200">
                                          <th className="py-2 px-3">Purchase No</th>
                                          <th className="py-2 px-3">Date</th>
                                          <th className="py-2 px-3">Type</th>
                                          <th className="py-2 px-3 text-right">Net Wt</th>
                                          <th className="py-2 px-3">Purity</th>
                                          <th className="py-2 px-3 text-right">Fine 24K Wt</th>
                                          <th className="py-2 px-3 text-right">Rate</th>
                                          <th className="py-2 px-3 text-right">Amount (₹)</th>
                                          <th className="py-2 px-3 text-center">Mode</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-stone-100">
                                        {(item.purchases || []).map((p, pIdx) => {
                                          const pRate = parseFloat(p.rate || 0);
                                          return (
                                            <tr key={pIdx} className="hover:bg-stone-50">
                                              <td className="py-2 px-3 font-mono font-bold text-stone-900">{p.purchase_no}</td>
                                              <td className="py-2 px-3 font-mono text-stone-600">{p.purchase_date}</td>
                                              <td className="py-2 px-3 font-medium text-stone-800 capitalize">{p.purchase_type?.replace(/_/g, ' ')}</td>
                                              <td className="py-2 px-3 text-right font-mono font-bold">{Number(p.net_weight || p.weight || 0).toFixed(3)} {p.unit || 'g'}</td>
                                              <td className="py-2 px-3 font-medium text-stone-700">{p.purity || '—'}</td>
                                              <td className="py-2 px-3 text-right font-mono font-bold text-amber-900">{Number(p.fine_weight || 0).toFixed(3)} g</td>
                                              <td className="py-2 px-3 text-right font-mono text-stone-700">{pRate > 0 ? `₹${pRate.toLocaleString('en-IN')}` : '—'}</td>
                                              <td className="py-2 px-3 text-right font-mono font-extrabold text-stone-900">{pRate > 0 ? formatINR(p.total_amount) : '—'}</td>
                                              <td className="py-2 px-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                  pRate <= 0 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                                }`}>
                                                  {pRate <= 0 ? 'Metal Due' : 'Monetary'}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* 2. Period Settlements */}
                              <div>
                                <h4 className="text-xs font-bold text-stone-800 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                  <i className="fa-solid fa-receipt text-stone-600"></i>
                                  Itemized Settlements &amp; Deliveries ({(item.settlements || []).length} Records)
                                </h4>
                                {(item.settlements || []).length === 0 ? (
                                  <p className="text-xs text-stone-400 italic">No settlements recorded in this period.</p>
                                ) : (
                                  <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-stone-100/70 text-stone-600 text-[10.5px] uppercase font-bold border-b border-stone-200">
                                          <th className="py-2 px-3">Voucher / ID</th>
                                          <th className="py-2 px-3">Date</th>
                                          <th className="py-2 px-3">Settlement Type</th>
                                          <th className="py-2 px-3 text-right">Settled Amount / Weight</th>
                                          <th className="py-2 px-3">Payment Mode</th>
                                          <th className="py-2 px-3">Reference No</th>
                                          <th className="py-2 px-3">Notes</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-stone-100">
                                        {(item.settlements || []).map((st, sIdx) => (
                                          <tr key={sIdx} className="hover:bg-stone-50">
                                            <td className="py-2 px-3 font-mono font-bold text-stone-900">{st.voucher_number || `#${st.id}`}</td>
                                            <td className="py-2 px-3 font-mono text-stone-600">{st.settlement_date}</td>
                                            <td className="py-2 px-3 capitalize font-bold text-stone-800">
                                              <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                                                st.settlement_type === 'gold' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                                st.settlement_type === 'silver' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                                                'bg-emerald-50 text-emerald-800 border-emerald-300'
                                              }`}>
                                                {st.settlement_type}
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-extrabold text-stone-900">
                                              {st.settlement_type === 'gold' && `${Number(st.gold_fine_weight || st.gold_weight || 0).toFixed(3)}g 24K`}
                                              {st.settlement_type === 'silver' && `${Number(st.silver_weight || 0).toFixed(3)}g Silver`}
                                              {st.settlement_type === 'cash' && formatINR(st.cash_amount)}
                                            </td>
                                            <td className="py-2 px-3 font-medium text-stone-700 capitalize">{st.payment_mode?.replace(/_/g, ' ') || '—'}</td>
                                            <td className="py-2 px-3 font-mono text-[11px] text-stone-600">{st.reference_number || '—'}</td>
                                            <td className="py-2 px-3 text-stone-500 italic text-[11px] max-w-xs truncate">{st.notes || '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Supplier Purchase Report */}
            {activeTab === 'purchase' && (
              <table className="w-full text-left text-xs border-collapse font-['Inter',sans-serif] min-w-[1200px]">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600 font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3.5 px-4 text-center w-14 whitespace-nowrap">S.No</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Purchase No</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Supplier Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Payment Due</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Purchased Wt &amp; Purity</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">24K Pure Equiv Wt</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Rate</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Total Bill</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Paid Amt</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Outstanding Balance</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Status</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {(reportData.purchases || []).length === 0 ? (
                    <tr><td colSpan="13" className="py-8 text-center text-stone-400">No purchase entry records found.</td></tr>
                  ) : (
                    reportData.purchases.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono text-stone-500 font-semibold">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-800 whitespace-nowrap">{row.purchase_no}</td>
                        <td className="py-3.5 px-4 font-bold text-stone-900 whitespace-nowrap">{row.supplier_name}</td>
                        <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px] whitespace-nowrap">{row.purchase_date}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono text-[11px] font-bold text-stone-800">{row.due_date || '—'}</div>
                          <div className="mt-0.5">{getDueBadge(row)}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-stone-800">{row.net_weight || row.weight}g</span>{' '}
                          <span className="text-[10px] text-stone-500 font-bold">({row.purity})</span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-mono font-bold text-xs">
                            <i className="fa-solid fa-cube text-[10px] text-amber-600"></i>
                            {row.fine_weight_24k || row.fine_weight || 0}g
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold whitespace-nowrap">
                          {row.rate > 0 ? (
                            <span className="text-stone-800">₹{parseFloat(row.rate).toLocaleString('en-IN')}/g</span>
                          ) : (
                            <span className="text-amber-700 italic text-[11px] font-bold">Unfixed (Metal)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold whitespace-nowrap">
                          {row.payable_type === 'gold' ? (
                            <span className="text-stone-400 font-normal italic">—</span>
                          ) : (
                            <span className="text-stone-900 text-sm">{formatINR(row.total_amount)}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                          {row.payable_type === 'gold' ? (
                            <span className="text-stone-400 font-normal italic">—</span>
                          ) : (
                            <span className="text-emerald-700">{formatINR(row.paid_amount || 0)}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                          {row.payable_type === 'gold' ? (
                            <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {row.outstanding_display || `${row.gold_balance || row.fine_weight_24k}g 24K`}
                            </span>
                          ) : (
                            <span className={parseFloat(row.balance_amount) > 0 ? 'text-red-600 font-extrabold' : 'text-stone-400'}>
                              {formatINR(row.balance_amount || 0)}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block whitespace-nowrap uppercase ${
                            row.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            row.payment_status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            row.payable_type === 'gold' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {row.payable_type === 'gold' ? 'Gold Payable' : (row.payment_status || 'unpaid')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {row.payable_type === 'gold' ? (
                            <button
                              type="button"
                              onClick={() => setConvertPurchaseModal(row)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Fix Rate &amp; Convert Gold Due to Money Due"
                            >
                              <i className="fa-solid fa-scale-balanced text-[10px]"></i>
                              <span>Fix Rate</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(row)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-stone-300 hover:bg-[#b01622] hover:text-white hover:border-[#b01622] text-stone-700 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Update Payment Amount &amp; Status"
                            >
                              <i className="fa-solid fa-credit-card text-xs"></i>
                              <span>Update</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* TAB 6: Daily Gold Rates Report */}
            {activeTab === 'gold_rates' && (
              <div className="w-full">
                {/* Gold Rate Action Bar */}
                <div className="p-3 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-stone-800 uppercase tracking-wider font-['Inter',sans-serif]">
                      Daily Showroom Metal Rates Archive
                    </span>
                    <span className="text-[11px] text-stone-500 font-mono">({goldRates.length} records)</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowGoldRateModal(true)}
                      className="px-3 py-1.5 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="fa-solid fa-plus text-xs"></i>
                      <span>Record Today's Rate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowGoldRatePrintModal(true)}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="fa-solid fa-print text-xs text-amber-400"></i>
                      <span>Print Rate Statement</span>
                    </button>
                  </div>
                </div>

                <table className="w-full text-left text-xs border-collapse font-['Inter',sans-serif] min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600 font-bold uppercase tracking-wider text-[10.5px]">
                      <th className="py-3.5 px-4 text-center w-14 whitespace-nowrap">S.No</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">24K (1g)</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">22K (1g)</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">18K (1g)</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">14K (1g)</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">Silver (1g)</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">24K (10g)</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">22K (10g)</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Source</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Last Updated</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Notes</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {goldRatesLoading ? (
                      <tr><td colSpan="13" className="py-8 text-center text-stone-400">Loading daily metal rates...</td></tr>
                    ) : goldRates.length === 0 ? (
                      <tr><td colSpan="13" className="py-8 text-center text-stone-400">No daily metal rates recorded for the selected period.</td></tr>
                    ) : (
                      goldRates.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono text-stone-500 font-semibold">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">{row.rate_date}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-900 whitespace-nowrap">{formatINR(row.gold_24k_1g)}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#b01622] whitespace-nowrap">{formatINR(row.gold_22k_1g)}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-stone-700 whitespace-nowrap">{formatINR(row.gold_18k_1g)}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-stone-700 whitespace-nowrap">{formatINR(row.gold_14k_1g)}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-700 whitespace-nowrap">{formatINR(row.silver_1g)}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-stone-500 whitespace-nowrap">{formatINR(row.gold_24k_10g)}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-stone-500 whitespace-nowrap">{formatINR(row.gold_22k_10g)}</td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                              (row.source || '').toLowerCase().includes('manual')
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}>
                              {row.source || 'manual'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-[10.5px] text-stone-500 whitespace-nowrap">
                            {row.updated_at ? new Date(row.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-stone-500 text-[11px] max-w-xs truncate">{row.notes || '—'}</td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteGoldRate(row.id)}
                              className="w-7 h-7 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center mx-auto transition-colors cursor-pointer"
                              title="Delete Rate Record"
                            >
                              <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 5: GST & Tax Compliance Report */}
            {activeTab === 'gst' && (
              <table className="w-full text-left text-xs border-collapse font-['Inter',sans-serif] min-w-[950px]">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600 font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3.5 px-4 text-center w-14 whitespace-nowrap">S.No</th>
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
                    <tr><td colSpan="9" className="py-8 text-center text-stone-400">No GST tax records available.</td></tr>
                  ) : (
                    reportData.sales.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono text-stone-500 font-semibold">{idx + 1}</td>
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
        {!loading && activeTab !== 'gold_rates' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-t border-stone-200/80 bg-stone-50/50 font-['Inter',sans-serif]">
            <div className="text-xs text-stone-600 font-medium">
              Showing <span className="font-bold text-stone-900">{activePagination.from || 0}</span> to{' '}
              <span className="font-bold text-stone-900">{activePagination.to || 0}</span> of{' '}
              <span className="font-bold text-stone-900">{activePagination.total || 0}</span> records
            </div>

            {/* Dynamic Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={activePagination.current_page <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-300 disabled:opacity-40 text-stone-600 hover:bg-stone-100 text-xs transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i>
              </button>

              {Array.from({ length: activePagination.last_page || 1 }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold cursor-pointer ${activePagination.current_page === pageNum
                    ? 'bg-[#b01622] text-white'
                    : 'border border-stone-300 text-stone-700 hover:bg-stone-100'
                    }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={activePagination.current_page >= activePagination.last_page}
                onClick={() => setCurrentPage((prev) => Math.min(activePagination.last_page, prev + 1))}
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
        <div
          className="fixed inset-0 z-50 overflow-y-auto p-4 md:p-8 bg-stone-900/60 backdrop-blur-xs flex justify-center items-start print:p-0 print:bg-white print:static print:inset-auto print:block print:overflow-visible print:h-auto print:w-full print:filter-none print:backdrop-filter-none cursor-pointer"
          onClick={() => setShowPrintModal(false)}
        >
          <style>{`
            @media print {
              body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .print\\:hidden, .no-print, header, nav, sidebar, button {
                display: none !important;
              }
              #printable-executive-report {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 10mm !important;
                background: white !important;
                border: none !important;
                box-shadow: none !important;
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 999999 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #printable-executive-report * {
                visibility: visible !important;
                opacity: 1 !important;
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
                margin: 0 !important;
              }
            }
          `}</style>

          {/* Screen Floating Close X Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPrintModal(false);
            }}
            className="fixed top-5 right-6 z-[100] print:hidden bg-stone-900 hover:bg-stone-800 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-2xl cursor-pointer border border-stone-700 transition-transform hover:scale-105"
            title="Close Statement Modal (Esc)"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
          
          <div
            id="printable-executive-report"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-8 my-4 md:my-8 space-y-6 text-stone-800 font-['Inter',sans-serif] border border-stone-200 relative print:p-0 print:my-0 print:border-0 print:shadow-none print:max-w-full print:rounded-none cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Bar for Screen & Print View (Scrollable & Non-Sticky) */}
            <div className="relative bg-white border-b-2 border-[#b01622] pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src="/logo.png"
                  alt="Rudra Jewellery Logo"
                  className="h-14 sm:h-16 w-auto object-contain shrink-0 drop-shadow-xs"
                />
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#b01622] uppercase tracking-wider font-['Inter',sans-serif]">
                    {companyInfo?.company_name || 'Rudra Jewellery'}
                  </h2>
                  <p className="text-xs font-bold text-stone-700 mt-0.5">
                    {companyInfo?.tagline || 'Certified Executive Business Audit & Tax Compliance Statement'}
                  </p>
                  <p className="text-[11px] font-semibold text-stone-500 mt-0.5">
                    GSTIN: {companyInfo?.gstin || 'N/A'} | Reg No: {companyInfo?.reg_no || 'N/A'} | Period Filter: <span className="uppercase text-stone-800 font-bold">{period}</span>
                  </p>
                </div>
              </div>

              {/* Header Action Buttons (Strictly Hidden When Printing) */}
              <div className="flex items-center gap-2 print:hidden shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    printElement('printable-executive-report', 'Audit & Financial Statement - Rudra Jewellery');
                  }}
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
            <div className="report-section grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs">
              <div className="border-r border-stone-200 pr-2">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Total Revenue</span>
                <span className="font-extrabold font-mono text-stone-900 text-sm">{summary.totalSalesRevenueFormatted || '₹0'}</span>
              </div>
              <div className="border-r border-stone-200 pr-2 pl-1">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">3% GST Tax</span>
                <span className="font-extrabold font-mono text-[#b01622] text-sm">{summary.totalGstTaxFormatted || '₹0'}</span>
              </div>
              <div className="border-r border-stone-200 pr-2 pl-1">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Inventory Stock</span>
                <span className="font-extrabold font-mono text-stone-900 text-sm">{summary.inventoryValuationFormatted || '₹0'}</span>
              </div>
              <div className="border-r border-stone-200 pr-2 pl-1">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Metal Vault</span>
                <span className="font-extrabold font-mono text-purple-700 text-sm">{summary.totalAllottedGold || 0}g</span>
              </div>
              <div className="border-r border-stone-200 pr-2 pl-1">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Supplier Spend (₹)</span>
                <span className="font-extrabold font-mono text-stone-900 text-sm">{summary.totalPurchaseSpendFormatted || '₹0'}</span>
              </div>
              <div className="pl-1">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Gold Purchased (24K)</span>
                <span className="font-extrabold font-mono text-amber-700 text-sm">{summary.totalGoldPurchased24kFormatted || '0.000 g'}</span>
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
                      <th className="py-2 px-3 text-center w-12">S.No</th>
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
                          <td className="py-2 px-3 text-center font-mono text-stone-500 font-semibold">{idx + 1}</td>
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
                        <td colSpan="9" className="py-3 text-center text-stone-400 italic">No sales transaction records found for selected period</td>
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
                  2. Category &amp; Stock Summary
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700 border border-stone-200 rounded-lg overflow-hidden">
                  <thead className="bg-stone-100 text-stone-800 text-[10.5px] uppercase font-bold border-b border-stone-200">
                    <tr>
                      <th className="py-2 px-3 text-center w-12">S.No</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Product Title</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Purity</th>
                      <th className="py-2 px-3 text-right">Gross Wt</th>
                      <th className="py-2 px-3 text-right">Net Wt</th>
                      <th className="py-2 px-3 text-right">Dia Wt</th>
                      <th className="py-2 px-3 text-right">Stock Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-[11px]">
                    {(reportData.inventory || []).length > 0 ? (
                      reportData.inventory.map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="py-2 px-3 text-center font-mono text-stone-500 font-semibold">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-stone-900">{item.sku}</td>
                          <td className="py-2 px-3 font-medium">{item.name}</td>
                          <td className="py-2 px-3 text-stone-600">{item.category}</td>
                          <td className="py-2 px-3 font-semibold text-amber-700">{item.purity}</td>
                          <td className="py-2 px-3 text-right font-mono">{Number(item.gross_weight || 0).toFixed(3)}g</td>
                          <td className="py-2 px-3 text-right font-mono">{Number(item.net_weight || 0).toFixed(3)}g</td>
                          <td className="py-2 px-3 text-right font-mono">{Number(item.diamond_weight || 0) > 0 ? `${Number(item.diamond_weight).toFixed(3)} ct` : '—'}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{item.stock_qty}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="py-3 text-center text-stone-400 italic">No inventory records found</td>
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
                      <th className="py-2 px-3 text-center w-12">S.No</th>
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
                          <td className="py-2 px-3 text-center font-mono text-stone-500 font-semibold">{idx + 1}</td>
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
                        <td colSpan="8" className="py-3 text-center text-stone-400 italic">No karigar work order records found</td>
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
                <p className="font-bold text-stone-800">{companyInfo?.company_name || 'Rudra Jewellery'}</p>
                <p className="text-[11px] text-stone-500">Corporate Office: {[companyInfo?.city, companyInfo?.state, 'India'].filter(Boolean).join(', ')}</p>
                <p className="text-[11px] text-stone-400 mt-1 font-mono">Statement Generated At: {new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <div className="border-b-2 border-stone-400 w-52 mb-1.5 ml-auto"></div>
                <span className="font-bold text-stone-800 uppercase tracking-wider block text-[11px]">Authorized Signatory &amp; Auditor</span>
                <span className="text-[10px] text-stone-400">Rudra Executive Audit Cell</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 7. Purchase Payment Status Updation Modal */}
      {paymentModalRow && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-stone-900/60 backdrop-blur-xs flex justify-center items-center">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-stone-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                  <i className="fa-solid fa-credit-card text-sm"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 font-['Inter',sans-serif]">Update Supplier Payment</h3>
                  <p className="text-[11px] text-stone-500 font-mono">{paymentModalRow.purchase_no} — {paymentModalRow.supplier_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalRow(null)}
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSavePaymentStatus} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <span className="text-[10px] text-stone-500 font-bold uppercase block">Total Bill</span>
                  <span className="text-sm font-mono font-extrabold text-stone-900">{formatINR(paymentModalRow.total_amount)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 font-bold uppercase block">Due Date</span>
                  <span className="text-xs font-mono font-bold text-stone-700">{paymentModalRow.due_date || 'No terms'}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                  Payment Status
                </label>
                <select
                  value={paymentStatusForm.payment_status}
                  onChange={(e) => {
                    const st = e.target.value;
                    let amt = paymentStatusForm.paid_amount;
                    if (st === 'paid') amt = paymentModalRow.total_amount;
                    if (st === 'unpaid') amt = 0;
                    setPaymentStatusForm(prev => ({ ...prev, payment_status: st, paid_amount: amt }));
                  }}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white text-xs font-semibold focus:outline-hidden focus:border-[#b01622]"
                >
                  <option value="unpaid">UNPAID (Pending Bill)</option>
                  <option value="partial">PARTIAL (Advance / Part Payment)</option>
                  <option value="paid">PAID (Settled In Full)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                  Exact Paid Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={paymentStatusForm.paid_amount}
                  onChange={(e) => {
                    const amt = parseFloat(e.target.value) || 0;
                    let st = paymentStatusForm.payment_status;
                    const tot = parseFloat(paymentModalRow.total_amount) || 0;
                    if (amt >= tot && tot > 0) st = 'paid';
                    else if (amt > 0) st = 'partial';
                    else st = 'unpaid';
                    setPaymentStatusForm(prev => ({ ...prev, paid_amount: e.target.value, payment_status: st }));
                  }}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono text-sm font-bold focus:outline-hidden focus:border-[#b01622]"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Dynamic Balance Computation Box */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <span className="font-bold text-stone-700">Remaining Balance:</span>
                <span className={`font-mono font-extrabold text-sm ${
                  (parseFloat(paymentModalRow.total_amount) - (parseFloat(paymentStatusForm.paid_amount) || 0)) > 0
                    ? 'text-red-700'
                    : 'text-emerald-700'
                }`}>
                  {formatINR(Math.max(0, (parseFloat(paymentModalRow.total_amount) || 0) - (parseFloat(paymentStatusForm.paid_amount) || 0)))}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                  Payment Reference / Remarks
                </label>
                <input
                  type="text"
                  value={paymentStatusForm.payment_notes}
                  onChange={(e) => setPaymentStatusForm(prev => ({ ...prev, payment_notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                  placeholder="NEFT / Cheque / Cash reference"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalRow(null)}
                  className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPayment}
                  className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {updatingPayment ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i>
                      <span>Update Status</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Daily Gold Rate Recording Modal */}
      {showGoldRateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-stone-900/60 backdrop-blur-xs flex justify-center items-center">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-stone-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                  <i className="fa-solid fa-coins text-sm"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 font-['Inter',sans-serif]">Record Daily Metal Rates</h3>
                  <p className="text-[11px] text-stone-500 font-medium">Store today's official showroom benchmark rates</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoldRateModal(false)}
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSaveGoldRate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">Rate Date</label>
                  <input
                    type="date"
                    value={goldRateForm.rate_date}
                    onChange={(e) => setGoldRateForm(prev => ({ ...prev, rate_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono text-xs focus:outline-hidden focus:border-[#b01622]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">Source</label>
                  <select
                    value={goldRateForm.source}
                    onChange={(e) => setGoldRateForm(prev => ({ ...prev, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="manual">Manual Entry / Showroom</option>
                    <option value="api">Live API / Bullion Feed</option>
                    <option value="market">Market Association</option>
                  </select>
                </div>
              </div>

              {/* 24K Rates */}
              <div className="grid grid-cols-2 gap-3 bg-amber-50/40 p-3 rounded-xl border border-amber-200">
                <div>
                  <label className="block text-[10.5px] font-bold text-stone-700 mb-1 uppercase">24K Gold (per 10g) ₹</label>
                  <input
                    type="number"
                    step="any"
                    value={goldRateForm.gold_24k_10g}
                    onChange={(e) => {
                      const v = e.target.value;
                      const g = v ? (parseFloat(v) / 10).toFixed(2) : '';
                      setGoldRateForm(prev => ({ ...prev, gold_24k_10g: v, gold_24k_1g: g }));
                    }}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg font-mono text-xs font-bold bg-white focus:outline-hidden focus:border-[#b01622]"
                    placeholder="e.g. 74500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-stone-700 mb-1 uppercase">24K Gold (per 1g) ₹</label>
                  <input
                    type="number"
                    step="any"
                    value={goldRateForm.gold_24k_1g}
                    onChange={(e) => setGoldRateForm(prev => ({ ...prev, gold_24k_1g: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg font-mono text-xs font-bold bg-white focus:outline-hidden focus:border-[#b01622]"
                    placeholder="e.g. 7450"
                  />
                </div>
              </div>

              {/* 22K Rates */}
              <div className="grid grid-cols-2 gap-3 bg-red-50/30 p-3 rounded-xl border border-red-200">
                <div>
                  <label className="block text-[10.5px] font-bold text-[#b01622] mb-1 uppercase">22K Gold (per 10g) ₹</label>
                  <input
                    type="number"
                    step="any"
                    value={goldRateForm.gold_22k_10g}
                    onChange={(e) => {
                      const v = e.target.value;
                      const g = v ? (parseFloat(v) / 10).toFixed(2) : '';
                      setGoldRateForm(prev => ({ ...prev, gold_22k_10g: v, gold_22k_1g: g }));
                    }}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg font-mono text-xs font-bold bg-white focus:outline-hidden focus:border-[#b01622]"
                    placeholder="e.g. 68300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-[#b01622] mb-1 uppercase">22K Gold (per 1g) ₹</label>
                  <input
                    type="number"
                    step="any"
                    value={goldRateForm.gold_22k_1g}
                    onChange={(e) => setGoldRateForm(prev => ({ ...prev, gold_22k_1g: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg font-mono text-xs font-bold bg-white focus:outline-hidden focus:border-[#b01622]"
                    placeholder="e.g. 6830"
                  />
                </div>
              </div>

              {/* 18K, 14K and Silver (Per Gram) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50/50 p-3 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-[10.5px] font-bold text-stone-700 mb-1 uppercase">18K (1g) ₹</label>
                  <input
                    type="number"
                    step="any"
                    value={goldRateForm.gold_18k_1g}
                    onChange={(e) => setGoldRateForm(prev => ({ ...prev, gold_18k_1g: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg font-mono text-xs focus:outline-hidden focus:border-[#b01622] bg-white"
                    placeholder="5588"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-stone-700 mb-1 uppercase">14K (1g) ₹</label>
                  <input
                    type="number"
                    step="any"
                    value={goldRateForm.gold_14k_1g}
                    onChange={(e) => setGoldRateForm(prev => ({ ...prev, gold_14k_1g: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg font-mono text-xs focus:outline-hidden focus:border-[#b01622] bg-white"
                    placeholder="4346"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-stone-700 mb-1 uppercase">Silver (1g) ₹</label>
                  <input
                    type="number"
                    step="any"
                    value={goldRateForm.silver_1g}
                    onChange={(e) => {
                      const v = e.target.value;
                      const kg = v ? (parseFloat(v) * 1000).toFixed(2) : '';
                      setGoldRateForm(prev => ({ ...prev, silver_1g: v, silver_1kg: kg }));
                    }}
                    className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg font-mono text-xs focus:outline-hidden focus:border-[#b01622] bg-white"
                    placeholder="92"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">Notes / Benchmarks</label>
                <input
                  type="text"
                  value={goldRateForm.notes}
                  onChange={(e) => setGoldRateForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                  placeholder="e.g. Closing rate / MCX spot rate adjusted"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowGoldRateModal(false)}
                  className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGoldRate}
                  className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingGoldRate ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-floppy-disk"></i>
                      <span>Save Metal Rate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Printable Daily Gold Rates History Sheet */}
      {showGoldRatePrintModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto p-4 md:p-8 bg-stone-900/60 backdrop-blur-xs flex justify-center items-start cursor-pointer"
          onClick={() => setShowGoldRatePrintModal(false)}
        >
          <div
            id="printable-gold-rates"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8 my-4 space-y-6 text-stone-800 font-['Inter',sans-serif] border border-stone-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b-2 border-[#b01622] pb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src="/logo.png" alt="Rudra Logo" className="h-14 w-auto object-contain" />
                <div>
                  <h2 className="text-2xl font-extrabold text-[#b01622] uppercase tracking-wider">
                    {companyInfo?.company_name || 'Rudra Jewellery'}
                  </h2>
                  <p className="text-xs font-bold text-stone-700">Official Daily Gold &amp; Silver Benchmark Metal Rate Statement</p>
                  <p className="text-[11px] text-stone-500 font-mono">
                    Filter Period: {startDate || 'Earliest'} to {endDate || 'Latest'} | Generated: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => printElement('printable-gold-rates', 'Daily Gold Rates Report - Rudra Jewellery')}
                  className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-print"></i>
                  <span>Print Statement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGoldRatePrintModal(false)}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-stone-200 rounded-lg overflow-hidden">
                <thead className="bg-stone-100 text-stone-800 text-[10.5px] uppercase font-bold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">S.No</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">24K (1g)</th>
                    <th className="py-2.5 px-3 text-right">22K (1g)</th>
                    <th className="py-2.5 px-3 text-right">18K (1g)</th>
                    <th className="py-2.5 px-3 text-right">14K (1g)</th>
                    <th className="py-2.5 px-3 text-right">Silver (1g)</th>
                    <th className="py-2.5 px-3 text-right">24K (10g)</th>
                    <th className="py-2.5 px-3 text-right">22K (10g)</th>
                    <th className="py-2.5 px-3 text-center">Source</th>
                    <th className="py-2.5 px-3 text-center">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-[11px]">
                  {goldRates.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-stone-50">
                      <td className="py-2 px-3 text-center font-mono text-stone-500 font-semibold">{i + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold">{r.rate_date}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-900">{formatINR(r.gold_24k_1g)}</td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-[#b01622]">{formatINR(r.gold_22k_1g)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatINR(r.gold_18k_1g)}</td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-stone-700">{formatINR(r.gold_14k_1g)}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">{formatINR(r.silver_1g)}</td>
                      <td className="py-2 px-3 text-right font-mono text-stone-500">{formatINR(r.gold_24k_10g)}</td>
                      <td className="py-2 px-3 text-right font-mono text-stone-500">{formatINR(r.gold_22k_10g)}</td>
                      <td className="py-2 px-3 text-center uppercase font-mono text-[10px] text-stone-600">{r.source || 'manual'}</td>
                      <td className="py-2 px-3 text-center font-mono text-[10px] text-stone-500">{r.updated_at ? new Date(r.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
              <span>{companyInfo?.company_name || 'Rudra Jewellery'} — Authorized Showroom Metal Benchmark Statement</span>
              <span>Generated on {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Convert Purchase Payment Mode Modal */}
      {convertPurchaseModal && (
        <ConvertPurchasePaymentModeModal
          isOpen={!!convertPurchaseModal}
          onClose={() => setConvertPurchaseModal(null)}
          purchase={convertPurchaseModal}
          onSuccess={() => fetchReports(currentPage)}
        />
      )}

      {/* Supplier Ledger & Settlement Modal */}
      {settlementSupplierId && (
        <SupplierLedgerModal
          isOpen={Boolean(settlementSupplierId)}
          supplierId={settlementSupplierId}
          onClose={() => setSettlementSupplierId(null)}
          onUpdate={() => {
            fetchSupplierMonthlyReport();
          }}
        />
      )}

    </div>
  );
}
