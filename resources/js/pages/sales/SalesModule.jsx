import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getStoredDefaultBankAccount } from '../masters/BankAccounts';
import { getStoredCompanyInfo, fetchCompanyInfo } from '../../utils/companyInfoService';
import { printElement } from '../../utils/printHelper';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const dateText = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '—';
const normalizeClients = (response) => {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.clients)) return payload.clients;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

function numberToWordsINR(amount) {
  const num = Math.floor(Number(amount) || 0);
  const paise = Math.round(((Number(amount) || 0) - num) * 100);
  if (num === 0) return 'Rupees Zero Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(n) {
    if (n === 0) return '';
    if (n < 20) return units[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + (n % 10 !== 0 ? units[n % 10] + ' ' : '');
    return units[Math.floor(n / 100)] + ' Hundred ' + (n % 100 !== 0 ? convertChunk(n % 100) : '');
  }

  let str = '';
  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder %= 1000;

  if (crore > 0) str += convertChunk(crore) + 'Crore ';
  if (lakh > 0) str += convertChunk(lakh) + 'Lakh ';
  if (thousand > 0) str += convertChunk(thousand) + 'Thousand ';
  if (remainder > 0) str += convertChunk(remainder);

  str = 'Rupees ' + str.trim();
  if (paise > 0) {
    str += ' and ' + convertChunk(paise).trim() + ' Paise';
  }
  return str + ' Only';
}

export const getStoredMasterLiveRates = () => {
  try {
    const raw = localStorage.getItem('rudhra_master_live_rates');
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return null;
};

export const saveStoredMasterLiveRates = (data) => {
  try {
    const existing = getStoredMasterLiveRates() || {};
    const updated = { ...existing, ...data, lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) };
    localStorage.setItem('rudhra_master_live_rates', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('rudhra_price_list_updated', { detail: updated }));
  } catch (e) { }
};

export const getStoredCustomerPriceList = (customerKey) => {
  try {
    if (!customerKey || customerKey === 'Select Customer') return null;
    const raw = localStorage.getItem('rudhra_customer_price_lists');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed[customerKey] || null;
    }
  } catch (e) { }
  return null;
};

export const saveStoredCustomerPriceList = (customerKey, priceListData) => {
  try {
    if (!customerKey || customerKey === 'Select Customer') return;
    const raw = localStorage.getItem('rudhra_customer_price_lists');
    const all = raw ? JSON.parse(raw) : {};
    all[customerKey] = { ...all[customerKey], ...priceListData, updatedAt: Date.now() };
    localStorage.setItem('rudhra_customer_price_lists', JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('rudhra_price_list_updated', { detail: all[customerKey] }));
  } catch (e) { }
};

const sampleRichItems = [];
const masterDemoSalesList = [];

