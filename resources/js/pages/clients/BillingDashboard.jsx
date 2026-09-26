import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import { getStoredDefaultBankAccount } from '../masters/BankAccounts';
import { getStoredCompanyInfo, fetchCompanyInfo } from '../../utils/companyInfoService';
import { printElement } from '../../utils/printHelper';

// Number to Indian Rupees Words Helper
function numberToWordsINR(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return 'Rupees Zero Only';

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  }

  let words = '';
  const crore = Math.floor(num / 10000000);
  let rem = num % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  const hundred = Math.floor(rem / 100);
  rem = rem % 100;

  if (crore > 0) words += inWords(crore) + ' Crore ';
  if (lakh > 0) words += inWords(lakh) + ' Lakh ';
  if (thousand > 0) words += inWords(thousand) + ' Thousand ';
  if (hundred > 0) words += inWords(hundred) + ' Hundred ';
  if (rem > 0) {
    if (words !== '') words += 'and ';
    words += inWords(rem) + ' ';
  }

  return 'Rupees ' + words.trim() + ' Only';
}

export default function BillingDashboard() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientIdParam = searchParams.get('client_id');
  const createParam = searchParams.get('create');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientsList, setClientsList] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(() => getStoredCompanyInfo());

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

  // Filters
  const [clientFilter, setClientFilter] = useState(clientIdParam || 'all');
  const [dateRange, setDateRange] = useState('30_days');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Period filter options: All Time, Presets (This Month, Quarter, Year, Today), and Specific Months
  const periodFilterOptions = useMemo(() => {
    const opts = [
      { value: 'all', label: 'All Time' },
      { value: 'today', label: 'Today' },
      { value: 'yesterday', label: 'Yesterday' },
      { value: 'week', label: 'This Week' },
      { value: 'month', label: 'This Month' },
      { value: 'quarter', label: 'This Quarter' },
      { value: 'year', label: 'This Year' },
    ];
    // Dynamic month choices starting from current month back 12 months
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = d.toLocaleString('en-US', { month: 'long' });
      const year = d.getFullYear();
      const str = `${mName} ${year}`;
      opts.push({ value: str, label: str });
    }
    return opts;
  }, []);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [deleteTargetInv, setDeleteTargetInv] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Selected client object for modal display
  const [selectedClientObj, setSelectedClientObj] = useState(null);

  // Payment Tracking & Edit State
  const [editPaymentInvoice, setEditPaymentInvoice] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    status: 'paid',
    paid_amount: '',
    payment_mode: 'NEFT / RTGS (HDFC)',
    ref_no: '',
    notes: ''
  });

  // Create Invoice mode & payment advance
  const [invoiceMode, setInvoiceMode] = useState('itemized'); // 'itemized' | 'quick'
  const [advancePaid, setAdvancePaid] = useState('');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([
    {
      sno: 1,
      desc: '',
      code: 'RJ-ITM-001',
      hsn: '711319',
      purity: '22KT (916)',
      gross_wt: '',
      net_wt: '',
      dia_wt: '-',
      rate: '',
      making: '',
      taxable: 0
    }
  ]);

  const handleAddItem = () => {
    setInvoiceItems(prev => {
      const nextSno = prev.length + 1;
      return [
        ...prev,
        {
          sno: nextSno,
          desc: '',
          code: `RJ-ITM-${String(nextSno).padStart(3, '0')}`,
          hsn: '711319',
          purity: '22KT (916)',
          gross_wt: '',
          net_wt: '',
          dia_wt: '-',
          rate: '6850',
          making: '3500',
          taxable: 0
        }
      ];
    });
  };

  const handleRemoveItem = (index) => {
    if (invoiceItems.length <= 1) {
      showToast('Invoice must have at least one jewellery item', 'info', 'Notice');
      return;
    }
    setInvoiceItems(prev => {
      const updated = prev.filter((_, i) => i !== index).map((item, idx) => ({ ...item, sno: idx + 1 }));
      return updated;
    });
  };

  const handleItemFieldChange = (index, field, value) => {
    setInvoiceItems(prev => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: value };

      if (field === 'gross_wt' && (!row.net_wt || parseFloat(row.net_wt) > parseFloat(value || 0))) {
        row.net_wt = value;
      }

      const net = parseFloat(row.net_wt) || 0;
      const rate = parseFloat(row.rate) || 0;
      const making = parseFloat(row.making) || 0;
      row.taxable = Math.round((net * rate) + making);

      copy[index] = row;
      return copy;
    });
  };

  const handleSelectProductForItem = (index, productId) => {
    if (!productId) return;
    const prod = availableProducts.find(p => String(p.id) === String(productId));
    if (!prod) return;

    setInvoiceItems(prev => {
      const copy = [...prev];
      const row = { ...copy[index] };
      row.desc = prod.name;
      row.code = prod.product_code || `PRD-${prod.id}`;
      row.hsn = prod.hsn || '711319';
      if (prod.opening_touch && prod.opening_touch >= 90) {
        row.purity = '22KT (916)';
      } else if (prod.opening_touch && prod.opening_touch >= 75) {
        row.purity = '18KT (750)';
      }
      if (prod.opening_stock_weight) {
        row.gross_wt = String(prod.opening_stock_weight);
        row.net_wt = String(prod.opening_stock_weight);
      }
      if (prod.opening_stock_rate) {
        row.rate = String(prod.opening_stock_rate);
      }

      const net = parseFloat(row.net_wt) || 0;
      const rate = parseFloat(row.rate) || 6850;
      const making = parseFloat(row.making) || 3500;
      row.taxable = Math.round((net * rate) + making);

      copy[index] = row;
      return copy;
    });
  };

  const [quickSelectedProductIds, setQuickSelectedProductIds] = useState([]);

  const handleToggleQuickProduct = (product) => {
    setQuickSelectedProductIds(prev => {
      const isSelected = prev.includes(product.id);
      const nextIds = isSelected ? prev.filter(id => id !== product.id) : [...prev, product.id];
      
      const selectedProds = availableProducts.filter(p => nextIds.includes(p.id));
      const items = selectedProds.map((prod, idx) => {
        const wt = parseFloat(prod.opening_stock_weight || 10);
        const rate = parseFloat(prod.opening_stock_rate || 6850);
        const making = 3500;
        const taxable = Math.round((wt * rate) + making);
        return {
          sno: idx + 1,
          desc: prod.name,
          code: prod.product_code || `PRD-${prod.id}`,
          hsn: '711319',
          purity: prod.opening_touch >= 90 ? '22KT (916)' : '18KT (750)',
          gross_wt: (wt + 0.5).toFixed(3),
          net_wt: wt.toFixed(3),
          dia_wt: '-',
          rate: String(rate),
          making: String(making),
          taxable: taxable
        };
      });

      const totalTaxable = items.reduce((sum, it) => sum + it.taxable, 0);
      setFormData(f => ({
        ...f,
        amount: totalTaxable > 0 ? totalTaxable.toFixed(2) : ''
      }));

      if (items.length > 0) {
        setInvoiceItems(items);
      }

      return nextIds;
    });
  };

  // New invoice form
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    client_code: '',
    client_email: '',
    client_phone: '',
    client_tier: 'ELITE',
    client_gst: '',
    client_company: '',
    client_address: '',
    amount: '',
    gst_rate: 5,
    status: 'paid',
    invoice_type: 'b2b_tax',
    payment_mode: 'NEFT / RTGS (Bank Transfer)',
    payment_plan: 'full', // 'full' | 'partial' | 'later'
    payment_ref: '',
    promised_pay_date: '',
    notes: ''
  });

  const selectClientForInvoice = (client) => {
    if (!client) {
      setSelectedClientObj(null);
      setFormData(prev => ({
        ...prev,
        client_id: '',
        client_name: '',
        client_code: '',
        client_email: '',
        client_phone: '',
        client_tier: 'ELITE',
        client_gst: '',
        client_company: '',
        client_address: '',
      }));
      return;
    }

    const clientName = client.full_name || client.name || '';
    const gstRate = client.gst_percentage ? parseFloat(client.gst_percentage) : 5;
    const address = client.street_address ? (client.street_address + (client.city ? ', ' + client.city : '')) : (client.city || '');

    setSelectedClientObj(client);
    setFormData(prev => ({
      ...prev,
      client_id: client.id,
      client_name: clientName,
      client_code: client.client_code || ('RJ-CL-' + client.id),
      client_email: client.email || `${clientName.toLowerCase().replace(/\s+/g, '.')}@regal.com`,
      client_phone: client.primary_phone || '',
      client_tier: (client.membership_tier || client.tier || 'ELITE').toUpperCase(),
      client_gst: client.gst_number || '',
      client_company: client.company_name || '',
      client_address: address,
      gst_rate: gstRate,
    }));
  };

  const fetchBillingData = (month = selectedMonth) => {
    setLoading(true);
    api.get('/billing', { params: { period: month, month: month } })
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load billing data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBillingData(selectedMonth);

    const handleSync = () => {
      fetchBillingData(selectedMonth);
    };
    window.addEventListener('rudhra_invoices_updated', handleSync);
    window.addEventListener('rudhra_sales_updated', handleSync);
    return () => {
      window.removeEventListener('rudhra_invoices_updated', handleSync);
      window.removeEventListener('rudhra_sales_updated', handleSync);
    };
  }, [selectedMonth]);

  useEffect(() => {
    fetchBillingData(selectedMonth);

    // Fetch clients for invoice generation
    api.get('/clients')
      .then(res => {
        const list = res.data?.clients || (Array.isArray(res.data) ? res.data : (res.data?.data || []));
        setClientsList(list);

        // If URL requested creation with preselected client
        if (createParam === 'true') {
          setShowCreateModal(true);
          if (clientIdParam) {
            const found = list.find(c => String(c.id) === String(clientIdParam));
            if (found) {
              selectClientForInvoice(found);
            }
          }
        } else if (clientIdParam) {
          setClientFilter(clientIdParam);
        }
      })
      .catch(err => console.error('Failed to load clients list:', err));

    // Fetch product catalog for auto-populating items
    api.get('/products')
      .then(res => {
        const pList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setAvailableProducts(pList);
      })
      .catch(err => console.error('Failed to load products list:', err));
  }, [clientIdParam, createParam]);

  // Auto-sync formData.amount when in itemized mode
  useEffect(() => {
    if (invoiceMode === 'itemized') {
      const sumTaxable = invoiceItems.reduce((acc, item) => acc + (parseFloat(item.taxable) || 0), 0);
      setFormData(prev => {
        const newAmt = sumTaxable > 0 ? sumTaxable.toFixed(2) : '';
        if (prev.amount !== newAmt) {
          return { ...prev, amount: newAmt };
        }
        return prev;
      });
    }
  }, [invoiceItems, invoiceMode]);

  const stats = data?.stats || {
    todayInvoices: '0',
    todayBillings: '₹ 0.00',
    pendingBills: '₹ 0.00',
    totalRevenue: '₹ 0.00'
  };

  const invoices = data?.invoices || [];

  // Calculate previous unpaid balance for the currently selected client
  const clientPreviousBalance = useMemo(() => {
    if (!formData.client_id) return 0;
    return invoices
      .filter(inv => String(inv.client_id) === String(formData.client_id) && inv.status !== 'paid')
      .reduce((sum, inv) => {
        const invTotal = parseFloat(inv.total || 0);
        let paid = 0;
        if (inv.status === 'partial') {
          const match = inv.notes?.match(/(?:Advance\s+)?Paid:\s*₹?([\d,]+(?:\.\d+)?)/i);
          if (match) {
            paid = parseFloat(match[1].replace(/,/g, '')) || 0;
          } else {
            paid = invTotal * 0.5;
          }
        }
        return sum + Math.max(0, invTotal - paid);
      }, 0);
  }, [formData.client_id, invoices]);

  const clientUnpaidInvoicesCount = useMemo(() => {
    if (!formData.client_id) return 0;
    return invoices.filter(inv => String(inv.client_id) === String(formData.client_id) && inv.status !== 'paid').length;
  }, [formData.client_id, invoices]);

  // Current bill amount calculations
  const currentBaseAmount = parseFloat(formData.amount) || 0;
  const currentGstRate = parseFloat(formData.gst_rate) || 5;
  const currentGstAmount = (currentBaseAmount * currentGstRate) / 100;
  const currentBillTotal = currentBaseAmount + currentGstAmount;
  const totalPayableBalance = clientPreviousBalance + currentBillTotal;

  const handlePaymentPlanChange = (plan) => {
    setFormData(prev => ({ ...prev, payment_plan: plan }));
    if (plan === 'full') {
      setAdvancePaid(currentBillTotal > 0 ? currentBillTotal.toFixed(2) : '');
      setFormData(prev => ({ ...prev, payment_plan: 'full', status: 'paid' }));
    } else if (plan === 'later') {
      setAdvancePaid('0');
      setFormData(prev => ({ ...prev, payment_plan: 'later', status: 'pending' }));
    } else if (plan === 'partial') {
      const half = currentBillTotal > 0 ? (currentBillTotal * 0.5).toFixed(2) : '';
      setAdvancePaid(half);
      setFormData(prev => ({ ...prev, payment_plan: 'partial', status: 'partial' }));
    }
  };

  const handleAdvancePaidChange = (val) => {
    setAdvancePaid(val);
    const paid = parseFloat(val) || 0;
    if (currentBillTotal > 0) {
      if (paid >= currentBillTotal) {
        setFormData(prev => ({ ...prev, status: 'paid', payment_plan: 'full' }));
      } else if (paid > 0) {
        setFormData(prev => ({ ...prev, status: 'partial', payment_plan: 'partial' }));
      } else {
        setFormData(prev => ({ ...prev, status: 'pending', payment_plan: 'later' }));
      }
    }
  };

  // Filter invoices based on active filters
  const filteredInvoices = invoices.filter(inv => {
    if (clientFilter !== 'all') {
      if (String(inv.client_id) !== String(clientFilter)) return false;
    }

    if (tierFilter !== 'all') {
      const invTier = (inv.tierKey || inv.tier || '').toLowerCase();
      if (!invTier.includes(tierFilter.toLowerCase())) return false;
    }

    if (statusFilter !== 'all') {
      const invStatus = (inv.status || '').toLowerCase();
      if (statusFilter === 'pending_credit') {
        if (!['pending', 'partial', 'overdue', 'unpaid', 'credit'].includes(invStatus)) return false;
      } else if (invStatus !== statusFilter.toLowerCase()) {
        return false;
      }
    }

    if (invoiceTypeFilter !== 'all') {
      const invType = (inv.invoice_type || '').toLowerCase();
      if (invType && !invType.includes(invoiceTypeFilter.toLowerCase())) return false;
    }

    return true;
  });

  // Calculate dynamic card metrics based on filtered invoices
  const cardMetrics = useMemo(() => {
    const list = filteredInvoices;
    const count = list.length;

    let totalBillingsSum = 0;
    let pendingBillsSum = 0;
    let totalRevenueSum = 0;

    list.forEach(inv => {
      const tot = parseFloat(inv.total || inv.total_amount || 0);
      const st = (inv.status || '').toLowerCase();

      totalBillingsSum += tot;

      if (st === 'paid') {
        totalRevenueSum += tot;
      } else if (st === 'partial') {
        const half = tot * 0.5;
        totalRevenueSum += half;
        pendingBillsSum += (tot - half);
      } else {
        pendingBillsSum += tot;
      }
    });

    const fmt = (val) => {
      if (!val || isNaN(val) || val === 0) return '₹ 0.00';
      if (val >= 10000000) return '₹ ' + (val / 10000000).toFixed(2) + ' Cr';
      if (val >= 100000) return '₹ ' + (val / 100000).toFixed(2) + ' L';
      return '₹ ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return {
      invoicesCount: count,
      totalBillings: fmt(totalBillingsSum),
      pendingBills: fmt(pendingBillsSum),
      totalRevenue: fmt(totalRevenueSum),
    };
  }, [filteredInvoices]);

  // Compute final display metrics for the 4 KPI cards
  const displayMetrics = useMemo(() => {
    const isSubFiltered = clientFilter !== 'all' || tierFilter !== 'all' || statusFilter !== 'all' || invoiceTypeFilter !== 'all';

    let currentPeriodLabel = 'All Time';
    if (selectedMonth !== 'all') {
      const foundOpt = periodFilterOptions.find(opt => opt.value === selectedMonth);
      currentPeriodLabel = foundOpt ? foundOpt.label : selectedMonth;
    }

    if (isSubFiltered) {
      return {
        invoicesCount: cardMetrics.invoicesCount,
        totalBillings: cardMetrics.totalBillings,
        pendingBills: cardMetrics.pendingBills,
        totalRevenue: cardMetrics.totalRevenue,
        subtext: `filtered view (${currentPeriodLabel})`
      };
    }

    return {
      invoicesCount: cardMetrics.invoicesCount > 0 ? cardMetrics.invoicesCount : (stats.todayInvoices || '0'),
      totalBillings: cardMetrics.invoicesCount > 0 ? cardMetrics.totalBillings : (stats.todayBillings || '₹ 0.00'),
      pendingBills: cardMetrics.invoicesCount > 0 ? cardMetrics.pendingBills : (stats.pendingBills || '₹ 0.00'),
      totalRevenue: cardMetrics.invoicesCount > 0 ? cardMetrics.totalRevenue : (stats.totalRevenue || '₹ 0.00'),
      subtext: currentPeriodLabel
    };
  }, [clientFilter, tierFilter, statusFilter, invoiceTypeFilter, cardMetrics, stats, selectedMonth, periodFilterOptions]);

  // Calculate pagination
  const totalItems = filteredInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Auto-clamp currentPage if totalPages shrinks
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Keyboard shortcut (Escape key) to close invoice modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedInvoice) {
        setSelectedInvoice(null);
      }
    };
    if (selectedInvoice) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedInvoice]);

  const handleResetFilters = () => {
    setClientFilter('all');
    setDateRange('30_days');
    setTierFilter('all');
    setStatusFilter('all');
    setInvoiceTypeFilter('all');
    setSelectedMonth('all');
    setCurrentPage(1);
    setSearchParams({});
    showToast('Filters reset to default', 'info', 'Filters');
  };

  const handleClientSelectChange = (e) => {
    const val = e.target.value;
    if (!val) {
      selectClientForInvoice(null);
      return;
    }

    const client = clientsList.find(c => String(c.id) === String(val));
    if (client) {
      selectClientForInvoice(client);
    }
  };

  const handleCreateInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_name || !formData.amount) {
      showToast('Please fill in required fields: Client Name and Amount Without GST', 'error', 'Validation Error');
      return;
    }

    setSubmitting(true);
    try {
      const baseAmount = parseFloat(formData.amount) || 0;
      const gstRate = parseFloat(formData.gst_rate) || 5;
      const currentBill = baseAmount * (1 + gstRate / 100);
      const paid = parseFloat(advancePaid) || 0;
      const remainingDue = Math.max(0, currentBill - paid);

      let finalStatus = formData.status;
      if (paid >= currentBill && currentBill > 0) {
        finalStatus = 'paid';
      } else if (paid > 0) {
        finalStatus = 'partial';
      } else {
        finalStatus = 'pending';
      }

      // Build rich payment tracking note
      const notesParts = [];
      if (finalStatus === 'paid') {
        notesParts.push(`Paid in Full: ₹${paid.toLocaleString('en-IN')} via ${formData.payment_mode}${formData.payment_ref ? ` [Ref: ${formData.payment_ref}]` : ''}`);
      } else if (finalStatus === 'partial') {
        notesParts.push(`Advance Paid: ₹${paid.toLocaleString('en-IN')} via ${formData.payment_mode}${formData.payment_ref ? ` [Ref: ${formData.payment_ref}]` : ''}`);
        notesParts.push(`Pending Balance: ₹${remainingDue.toLocaleString('en-IN')}`);
        if (formData.promised_pay_date) {
          notesParts.push(`Promised Due Date: ${formData.promised_pay_date}`);
        }
      } else {
        notesParts.push(`Payment Status: Pay Later / On Credit via ${formData.payment_mode}`);
        notesParts.push(`Balance Due: ₹${currentBill.toLocaleString('en-IN')}`);
        if (formData.promised_pay_date) {
          notesParts.push(`Promised Due Date: ${formData.promised_pay_date}`);
        }
      }

      if (clientPreviousBalance > 0) {
        notesParts.push(`Total Payable Balance (incl. prev dues): ₹${(clientPreviousBalance + remainingDue).toLocaleString('en-IN')}`);
      }

      if (formData.notes) {
        notesParts.push(formData.notes);
      }

      const paymentNote = notesParts.join(' | ');

      const payload = {
        client_id: formData.client_id || null,
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_tier: formData.client_tier,
        amount: baseAmount,
        gst_rate: gstRate,
        status: finalStatus,
        invoice_type: formData.invoice_type,
        notes: paymentNote,
        items: invoiceMode === 'itemized' ? invoiceItems : null
      };

      await api.post('/invoices', payload);
      showToast('Invoice generated and ledger recorded successfully!', 'success', 'Invoice Created');
      setShowCreateModal(false);
      setFormData({
        client_id: '',
        client_name: '',
        client_code: '',
        client_email: '',
        client_phone: '',
        client_tier: 'ELITE',
        client_gst: '',
        client_company: '',
        client_address: '',
        amount: '',
        gst_rate: 5,
        status: 'paid',
        invoice_type: 'b2b_tax',
        payment_mode: 'NEFT / RTGS (Bank Transfer)',
        payment_plan: 'full',
        payment_ref: '',
        promised_pay_date: '',
        notes: ''
      });
      setAdvancePaid('');
      if (invoiceMode === 'itemized') {
        setInvoiceItems([
          {
            sno: 1,
            desc: '',
            code: 'RJ-ITM-001',
            hsn: '711319',
            purity: '22KT (916)',
            gross_wt: '',
            net_wt: '',
            dia_wt: '-',
            rate: '',
            making: '',
            taxable: 0
          }
        ]);
      }
      fetchBillingData();
      window.dispatchEvent(new CustomEvent('rudhra_invoices_updated'));
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to create invoice.', 'error', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditPayment = (inv) => {
    setEditPaymentInvoice(inv);
    const total = parseFloat(inv.total || 0);
    const initialPaid = inv.status === 'paid' ? total : (inv.status === 'partial' ? Math.round(total * 0.5) : 0);
    setPaymentFormData({
      status: inv.status || 'paid',
      paid_amount: initialPaid,
      payment_mode: 'NEFT / RTGS (HDFC)',
      ref_no: '',
      notes: inv.notes || ''
    });
  };

  const handlePaidAmountChange = (newVal, total) => {
    const paid = parseFloat(newVal) || 0;
    let newStatus = 'pending';
    if (paid >= total && total > 0) {
      newStatus = 'paid';
    } else if (paid > 0) {
      newStatus = 'partial';
    }
    setPaymentFormData(prev => ({
      ...prev,
      paid_amount: newVal,
      status: newStatus
    }));
  };

  const handleUpdatePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!editPaymentInvoice) return;

    setSubmitting(true);
    try {
      const invId = editPaymentInvoice.numeric_id || editPaymentInvoice.id;
      const total = parseFloat(editPaymentInvoice.total || 0);
      const paid = parseFloat(paymentFormData.paid_amount || 0);
      const bal = Math.max(0, total - paid);
      
      const paymentSummary = `Paid: ₹${paid.toLocaleString('en-IN')} via ${paymentFormData.payment_mode}${paymentFormData.ref_no ? ` [Ref: ${paymentFormData.ref_no}]` : ''}. Balance: ₹${bal.toLocaleString('en-IN')}. ${paymentFormData.notes || ''}`.trim();

      await api.put(`/invoices/${invId}`, {
        status: paymentFormData.status,
        notes: paymentSummary
      });

      showToast(`Payment updated! Status: ${paymentFormData.status.toUpperCase()}`, 'success', 'Payment Recorded');
      setEditPaymentInvoice(null);
      fetchBillingData();
      window.dispatchEvent(new CustomEvent('rudhra_invoices_updated'));
    } catch (err) {
      console.error('Failed to update payment:', err);
      showToast(err.response?.data?.message || 'Failed to update payment', 'error', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!deleteTargetInv) return;
    try {
      await api.delete(`/invoices/${deleteTargetInv.id}`);
      showToast(`Invoice ${deleteTargetInv.invoice_no || deleteTargetInv.id} removed successfully`, 'success', 'Deleted');
      setDeleteTargetInv(null);
      fetchBillingData();
      window.dispatchEvent(new CustomEvent('rudhra_invoices_updated'));
    } catch (err) {
      console.error(err);
      showToast('Failed to delete invoice.', 'error', 'Error');
    }
  };

  const handleExportReport = () => {
    const headers = ['Invoice ID', 'Client Name', 'Email', 'Tier', 'Date', 'Amount (INR)', 'GST (INR)', 'Total (INR)', 'Status'];
    const rows = filteredInvoices.map(inv => [
      inv.invoice_no || inv.id,
      `"${inv.client || inv.client_name}"`,
      `"${inv.email || ''}"`,
      inv.tier || 'ELITE',
      `"${inv.date || ''}"`,
      inv.amount,
      inv.gst,
      inv.total,
      (inv.status || '').toUpperCase()
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Billing_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Billing report exported successfully to CSV!', 'info', 'Export Finished');
  };

  // Exact Tier Badge styling matching reference image
  const getTierBadge = (tier) => {
    const t = (tier || '').toUpperCase();
    if (t.includes('ELITE') || t.includes('PLATINUM')) {
      return (
        <span className="bg-[#eac676] text-[#5e4107] text-[9.5px] font-bold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider leading-none select-none">
          ELITE
        </span>
      );
    }
    if (t.includes('GOLD')) {
      return (
        <span className="bg-[#e4dcd3] text-[#5a524a] text-[9.5px] font-bold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider leading-none select-none">
          GOLD
        </span>
      );
    }
    return (
      <span className="bg-[#dddfe2] text-[#4a535e] text-[9.5px] font-bold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider leading-none select-none">
        SILVER
      </span>
    );
  };

  // Exact Avatar background & text color matching reference image
  const getAvatarBg = (tier) => {
    const t = (tier || '').toUpperCase();
    if (t.includes('ELITE') || t.includes('PLATINUM')) {
      return 'bg-[#fbf2d5] text-[#78601c]';
    }
    return 'bg-[#eef2f5] text-[#4b5868]';
  };

  // Exact Status Pill matching reference image with bullet dot
  const getStatusPill = (status, onClick = null) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') {
      return (
        <span
          onClick={onClick}
          className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-[#e3f8ec] text-[#22c55e] select-none tracking-wide ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          title={onClick ? "Click to record or update payment" : undefined}
        >
          <span className="text-[8px] leading-none">●</span> PAID
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span
          onClick={onClick}
          className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-[#feeceb] text-[#cf3b3b] select-none tracking-wide ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          title={onClick ? "Click to record or update payment" : undefined}
        >
          <span className="text-[8px] leading-none">●</span> PENDING
        </span>
      );
    }
    return (
      <span
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-[#fef3d6] text-[#c87a12] select-none tracking-wide ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
        title={onClick ? "Click to record or update payment" : undefined}
      >
        <span className="text-[8px] leading-none">●</span> PARTIAL
      </span>
    );
  };

  // Generate realistic jewellery item breakdown matching the invoice total or use saved items
  const generateInvoiceItems = (inv) => {
    if (!inv) return [];

    // If real items are saved with the invoice, use them
    if (Array.isArray(inv.items) && inv.items.length > 0) {
      return inv.items.map((item, idx) => ({
        sno: item.sno || (idx + 1),
        desc: item.desc || item.description || '22KT Gold Jewellery Item',
        code: item.code || `RJ-ITM-${String(idx + 1).padStart(3, '0')}`,
        hsn: item.hsn || '711319',
        purity: item.purity || '22KT (916)',
        gross_wt: item.gross_wt ? parseFloat(item.gross_wt).toFixed(3) : (item.net_wt ? parseFloat(item.net_wt).toFixed(3) : '0.000'),
        net_wt: item.net_wt ? parseFloat(item.net_wt).toFixed(3) : '0.000',
        dia_wt: item.dia_wt || '-',
        making: typeof item.making === 'string' && item.making.includes('₹') ? item.making : `₹ ${(parseFloat(item.making) || 0).toLocaleString('en-IN')}`,
        rate: typeof item.rate === 'string' && item.rate.includes('₹') ? item.rate : `₹ ${(parseFloat(item.rate) || 0).toLocaleString('en-IN')}/g`,
        taxable: parseFloat(item.taxable || 0)
      }));
    }

    // Fallback: generate proportional breakdown matching invoice amount
    const amt = parseFloat(inv.amount || 85000);
    const item1Amt = Math.round(amt * 0.62);
    const item2Amt = Math.round(amt - item1Amt);

    const gross1 = ((item1Amt * 0.9) / 6850 + 0.45).toFixed(3);
    const net1 = ((item1Amt * 0.9) / 6850).toFixed(3);
    const gross2 = ((item2Amt * 0.85) / 5600 + 0.35).toFixed(3);
    const net2 = ((item2Amt * 0.85) / 5600).toFixed(3);

    return [
      {
        sno: 1,
        desc: '22KT Hallmarked Gold Diamond Kada Bangle',
        code: 'RJ-BGL-049',
        hsn: '711319',
        purity: '22KT (916)',
        gross_wt: gross1,
        net_wt: net1,
        dia_wt: '0.65 ct',
        making: '₹ 4,500',
        rate: '₹ 6,850/g',
        taxable: item1Amt
      },
      {
        sno: 2,
        desc: '18KT Solitaire Diamond Pendant with Chain',
        code: 'RJ-PND-108',
        hsn: '711319',
        purity: '18KT (750)',
        gross_wt: gross2,
        net_wt: net2,
        dia_wt: '0.40 ct',
        making: '₹ 3,200',
        rate: '₹ 5,600/g',
        taxable: item2Amt
      }
    ];
  };

  return (
    <div className={`w-full pb-14 font-sans antialiased text-gray-800 ${selectedInvoice ? 'print:hidden' : ''}`}>
      
      {/* Top Breadcrumb & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <img src="/logo_emblem.png" alt="Rudra Jewellers" className="w-11 h-11 object-contain drop-shadow-xs" />
          <div>
            <div className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-1 flex items-center gap-1.5">
              <span>ADMINISTRATIVE PORTAL</span>
              <span className="text-gray-300 font-normal">›</span>
              <span className="text-[#a91d22] font-semibold">BILLING OVERVIEW</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Billing Dashboard</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Top Period Filter */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-semibold py-2.5 pl-8 pr-7 rounded-lg shadow-sm focus:outline-none focus:border-[#a91d22] cursor-pointer"
            >
              {periodFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <i className="fa-solid fa-filter text-gray-400 text-xs absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
            <i className="fa-solid fa-chevron-down text-gray-400 text-[10px] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          </div>

          {/* Export Report */}
          <button
            type="button"
            onClick={handleExportReport}
            className="px-4 py-2.5 bg-white border border-[#a91d22] text-[#a91d22] hover:bg-red-50 text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-arrow-up-from-bracket text-xs"></i>
            <span>EXPORT REPORT</span>
          </button>

          {/* Create Invoice */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-[#a91d22] hover:bg-[#8e171b] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            <span>CREATE INVOICE</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Card 1: Invoices Count */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#fee2e2]/70 text-[#dc2626] flex items-center justify-center text-base">
              <i className="fa-regular fa-file-lines"></i>
            </div>
            <span className="text-xs font-medium text-gray-500">Invoices</span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">
              {displayMetrics.invoicesCount}
            </div>
            <div className="flex items-center text-xs font-semibold text-emerald-600 gap-1">
              <i className="fa-solid fa-arrow-trend-up text-[10px]"></i>
              <span>{stats.todayInvoicesGrowth || '+0.0%'}</span>
              <span className="text-gray-400 font-normal ml-0.5">{displayMetrics.subtext}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Billings */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center text-base">
              <i className="fa-regular fa-credit-card"></i>
            </div>
            <span className="text-xs font-medium text-gray-500">Total Billings</span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">
              {displayMetrics.totalBillings}
            </div>
            <div className="flex items-center text-xs font-semibold text-emerald-600 gap-1">
              <i className="fa-solid fa-arrow-trend-up text-[10px]"></i>
              <span>{stats.todayBillingsGrowth || '+0.0%'}</span>
              <span className="text-gray-400 font-normal ml-0.5">{displayMetrics.subtext}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Pending Bills */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#fee2e2]/70 text-[#dc2626] flex items-center justify-center text-base">
              <i className="fa-regular fa-clock"></i>
            </div>
            <span className="text-xs font-medium text-gray-500">Pending Bills</span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">
              {displayMetrics.pendingBills}
            </div>
            <div className="flex items-center text-xs font-semibold text-rose-500 gap-1">
              <i className="fa-solid fa-arrow-trend-down text-[10px]"></i>
              <span>{stats.pendingBillsChange || '+0.0%'}</span>
              <span className="text-gray-400 font-normal ml-0.5">{displayMetrics.subtext}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Collected Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center text-base">
              <i className="fa-solid fa-sack-dollar"></i>
            </div>
            <span className="text-xs font-medium text-gray-500">Collected Revenue</span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">
              {displayMetrics.totalRevenue}
            </div>
            <div className="flex items-center text-xs font-semibold text-emerald-600 gap-1">
              <i className="fa-solid fa-arrow-trend-up text-[10px]"></i>
              <span>{stats.totalRevenueGrowth || '+0.0%'}</span>
              <span className="text-gray-400 font-normal ml-0.5">{displayMetrics.subtext}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 flex-1">
            
            {/* Filter by Existing Client */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                FILTER CLIENT
              </label>
              <div className="relative">
                <select
                  value={clientFilter}
                  onChange={(e) => {
                    setClientFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#a91d22] pl-8 pr-8 cursor-pointer truncate"
                >
                  <option value="all">All Clients ({clientsList.length})</option>
                  {clientsList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name || c.name} ({c.client_code || ('RJ-CL-' + c.id)})
                    </option>
                  ))}
                </select>
                <i className="fa-regular fa-user text-gray-400 text-xs absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                <i className="fa-solid fa-chevron-down text-gray-400 text-[10px] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                DATE RANGE
              </label>
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#a91d22] pl-9 pr-8 cursor-pointer"
                >
                  <option value="30_days">Last 30 Days</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">Full Year</option>
                </select>
                <i className="fa-regular fa-calendar text-gray-400 text-xs absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                <i className="fa-solid fa-chevron-down text-gray-400 text-[10px] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              </div>
            </div>

            {/* Client Tier */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                CLIENT TIER
              </label>
              <div className="relative">
                <select
                  value={tierFilter}
                  onChange={(e) => {
                    setTierFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#a91d22] pr-8 cursor-pointer"
                >
                  <option value="all">All Tiers</option>
                  <option value="elite">Platinum Elite</option>
                  <option value="gold">Gold Member</option>
                  <option value="silver">Silver Member</option>
                </select>
                <i className="fa-solid fa-chevron-down text-gray-400 text-[10px] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              </div>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                PAYMENT STATUS
              </label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#a91d22] pr-8 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="pending_credit">Pending & Credit Bills</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                </select>
                <i className="fa-solid fa-chevron-down text-gray-400 text-[10px] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              </div>
            </div>

            {/* Invoice Type */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                INVOICE TYPE
              </label>
              <div className="relative">
                <select
                  value={invoiceTypeFilter}
                  onChange={(e) => {
                    setInvoiceTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#a91d22] pr-8 cursor-pointer"
                >
                  <option value="b2b_tax">B2B Tax Invoice</option>
                  <option value="retail">Retail Invoice</option>
                  <option value="all">All Types</option>
                </select>
                <i className="fa-solid fa-chevron-down text-gray-400 text-[10px] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 self-end lg:self-auto shrink-0">
            <Link
              to="/clients/create"
              className="px-4 py-2.5 bg-[#a91d22] hover:bg-[#8e171b] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="fa-solid fa-user-plus text-xs"></i>
              <span>+ Register Client</span>
            </Link>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Active Client Filter Banner */}
      {clientFilter !== 'all' && (
        <div className="mb-5 bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              <i className="fa-solid fa-filter"></i>
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950">
                Filtered by Client: {clientsList.find(c => String(c.id) === String(clientFilter))?.full_name || `Client #${clientFilter}`}
              </div>
              <div className="text-[11px] text-amber-700 font-medium flex items-center gap-2">
                <span>Code: {clientsList.find(c => String(c.id) === String(clientFilter))?.client_code || ('RJ-CL-' + clientFilter)}</span>
                <span>•</span>
                <Link
                  to={`/clients/${clientFilter}/price-list`}
                  className="text-[#a91d22] font-semibold hover:underline flex items-center gap-1"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i> View Client Price List
                </Link>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setClientFilter('all');
              setSearchParams({});
            }}
            className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/60 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
          >
            <i className="fa-solid fa-xmark text-xs"></i> Clear Filter
          </button>
        </div>
      )}

      {/* Recent Invoices Table Header Title */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base font-bold text-gray-900 tracking-tight">Recent Invoices</h2>
        <span className="text-xs font-medium text-gray-400">
          Showing {totalItems > 0 ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)}` : '0'} of {totalItems} entries
        </span>
      </div>

      {/* Table Card Container with clean responsive horizontal scroll and generous column spacing */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1060px]">
            <thead>
              <tr className="bg-[#faf6f3] border-t border-b border-[#f4e6e1] text-[10.5px] font-bold uppercase tracking-wider text-[#5c4f4a]">
                <th className="w-[14%] min-w-[130px] pl-5 pr-2 py-3.5 whitespace-nowrap">INVOICE ID</th>
                <th className="w-[26%] min-w-[240px] px-3 py-3.5 whitespace-nowrap">CLIENT DETAILS</th>
                <th className="w-[8%] min-w-[85px] px-2 py-3.5 whitespace-nowrap">DATE</th>
                <th className="w-[10%] min-w-[95px] px-2 py-3.5 whitespace-nowrap">AMOUNT</th>
                <th className="w-[8%] min-w-[80px] px-2 py-3.5 whitespace-nowrap">GST</th>
                <th className="w-[10%] min-w-[95px] px-2 py-3.5 whitespace-nowrap">TOTAL</th>
                <th className="w-[10%] min-w-[105px] px-2 py-3.5 text-center whitespace-nowrap">STATUS</th>
                <th className="w-[14%] min-w-[145px] pl-2 pr-5 py-3.5 text-center whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4e6e1] bg-white">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin text-xl text-[#a91d22] mr-2"></i>
                    Loading invoices...
                  </td>
                </tr>
              ) : paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400">
                    No matching invoices found.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv, idx) => (
                  <tr key={inv.numeric_id || inv.id || idx} className="hover:bg-[#fdfaf7] transition-colors">
                    
                    {/* INVOICE ID (Exact text color #801824 and bold font) */}
                    <td className="pl-5 pr-2 py-3.5 font-bold text-[#801824] text-[12px] whitespace-nowrap tracking-tight font-mono">
                      {inv.invoice_no || inv.id}
                    </td>

                    {/* CLIENT DETAILS (Avatar circle + Name + Tier pill + Code + Email) */}
                    <td className="px-3 py-3.5 overflow-hidden">
                      <div className="flex items-center gap-3 min-w-0">
                        {inv.avatar_url ? (
                          <div className="relative w-9 h-9 shrink-0">
                            <img
                              src={inv.avatar_url}
                              alt={inv.client || inv.client_name}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.classList.remove('hidden');
                                  e.currentTarget.nextElementSibling.classList.add('flex');
                                }
                              }}
                              className="w-9 h-9 rounded-xl object-cover border border-gray-200 shadow-2xs bg-white"
                            />
                            <div className={`w-9 h-9 rounded-xl ${getAvatarBg(inv.tier)} hidden items-center justify-center font-bold text-xs shrink-0 uppercase select-none border border-gray-200/80 shadow-2xs`}>
                              {inv.initials || 'CL'}
                            </div>
                          </div>
                        ) : (
                          <div className={`w-9 h-9 rounded-xl ${getAvatarBg(inv.tier)} flex items-center justify-center font-bold text-xs shrink-0 uppercase select-none border border-gray-200/80 shadow-2xs`}>
                            {inv.initials || 'CL'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#1e242c] text-xs sm:text-[13px] truncate leading-tight">
                              {inv.client || inv.client_name}
                            </span>
                            {getTierBadge(inv.tier)}
                          </div>
                          <div className="text-[10px] text-[#79808a] font-normal mt-0.5 leading-tight flex items-center gap-1.5 truncate">
                            <span className="font-mono text-[9.5px] font-bold text-gray-600 bg-gray-100 px-1 py-0.5 rounded border border-gray-200/60 shrink-0">
                              {inv.client_code || ('RJ-CL-' + (inv.client_id || '1001'))}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="truncate text-gray-500 font-medium" title={inv.email || inv.client_email}>
                              {inv.email || inv.client_email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* DATE (Day on top, Month,Year below) */}
                    <td className="px-2 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-[#2d3748] text-[12px] leading-tight font-mono">
                        {inv.day || '12'}
                      </div>
                      <div className="text-[10.5px] text-[#718096] font-normal leading-tight font-mono">
                        {inv.month_year || 'Sep, 2026'}
                      </div>
                    </td>

                    {/* AMOUNT */}
                    <td className="px-2 py-3.5 font-normal text-[#2d3748] text-[12.5px] whitespace-nowrap font-mono tabular-nums">
                      ₹ {parseFloat(inv.amount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* GST */}
                    <td className="px-2 py-3.5 font-normal text-[#2d3748] text-[12.5px] whitespace-nowrap font-mono tabular-nums">
                      ₹ {parseFloat(inv.gst || 0).toLocaleString('en-IN')}
                    </td>

                    {/* TOTAL (Bold font, #111827) */}
                    <td className="px-2 py-3.5 font-bold text-[#111827] text-[12.5px] whitespace-nowrap font-mono tabular-nums">
                      ₹ {parseFloat(inv.total || 0).toLocaleString('en-IN')}
                    </td>

                    {/* STATUS (Pill with ● bullet, clickable to edit payment) */}
                    <td className="px-2 py-3.5 text-center whitespace-nowrap">
                      {getStatusPill(inv.status, () => handleOpenEditPayment(inv))}
                    </td>

                    {/* ACTIONS (Eye, Pen/Edit Payment, Price List, Print, Maroon Trash) */}
                    <td className="pl-2 pr-5 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2 text-[#4a403c]">
                        {/* 1. View Eye */}
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="hover:text-[#111827] hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="View Tax Invoice"
                        >
                          <i className="fa-regular fa-eye text-[13.5px]"></i>
                        </button>

                        {/* 2. Update Payment & Ledger */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditPayment(inv)}
                          className="hover:text-[#a91d22] hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Update Payment & Status"
                        >
                          <i className="fa-regular fa-pen-to-square text-[13.5px]"></i>
                        </button>

                        {/* 3. View Price List Link */}
                        <Link
                          to={`/clients/${inv.client_id || 1}/price-list`}
                          className="hover:text-[#b01622] hover:bg-amber-50 p-1.5 rounded-lg transition-colors cursor-pointer text-gray-500"
                          title="View Client Price List"
                        >
                          <i className="fa-solid fa-list-check text-[13px]"></i>
                        </Link>

                        {/* 4. Print */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setTimeout(() => window.print(), 300);
                          }}
                          className="hover:text-[#111827] hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Print Tax Invoice PDF"
                        >
                          <i className="fa-solid fa-print text-[13.5px]"></i>
                        </button>

                        {/* 5. Delete (Maroon trash #801824) */}
                        <button
                          type="button"
                          onClick={() => setDeleteTargetInv(inv)}
                          className="text-[#801824] hover:text-[#5a1119] hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Delete Invoice"
                        >
                          <i className="fa-regular fa-trash-can text-[13.5px]"></i>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-[#f4e6e1] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-500 bg-white">
          
          {/* Left: Accurate Showing entries indicator */}
          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-medium">
              Showing <strong className="text-gray-900 font-bold">{totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to <strong className="text-gray-900 font-bold">{Math.min(currentPage * itemsPerPage, totalItems)}</strong> of <strong className="text-gray-900 font-bold">{totalItems}</strong> entries
            </span>
            {totalPages > 1 && (
              <span className="text-gray-400 font-normal">
                (Page {currentPage} of {totalPages})
              </span>
            )}
          </div>

          {/* Center: Dynamic Interactive Page Navigation */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className={`min-w-[28px] h-7 px-2 rounded-lg border flex items-center justify-center gap-1 transition-colors text-xs font-semibold ${
                currentPage === 1
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50/50'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer'
              }`}
            >
              <i className="fa-solid fa-chevron-left text-[9px]"></i>
              <span className="hidden sm:inline">Prev</span>
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNum => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`min-w-[28px] h-7 px-2 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-[#a91d22] text-white shadow-xs'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className={`min-w-[28px] h-7 px-2 rounded-lg border flex items-center justify-center gap-1 transition-colors text-xs font-semibold ${
                currentPage === totalPages || totalPages === 0
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50/50'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer'
              }`}
            >
              <span className="hidden sm:inline">Next</span>
              <i className="fa-solid fa-chevron-right text-[9px]"></i>
            </button>
          </div>

          {/* Right: Items per page selector */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">Rows per page:</span>
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-2.5 py-1 pr-6 text-xs font-bold text-gray-800 hover:border-gray-300 focus:outline-none focus:border-[#a91d22] cursor-pointer shadow-2xs"
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <i className="fa-solid fa-chevron-down text-gray-400 text-[9px] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
            </div>
          </div>

        </div>
      </div>

      {/* CREATE INVOICE MODAL (SCROLLABLE CONTAINER WITH PINNED HEADER & FOOTER) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Pinned Modal Header (Never scrolls away - Close button always accessible!) */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-gray-100 shrink-0 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-[#a91d22] flex items-center justify-center font-bold text-base shadow-2xs">
                  <i className="fa-solid fa-file-invoice"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">Create New Invoice</h3>
                  <p className="text-xs text-gray-400">Generate invoice with automatic client ledger & payment tracking</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center text-lg cursor-pointer transition-colors"
                title="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Form wrapper with scrollable body */}
            <form onSubmit={handleCreateInvoiceSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              
              {/* Scrollable Form Body */}
              <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4 flex-1">
                
                {/* 1. Client Selection Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Select Client (Auto-fill)
                    </label>
                    {formData.client_id && (
                      <button
                        type="button"
                        onClick={() => selectClientForInvoice(null)}
                        className="text-[11px] font-bold text-[#a91d22] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <i className="fa-solid fa-xmark text-[10px]"></i> Clear Selection
                      </button>
                    )}
                  </div>

                  <select
                    value={formData.client_id || ''}
                    onChange={handleClientSelectChange}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#a91d22] bg-white cursor-pointer"
                  >
                    <option value="">-- Choose Existing Client to Auto-Fill (or Type Below) --</option>
                    {clientsList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.full_name || c.name} — {c.client_code || ('RJ-CL-' + c.id)} ({c.membership_tier || c.tier || 'Silver'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status banner when client is selected */}
                {selectedClientObj && (
                  <div className="px-3.5 py-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <i className="fa-solid fa-circle-check text-emerald-600 text-xs"></i>
                      Auto-filled from <strong>{selectedClientObj.full_name || selectedClientObj.name}</strong>. All fields are editable:
                    </span>
                    <Link
                      to={`/clients/${selectedClientObj.id}/price-list`}
                      target="_blank"
                      className="font-bold text-[#a91d22] hover:underline text-[10.5px] shrink-0 ml-2 flex items-center gap-1"
                    >
                      <span>View Price List</span>
                      <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                    </Link>
                  </div>
                )}

                {/* 2. Editable Client Input Boxes (Auto-filled & Customizable) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Client Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.client_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                      placeholder="e.g. Meera Singhania"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#a91d22] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Client Tier</label>
                    <select
                      value={formData.client_tier}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_tier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#a91d22] bg-white cursor-pointer"
                    >
                      <option value="ELITE">ELITE (Platinum)</option>
                      <option value="GOLD">GOLD Member</option>
                      <option value="SILVER">SILVER Member</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Client Code</label>
                    <input
                      type="text"
                      value={formData.client_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_code: e.target.value }))}
                      placeholder="e.g. RJ-CL-1003"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:border-[#a91d22] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Phone</label>
                    <input
                      type="text"
                      value={formData.client_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                      placeholder="e.g. 9845012345"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#a91d22] bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                      placeholder="e.g. client@email.com"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#a91d22] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">GST Number (GSTIN)</label>
                    <input
                      type="text"
                      value={formData.client_gst}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_gst: e.target.value }))}
                      placeholder="e.g. 33AABCS1429B1Z1"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:border-[#a91d22] bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Street Address / City</label>
                  <input
                    type="text"
                    value={formData.client_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_address: e.target.value }))}
                    placeholder="e.g. #42 Cathedral Road, Chennai - 600086"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#a91d22] bg-white"
                  />
                </div>

                {/* 3. INVOICE ITEMS & AMOUNT ENTRY */}
                <div className="bg-gray-50/70 border border-gray-200/90 rounded-2xl p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/80 pb-2.5">
                    <div>
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <i className="fa-solid fa-gem text-[#a91d22]"></i>
                        <span>Jewellery Products & Value Entry</span>
                      </div>
                      <p className="text-[11px] text-gray-500">Choose itemized product entry from catalog or quick lump sum</p>
                    </div>
                    
                    {/* Mode Toggle */}
                    <div className="inline-flex p-0.5 bg-gray-200/80 rounded-xl text-xs font-semibold self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setInvoiceMode('itemized')}
                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          invoiceMode === 'itemized'
                            ? 'bg-white text-[#a91d22] shadow-xs font-bold'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <i className="fa-solid fa-list-check text-[11px]"></i>
                        <span>Itemized Products (Best)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvoiceMode('quick')}
                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          invoiceMode === 'quick'
                            ? 'bg-white text-[#a91d22] shadow-xs font-bold'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <i className="fa-solid fa-bolt text-[11px]"></i>
                        <span>Quick Amount</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode A: Itemized Products Entry */}
                  {invoiceMode === 'itemized' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>Add ornaments/jewellery lines. Values auto-sum to taxable amount:</span>
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="px-2.5 py-1 bg-[#a91d22]/10 hover:bg-[#a91d22]/20 text-[#a91d22] rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <i className="fa-solid fa-plus text-[10px]"></i> Add Item
                        </button>
                      </div>

                      {/* Items Cards */}
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                        {invoiceItems.map((item, idx) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs space-y-2 relative">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                                <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-[10px]">
                                  {item.sno}
                                </span>
                                <span>Item Particulars</span>
                              </span>
                              
                              {invoiceItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-gray-400 hover:text-red-600 text-xs cursor-pointer p-0.5"
                                  title="Remove item"
                                >
                                  <i className="fa-solid fa-trash-can"></i>
                                </button>
                              )}
                            </div>

                            {/* Product selection helper dropdown if catalog products exist */}
                            {availableProducts.length > 0 && (
                              <div>
                                <select
                                  onChange={(e) => handleSelectProductForItem(idx, e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-amber-50/50 border border-amber-200 text-amber-950 rounded-lg text-[11px] focus:outline-none focus:border-[#a91d22] cursor-pointer"
                                  defaultValue=""
                                >
                                  <option value="" disabled>-- Pick from Product Master / Inventory (Auto-fill) --</option>
                                  {availableProducts.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} [{p.product_code || `PRD-${p.id}`}] - Wt: {p.opening_stock_weight || '-'}g
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Custom Description & Code */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Item Description <span className="text-red-500">*</span></label>
                                <input
                                  type="text"
                                  required
                                  value={item.desc}
                                  onChange={(e) => handleItemFieldChange(idx, 'desc', e.target.value)}
                                  placeholder="e.g. 22KT Hallmarked Gold Antique Necklace"
                                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#a91d22] bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Code / HSN</label>
                                <input
                                  type="text"
                                  value={item.code}
                                  onChange={(e) => handleItemFieldChange(idx, 'code', e.target.value)}
                                  placeholder="RJ-NCK-102"
                                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#a91d22] bg-white"
                                />
                              </div>
                            </div>

                            {/* Purity, Weights, Rate, Making & Calculated Taxable */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-gray-100">
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Purity</label>
                                <select
                                  value={item.purity}
                                  onChange={(e) => handleItemFieldChange(idx, 'purity', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white cursor-pointer"
                                >
                                  <option value="22KT (916)">22KT (916)</option>
                                  <option value="18KT (750)">18KT (750)</option>
                                  <option value="24KT (999)">24KT (999)</option>
                                  <option value="14KT (585)">14KT (585)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Net Wt (g) <span className="text-red-500">*</span></label>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  required
                                  value={item.net_wt}
                                  onChange={(e) => handleItemFieldChange(idx, 'net_wt', e.target.value)}
                                  placeholder="14.200"
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-[#a91d22] bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Rate / g (₹)</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.rate}
                                  onChange={(e) => handleItemFieldChange(idx, 'rate', e.target.value)}
                                  placeholder="6850"
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#a91d22] bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Making (₹)</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.making}
                                  onChange={(e) => handleItemFieldChange(idx, 'making', e.target.value)}
                                  placeholder="3500"
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#a91d22] bg-white"
                                />
                              </div>
                              <div className="col-span-2 sm:col-span-1 bg-gray-50 rounded-lg px-2 py-1 flex flex-col justify-center">
                                <span className="text-[9px] uppercase font-bold text-gray-400">Taxable Amt</span>
                                <span className="text-xs font-black text-gray-900 font-mono">
                                  ₹ {parseFloat(item.taxable || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Items Subtotal Footer */}
                      <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900">
                        <span className="flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-check text-emerald-600"></i>
                          <span>Calculated Base Taxable Amount ({invoiceItems.length} items):</span>
                        </span>
                        <span className="font-mono font-black text-sm text-emerald-800">
                          ₹ {(invoiceItems.reduce((acc, i) => acc + (parseFloat(i.taxable) || 0), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Mode B: Quick Lump Sum Input with Quick Product Selection */
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <i className="fa-solid fa-layer-group text-[#a91d22]"></i>
                            <span>Quick Select from Product Master (1-Click Add to Bill)</span>
                          </label>
                          <span className="text-[10px] text-gray-400 font-medium">Click to select / deselect</span>
                        </div>
                        
                        {/* Quick Product Chips Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {availableProducts.map(prod => {
                            const isSelected = quickSelectedProductIds.includes(prod.id);
                            const wt = parseFloat(prod.opening_stock_weight || 10);
                            const rate = parseFloat(prod.opening_stock_rate || 6850);
                            const estValue = Math.round((wt * rate) + 3500);
                            return (
                              <button
                                key={prod.id}
                                type="button"
                                onClick={() => handleToggleQuickProduct(prod)}
                                className={`p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                  isSelected
                                    ? 'bg-red-50/80 border-[#a91d22] text-gray-900 shadow-xs ring-1 ring-[#a91d22]'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                    <i className={`fa-solid ${isSelected ? 'fa-circle-check text-[#a91d22]' : 'fa-gem text-amber-500'} text-[11px]`}></i>
                                    <span className="truncate">{prod.name}</span>
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                    Wt: {wt}g • ₹{rate.toLocaleString('en-IN')}/g
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono text-xs font-black text-gray-900">
                                    ₹{estValue.toLocaleString('en-IN')}
                                  </span>
                                  <div className={`text-[9px] uppercase font-bold mt-0.5 ${isSelected ? 'text-[#a91d22]' : 'text-gray-400'}`}>
                                    {isSelected ? '✓ Added' : '+ Select'}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-700">
                            Total Amount Without GST (₹) <span className="text-red-500">*</span>
                          </label>
                          {quickSelectedProductIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickSelectedProductIds([]);
                                setFormData(f => ({ ...f, amount: '' }));
                              }}
                              className="text-[10px] font-bold text-[#a91d22] hover:underline cursor-pointer"
                            >
                              Clear Selection
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({ ...prev, amount: val }));
                            if (formData.payment_plan === 'full') {
                              const base = parseFloat(val) || 0;
                              const rate = parseFloat(formData.gst_rate) || 5;
                              const newTotal = base * (1 + rate / 100);
                              setAdvancePaid(newTotal > 0 ? newTotal.toFixed(2) : '');
                            }
                          }}
                          placeholder="85000"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold font-mono text-gray-900 focus:outline-none focus:border-[#a91d22] bg-white"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          {quickSelectedProductIds.length > 0
                            ? `Auto-calculated from ${quickSelectedProductIds.length} selected product(s) — feel free to edit!`
                            : 'Direct lump sum base bill value before GST (or click products above)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* GST Rate and Invoice Type Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200/70">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">GST Rate (%)</label>
                      <select
                        value={formData.gst_rate}
                        onChange={(e) => {
                          const rate = Number(e.target.value);
                          setFormData(prev => ({ ...prev, gst_rate: rate }));
                          if (formData.payment_plan === 'full') {
                            const base = parseFloat(formData.amount) || 0;
                            const newTotal = base * (1 + rate / 100);
                            setAdvancePaid(newTotal > 0 ? newTotal.toFixed(2) : '');
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#a91d22] bg-white cursor-pointer"
                      >
                        <option value={3}>3% (Gold & Precious Metals)</option>
                        <option value={5}>5% (Standard Jewellery)</option>
                        <option value={12}>12% (Luxury & Gems)</option>
                        <option value={18}>18% (Labour & Making Charges)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Type</label>
                      <select
                        value={formData.invoice_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#a91d22] bg-white cursor-pointer"
                      >
                        <option value="b2b_tax">B2B Tax Invoice</option>
                        <option value="retail">Retail Invoice</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. CLIENT LEDGER & TOTAL PAYABLE BALANCE OVERVIEW */}
                <div className="bg-gradient-to-br from-[#faf6f3] via-white to-amber-50/40 border border-[#f4e6e1] rounded-2xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5c4f4a] flex items-center gap-1.5">
                      <i className="fa-solid fa-scale-balanced text-[#a91d22]"></i> Client Ledger & Payable Balance
                    </span>
                    {clientPreviousBalance > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        {clientUnpaidInvoicesCount} Previous Unpaid Invoice{clientUnpaidInvoicesCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ No Previous Pending Dues
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {/* Previous Outstanding */}
                    <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
                      <span className="text-gray-500 block text-[10.5px] font-medium">Previous Outstanding Due</span>
                      <span className="font-mono font-bold text-amber-700 text-base block mt-0.5">
                        ₹ {clientPreviousBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">Prior unpaid balance</span>
                    </div>

                    {/* Current Bill */}
                    <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
                      <span className="text-gray-500 block text-[10.5px] font-medium">Current Bill (+GST)</span>
                      <span className="font-mono font-bold text-gray-900 text-base block mt-0.5">
                        ₹ {currentBillTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        Base ₹{currentBaseAmount.toLocaleString('en-IN')} + GST ₹{currentGstAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Total Payable Balance */}
                    <div className="bg-red-50/70 p-3 rounded-xl border border-red-200 shadow-2xs">
                      <span className="text-[#a91d22] block text-[10.5px] font-bold uppercase tracking-wider">
                        Total Payable Balance
                      </span>
                      <span className="font-mono font-extrabold text-[#801824] text-lg block mt-0.5">
                        ₹ {totalPayableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-red-600/80 block mt-0.5 font-medium">
                        Total net liability to date
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. PAYMENT TRACKING & SETTLEMENT ("How they pay or want to pay") */}
                <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-coins text-[#a91d22]"></i> PAYMENT TRACKING & SETTLEMENT TERMS
                    </div>
                    <span className="text-[11px] font-medium text-gray-500">
                      How will the client settle this payment?
                    </span>
                  </div>

                  {/* Payment Choice Selector: Full vs Partial vs Pay Later */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                      Settlement Plan / How They Want to Pay <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {/* 1. Full Payment */}
                      <button
                        type="button"
                        onClick={() => handlePaymentPlanChange('full')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          formData.payment_plan === 'full'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>Full Payment</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Pay complete bill now</p>
                      </button>

                      {/* 2. Partial / Advance */}
                      <button
                        type="button"
                        onClick={() => handlePaymentPlanChange('partial')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          formData.payment_plan === 'partial'
                            ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>Partial / Advance</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Pay token now, rest on credit</p>
                      </button>

                      {/* 3. Pay Later / Credit */}
                      <button
                        type="button"
                        onClick={() => handlePaymentPlanChange('later')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          formData.payment_plan === 'later'
                            ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>Pay Later / Credit</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Zero advance, pay on due date</p>
                      </button>
                    </div>
                  </div>

                  {/* Payment Mode & Amount Paying Now */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Payment Mode */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Remittance Method (How They Pay)
                      </label>
                      <select
                        value={formData.payment_mode}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#a91d22] bg-white cursor-pointer"
                      >
                        <option value="NEFT / RTGS (Bank Transfer)">NEFT / RTGS (Bank Transfer)</option>
                        <option value="HDFC UPI / QR (GPay, PhonePe)">HDFC UPI / QR (GPay, PhonePe)</option>
                        <option value="Cash Settlement">Cash Settlement</option>
                        <option value="Cheque / Demand Draft">Cheque / Demand Draft</option>
                        <option value="POS Debit / Credit Card">POS Debit / Credit Card</option>
                        <option value="Net Banking">Net Banking</option>
                      </select>
                    </div>

                    {/* Amount Paying Now */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-gray-600">
                          Amount Paying Now (₹)
                        </label>
                        {currentBillTotal > 0 && (
                          <div className="flex items-center gap-1 text-[10px]">
                            <button
                              type="button"
                              onClick={() => handleAdvancePaidChange(currentBillTotal.toFixed(2))}
                              className="text-[#a91d22] hover:underline font-bold"
                            >
                              100%
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleAdvancePaidChange((currentBillTotal * 0.5).toFixed(2))}
                              className="text-amber-700 hover:underline font-bold"
                            >
                              50%
                            </button>
                            {clientPreviousBalance > 0 && (
                              <>
                                <span className="text-gray-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => handleAdvancePaidChange(totalPayableBalance.toFixed(2))}
                                  className="text-emerald-700 hover:underline font-bold"
                                  title="Pay total payable balance including previous dues"
                                >
                                  Total Dues
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={advancePaid}
                        onChange={(e) => handleAdvancePaidChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#a91d22] bg-white"
                      />
                    </div>
                  </div>

                  {/* Real-time remaining balance & status calculation */}
                  <div className="bg-white p-3 rounded-xl border border-gray-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Current Bill Balance Remaining:</span>
                      <span className={`font-mono font-bold text-sm ${
                        formData.status === 'paid' ? 'text-emerald-600' : formData.status === 'partial' ? 'text-amber-600' : 'text-[#cf3b3b]'
                      }`}>
                        ₹ {Math.max(0, currentBillTotal - (parseFloat(advancePaid) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {clientPreviousBalance > 0 && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-[11px]">
                        <span className="text-gray-600 font-medium">Overall Client Liability Remaining (incl. past dues):</span>
                        <span className="font-mono font-bold text-gray-900">
                          ₹ {Math.max(0, totalPayableBalance - (parseFloat(advancePaid) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-[11px] text-gray-500">Effective Payment Status:</span>
                      <div>
                        {formData.status === 'paid' && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[#e3f8ec] text-[#22c55e]">
                            ● PAID (Fully Settled)
                          </span>
                        )}
                        {formData.status === 'partial' && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#d97706]">
                            ● PARTIAL (Advance Received)
                          </span>
                        )}
                        {formData.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[#fee2e2] text-[#ef4444]">
                            ● PENDING (Payment Due)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Promised Due Date / Balance Due Tracking (Visible when balance remains) */}
                  {(formData.status !== 'paid' || (currentBillTotal - (parseFloat(advancePaid) || 0) > 0)) && (
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-amber-950">
                          Promised Payment Date / Balance Due Date
                        </label>
                        <div className="flex items-center gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 7);
                              setFormData(prev => ({ ...prev, promised_pay_date: d.toISOString().split('T')[0] }));
                            }}
                            className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-amber-900 font-semibold hover:bg-amber-100/50 cursor-pointer"
                          >
                            +7 Days
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 15);
                              setFormData(prev => ({ ...prev, promised_pay_date: d.toISOString().split('T')[0] }));
                            }}
                            className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-amber-900 font-semibold hover:bg-amber-100/50 cursor-pointer"
                          >
                            +15 Days
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 30);
                              setFormData(prev => ({ ...prev, promised_pay_date: d.toISOString().split('T')[0] }));
                            }}
                            className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-amber-900 font-semibold hover:bg-amber-100/50 cursor-pointer"
                          >
                            +30 Days
                          </button>
                        </div>
                      </div>
                      <input
                        type="date"
                        value={formData.promised_pay_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, promised_pay_date: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs bg-white text-gray-800 font-medium focus:outline-none focus:border-[#a91d22]"
                      />
                      <span className="text-[10px] text-amber-800/80 block">
                        Record when the customer promised to clear the pending balance
                      </span>
                    </div>
                  )}

                  {/* Ref No & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Transaction Ref / Cheque No / UTR
                      </label>
                      <input
                        type="text"
                        value={formData.payment_ref}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_ref: e.target.value }))}
                        placeholder="e.g. UTR-9842104 / Cheque #44210"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#a91d22] bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Remarks / Special Terms
                      </label>
                      <input
                        type="text"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="e.g. Balance on delivery of 22K bangle"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#a91d22] bg-white"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Pinned Modal Footer (Always visible at the bottom!) */}
              <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-gray-100 bg-gray-50/90 shrink-0 flex items-center justify-between z-10">
                <div className="text-xs">
                  <span className="text-gray-500 font-medium">Total Payable: </span>
                  <span className="font-mono font-bold text-gray-900">
                    ₹{totalPayableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {parseFloat(advancePaid) > 0 && (
                    <span className="text-emerald-700 font-medium ml-2 text-[11px]">
                      (Paying: ₹{parseFloat(advancePaid).toLocaleString('en-IN')})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#a91d22] hover:bg-[#8e171b] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {submitting && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                    <span>Generate Invoice</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* UPDATE PAYMENT & LEDGER MODAL */}
      {editPaymentInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[65] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Pinned Header */}
            <div className="px-5 py-4 sm:px-6 border-b border-gray-100 shrink-0 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#b01622] flex items-center justify-center font-bold text-sm">
                  <i className="fa-solid fa-receipt text-base"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    Update Payment & Ledger
                  </h3>
                  <p className="text-xs text-gray-400">
                    Record payment receipt, update pending balance, and sync status
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditPaymentInvoice(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center text-lg cursor-pointer transition-colors"
                title="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdatePaymentSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4 flex-1">
                {/* Invoice Summary Banner */}
                <div className="bg-[#faf6f3] border border-[#f4e6e1] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-mono font-bold text-xs text-[#801824]">
                      {editPaymentInvoice.invoice_no || editPaymentInvoice.id}
                    </div>
                    <div>
                      {getStatusPill(paymentFormData.status)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-700">
                    <span className="font-semibold text-gray-900">{editPaymentInvoice.client || editPaymentInvoice.client_name}</span>
                    <span className="text-gray-500 font-mono">Grand Total: <strong className="text-gray-900">₹{parseFloat(editPaymentInvoice.total || 0).toLocaleString('en-IN')}</strong></span>
                  </div>
                </div>

                {/* Payment Status Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Payment Status <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'paid', label: 'PAID', color: 'border-emerald-500 bg-emerald-50/50 text-emerald-700' },
                      { id: 'partial', label: 'PARTIAL', color: 'border-amber-500 bg-amber-50/50 text-amber-700' },
                      { id: 'pending', label: 'PENDING', color: 'border-rose-500 bg-rose-50/50 text-rose-700' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          const total = parseFloat(editPaymentInvoice.total || 0);
                          let paid = paymentFormData.paid_amount;
                          if (tab.id === 'paid') paid = total;
                          if (tab.id === 'pending') paid = 0;
                          if (tab.id === 'partial' && (!paid || paid === total)) paid = Math.round(total * 0.5);
                          setPaymentFormData(prev => ({ ...prev, status: tab.id, paid_amount: paid }));
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer ${
                          paymentFormData.status === tab.id
                            ? tab.color + ' ring-2 ring-offset-1'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        ● {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Received / Paid */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Amount Received / Paid to Date (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={paymentFormData.paid_amount}
                    onChange={(e) => handlePaidAmountChange(e.target.value, parseFloat(editPaymentInvoice.total || 0))}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 focus:outline-none focus:border-[#a91d22]"
                  />
                </div>

                {/* Real-Time Balance Breakdown */}
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-gray-500">Remaining Pending Due:</span>
                    <div className="font-bold font-mono text-sm text-[#801824]">
                      ₹ {Math.max(0, parseFloat(editPaymentInvoice.total || 0) - (parseFloat(paymentFormData.paid_amount) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500">Settled Ratio:</span>
                    <div className="font-bold text-gray-700">
                      {Math.min(100, Math.round(((parseFloat(paymentFormData.paid_amount) || 0) / (parseFloat(editPaymentInvoice.total || 1))) * 100))}%
                    </div>
                  </div>
                </div>

                {/* Payment Mode & Bank Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Remittance Mode</label>
                    <select
                      value={paymentFormData.payment_mode}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#a91d22] bg-white"
                    >
                      <option value="NEFT / RTGS (HDFC)">NEFT / RTGS (HDFC)</option>
                      <option value="HDFC UPI / QR">HDFC UPI / QR</option>
                      <option value="Cheque / Draft">Cheque / Demand Draft</option>
                      <option value="Cash Settlement">Cash Settlement</option>
                      <option value="Debit / Credit Card">Debit / Credit Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Transaction Ref / UTR</label>
                    <input
                      type="text"
                      value={paymentFormData.ref_no}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, ref_no: e.target.value }))}
                      placeholder="e.g. UTR-9821401928"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#a91d22] bg-white font-mono"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Notes & Remarks</label>
                  <textarea
                    rows="2"
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Part payment received via HDFC mobile app, remaining balance promised on delivery."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#a91d22]"
                  ></textarea>
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-gray-100 bg-gray-50/90 shrink-0 flex items-center justify-between z-10">
                <Link
                  to={`/clients/${editPaymentInvoice.client_id || 7}/price-list`}
                  className="text-xs font-semibold text-gray-600 hover:text-[#a91d22] flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Open Price List
                </Link>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditPaymentInvoice(null)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#a91d22] hover:bg-[#8e171b] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {submitting && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                    <span>Save Payment Status</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* FULL DETAILED TAX INVOICE PRINT SHEET / PDF MODAL (HDFC BANK STYLE PROFESSIONAL TYPOGRAPHY & PRECISE ALIGNMENT) */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] cursor-pointer"
          onClick={() => setSelectedInvoice(null)}
        >
          <style>{`
            @media print {
              .no-print, .print\\:hidden {
                display: none !important;
              }
              html, body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
              }
              #printable-tax-invoice-sheet {
                display: block !important;
                position: static !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 15px !important;
                background: white !important;
                border: none !important;
                box-shadow: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>

          <div
            className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[94vh] flex flex-col cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Top Action Bar */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center font-bold text-sm">
                  <i className="fa-solid fa-file-invoice"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight leading-none">
                    Tax Invoice & Remittance Statement
                  </h3>
                  <span className="text-[11px] text-gray-400 font-medium">
                    Official GST Compliance Document &nbsp;•&nbsp; A4 Standard Format
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => printElement('printable-tax-invoice-sheet', `Tax Invoice #${selectedInvoice?.invoice_no || selectedInvoice?.id}`)}
                  className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-xs tracking-wide"
                >
                  <i className="fa-solid fa-print"></i> PRINT / SAVE PDF
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedInvoice(null);
                  }}
                  className="text-gray-400 hover:text-gray-700 text-lg cursor-pointer p-1"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            {/* Printable Container */}
            <div
              id="printable-tax-invoice-sheet"
              className="relative overflow-y-auto flex-1 p-6 bg-white rounded-xl border border-gray-200 space-y-5 text-xs text-gray-800 print:p-0 print:border-0 print:overflow-visible"
            >
              
              {/* Subtle Watermark (Hidden in print) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] print:hidden select-none z-0 overflow-hidden">
                <div className="text-center font-black text-[#b01622] transform -rotate-12 space-y-2">
                  <div className="text-[150px] font-black tracking-widest leading-none">RJ</div>
                  <div className="text-4xl uppercase tracking-[0.3em] font-black">RUDRA JEWELLERS</div>
                  <div className="text-2xl uppercase tracking-[0.4em] font-bold text-gray-700">CHENNAI</div>
                </div>
              </div>

              {/* Top Header Section */}
              <div className="flex items-start justify-between gap-4 border-b-2 border-gray-200 pb-4 relative z-10">
                {/* Official Rudra Jewellers Brand Logo Image */}
                <div className="flex items-center gap-3 shrink-0">
                  <img
                    src="/logo.png"
                    alt="Rudra Jewellers"
                    className="h-20 w-auto max-w-[210px] object-contain drop-shadow-xs"
                  />
                </div>

                {/* Title Box */}
                <div className="text-center flex-1">
                  <h1 className="text-2xl font-black text-[#b01622] tracking-wider uppercase">TAX INVOICE</h1>
                  <div className="text-[11px] font-semibold text-gray-600 mt-0.5">
                    Original for Recipient &nbsp;|&nbsp; GSTIN: <span className="font-mono font-bold text-gray-900">{companyInfo?.gstin || '33AAACR1234F1Z0'}</span>
                  </div>
                  <div className="w-16 h-0.5 bg-[#b01622] mx-auto mt-2 mb-1"></div>
                  <div className="text-xs font-bold text-[#801824] tracking-tight font-mono">
                    {selectedInvoice.invoice_no || selectedInvoice.id || 'INV- 2026-1254'}
                  </div>
                </div>

                {/* Right Header Meta */}
                <div className="text-right shrink-0">
                  <div className="inline-block mb-1.5">
                    {getStatusPill(selectedInvoice.status)}
                  </div>
                  <div className="text-[11px] font-mono text-gray-600 font-medium">
                    DATE : <span className="font-bold text-gray-900">{selectedInvoice.date || '23 Jul, 2026'}</span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-400">
                    PLACE : CHENNAI (33)
                  </div>
                </div>
              </div>

              {/* Info Cards Grid with Clean Vertically Aligned Colons */}
              <div className="grid grid-cols-2 gap-4 relative z-10">
                
                {/* Buyer / Client Details */}
                <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <div className="text-[10.5px] font-bold text-[#b01622] uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200/80 pb-1.5 mb-2">
                    <i className="fa-regular fa-user text-xs"></i> BILLED TO / BUYER DETAILS
                  </div>

                  <div className="flex items-start leading-relaxed">
                    <span className="w-28 text-gray-500 font-medium shrink-0">Client Name</span>
                    <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                    <span className="font-bold text-gray-900 flex-1 flex items-center gap-1.5 flex-wrap">
                      {selectedInvoice.client || selectedInvoice.client_name}
                      {selectedInvoice.client_company && (
                        <span className="text-gray-500 font-normal text-[11px]">({selectedInvoice.client_company})</span>
                      )}
                      {getTierBadge(selectedInvoice.tier)}
                    </span>
                  </div>

                  <div className="flex items-center leading-relaxed">
                    <span className="w-28 text-gray-500 font-medium shrink-0">Client Code</span>
                    <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                    <span className="font-mono font-bold text-gray-900 flex-1">
                      {selectedInvoice.client_code || ('RJ-CL-' + String(selectedInvoice.client_id || 1001))}
                    </span>
                  </div>

                  <div className="flex items-center leading-relaxed">
                    <span className="w-28 text-gray-500 font-medium shrink-0">Email / Phone</span>
                    <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                    <span className="font-medium text-gray-800 flex-1 truncate">
                      {selectedInvoice.email || selectedInvoice.client_email}
                      {selectedInvoice.client_phone && ` • ${selectedInvoice.client_phone}`}
                    </span>
                  </div>

                  <div className="flex items-start leading-relaxed">
                    <span className="w-28 text-gray-500 font-medium shrink-0">Address</span>
                    <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                    <span className="font-medium text-gray-700 flex-1">
                      {selectedInvoice.client_address || 'Chennai, Tamil Nadu'}
                    </span>
                  </div>

                  <div className="flex items-center leading-relaxed">
                    <span className="w-28 text-gray-500 font-medium shrink-0">Buyer GSTIN</span>
                    <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                    <span className="font-mono font-bold text-gray-800 flex-1">
                      {selectedInvoice.client_gst || 'Unregistered / Consumer'}
                    </span>
                  </div>

                  <div className="flex items-center leading-relaxed">
                    <span className="w-28 text-gray-500 font-medium shrink-0">Place of Supply</span>
                    <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                    <span className="font-bold text-gray-800 flex-1">
                      Tamil Nadu (State Code: 33)
                    </span>
                  </div>
                </div>

                {/* Invoice Particulars */}
                <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <div className="text-[10.5px] font-bold text-[#b01622] uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200/80 pb-1.5 mb-2">
                    <i className="fa-regular fa-file-lines text-xs"></i> INVOICE & PAYMENT PARTICULARS
                  </div>

                  <div className="flex items-center leading-relaxed">
                    <span className="w-28 text-gray-500 font-medium shrink-0">Invoice No</span>
                    <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                    <span className="font-mono font-bold text-[#801824] flex-1">
                      {selectedInvoice.invoice_no || selectedInvoice.id}
                    </span>
                  </div>

                  <div className="flex items-center leading-relaxed">
                    <span className="w-28 text-gray-500 font-medium shrink-0">Invoice Date</span>
                    <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                    <span className="font-bold text-gray-900 flex-1">
                      {selectedInvoice.date || '23 Jul, 2026'}
                    </span>
                  </div>

                  <div className="flex items-center leading-relaxed">
                    <span className="w-28 text-gray-500 font-medium shrink-0">Invoice Type</span>
                    <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                    <span className="font-bold text-gray-800 flex-1">
                      B2B Tax Invoice (Precious Jewellery)
                    </span>
                  </div>

                  <div className="flex items-center leading-relaxed">
                    <span className="w-28 text-gray-500 font-medium shrink-0">Payment Terms</span>
                    <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                    <span className="font-medium text-gray-800 flex-1">
                      COD / 30 Days Credit
                    </span>
                  </div>

                  <div className="flex items-center leading-relaxed">
                    <span className="w-28 text-gray-500 font-medium shrink-0">Reverse Charge</span>
                    <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                    <span className="font-bold text-emerald-700 uppercase flex-1">
                      NO (RCM Not Applicable)
                    </span>
                  </div>
                </div>

              </div>

              {/* Itemized Table Breakdown with Strict Column Alignment */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white relative z-10 shadow-2xs">
                <div className="px-3.5 py-2.5 bg-gray-50/90 border-b border-gray-200 font-bold text-[#b01622] text-xs flex items-center justify-between">
                  <span className="tracking-wide">PARTICULARS OF JEWELLERY & ORNAMENTS</span>
                  <span className="text-[10px] text-gray-500 font-normal">All rates in Indian Rupees (INR)</span>
                </div>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-gray-50/60 text-[9.5px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200">
                      <th className="px-2.5 py-2.5 text-center w-10">S.NO</th>
                      <th className="px-3 py-2.5">DESCRIPTION OF GOODS</th>
                      <th className="px-2.5 py-2.5 text-center w-16">HSN</th>
                      <th className="px-2.5 py-2.5 text-center w-24 whitespace-nowrap">PURITY</th>
                      <th className="px-3 py-2.5 text-right w-24 whitespace-nowrap">GROSS WT</th>
                      <th className="px-3 py-2.5 text-right w-24 whitespace-nowrap">NET WT</th>
                      <th className="px-3 py-2.5 text-right w-24 whitespace-nowrap">RATE / GM</th>
                      <th className="px-3 py-2.5 text-right w-20 whitespace-nowrap">MAKING</th>
                      <th className="px-3.5 py-2.5 text-right w-28 whitespace-nowrap">TAXABLE AMT (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {generateInvoiceItems(selectedInvoice).map((item) => (
                      <tr key={item.sno} className="hover:bg-gray-50/50">
                        <td className="px-2.5 py-2.5 text-center text-gray-500">{item.sno}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-gray-900 leading-tight">{item.desc}</div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">Item Code: {item.code} | Dia: {item.dia_wt}</div>
                        </td>
                        <td className="px-2.5 py-2.5 text-center font-mono text-gray-600">{item.hsn}</td>
                        <td className="px-2.5 py-2.5 text-center font-semibold text-gray-800 whitespace-nowrap">{item.purity}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-gray-700 whitespace-nowrap tabular-nums">{item.gross_wt} g</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900 whitespace-nowrap tabular-nums">{item.net_wt} g</td>
                        <td className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap font-mono tabular-nums">{item.rate}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap font-mono tabular-nums">{item.making}</td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-gray-900 whitespace-nowrap font-mono tabular-nums">
                          ₹ {item.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50/80 font-bold border-t-2 border-gray-200 text-gray-800 text-[10.5px]">
                      <td colSpan="4" className="px-3 py-2 text-right uppercase tracking-wider text-gray-500">
                        Total Weight & Subtotal:
                      </td>
                      <td className="px-3 py-2 text-right font-mono whitespace-nowrap tabular-nums text-gray-700">
                        {(generateInvoiceItems(selectedInvoice).reduce((acc, i) => acc + parseFloat(i.gross_wt), 0)).toFixed(3)} g
                      </td>
                      <td className="px-3 py-2 text-right font-mono whitespace-nowrap tabular-nums text-gray-900 font-black">
                        {(generateInvoiceItems(selectedInvoice).reduce((acc, i) => acc + parseFloat(i.net_wt), 0)).toFixed(3)} g
                      </td>
                      <td colSpan="2" className="text-center text-gray-400 font-normal">-</td>
                      <td className="px-3.5 py-2 text-right font-mono font-black text-gray-900 whitespace-nowrap tabular-nums">
                        ₹ {parseFloat(selectedInvoice.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Financial Computation & Bank Details Section */}
              <div className="grid grid-cols-12 gap-4 items-start relative z-10">
                
                {/* Left: Bank Details & Amount in Words */}
                <div className="col-span-7 space-y-3">
                  {(() => {
                    const activeBank = getStoredDefaultBankAccount();
                    return (
                      <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 text-xs space-y-2 text-gray-700">
                        <div className="font-bold text-[#b01622] uppercase tracking-wider text-[10.5px] border-b border-gray-200/80 pb-1 flex items-center gap-1.5">
                          <i className="fa-solid fa-building-columns"></i> BANK &amp; NEFT/RTGS REMITTANCE DETAILS
                        </div>

                        <div className="flex items-center leading-relaxed">
                          <span className="w-28 text-gray-500 font-medium shrink-0">Bank Name</span>
                          <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                          <span className="font-semibold text-gray-900 flex-1">{activeBank?.bank_name || 'HDFC Bank'}</span>
                        </div>

                        <div className="flex items-center leading-relaxed">
                          <span className="w-28 text-gray-500 font-medium shrink-0">Account Name</span>
                          <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                          <span className="font-semibold text-gray-900 flex-1">{activeBank?.account_name || 'Rudra Jewellers Pvt Ltd'}</span>
                        </div>

                        <div className="flex items-center leading-relaxed">
                          <span className="w-28 text-gray-500 font-medium shrink-0">Account Number</span>
                          <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                          <span className="font-mono font-bold text-gray-900 flex-1 tracking-wider">
                            {activeBank?.account_number || '50200018899221'} <span className="text-gray-500 font-normal text-[11px]">({activeBank?.account_type || 'Current A/C'})</span>
                          </span>
                        </div>

                        <div className="flex items-center leading-relaxed">
                          <span className="w-28 text-gray-500 font-medium shrink-0">IFSC / Branch</span>
                          <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                          <span className="font-mono font-semibold text-gray-800 flex-1">
                            {activeBank?.ifsc_code || 'HDFC0000124'} &nbsp;|&nbsp; {activeBank?.branch || 'Sowcarpet, Chennai'}
                          </span>
                        </div>

                        {activeBank?.upi_id && (
                          <div className="flex items-center leading-relaxed">
                            <span className="w-28 text-gray-500 font-medium shrink-0">UPI ID</span>
                            <span className="text-gray-400 font-bold w-4 shrink-0 text-center">:</span>
                            <span className="font-mono font-semibold text-[#b01622] flex-1">
                              {activeBank.upi_id}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Amount in Words */}
                  <div className="p-3 bg-red-50/30 border border-red-100 rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      TOTAL AMOUNT IN WORDS
                    </div>
                    <div className="font-bold text-[#801824] text-xs mt-0.5 tracking-tight italic">
                      {numberToWordsINR(selectedInvoice.total || 0)}
                    </div>
                  </div>
                </div>

                {/* Right: Calculations & Taxes with Tabular Decimal Alignment */}
                <div className="col-span-5 bg-white border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs shadow-2xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100 text-gray-600">
                    <span className="font-medium">Taxable Subtotal:</span>
                    <span className="font-bold text-gray-900 font-mono tabular-nums text-right text-xs">
                      ₹ {parseFloat(selectedInvoice.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100 text-gray-600">
                    <span className="font-medium">CGST @ {((selectedInvoice.gst_rate || 5) / 2).toFixed(1)}%:</span>
                    <span className="font-semibold text-gray-800 font-mono tabular-nums text-right text-xs">
                      ₹ {(parseFloat(selectedInvoice.gst || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100 text-gray-600">
                    <span className="font-medium">SGST @ {((selectedInvoice.gst_rate || 5) / 2).toFixed(1)}%:</span>
                    <span className="font-semibold text-gray-800 font-mono tabular-nums text-right text-xs">
                      ₹ {(parseFloat(selectedInvoice.gst || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100 text-gray-600">
                    <span className="font-bold text-gray-700">Total GST:</span>
                    <span className="font-bold text-gray-900 font-mono tabular-nums text-right text-xs">
                      ₹ {parseFloat(selectedInvoice.gst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 px-3 bg-[#fcf9f6] border border-[#f5ede4] rounded-xl text-sm font-bold text-gray-900 mt-2">
                    <span className="font-bold tracking-tight">Grand Total Payable:</span>
                    <span className="text-[#801824] font-black text-base font-mono tabular-nums text-right">
                      ₹ {parseFloat(selectedInvoice.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

              </div>

              {/* Terms & Conditions and Official Stamp Section (Bottom Alignment) */}
              <div className="border-t-2 border-gray-200 pt-4 flex items-center justify-between gap-4 text-xs mt-auto relative z-10 avoid-break print-break-inside-avoid">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-[#b01622] flex flex-col items-center justify-center text-[8px] font-bold text-[#b01622] p-1 text-center shrink-0">
                    <div>RUDRA</div>
                    <div className="font-extrabold text-[10px]">RJ</div>
                    <div>CHENNAI</div>
                  </div>
                  <div className="text-[9.5px] text-gray-500 leading-tight space-y-0.5">
                    <div>1. 100% BIS Hallmarked 916 Gold & Certified Diamonds.</div>
                    <div>2. Weight and purity certified as per Bureau of Indian Standards.</div>
                    <div className="italic text-gray-400">Thank you for your valuable patronage with Rudra Jewellers.</div>
                  </div>
                </div>

                <div className="flex items-center gap-8 text-center shrink-0">
                  <div>
                    <div className="w-28 border-b border-gray-300 mb-1"></div>
                    <span className="text-[10px] font-bold text-gray-700 uppercase block">PREPARED BY</span>
                  </div>
                  <div className="text-right space-y-1 shrink-0">
                    <div className="font-serif italic font-bold text-[#b01622] text-lg leading-none">Rudhra</div>
                    <div className="w-36 h-0.5 bg-gray-300 ml-auto"></div>
                    <div className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">AUTHORIZED SIGNATORY</div>
                    <div className="text-[8px] text-gray-400">{companyInfo?.company_name || ''} {companyInfo?.city ? `, ${companyInfo.city}` : ''}</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 print:hidden shrink-0">
              <Link
                to={`/clients/${selectedInvoice.client_id || 7}/price-list`}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <i className="fa-solid fa-arrow-up-right-from-square text-xs text-[#a91d22]"></i>
                <span>Open Client Price List</span>
              </Link>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-[#a91d22] hover:bg-[#8e171b] text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
                >
                  <i className="fa-solid fa-print"></i> Print Invoice
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DELETE INVOICE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetInv}
        title="Delete Billing Invoice?"
        message={
          deleteTargetInv
            ? `Are you sure you want to permanently delete invoice "${deleteTargetInv.invoice_no || deleteTargetInv.id}" for ${deleteTargetInv.client || deleteTargetInv.client_name}? This action cannot be undone.`
            : ''
        }
        confirmText="Delete Invoice"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteInvoice}
        onCancel={() => setDeleteTargetInv(null)}
      />

    </div>
  );
}