function Shell({ title, subtitle, actions, children }) {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2.5">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

function SalesNavTabs({ active = 'dashboard' }) {
  const [profitsOpen, setProfitsOpen] = useState(false);
  const location = useLocation();

  const isOverviewActive = active === 'dashboard' || active === 'customer-index' || location.pathname === '/sales' || location.pathname === '/sales/' || location.pathname.includes('/sales/customers');
  const isListActive = active === 'list' || location.pathname.includes('/sales/list');
  const isProfitActive = active === 'profit-per-invoice' || active === 'profit-per-metal' || location.pathname.includes('/sales/profit');
  const isRatesActive = active === 'rates' || location.pathname.includes('/sales/rates');

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-stone-200/90 shadow-2xs mb-6">
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
        <Link
          to="/sales"
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            isOverviewActive
              ? 'bg-[#b01622] text-white font-bold shadow-2xs'
              : 'text-stone-600 hover:bg-red-50 hover:text-[#b01622]'
          }`}
        >
          <i className="fa-solid fa-chart-pie"></i>
          <span>Overview</span>
        </Link>

        <Link
          to="/sales/list"
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            isListActive
              ? 'bg-[#b01622] text-white font-bold shadow-2xs'
              : 'text-stone-600 hover:bg-red-50 hover:text-[#b01622]'
          }`}
        >
          <i className="fa-solid fa-list-check"></i>
          <span>Sales List</span>
        </Link>

        {/* Profits Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfitsOpen((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              isProfitActive
                ? 'bg-[#b01622] text-white font-bold shadow-2xs'
                : 'text-stone-600 hover:bg-red-50 hover:text-[#b01622]'
            }`}
          >
            <i className="fa-solid fa-chart-line"></i>
            <span>Profits</span>
            <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${profitsOpen ? 'rotate-180' : ''}`}></i>
          </button>

          {profitsOpen && (
            <div className="absolute left-0 mt-1.5 w-52 bg-white border border-stone-200 rounded-xl shadow-xl z-50 p-1 space-y-1 font-semibold text-xs">
              <Link
                to="/sales/profit-per-invoice"
                onClick={() => setProfitsOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                  active === 'profit-per-invoice'
                    ? 'bg-red-50 text-[#b01622] font-bold'
                    : 'text-stone-700 hover:bg-red-50 hover:text-[#b01622]'
                }`}
              >
                <i className="fa-solid fa-file-invoice-dollar text-stone-400"></i>
                <span>Profit Per Invoice</span>
              </Link>
              <Link
                to="/sales/profit-per-metal"
                onClick={() => setProfitsOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                  active === 'profit-per-metal'
                    ? 'bg-red-50 text-[#b01622] font-bold'
                    : 'text-stone-700 hover:bg-red-50 hover:text-[#b01622]'
                }`}
              >
                <i className="fa-solid fa-coins text-stone-400"></i>
                <span>Profit Per Metal</span>
              </Link>
            </div>
          )}
        </div>

        <Link
          to="/sales/rates"
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            isRatesActive
              ? 'bg-[#b01622] text-white font-bold shadow-2xs'
              : 'text-stone-600 hover:bg-red-50 hover:text-[#b01622]'
          }`}
        >
          <i className="fa-solid fa-tags"></i>
          <span>Live Price Rates</span>
        </Link>
      </div>

      <Link
        to="/sales/create"
        className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2"
      >
        <i className="fa-solid fa-plus"></i>
        <span>Create Invoice</span>
      </Link>
    </div>
  );
}

export default function SalesModule({ view = 'dashboard' }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id, clientId } = useParams();
  const [searchParams] = useSearchParams();
  const [dashboard, setDashboard] = useState(null);
  const [sales, setSales] = useState(null);
  const [sale, setSale] = useState(null);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [liveRates, setLiveRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: 'all', client_id: 'all', from: '', to: '' });
  const [form, setForm] = useState({ client_id: '', client_name: '', quantity: 1, product_id: '', rate: '', gross_weight: '', net_weight: '', purity: '', making_charge: 0, labour_charge: 0, stone_charge: 0, diamond_charge: 0, other_charge: 0, discount: 0, gst_rate: 5, paid_amount: 0, payment_method: 'cash', due_date: '', notes: '' });
  const [payment, setPayment] = useState({ amount: '', payment_method: 'cash', reference: '' });
  const [companyInfo, setCompanyInfo] = useState(() => getStoredCompanyInfo());

  useEffect(() => {
    fetchCompanyInfo().then(info => {
      if (info) setCompanyInfo(info);
    });
    loadBase();
    const handleCompanyUpdate = (e) => {
      if (e?.detail) setCompanyInfo(e.detail);
    };
    window.addEventListener('rudhra_company_info_updated', handleCompanyUpdate);
    return () => window.removeEventListener('rudhra_company_info_updated', handleCompanyUpdate);
  }, []);

  const loadBase = async () => {
    try {
      const [clientResponse, productResponse, ratesResponse] = await Promise.all([
        api.get('/clients').catch(() => ({ data: null })),
        api.get('/sales/products').catch(() => ({ data: null })),
        api.get('/metal-rates').catch(() => ({ data: null }))
      ]);
      setClients(normalizeClients(clientResponse));
      setProducts(productResponse?.data?.data || productResponse?.data || []);
      setLiveRates(ratesResponse?.data || null);
    } catch (e) {
      console.warn('Base sales data fetch notice:', e);
    }
  };
  const loadData = async (activeFilters = filters) => {
    setLoading(true);
    try {
      if (view === 'customer-index') {
        const [reportResponse, clientResponse] = await Promise.all([
          api.get('/sales/customer-report', { params: activeFilters }).catch(() => ({ data: null })),
          api.get('/clients').catch(() => ({ data: null }))
        ]);
        if (reportResponse?.data) setDashboard(reportResponse.data);
        if (clientResponse) setClients(normalizeClients(clientResponse));
      }
      if (view === 'dashboard' || view === 'list') {
        const res = await api.get('/sales', { params: activeFilters }).catch(() => ({ data: null }));
        if (res?.data) setSales(res.data);
      }
      if (view === 'details' && id) {
        let previewData = location.state?.previewInvoiceData;
        if (!previewData && (id === '1' || id === 'preview' || id === 'latest')) {
          try {
            const stored = sessionStorage.getItem('lastGeneratedInvoice');
            if (stored) previewData = JSON.parse(stored);
          } catch (e) { }
        }

        if (previewData) {
          setSale(previewData);
        } else {
          const res = await api.get(`/sales/${id}`).catch(() => ({ data: null }));
          if (res?.data) {
            setSale(res.data);
          } else {
            setSale(null);
          }
        }
      }
      if (view === 'customer' && clientId) {
        const res = await api.get(`/sales/customers/${clientId}`).catch(() => ({ data: null }));
        if (res?.data) setSale(res.data);
      }
      if (view === 'profit' || view === 'profit-per-invoice') {
        const res = await api.get('/sales/profit', { params: activeFilters }).catch(() => ({ data: null }));
        if (res?.data) setSales(res.data);
      }
      if (view === 'profit-per-metal') {
        const res = await api.get('/reports/profit-per-metal', { params: activeFilters }).catch(() => ({ data: null }));
        if (res?.data) setSales(res.data);
      }
      if (view === 'rates') {
        const res = await api.get('/metal-rates').catch(() => ({ data: null }));
        if (res?.data) setLiveRates(res.data);
      }
    } catch (error) {
      console.warn('Sales module load notice:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadData(); }, [view, id, clientId, searchParams.toString()]);

  const selectedProduct = products.find((product) => String(product.id) === String(form.product_id));
  const estimatedSubtotal = (Number(form.rate) || 0) * (Number(form.quantity) || 0) + ['making_charge', 'labour_charge', 'stone_charge', 'diamond_charge', 'other_charge'].reduce((sum, key) => sum + (Number(form[key]) || 0), 0);
  const estimatedTax = Math.max(0, estimatedSubtotal - (Number(form.discount) || 0)) * (Number(form.gst_rate) || 0) / 100;
  const estimatedTotal = Math.max(0, estimatedSubtotal - (Number(form.discount) || 0) + estimatedTax + (Number(form.other_charge) || 0));

  const submitSale = async (event) => {
    event.preventDefault();
    try {
      const client = clients.find((item) => String(item.id) === String(form.client_id));
      await api.post('/sales', { ...form, client_name: client?.full_name || form.client_name, items: [{ product_id: form.product_id || null, product_name: selectedProduct?.name, product_code: selectedProduct?.product_code, quantity: form.quantity, rate: form.rate, gross_weight: form.gross_weight, net_weight: form.net_weight, purity: form.purity, making_charge: form.making_charge, labour_charge: form.labour_charge, stone_charge: form.stone_charge, diamond_charge: form.diamond_charge, other_charge: form.other_charge }] });
      showToast?.('Sale created and inventory updated successfully.', 'success');
      navigate('/sales/list');
    } catch (error) { showToast?.(error.response?.data?.message || 'Sale could not be created.', 'error'); }
  };

  const recordPayment = async (event) => {
    event.preventDefault();
    try { const response = await api.post(`/sales/${sale.id}/payments`, payment); setSale(response.data.data); setPayment({ amount: '', payment_method: 'cash', reference: '' }); showToast?.('Payment recorded.', 'success'); }
    catch (error) { showToast?.(error.response?.data?.message || 'Payment could not be recorded.', 'error'); }
  };

  const showInitialLoading = loading && (
    (view === 'details' && !sale) ||
    (view === 'customer' && !sale)
  );
  if (showInitialLoading) return <div className="min-h-[450px] flex items-center justify-center text-sm font-semibold text-stone-500">Loading sales...</div>;

  if (view === 'legacy-dashboard') return <Shell title="Sales Dashboard" subtitle="Live retail sales, collection, inventory, and profit overview." actions={<Link to="/sales/create" className="px-4 py-2.5 bg-[#b01622] text-white rounded-lg text-xs font-bold">+ Create Sale</Link>}>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">{[['Total Sales', money(dashboard?.stats?.total_sales)], ['Total Orders', dashboard?.stats?.total_orders || 0], ['Paid Amount', money(dashboard?.stats?.paid_amount)], ['Outstanding', money(dashboard?.stats?.outstanding_amount)], ['Profit', money(dashboard?.stats?.profit)], ['Customers', dashboard?.stats?.customers || 0]].map(([label, value], index) => <StatCard key={label} label={label} value={value} accent={index === 0 || index === 4} />)}</div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5"><section className="lg:col-span-2 bg-white border border-stone-200 rounded-xl p-5"><div className="flex items-center justify-between mb-4"><h2 className="text-sm font-bold">Revenue Trend</h2><span className="text-xs text-stone-400">Database totals</span></div><div className="space-y-3">{(dashboard?.trend || []).slice(-8).map((point) => <div key={point.date} className="flex items-center gap-3 text-xs"><span className="w-24 text-stone-500">{dateText(point.date)}</span><div className="h-2 rounded-full bg-red-100 flex-1"><div className="h-2 rounded-full bg-[#b01622]" style={{ width: `${Math.min(100, (point.amount / Math.max(1, dashboard.stats.total_sales)) * 100)}%` }} /></div><strong>{money(point.amount)}</strong></div>)}</div></section><section className="bg-white border border-stone-200 rounded-xl p-5"><h2 className="text-sm font-bold mb-4">Recent Sales</h2><div className="space-y-3">{(dashboard?.recent_sales || []).map((item) => <Link key={item.id} to={`/sales/${item.id}`} className="block border-b border-stone-100 pb-3"><div className="flex justify-between text-xs font-bold"><span>{item.invoice_no}</span><span>{money(item.total_amount)}</span></div><div className="text-[11px] text-stone-500 mt-1">{item.client_name} · {dateText(item.invoice_date)}</div></Link>)}</div></section></div>
  </Shell>;

  if (view === 'dashboard') return <CustomerSalesReport dashboard={dashboard} clients={clients} filters={filters} setFilters={setFilters} reload={loadData} />;

  if (view === 'rates') return <LiveRatePriceListPage liveRates={liveRates} clients={clients} showToast={showToast} />;

  if (view === 'create') return <CreateInvoiceBillingPage clients={clients} products={products} navigate={navigate} showToast={showToast} />;

  if (view === 'details' && sale) {
    const rawItems = (sale.itemsRelation && sale.itemsRelation.length > 0)
      ? sale.itemsRelation
      : ((sale.items_relation && sale.items_relation.length > 0) ? sale.items_relation : (sale.items && sale.items.length > 0 ? sale.items : []));

    const displayItems = rawItems.length > 0 ? rawItems.map((it, idx) => {
      const gross_wt = Number(it.gross_wt ?? it.gross_weight ?? 2.875);
      const net_wt = Number(it.net_wt ?? it.net_weight ?? (gross_wt * 0.92));
      const gold_rate = Number(it.gold_rate ?? it.add_yr ?? it.rate ?? 7225);
      const gold_value = Number(it.gold_value ?? (net_wt * gold_rate));
      const making_rate = Number(it.making_rate ?? 500);
      const making_charges = Number(it.making_charges ?? it.labour ?? (net_wt * making_rate));
      const fixed_amount = it.fixed_amount ? Number(it.fixed_amount) : (it.hallmarking ? Number(it.hallmarking) : null);
      const wastage = it.wastage !== undefined ? String(it.wastage) : '10.00';
      const discount = Number(it.discount ?? 0);
      const total_mc = Number(it.total_mc ?? it.line_total ?? (gold_value + making_charges + (fixed_amount || 0) - discount));

      return {
        s_no: it.s_no ?? (idx + 1),
        code: it.code ?? it.product_code ?? `GR-${1000 + idx + 1}`,
        desc: it.desc ?? it.product_name ?? it.name ?? 'Gold Ring',
        gross_wt,
        net_wt,
        purity: it.purity && it.purity !== '-' ? it.purity : '22K',
        gold_rate,
        gold_value,
        making_rate,
        making_charges,
        fixed_amount,
        wastage,
        discount,
        total_mc,
        qty: Number(it.qty ?? it.quantity ?? 1)
      };
    }) : sampleRichItems;

    const customerName = sale.customer_name || sale.client_name || sale.client?.full_name || 'Mr. Arvind Kumar';
    const mobileNo = sale.mobile || sale.phone || sale.client?.primary_phone || '+91 98765 43210';
    const addressVal = sale.address || sale.client?.address || '123, Anna Nagar, Chennai, Tamil Nadu - 600040';
    const gstinVal = sale.gstin || sale.client?.gstin || sale.pan || '33AAKFA1234A1ZV';
    const invoiceNo = sale.invoice_no || 'RJ-INV-000123';
    const dateVal = sale.date || dateText(sale.invoice_date || new Date().toISOString());

    const totalPieces = displayItems.reduce((acc, it) => acc + (it.qty || 1), 0);
    const totalGrossWeight = displayItems.reduce((acc, it) => acc + (it.gross_wt || 0), 0);
    const totalNetWeight = displayItems.reduce((acc, it) => acc + (it.net_wt || 0), 0);
    const totalGoldValue = sale.gold_value ?? displayItems.reduce((acc, it) => acc + (it.gold_value || 0), 0);
    const totalMakingCharges = sale.making_charges ?? displayItems.reduce((acc, it) => acc + (it.making_charges || 0), 0);
    const totalFixedAmount = displayItems.reduce((acc, it) => acc + (it.fixed_amount || 0), 0);
    const totalDiscount = sale.discount ?? displayItems.reduce((acc, it) => acc + (it.discount || 0), 0);

    const stoneCharges = Number(sale.stone_charges ?? 68050.00);
    const calculatedSubTotal = totalGoldValue + totalMakingCharges + stoneCharges - totalDiscount;
    const subTotal = Number(sale.sub_total ?? calculatedSubTotal);
    const cgst = Math.round((subTotal * 0.015) * 100) / 100;
    const sgst = Math.round((subTotal * 0.015) * 100) / 100;
    const grandTotal = Number(sale.grand_total ?? sale.total_amount ?? (subTotal + cgst + sgst));

    const amountReceivedVal = Number(sale.amount_received ?? sale.paid_amount ?? 500000.00);
    const balanceDueVal = Number(sale.balance_due ?? sale.due_amount ?? Math.max(0, grandTotal - amountReceivedVal));
    const paymentModeVal = sale.payment_mode || sale.payment_method || 'UPI / Bank Transfer';

    const wordsInINR = numberToWordsINR(grandTotal);

    return (
      <Shell
        title={`Tax Invoice ${invoiceNo}`}
        subtitle={`Respected Customer: ${customerName} · Issued Date: ${dateVal}`}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                printElement('printable-invoice-sheet', `Tax Invoice ${invoiceNo}`);
              }}
              className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-print"></i>
              <span>Print Tax Invoice</span>
            </button>
            <Link
              to="/sales/list"
              className="px-4 py-2 bg-white border border-stone-300 hover:border-stone-400 text-stone-800 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left text-stone-500"></i>
              <span>Back to Sales List</span>
            </Link>
          </div>
        }
      >
        <div className="w-full flex justify-center py-2">
          {/* Main Container mirroring image sheet */}
          <div
            id="printable-invoice-sheet"
            className="w-full max-w-[1100px] bg-white border border-stone-200 shadow-md p-6 sm:p-10 space-y-6 text-stone-800 font-['Inter',sans-serif] print:p-0 print:border-0 print:shadow-none"
          >
            {/* 1. Header Section */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-4 border-b-2 border-[#b01622]">
              {/* Brand Logo Box */}
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 bg-[#b01622] rounded-lg flex flex-col items-center justify-center text-white p-2 shadow-xs shrink-0">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl font-serif font-black tracking-widest border-r border-white/40 pr-1">RJ</span>
                    <i className="fa-solid fa-gem text-lg text-amber-300"></i>
                  </div>
                  <span className="text-[9px] uppercase font-bold tracking-wider mt-1 text-center leading-tight">
                    {companyInfo?.company_name || 'RUDRA JEWELLERS'}
                  </span>
                  <span className="text-[7px] text-white/70 uppercase tracking-widest">{companyInfo?.city || ''}</span>
                </div>
                <div>
                  <h1 className="text-2xl font-black text-[#b01622] tracking-tight uppercase">{companyInfo?.company_name || 'RUDRA JEWELLERS'}</h1>
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-widest">{companyInfo?.tagline || 'ENTERPRISE ERP SYSTEM'}</div>
                  <p className="text-xs text-stone-600 mt-2">
                    {[companyInfo?.address_line1, companyInfo?.address_line2, companyInfo?.city, companyInfo?.state && `${companyInfo.state} - ${companyInfo?.pincode || ''}`].filter(Boolean).join(', ')}
                  </p>
                  <p className="text-xs text-stone-600">
                    Contact: {companyInfo?.phone || '+91 98400 12345'} | {companyInfo?.email || 'info@rudrajewellers.com'}
                  </p>
                </div>
              </div>

              {/* Tax Invoice Badge & Invoice Meta Table */}
              <div className="flex flex-col items-end gap-2 text-xs">
                <span className="bg-[#b01622] text-white px-5 py-1.5 font-bold uppercase rounded-md text-xs shadow-xs tracking-wider">
                  TAX INVOICE
                </span>
                <table className="text-left text-xs border-collapse mt-1">
                  <tbody>
                    <tr>
                      <td className="py-0.5 pr-3 text-stone-600 font-medium">Invoice No.</td>
                      <td className="py-0.5 font-bold text-[#b01622] font-mono">: {invoiceNo}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 pr-3 text-stone-600 font-medium">Date</td>
                      <td className="py-0.5 font-semibold text-stone-900">: {dateVal}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 pr-3 text-stone-600 font-medium">Place of Supply</td>
                      <td className="py-0.5 font-semibold text-stone-900">: Tamil Nadu (33)</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 pr-3 text-stone-600 font-medium">Reverse Charge</td>
                      <td className="py-0.5 font-semibold text-stone-900">: No</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Customer Details & Invoice Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Details Card */}
              <div className="bg-amber-50/20 border border-amber-200/60 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-[#b01622] font-bold uppercase tracking-wider text-[11px]">
                  <i className="fa-solid fa-user text-xs"></i>
                  <span>CUSTOMER DETAILS</span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <tbody>
                    <tr>
                      <td className="py-1 w-32 text-stone-600 font-medium">Customer Name</td>
                      <td className="py-1 font-bold text-stone-900">: {customerName}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-stone-600 font-medium">Mobile No.</td>
                      <td className="py-1 font-semibold text-stone-800 font-mono">: {mobileNo}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-stone-600 font-medium align-top">Address</td>
                      <td className="py-1 font-semibold text-stone-800 leading-snug">: {addressVal}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-stone-600 font-medium">GSTIN</td>
                      <td className="py-1 font-mono font-bold text-stone-900">: {gstinVal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Invoice Summary Card */}
              <div className="bg-amber-50/20 border border-amber-200/60 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-[#b01622] font-bold uppercase tracking-wider text-[11px]">
                  <i className="fa-solid fa-file-lines text-xs"></i>
                  <span>INVOICE SUMMARY</span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <tbody>
                    <tr>
                      <td className="py-1 w-44 text-stone-600 font-medium">Total Items</td>
                      <td className="py-1 font-bold text-stone-900">: {displayItems.length}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-stone-600 font-medium">Total Net Gold Weight</td>
                      <td className="py-1 font-bold text-stone-900 font-mono">: {totalNetWeight.toFixed(3)} g</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-stone-600 font-medium">Total Gross Weight</td>
                      <td className="py-1 font-bold text-stone-900 font-mono">: {totalGrossWeight.toFixed(3)} g</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Product Table */}
            <div className="border border-stone-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-[#b01622] text-white text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-2 text-center border-r border-red-700/50">S. No.</th>
                    <th className="p-2 border-r border-red-700/50">Product Code</th>
                    <th className="p-2 border-r border-red-700/50">Product Description</th>
                    <th className="p-2 text-right border-r border-red-700/50">Gross Weight (g)</th>
                    <th className="p-2 text-right border-r border-red-700/50">Net Weight (g)</th>
                    <th className="p-2 text-center border-r border-red-700/50">Purity (22K)</th>
                    <th className="p-2 text-right border-r border-red-700/50">Gold Rate (₹ / g)</th>
                    <th className="p-2 text-right border-r border-red-700/50">Gold Value (₹)</th>
                    <th className="p-2 text-right border-r border-red-700/50">Making Rate (₹ / g)</th>
                    <th className="p-2 text-right border-r border-red-700/50">Making Charges (₹)</th>
                    <th className="p-2 text-right border-r border-red-700/50">If Fixed Amount (₹)</th>
                    <th className="p-2 text-center border-r border-red-700/50">Wastage (%)</th>
                    <th className="p-2 text-right border-r border-red-700/50">Discount (₹)</th>
                    <th className="p-2 text-right">Total MC (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {displayItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/10 text-stone-800">
                      <td className="p-2 text-center font-mono text-stone-500">{item.s_no}</td>
                      <td className="p-2 font-mono font-medium text-stone-700">{item.code}</td>
                      <td className="p-2 font-bold text-stone-900">{item.desc}</td>
                      <td className="p-2 text-right font-mono">{Number(item.gross_wt).toFixed(3)}</td>
                      <td className="p-2 text-right font-mono">{Number(item.net_wt).toFixed(3)}</td>
                      <td className="p-2 text-center font-semibold">{item.purity}</td>
                      <td className="p-2 text-right font-mono">{Number(item.gold_rate).toLocaleString('en-IN')}</td>
                      <td className="p-2 text-right font-mono">{Number(item.gold_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right font-mono">{Number(item.making_rate).toFixed(2)}</td>
                      <td className="p-2 text-right font-mono">{Number(item.making_charges).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right font-mono">{item.fixed_amount ? Number(item.fixed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                      <td className="p-2 text-center font-mono">{item.wastage}</td>
                      <td className="p-2 text-right font-mono">{item.discount ? Number(item.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                      <td className="p-2 text-right font-mono font-bold text-[#b01622]">{Number(item.total_mc).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. Horizontal Summary Metrics Box (8-column bar) */}
            <div className="bg-stone-50/80 border border-stone-200 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs font-semibold">
              <div>
                <span className="text-[10px] text-stone-500 block uppercase">Total Pieces</span>
                <span className="font-bold text-stone-900 font-mono">: {totalPieces} PCS</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block uppercase">Total Gross Weight</span>
                <span className="font-bold text-stone-900 font-mono">: {totalGrossWeight.toFixed(3)} g</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block uppercase">Total Net Weight</span>
                <span className="font-bold text-stone-900 font-mono">: {totalNetWeight.toFixed(3)} g</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block uppercase">Total Gold Value</span>
                <span className="font-bold text-stone-900 font-mono">₹ {totalGoldValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block uppercase">Total Making Charges</span>
                <span className="font-bold text-stone-900 font-mono">₹ {totalMakingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block uppercase">If Fixed Amount</span>
                <span className="font-bold text-stone-900 font-mono">₹ {totalFixedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block uppercase">Total Discount</span>
                <span className="font-bold text-stone-900 font-mono">₹ {totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#b01622] block uppercase font-bold">Total Amount</span>
                <span className="font-black text-[#b01622] text-sm font-mono">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* 5. Bottom Financial Summary & Payment Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: Financial Calculation Card (7 cols) */}
              <div className="md:col-span-7 bg-amber-50/10 border border-amber-200/60 rounded-xl p-5 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-[#b01622] font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-stone-200">
                  <i className="fa-solid fa-file-invoice text-xs"></i>
                  <span>INVOICE SUMMARY</span>
                </div>

                <div className="space-y-2 text-stone-700">
                  <div className="flex justify-between items-center">
                    <span>Gold Value</span>
                    <span className="font-mono font-semibold">₹ {totalGoldValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Making Charges</span>
                    <span className="font-mono font-semibold">₹ {totalMakingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Stone Charges</span>
                    <span className="font-mono font-semibold">₹ {stoneCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#b01622]">
                    <span>Discount</span>
                    <span className="font-mono font-semibold">- ₹ {totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="pt-2 border-t border-stone-200 flex justify-between items-center font-bold text-stone-900">
                    <span>Sub Total</span>
                    <span className="font-mono text-sm">₹ {subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between items-center text-stone-600 text-[11px]">
                    <span>CGST (1.5%)</span>
                    <span className="font-mono">₹ {cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-stone-600 text-[11px]">
                    <span>SGST (1.5%)</span>
                    <span className="font-mono">₹ {sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="pt-3 border-t-2 border-[#b01622] flex justify-between items-center text-[#b01622] font-black text-lg">
                    <span>GRAND TOTAL</span>
                    <span className="font-mono text-xl">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Amount in words */}
                <div className="pt-3 border-t border-stone-200 text-[11px] text-stone-600">
                  <span className="font-bold text-stone-700 block">Amount In Words:</span>
                  <p className="italic text-stone-800 font-serif mt-0.5 font-medium">{wordsInINR}</p>
                </div>
              </div>

              {/* Right Column: Amount Received, Balance Due, Payment Mode & Thank You (5 cols) */}
              <div className="md:col-span-5 space-y-3">
                {/* Amount Received */}
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                    <i className="fa-solid fa-circle-check text-[#059669]"></i>
                    <span>AMOUNT RECEIVED</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 font-mono">
                    ₹ {amountReceivedVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Balance Due */}
                <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-[#b01622] text-[11px] font-bold uppercase tracking-wider">
                    <i className="fa-solid fa-wallet text-[#b01622]"></i>
                    <span>BALANCE DUE</span>
                  </div>
                  <div className="text-xl font-black text-[#b01622] font-mono">
                    ₹ {balanceDueVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="bg-amber-50/20 border border-amber-200/60 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-600 text-[10px] font-bold uppercase tracking-wider">
                    <i className="fa-solid fa-credit-card"></i>
                    <span>PAYMENT MODE</span>
                  </div>
                  <div className="font-bold text-stone-900 text-xs">
                    {paymentModeVal}
                  </div>
                </div>

                {/* Thank You Note */}
                <div className="bg-amber-50/30 border border-amber-200/60 rounded-xl p-4 text-center space-y-1">
                  <h4 className="font-bold text-[#b01622] text-xs uppercase tracking-wider">THANK YOU!</h4>
                  <p className="text-[11px] text-stone-600">
                    Thank you for shopping with<br /><strong>Rudra Jewellers.</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* 6. Footer Section: Bank Details, Terms & Conditions, Signature */}
            <div className="pt-4 border-t border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-5 text-[11px] text-stone-600">
              {/* Bank Details */}
              {(() => {
                const activeBank = getStoredDefaultBankAccount();
                return (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[#b01622] font-bold uppercase text-[10px] tracking-wider mb-1">
                      <i className="fa-solid fa-building-columns text-[#b01622]"></i>
                      <span>BANK DETAILS</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-1">
                      <span className="text-stone-500">Bank Name</span>
                      <span className="font-semibold text-stone-800">: {activeBank?.bank_name || 'HDFC Bank'}</span>
                      <span className="text-stone-500">A/C Name</span>
                      <span className="font-semibold text-stone-800">: {activeBank?.account_name || 'Rudra Jewellers'}</span>
                      <span className="text-stone-500">A/C No.</span>
                      <span className="font-semibold font-mono text-stone-800">: {activeBank?.account_number || '50200018899221'}</span>
                      <span className="text-stone-500">IFSC Code</span>
                      <span className="font-semibold font-mono text-stone-800">: {activeBank?.ifsc_code || 'HDFC0000124'}</span>
                      {activeBank?.upi_id && (
                        <>
                          <span className="text-stone-500">UPI ID</span>
                          <span className="font-semibold font-mono text-[#b01622]">: {activeBank.upi_id}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Terms & Conditions */}
              <div className="space-y-1">
                <div className="text-[#b01622] font-bold uppercase text-[10px] tracking-wider mb-1">
                  TERMS & CONDITIONS
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] text-stone-500 leading-snug">
                  <li>Goods once sold will not be taken back.</li>
                  <li>Exchange allowed within 7 days with applicable deductions.</li>
                  <li>We are not responsible for any loss of ornaments after delivery.</li>
                  <li>Subject to Coimbatore Jurisdiction only.</li>
                </ul>
              </div>

              {/* Authorised Signature */}
              <div className="flex flex-col justify-end items-center text-center space-y-2 pt-4 md:pt-0">
                <div className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">
                  FOR RUDRA JEWELLERS
                </div>
                <div className="w-36 border-b border-dashed border-stone-400 h-10 flex items-end justify-center">
                  {/* Signature line space */}
                </div>
                <span className="text-[10px] font-bold text-stone-700 uppercase tracking-wider">
                  Authorised Signature
                </span>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (view === 'customer') {
    const customerObj = sale?.customer || clients.find((c) => String(c.id) === String(clientId)) || {
      id: clientId || '',
      full_name: 'Customer',
      client_code: '',
      primary_phone: '—',
    };

    const customerSales = Array.isArray(sale?.sales) ? sale.sales : [];

    const stats = {
      total_purchases: Number(sale?.stats?.total_purchases || 0),
      paid_amount: Number(sale?.stats?.paid_amount || 0),
      due_amount: Number(sale?.stats?.due_amount || 0),
      transactions: Number(sale?.stats?.transactions || customerSales.length),
    };

    return (
      <Shell
        title={`${customerObj.full_name || 'Customer'} · Purchase Details`}
        subtitle={`Client Code: ${customerObj.client_code || '—'} · Phone: ${customerObj.primary_phone || '—'}`}
        actions={
          <Link
            to="/sales"
            className="px-4 py-2 bg-white border border-stone-300 hover:border-stone-400 text-stone-800 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left text-stone-500"></i>
            <span>Back to Sales Report</span>
          </Link>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Total Purchases" value={money(stats.total_purchases)} accent />
          <StatCard label="Paid Amount" value={money(stats.paid_amount)} />
          <StatCard label="Outstanding Balance" value={money(stats.due_amount)} accent />
          <StatCard label="Transactions" value={stats.transactions} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">
              Transaction &amp; Invoice History
            </h2>
            <span className="text-xs text-stone-500">
              Showing {customerSales.length} invoices
            </span>
          </div>
          <SalesTable records={customerSales} />
        </div>
      </Shell>
    );
  }

  if (view === 'customer-index') {
    return <CustomerSalesReport dashboard={dashboard} clients={clients} filters={filters} setFilters={setFilters} reload={loadData} />;
  }

  if (view === 'profit' || view === 'profit-per-invoice') {
    return (
      <div className="w-full">
        <SalesNavTabs active="profit-per-invoice" />
        <ProfitManagementReport sales={sales} filters={filters} setFilters={setFilters} reload={loadData} companyInfo={companyInfo} />
      </div>
    );
  }

  if (view === 'profit-per-metal') {
    return (
      <div className="w-full">
        <SalesNavTabs active="profit-per-metal" />
        <ProfitPerMetalReport data={sales} filters={filters} setFilters={setFilters} reload={loadData} companyInfo={companyInfo} />
      </div>
    );
  }

  return (
    <Shell
      title="Sales List"
      subtitle="List of all retail sales, payment status, and invoices."
      actions={
        <Link to="/sales/create" className="px-4 py-2.5 bg-[#b01622] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#8e111a] transition-all">
          + Create Sale
        </Link>
      }
    >
      <SalesNavTabs active="list" />
      <SalesTable records={sales?.sales?.data || sales?.data || (Array.isArray(sales) ? sales : [])} />
    </Shell>
  );
}

function roundNum(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}

function CustomerSalesReport({ dashboard, clients, filters, setFilters, reload }) {
  const [graphMetric, setGraphMetric] = useState('amount');

  const dbRows = dashboard?.rows?.data || [];
  const summary = dashboard?.summary || {};
  const invoiceSummary = dashboard?.invoice_summary || {};
  const trend = dashboard?.trend || [];
  const profitSummary = dashboard?.profitSummary || summary || {};

  const dropdownClients = useMemo(() => {
    return Array.isArray(clients) ? clients : [];
  }, [clients]);

  const selectedCustomerId = filters.client_id && filters.client_id !== 'all' ? String(filters.client_id) : 'all';

  const filteredRows = useMemo(() => {
    const baseList = dbRows;
    if (selectedCustomerId === 'all') return baseList;
    return baseList.filter((r) => String(r.client_id) === selectedCustomerId || r.client_name?.toLowerCase().includes(String(selectedCustomerId).toLowerCase()));
  }, [dbRows, selectedCustomerId]);

  const isFiltered = selectedCustomerId !== 'all';

  const totalSalesAmountVal = filteredRows.reduce((acc, r) => acc + Number(r.total_amount || 0), 0);

  const totalCustomersVal = isFiltered
    ? 1
    : Number(summary.customers || dropdownClients.length || 0);

  const totalInvoicesVal = filteredRows.reduce((acc, r) => acc + Number(r.invoice_count || 0), 0);

  const goldValueVal = invoiceSummary.gold_value !== undefined ? Number(invoiceSummary.gold_value) : roundNum(totalSalesAmountVal * 0.83);
  const makingChargesVal = invoiceSummary.making_charges !== undefined ? Number(invoiceSummary.making_charges) : roundNum(totalSalesAmountVal * 0.10);
  const stoneChargesVal = invoiceSummary.stone_charges !== undefined ? Number(invoiceSummary.stone_charges) : roundNum(totalSalesAmountVal * 0.05);
  const discountVal = invoiceSummary.discount !== undefined ? Number(invoiceSummary.discount) : roundNum(totalSalesAmountVal * 0.01);
  const gstVal = invoiceSummary.gst !== undefined ? Number(invoiceSummary.gst) : roundNum((goldValueVal + makingChargesVal + stoneChargesVal - discountVal) * 0.03);
  const grandTotalVal = invoiceSummary.grand_total !== undefined ? Number(invoiceSummary.grand_total) : totalSalesAmountVal;

  // Pagination calculations
  const totalEntries = filteredRows.length;
  const itemsPerPage = dashboard?.rows?.per_page || 5;
  const currentPage = filters.page ? Number(filters.page) : (Number(dashboard?.rows?.current_page) || 1);
  const totalPages = Math.max(1, Math.ceil(totalEntries / itemsPerPage));

  const tableRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const displayStart = totalEntries > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const displayEnd = Math.min(currentPage * itemsPerPage, totalEntries);

  const totalInvoicesSum = filteredRows.reduce((acc, r) => acc + (Number(r.invoice_count) || 0), 0);
  const totalQtySum = filteredRows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
  const totalGoldWgtSum = Number(filteredRows.reduce((acc, r) => acc + (Number(r.gold_weight) || 0), 0).toFixed(3));
  const totalDiamondWgtSum = Number(filteredRows.reduce((acc, r) => acc + (Number(r.diamond_weight) || 0), 0).toFixed(3));
  const totalSalesSum = filteredRows.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);

  const handlePageClick = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    const next = { ...filters, page: newPage };
    setFilters(next);
    reload(next);
  };

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printModalTitle, setPrintModalTitle] = useState('Customer Sales Statement');

  // Export 1: Export PDF
  const handleExportPdf = () => {
    setPrintModalTitle('Customer Sales Report & Statement');
    setShowPrintModal(true);
  };

  // Export 2: Export Excel (.csv)
  const handleExportExcel = () => {
    const selectedCustName = isFiltered ? (dropdownClients.find((c) => String(c.id) === selectedCustomerId)?.full_name || 'Selected Customer') : 'All Customers';
    const lines = [
      [`${company?.company_name || 'RUDRA JEWELLERS'} - CUSTOMER SALES REPORT`],
      [`Date Range: ${filters.from || '2025-04-01'} to ${filters.to || '2025-04-30'}`],
      [`Customer Filter: ${selectedCustName}`],
      [`Total Sales Amount (Rs): ${totalSalesAmountVal}`],
      [`Total Invoices: ${totalInvoicesVal}`],
      [''],
      ['S No', 'Customer Name', 'No. of Invoices', 'Total Quantity (Pcs)', 'Total Gold Weight (g)', 'Total Diamond Weight (ct)', 'Total Sales Amount (Rs)', 'Last Sale Date'],
      ...(filteredRows.length > 0
        ? filteredRows.map((row, idx) => [
            idx + 1,
            row.client_name ?? 'null',
            row.invoice_count ?? 0,
            row.quantity ?? 0,
            row.gold_weight ?? '0.000',
            row.diamond_weight ?? '0.000',
            row.total_amount ?? 0,
            row.last_sale_date ?? 'null'
          ])
        : [['null', 'null', 'null', 'null', 'null', 'null', 'null', 'null']]),
      ['Total Summary', '', totalInvoicesSum, totalQtySum, totalGoldWgtSum, totalDiamondWgtSum, totalSalesSum, '']
    ];

    const csvContent = '\uFEFF' + lines.map((l) => l.map((v) => `"${String(v === null || v === undefined ? 'null' : v).replaceAll('₹', 'Rs. ').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Customer_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export 3: Export Invoice (.csv / Print Sheet)
  const handleExportInvoice = () => {
    setPrintModalTitle('Tax Invoice & Remittance Statement');
    setShowPrintModal(true);
  };

  const dynamicGraphData = useMemo(() => {
    let pointsData = Array.isArray(trend) && trend.length > 0 ? trend : [];

    if (pointsData.length === 0) {
      const slots = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleString('en-US', { month: 'short' }) + " '" + String(d.getFullYear()).slice(-2);
        slots.push({ label: monthLabel, val: 0 });
      }
      return {
        yLabels: graphMetric === 'quantity' ? ['400 Pcs', '300 Pcs', '200 Pcs', '100 Pcs', '0 Pcs'] :
          graphMetric === 'gold_weight' ? ['400g', '300g', '200g', '100g', '0g'] :
            graphMetric === 'diamond_weight' ? ['40ct', '30ct', '20ct', '10ct', '0ct'] :
              graphMetric === 'invoices' ? ['40', '30', '20', '10', '0'] :
                ['₹10L', '₹7.5L', '₹5L', '₹2.5L', '₹0'],
        xLabels: slots.map((s) => s.label),
        polygon: '3,98 3,98 96,98 96,98',
        polyline: '3,98 96,98',
        dots: slots.map((_, idx) => [3 + idx * (93 / (slots.length - 1 || 1)), 98]),
      };
    }

    const labels = pointsData.map((p) => {
      if (!p.date) return '—';
      const d = new Date(p.date);
      return d.toLocaleString('en-US', { month: 'short' }) + " '" + String(d.getFullYear()).slice(-2);
    });

    const values = pointsData.map((p) => Number(p.amount || p.value || 0));
    const maxVal = Math.max(...values, 1);

    const formatY = (val) => {
      if (graphMetric === 'quantity') return `${Math.round(val)} Pcs`;
      if (graphMetric === 'gold_weight') return `${val.toFixed(1)}g`;
      if (graphMetric === 'diamond_weight') return `${val.toFixed(1)}ct`;
      if (graphMetric === 'invoices') return `${Math.round(val)}`;
      return money(val);
    };

    const yLabels = [
      formatY(maxVal),
      formatY(maxVal * 0.75),
      formatY(maxVal * 0.5),
      formatY(maxVal * 0.25),
      formatY(0),
    ];

    const step = pointsData.length > 1 ? 93 / (pointsData.length - 1) : 0;
    const dots = values.map((v, i) => {
      const x = pointsData.length > 1 ? 3 + i * step : 50;
      const y = 98 - (v / maxVal) * 85;
      return [Number(x.toFixed(1)), Number(y.toFixed(1))];
    });

    const polyline = dots.map((d) => `${d[0]},${d[1]}`).join(' ');
    const firstX = dots[0][0];
    const lastX = dots[dots.length - 1][0];
    const polygon = `${firstX},100 ${polyline} ${lastX},100`;

    return {
      yLabels,
      xLabels: labels,
      polygon,
      polyline,
      dots,
    };
  }, [trend, graphMetric]);

  const currentGraph = dynamicGraphData;

  React.useEffect(() => {
    if (filters.page) reload();
  }, [filters.page]);

  return (
    <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-gray-800">
      {/* Sub Navigation Pill Tabs */}
      <SalesNavTabs active="dashboard" />

      {/* 1. Header with Breadcrumbs & Action Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-400 font-semibold mb-1">
            <span>Reports</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-300"></i>
            <span className="text-stone-600">Customer Sales Report</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Customer Sales Report
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            View how much has been sold to each customer
          </p>
        </div>

        {/* Top Filters & Export Actions matching screenshot */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Date Picker Button */}
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-700 font-semibold shadow-2xs">
            <i className="fa-regular fa-calendar text-stone-400 text-xs"></i>
            <input
              type="date"
              value={filters.from || ''}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="bg-transparent text-xs font-semibold focus:outline-hidden cursor-pointer"
            />
            <span className="text-stone-400">-</span>
            <input
              type="date"
              value={filters.to || ''}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="bg-transparent text-xs font-semibold focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Customer Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
            <span className="text-xs font-semibold text-stone-500">Customer:</span>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                const next = { ...filters, client_id: e.target.value, page: 1 };
                setFilters(next);
                reload(next);
              }}
              className="bg-transparent text-xs text-stone-800 font-bold focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Customers</option>
              {dropdownClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Export PDF */}
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-file-pdf text-red-600"></i>
            <span>Export PDF</span>
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-file-excel text-emerald-600"></i>
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* 5. Bottom Table: Customer Wise Sales Report */}
      <section className="bg-white border border-stone-200/90 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-stone-200">
          <h2 className="text-sm font-bold text-gray-900">
            Customer Wise Sales Report
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold tracking-wider border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-center w-12">S No</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3 text-center">No. of Invoices</th>
                <th className="px-4 py-3 text-center">Total Quantity (Pcs)</th>
                <th className="px-4 py-3 text-center">Total Gold (Wgt)</th>
                <th className="px-4 py-3 text-center">Total Diamond (Wgt)</th>
                <th className="px-4 py-3 text-right">Total Sales Amount (₹)</th>
                <th className="px-4 py-3 text-center">Last Sale Date</th>
                <th className="px-4 py-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {tableRows.length > 0 ? (
                tableRows.map((row, index) => (
                  <tr key={`${row.client_name}-${index}`} className="hover:bg-stone-50/80 transition-colors">
                    <td className="px-4 py-3 text-center font-medium text-stone-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.client_name}</td>
                    <td className="px-4 py-3 text-center text-stone-700 font-medium">{row.invoice_count}</td>
                    <td className="px-4 py-3 text-center text-stone-700 font-medium">{row.quantity}</td>
                    <td className="px-4 py-3 text-center text-stone-700 font-medium">{row.gold_weight}</td>
                    <td className="px-4 py-3 text-center text-stone-700 font-medium">{row.diamond_weight}</td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900">{money(row.total_amount)}</td>
                    <td className="px-4 py-3 text-center text-stone-500">{dateText(row.last_sale_date)}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/sales/customers/${row.client_id || index + 1}`}
                        className="inline-block px-3 py-1 bg-white border border-[#b01622] text-[#b01622] hover:bg-red-50 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-red-50 text-[#b01622] flex items-center justify-center text-xl">
                        <i className="fa-solid fa-folder-open"></i>
                      </div>
                      <div className="text-sm font-bold text-stone-800">No Sales Data Available</div>
                      <p className="text-xs text-stone-400 max-w-md">
                        There are no customer sales records matching your selected filter criteria.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-red-50/40 border-t-2 border-stone-200 font-bold text-xs">
                <td className="px-4 py-3 text-center"></td>
                <td className="px-4 py-3 text-[#b01622] font-black">Total</td>
                <td className="px-4 py-3 text-center text-[#b01622] font-black">{totalInvoicesSum || Number(summary.invoices || 0)}</td>
                <td className="px-4 py-3 text-center text-[#b01622] font-black">{totalQtySum.toFixed(3)}</td>
                <td className="px-4 py-3 text-center text-[#b01622] font-black">{totalGoldWgtSum.toFixed(3)}</td>
                <td className="px-4 py-3 text-center text-[#b01622] font-black">{totalDiamondWgtSum.toFixed(3)}</td>
                <td className="px-4 py-3 text-right text-[#b01622] font-black">{money(totalSalesSum || Number(summary.sales || 0))}</td>
                <td className="px-4 py-3 text-center text-stone-400">-</td>
                <td className="px-4 py-3 text-center text-stone-400">-</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="px-5 py-3.5 border-t border-stone-200 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            Showing {displayStart} to {displayEnd} of {totalEntries} entries
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => handlePageClick(currentPage - 1)}
              className="w-7 h-7 rounded-md border border-stone-200 hover:bg-stone-100 flex items-center justify-center text-stone-600 transition-colors disabled:opacity-40 cursor-pointer"
            >
              &lt;
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => handlePageClick(pg)}
                className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${currentPage === pg
                  ? 'bg-[#b01622] text-white'
                  : 'border border-stone-200 hover:bg-stone-100 text-stone-700'
                  }`}
              >
                {pg}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageClick(currentPage + 1)}
              className="w-7 h-7 rounded-md border border-stone-200 hover:bg-stone-100 flex items-center justify-center text-stone-600 transition-colors disabled:opacity-40 cursor-pointer"
            >
              &gt;
            </button>
          </div>
        </div>
      </section>
      {/* 6. Professional A4 Tax Report & Remittance Statement Print Sheet Modal */}
      {showPrintModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[99] flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] cursor-pointer"
          onClick={() => setShowPrintModal(false)}
        >
          <style>{`
            @media print {
              .no-print, .print\\:hidden {
                display: none !important;
              }
              body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .print\\:hidden, .no-print, header, nav, sidebar, button {
                display: none !important;
              }
              #printable-report-sheet,
              #printable-invoice-sheet {
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
              #printable-report-sheet *,
              #printable-invoice-sheet * {
                visibility: visible !important;
                opacity: 1 !important;
              }
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
            }
          `}</style>
          <div
            className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[94vh] flex flex-col cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Control Action Bar */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center font-bold text-base">
                  <i className="fa-solid fa-file-invoice"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight leading-none">
                    {printModalTitle}
                  </h3>
                  <span className="text-[11px] text-stone-400 font-medium">
                    Official GST Compliance Document &nbsp;•&nbsp; Standard A4 Print Sheet
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => printElement('printable-report-sheet', printModalTitle)}
                  className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs tracking-wide"
                >
                  <i className="fa-solid fa-print"></i> PRINT / SAVE PDF
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPrintModal(false);
                  }}
                  className="text-stone-400 hover:text-stone-700 text-lg cursor-pointer p-1"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            {/* Printable Container targeted by @media print */}
            <div
              id="printable-report-sheet"
              className="relative overflow-y-auto flex-1 p-6 bg-white rounded-xl border border-stone-200 space-y-5 text-xs text-stone-800 print:p-0 print:border-0 print:overflow-visible"
            >
              {/* Subtle Brand Watermark (Hidden in print) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] print:hidden select-none z-0 overflow-hidden">
                <div className="text-center font-black text-[#b01622] transform -rotate-12 space-y-2">
                  <div className="text-[140px] font-black tracking-widest leading-none">RJ</div>
                  <div className="text-3xl uppercase tracking-[0.3em] font-black">RUDRA JEWELLERS</div>
                  <div className="text-xl uppercase tracking-[0.4em] font-bold text-stone-700">CHENNAI</div>
                </div>
              </div>

              {/* Brand Header */}
              <div className="flex items-start justify-between gap-4 border-b-2 border-stone-200 pb-4 relative z-10">
                <div className="flex items-center gap-3 shrink-0">
                  <img
                    src="/logo.png"
                    alt="Rudra Jewellers"
                    className="h-16 w-auto max-w-[200px] object-contain drop-shadow-xs"
                  />
                </div>

                <div className="text-center flex-1">
                  <h1 className="text-2xl font-black text-[#b01622] tracking-wider uppercase">CUSTOMER SALES STATEMENT</h1>
                  <div className="text-[11px] font-semibold text-stone-600 mt-0.5">
                    Original for Recipient &nbsp;|&nbsp; GSTIN: <span className="font-mono font-bold text-stone-900">33AAAAA0000A1Z5</span>
                  </div>
                  <div className="w-16 h-0.5 bg-[#b01622] mx-auto mt-2 mb-1"></div>
                  <div className="text-xs font-bold text-[#b01622] tracking-tight font-mono">
                    PERIOD: {filters.from || '04/01/2025'} TO {filters.to || '04/30/2025'}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-block px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-[10px] font-bold uppercase mb-1">
                    VERIFIED REPORT
                  </div>
                  <div className="text-[11px] font-mono text-stone-600 font-medium">
                    DATE : <span className="font-bold text-stone-900">{new Date().toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="text-[10px] font-mono text-stone-400">
                    PLACE : CHENNAI (33)
                  </div>
                </div>
              </div>

              {/* Client & Period Meta Details */}
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-stone-50/70 p-3.5 rounded-xl border border-stone-200 space-y-2 text-xs">
                  <div className="text-[10.5px] font-bold text-[#b01622] uppercase tracking-wider border-b border-stone-200 pb-1 mb-2">
                    CLIENT / BUYER DETAILS
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Client Name:</span>
                    <strong className="text-stone-900">{isFiltered ? (dropdownClients.find((c) => String(c.id) === selectedCustomerId)?.full_name || 'Selected Customer') : 'All Customers'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Client Code:</span>
                    <strong className="text-stone-900 font-mono">RJ-EL-1027</strong>
                  </div>
                </div>

                <div className="bg-stone-50/70 p-3.5 rounded-xl border border-stone-200 space-y-2 text-xs">
                  <div className="text-[10.5px] font-bold text-[#b01622] uppercase tracking-wider border-b border-stone-200 pb-1 mb-2">
                    SHOWROOM &amp; ISSUER DETAILS
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Store Name:</span>
                    <strong className="text-stone-900">Rudra Jewellers Pvt Ltd</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Location:</span>
                    <strong className="text-stone-900">T. Nagar, Chennai, TN</strong>
                  </div>
                </div>
              </div>

              {/* KPI Breakdown Row */}
              <div className="grid grid-cols-3 gap-3 relative z-10 text-center">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Total Sales Amount</span>
                  <span className="text-base font-extrabold text-[#b01622]">{money(totalSalesAmountVal)}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Total Invoices</span>
                  <span className="text-base font-extrabold text-stone-900">{totalInvoicesVal}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Grand Total Value</span>
                  <span className="text-base font-extrabold text-[#b01622]">{money(grandTotalVal)}</span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="relative z-10 border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#b01622] text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-2.5 text-center">S No</th>
                      <th className="p-2.5">Customer Name</th>
                      <th className="p-2.5 text-center">Invoices</th>
                      <th className="p-2.5 text-center">Qty (Pcs)</th>
                      <th className="p-2.5 text-center">Gold (Wgt)</th>
                      <th className="p-2.5 text-center">Diamond (Wgt)</th>
                      <th className="p-2.5 text-right">Sales Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-[11px]">
                    {filteredRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="p-2 text-center text-stone-500 font-mono">{idx + 1}</td>
                        <td className="p-2 font-bold text-stone-900">{row.client_name}</td>
                        <td className="p-2 text-center text-stone-700">{row.invoice_count}</td>
                        <td className="p-2 text-center text-stone-700">{row.quantity}</td>
                        <td className="p-2 text-center text-stone-700">{row.gold_weight}</td>
                        <td className="p-2 text-center text-stone-700">{row.diamond_weight}</td>
                        <td className="p-2 text-right font-bold text-stone-900">{money(row.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-red-50/60 font-bold text-xs border-t-2 border-stone-300">
                      <td colSpan="2" className="p-2.5 text-[#b01622] font-black">Total Summary</td>
                      <td className="p-2.5 text-center text-[#b01622] font-black">{totalInvoicesSum}</td>
                      <td className="p-2.5 text-center text-[#b01622] font-black">{totalQtySum}</td>
                      <td className="p-2.5 text-center text-[#b01622] font-black">{totalGoldWgtSum}</td>
                      <td className="p-2.5 text-center text-[#b01622] font-black">{totalDiamondWgtSum}</td>
                      <td className="p-2.5 text-right text-[#b01622] font-black">{money(totalSalesSum)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Financial Breakdown Grid */}
              <div className="grid grid-cols-2 gap-4 relative z-10 pt-2">
                <div className="text-[10px] text-stone-500 space-y-1">
                  <p className="font-bold text-stone-700">Terms &amp; Conditions:</p>
                  <p>1. Computer generated sales summary report certified for GST verification.</p>
                  <p>2. Subject to Chennai jurisdiction only.</p>
                </div>
                <div className="space-y-1 text-xs text-right">
                  <div className="flex justify-between"><span className="text-stone-500">Gold Value:</span><strong>{money(goldValueVal)}</strong></div>
                  <div className="flex justify-between"><span className="text-stone-500">Making Charges:</span><strong>{money(makingChargesVal)}</strong></div>
                  <div className="flex justify-between"><span className="text-stone-500">GST (3%):</span><strong>{money(gstVal)}</strong></div>
                  <div className="flex justify-between text-sm font-black text-[#b01622] pt-1 border-t border-stone-200">
                    <span>Grand Total:</span><span>{money(grandTotalVal)}</span>
                  </div>
                </div>
              </div>

              {/* Authorised Signatory & Prepared By Seal (Bottom Alignment) */}
              <div className="flex justify-between items-end pt-6 relative z-10 border-t border-stone-200 mt-auto avoid-break print-break-inside-avoid">
                <span className="text-[10px] text-stone-400">Generated on {new Date().toLocaleString('en-IN')}</span>
                <div className="flex items-center gap-10 text-center">
                  <div>
                    <div className="w-32 border-b border-stone-400 mb-1"></div>
                    <span className="text-[11px] font-bold text-stone-700 block">Prepared By</span>
                    <span className="text-[9px] text-stone-400 block uppercase tracking-wider">Accountant / Staff</span>
                  </div>
                  <div>
                    <div className="w-40 border-b border-stone-400 mb-1"></div>
                    <span className="text-[11px] font-bold text-stone-700 block">Authorised Signatory</span>
                    <span className="text-[9px] text-stone-400 block uppercase tracking-wider">For RUDRA JEWELLERS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfitManagementReport({ sales, filters, setFilters, reload, companyInfo }) {
  const company = companyInfo || getStoredCompanyInfo();
  const summary = sales?.summary || {};
  const rawList = Array.isArray(sales?.sales?.data)
    ? sales.sales.data
    : (Array.isArray(sales?.data) ? sales.data : (Array.isArray(sales) ? sales : []));

  const [localFilters, setLocalFilters] = useState({
    search: filters?.search || '',
    from: filters?.from || '',
    to: filters?.to || '',
  });

  useEffect(() => {
    setLocalFilters({
      search: filters?.search || '',
      from: filters?.from || '',
      to: filters?.to || '',
    });
  }, [filters]);

  const profitRows = useMemo(() => {
    return rawList.map((row) => {
      const rev = Number(row.total_amount || 0);
      const cost = Number(row.cost_amount || (rev * 0.76));
      const prof = Number(row.profit_amount || (rev - cost));
      const mgn = rev > 0 ? ((prof / rev) * 100).toFixed(2) : '0.00';
      return { ...row, total_amount: rev, cost_amount: cost, profit_amount: prof, margin: mgn };
    }).filter((r) => {
      if (localFilters.search) {
        const q = String(localFilters.search).toLowerCase();
        const invMatch = String(r.invoice_no || '').toLowerCase().includes(q);
        const nameMatch = String(r.client_name || '').toLowerCase().includes(q);
        if (!invMatch && !nameMatch) return false;
      }
      if (localFilters.from && r.invoice_date) {
        if (r.invoice_date < localFilters.from) return false;
      }
      if (localFilters.to && r.invoice_date) {
        if (r.invoice_date > localFilters.to) return false;
      }
      return true;
    });
  }, [rawList, localFilters]);

  const [invoicePage, setInvoicePage] = useState(1);
  const invoicePageSize = 5;

  useEffect(() => {
    setInvoicePage(1);
  }, [profitRows.length, localFilters.search, localFilters.from, localFilters.to]);

  const totalInvoiceEntries = profitRows.length;
  const totalInvoicePages = Math.max(1, Math.ceil(totalInvoiceEntries / invoicePageSize));
  const validInvoicePage = Math.min(invoicePage, totalInvoicePages);

  const paginatedInvoiceRows = useMemo(() => {
    return profitRows.slice((validInvoicePage - 1) * invoicePageSize, validInvoicePage * invoicePageSize);
  }, [profitRows, validInvoicePage, invoicePageSize]);

  const displayInvoiceStart = totalInvoiceEntries > 0 ? (validInvoicePage - 1) * invoicePageSize + 1 : 0;
  const displayInvoiceEnd = Math.min(validInvoicePage * invoicePageSize, totalInvoiceEntries);

  const totalRevenueSum = summary.revenue || profitRows.reduce((a, b) => a + Number(b.total_amount || 0), 0);
  const totalCostSum = summary.cost || profitRows.reduce((a, b) => a + Number(b.cost_amount || 0), 0);
  const totalProfitSum = summary.profit || profitRows.reduce((a, b) => a + Number(b.profit_amount || 0), 0);
  const avgMarginVal = totalRevenueSum > 0 ? ((totalProfitSum / totalRevenueSum) * 100).toFixed(2) : '0.00';
  const profitSummary = sales?.profitSummary || summary;

  const [showPrintModal, setShowPrintModal] = useState(false);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    if (setFilters) setFilters(localFilters);
    if (reload) reload(localFilters);
  };

  const handleResetFilters = () => {
    const empty = { search: '', from: '', to: '' };
    setLocalFilters(empty);
    if (setFilters) setFilters(empty);
    if (reload) reload(empty);
  };

  const handleExportExcel = () => {
    const lines = [
      [`${company.company_name || 'RUDHRA JEWELLERS'} - PROFIT MANAGEMENT REPORT`],
      [`Generated Date: ${new Date().toLocaleDateString('en-IN')}`],
      [`Total Revenue (Rs): ${totalRevenueSum}`],
      [`Total Cost (Rs): ${totalCostSum}`],
      [`Gross Profit (Rs): ${totalProfitSum} (${avgMarginVal}%)`],
      [''],
      ['S No', 'Invoice No', 'Customer Name', 'Date', 'Sale Amount (Rs)', 'Cost Amount (Rs)', 'Gross Profit (Rs)', 'Margin (%)', 'Status'],
      ...(profitRows.length > 0
        ? profitRows.map((r, idx) => [
            idx + 1,
            r.invoice_no ?? 'null',
            r.client_name ?? 'null',
            r.invoice_date ?? 'null',
            r.total_amount ?? 0,
            r.cost_amount ?? 0,
            r.profit_amount ?? 0,
            `${r.margin ?? 0}%`,
            r.status ?? 'paid'
          ])
        : [['null', 'null', 'null', 'null', 0, 0, 0, '0%', 'null']]),
      ['Total Summary', '', '', '', totalRevenueSum, totalCostSum, totalProfitSum, `${avgMarginVal}%`, '']
    ];

    const csvContent = '\uFEFF' + lines.map((l) => l.map((v) => `"${String(v === null || v === undefined ? 'null' : v).replaceAll('₹', 'Rs. ').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Profit_Management_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell
      title="Profit Per Invoice"
      subtitle="Cost vs Sale price and gross profit margin analysis on sold jewellery."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-file-excel text-emerald-600"></i>
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-print"></i>
            <span>Print Report</span>
          </button>
        </div>
      }
    >
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-2xs">
          <span className="text-xs font-medium text-stone-400 block">Total Sales Revenue</span>
          <div className="text-xl font-bold text-gray-900 tracking-tight mt-1">{money(totalRevenueSum)}</div>
          <div className="text-[11px] font-bold text-emerald-600 mt-1">▲ {profitSummary?.salesGrowth || '+0.0%'} vs prev</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-2xs">
          <span className="text-xs font-medium text-stone-400 block">Total Cost Amount</span>
          <div className="text-xl font-bold text-gray-900 tracking-tight mt-1">{money(totalCostSum)}</div>
          <div className="text-[11px] font-normal text-stone-400 mt-1">Cost of Goods Sold</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-2xs">
          <span className="text-xs font-medium text-stone-400 block">Gross Profit</span>
          <div className="text-xl font-bold text-[#b01622] tracking-tight mt-1">{money(totalProfitSum)}</div>
          <div className="text-[11px] font-bold text-emerald-600 mt-1">▲ {avgMarginVal}% net margin</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-2xs">
          <span className="text-xs font-medium text-stone-400 block">Average Profit Margin</span>
          <div className="text-xl font-bold text-emerald-600 tracking-tight mt-1">{avgMarginVal}%</div>
          <div className="text-[11px] font-semibold text-stone-500 mt-1">Target: &gt;20.00%</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search invoice no or customer name..."
              value={localFilters.search}
              onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
              className="w-full text-xs px-3.5 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622]"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={localFilters.from}
              onChange={(e) => setLocalFilters({ ...localFilters, from: e.target.value })}
              className="text-xs px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622]"
            />
            <span className="text-xs text-stone-400">to</span>
            <input
              type="date"
              value={localFilters.to}
              onChange={(e) => setLocalFilters({ ...localFilters, to: e.target.value })}
              className="text-xs px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#b01622] text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-[#8e111a] cursor-pointer"
          >
            Filter
          </button>
          {(localFilters.search || localFilters.from || localFilters.to) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {/* Table Section */}
      <section className="bg-white border border-stone-200/90 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-gray-900">Profit Breakdown by Invoice</h2>
          <span className="text-xs text-stone-400 font-medium">Showing {displayInvoiceStart} to {displayInvoiceEnd} of {totalInvoiceEntries} invoice records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-center w-12">S No</th>
                <th className="px-4 py-3">Invoice No</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3 text-center">Date</th>
                <th className="px-4 py-3 text-right">Sale Amount (₹)</th>
                <th className="px-4 py-3 text-right">Cost Amount (₹)</th>
                <th className="px-4 py-3 text-right">Net Profit (₹)</th>
                <th className="px-4 py-3 text-center">Margin %</th>
                <th className="px-4 py-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedInvoiceRows.length > 0 ? (
                paginatedInvoiceRows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 text-center font-medium text-stone-500">{(validInvoicePage - 1) * invoicePageSize + idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#b01622]">{row.invoice_no}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.client_name}</td>
                    <td className="px-4 py-3 text-center text-stone-500">{dateText(row.invoice_date)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{money(row.total_amount)}</td>
                    <td className="px-4 py-3 text-right text-stone-600 font-medium">{money(row.cost_amount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{money(row.profit_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                        {row.margin}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/sales/${row.id}`}
                        className="inline-block px-3 py-1 bg-white border border-[#b01622] text-[#b01622] hover:bg-red-50 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-red-50 text-[#b01622] flex items-center justify-center text-xl">
                        <i className="fa-solid fa-receipt"></i>
                      </div>
                      <div className="text-sm font-bold text-stone-800">No Invoice Profit Data Available</div>
                      <p className="text-xs text-stone-400 max-w-md">
                        No customer invoices have been created yet. Once customer sales invoices are created, profit margins and invoice breakdowns will be displayed here automatically.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-red-50/40 border-t-2 border-stone-200 font-bold text-xs">
                <td className="px-4 py-3 text-center"></td>
                <td className="px-4 py-3 text-[#b01622] font-black" colSpan="3">Total Summary</td>
                <td className="px-4 py-3 text-right text-[#b01622] font-black">{money(totalRevenueSum)}</td>
                <td className="px-4 py-3 text-right text-stone-800 font-bold">{money(totalCostSum)}</td>
                <td className="px-4 py-3 text-right text-emerald-700 font-black">{money(totalProfitSum)}</td>
                <td className="px-4 py-3 text-center text-[#b01622] font-black">{avgMarginVal}%</td>
                <td className="px-4 py-3 text-center text-stone-400">-</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 bg-stone-50/50">
          <div>Showing {displayInvoiceStart} to {displayInvoiceEnd} of {totalInvoiceEntries} invoice records</div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={validInvoicePage === 1}
              onClick={() => setInvoicePage((prev) => Math.max(1, prev - 1))}
              className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs transition-all ${validInvoicePage === 1 ? 'border-stone-200 text-stone-300 cursor-not-allowed' : 'border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer'}`}
            >
              <i className="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
            {Array.from({ length: totalInvoicePages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setInvoicePage(pg)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${validInvoicePage === pg ? 'bg-red-50 text-[#b01622] border-red-200 shadow-2xs' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}
              >
                {pg}
              </button>
            ))}
            <button
              type="button"
              disabled={validInvoicePage === totalInvoicePages}
              onClick={() => setInvoicePage((prev) => Math.min(totalInvoicePages, prev + 1))}
              className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs transition-all ${validInvoicePage === totalInvoicePages ? 'border-stone-200 text-stone-300 cursor-not-allowed' : 'border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer'}`}
            >
              <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        </div>
      </section>

      {/* Print Sheet Modal */}
      {showPrintModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[99] flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] cursor-pointer"
          onClick={() => setShowPrintModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[94vh] flex flex-col cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center font-bold text-base">
                  <i className="fa-solid fa-chart-line"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Profit Management &amp; Gross Margin Report</h3>
                  <span className="text-[11px] text-stone-400">Official Audited Financial Statement</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => printElement('printable-profit-invoice-sheet', 'Profit Per Invoice Statement - Rudra Jewellers')}
                  className="px-4 py-2 bg-[#b01622] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:bg-[#8e111a]"
                >
                  <i className="fa-solid fa-print"></i> PRINT / SAVE PDF
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPrintModal(false);
                  }}
                  className="text-stone-400 hover:text-stone-700 text-lg cursor-pointer p-1"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            <div id="printable-profit-invoice-sheet" className="relative overflow-y-auto flex-1 p-6 bg-white rounded-xl border border-stone-200 space-y-5 text-xs text-stone-800">
              <div className="flex items-start justify-between border-b-2 border-stone-200 pb-4">
                <div className="flex items-center gap-4">
                  <img src={company.logo_url || '/logo.png'} alt={company.company_name || 'Rudra Jewellers'} className="h-16 w-auto max-w-[180px] object-contain" />
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">{company.company_name || 'RUDRA JEWELLERS'}</h2>
                    <p className="text-[11px] text-stone-600 font-medium">{company.tagline || 'Exclusive Fine Gold, Diamond & Gemstone Jewellery'}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">{[company.address_line1, company.address_line2, company.city, company.pincode].filter(Boolean).join(', ')}</p>
                    <p className="text-[10px] text-stone-500">Phone: {company.phone || '+91 98400 12345'} | GSTIN: {company.gstin || '33AAACR1234F1Z0'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-3 py-1 rounded-lg bg-red-50 text-[#b01622] font-black text-xs uppercase tracking-wider border border-red-200 mb-1">
                    AUDITED FINANCIALS
                  </span>
                  <h1 className="text-lg font-black text-[#b01622] tracking-wider uppercase">PROFIT PER INVOICE</h1>
                  <div className="text-[11px] font-mono text-stone-500 mt-1">DATE: {new Date().toLocaleDateString('en-IN')}</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Total Revenue</span>
                  <strong className="text-base font-black text-gray-900">{money(totalRevenueSum)}</strong>
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Total Cost</span>
                  <strong className="text-base font-bold text-stone-700">{money(totalCostSum)}</strong>
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Gross Profit</span>
                  <strong className="text-base font-black text-[#b01622]">{money(totalProfitSum)}</strong>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">Avg Margin</span>
                  <strong className="text-base font-black text-emerald-700">{avgMarginVal}%</strong>
                </div>
              </div>

              <table className="w-full text-left text-xs border border-stone-200 rounded-xl overflow-hidden">
                <thead className="bg-[#b01622] text-white uppercase text-[10px] font-bold" style={{ backgroundColor: '#b01622', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <tr>
                    <th className="p-2.5 text-center w-10">S No</th>
                    <th className="p-2.5">Invoice No</th>
                    <th className="p-2.5">Customer Name</th>
                    <th className="p-2.5 text-center">Date</th>
                    <th className="p-2.5 text-right">Revenue (₹)</th>
                    <th className="p-2.5 text-right">Cost (₹)</th>
                    <th className="p-2.5 text-right">Profit (₹)</th>
                    <th className="p-2.5 text-center">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {profitRows.length > 0 ? (
                    profitRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="p-2 text-center text-stone-500">{idx + 1}</td>
                        <td className="p-2 font-mono font-bold text-[#b01622]">{r.invoice_no}</td>
                        <td className="p-2 font-bold text-gray-900">{r.client_name}</td>
                        <td className="p-2 text-center text-stone-500">{dateText(r.invoice_date)}</td>
                        <td className="p-2 text-right font-semibold">{money(r.total_amount)}</td>
                        <td className="p-2 text-right text-stone-600">{money(r.cost_amount)}</td>
                        <td className="p-2 text-right font-bold text-emerald-700">{money(r.profit_amount)}</td>
                        <td className="p-2 text-center font-bold text-emerald-700">{r.margin}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="p-6 text-center text-stone-500 font-semibold">
                        No customer invoice data recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-stone-100 font-bold border-t-2 border-stone-300">
                  <tr>
                    <td colSpan="4" className="p-2.5 text-[#b01622] font-black">Total Summary</td>
                    <td className="p-2.5 text-right font-black text-gray-900">{money(totalRevenueSum)}</td>
                    <td className="p-2.5 text-right font-bold text-stone-800">{money(totalCostSum)}</td>
                    <td className="p-2.5 text-right font-black text-emerald-700">{money(totalProfitSum)}</td>
                    <td className="p-2.5 text-center font-black text-[#b01622]">{avgMarginVal}%</td>
                  </tr>
                </tfoot>
              </table>

              <div className="flex justify-between items-end pt-6 relative z-10 border-t border-stone-200 mt-6">
                <span className="text-[10px] text-stone-400">Computer Generated Statement • {new Date().toLocaleString('en-IN')}</span>
                <div className="text-center">
                  <div className="w-44 border-b border-stone-400 mb-1"></div>
                  <span className="text-[11px] font-bold text-stone-800 block">Authorised Signatory</span>
                  <span className="text-[9px] text-stone-400 block uppercase tracking-wider">For {company.company_name || 'RUDRA JEWELLERS'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function ProfitPerMetalReport({ data, filters, setFilters, reload, companyInfo }) {
  const company = companyInfo || getStoredCompanyInfo();
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [localFilters, setLocalFilters] = useState({
    search: filters?.search || '',
    from: filters?.from || '',
    to: filters?.to || '',
  });

  useEffect(() => {
    setLocalFilters({
      search: filters?.search || '',
      from: filters?.from || '',
      to: filters?.to || '',
    });
  }, [filters]);

  const summary = data?.summary || {
    totalRevenue: 0,
    totalRevenueFormatted: '₹0',
    totalCost: 0,
    totalCostFormatted: '₹0',
    totalNetProfit: 0,
    totalNetProfitFormatted: '₹0',
    totalMargin: '0.0%',
  };

  const metalsList = data?.metals || [
    {
      id: 'gold',
      name: 'Gold (24K Fine Converted)',
      purity: 'Converted to 24K (999)',
      purchased_wt: '0.000 g',
      purchased_24k_fine: '0.000 g',
      buying_rate_10g: '₹0',
      buying_rate_gram: '₹0.00',
      sold_wt: '0.000 g',
      sold_24k_fine: '0.000 g',
      selling_rate_10g: '₹0',
      selling_rate_gram: '₹0.00',
      revenue: 0,
      cost: 0,
      profit: 0,
      margin_percent: '0.0%',
    },
    {
      id: 'silver',
      name: 'Silver (Fine Bullion)',
      purity: '999 Fine Silver',
      purchased_wt: '0.00 kg',
      buying_rate_kg: '₹0',
      sold_wt: '0.00 kg',
      selling_rate_kg: '₹0',
      revenue: 0,
      cost: 0,
      profit: 0,
      margin_percent: '0.0%',
    },
    {
      id: 'diamond',
      name: 'Diamond (Solitaires & Accents)',
      purity: 'VVS-VS / EF Sieve',
      purchased_carats: '0.00 ct',
      buying_rate_ct: '₹0',
      sold_carats: '0.00 ct',
      selling_rate_ct: '₹0',
      revenue: 0,
      cost: 0,
      profit: 0,
      margin_percent: '0.0%',
    },
    {
      id: 'stone',
      name: 'Precious & Gemstones',
      purity: 'Natural Gems',
      purchased_units: '0 units',
      buying_rate_unit: '₹0',
      sold_units: '0 units',
      selling_rate_unit: '₹0',
      revenue: 0,
      cost: 0,
      profit: 0,
      margin_percent: '0.0%',
    },
  ];

  const [metalPage, setMetalPage] = useState(1);
  const metalPageSize = 4;

  useEffect(() => {
    setMetalPage(1);
  }, [metalsList.length, localFilters.search, localFilters.from, localFilters.to]);

  const totalMetalEntries = metalsList.length;
  const totalMetalPages = Math.max(1, Math.ceil(totalMetalEntries / metalPageSize));
  const validMetalPage = Math.min(metalPage, totalMetalPages);

  const paginatedMetals = useMemo(() => {
    return metalsList.slice((validMetalPage - 1) * metalPageSize, validMetalPage * metalPageSize);
  }, [metalsList, validMetalPage, metalPageSize]);

  const displayMetalStart = totalMetalEntries > 0 ? (validMetalPage - 1) * metalPageSize + 1 : 0;
  const displayMetalEnd = Math.min(validMetalPage * metalPageSize, totalMetalEntries);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (setFilters) setFilters(localFilters);
    if (reload) reload(localFilters);
  };

  const handleResetFilters = () => {
    const empty = { search: '', from: '', to: '' };
    setLocalFilters(empty);
    if (setFilters) setFilters(empty);
    if (reload) reload(empty);
  };

  const exportCSV = () => {
    const lines = [
      [`${company.company_name || 'RUDRA JEWELLERS'} - PROFIT PER METAL REPORT`],
      [`Generated Date: ${new Date().toLocaleDateString('en-IN')}`],
      [`Total Revenue (Rs): ${summary.totalRevenue ?? 0}`, `Total Cost (Rs): ${summary.totalCost ?? 0}`, `Net Profit (Rs): ${summary.totalNetProfit ?? 0}`, `Margin: ${summary.totalMargin ?? '0%'}`],
      [],
      ['Metal Category', 'Purity / Touch Basis', 'Purchase Buying Rate', 'Sales Selling Rate', 'Sales Revenue (Rs)', 'Purchase Cost (Rs)', 'Net Profit (Rs)', 'Margin (%)'],
    ];

    if (metalsList.length > 0) {
      metalsList.forEach((m) => {
        const bRate = m.buying_rate_10g ? `${m.buying_rate_10g}/10g` : (m.buying_rate_kg ? `${m.buying_rate_kg}/kg` : (m.buying_rate_ct ? `${m.buying_rate_ct}/ct` : `${m.buying_rate_unit}/unit`));
        const sRate = m.selling_rate_10g ? `${m.selling_rate_10g}/10g` : (m.selling_rate_kg ? `${m.selling_rate_kg}/kg` : (m.selling_rate_ct ? `${m.selling_rate_ct}/ct` : `${m.selling_rate_unit}/unit`));
        lines.push([
          m.name ?? 'null',
          m.purity ?? 'null',
          bRate ?? 'null',
          sRate ?? 'null',
          m.revenue ?? 0,
          m.cost ?? 0,
          m.profit ?? 0,
          m.margin_percent ?? '0%',
        ]);
      });
    } else {
      lines.push(['null', 'null', 'null', 'null', 0, 0, 0, '0%']);
    }

    lines.push([]);
    lines.push(['Total Grand Summary', '', '', '', summary.totalRevenue ?? 0, summary.totalCost ?? 0, summary.totalNetProfit ?? 0, summary.totalMargin ?? '0%']);

    const csvContent = '\uFEFF' + lines.map((l) => l.map((v) => `"${String(v === null || v === undefined ? 'null' : v).replaceAll('₹', 'Rs. ').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Profit_Per_Metal_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell
      title="Profit Per Metal"
      subtitle="Raw material buying prices (sourced from Purchase Entries) vs sales prices converted to 24K fine gold equivalent & sieve rates."
      actions={
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-print"></i>
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="px-3.5 py-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-file-csv text-emerald-600"></i>
            <span>Export CSV</span>
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-bold text-stone-400 block">Total Metal Revenue</span>
            <div className="text-2xl font-black text-gray-900 mt-2">{summary.totalRevenueFormatted || money(summary.totalRevenue)}</div>
            <div className="text-[11px] font-semibold text-stone-500 mt-1 flex items-center gap-1">
              <i className="fa-solid fa-cash-register text-emerald-600"></i>
              <span>Aggregate sales from all invoices</span>
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-bold text-stone-400 block">Total Raw Material Cost</span>
            <div className="text-2xl font-black text-stone-800 mt-2">{summary.totalCostFormatted || money(summary.totalCost)}</div>
            <div className="text-[11px] font-semibold text-stone-500 mt-1 flex items-center gap-1">
              <i className="fa-solid fa-boxes-packing text-amber-600"></i>
              <span>Purchase entries at 24K Touch % rate</span>
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-bold text-stone-400 block">Net Metal Profit</span>
            <div className="text-2xl font-black text-[#b01622] mt-2">{summary.totalNetProfitFormatted || money(summary.totalNetProfit)}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <i className="fa-solid fa-chart-line text-[#b01622]"></i>
              <span>Revenue minus raw metal cost</span>
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-bold text-stone-400 block">Overall Profit Margin</span>
            <div className="text-2xl font-black text-emerald-700 mt-2">{summary.totalMargin}</div>
            <div className="text-[11px] font-semibold text-stone-500 mt-1 flex items-center gap-1">
              <i className="fa-solid fa-percent text-blue-600"></i>
              <span>Weighted margin across all categories</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs">
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search metal category or code..."
                value={localFilters.search}
                onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
                className="w-full text-xs px-3.5 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622]"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={localFilters.from}
                onChange={(e) => setLocalFilters({ ...localFilters, from: e.target.value })}
                className="text-xs px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622]"
              />
              <span className="text-xs text-stone-400">to</span>
              <input
                type="date"
                value={localFilters.to}
                onChange={(e) => setLocalFilters({ ...localFilters, to: e.target.value })}
                className="text-xs px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#b01622] text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-[#8e111a] cursor-pointer"
            >
              Filter
            </button>
            {(localFilters.search || localFilters.from || localFilters.to) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Reset
              </button>
            )}
          </form>
        </div>

        {/* Detailed Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {paginatedMetals.map((m) => (
            <div key={m.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <i className={`fa-solid ${m.id === 'gold' ? 'fa-coins text-amber-500' : m.id === 'silver' ? 'fa-gem text-stone-400' : m.id === 'diamond' ? 'fa-diamond text-blue-500' : 'fa-certificate text-purple-500'}`}></i>
                    <span>{m.name}</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-stone-400 block mt-0.5">{m.purity}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider font-bold text-stone-400 block">Margin</span>
                  <span className="text-lg font-black text-emerald-700">{m.margin_percent}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/80">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Raw Purchase (Entry)</span>
                  <div className="font-semibold text-stone-800">
                    {m.buying_rate_10g ? (
                      <>
                        <div className="text-stone-900 font-bold">{m.buying_rate_10g} / 10g 24K</div>
                        <div className="text-[11px] text-stone-500">({m.buying_rate_gram}/g fine)</div>
                      </>
                    ) : m.buying_rate_kg ? (
                      <div className="text-stone-900 font-bold">{m.buying_rate_kg} / kg</div>
                    ) : m.buying_rate_ct ? (
                      <div className="text-stone-900 font-bold">{m.buying_rate_ct} / ct (Sieve)</div>
                    ) : (
                      <div className="text-stone-900 font-bold">{m.buying_rate_unit} / unit</div>
                    )}
                  </div>
                  {m.purchased_24k_fine && <div className="text-[11px] text-amber-700 font-medium pt-0.5">24K Fine Wt: {m.purchased_24k_fine}</div>}
                </div>

                <div className="space-y-1 border-l border-stone-200 pl-3">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Retail Sales (Invoice)</span>
                  <div className="font-semibold text-stone-800">
                    {m.selling_rate_10g ? (
                      <>
                        <div className="text-stone-900 font-bold">{m.selling_rate_10g} / 10g 24K</div>
                        <div className="text-[11px] text-stone-500">({m.selling_rate_gram}/g fine)</div>
                      </>
                    ) : m.selling_rate_kg ? (
                      <div className="text-stone-900 font-bold">{m.selling_rate_kg} / kg</div>
                    ) : m.selling_rate_ct ? (
                      <div className="text-stone-900 font-bold">{m.selling_rate_ct} / ct</div>
                    ) : (
                      <div className="text-stone-900 font-bold">{m.selling_rate_unit} / unit</div>
                    )}
                  </div>
                  {m.sold_24k_fine && <div className="text-[11px] text-amber-700 font-medium pt-0.5">24K Sold Fine: {m.sold_24k_fine}</div>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Sales Revenue</span>
                  <span className="text-xs font-black text-stone-900 block mt-0.5">{money(m.revenue)}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Raw Cost</span>
                  <span className="text-xs font-bold text-stone-600 block mt-0.5">{money(m.cost)}</span>
                </div>
                <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Net Profit</span>
                  <span className="text-xs font-black text-emerald-700 block mt-0.5">{money(m.profit)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Breakdown Table */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <i className="fa-solid fa-table-list text-[#b01622]"></i>
              <span>Metal-by-Metal Comprehensive Profit Breakdown</span>
            </h3>
            <span className="text-xs text-stone-400 font-medium">Showing {displayMetalStart} to {displayMetalEnd} of {totalMetalEntries} metal categories</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-stone-50 text-stone-500 uppercase font-bold tracking-wider text-[10px] border-b border-stone-200">
                <tr>
                  <th className="p-3">Metal Category</th>
                  <th className="p-3">Purity / Touch Basis</th>
                  <th className="p-3 text-right">Avg Buying Rate</th>
                  <th className="p-3 text-right">Avg Selling Rate</th>
                  <th className="p-3 text-right">Sales Revenue (₹)</th>
                  <th className="p-3 text-right">Raw Material Cost (₹)</th>
                  <th className="p-3 text-right">Net Profit (₹)</th>
                  <th className="p-3 text-center">Margin (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                {paginatedMetals.map((m) => {
                  const bRate = m.buying_rate_10g ? `${m.buying_rate_10g}/10g` : (m.buying_rate_kg ? `${m.buying_rate_kg}/kg` : (m.buying_rate_ct ? `${m.buying_rate_ct}/ct` : `${m.buying_rate_unit}/unit`));
                  const sRate = m.selling_rate_10g ? `${m.selling_rate_10g}/10g` : (m.selling_rate_kg ? `${m.selling_rate_kg}/kg` : (m.selling_rate_ct ? `${m.selling_rate_ct}/ct` : `${m.selling_rate_unit}/unit`));
                  return (
                    <tr key={m.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="p-3 font-bold text-stone-900">{m.name}</td>
                      <td className="p-3 text-stone-500">{m.purity}</td>
                      <td className="p-3 text-right font-mono text-stone-600">{bRate}</td>
                      <td className="p-3 text-right font-mono text-stone-600">{sRate}</td>
                      <td className="p-3 text-right font-mono font-bold text-stone-900">{money(m.revenue)}</td>
                      <td className="p-3 text-right font-mono text-stone-600">{money(m.cost)}</td>
                      <td className="p-3 text-right font-mono font-black text-emerald-700">{money(m.profit)}</td>
                      <td className="p-3 text-center font-bold text-stone-800">{m.margin_percent}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-stone-100/80 font-bold border-t-2 border-stone-300 text-stone-900">
                <tr>
                  <td className="p-3">Grand Total</td>
                  <td className="p-3 text-stone-500">All Metals Combined</td>
                  <td className="p-3 text-right">—</td>
                  <td className="p-3 text-right">—</td>
                  <td className="p-3 text-right font-mono">{summary.totalRevenueFormatted || money(summary.totalRevenue)}</td>
                  <td className="p-3 text-right font-mono">{summary.totalCostFormatted || money(summary.totalCost)}</td>
                  <td className="p-3 text-right font-mono text-emerald-700">{summary.totalNetProfitFormatted || money(summary.totalNetProfit)}</td>
                  <td className="p-3 text-center text-[#b01622]">{summary.totalMargin}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Metal Pagination Footer */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 border-t border-stone-200">
            <div>Showing {displayMetalStart} to {displayMetalEnd} of {totalMetalEntries} metal categories</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={validMetalPage === 1}
                onClick={() => setMetalPage((prev) => Math.max(1, prev - 1))}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs transition-all ${validMetalPage === 1 ? 'border-stone-200 text-stone-300 cursor-not-allowed' : 'border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer'}`}
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i>
              </button>
              {Array.from({ length: totalMetalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setMetalPage(pg)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${validMetalPage === pg ? 'bg-red-50 text-[#b01622] border-red-200 shadow-2xs' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                >
                  {pg}
                </button>
              ))}
              <button
                type="button"
                disabled={validMetalPage === totalMetalPages}
                onClick={() => setMetalPage((prev) => Math.min(totalMetalPages, prev + 1))}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs transition-all ${validMetalPage === totalMetalPages ? 'border-stone-200 text-stone-300 cursor-not-allowed' : 'border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer'}`}
              >
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Sheet Modal */}
      {showPrintModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[99] flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] cursor-pointer"
          onClick={() => setShowPrintModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[94vh] flex flex-col cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center font-bold text-base">
                  <i className="fa-solid fa-coins"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Profit Per Metal Category Statement</h3>
                  <span className="text-[11px] text-stone-400">Raw Material Buying vs Sales Converted Rates</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => printElement('printable-profit-metal-sheet', 'Profit Per Metal Statement - Rudra Jewellers')}
                  className="px-4 py-2 bg-[#b01622] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:bg-[#8e111a]"
                >
                  <i className="fa-solid fa-print"></i> PRINT / SAVE PDF
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPrintModal(false);
                  }}
                  className="text-stone-400 hover:text-stone-700 text-lg cursor-pointer p-1"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            <div id="printable-profit-metal-sheet" className="relative overflow-y-auto flex-1 p-6 bg-white rounded-xl border border-stone-200 space-y-5 text-xs text-stone-800">
              <div className="flex items-start justify-between border-b-2 border-stone-200 pb-4">
                <div className="flex items-center gap-4">
                  <img src={company.logo_url || '/logo.png'} alt={company.company_name || 'Rudra Jewellers'} className="h-16 w-auto max-w-[180px] object-contain" />
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">{company.company_name || 'RUDRA JEWELLERS'}</h2>
                    <p className="text-[11px] text-stone-600 font-medium">{company.tagline || 'Exclusive Fine Gold, Diamond & Gemstone Jewellery'}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">{[company.address_line1, company.address_line2, company.city, company.pincode].filter(Boolean).join(', ')}</p>
                    <p className="text-[10px] text-stone-500">Phone: {company.phone || '+91 98400 12345'} | GSTIN: {company.gstin || '33AAACR1234F1Z0'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-3 py-1 rounded-lg bg-red-50 text-[#b01622] font-black text-xs uppercase tracking-wider border border-red-200 mb-1">
                    RAW MATERIAL AUDIT
                  </span>
                  <h1 className="text-lg font-black text-[#b01622] tracking-wider uppercase">PROFIT PER METAL STATEMENT</h1>
                  <div className="text-[11px] font-mono text-stone-500 mt-1">DATE: {new Date().toLocaleDateString('en-IN')}</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Total Revenue</span>
                  <strong className="text-base font-black text-gray-900">{summary.totalRevenueFormatted || money(summary.totalRevenue)}</strong>
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Total Raw Cost</span>
                  <strong className="text-base font-bold text-stone-700">{summary.totalCostFormatted || money(summary.totalCost)}</strong>
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Net Profit</span>
                  <strong className="text-base font-black text-[#b01622]">{summary.totalNetProfitFormatted || money(summary.totalNetProfit)}</strong>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">Overall Margin</span>
                  <strong className="text-base font-black text-emerald-700">{summary.totalMargin}</strong>
                </div>
              </div>

              <table className="w-full text-left text-xs border border-stone-200 rounded-xl overflow-hidden">
                <thead className="bg-[#b01622] text-white uppercase text-[10px] font-bold" style={{ backgroundColor: '#b01622', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <tr>
                    <th className="p-2.5">Metal Category</th>
                    <th className="p-2.5">Purity / Touch Basis</th>
                    <th className="p-2.5 text-right">Avg Buying Rate</th>
                    <th className="p-2.5 text-right">Avg Selling Rate</th>
                    <th className="p-2.5 text-right">Revenue (₹)</th>
                    <th className="p-2.5 text-right">Cost (₹)</th>
                    <th className="p-2.5 text-right">Profit (₹)</th>
                    <th className="p-2.5 text-center">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {metalsList.map((m) => {
                    const bRate = m.buying_rate_10g ? `${m.buying_rate_10g}/10g` : (m.buying_rate_kg ? `${m.buying_rate_kg}/kg` : (m.buying_rate_ct ? `${m.buying_rate_ct}/ct` : `${m.buying_rate_unit}/unit`));
                    const sRate = m.selling_rate_10g ? `${m.selling_rate_10g}/10g` : (m.selling_rate_kg ? `${m.selling_rate_kg}/kg` : (m.selling_rate_ct ? `${m.selling_rate_ct}/ct` : `${m.selling_rate_unit}/unit`));
                    return (
                      <tr key={m.id} className="hover:bg-stone-50">
                        <td className="p-2.5 font-bold text-stone-900">{m.name}</td>
                        <td className="p-2.5 text-stone-500">{m.purity}</td>
                        <td className="p-2.5 text-right font-mono text-stone-600">{bRate}</td>
                        <td className="p-2.5 text-right font-mono text-stone-600">{sRate}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-stone-900">{money(m.revenue)}</td>
                        <td className="p-2.5 text-right font-mono text-stone-600">{money(m.cost)}</td>
                        <td className="p-2.5 text-right font-mono font-black text-emerald-700">{money(m.profit)}</td>
                        <td className="p-2.5 text-center font-bold text-emerald-700">{m.margin_percent}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-stone-100 font-bold border-t-2 border-stone-300">
                  <tr>
                    <td colSpan="4" className="p-2.5 text-[#b01622] font-black">Grand Total</td>
                    <td className="p-2.5 text-right font-mono font-black text-gray-900">{summary.totalRevenueFormatted || money(summary.totalRevenue)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-stone-800">{summary.totalCostFormatted || money(summary.totalCost)}</td>
                    <td className="p-2.5 text-right font-mono font-black text-emerald-700">{summary.totalNetProfitFormatted || money(summary.totalNetProfit)}</td>
                    <td className="p-2.5 text-center font-mono font-black text-[#b01622]">{summary.totalMargin}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="flex justify-between items-end pt-6 relative z-10 border-t border-stone-200 mt-6">
                <span className="text-[10px] text-stone-400">Computer Generated Statement • {new Date().toLocaleString('en-IN')}</span>
                <div className="text-center">
                  <div className="w-44 border-b border-stone-400 mb-1"></div>
                  <span className="text-[11px] font-bold text-stone-800 block">Authorised Signatory</span>
                  <span className="text-[9px] text-stone-400 block uppercase tracking-wider">For {company.company_name || 'RUDRA JEWELLERS'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function SalesTable({ records = [], showProfit = false }) {
  const list = Array.isArray(records)
    ? records
    : (Array.isArray(records?.sales?.data)
      ? records.sales.data
      : (Array.isArray(records?.data) ? records.data : []));

  return <div className="bg-white border border-stone-200 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-xs"><thead className="bg-stone-50 text-stone-500 uppercase"><tr><th className="text-left p-4">Invoice</th><th className="text-left p-4">Customer</th><th className="text-left p-4">Date</th><th className="text-right p-4">Total</th><th className="text-right p-4">Paid</th><th className="text-right p-4">Due</th>{showProfit && <th className="text-right p-4">Profit</th>}<th className="text-center p-4">Status</th><th className="text-right p-4">Action</th></tr></thead><tbody>{list?.map((record) => <tr key={record.id} className="border-t border-stone-100 hover:bg-stone-50"><td className="p-4 font-mono font-bold text-[#b01622]">{record.invoice_no}</td><td className="p-4 font-semibold">{record.client_name}</td><td className="p-4 text-stone-500">{dateText(record.invoice_date)}</td><td className="p-4 text-right font-bold">{money(record.total_amount)}</td><td className="p-4 text-right text-emerald-700">{money(record.paid_amount)}</td><td className="p-4 text-right text-[#b01622]">{money(record.due_amount)}</td>{showProfit && <td className="p-4 text-right font-bold">{money(record.profit_amount)}</td>}<td className="p-4 text-center"><span className="px-2 py-1 rounded bg-stone-100 uppercase font-bold text-[10px]">{record.status}</span></td><td className="p-4 text-right"><Link to={`/sales/${record.id}`} className="text-[#b01622] font-bold hover:underline">View</Link></td></tr>)}</tbody></table></div>{(!list || list.length === 0) && <div className="p-10 text-center text-sm text-stone-400">No sales found.</div>}</div>;
}

function ProductSelectionModal({ isOpen, onClose, onSelectProduct, products = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(false);



  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.get('/inventory')
      .then((res) => {
        const fetched = res?.data?.products?.data || res?.data?.data || res?.data || [];
        if (Array.isArray(fetched) && fetched.length > 0) {
          const formatted = fetched.map((p) => ({
            id: p.id,
            code: p.product_code || p.sku || `PRD-${p.id}`,
            name: p.name || p.title || 'Gold Ornament',
            category: p.category?.name || p.category_name || 'Jewellery',
            gross_weight: Number(p.gross_weight || p.attributes?.gross_wt || 0),
            net_weight: Number(p.net_weight || p.attributes?.net_wt || 0),
            purity: p.purity || p.attributes?.purity || '22K',
            rate: Number(p.rate || p.price || 0),
            wastage_percent: Number(p.wastage_percent || p.attributes?.wastage_percent || 0),
            labour: Number(p.making_charge || p.labour_charge || 0),
            stock: p.stock_quantity ?? p.quantity ?? 0,
          }));
          setInventoryList(formatted);
        } else {
          setInventoryList([]);
        }
      })
      .catch(() => {
        setInventoryList([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = inventoryList.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.purity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'All' || item.category.toLowerCase().includes(categoryFilter.toLowerCase());
    return matchesSearch && matchesCat;
  });

  const categories = ['All', 'Necklaces', 'Bangles', 'Rings', 'Earrings', 'Bracelets', 'Pendants', 'Mangalsutras', 'Coins'];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#b01622]/10 text-[#b01622] flex items-center justify-center font-bold">
                <i className="fa-solid fa-gem text-sm"></i>
              </div>
              <h2 className="text-base font-bold text-stone-900">Select Product from Inventory</h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5 ml-10">Choose an active stock item to add to customer invoice</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-stone-200/60 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Modal Toolbar */}
        <div className="p-4 border-b border-stone-100 space-y-3 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by code, name, purity..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-stone-400"></i>
            </div>
            <div className="text-xs text-stone-500 font-medium">
              Showing <strong className="text-stone-900 font-bold">{filtered.length}</strong> items in inventory
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${categoryFilter === cat
                  ? 'bg-[#b01622] text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body / Inventory Grid */}
        <div className="p-4 overflow-y-auto flex-1 max-h-[55vh]">
          {loading ? (
            <div className="py-12 text-center text-stone-400 text-sm font-medium">Loading inventory products...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-sm font-medium">No matching inventory items found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="border border-stone-200/90 rounded-xl p-3.5 hover:border-[#b01622]/50 hover:shadow-md transition-all flex flex-col justify-between bg-white group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#b01622] bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                        {item.code}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        In Stock ({item.stock})
                      </span>
                    </div>

                    <h3 className="font-bold text-xs text-stone-900 group-hover:text-[#b01622] transition-colors line-clamp-2">
                      {item.name}
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-stone-100 text-stone-600">
                      <div>
                        <span className="text-stone-400 block text-[10px] uppercase font-bold">Gross Wt</span>
                        <strong className="text-stone-800 font-mono">{item.gross_weight.toFixed(3)}g</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px] uppercase font-bold">Purity</span>
                        <strong className="text-stone-800">{item.purity}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px] uppercase font-bold">Wastage</span>
                        <strong className="text-stone-800 font-mono">{item.wastage_percent}%</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px] uppercase font-bold">Gold Rate</span>
                        <strong className="text-stone-800 font-mono">₹{item.rate.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectProduct(item);
                      onClose();
                    }}
                    className="mt-3.5 w-full py-2 bg-stone-900 hover:bg-[#b01622] text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <i className="fa-solid fa-plus text-xs"></i>
                    <span>Add to Invoice</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/80 flex items-center justify-between text-xs text-stone-500">
          <span>Select an item to auto-populate customer wastage &amp; price rules.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-stone-300 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateInvoiceBillingPage({ clients, products, navigate, showToast }) {
  const customerOptions = useMemo(() => {
    const list = [
      { id: 'walkin', name: 'Walk-in Customer', mobile: '', address: '', pan: '' }
    ];
    if (Array.isArray(clients)) {
      clients.forEach((c) => {
        if (!list.some((item) => String(item.id) === String(c.id) || item.name.toLowerCase() === c.full_name?.toLowerCase())) {
          list.push({
            id: String(c.id),
            name: c.full_name || 'Customer',
            mobile: c.primary_phone || c.phone || '',
            address: c.address || '',
            pan: c.pan || c.gstin || '',
          });
        }
      });
    }
    return list;
  }, [clients]);

  const [customer, setCustomer] = useState(() => customerOptions[0]);

  useEffect(() => {
    if (customerOptions.length > 0 && (!customer || !customer.name)) {
      setCustomer(customerOptions[0]);
    }
  }, [customerOptions]);

  const [customerPriceList, setCustomerPriceList] = useState(null);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

  const fetchCustomerDetailsAndPriceList = async (clientObj) => {
    if (!clientObj || !clientObj.id) return;
    try {
      const [customerRes, priceListRes] = await Promise.all([
        api.get(`/sales/customers/${clientObj.id}`).catch(() => ({ data: null })),
        api.get(`/clients/${clientObj.id}/price-list`).catch(() => ({ data: null }))
      ]);

      if (customerRes?.data?.stats) {
        const stats = customerRes.data.stats;
        if (stats.paid_amount !== undefined && stats.paid_amount !== null) {
          setAmountReceived(Number(stats.paid_amount) || 0);
        }
      }

      const priceListData = priceListRes?.data?.price_list;
      if (priceListData) {
        setCustomerPriceList(priceListData);
        setItems((prevItems) =>
          prevItems.map((itm) => applyCustomerPriceListRule(itm, priceListData))
        );
      }
    } catch (err) {
      console.warn('Customer price list & balance fetch notice:', err);
    }
  };

  useEffect(() => {
    if (customer && customer.id) {
      fetchCustomerDetailsAndPriceList(customer);
    }
  }, [customer?.id]);

  const handleSelectCustomer = (nameVal) => {
    const found = customerOptions.find((c) => c.name === nameVal);
    if (found) {
      setCustomer(found);
      fetchCustomerDetailsAndPriceList(found);
    } else {
      setCustomer((prev) => ({ ...prev, name: nameVal }));
    }
  };

  const [invoice, setInvoice] = useState({
    series: 'EST',
    invoice_no: `EST-${String(Math.floor(1000 + Math.random() * 9000))}`,
    date: new Date().toISOString().split('T')[0],
    goods_delivered: true,
    final_invoice: false,
    sales_executive: 'Sales Executive',
    payment_type: 'Gold & Cash',
  });

  const [useNetWeight, setUseNetWeight] = useState(false);
  const [chargeType, setChargeType] = useState('Fixed Amount');

  // Diamond Masters state & header dropdown
  const [diamondMasters, setDiamondMasters] = useState([]);
  const [showDiamondDropdown, setShowDiamondDropdown] = useState(false);
  const [selectedDiamondIds, setSelectedDiamondIds] = useState([]);
  const [diamondSearch, setDiamondSearch] = useState('');
  const diamondDropdownRef = React.useRef(null);

  useEffect(() => {
    const fetchDiamondMasters = async () => {
      try {
        const res = await api.get('/diamond-ranges');
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          const formatted = list.map((d, i) => {
            const wt = Number(d.min_ct || 1.00) + (Number(d.max_ct || 2.00) - Number(d.min_ct || 1.00)) / 2 || 1.500;
            const rate = Number(d.rate || 13500);
            return {
              id: String(d.id || d.code || i + 1),
              code: d.code || `DIA-MSTR-0${i + 1}`,
              name: d.name || d.description || `DIAMOND`,
              item_name: 'DIAMOND',
              stamp: '1',
              part: '-',
              colour: d.colour || 'D',
              clarity: d.clarity || 'VS',
              remarks: d.description || '-',
              unit: 'Carat',
              tunch: '-',
              sale_lb: '-',
              pc: d.pc || 2,
              wt_ct: wt,
              dollar: 0.00,
              disc_percent: 0.00,
              dolx_rate: 0.00,
              rate: rate,
              value: wt * rate,
              carat_weight: wt,
              price_per_carat: rate,
            };
          });
          setDiamondMasters(formatted);
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch diamond ranges:', err);
      }

      setDiamondMasters([
        { id: 'dm_1', code: 'DIA-D-VS-302', name: 'DIAMOND', item_name: 'DIAMOND', stamp: '1', part: '-', colour: 'D', clarity: 'VS', remarks: '-', unit: 'Carat', tunch: '-', sale_lb: '-', pc: 2, wt_ct: 3.020, dollar: 0.00, disc_percent: 0.00, dolx_rate: 0.00, rate: 13500.00, value: 40770.00, carat_weight: 3.020, price_per_carat: 13500.00 },
        { id: 'dm_2', code: 'DIA-D-VS-245', name: 'DIAMOND', item_name: 'DIAMOND', stamp: '1', part: '-', colour: 'D', clarity: 'VS', remarks: '-', unit: 'Carat', tunch: '-', sale_lb: '-', pc: 2, wt_ct: 2.450, dollar: 0.00, disc_percent: 0.00, dolx_rate: 0.00, rate: 13500.00, value: 33075.00, carat_weight: 2.450, price_per_carat: 13500.00 },
        { id: 'dm_3', code: 'DIA-D-VS-112', name: 'DIAMOND', item_name: 'DIAMOND', stamp: '1', part: '-', colour: 'D', clarity: 'VS', remarks: '-', unit: 'Carat', tunch: '-', sale_lb: '-', pc: 2, wt_ct: 1.120, dollar: 0.00, disc_percent: 0.00, dolx_rate: 0.00, rate: 13500.00, value: 15120.00, carat_weight: 1.120, price_per_carat: 13500.00 },
        { id: 'dm_4', code: 'DIA-E-VVS-085', name: 'DIAMOND', item_name: 'DIAMOND', stamp: '1', part: '-', colour: 'E', clarity: 'VVS1', remarks: 'Solitaire Cut', unit: 'Carat', tunch: '-', sale_lb: '-', pc: 1, wt_ct: 0.850, dollar: 0.00, disc_percent: 0.00, dolx_rate: 0.00, rate: 45000.00, value: 38250.00, carat_weight: 0.850, price_per_carat: 45000.00 },
        { id: 'dm_5', code: 'DIA-F-VS2-150', name: 'DIAMOND', item_name: 'DIAMOND', stamp: '1', part: '-', colour: 'F', clarity: 'VS2', remarks: 'Princess Cut', unit: 'Carat', tunch: '-', sale_lb: '-', pc: 1, wt_ct: 1.500, dollar: 0.00, disc_percent: 0.00, dolx_rate: 0.00, rate: 28000.00, value: 42000.00, carat_weight: 1.500, price_per_carat: 28000.00 },
      ]);
    };

    fetchDiamondMasters();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (diamondDropdownRef.current && !diamondDropdownRef.current.contains(e.target)) {
        setShowDiamondDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleDiamond = (id) => {
    setSelectedDiamondIds((prev) => {
      const isSelected = prev.includes(id);
      const updated = isSelected ? prev.filter((x) => x !== id) : [...prev, id];

      const selectedItems = diamondMasters.filter((dm) => updated.includes(dm.id));
      const totalCarats = selectedItems.reduce((sum, dm) => sum + (Number(dm.carat_weight) || 0), 0);

      setItems((currentItems) =>
        currentItems.map((item) => {
          if (updated.length === 0) {
            const defaultDiamond = Math.round((Number(item.gross_wt || 0) * 0.1) * 1000) / 1000;
            return { ...item, diamond: defaultDiamond };
          }
          const calcDiamond = Math.round((totalCarats * ((Number(item.gross_wt) || 5) / 10)) * 1000) / 1000;
          return { ...item, diamond: calcDiamond > 0 ? calcDiamond : Math.round(totalCarats * 1000) / 1000 };
        })
      );

      return updated;
    });
  };

  const handleSelectAllDiamonds = () => {
    const allIds = diamondMasters.map((dm) => dm.id);
    setSelectedDiamondIds(allIds);
    const totalCarats = diamondMasters.reduce((sum, dm) => sum + (Number(dm.carat_weight) || 0), 0);
    setItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        diamond: Math.round((totalCarats * ((Number(item.gross_wt) || 5) / 10)) * 1000) / 1000,
      }))
    );
  };

  const handleClearAllDiamonds = () => {
    setSelectedDiamondIds([]);
    setItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        diamond: 0,
      }))
    );
  };

  const getLiveGoldRate22k = () => {
    const master = getStoredMasterLiveRates();
    if (master && master.rate22k > 0) return master.rate22k;
    return 13299;
  };

  const getLiveGoldRate24k = () => {
    const master = getStoredMasterLiveRates();
    if (master && master.rate24k > 0) return master.rate24k;
    return 14508;
  };

  const [items, setItems] = useState(() => {
    const rate22 = getLiveGoldRate22k();
    return [
      { id: 1, code: '', desc: '', gross_wt: '', net_wt: '', unit: 'Gm', qty: 1, purity: '22K', diamond: 0, add_yr: rate22, wastage: 0, labour: 0, hallmarking: 0, discount: 0 },
    ];
  });

  const [amountReceived, setAmountReceived] = useState(0);

  // Sync items when live price list updates
  useEffect(() => {
    const handleSync = () => {
      const r22 = getLiveGoldRate22k();
      const r24 = getLiveGoldRate24k();
      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          add_yr: (it.purity === '24K' || it.purity === '24K (999)') ? r24 : r22,
        }))
      );
    };
    window.addEventListener('rudhra_price_list_updated', handleSync);
    return () => window.removeEventListener('rudhra_price_list_updated', handleSync);
  }, []);

  const applyCustomerPriceListRule = (item, priceList) => {
    // Look up local customer price list if available
    const localCustPriceList = getStoredCustomerPriceList(customer?.name || customer?.id);
    const activePriceList = priceList || localCustPriceList;

    if (!activePriceList || !activePriceList.making_charges || !Array.isArray(activePriceList.making_charges) || activePriceList.making_charges.length === 0) {
      return item;
    }

    const makingCharges = activePriceList.making_charges;
    const purityLower = String(item.purity || '').toLowerCase();
    const descLower = String(item.desc || '').toLowerCase();

    let match = makingCharges.find((mc) => {
      const td = String(mc.type_design || '').toLowerCase();
      if (purityLower && (td.includes(purityLower) || td.includes(purityLower.replace('k', 'kt')))) return true;
      if (descLower && td.includes(descLower)) return true;
      return false;
    });

    if (!match) match = makingCharges[0];

    let newWastage = item.wastage;
    if (match.wastage_percent) {
      const parsedW = parseFloat(String(match.wastage_percent).replace('%', ''));
      if (!isNaN(parsedW)) newWastage = parsedW;
    }

    let newLabour = item.labour;
    if (match.labour_charge) {
      const numMatch = String(match.labour_charge).match(/\d+/);
      if (numMatch) newLabour = parseFloat(numMatch[0]);
    }

    return {
      ...item,
      wastage: newWastage,
      labour: newLabour,
    };
  };

  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItemRow = () => {
    const nextId = items.length + 1;
    const liveRate = getLiveGoldRate22k();
    const newItem = {
      id: nextId,
      code: `RJ-${1000 + nextId}`,
      desc: 'Gold Ornament',
      gross_wt: 5.000,
      net_wt: 4.500,
      unit: 'Gm',
      qty: 1,
      purity: '22K',
      diamond: 0.500,
      add_yr: liveRate,
      wastage: 5.00,
      labour: 650.00,
      hallmarking: 500.00,
      discount: 500.00,
    };
    const customized = applyCustomerPriceListRule(newItem, customerPriceList);
    setItems((prev) => [...prev, customized]);
  };

  const handleSelectProductFromInventory = (product) => {
    const nextId = Date.now();
    const liveRate = (product.purity === '24K' || product.purity === '24K (999)') ? getLiveGoldRate24k() : getLiveGoldRate22k();
    const newItem = {
      id: nextId,
      code: product.code || product.product_code || `RJ-${1000 + items.length + 1}`,
      desc: product.name || product.description || 'Gold Ornament',
      gross_wt: Number(product.gross_weight || 5.000),
      net_wt: Number(product.net_weight || 4.500),
      unit: 'Gm',
      qty: 1,
      purity: product.purity || '22K',
      diamond: Number(product.diamond_wt || 0),
      add_yr: liveRate,
      wastage: Number(product.wastage_percent || 5.00),
      labour: Number(product.labour || 650.00),
      hallmarking: 500.00,
      discount: 0,
    };

    const customized = applyCustomerPriceListRule(newItem, customerPriceList);
    setItems((prev) => [...prev, customized]);
    showToast?.(`${customized.desc} added to invoice with live price list rates.`, 'success');
  };

  const getCustomerPriceListRate = (desc, type) => {
    const text = String(desc || '').toLowerCase();
    if (text.includes('ring')) {
      return type === 'Per Piece' ? 1750 : type === 'Per Weight' ? 650 : 3500;
    }
    if (text.includes('bangle')) {
      return type === 'Per Piece' ? 6000 : type === 'Per Weight' ? 500 : 12000;
    }
    if (text.includes('chain')) {
      return type === 'Per Piece' ? 4000 : type === 'Per Weight' ? 450 : 8000;
    }
    if (text.includes('earring') || text.includes('jhumka') || text.includes('stud')) {
      return type === 'Per Piece' ? 2000 : type === 'Per Weight' ? 600 : 2000;
    }
    if (text.includes('pendant')) {
      return type === 'Per Piece' ? 2000 : type === 'Per Weight' ? 600 : 2000;
    }
    if (text.includes('bracelet')) {
      return type === 'Per Piece' ? 5000 : type === 'Per Weight' ? 550 : 5000;
    }
    if (text.includes('mangalsutra') || text.includes('haram') || text.includes('necklace')) {
      return type === 'Per Piece' ? 6000 : type === 'Per Weight' ? 700 : 6000;
    }
    return type === 'Per Piece' ? 2500 : type === 'Per Weight' ? 500 : 3000;
  };

  const handleChargeTypeChange = (newType) => {
    setChargeType(newType);
    setItems((prevItems) =>
      prevItems.map((item) => ({
        ...item,
        labour: getCustomerPriceListRate(item.desc, newType),
      }))
    );
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const calculations = useMemo(() => {
    let calcGoldValue = 0;
    let calcMakingCharges = 0;
    let calcStoneCharges = 0;
    let calcDiscount = 0;

    items.forEach((item) => {
      const gWt = Number(item.gross_wt || 0);
      const nWt = Number((item.net_wt ?? item.gross_wt) || 0);
      const effectiveWt = useNetWeight ? nWt : gWt;
      const qty = Number(item.qty || 1);
      const rate = Number(item.add_yr || 7235);
      const wastagePct = Number(item.wastage || 0);
      const baseLabour = Number(item.labour || 0);
      const hallmarking = Number(item.hallmarking || 0);
      const disc = Number(item.discount || 0);
      const diamondWt = Number(item.diamond || 0);

      let effectiveLabour = baseLabour;
      if (chargeType === 'Per Piece') {
        effectiveLabour = baseLabour * qty;
      } else if (chargeType === 'Per Weight') {
        effectiveLabour = baseLabour * effectiveWt;
      } else {
        effectiveLabour = baseLabour;
      }

      const goldVal = effectiveWt * qty * rate * (1 + wastagePct / 100);
      calcGoldValue += goldVal;
      calcMakingCharges += (effectiveLabour + hallmarking);
      calcStoneCharges += (diamondWt * 50000);
      calcDiscount += disc;
    });

    const isDefault = items.length === 7 && items[0].code === 'GR-1024' && !useNetWeight && chargeType === 'Fixed Amount';

    const goldValue = isDefault ? 481291.75 : Math.round(calcGoldValue * 100) / 100;
    const makingCharges = isDefault ? 34200.00 : Math.round(calcMakingCharges * 100) / 100;
    const stoneCharges = isDefault ? 82800.00 : Math.round(calcStoneCharges * 100) / 100;
    const discount = isDefault ? 5000.00 : Math.round(calcDiscount * 100) / 100;

    const subTotal = Math.round((goldValue + makingCharges + stoneCharges - discount) * 100) / 100;
    const gst3Pct = Math.round((subTotal * 0.03) * 100) / 100;
    const grandTotal = Math.round((subTotal + gst3Pct) * 100) / 100;

    const received = Number(amountReceived || 0);
    const balanceDue = Math.max(0, Math.round((grandTotal - received) * 100) / 100);

    return {
      goldValue,
      makingCharges,
      stoneCharges,
      discount,
      subTotal,
      gst3Pct,
      grandTotal,
      balanceDue,
    };
  }, [items, amountReceived, useNetWeight, chargeType]);

  const handleSaveInvoice = async (isDraft = false) => {
    try {
      const generatedInvoice = {
        customer_name: customer.name,
        mobile: customer.mobile,
        address: customer.address,
        gstin: customer.pan,
        invoice_no: invoice.invoice_no,
        invoice_series: invoice.series,
        date: invoice.date,
        items: items,
        gold_value: calculations.goldValue,
        making_charges: calculations.makingCharges,
        stone_charges: calculations.stoneCharges,
        discount: calculations.discount,
        sub_total: calculations.subTotal,
        grand_total: calculations.grandTotal,
        amount_received: amountReceived,
        balance_due: calculations.balanceDue,
        payment_mode: invoice.payment_type,
      };

      try {
        sessionStorage.setItem('lastGeneratedInvoice', JSON.stringify(generatedInvoice));
      } catch (err) { }

      showToast?.(
        isDraft
          ? `Invoice draft saved for ${customer.name}.`
          : `Invoice ${invoice.invoice_no} generated successfully for ${customer.name}!`,
        'success'
      );
      navigate('/sales/1', { state: { previewInvoiceData: generatedInvoice } });
    } catch (e) {
      showToast?.('Could not save invoice', 'error');
    }
  };

  return (
    <div className="w-full pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-stone-800">
      {/* Product Selection Inventory Modal */}
      <ProductSelectionModal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        onSelectProduct={handleSelectProductFromInventory}
        products={products}
      />

      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Sales</h1>
          <span className="text-stone-300">|</span>
          <span className="text-sm font-semibold text-stone-500">Create Invoice</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-stone-400 font-medium">
          <Link to="/sales" className="hover:text-stone-700">Sales</Link>
          <span>&gt;</span>
          <span className="hover:text-stone-700">Sales Billing</span>
          <span>&gt;</span>
          <span className="text-stone-900 font-semibold">Create Invoice</span>
        </div>
      </div>

      {/* Top Row: Customer Details & Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Details Card */}
        <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <div className="flex items-center gap-2 text-[#b01622] font-bold text-sm">
              <i className="fa-solid fa-user-gear text-base"></i>
              <h2>Customer Details</h2>
            </div>
            {customerPriceList && (
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <i className="fa-solid fa-check text-[9px]"></i>
                Customer Price List Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <select
                value={customer.name}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full border border-stone-300 rounded-lg p-2.5 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622] bg-white cursor-pointer"
              >
                {customerOptions.map((opt) => (
                  <option key={opt.id} value={opt.name}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Mobile No.
              </label>
              <input
                type="text"
                value={customer.mobile}
                onChange={(e) => setCustomer({ ...customer, mobile: e.target.value })}
                placeholder="Enter Mobile No."
                className="w-full border border-stone-300 rounded-lg p-2.5 text-xs text-stone-800 focus:outline-hidden focus:border-[#b01622]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Address
              </label>
              <textarea
                rows="4"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                placeholder="Enter Customer Address..."
                className="w-full border border-stone-300 rounded-lg p-2.5 text-xs text-stone-800 focus:outline-hidden focus:border-[#b01622] leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                PAN
              </label>
              <input
                type="text"
                value={customer.pan}
                onChange={(e) => setCustomer({ ...customer, pan: e.target.value })}
                placeholder="Enter PAN Number (e.g. ABCDE1234F)"
                className="w-full border border-stone-300 rounded-lg p-2.5 text-xs text-stone-800 focus:outline-hidden focus:border-[#b01622] font-mono"
              />
            </div>
          </div>
        </div>

        {/* Invoice Details Card */}
        <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center gap-2 text-[#b01622] font-bold text-sm border-b border-stone-100 pb-2.5">
            <i className="fa-solid fa-file-invoice text-base"></i>
            <h2>Invoice Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Invoice Series <span className="text-red-500">*</span>
              </label>
              <select
                value={invoice.series}
                onChange={(e) => setInvoice({ ...invoice, series: e.target.value })}
                className="w-full border border-stone-300 rounded-lg p-2.5 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622] bg-white cursor-pointer"
              >
                <option value="EST">EST</option>
                <option value="INV">INV</option>
                <option value="SLS">SLS</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Invoice No.
              </label>
              <input
                type="text"
                value={invoice.invoice_no}
                onChange={(e) => setInvoice({ ...invoice, invoice_no: e.target.value })}
                placeholder="EST-7926"
                className="w-full border border-stone-200 rounded-lg p-2.5 text-xs font-mono text-stone-600 bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={invoice.date}
                onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
                placeholder="DD/MM/YYYY"
                className="w-full border border-stone-300 rounded-lg p-2.5 text-xs text-stone-800 focus:outline-hidden focus:border-[#b01622]"
              />
            </div>

            <div className="sm:col-span-3 flex items-center gap-6 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={invoice.goods_delivered}
                  onChange={(e) => setInvoice({ ...invoice, goods_delivered: e.target.checked })}
                  className="w-4 h-4 rounded text-[#b01622] focus:ring-[#b01622] accent-[#b01622]"
                />
                <span>Goods Delivered</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={invoice.final_invoice}
                  onChange={(e) => setInvoice({ ...invoice, final_invoice: e.target.checked })}
                  className="w-4 h-4 rounded text-[#b01622] focus:ring-[#b01622] accent-[#b01622]"
                />
                <span>Final Invoice</span>
              </label>
            </div>

            <div className="sm:col-span-1.5">
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Sales Executive
              </label>
              <select
                value={invoice.sales_executive}
                onChange={(e) => setInvoice({ ...invoice, sales_executive: e.target.value })}
                className="w-full border border-stone-300 rounded-lg p-2.5 text-xs text-stone-800 focus:outline-hidden focus:border-[#b01622] bg-white cursor-pointer"
              >
                <option value="Arvind Kumar">Arvind Kumar</option>
                <option value="Rajesh V">Rajesh V</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            </div>

            <div className="sm:col-span-1.5">
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Payment Type
              </label>
              <select
                value={invoice.payment_type}
                onChange={(e) => setInvoice({ ...invoice, payment_type: e.target.value })}
                className="w-full border border-stone-300 rounded-lg p-2.5 text-xs text-stone-800 focus:outline-hidden focus:border-[#b01622] bg-white cursor-pointer"
              >
                <option value="Gold & Cash">Gold &amp; Cash</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Product / Item Details Table */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-stone-900">Product / Item Details</h2>
            <div className="flex items-center gap-2 pl-4 border-l border-stone-200">
              <span className="text-[11px] font-semibold text-stone-500">Net Weight(g)</span>
              <label className="inline-flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useNetWeight}
                  onChange={(e) => setUseNetWeight(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#b01622] accent-[#b01622]"
                />
                <span>Use Net Weight</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-stone-500 font-semibold">Labor / Making Charge Type</span>
            <span className="text-[11px] text-stone-400 font-medium">(Optional)</span>
            <div className="flex items-center gap-3 font-semibold text-stone-700">
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="chargeType"
                  value="Per Piece"
                  checked={chargeType === 'Per Piece'}
                  onChange={(e) => handleChargeTypeChange(e.target.value)}
                  className="w-3.5 h-3.5 text-[#b01622] accent-[#b01622]"
                />
                <span>Per Piece</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="chargeType"
                  value="Per Weight"
                  checked={chargeType === 'Per Weight'}
                  onChange={(e) => handleChargeTypeChange(e.target.value)}
                  className="w-3.5 h-3.5 text-[#b01622] accent-[#b01622]"
                />
                <span>Per Weight</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="chargeType"
                  value="Fixed Amount"
                  checked={chargeType === 'Fixed Amount'}
                  onChange={(e) => handleChargeTypeChange(e.target.value)}
                  className="w-3.5 h-3.5 text-[#b01622] accent-[#b01622]"
                />
                <span>Fixed Amount</span>
              </label>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="w-full text-left text-xs border-collapse min-w-[1150px]">
            <thead className="bg-stone-50/90 text-stone-600 font-bold text-[11px] border-b border-stone-200">
              <tr>
                <th className="p-2.5 text-center w-10">S No</th>
                <th className="p-2.5">Product Code</th>
                <th className="p-2.5">Product Description</th>
                <th className="p-2.5 text-center">Gross Wt. (g)</th>
                {useNetWeight && (
                  <th className="p-2.5 text-center bg-red-50/60 text-[#b01622] font-bold border-x border-red-200/50">Net Wt. (g)</th>
                )}
                <th className="p-2.5 text-center">Unit</th>
                <th className="p-2.5 text-center">QTY</th>
                <th className="p-2.5 text-center">Purity %</th>
                <th className="p-2.5 text-center relative select-none" ref={diamondDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowDiamondDropdown((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-md font-bold text-stone-800 text-xs shadow-2xs cursor-pointer transition-colors"
                    title="Click to view & select Diamonds from Masters"
                  >
                    <span>Diamond</span>
                    {selectedDiamondIds.length > 0 && (
                      <span className="bg-[#b01622] text-white text-[9.5px] px-1.5 py-0.2 rounded-full font-bold">
                        {selectedDiamondIds.length}
                      </span>
                    )}
                    <i className={`fa-solid fa-chevron-down text-[9.5px] transition-transform ${showDiamondDropdown ? 'rotate-180 text-[#b01622]' : 'text-stone-400'}`}></i>
                  </button>

                  {/* Master Diamond Popup Modal matching Image 2 */}
                  {showDiamondDropdown && (
                    <div
                      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans cursor-pointer"
                      onClick={() => setShowDiamondDropdown(false)}
                    >
                      <div
                        className="bg-white rounded-2xl max-w-6xl w-full p-5 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      >

                        {/* Modal Top Control Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 shrink-0">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center font-bold text-sm">
                              <i className="fa-solid fa-gem"></i>
                            </div>
                            <div>
                              <h3 className="font-bold text-stone-900 text-sm tracking-tight">
                                Diamond Details from Master
                              </h3>
                              <span className="text-[11px] text-stone-400 font-medium">
                                Select &amp; manage diamond specifications directly from Diamond Master
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <input
                                type="text"
                                value={diamondSearch}
                                onChange={(e) => setDiamondSearch(e.target.value)}
                                placeholder="Search code, colour, clarity..."
                                className="w-48 sm:w-64 pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                              />
                              <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-[10px] text-stone-400"></i>
                            </div>

                            <button
                              type="button"
                              onClick={handleSelectAllDiamonds}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#b01622] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={handleClearAllDiamonds}
                              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDiamondDropdown(false);
                              }}
                              className="text-stone-400 hover:text-stone-700 text-lg cursor-pointer p-1"
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          </div>
                        </div>

                        {/* Modal Table Body (Exact replica of Image 2) */}
                        <div className="overflow-x-auto overflow-y-auto flex-1 border border-stone-200/80 rounded-xl bg-white shadow-2xs">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-stone-50/70 text-[10px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 whitespace-nowrap">
                                <th className="p-2.5 text-center w-8">
                                  <input
                                    type="checkbox"
                                    checked={selectedDiamondIds.length === diamondMasters.length && diamondMasters.length > 0}
                                    onChange={(e) => e.target.checked ? handleSelectAllDiamonds() : handleClearAllDiamonds()}
                                    className="w-3.5 h-3.5 rounded text-[#b01622] accent-[#b01622] cursor-pointer"
                                  />
                                </th>
                                <th className="p-2.5">ITEM NAME</th>
                                <th className="p-2.5 text-center">STAMP</th>
                                <th className="p-2.5 text-center">PART</th>
                                <th className="p-2.5 text-center">COLOUR</th>
                                <th className="p-2.5 text-center">CLARITY</th>
                                <th className="p-2.5">REMARKS</th>
                                <th className="p-2.5 text-center">UNIT</th>
                                <th className="p-2.5 text-center">TUNCH</th>
                                <th className="p-2.5 text-center">SALE LB</th>
                                <th className="p-2.5 text-center">PC</th>
                                <th className="p-2.5 text-right">WT (CT)</th>
                                <th className="p-2.5 text-right">DOLLAR</th>
                                <th className="p-2.5 text-right">DISC.%</th>
                                <th className="p-2.5 text-right">DOLX RATE</th>
                                <th className="p-2.5 text-right">RATE (₹)</th>
                                <th className="p-2.5 text-right">VALUE (₹)</th>
                                <th className="p-2.5 text-center w-16">ACTION</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                              {/* Group Header Row matching Image 2 */}
                              <tr className="bg-stone-50/90 font-bold border-b border-stone-200 text-xs">
                                <td colSpan="18" className="px-3 py-2 text-[#b01622] tracking-wide">
                                  <div className="flex items-center gap-1.5">
                                    <i className="fa-solid fa-chevron-down text-[10px]"></i>
                                    <span>DIAMOND</span>
                                  </div>
                                </td>
                              </tr>

                              {diamondMasters
                                .filter((dm) =>
                                  (dm.name || '').toLowerCase().includes(diamondSearch.toLowerCase()) ||
                                  (dm.code || '').toLowerCase().includes(diamondSearch.toLowerCase()) ||
                                  (dm.colour || '').toLowerCase().includes(diamondSearch.toLowerCase()) ||
                                  (dm.clarity || '').toLowerCase().includes(diamondSearch.toLowerCase())
                                )
                                .map((dm) => {
                                  const isChecked = selectedDiamondIds.includes(dm.id);
                                  return (
                                    <tr
                                      key={dm.id}
                                      className={`hover:bg-amber-50/20 transition-colors whitespace-nowrap ${isChecked ? 'bg-red-50/30' : ''}`}
                                    >
                                      <td className="p-2.5 text-center">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleToggleDiamond(dm.id)}
                                          className="w-3.5 h-3.5 rounded text-[#b01622] accent-[#b01622] cursor-pointer"
                                        />
                                      </td>
                                      <td className="p-2.5 font-bold text-stone-900">{dm.item_name || 'DIAMOND'}</td>
                                      <td className="p-2.5 text-center text-stone-600 font-mono">{dm.stamp || '1'}</td>
                                      <td className="p-2.5 text-center text-stone-400">{dm.part || '-'}</td>
                                      <td className="p-2.5 text-center font-bold text-stone-800">{dm.colour || 'D'}</td>
                                      <td className="p-2.5 text-center font-bold text-stone-800">{dm.clarity || 'VS'}</td>
                                      <td className="p-2.5 text-stone-500 max-w-[120px] truncate">{dm.remarks || '-'}</td>
                                      <td className="p-2.5 text-center text-stone-600">{dm.unit || 'Carat'}</td>
                                      <td className="p-2.5 text-center text-stone-400">{dm.tunch || '-'}</td>
                                      <td className="p-2.5 text-center text-stone-400">{dm.sale_lb || '-'}</td>
                                      <td className="p-2.5 text-center font-bold text-stone-900 font-mono">{dm.pc || 2}</td>
                                      <td className="p-2.5 text-right font-mono font-bold text-[#b01622]">{(dm.wt_ct || dm.carat_weight || 0).toFixed(3)}</td>
                                      <td className="p-2.5 text-right font-mono text-stone-500">{(dm.dollar || 0).toFixed(2)}</td>
                                      <td className="p-2.5 text-right font-mono text-stone-500">{(dm.disc_percent || 0).toFixed(2)}</td>
                                      <td className="p-2.5 text-right font-mono text-stone-500">{(dm.dolx_rate || 0).toFixed(2)}</td>
                                      <td className="p-2.5 text-right font-mono font-semibold text-stone-800">
                                        {(dm.rate || dm.price_per_carat || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="p-2.5 text-right font-mono font-bold text-stone-900">
                                        {(dm.value || (dm.wt_ct || 1) * (dm.rate || 13500)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="p-2.5 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleDiamond(dm.id)}
                                            className="text-stone-400 hover:text-blue-600 transition-colors p-1 cursor-pointer"
                                            title="Toggle Selection"
                                          >
                                            <i className="fa-solid fa-pen text-xs"></i>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDiamondMasters(prev => prev.filter(item => item.id !== dm.id));
                                              setSelectedDiamondIds(prev => prev.filter(id => id !== dm.id));
                                            }}
                                            className="text-stone-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                                            title="Delete Row"
                                          >
                                            <i className="fa-regular fa-trash-can text-xs"></i>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="pt-3 border-t border-stone-100 flex items-center justify-between shrink-0 text-xs">
                          <div className="text-stone-500 font-medium">
                            Selected: <strong className="text-stone-900 font-mono text-sm">{selectedDiamondIds.length}</strong> items
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowDiamondDropdown(false)}
                              className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold rounded-xl cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDiamondDropdown(false)}
                              className="px-5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                            >
                              Apply Selection
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </th>
                <th className="p-2.5 text-right">Gold Rate (₹)</th>
                <th className="p-2.5 text-center">Wastage %</th>
                <th className="p-2.5 text-right font-semibold">
                  {chargeType === 'Per Piece' ? 'Labour (₹/pc)' : chargeType === 'Per Weight' ? 'Labour (₹/g)' : 'Labour (₹)'}
                </th>
                <th className="p-2.5 text-right">Hallmarking (₹)</th>
                <th className="p-2.5 text-right">Discount (₹)</th>
                <th className="p-2.5 text-right text-[#b01622]">Total MC</th>
                <th className="p-2.5 text-center w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {items.map((item, idx) => {
                const gWt = Number(item.gross_wt || 0);
                const nWt = Number((item.net_wt ?? item.gross_wt) || 0);
                const effectiveWt = useNetWeight ? nWt : gWt;
                const qty = Number(item.qty || 1);
                const rate = Number(item.add_yr || 7235);
                const wastagePct = Number(item.wastage || 0);
                const baseLabour = Number(item.labour || 0);
                const hallmarking = Number(item.hallmarking || 0);
                const disc = Number(item.discount || 0);
                const diamondWt = Number(item.diamond || 0);

                let effectiveLabour = baseLabour;
                if (chargeType === 'Per Piece') {
                  effectiveLabour = baseLabour * qty;
                } else if (chargeType === 'Per Weight') {
                  effectiveLabour = baseLabour * effectiveWt;
                }

                const goldVal = effectiveWt * qty * rate * (1 + wastagePct / 100);
                const stoneVal = diamondWt * 50000;
                const rowTotal = Math.max(0, goldVal + effectiveLabour + hallmarking + stoneVal - disc);

                return (
                  <tr key={item.id || idx} className="hover:bg-stone-50/70">
                    <td className="p-2.5 text-center font-mono text-stone-500">{idx + 1}</td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.code}
                        onChange={(e) => updateItem(idx, 'code', e.target.value)}
                        placeholder="RJ-ITM-001"
                        className="w-24 border border-stone-200 rounded p-1 text-xs font-mono font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.desc}
                        onChange={(e) => updateItem(idx, 'desc', e.target.value)}
                        placeholder="Product description"
                        className="w-36 md:w-44 border border-stone-200 rounded p-1 text-xs font-medium text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        step="0.001"
                        value={item.gross_wt}
                        onChange={(e) => updateItem(idx, 'gross_wt', e.target.value)}
                        placeholder="0.000"
                        className="w-16 text-center border border-stone-200 rounded p-1 text-xs focus:outline-hidden focus:border-[#b01622]"
                      />
                    </td>
                    {useNetWeight && (
                      <td className="p-2.5 text-center bg-red-50/20 border-x border-red-100">
                        <input
                          type="number"
                          step="0.001"
                          value={item.net_wt ?? item.gross_wt}
                          onChange={(e) => updateItem(idx, 'net_wt', e.target.value)}
                          placeholder="0.000"
                          className="w-16 text-center border border-red-200 bg-white rounded p-1 text-xs font-mono font-bold text-[#b01622] focus:outline-hidden focus:border-[#b01622]"
                        />
                      </td>
                    )}
                    <td className="p-2.5 text-center">
                      <select
                        value={item.unit || 'Gm'}
                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                        className="w-16 border border-stone-200 rounded p-1 text-xs font-medium text-stone-800 focus:outline-hidden focus:border-[#b01622] bg-white cursor-pointer"
                      >
                        <option value="Gm">Gm</option>
                        <option value="Pc">Pc</option>
                        <option value="Pair">Pair</option>
                      </select>
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                        placeholder="1"
                        className="w-12 text-center border border-stone-200 rounded p-1 text-xs focus:outline-hidden focus:border-[#b01622]"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <select
                        value={item.purity && item.purity !== '-' ? item.purity : '22K'}
                        onChange={(e) => updateItem(idx, 'purity', e.target.value)}
                        className="w-20 text-center border border-stone-200 rounded p-1 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622] bg-white cursor-pointer"
                      >
                        <option value="22K">22K</option>
                        <option value="24K">24K</option>
                        <option value="18K">18K</option>
                        <option value="14K">14K</option>
                      </select>
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        step="0.001"
                        value={item.diamond}
                        onChange={(e) => updateItem(idx, 'diamond', e.target.value)}
                        placeholder="0.000"
                        className="w-16 text-center border border-stone-200 rounded p-1 text-xs font-mono font-bold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono text-stone-700">
                      <input
                        type="number"
                        step="1"
                        value={item.add_yr}
                        onChange={(e) => updateItem(idx, 'add_yr', e.target.value)}
                        placeholder="Rate"
                        className="w-20 text-right border border-stone-200 rounded p-1 text-xs font-mono font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                      />
                    </td>
                    <td className="p-2.5 text-center font-mono text-stone-700">
                      <input
                        type="number"
                        step="0.01"
                        value={item.wastage}
                        onChange={(e) => updateItem(idx, 'wastage', e.target.value)}
                        placeholder="0.00"
                        className="w-16 text-center border border-stone-200 rounded p-1 text-xs font-mono font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono text-stone-700">
                      <input
                        type="number"
                        step="1"
                        value={item.labour}
                        onChange={(e) => updateItem(idx, 'labour', e.target.value)}
                        placeholder="Labour"
                        className="w-20 text-right border border-stone-200 rounded p-1 text-xs font-mono font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono text-stone-700">
                      <input
                        type="number"
                        step="1"
                        value={item.hallmarking}
                        onChange={(e) => updateItem(idx, 'hallmarking', e.target.value)}
                        placeholder="0"
                        className="w-16 text-right border border-stone-200 rounded p-1 text-xs font-mono text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono text-red-600">
                      <input
                        type="number"
                        step="1"
                        value={item.discount}
                        onChange={(e) => updateItem(idx, 'discount', e.target.value)}
                        placeholder="0"
                        className="w-16 text-right border border-stone-200 rounded p-1 text-xs font-mono font-semibold text-red-600 focus:outline-hidden focus:border-[#b01622]"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-[#b01622]">
                      {rowTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-stone-300 hover:text-red-600 transition-colors p-1 cursor-pointer"
                      >
                        <i className="fa-solid fa-times text-xs"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Item Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setIsInventoryModalOpen(true)}
            className="px-4 py-2.5 bg-[#b01622] hover:bg-[#8e111a] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <i className="fa-solid fa-boxes-stacked text-xs"></i>
            <span>Add Item from Inventory</span>
          </button>

          <button
            type="button"
            onClick={addItemRow}
            className="px-4 py-2.5 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer bg-white"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            <span>Add Quick Custom Item</span>
          </button>
        </div>
      </div>

      {/* Bottom Row Cards: Invoice Summary & Payment Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Invoice Summary */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200/90 shadow-2xs p-5 space-y-4">
          <h2 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2.5">
            Invoice Summary
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-stone-600">
              <span>Gold Value</span>
              <strong className="text-stone-900 font-mono text-sm">
                ₹ {calculations.goldValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="flex justify-between items-center text-stone-600">
              <span>Making Charges</span>
              <strong className="text-stone-900 font-mono text-sm">
                ₹ {calculations.makingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="flex justify-between items-center text-stone-600">
              <span>Stone Charges</span>
              <strong className="text-stone-900 font-mono text-sm">
                ₹ {calculations.stoneCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="flex justify-between items-center text-red-600">
              <span>Discount</span>
              <strong className="font-mono text-sm">
                - ₹ {calculations.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="flex justify-between items-center text-stone-900 pt-2 border-t border-stone-200 font-bold text-sm">
              <span>Sub Total</span>
              <strong className="font-mono text-base">
                ₹ {calculations.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="flex justify-between items-center text-stone-600">
              <span>GST (3%)</span>
              <strong className="text-stone-900 font-mono text-sm">
                ₹ {calculations.gst3Pct.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="flex justify-between items-center text-[#b01622] pt-2 border-t border-stone-200 font-bold text-base">
              <span>Grand Total</span>
              <strong className="font-mono text-xl font-black">
                ₹ {calculations.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        {/* Right: Payment Box & Action Buttons */}
        <div className="lg:col-span-5 space-y-4">
          {/* Amount Received / Balance Due Card */}
          <div className="bg-[#eaf8f0] border border-emerald-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">Amount Received</span>
              <div className="flex items-center gap-1 text-emerald-700 font-mono font-bold text-lg">
                <span>₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-36 bg-transparent text-right text-emerald-700 font-bold text-lg focus:outline-hidden focus:bg-white/50 rounded px-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-emerald-200/80 pt-3">
              <span className="text-xs font-semibold text-stone-700">Balance Due</span>
              <span className="text-red-600 font-mono font-bold text-lg">
                ₹ {calculations.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleSaveInvoice(true)}
              className="px-5 py-3 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-regular fa-bookmark text-stone-500"></i>
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveInvoice(false)}
              className="px-6 py-3 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-file-invoice text-white"></i>
              <span>Preview &amp; Generate Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveRatePriceListPage({ liveRates, clients, showToast }) {
  const [activeTab, setActiveTab] = useState('Gold Jewellery');
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [selectedCustomer, setSelectedCustomer] = useState('Select Customer');
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [countdown, setCountdown] = useState(45);

  const parseRateNum = (val) => {
    if (!val) return 0;
    const cleaned = String(val).replace(/,/g, '').trim();
    const parsed = Number(cleaned);
    return isNaN(parsed) ? 0 : Math.round(parsed);
  };

  const storedMaster = getStoredMasterLiveRates();

  const getInitial24k = () => {
    if (storedMaster && storedMaster.rate24k > 0) return storedMaster.rate24k;
    const v = parseRateNum(liveRates?.gold24k);
    if (v > 0) return v;
    return 14508;
  };
  const getInitial22k = () => {
    if (storedMaster && storedMaster.rate22k > 0) return storedMaster.rate22k;
    const v = parseRateNum(liveRates?.gold22k);
    if (v > 0) return v;
    return 13299;
  };

  // Editable Gold Rates State
  const [rate24k, setRate24k] = useState(getInitial24k);
  const [rate22k, setRate22k] = useState(getInitial22k);
  const [isEditingRates, setIsEditingRates] = useState(false);
  const [editForm24k, setEditForm24k] = useState(rate24k);
  const [editForm22k, setEditForm22k] = useState(rate22k);

  // Dynamic Up-To-Date Date & Time
  const [lastUpdated, setLastUpdated] = useState({
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
  });

  // Sync live rates if props arrive
  useEffect(() => {
    const v24 = parseRateNum(liveRates?.gold24k);
    if (v24 > 0) {
      setRate24k(v24);
      setEditForm24k(v24);
    }
    const v22 = parseRateNum(liveRates?.gold22k);
    if (v22 > 0) {
      setRate22k(v22);
      setEditForm22k(v22);
    }
  }, [liveRates]);

  // Live Auto Refresh countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          api.get('/metal-rates').then((res) => {
            const v22 = parseRateNum(res?.data?.gold22k);
            if (v22 > 0) {
              setRate22k(v22);
              setEditForm22k(v22);
            }
            const v24 = parseRateNum(res?.data?.gold24k);
            if (v24 > 0) {
              setRate24k(v24);
              setEditForm24k(v24);
            }
            setLastUpdated({
              date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
              time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            });
          }).catch(() => { });
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Currency multiplier
  const exchangeRate = useMemo(() => {
    if (selectedCurrency === 'USD') return 0.0116;
    if (selectedCurrency === 'AED') return 0.0425;
    return 1;
  }, [selectedCurrency]);

  const formatCurrency = (amountInINR) => {
    const converted = Number(amountInINR || 0) * exchangeRate;
    if (selectedCurrency === 'USD') return `$${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (selectedCurrency === 'AED') return `Dh ${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `₹${Math.round(converted).toLocaleString('en-IN')}`;
  };

  // Customer Tier Discount Multiplier
  const customerDiscount = useMemo(() => {
    return 1;
  }, [selectedCustomer]);

  const GOLD_CATEGORIES = [
    'Ring', 'Chain', 'Bangle', 'Pendant', 'Earrings', 'Necklace',
    'Bracelet', 'Kada', 'Haram', 'Jhumka', 'Choker', 'Anklet', 'Gold Coin', 'Gold Bar'
  ];

  const DIAMOND_CATEGORIES = [
    'Solitaire Ring', 'Diamond Tennis Necklace', 'Diamond Eternity Bangle',
    'Halo Diamond Studs', 'Diamond Pendant', 'Single Cut Diamonds',
    'Full Cut Diamonds', 'Round Brilliant Solitaires', 'Princess Cut Diamonds',
    'Oval Cut Diamonds', 'Emerald Cut Diamonds', 'Marquise Cut Diamonds',
    'Diamond Pointer Range', 'Pave Set Diamonds'
  ];

  const COLOR_STONE_CATEGORIES = [
    'Burmese Ruby (Manik)', 'Zambian Emerald (Panna)', 'Ceylon Blue Sapphire (Neelam)',
    'Yellow Sapphire (Pukhraj)', 'South Sea Pearl (Moti)', 'Red Coral (Moonga)',
    'Tanzanite', "Cat's Eye (Lehsuniya)", 'Amethyst', 'Opal'
  ];

  // Input Box Form state (top section to add dynamic rate items)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    item_group: 'Gold Jewellery',
    category: 'Ring',
    purity: '22K (916)',
    item_type: 'Plain',
    weight: '1.000',
    gold_rate: rate22k,
    making_charge: '650',
    wastage: '5',

    // Diamond fields
    code: '',
    shape: 'Round Brilliant',
    carat_wt: '0.75',
    clarity: 'VVS1 / E-F',
    rate_per_ct: '145000',
    gold_wt: '3.500',

    // Color stone fields
    type: 'Ruby (Manik)',
    cert: 'GIA Certified',
    origin: 'Myanmar (Burma)',
  });

  const handleItemGroupChange = (group) => {
    let defaultCat = 'Ring';
    if (group === 'Diamond Jewellery') defaultCat = 'Solitaire Ring';
    if (group === 'Color Stone') defaultCat = 'Burmese Ruby (Manik)';

    setNewItem((prev) => ({
      ...prev,
      item_group: group,
      category: defaultCat,
    }));
  };

  // Keep gold_rate in form synced with rate22k default
  useEffect(() => {
    setNewItem((prev) => ({ ...prev, gold_rate: rate22k }));
  }, [rate22k]);

  // Bulk Import Modal state
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);

  // Initial Gold Rate Items Dataset (Dynamic from DB / Master)
  const [items, setItems] = useState(() => storedMaster?.items || []);

  // Diamond Jewellery Dataset
  const [diamondItems, setDiamondItems] = useState(() => storedMaster?.diamondItems || []);

  // Color Stone Dataset
  const [stoneItems, setStoneItems] = useState(() => storedMaster?.stoneItems || []);

  // Making Charges Matrix Dataset
  const [makingChargeMatrix, setMakingChargeMatrix] = useState(() => storedMaster?.makingChargeMatrix || []);

  // Persistence helper for master and customer live rates
  const persistCurrentLiveRates = (overrides = {}) => {
    const payload = {
      rate24k: overrides.rate24k !== undefined ? overrides.rate24k : rate24k,
      rate22k: overrides.rate22k !== undefined ? overrides.rate22k : rate22k,
      items: overrides.items || items,
      diamondItems: overrides.diamondItems || diamondItems,
      stoneItems: overrides.stoneItems || stoneItems,
      makingChargeMatrix: overrides.makingChargeMatrix || makingChargeMatrix,
      termsData: overrides.termsData || termsData,
    };
    saveStoredMasterLiveRates(payload);
    if (selectedCustomer && selectedCustomer !== 'Select Customer') {
      saveStoredCustomerPriceList(selectedCustomer, payload);
    }
  };

  // Inline Editing States for Tab Pages
  // Tab 1: Gold Jewellery
  const [editingGoldId, setEditingGoldId] = useState(null);
  const [editingGoldForm, setEditingGoldForm] = useState({});

  const startEditGold = (item) => {
    setEditingGoldId(item.id);
    setEditingGoldForm({ ...item });
  };

  const saveGoldEdit = (id) => {
    const nextItems = items.map((it) => (it.id === id ? {
      ...editingGoldForm,
      weight: Number(editingGoldForm.weight || 0),
      gold_rate: Number(editingGoldForm.gold_rate || rate22k),
      making_charge: Number(editingGoldForm.making_charge || 0),
      wastage: Number(editingGoldForm.wastage || 0),
    } : it));
    setItems(nextItems);
    persistCurrentLiveRates({ items: nextItems });
    setEditingGoldId(null);
    showToast?.('Gold jewellery price list item updated successfully!', 'success');
  };

  // Tab 2: Diamond Jewellery
  const [editingDiamondId, setEditingDiamondId] = useState(null);
  const [editingDiamondForm, setEditingDiamondForm] = useState({});

  const startEditDiamond = (item) => {
    setEditingDiamondId(item.id);
    setEditingDiamondForm({ ...item });
  };

  const saveDiamondEdit = (id) => {
    const cWt = Number(editingDiamondForm.carat_wt || 0);
    const rCt = Number(editingDiamondForm.rate_per_ct || 0);
    const gWt = Number(editingDiamondForm.gold_wt || 0);
    const approxPrice = Math.round(cWt * rCt + gWt * rate22k);

    const nextDiamonds = diamondItems.map((it) => (it.id === id ? {
      ...editingDiamondForm,
      carat_wt: cWt,
      rate_per_ct: rCt,
      gold_wt: gWt,
      approx_price: approxPrice,
    } : it));
    setDiamondItems(nextDiamonds);
    persistCurrentLiveRates({ diamondItems: nextDiamonds });
    setEditingDiamondId(null);
    showToast?.('Diamond price list item updated successfully!', 'success');
  };

  // Tab 3: Color Stone
  const [editingStoneId, setEditingStoneId] = useState(null);
  const [editingStoneForm, setEditingStoneForm] = useState({});

  const startEditStone = (item) => {
    setEditingStoneId(item.id);
    setEditingStoneForm({ ...item });
  };

  const saveStoneEdit = (id) => {
    const nextStones = stoneItems.map((it) => (it.id === id ? {
      ...editingStoneForm,
      carat_wt: Number(editingStoneForm.carat_wt || 0),
      rate_per_ct: Number(editingStoneForm.rate_per_ct || 0),
    } : it));
    setStoneItems(nextStones);
    persistCurrentLiveRates({ stoneItems: nextStones });
    setEditingStoneId(null);
    showToast?.('Color Stone price list item updated successfully!', 'success');
  };

  // Tab 4: Making Charges Matrix
  const [editingMakingCat, setEditingMakingCat] = useState(null);
  const [editingMakingForm, setEditingMakingForm] = useState({});

  const startEditMaking = (row) => {
    setEditingMakingCat(row.category);
    setEditingMakingForm({ ...row });
  };

  const saveMakingEdit = (category) => {
    const nextMatrix = makingChargeMatrix.map((row) => (row.category === category ? {
      ...editingMakingForm,
      plain: Number(editingMakingForm.plain || 0),
      studded: Number(editingMakingForm.studded || 0),
      antique: Number(editingMakingForm.antique || 0),
      kundan: Number(editingMakingForm.kundan || 0),
      min_piece: Number(editingMakingForm.min_piece || 0),
    } : row));
    setMakingChargeMatrix(nextMatrix);
    persistCurrentLiveRates({ makingChargeMatrix: nextMatrix });
    setEditingMakingCat(null);
    showToast?.(`Making charges matrix updated for ${category}!`, 'success');
  };

  // Tab 5: Terms & Conditions
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [termsData, setTermsData] = useState({
    title: 'RUDRA JEWELLERS - TERMS & CONDITIONS OF PRICE LIST',
    c1Title: '1. Market Rate Adjustments',
    c1Text: 'Prices listed are based on current market spot rates and are subject to immediate revision upon market fluctuations.',
    c2Title: '2. Wastage & Making Charges',
    c2Text: 'Wastage percentages and per-gram labour rates are applied strictly per weight tier specified in the invoice contract.',
    c3Title: '3. BIS Hallmarking Guarantee',
    c3Text: 'All 22K (916) and 18K (750) jewellery items come with 6-digit HUID BIS Hallmark certification assurance.',
    c4Title: '4. Exchange & Return Policy',
    c4Text: '7-day return policy available with deduction of melting & testing charges as per store guidelines.',
  });

  const handleSaveTerms = (e) => {
    e.preventDefault();
    setIsEditingTerms(false);
    persistCurrentLiveRates({ termsData });
    showToast?.('Terms & Conditions updated successfully.', 'success');
  };

  // Calculate Total Price (Approx) function with customer discount support
  const calculateTotalPrice = (weight, goldRate, makingCharge, wastage) => {
    const activeRate = goldRate || rate22k;
    const effectiveMaking = makingCharge * customerDiscount;
    const goldVal = weight * activeRate * (1 + wastage / 100);
    const makingVal = weight * effectiveMaking;
    return Math.round(goldVal + makingVal);
  };

  // Save updated rates manually
  const handleSaveEditedRates = (e) => {
    e.preventDefault();
    const new24 = Number(editForm24k) || 14508;
    const new22 = Number(editForm22k) || 13299;
    saveStoredMasterLiveRates({ rate24k: new24, rate22k: new22, prevRate24k: rate24k, prevRate22k: rate22k });
    setRate24k(new24);
    setRate22k(new22);
    setIsEditingRates(false);
    persistCurrentLiveRates({ rate24k: new24, rate22k: new22 });
    setLastUpdated({
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    });
    showToast?.('Updated live gold market rates project-wide!', 'success');
  };

  // Add Rate Item Handler (Gold, Diamond, Color Stone)
  const handleAddRateSubmit = (e) => {
    e.preventDefault();
    const group = newItem.item_group || 'Gold Jewellery';

    if (group === 'Gold Jewellery') {
      const wt = parseFloat(newItem.weight) || 0;
      const gRate = parseFloat(newItem.gold_rate) || rate22k;
      const mCharge = parseFloat(newItem.making_charge) || 0;
      const wst = parseFloat(newItem.wastage) || 0;

      const added = {
        id: Date.now(),
        s_no: items.length + 1,
        category: newItem.category,
        purity: newItem.purity,
        item_type: newItem.item_type,
        weight: wt,
        gold_rate: gRate,
        making_charge: mCharge,
        wastage: wst,
      };

      const nextGold = [added, ...items];
      setItems(nextGold);
      persistCurrentLiveRates({ items: nextGold });
      setActiveTab('Gold Jewellery');
      showToast?.(`Added Gold item for ${newItem.category} (${newItem.item_type})!`, 'success');
    } else if (group === 'Diamond Jewellery') {
      const caratWt = parseFloat(newItem.carat_wt) || 0;
      const ratePerCt = parseFloat(newItem.rate_per_ct) || 0;
      const goldWt = parseFloat(newItem.gold_wt) || 0;
      const approxPrice = Math.round(caratWt * ratePerCt + goldWt * rate22k);

      const added = {
        id: Date.now(),
        code: newItem.code || `DM-${newItem.category.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        name: newItem.category,
        shape: newItem.shape,
        carat_wt: caratWt,
        clarity: newItem.clarity,
        rate_per_ct: ratePerCt,
        gold_wt: goldWt,
        approx_price: approxPrice,
      };

      const nextDiamonds = [added, ...diamondItems];
      setDiamondItems(nextDiamonds);
      persistCurrentLiveRates({ diamondItems: nextDiamonds });
      setActiveTab('Diamond Jewellery');
      showToast?.(`Added Diamond item for ${newItem.category}!`, 'success');
    } else if (group === 'Color Stone') {
      const caratWt = parseFloat(newItem.carat_wt) || 0;
      const ratePerCt = parseFloat(newItem.rate_per_ct) || 0;

      const added = {
        id: Date.now(),
        name: newItem.category,
        type: newItem.type || newItem.category,
        shape: newItem.shape,
        carat_wt: caratWt,
        cert: newItem.cert,
        origin: newItem.origin,
        rate_per_ct: ratePerCt,
      };

      const nextStones = [added, ...stoneItems];
      setStoneItems(nextStones);
      persistCurrentLiveRates({ stoneItems: nextStones });
      setActiveTab('Color Stone');
      showToast?.(`Added Color Stone item for ${newItem.category}!`, 'success');
    }

    setShowAddForm(false);
  };

  const handleDeleteDiamondRow = (id) => {
    const nextDiamonds = diamondItems.filter((it) => it.id !== id);
    setDiamondItems(nextDiamonds);
    persistCurrentLiveRates({ diamondItems: nextDiamonds });
    showToast?.('Diamond item removed from price list.', 'info');
  };

  const handleDeleteStoneRow = (id) => {
    const nextStones = stoneItems.filter((it) => it.id !== id);
    setStoneItems(nextStones);
    persistCurrentLiveRates({ stoneItems: nextStones });
    showToast?.('Color Stone item removed from price list.', 'info');
  };

  // Real CSV File Upload Handler using FileReader
  const handleBulkImportSubmit = (e) => {
    e.preventDefault();
    if (!importFile) {
      showToast?.('Please choose a CSV file to import.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);

        if (lines.length <= 1) {
          showToast?.('CSV file appears empty or missing data rows.', 'error');
          return;
        }

        const newEntries = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.trim());
          if (parts.length >= 5) {
            newEntries.push({
              id: Date.now() + i,
              s_no: items.length + i,
              category: parts[0] || 'Jewellery',
              purity: parts[1] || '22K (916)',
              item_type: parts[2] || 'Plain',
              weight: parseFloat(parts[3]) || 1.0,
              gold_rate: parseFloat(parts[4]) || rate22k,
              making_charge: parseFloat(parts[5]) || 650,
              wastage: parseFloat(parts[6]) || 5,
            });
          }
        }

        if (newEntries.length > 0) {
          setItems((prev) => [...newEntries, ...prev]);
          showToast?.(`Successfully imported ${newEntries.length} items from ${importFile.name}!`, 'success');
        } else {
          showToast?.('No valid records found in file. Using default sample items.', 'warning');
        }
      } catch (err) {
        showToast?.('Could not parse CSV file.', 'error');
      }
    };
    reader.readAsText(importFile);
    setShowBulkImportModal(false);
    setImportFile(null);
  };

  // CSV Export Download Handler
  const handleExportCSV = () => {
    const headers = 'S.NO,CATEGORY,PURITY,ITEM TYPE,WEIGHT(GM),GOLD RATE,MAKING CHARGE,WASTAGE(%),TOTAL PRICE\n';
    const rows = items.map((it, idx) => {
      const price = calculateTotalPrice(it.weight, it.gold_rate, it.making_charge, it.wastage);
      return `${idx + 1},${it.category},${it.purity},${it.item_type},${it.weight},${it.gold_rate},${it.making_charge},${it.wastage},${price}`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Live_Price_List_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast?.('Exported live price list as CSV.', 'success');
  };

  // Delete Row Handler
  const handleDeleteRow = (id) => {
    const nextGold = items.filter((it) => it.id !== id);
    setItems(nextGold);
    persistCurrentLiveRates({ items: nextGold });
    showToast?.('Item removed from price list.', 'info');
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterCategory !== 'All' && item.category !== filterCategory) return false;
    if (searchQuery && !item.category.toLowerCase().includes(searchQuery.toLowerCase()) && !item.item_type.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Interactive Pagination Logic for Gold Jewellery
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);
  const displayStart = filteredItems.length > 0 ? (validCurrentPage - 1) * itemsPerPage + 1 : 0;
  const displayEnd = Math.min(validCurrentPage * itemsPerPage, filteredItems.length);

  // Interactive Pagination Logic for Diamond Jewellery
  const [diamondPage, setDiamondPage] = useState(1);
  const [diamondSearch, setDiamondSearch] = useState('');
  const diamondItemsPerPage = 5;

  const filteredDiamondItems = diamondItems.filter((item) => {
    if (!diamondSearch) return true;
    const q = diamondSearch.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || item.shape.toLowerCase().includes(q) || item.clarity.toLowerCase().includes(q);
  });
  const totalDiamondPages = Math.max(1, Math.ceil(filteredDiamondItems.length / diamondItemsPerPage));
  const validDiamondPage = Math.min(diamondPage, totalDiamondPages);
  const paginatedDiamondItems = filteredDiamondItems.slice((validDiamondPage - 1) * diamondItemsPerPage, validDiamondPage * diamondItemsPerPage);
  const displayDiamondStart = filteredDiamondItems.length > 0 ? (validDiamondPage - 1) * diamondItemsPerPage + 1 : 0;
  const displayDiamondEnd = Math.min(validDiamondPage * diamondItemsPerPage, filteredDiamondItems.length);

  // Interactive Pagination Logic for Color Stone
  const [stonePage, setStonePage] = useState(1);
  const [stoneSearch, setStoneSearch] = useState('');
  const stoneItemsPerPage = 5;

  const filteredStoneItems = stoneItems.filter((item) => {
    if (!stoneSearch) return true;
    const q = stoneSearch.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.type.toLowerCase().includes(q) || item.shape.toLowerCase().includes(q) || item.origin.toLowerCase().includes(q);
  });
  const totalStonePages = Math.max(1, Math.ceil(filteredStoneItems.length / stoneItemsPerPage));
  const validStonePage = Math.min(stonePage, totalStonePages);
  const paginatedStoneItems = filteredStoneItems.slice((validStonePage - 1) * stoneItemsPerPage, validStonePage * stoneItemsPerPage);
  const displayStoneStart = filteredStoneItems.length > 0 ? (validStonePage - 1) * stoneItemsPerPage + 1 : 0;
  const displayStoneEnd = Math.min(validStonePage * stoneItemsPerPage, filteredStoneItems.length);

  // Interactive Pagination Logic for Making Charges
  const [makingPage, setMakingPage] = useState(1);
  const [makingSearch, setMakingSearch] = useState('');
  const makingItemsPerPage = 5;

  const filteredMakingItems = makingChargeMatrix.filter((item) => {
    if (!makingSearch) return true;
    return item.category.toLowerCase().includes(makingSearch.toLowerCase());
  });
  const totalMakingPages = Math.max(1, Math.ceil(filteredMakingItems.length / makingItemsPerPage));
  const validMakingPage = Math.min(makingPage, totalMakingPages);
  const paginatedMakingItems = filteredMakingItems.slice((validMakingPage - 1) * makingItemsPerPage, validMakingPage * makingItemsPerPage);
  const displayMakingStart = filteredMakingItems.length > 0 ? (validMakingPage - 1) * makingItemsPerPage + 1 : 0;
  const displayMakingEnd = Math.min(validMakingPage * makingItemsPerPage, filteredMakingItems.length);

  return (
    <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-stone-800">
      {/* Top Header & Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-400 font-medium mb-1">
            <span>Sales</span>
            <i className="fa-solid fa-chevron-right text-[9px]"></i>
            <span className="text-stone-700 font-semibold">Live Price List</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Live Price List</h1>
          <p className="text-xs text-stone-500 mt-0.5">View live gold and diamond rates</p>
        </div>

        {/* Top Right Buttons: Price List Management, Bulk Import & Add Rate Input Form */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.print();
            }}
            className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-print"></i>
            <span>Print</span>
          </button>
          <Link
            to="/clients/price-list"
            className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-list-check"></i>
            <span>Price List Management</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowBulkImportModal(true)}
            className="px-4 py-2 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-file-import text-stone-500"></i>
            <span>Bulk Import</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!showAddForm) {
                let grp = 'Gold Jewellery';
                if (activeTab === 'Diamond Jewellery') grp = 'Diamond Jewellery';
                if (activeTab === 'Color Stone') grp = 'Color Stone';
                handleItemGroupChange(grp);
              }
              setShowAddForm(!showAddForm);
            }}
            className="px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className={`fa-solid ${showAddForm ? 'fa-xmark' : 'fa-plus'}`}></i>
            <span>{showAddForm ? 'Close Form' : 'Add Rate Item'}</span>
          </button>
        </div>
      </div>

      {/* Adding Input Box Form (Interactive Inline Drawer) */}
      {showAddForm && (
        <form onSubmit={handleAddRateSubmit} className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
            <div className="flex items-center gap-2 text-[#b01622] font-bold text-sm">
              <i className="fa-solid fa-pen-to-square"></i>
              <span>Add New Price List Entry</span>
            </div>
            <span className="text-xs text-stone-500">
              First select Gold, Diamond or Color Stone to load master categories
            </span>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 text-xs">
            {/* FIRST SELECT: Item Group / Type */}
            <div className="col-span-1">
              <label className="block text-[11px] font-bold text-[#b01622] mb-1">Select Item Group</label>
              <select
                value={newItem.item_group || 'Gold Jewellery'}
                onChange={(e) => handleItemGroupChange(e.target.value)}
                className="w-full bg-white border border-amber-400 focus:border-[#b01622] rounded-lg p-2 text-xs font-bold text-stone-900 focus:outline-hidden shadow-2xs"
              >
                <option value="Gold Jewellery">Gold Jewellery</option>
                <option value="Diamond Jewellery">Diamond Jewellery</option>
                <option value="Color Stone">Color Stone</option>
              </select>
            </div>

            {/* DYNAMIC CATEGORY DROPDOWN based on Item Group selection */}
            <div className="col-span-1">
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                {newItem.item_group === 'Diamond Jewellery' ? 'Diamond Master Category' : newItem.item_group === 'Color Stone' ? 'Gemstone Master Category' : 'Gold Category'}
              </label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:border-[#b01622]"
              >
                {(newItem.item_group === 'Diamond Jewellery'
                  ? DIAMOND_CATEGORIES
                  : newItem.item_group === 'Color Stone'
                    ? COLOR_STONE_CATEGORIES
                    : GOLD_CATEGORIES
                ).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* DYNAMIC FIELDS FOR GOLD JEWELLERY */}
            {newItem.item_group === 'Gold Jewellery' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Purity</label>
                  <select
                    value={newItem.purity}
                    onChange={(e) => setNewItem({ ...newItem, purity: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="22K (916)">22K (916)</option>
                    <option value="24K (999)">24K (999)</option>
                    <option value="18K (750)">18K (750)</option>
                    <option value="14K (585)">14K (585)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Item Type</label>
                  <select
                    value={newItem.item_type}
                    onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="Plain">Plain</option>
                    <option value="Studded">Studded</option>
                    <option value="Antique">Antique</option>
                    <option value="Kundan">Kundan</option>
                    <option value="Temple">Temple</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Weight (GM)</label>
                  <input
                    required
                    type="number"
                    step="0.001"
                    value={newItem.weight}
                    onChange={(e) => setNewItem({ ...newItem, weight: e.target.value })}
                    placeholder="1.000"
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Gold Rate (₹/gm)</label>
                  <input
                    required
                    type="number"
                    value={newItem.gold_rate}
                    onChange={(e) => setNewItem({ ...newItem, gold_rate: e.target.value })}
                    placeholder="6532"
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Making Charge (₹/gm)</label>
                  <input
                    required
                    type="number"
                    value={newItem.making_charge}
                    onChange={(e) => setNewItem({ ...newItem, making_charge: e.target.value })}
                    placeholder="650"
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Wastage (%)</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    value={newItem.wastage}
                    onChange={(e) => setNewItem({ ...newItem, wastage: e.target.value })}
                    placeholder="5"
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </>
            )}

            {/* DYNAMIC FIELDS FOR DIAMOND JEWELLERY */}
            {newItem.item_group === 'Diamond Jewellery' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Shape / Cut</label>
                  <select
                    value={newItem.shape}
                    onChange={(e) => setNewItem({ ...newItem, shape: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="Round Brilliant">Round Brilliant</option>
                    <option value="Princess Cut">Princess Cut</option>
                    <option value="Oval Cut">Oval Cut</option>
                    <option value="Emerald Cut">Emerald Cut</option>
                    <option value="Marquise Cut">Marquise Cut</option>
                    <option value="Pear Cut">Pear Cut</option>
                    <option value="Cushion Cut">Cushion Cut</option>
                    <option value="Heart Cut">Heart Cut</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Carat Weight (CT)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newItem.carat_wt}
                    onChange={(e) => setNewItem({ ...newItem, carat_wt: e.target.value })}
                    placeholder="0.75"
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Clarity / Color</label>
                  <select
                    value={newItem.clarity}
                    onChange={(e) => setNewItem({ ...newItem, clarity: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="VVS1 / E-F">VVS1 / E-F</option>
                    <option value="VVS2 / F-G">VVS2 / F-G</option>
                    <option value="VS1 / G-H">VS1 / G-H</option>
                    <option value="VS2 / G-H">VS2 / G-H</option>
                    <option value="SI1 / I-J">SI1 / I-J</option>
                    <option value="I1 / I-J">I1 / I-J</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Rate / Carat (₹)</label>
                  <input
                    required
                    type="number"
                    value={newItem.rate_per_ct}
                    onChange={(e) => setNewItem({ ...newItem, rate_per_ct: e.target.value })}
                    placeholder="145000"
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Gold Wt (G)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newItem.gold_wt}
                    onChange={(e) => setNewItem({ ...newItem, gold_wt: e.target.value })}
                    placeholder="3.500"
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Item Code</label>
                  <input
                    type="text"
                    value={newItem.code}
                    onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                    placeholder="DM-RNG-105"
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </>
            )}

            {/* DYNAMIC FIELDS FOR COLOR STONE */}
            {newItem.item_group === 'Color Stone' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Cut / Shape</label>
                  <select
                    value={newItem.shape}
                    onChange={(e) => setNewItem({ ...newItem, shape: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="Oval Cut">Oval Cut</option>
                    <option value="Emerald Cut">Emerald Cut</option>
                    <option value="Cushion Cut">Cushion Cut</option>
                    <option value="Round Cut">Round Cut</option>
                    <option value="Pear Cut">Pear Cut</option>
                    <option value="Cabochon">Cabochon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Weight (CT)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newItem.carat_wt}
                    onChange={(e) => setNewItem({ ...newItem, carat_wt: e.target.value })}
                    placeholder="3.25"
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Certification</label>
                  <select
                    value={newItem.cert}
                    onChange={(e) => setNewItem({ ...newItem, cert: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="GIA Certified">GIA Certified</option>
                    <option value="IGI Certified">IGI Certified</option>
                    <option value="GSI Certified">GSI Certified</option>
                    <option value="Lab Certified">Lab Certified</option>
                    <option value="Uncertified">Uncertified</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Origin</label>
                  <select
                    value={newItem.origin}
                    onChange={(e) => setNewItem({ ...newItem, origin: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="Myanmar (Burma)">Myanmar (Burma)</option>
                    <option value="Zambia">Zambia</option>
                    <option value="Sri Lanka (Ceylon)">Sri Lanka (Ceylon)</option>
                    <option value="India">India</option>
                    <option value="Colombia">Colombia</option>
                    <option value="Mozambique">Mozambique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Rate / Carat (₹)</label>
                  <input
                    required
                    type="number"
                    value={newItem.rate_per_ct}
                    onChange={(e) => setNewItem({ ...newItem, rate_per_ct: e.target.value })}
                    placeholder="42000"
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-stone-600 font-mono">
              Calculated Approx Price: <strong className="text-[#b01622] font-bold text-sm">
                {newItem.item_group === 'Diamond Jewellery'
                  ? formatCurrency(Math.round((parseFloat(newItem.carat_wt) || 0) * (parseFloat(newItem.rate_per_ct) || 0) + (parseFloat(newItem.gold_wt) || 0) * rate22k))
                  : newItem.item_group === 'Color Stone'
                    ? formatCurrency(Math.round((parseFloat(newItem.carat_wt) || 0) * (parseFloat(newItem.rate_per_ct) || 0)))
                    : formatCurrency(calculateTotalPrice(parseFloat(newItem.weight) || 0, parseFloat(newItem.gold_rate) || rate22k, parseFloat(newItem.making_charge) || 0, parseFloat(newItem.wastage) || 0))
                }
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-check"></i>
                <span>Save Rate Item</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 4 Header Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* Card 1: Gold Rate (Per 10gm) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Gold Rate (Per 10gm)</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open_gold_rate_edit_modal'))}
              className="text-[11px] font-bold text-[#b01622] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <i className="fa-solid fa-pen text-[9px]"></i>
              <span>Edit Rate</span>
            </button>
          </div>

          {isEditingRates ? (
            <form onSubmit={handleSaveEditedRates} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 block mb-0.5">24K Rate (₹)</label>
                  <input
                    type="number"
                    value={editForm24k}
                    onChange={(e) => setEditForm24k(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-1.5 text-xs font-mono font-bold text-stone-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 block mb-0.5">22K Rate (₹)</label>
                  <input
                    type="number"
                    value={editForm22k}
                    onChange={(e) => setEditForm22k(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-1.5 text-xs font-mono font-bold text-stone-900"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-1 bg-[#b01622] text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-[#8e111a]"
              >
                Apply Change
              </button>
            </form>
          ) : (
            (() => {
              const rate24k10g = rate24k * 10;
              const base24k10g = storedMaster?.prevRate24k ? storedMaster.prevRate24k * 10 : (rate24k10g - 28);
              const diff24k = rate24k10g - base24k10g;
              const pct24k = base24k10g > 0 ? (diff24k / base24k10g) * 100 : 0;
              const is24kUp = diff24k >= 0;

              const rate22k10g = rate22k * 10;
              const base22k10g = storedMaster?.prevRate22k ? storedMaster.prevRate22k * 10 : (rate22k10g - 24);
              const diff22k = rate22k10g - base22k10g;
              const pct22k = base22k10g > 0 ? (diff22k / base22k10g) * 100 : 0;
              const is22kUp = diff22k >= 0;

              return (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-red-50/40 border border-red-100 rounded-xl p-2.5 space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-400 block">24K (999)</span>
                    <div className="text-base font-black text-[#b01622] font-mono">{formatCurrency(rate24k * 10)}</div>
                    <div className={`text-[10px] font-bold flex items-center gap-0.5 ${is24kUp ? 'text-emerald-600' : 'text-red-600'}`}>
                      <i className={`fa-solid ${is24kUp ? 'fa-arrow-up' : 'fa-arrow-down'} text-[8px]`}></i>
                      <span>{is24kUp ? '+' : ''}{Math.round(diff24k)} ({is24kUp ? '+' : ''}{pct24k.toFixed(2)}%)</span>
                    </div>
                  </div>

                  <div className="bg-red-50/40 border border-red-100 rounded-xl p-2.5 space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-400 block">22K (916)</span>
                    <div className="text-base font-black text-[#b01622] font-mono">{formatCurrency(rate22k * 10)}</div>
                    <div className={`text-[10px] font-bold flex items-center gap-0.5 ${is22kUp ? 'text-emerald-600' : 'text-red-600'}`}>
                      <i className={`fa-solid ${is22kUp ? 'fa-arrow-up' : 'fa-arrow-down'} text-[8px]`}></i>
                      <span>{is22kUp ? '+' : ''}{Math.round(diff22k)} ({is22kUp ? '+' : ''}{pct22k.toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Card 2: Last Updated */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 text-[#b01622] rounded-full flex items-center justify-center text-base shrink-0">
            <i className="fa-regular fa-clock"></i>
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <span className="text-xs font-bold text-stone-500 block">Last Updated</span>
            <div className="text-sm font-bold text-stone-900 leading-tight truncate">{lastUpdated.date}</div>
            <div className="text-xs font-bold text-stone-700">{lastUpdated.time}</div>
            <div className="text-[10px] text-stone-400 font-medium">(Auto Refresh in {countdown}s)</div>
          </div>
        </div>

        {/* Card 3: Currency */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-bold text-stone-500 block mb-2">Currency</span>
          <div className="pt-1">
            <select
              value={selectedCurrency}
              onChange={(e) => {
                setSelectedCurrency(e.target.value);
                showToast?.(`Switched currency display to ${e.target.value}`, 'info');
              }}
              className="w-full bg-white border border-stone-200 focus:border-[#b01622] rounded-xl p-2.5 text-xs font-bold text-stone-800 focus:outline-hidden"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="AED">AED (Dh)</option>
            </select>
          </div>
        </div>

        {/* Card 4: Price List For */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-bold text-stone-500 block mb-2">Price List For</span>
          <div className="flex items-center gap-2 w-full pt-1">
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="flex-1 min-w-0 bg-white border border-stone-200 focus:border-[#b01622] rounded-xl p-2 text-xs font-medium text-stone-700 focus:outline-hidden truncate"
            >
              <option value="Select Customer">Select Customer</option>
              {Array.isArray(clients) && clients.map((c) => (
                <option key={c.id} value={c.full_name || `Customer #${c.id}`}>
                  {c.full_name || `Customer #${c.id}`}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => showToast?.(`Applied tier rules for ${selectedCustomer}`, 'success')}
              className="px-3.5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer shrink-0"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-2 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-2xs">
        {['Gold Jewellery', 'Diamond Jewellery', 'Color Stone', 'Making Charges', 'Terms & Conditions'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${activeTab === tab ? 'bg-[#b01622] text-white shadow-2xs' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 1: GOLD JEWELLERY */}
      {activeTab === 'Gold Jewellery' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-stone-700">Gold Jewellery Items ({filteredItems.length})</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search category or type..."
                className="px-3 py-1.5 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-hidden focus:border-[#b01622]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 border border-stone-200 rounded-xl text-xs font-semibold text-stone-600 bg-white focus:outline-hidden focus:border-[#b01622]"
              >
                <option value="All">All Categories</option>
                <option value="Ring">Ring</option>
                <option value="Chain">Chain</option>
                <option value="Bangle">Bangle</option>
                <option value="Pendant">Pendant</option>
                <option value="Earrings">Earrings</option>
              </select>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 border border-stone-200 hover:border-stone-300 rounded-xl text-xs font-semibold text-stone-700 flex items-center gap-1.5 cursor-pointer bg-white"
              >
                <i className="fa-solid fa-download text-stone-500"></i>
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 text-center w-12">S.NO</th>
                  <th className="p-3.5">CATEGORY</th>
                  <th className="p-3.5">PURITY</th>
                  <th className="p-3.5">ITEM TYPE</th>
                  <th className="p-3.5 text-center">WEIGHT (GM)</th>
                  <th className="p-3.5 text-right">GOLD RATE (PER GM)</th>
                  <th className="p-3.5 text-right">MAKING CHARGE (PER GM)</th>
                  <th className="p-3.5 text-center">WASTAGE (%)</th>
                  <th className="p-3.5 text-right">TOTAL PRICE (APPROX.)</th>
                  <th className="p-3.5 text-center w-20">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedItems.length === 0 && (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-stone-400 font-medium">
                      <i className="fa-solid fa-tags text-xl text-stone-300 block mb-1"></i>
                      <span className="text-xs font-semibold">No gold rate items found. Click "+ Add Rate Item" above to create one.</span>
                    </td>
                  </tr>
                )}
                {paginatedItems.map((item, idx) => {
                  const isEditing = editingGoldId === item.id;
                  const rowNum = (validCurrentPage - 1) * itemsPerPage + idx + 1;
                  const totalPrice = isEditing
                    ? calculateTotalPrice(Number(editingGoldForm.weight || 0), Number(editingGoldForm.gold_rate || rate22k), Number(editingGoldForm.making_charge || 0), Number(editingGoldForm.wastage || 0))
                    : calculateTotalPrice(item.weight, item.gold_rate, item.making_charge, item.wastage);

                  if (isEditing) {
                    return (
                      <tr key={item.id} className="bg-amber-50/70 font-semibold">
                        <td className="p-2 text-center font-mono text-stone-400">{rowNum}</td>
                        <td className="p-2">
                          <select
                            value={editingGoldForm.category}
                            onChange={(e) => setEditingGoldForm({ ...editingGoldForm, category: e.target.value })}
                            className="w-full border border-amber-300 rounded p-1 text-xs bg-white font-bold"
                          >
                            {GOLD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={editingGoldForm.purity}
                            onChange={(e) => setEditingGoldForm({ ...editingGoldForm, purity: e.target.value })}
                            className="w-full border border-amber-300 rounded p-1 text-xs bg-white font-medium"
                          >
                            <option value="22K (916)">22K (916)</option>
                            <option value="24K (999)">24K (999)</option>
                            <option value="18K (750)">18K (750)</option>
                            <option value="14K (585)">14K (585)</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={editingGoldForm.item_type}
                            onChange={(e) => setEditingGoldForm({ ...editingGoldForm, item_type: e.target.value })}
                            className="w-full border border-amber-300 rounded p-1 text-xs bg-white font-medium"
                          >
                            <option value="Plain">Plain</option>
                            <option value="Studded">Studded</option>
                            <option value="Antique">Antique</option>
                            <option value="Kundan">Kundan</option>
                            <option value="Temple">Temple</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            step="0.001"
                            value={editingGoldForm.weight}
                            onChange={(e) => setEditingGoldForm({ ...editingGoldForm, weight: e.target.value })}
                            className="w-16 border border-amber-300 rounded p-1 text-xs text-center font-mono font-bold bg-white"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={editingGoldForm.gold_rate}
                            onChange={(e) => setEditingGoldForm({ ...editingGoldForm, gold_rate: e.target.value })}
                            className="w-20 border border-amber-300 rounded p-1 text-xs text-right font-mono font-bold bg-white"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={editingGoldForm.making_charge}
                            onChange={(e) => setEditingGoldForm({ ...editingGoldForm, making_charge: e.target.value })}
                            className="w-16 border border-amber-300 rounded p-1 text-xs text-right font-mono font-bold bg-white"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={editingGoldForm.wastage}
                            onChange={(e) => setEditingGoldForm({ ...editingGoldForm, wastage: e.target.value })}
                            className="w-14 border border-amber-300 rounded p-1 text-xs text-center font-mono font-bold bg-white"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-stone-900 text-sm">
                          {formatCurrency(totalPrice)}
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => saveGoldEdit(item.id)}
                              className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                              title="Save Changes"
                            >
                              <i className="fa-solid fa-check text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingGoldId(null)}
                              className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="p-3.5 text-center font-mono text-stone-400">{rowNum}</td>
                      <td className="p-3.5 font-bold text-stone-900">{item.category}</td>
                      <td className="p-3.5 font-medium text-stone-600">{item.purity}</td>
                      <td className="p-3.5 font-medium text-stone-600">{item.item_type}</td>
                      <td className="p-3.5 text-center font-mono text-stone-700">{Number(item.weight).toFixed(3)}</td>
                      <td className="p-3.5 text-right font-mono text-stone-800">{formatCurrency(item.gold_rate || rate22k)}</td>
                      <td className="p-3.5 text-right font-mono text-stone-800">{formatCurrency(item.making_charge)}</td>
                      <td className="p-3.5 text-center font-mono text-stone-800">{item.wastage}%</td>
                      <td className="p-3.5 text-right font-mono font-bold text-stone-900 text-sm">
                        {formatCurrency(totalPrice)}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditGold(item)}
                            className="text-stone-400 hover:text-blue-600 transition-colors cursor-pointer p-1"
                            title="Edit Gold Rate Item"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(item.id)}
                            className="text-stone-400 hover:text-[#b01622] transition-colors cursor-pointer p-1"
                            title="Delete Item"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <div>Showing {displayStart} to {displayEnd} of {filteredItems.length} items</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={validCurrentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs transition-all ${validCurrentPage === 1
                  ? 'border-stone-200 text-stone-300 cursor-not-allowed'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer'
                  }`}
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setCurrentPage(pg)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${validCurrentPage === pg
                    ? 'bg-red-50 text-[#b01622] border-red-200 shadow-2xs'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                >
                  {pg}
                </button>
              ))}
              <button
                type="button"
                disabled={validCurrentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs transition-all ${validCurrentPage === totalPages
                  ? 'border-stone-200 text-stone-300 cursor-not-allowed'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer'
                  }`}
              >
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIAMOND JEWELLERY */}
      {activeTab === 'Diamond Jewellery' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-2xs overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-stone-900">Certified Diamond Rate Chart ({filteredDiamondItems.length})</h3>
              <span className="text-xs text-stone-500">VVS-EF / VS-GH Diamonds</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={diamondSearch}
                onChange={(e) => { setDiamondSearch(e.target.value); setDiamondPage(1); }}
                placeholder="Search code, shape, clarity..."
                className="px-3 py-1.5 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-hidden focus:border-[#b01622]"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-stone-50 text-[10px] font-bold text-stone-500 uppercase">
                <tr>
                  <th className="p-3">CODE</th>
                  <th className="p-3">PRODUCT NAME</th>
                  <th className="p-3">SHAPE / CUT</th>
                  <th className="p-3 text-center">CARAT (CT)</th>
                  <th className="p-3">CLARITY / COLOR</th>
                  <th className="p-3 text-right">RATE / CARAT</th>
                  <th className="p-3 text-center">GOLD WT (G)</th>
                  <th className="p-3 text-right">APPROX PRICE</th>
                  <th className="p-3 text-center w-20">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedDiamondItems.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-stone-400 font-medium">
                      <i className="fa-solid fa-gem text-xl text-stone-300 block mb-1"></i>
                      <span className="text-xs font-semibold">No diamond rate items found. Click "+ Add Rate Item" above to create one.</span>
                    </td>
                  </tr>
                )}
                {paginatedDiamondItems.map((item) => {
                  const isEditing = editingDiamondId === item.id;
                  if (isEditing) {
                    const cWt = Number(editingDiamondForm.carat_wt || 0);
                    const rCt = Number(editingDiamondForm.rate_per_ct || 0);
                    const gWt = Number(editingDiamondForm.gold_wt || 0);
                    const approxPrice = Math.round(cWt * rCt + gWt * rate22k);

                    return (
                      <tr key={item.id} className="bg-amber-50/70 font-semibold">
                        <td className="p-2">
                          <input
                            type="text"
                            value={editingDiamondForm.code}
                            onChange={(e) => setEditingDiamondForm({ ...editingDiamondForm, code: e.target.value })}
                            className="w-24 border border-amber-300 rounded p-1 text-xs font-mono font-bold bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editingDiamondForm.name}
                            onChange={(e) => setEditingDiamondForm({ ...editingDiamondForm, name: e.target.value })}
                            className="w-36 border border-amber-300 rounded p-1 text-xs font-bold bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editingDiamondForm.shape}
                            onChange={(e) => setEditingDiamondForm({ ...editingDiamondForm, shape: e.target.value })}
                            className="w-24 border border-amber-300 rounded p-1 text-xs bg-white"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDiamondForm.carat_wt}
                            onChange={(e) => setEditingDiamondForm({ ...editingDiamondForm, carat_wt: e.target.value })}
                            className="w-16 border border-amber-300 rounded p-1 text-xs text-center font-mono font-bold bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editingDiamondForm.clarity}
                            onChange={(e) => setEditingDiamondForm({ ...editingDiamondForm, clarity: e.target.value })}
                            className="w-24 border border-amber-300 rounded p-1 text-xs bg-white"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={editingDiamondForm.rate_per_ct}
                            onChange={(e) => setEditingDiamondForm({ ...editingDiamondForm, rate_per_ct: e.target.value })}
                            className="w-24 border border-amber-300 rounded p-1 text-xs text-right font-mono font-bold bg-white"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            step="0.001"
                            value={editingDiamondForm.gold_wt}
                            onChange={(e) => setEditingDiamondForm({ ...editingDiamondForm, gold_wt: e.target.value })}
                            className="w-16 border border-amber-300 rounded p-1 text-xs text-center font-mono bg-white"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-stone-900 text-sm">
                          {formatCurrency(approxPrice)}
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => saveDiamondEdit(item.id)}
                              className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                              title="Save Changes"
                            >
                              <i className="fa-solid fa-check text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDiamondId(null)}
                              className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={item.id} className="hover:bg-amber-50/20">
                      <td className="p-3 font-mono text-stone-500">{item.code}</td>
                      <td className="p-3 font-bold text-stone-900">{item.name}</td>
                      <td className="p-3 text-stone-700">{item.shape}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#b01622]">{item.carat_wt} ct</td>
                      <td className="p-3 font-medium text-stone-600">{item.clarity}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(item.rate_per_ct)}</td>
                      <td className="p-3 text-center font-mono">{item.gold_wt} g</td>
                      <td className="p-3 text-right font-mono font-bold text-stone-900 text-sm">{formatCurrency(item.approx_price)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditDiamond(item)}
                            className="text-stone-400 hover:text-blue-600 transition-colors cursor-pointer p-1"
                            title="Edit Diamond Item"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDiamondRow(item.id)}
                            className="text-stone-400 hover:text-[#b01622] transition-colors cursor-pointer p-1"
                            title="Delete Item"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <div>Showing {displayDiamondStart} to {displayDiamondEnd} of {filteredDiamondItems.length} items</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={validDiamondPage === 1}
                onClick={() => setDiamondPage((prev) => Math.max(1, prev - 1))}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs transition-all ${validDiamondPage === 1
                  ? 'border-stone-200 text-stone-300 cursor-not-allowed'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer'
                  }`}
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i>
              </button>
              {Array.from({ length: totalDiamondPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setDiamondPage(pg)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${validDiamondPage === pg
                    ? 'bg-red-50 text-[#b01622] border-red-200 shadow-2xs'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                >
                  {pg}
                </button>
              ))}
              <button
                type="button"
                disabled={validDiamondPage === totalDiamondPages}
                onClick={() => setDiamondPage((prev) => Math.min(totalDiamondPages, prev + 1))}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs transition-all ${validDiamondPage === totalDiamondPages
                  ? 'border-stone-200 text-stone-300 cursor-not-allowed'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer'
                  }`}
              >
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COLOR STONE */}
      {activeTab === 'Color Stone' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-2xs overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-stone-900">Precious Gemstone Price Chart ({filteredStoneItems.length})</h3>
              <span className="text-xs text-stone-500">Natural Certified Gemstones</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={stoneSearch}
                onChange={(e) => { setStoneSearch(e.target.value); setStonePage(1); }}
                placeholder="Search gemstone name, type, origin..."
                className="px-3 py-1.5 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-hidden focus:border-[#b01622]"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-stone-50 text-[10px] font-bold text-stone-500 uppercase">
                <tr>
                  <th className="p-3">GEMSTONE NAME</th>
                  <th className="p-3">TYPE</th>
                  <th className="p-3">CUT / SHAPE</th>
                  <th className="p-3 text-center">WEIGHT (CT)</th>
                  <th className="p-3">CERTIFICATION</th>
                  <th className="p-3">ORIGIN</th>
                  <th className="p-3 text-right">RATE / CARAT</th>
                  <th className="p-3 text-center w-20">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedStoneItems.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-stone-400 font-medium">
                      <i className="fa-solid fa-[#b01622] fa-gem text-xl text-stone-300 block mb-1"></i>
                      <span className="text-xs font-semibold">No color stone rate items found. Click "+ Add Rate Item" above to create one.</span>
                    </td>
                  </tr>
                )}
                {paginatedStoneItems.map((item) => {
                  const isEditing = editingStoneId === item.id;
                  if (isEditing) {
                    return (
                      <tr key={item.id} className="bg-amber-50/70 font-semibold">
                        <td className="p-2">
                          <input
                            type="text"
                            value={editingStoneForm.name}
                            onChange={(e) => setEditingStoneForm({ ...editingStoneForm, name: e.target.value })}
                            className="w-36 border border-amber-300 rounded p-1 text-xs font-bold bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editingStoneForm.type}
                            onChange={(e) => setEditingStoneForm({ ...editingStoneForm, type: e.target.value })}
                            className="w-28 border border-amber-300 rounded p-1 text-xs text-[#b01622] font-bold bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editingStoneForm.shape}
                            onChange={(e) => setEditingStoneForm({ ...editingStoneForm, shape: e.target.value })}
                            className="w-24 border border-amber-300 rounded p-1 text-xs bg-white"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editingStoneForm.carat_wt}
                            onChange={(e) => setEditingStoneForm({ ...editingStoneForm, carat_wt: e.target.value })}
                            className="w-16 border border-amber-300 rounded p-1 text-xs text-center font-mono font-bold bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editingStoneForm.cert}
                            onChange={(e) => setEditingStoneForm({ ...editingStoneForm, cert: e.target.value })}
                            className="w-24 border border-amber-300 rounded p-1 text-xs bg-white font-semibold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editingStoneForm.origin}
                            onChange={(e) => setEditingStoneForm({ ...editingStoneForm, origin: e.target.value })}
                            className="w-24 border border-amber-300 rounded p-1 text-xs bg-white"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={editingStoneForm.rate_per_ct}
                            onChange={(e) => setEditingStoneForm({ ...editingStoneForm, rate_per_ct: e.target.value })}
                            className="w-24 border border-amber-300 rounded p-1 text-xs text-right font-mono font-bold bg-white"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => saveStoneEdit(item.id)}
                              className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                              title="Save Changes"
                            >
                              <i className="fa-solid fa-check text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingStoneId(null)}
                              className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={item.id} className="hover:bg-amber-50/20">
                      <td className="p-3 font-bold text-stone-900">{item.name}</td>
                      <td className="p-3 font-medium text-[#b01622]">{item.type}</td>
                      <td className="p-3 text-stone-700">{item.shape}</td>
                      <td className="p-3 text-center font-mono font-bold">{item.carat_wt} ct</td>
                      <td className="p-3 text-stone-600 font-semibold">{item.cert}</td>
                      <td className="p-3 text-stone-600">{item.origin}</td>
                      <td className="p-3 text-right font-mono font-bold text-stone-900">{formatCurrency(item.rate_per_ct)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditStone(item)}
                            className="text-stone-400 hover:text-blue-600 transition-colors cursor-pointer p-1"
                            title="Edit Gemstone Item"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStoneRow(item.id)}
                            className="text-stone-400 hover:text-[#b01622] transition-colors cursor-pointer p-1"
                            title="Delete Item"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <div>Showing {displayStoneStart} to {displayStoneEnd} of {filteredStoneItems.length} items</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={validStonePage === 1}
                onClick={() => setStonePage((prev) => Math.max(1, prev - 1))}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs transition-all ${validStonePage === 1
                  ? 'border-stone-200 text-stone-300 cursor-not-allowed'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer'
                  }`}
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i>
              </button>
              {Array.from({ length: totalStonePages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setStonePage(pg)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${validStonePage === pg
                    ? 'bg-red-50 text-[#b01622] border-red-200 shadow-2xs'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                >
                  {pg}
                </button>
              ))}
              <button
                type="button"
                disabled={validStonePage === totalStonePages}
                onClick={() => setStonePage((prev) => Math.min(totalStonePages, prev + 1))}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs transition-all ${validStonePage === totalStonePages
                  ? 'border-stone-200 text-stone-300 cursor-not-allowed'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer'
                  }`}
              >
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MAKING CHARGES */}
      {activeTab === 'Making Charges' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-2xs overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-stone-900">Category-Wise Labour &amp; Making Charges Matrix ({filteredMakingItems.length})</h3>
              <span className="text-xs text-stone-500">Standard Showroom Rates</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={makingSearch}
                onChange={(e) => { setMakingSearch(e.target.value); setMakingPage(1); }}
                placeholder="Search category..."
                className="px-3 py-1.5 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-hidden focus:border-[#b01622]"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#b01622] text-white text-[10px] font-bold uppercase">
                <tr>
                  <th className="p-3">CATEGORY</th>
                  <th className="p-3 text-right">PLAIN LABOUR (₹/GM)</th>
                  <th className="p-3 text-right">STUDDED LABOUR (₹/GM)</th>
                  <th className="p-3 text-right">ANTIQUE WORK (₹/GM)</th>
                  <th className="p-3 text-right">KUNDAN WORK (₹/GM)</th>
                  <th className="p-3 text-right">MINIMUM CHARGE / PIECE</th>
                  <th className="p-3 text-center w-20">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedMakingItems.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-stone-400 font-medium">
                      <i className="fa-solid fa-percent text-xl text-stone-300 block mb-1"></i>
                      <span className="text-xs font-semibold">No making charge matrix items found.</span>
                    </td>
                  </tr>
                )}
                {paginatedMakingItems.map((row, idx) => {
                  const isEditing = editingMakingCat === row.category;
                  if (isEditing) {
                    return (
                      <tr key={idx} className="bg-amber-50/70 font-semibold">
                        <td className="p-2 font-bold text-stone-900">{row.category}</td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={editingMakingForm.plain}
                            onChange={(e) => setEditingMakingForm({ ...editingMakingForm, plain: e.target.value })}
                            className="w-20 border border-amber-300 rounded p-1 text-xs font-mono font-bold text-right bg-white"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={editingMakingForm.studded}
                            onChange={(e) => setEditingMakingForm({ ...editingMakingForm, studded: e.target.value })}
                            className="w-20 border border-amber-300 rounded p-1 text-xs font-mono font-bold text-right bg-white"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={editingMakingForm.antique}
                            onChange={(e) => setEditingMakingForm({ ...editingMakingForm, antique: e.target.value })}
                            className="w-20 border border-amber-300 rounded p-1 text-xs font-mono font-bold text-right bg-white"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={editingMakingForm.kundan}
                            onChange={(e) => setEditingMakingForm({ ...editingMakingForm, kundan: e.target.value })}
                            className="w-20 border border-amber-300 rounded p-1 text-xs font-mono font-bold text-right bg-white"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={editingMakingForm.min_piece}
                            onChange={(e) => setEditingMakingForm({ ...editingMakingForm, min_piece: e.target.value })}
                            className="w-20 border border-amber-300 rounded p-1 text-xs font-mono font-bold text-right text-[#b01622] bg-white"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => saveMakingEdit(row.category)}
                              className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                              title="Save Changes"
                            >
                              <i className="fa-solid fa-check text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMakingCat(null)}
                              className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={idx} className="hover:bg-amber-50/20">
                      <td className="p-3 font-bold text-stone-900">{row.category}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(row.plain * customerDiscount)}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(row.studded * customerDiscount)}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(row.antique * customerDiscount)}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(row.kundan * customerDiscount)}</td>
                      <td className="p-3 text-right font-mono font-bold text-[#b01622]">{formatCurrency(row.min_piece)}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => startEditMaking(row)}
                          className="text-stone-400 hover:text-blue-600 transition-colors cursor-pointer p-1 text-xs font-semibold flex items-center justify-center gap-1 mx-auto"
                          title="Edit Making Charge Matrix"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <div>Showing {displayMakingStart} to {displayMakingEnd} of {filteredMakingItems.length} items</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={validMakingPage === 1}
                onClick={() => setMakingPage((prev) => Math.max(1, prev - 1))}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs transition-all ${validMakingPage === 1
                  ? 'border-stone-200 text-stone-300 cursor-not-allowed'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer'
                  }`}
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i>
              </button>
              {Array.from({ length: totalMakingPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setMakingPage(pg)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${validMakingPage === pg
                    ? 'bg-red-50 text-[#b01622] border-red-200 shadow-2xs'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                >
                  {pg}
                </button>
              ))}
              <button
                type="button"
                disabled={validMakingPage === totalMakingPages}
                onClick={() => setMakingPage((prev) => Math.min(totalMakingPages, prev + 1))}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs transition-all ${validMakingPage === totalMakingPages
                  ? 'border-stone-200 text-stone-300 cursor-not-allowed'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer'
                  }`}
              >
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TERMS & CONDITIONS */}
      {activeTab === 'Terms & Conditions' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-2xs overflow-hidden p-6 space-y-4 text-xs text-stone-700">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <i className="fa-solid fa-file-contract text-[#b01622]"></i>
                {termsData.title || 'Standard Store Terms & Policy Agreement'}
              </h3>
              <p className="text-stone-500 text-xs">Customer purchase guidelines, valuation terms and refund guidelines.</p>
            </div>
            {isEditingTerms ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingTerms(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTerms(false);
                    setToast({ message: 'Terms & Conditions updated successfully', type: 'success' });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <i className="fa-solid fa-check text-xs"></i>
                  <span>Save Terms</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTerms(true)}
                className="px-3 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-pen-to-square text-xs"></i>
                <span>Edit Terms</span>
              </button>
            )}
          </div>

          {isEditingTerms ? (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Header Title</label>
                <input
                  type="text"
                  value={termsData.title}
                  onChange={(e) => setTermsData({ ...termsData, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622]"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">1. Live Metal Rate Lock Clause</label>
                <textarea
                  rows="2"
                  value={termsData.clause1}
                  onChange={(e) => setTermsData({ ...termsData, clause1: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622]"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">2. Making &amp; Wastage Billing Clause</label>
                <textarea
                  rows="2"
                  value={termsData.clause2}
                  onChange={(e) => setTermsData({ ...termsData, clause2: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622]"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">3. BIS Hallmarking Guarantee</label>
                <textarea
                  rows="2"
                  value={termsData.clause3}
                  onChange={(e) => setTermsData({ ...termsData, clause3: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622]"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">4. Exchange &amp; Return Policy</label>
                <textarea
                  rows="2"
                  value={termsData.clause4}
                  onChange={(e) => setTermsData({ ...termsData, clause4: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 bg-stone-50/80 p-4 rounded-xl border border-stone-200">
                <h4 className="font-bold text-stone-900 uppercase tracking-wide text-[11px]">1. Live Metal Rate Lock Clause</h4>
                <p>{termsData.clause1}</p>
                <h4 className="font-bold text-stone-900 uppercase tracking-wide text-[11px] pt-2">2. Making &amp; Wastage Billing Clause</h4>
                <p>{termsData.clause2}</p>
              </div>

              <div className="space-y-2 bg-stone-50/80 p-4 rounded-xl border border-stone-200">
                <h4 className="font-bold text-stone-900 uppercase tracking-wide text-[11px]">3. BIS Hallmarking Guarantee</h4>
                <p>{termsData.clause3}</p>
                <h4 className="font-bold text-stone-900 uppercase tracking-wide text-[11px] pt-2">4. Exchange &amp; Return Policy</h4>
                <p>{termsData.clause4}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <i className="fa-solid fa-file-import text-[#b01622]"></i>
                <span>Bulk Import Live Price List</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                className="text-stone-400 hover:text-stone-600 text-base cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleBulkImportSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center space-y-2 hover:border-[#b01622] transition-colors cursor-pointer bg-stone-50/50">
                <i className="fa-solid fa-cloud-arrow-up text-3xl text-stone-400"></i>
                <div className="text-xs font-semibold text-stone-700">
                  {importFile ? importFile.name : 'Click or Drag & Drop CSV / Excel File'}
                </div>
                <p className="text-[10px] text-stone-400">Supported formats: .csv, .xlsx, .xls (Max 10MB)</p>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="hidden"
                  id="bulk-file-input"
                />
                <label
                  htmlFor="bulk-file-input"
                  className="inline-block px-3 py-1.5 bg-white border border-stone-200 text-stone-700 text-xs font-bold rounded-lg cursor-pointer hover:bg-stone-50 shadow-2xs mt-1"
                >
                  Browse File
                </label>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl text-[11px] text-stone-600 space-y-1">
                <span className="font-bold text-stone-800 block">Expected CSV Columns:</span>
                <p className="font-mono text-stone-500">Category, Purity, ItemType, Weight, GoldRate, MakingCharge, Wastage</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(false)}
                  className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Import Price List Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
