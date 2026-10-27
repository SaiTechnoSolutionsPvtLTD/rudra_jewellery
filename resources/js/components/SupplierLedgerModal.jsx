import React, { useState, useEffect } from 'react';
import api, { sanitizeErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import PurchaseDetailsModal from './PurchaseDetailsModal';
import ConvertPurchasePaymentModeModal from './ConvertPurchasePaymentModeModal';
import AdjustSupplierBalanceModal from './AdjustSupplierBalanceModal';

export default function SupplierLedgerModal({ isOpen, onClose, supplierId, onUpdate }) {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('purchases'); // 'purchases', 'settlements', 'settle_action', 'profile'
  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState(null);

  const [purchaseCategoryFilter, setPurchaseCategoryFilter] = useState('all');
  const [purchaseModeFilter, setPurchaseModeFilter] = useState('all');
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('');

  // Settlement Form State
  const [settleType, setSettleType] = useState('cash'); // 'cash' | 'gold' | 'silver'
  const [silverWeight, setSilverWeight] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [goldWeight, setGoldWeight] = useState('');
  const [goldPurity, setGoldPurity] = useState('24K');
  const [goldTouch, setGoldTouch] = useState('100');
  const [paymentMode, setPaymentMode] = useState('bank_transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [deductVault, setDeductVault] = useState(true);
  const [applyToCash, setApplyToCash] = useState(false);
  const [goldRateForCash, setGoldRateForCash] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Convert mode modal & Adjust balance modal state
  const [viewPurchase, setViewPurchase] = useState(null);
  const [convertPurchase, setConvertPurchase] = useState(null);
  const [showAdjustBalanceModal, setShowAdjustBalanceModal] = useState(false);

  const fetchLedger = async () => {
    if (!supplierId) return;
    try {
      setLoading(true);
      const res = await api.get(`/suppliers/${supplierId}/ledger`);
      setLedgerData(res.data);
    } catch (err) {
      console.error('Failed to fetch supplier ledger:', err);
      showToast(sanitizeErrorMessage(err, 'Failed to load supplier ledger data.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && supplierId) {
      setActiveTab('purchases');
      setCashAmount('');
      setSelectedPurchaseId('');
      setGoldWeight('');
      setGoldPurity('24K');
      setGoldTouch('100');
      setPaymentMode('bank_transfer');
      setReferenceNo('');
      setSettlementDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setDeductVault(true);
      setApplyToCash(false);
      setGoldRateForCash('');
      fetchLedger();
    }
  }, [isOpen, supplierId]);

  if (!isOpen) return null;

  const supplier = ledgerData?.supplier || {};
  const outstanding = ledgerData?.outstanding || {};
  const summary = ledgerData?.summary || {};
  const purchases = ledgerData?.purchases || [];
  const settlements = ledgerData?.settlements || [];

  const filteredPurchases = purchases.filter(p => {
    const mat = (p.metal_type || '').toLowerCase();
    const type = (p.purchase_type || '').toLowerCase();
    const isDia = mat === 'diamond' || p.unit === 'ct' || Boolean(p.diamond_weight);
    const isSil = mat === 'silver';
    const isFin = type === 'finished_product';
    const isGld = !isDia && !isSil && !isFin;

    if (purchaseCategoryFilter === 'gold' && !isGld) return false;
    if (purchaseCategoryFilter === 'silver' && !isSil) return false;
    if (purchaseCategoryFilter === 'diamond' && !isDia) return false;
    if (purchaseCategoryFilter === 'finished' && !isFin) return false;

    if (purchaseModeFilter === 'monetary' && p.is_unpriced) return false;
    if (purchaseModeFilter === 'metal' && !p.is_unpriced) return false;

    if (purchaseSearchTerm) {
      const q = purchaseSearchTerm.toLowerCase();
      const matchNo = (p.purchase_no || '').toLowerCase().includes(q);
      const matchItem = (p.item_name || '').toLowerCase().includes(q);
      const matchStamp = (p.stamp || '').toLowerCase().includes(q);
      if (!matchNo && !matchItem && !matchStamp) return false;
    }

    return true;
  });

  // Purity preset change for gold settlement
  const handlePurityChange = (preset) => {
    setGoldPurity(preset);
    if (preset === '24K') setGoldTouch('100');
    else if (preset === '22K') setGoldTouch('91.6');
    else if (preset === '18K') setGoldTouch('75.0');
    else if (preset === '14K') setGoldTouch('58.5');
  };

  // 24K equivalent weight preview for gold settlement
  const gw = parseFloat(goldWeight) || 0;
  let fineWtPreview = 0;
  if (goldPurity === '24K' || parseFloat(goldTouch) >= 99.5) {
    fineWtPreview = gw * (24 / 24);
  } else if (goldPurity === '22K' || Math.abs(parseFloat(goldTouch) - 91.6) < 0.2) {
    fineWtPreview = gw * (22 / 24);
  } else if (goldPurity === '18K' || Math.abs(parseFloat(goldTouch) - 75.0) < 0.1) {
    fineWtPreview = gw * (18 / 24);
  } else if (goldPurity === '14K' || Math.abs(parseFloat(goldTouch) - 58.5) < 0.3) {
    fineWtPreview = gw * (14 / 24);
  } else {
    fineWtPreview = gw * ((parseFloat(goldTouch) || 100) / 100);
  }

  // Handle Settlement Submit
  const handleSettlementSubmit = async (e) => {
    e.preventDefault();

    if (settleType === 'cash') {
      const amt = parseFloat(cashAmount);
      if (!amt || amt <= 0) {
        showToast('Please enter a valid cash payment amount greater than zero.', 'error');
        return;
      }
    } else if (settleType === 'silver') {
      const wt = parseFloat(silverWeight);
      if (!wt || wt <= 0) {
        showToast('Please enter a valid silver weight greater than zero.', 'error');
        return;
      }
    } else {
      const wt = parseFloat(goldWeight);
      if (!wt || wt <= 0) {
        showToast('Please enter a valid gold weight greater than zero.', 'error');
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        settlement_type: settleType,
        settlement_date: settlementDate,
        payment_mode: paymentMode,
        reference_no: referenceNo,
        notes: notes,
      };

      if (settleType === 'cash') {
        payload.amount = parseFloat(cashAmount);
        if (selectedPurchaseId) {
          payload.purchase_entry_id = selectedPurchaseId;
        }
      } else if (settleType === 'silver') {
        payload.weight = parseFloat(silverWeight);
        payload.purity = '999';
        payload.fine_weight = parseFloat(silverWeight);
        payload.deduct_vault_inventory = deductVault;
      } else {
        payload.weight = parseFloat(goldWeight);
        payload.purity = goldPurity;
        payload.touch = parseFloat(goldTouch) || 100;
        payload.fine_weight = parseFloat(fineWtPreview.toFixed(3));
        payload.deduct_vault_inventory = deductVault;
        payload.apply_to_cash = applyToCash;
        payload.rate_per_gram = applyToCash ? parseFloat(goldRateForCash) || 0 : 0;
        if (applyToCash && selectedPurchaseId) {
          payload.purchase_entry_id = selectedPurchaseId;
        }
      }

      const res = await api.post(`/suppliers/${supplierId}/settle`, payload);
      showToast(res.data?.message || 'Settlement recorded successfully!', 'success');

      // Reset form
      setCashAmount('');
      setGoldWeight('');
      setSilverWeight('');
      setReferenceNo('');
      setNotes('');

      // Refresh ledger & parent
      await fetchLedger();
      setActiveTab('settlements');
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Settlement error:', err);
      showToast(sanitizeErrorMessage(err, 'Failed to record settlement.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-6xl xl:max-w-7xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#b01622] to-[#7f0f18] text-white flex items-center justify-center shadow-sm text-lg font-bold">
              <i className="fa-solid fa-building-columns"></i>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-stone-900 font-serif">
                  {supplier.name || 'Supplier Ledger'}
                </h2>
                {supplier.supplier_code && (
                  <span className="font-mono text-xs font-bold text-[#b01622] bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                    {supplier.supplier_code}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  supplier.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'
                }`}>
                  {supplier.status === 'active' ? 'Active Vendor' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {supplier.company_name ? `${supplier.company_name} • ` : ''}
                Phone: {supplier.phone || 'N/A'} {supplier.gstin ? `• GSTIN: ${supplier.gstin}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* HERO CARDS: SEPARATE MONETARY & 24K PURE GOLD PAYABLES / ADVANCES */}
        <div className="p-6 bg-stone-100/60 border-b border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* CARD 1: MONEY STATUS (OWED OR ADVANCE HELD BY SUPPLIER) */}
          <div className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
            (outstanding.money || 0) > 0
              ? 'bg-rose-50/80 border-rose-200 shadow-2xs'
              : (outstanding.advance_money || 0) > 0
              ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs'
              : 'bg-white border-stone-200'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
              (outstanding.money || 0) > 0
                ? 'bg-rose-100 text-rose-700'
                : (outstanding.advance_money || 0) > 0
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-stone-50 text-stone-500 border border-stone-200'
            }`}>
              <i className="fa-solid fa-indian-rupee-sign"></i>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-stone-500 block">
                {(outstanding.money || 0) > 0
                  ? 'Remaining Money Owed (Cash Payable)'
                  : (outstanding.advance_money || 0) > 0
                  ? 'Extra Money in Supplier\'s Hand (Advance)'
                  : 'Monetary Balance Due'}
              </span>
              <div className={`text-2xl font-extrabold font-mono tracking-tight ${
                (outstanding.money || 0) > 0
                  ? 'text-rose-700'
                  : (outstanding.advance_money || 0) > 0
                  ? 'text-emerald-700'
                  : 'text-stone-700'
              }`}>
                {(outstanding.money || 0) > 0
                  ? outstanding.money_formatted
                  : (outstanding.advance_money || 0) > 0
                  ? `${outstanding.advance_money_formatted} (Adv)`
                  : '₹0.00'}
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {(outstanding.money || 0) > 0
                  ? 'Outstanding monetary balance we owe to supplier'
                  : (outstanding.advance_money || 0) > 0
                  ? 'Supplier holds extra money/advance payment from us'
                  : 'All monetary bills fully paid and settled'}
              </p>
            </div>
          </div>

          {/* CARD 2: 24K PURE GOLD STATUS (OWED OR ADVANCE WITH SUPPLIER) */}
          <div className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
            (outstanding.gold_24k_grams || 0) > 0
              ? 'bg-amber-50/90 border-amber-300 shadow-2xs'
              : (outstanding.advance_gold_24k || 0) > 0
              ? 'bg-cyan-50/90 border-cyan-300 shadow-2xs'
              : 'bg-white border-stone-200'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
              (outstanding.gold_24k_grams || 0) > 0
                ? 'bg-amber-200/80 text-amber-900 border border-amber-300'
                : (outstanding.advance_gold_24k || 0) > 0
                ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                : 'bg-stone-50 text-stone-500 border border-stone-200'
            }`}>
              <i className="fa-solid fa-coins"></i>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-900/80 block">
                {(outstanding.gold_24k_grams || 0) > 0
                  ? 'Remaining Gold Owed (24K Pure Weight)'
                  : (outstanding.advance_gold_24k || 0) > 0
                  ? 'Extra 24K Gold with Supplier (Advance)'
                  : '24K Pure Gold Balance'}
              </span>
              <div className={`text-2xl font-extrabold font-mono tracking-tight ${
                (outstanding.gold_24k_grams || 0) > 0
                  ? 'text-amber-950'
                  : (outstanding.advance_gold_24k || 0) > 0
                  ? 'text-cyan-800'
                  : 'text-stone-700'
              }`}>
                {(outstanding.gold_24k_grams || 0) > 0
                  ? outstanding.gold_24k_grams_formatted
                  : (outstanding.advance_gold_24k || 0) > 0
                  ? `${outstanding.advance_gold_24k_formatted} (Adv)`
                  : '0.000 g'}
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {(outstanding.gold_24k_grams || 0) > 0
                  ? 'Pure 24K gold weight we owe to supplier'
                  : (outstanding.advance_gold_24k || 0) > 0
                  ? 'Supplier holds extra pure gold deposit/advance from us'
                  : 'All gold quantities fully returned and settled'}
              </p>
            </div>
          </div>

        </div>

        {/* NAVIGATION TABS STRIP */}
        <div className="px-6 border-b border-stone-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'purchases'
                  ? 'border-[#b01622] text-[#b01622]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <i className="fa-solid fa-list-check"></i>
              <span>Purchase History ({purchases.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settlements')}
              className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'settlements'
                  ? 'border-[#b01622] text-[#b01622]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <i className="fa-solid fa-receipt"></i>
              <span>Settlements &amp; Payments ({settlements.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settle_action')}
              className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'settle_action'
                  ? 'border-[#b01622] text-[#b01622]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <i className="fa-solid fa-money-bill-transfer"></i>
              <span>Record Settlement</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'profile'
                  ? 'border-[#b01622] text-[#b01622]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <i className="fa-solid fa-id-card"></i>
              <span>Supplier Profile &amp; Bank</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdjustBalanceModal(true)}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg border border-stone-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Edit / Reconcile Supplier Balances & Advances"
            >
              <i className="fa-solid fa-pen-to-square text-[#b01622]"></i>
              <span>Edit Balances</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settle_action')}
              className="px-3.5 py-1.5 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[10px]"></i>
              <span>Pay / Settle</span>
            </button>
          </div>
        </div>

        {/* MODAL TAB CONTENT */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-stone-400">
              <i className="fa-solid fa-spinner animate-spin text-2xl text-[#b01622] mb-2"></i>
              <p className="text-xs font-semibold">Loading supplier ledger details...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: PURCHASE HISTORY */}
              {activeTab === 'purchases' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        All Inward Purchases from {supplier.name}
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Click on any row to open full purchase details, or use "Fix Rate" to convert unpriced gold to money payable.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Category Filter */}
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs">
                        <span className="text-stone-400 font-bold uppercase text-[10px]">Type:</span>
                        <select
                          value={purchaseCategoryFilter}
                          onChange={(e) => setPurchaseCategoryFilter(e.target.value)}
                          className="bg-transparent font-bold text-stone-800 outline-none cursor-pointer"
                        >
                          <option value="all">All Categories</option>
                          <option value="gold">Gold Purchases</option>
                          <option value="silver">Silver Purchases</option>
                          <option value="diamond">Diamond Purchases</option>
                          <option value="finished">Finished Jewellery</option>
                        </select>
                      </div>

                      {/* Settlement Mode Filter */}
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs">
                        <span className="text-stone-400 font-bold uppercase text-[10px]">Mode:</span>
                        <select
                          value={purchaseModeFilter}
                          onChange={(e) => setPurchaseModeFilter(e.target.value)}
                          className="bg-transparent font-bold text-stone-800 outline-none cursor-pointer"
                        >
                          <option value="all">All Settlements</option>
                          <option value="monetary">Cash / Money Payable</option>
                          <option value="metal">Metal Quantity Payable</option>
                        </select>
                      </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[200px]">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-stone-400 text-xs"></i>
                      <input
                        type="text"
                        placeholder="Search purchase #, item, stamp..."
                        value={purchaseSearchTerm}
                        onChange={(e) => setPurchaseSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg outline-none focus:border-[#b01622]"
                      />
                    </div>
                  </div>

                  <div className="border border-stone-200 rounded-xl overflow-x-auto shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                      <thead className="bg-stone-100/80 border-b border-stone-200 text-[10.5px] font-bold uppercase tracking-wider text-stone-600">
                        <tr>
                          <th className="py-3 px-3 text-center w-12 whitespace-nowrap">S.No</th>
                          <th className="py-3 px-3 whitespace-nowrap">Ref &amp; Date</th>
                          <th className="py-3 px-3">Item / Stock</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">Purchased Wt &amp; Purity</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">24K Pure Equiv</th>
                          <th className="py-3 px-3 text-right whitespace-nowrap">Rate &amp; Mode</th>
                          <th className="py-3 px-3 text-right whitespace-nowrap">Bill / Paid</th>
                          <th className="py-3 px-3 text-right whitespace-nowrap">Outstanding Balance</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium">
                        {filteredPurchases.length === 0 ? (
                          <tr>
                            <td colSpan="10" className="py-10 text-center text-stone-400">
                              No purchase records match the selected filters.
                            </td>
                          </tr>
                        ) : (
                          filteredPurchases.map((p, idx) => {
                            const isUnfixed = p.is_unpriced;
                            const isDia = (p.metal_type || '').toLowerCase() === 'diamond' || p.unit === 'ct';
                            const isSil = (p.metal_type || '').toLowerCase() === 'silver';
                            const hasComponents = Array.isArray(p.components) && p.components.length > 0;
                            const totalAmt = Number(p.total_amount || 0);
                            const paidAmt = Number(p.paid_amount || 0);
                            const balAmt = Number(p.balance_amount ?? Math.max(0, totalAmt - paidAmt));

                            const effectiveStatus = isUnfixed
                              ? (isSil ? 'Silver Payable' : isDia ? 'Diamond Payable' : 'Gold Payable')
                              : (balAmt <= 0 && totalAmt > 0) || p.payment_status === 'paid'
                              ? 'paid'
                              : (paidAmt > 0 && balAmt > 0) || p.payment_status === 'partial'
                              ? 'partial'
                              : (p.payment_status || 'unpaid');

                            return (
                              <tr
                                key={p.id}
                                onClick={() => setViewPurchase(p)}
                                className="hover:bg-amber-50/50 cursor-pointer transition-colors group"
                              >
                                <td className="py-3 px-3 text-center font-mono text-stone-500 whitespace-nowrap">{idx + 1}</td>
                                <td className="py-3 px-3 font-mono whitespace-nowrap">
                                  <div className="font-bold text-[#b01622] group-hover:underline">{p.purchase_no}</div>
                                  <div className="text-[10px] text-stone-400 font-sans">{p.purchase_date}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-bold text-stone-800">{p.item_name}</div>
                                  <div className="text-[10.5px] text-stone-500 capitalize">{p.purchase_type?.replace('_', ' ')}</div>
                                  {hasComponents && (
                                    <div className="text-[10px] text-cyan-800 font-bold mt-0.5">
                                      <i className="fa-solid fa-layer-group text-[9px] mr-1"></i>
                                      {p.components.length} Diamond &amp; Stone Parcel Rows
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <div className="font-bold text-amber-800 font-mono">
                                    {p.weight} {p.unit || (isDia ? 'ct' : 'g')}
                                  </div>
                                  <div className="text-[10px] text-stone-500">
                                    {isDia ? `${p.count_qty || 0} pcs (${p.stamp || 'Parcel'})` : `${p.purity || 'Standard'} (${p.touch || 100}%)`}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center font-mono whitespace-nowrap">
                                  {isDia ? (
                                    <div className="font-extrabold text-cyan-900 bg-cyan-50/70 px-2 py-0.5 rounded border border-cyan-100 inline-block text-[11px]">
                                      {p.count_qty || 0} pcs &bull; {p.weight} ct
                                    </div>
                                  ) : isSil ? (
                                    <div className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block text-[11px]">
                                      {p.net_weight || p.weight} g Silver
                                    </div>
                                  ) : (
                                    <div className="font-extrabold text-cyan-900 bg-cyan-50/70 px-2 py-0.5 rounded border border-cyan-100 inline-block">
                                      {p.fine_weight} g
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                                  {isUnfixed ? (
                                    <span className="text-amber-800 font-bold italic bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px] whitespace-nowrap">
                                      {isSil ? 'Silver Due' : isDia ? 'Stones Due' : 'Gold Due'}
                                    </span>
                                  ) : (
                                    <div>
                                      <span className="font-bold text-stone-800">₹{p.rate}/{p.unit || 'g'}</span>
                                      <span className="text-[10px] text-stone-400 block">Money Due</span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                                  {isUnfixed ? (
                                    <span className="text-stone-400 italic">—</span>
                                  ) : (
                                    <>
                                      <div className="font-bold text-stone-900">₹{Number(p.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                      <div className="text-[10px] text-emerald-700">Paid: ₹{Number(p.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                    </>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                                  {isUnfixed ? (
                                    <div className="font-extrabold text-amber-900 whitespace-nowrap">
                                      {isSil ? `${p.net_weight || p.weight} g Silver` : isDia ? `${p.weight} ct Dia` : `${p.fine_weight} g 24K Gold`}
                                    </div>
                                  ) : (
                                    <div className={`font-extrabold whitespace-nowrap ${balAmt > 0 ? 'text-rose-700' : 'text-stone-400'}`}>
                                      ₹{balAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <span className={`inline-flex items-center justify-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                    isUnfixed
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : effectiveStatus === 'paid'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : effectiveStatus === 'partial'
                                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    {effectiveStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                    {isUnfixed ? (
                                      <button
                                        type="button"
                                        onClick={() => setConvertPurchase(p)}
                                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10.5px] inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                        title="Fix Gold Rate & Convert to Money Giving"
                                      >
                                        <i className="fa-solid fa-scale-balanced text-[10px]"></i>
                                        <span>Fix Rate</span>
                                      </button>
                                    ) : (
                                      balAmt > 0 && !isDia && !isSil && (
                                        <button
                                          type="button"
                                          onClick={() => setConvertPurchase(p)}
                                          className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-[10.5px] border border-stone-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
                                          title="Convert to Gold Payable"
                                        >
                                          <i className="fa-solid fa-coins text-[10px] text-amber-600"></i>
                                          <span>To Gold</span>
                                        </button>
                                      )
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => setViewPurchase(p)}
                                      className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded transition-colors cursor-pointer"
                                      title="View Details"
                                    >
                                      <i className="fa-regular fa-eye text-xs"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* FINAL SUPPLIER SETTLEMENT & BALANCE SUMMARY BOX */}
                  <div className="bg-gradient-to-r from-stone-50 via-stone-100/70 to-stone-50 border-2 border-stone-200 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#b01622] animate-pulse"></span>
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-['Inter',sans-serif]">
                          Final Supplier Settlement &amp; Balance Summary ({supplier.name})
                        </h4>
                      </div>
                      <span className="text-[11px] text-stone-500 font-medium">Reconciled in Real-Time</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* 1. HOW MUCH 24K GOLD WE WANT TO GIVE */}
                      <div className={`p-3.5 rounded-xl border ${
                        (outstanding.gold_24k_grams || 0) > 0 ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300' : 'bg-white border-stone-200'
                      }`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block mb-0.5">
                          1. 24K Pure Gold We Want To Give
                        </span>
                        <div className="text-xl font-extrabold font-mono text-amber-950">
                          {outstanding.gold_24k_grams_formatted || '0.000 g'}
                        </div>
                        <span className="text-[10.5px] text-stone-500 block mt-0.5">
                          {(outstanding.gold_24k_grams || 0) > 0 ? 'Pure gold payable to supplier' : 'No gold owed'}
                        </span>
                      </div>

                      {/* 2. HOW MUCH MONEY WE WANT TO GIVE */}
                      <div className={`p-3.5 rounded-xl border ${
                        (outstanding.money || 0) > 0 ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-300' : 'bg-white border-stone-200'
                      }`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 block mb-0.5">
                          2. Money We Want To Give (Payable)
                        </span>
                        <div className="text-xl font-extrabold font-mono text-rose-700">
                          {outstanding.money_formatted || '₹0.00'}
                        </div>
                        <span className="text-[10.5px] text-stone-500 block mt-0.5">
                          {(outstanding.money || 0) > 0 ? 'Cash balance owed for priced gold' : 'No cash owed'}
                        </span>
                      </div>

                      {/* 3. EXTRA MONEY IN SUPPLIER'S HAND */}
                      <div className={`p-3.5 rounded-xl border ${
                        (outstanding.advance_money || 0) > 0 ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' : 'bg-white border-stone-200'
                      }`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block mb-0.5">
                          3. Extra Money In Supplier's Hand
                        </span>
                        <div className={`text-xl font-extrabold font-mono ${(outstanding.advance_money || 0) > 0 ? 'text-emerald-700' : 'text-stone-400'}`}>
                          {outstanding.advance_money_formatted || '₹0.00'}
                        </div>
                        <span className="text-[10.5px] text-stone-500 block mt-0.5">
                          {(outstanding.advance_money || 0) > 0 ? 'Advance cash held by supplier' : 'No advance cash'}
                        </span>
                      </div>

                      {/* 4. EXTRA GOLD IN SUPPLIER'S HAND */}
                      <div className={`p-3.5 rounded-xl border ${
                        (outstanding.advance_gold_24k || 0) > 0 ? 'bg-cyan-50 border-cyan-300 ring-1 ring-cyan-400' : 'bg-white border-stone-200'
                      }`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-900 block mb-0.5">
                          4. Extra Gold In Supplier's Hand
                        </span>
                        <div className={`text-xl font-extrabold font-mono ${(outstanding.advance_gold_24k || 0) > 0 ? 'text-cyan-800' : 'text-stone-400'}`}>
                          {outstanding.advance_gold_24k_formatted || '0.000 g'}
                        </div>
                        <span className="text-[10.5px] text-stone-500 block mt-0.5">
                          {(outstanding.advance_gold_24k || 0) > 0 ? 'Advance pure metal held by supplier' : 'No advance gold'}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: SETTLEMENTS & PAYMENTS HISTORY */}
              {activeTab === 'settlements' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        Settlement &amp; Payment Audit Records
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Track cash bank disbursements and physical pure-metal returns executed for this supplier.
                      </p>
                    </div>
                  </div>

                  <div className="border border-stone-200 rounded-xl overflow-x-auto shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                      <thead className="bg-stone-100/80 border-b border-stone-200 text-[10.5px] font-bold uppercase tracking-wider text-stone-600">
                        <tr>
                          <th className="py-3 px-3 text-center w-12">S.No</th>
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Settlement Type</th>
                          <th className="py-3 px-3 text-right">Settled Value</th>
                          <th className="py-3 px-3">Mode &amp; Ref No</th>
                          <th className="py-3 px-3">Linked Purchase</th>
                          <th className="py-3 px-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium">
                        {settlements.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-10 text-center text-stone-400">
                              No settlement or payment records recorded yet.
                            </td>
                          </tr>
                        ) : (
                          settlements.map((s, idx) => (
                            <tr key={s.id} className="hover:bg-stone-50/60 transition-colors">
                              <td className="py-3 px-3 text-center font-mono text-stone-500">{idx + 1}</td>
                              <td className="py-3 px-3 font-mono text-stone-700 font-semibold">{s.settlement_date}</td>
                              <td className="py-3 px-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border uppercase ${
                                  s.settlement_type === 'cash'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                }`}>
                                  <i className={s.settlement_type === 'cash' ? 'fa-solid fa-money-bill' : 'fa-solid fa-coins'}></i>
                                  {s.settlement_type === 'cash' ? 'Cash Payment (₹)' : 'Pure Gold Settlement (g)'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right font-mono">
                                {s.settlement_type === 'cash' ? (
                                  <div className="font-extrabold text-emerald-700 text-sm">
                                    ₹{Number(s.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </div>
                                ) : (
                                  <div>
                                    <span className="font-extrabold text-amber-950 text-sm">{s.fine_weight} g</span>{' '}
                                    <span className="text-[10px] text-amber-800 font-bold">(24K Pure)</span>
                                    <div className="text-[10px] text-stone-400 font-sans">Gross: {s.weight}g ({s.purity || '24K'})</div>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-stone-800 capitalize">{s.payment_mode?.replace('_', ' ') || 'Cash'}</div>
                                {s.reference_no && (
                                  <div className="font-mono text-[10px] text-stone-500">Ref: {s.reference_no}</div>
                                )}
                              </td>
                              <td className="py-3 px-3 font-mono">
                                {s.purchase_entry ? (
                                  <span className="text-[#b01622] font-bold">{s.purchase_entry.purchase_no}</span>
                                ) : (
                                  <span className="text-stone-400 italic">General Settlement</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-stone-600 text-[11px] max-w-xs truncate">
                                {s.notes || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: RECORD SETTLEMENT / PAYMENT ACTION */}
              {activeTab === 'settle_action' && (
                <div className="max-w-2xl mx-auto bg-stone-50 border border-stone-200 rounded-2xl p-6 shadow-xs">
                  <div className="mb-5 text-center">
                    <h3 className="text-base font-bold text-stone-900">
                      Record Supplier Settlement / Payment
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">
                      Settle monetary bills or return 24K pure gold to reduce outstanding payables accurately.
                    </p>
                  </div>

                  {/* Toggle settlement type */}
                  <div className="grid grid-cols-3 gap-2 mb-6 bg-stone-200/60 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSettleType('cash')}
                      className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        settleType === 'cash'
                          ? 'bg-white text-emerald-800 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <i className="fa-solid fa-indian-rupee-sign text-xs"></i>
                      <span>Pay Money (₹)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettleType('gold')}
                      className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        settleType === 'gold'
                          ? 'bg-white text-amber-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <i className="fa-solid fa-coins text-xs"></i>
                      <span>Settle Gold (24K)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettleType('silver')}
                      className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        settleType === 'silver'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <i className="fa-solid fa-ring text-xs"></i>
                      <span>Settle Silver (g)</span>
                    </button>
                  </div>

                  <form onSubmit={handleSettlementSubmit} className="space-y-4">
                    
                    {/* CASH PAYMENT FORM */}
                    {settleType === 'cash' && (
                      <>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex justify-between items-center">
                          <span>Current Money Owed:</span>
                          <strong className="font-mono text-sm">{outstanding.money_formatted || '₹0.00'}</strong>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Payment Amount (₹) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                            placeholder="Enter payment amount in ₹"
                            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-bold font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Link to Specific Purchase Entry <span className="text-stone-400 font-normal">(Optional)</span>
                          </label>
                          <select
                            value={selectedPurchaseId}
                            onChange={(e) => setSelectedPurchaseId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-800"
                          >
                            <option value="">General payment (Auto-allocates to oldest unpaid purchases)</option>
                            {purchases.filter(p => !p.is_unpriced && p.balance_amount > 0).map(p => (
                              <option key={p.id} value={p.id}>
                                {p.purchase_no} — Bill: ₹{p.total_amount} (Remaining: ₹{p.balance_amount})
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {/* GOLD METAL SETTLEMENT FORM */}
                    {settleType === 'gold' && (
                      <>
                        <div className="bg-amber-100/70 border border-amber-300 rounded-xl p-3 text-xs text-amber-950 flex justify-between items-center">
                          <span>Current 24K Pure Gold Owed:</span>
                          <strong className="font-mono text-sm">{outstanding.gold_24k_grams_formatted || '0.000 g'}</strong>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1">
                              Physical Weight Returned (g) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              required
                              value={goldWeight}
                              onChange={(e) => setGoldWeight(e.target.value)}
                              placeholder="0.000"
                              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-bold font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1">
                              Purity / Karat
                            </label>
                            <select
                              value={goldPurity}
                              onChange={(e) => handlePurityChange(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800"
                            >
                              <option value="24K">24K Pure Gold (100% Touch)</option>
                              <option value="22K">22K Gold (91.6% Touch)</option>
                              <option value="18K">18K Gold (75.0% Touch)</option>
                              <option value="14K">14K Gold (58.5% Touch)</option>
                            </select>
                          </div>
                        </div>

                        {/* 24K Conversion Preview Banner */}
                        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-center justify-between">
                          <span className="text-xs text-cyan-900 font-medium">
                            24K Pure Gold Equivalent Settled:
                          </span>
                          <span className="text-sm font-extrabold font-mono text-cyan-950">
                            {fineWtPreview.toFixed(3)} g pure gold
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="deductVaultCheck"
                            checked={deductVault}
                            onChange={(e) => setDeductVault(e.target.checked)}
                            className="rounded text-[#b01622] focus:ring-[#b01622] cursor-pointer"
                          />
                          <label htmlFor="deductVaultCheck" className="text-xs text-stone-700 font-medium cursor-pointer">
                            Debit this pure gold quantity from Raw Material Vault Stock
                          </label>
                        </div>

                        {/* CROSS-SETTLEMENT: APPLY GOLD TOWARDS CASH BALANCE */}
                        <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="applyToCashCheck"
                              checked={applyToCash}
                              onChange={(e) => setApplyToCash(e.target.checked)}
                              className="rounded text-[#b01622] focus:ring-[#b01622] cursor-pointer"
                            />
                            <label htmlFor="applyToCashCheck" className="text-xs font-bold text-amber-950 cursor-pointer">
                              Apply this Gold to extinguish Money Due (Cash Debt)
                            </label>
                          </div>

                          {applyToCash && (
                            <div className="space-y-2 pt-1 border-t border-amber-200">
                              <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                                    Agreed Gold Rate / Gram (₹) <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    min="1"
                                    required={applyToCash}
                                    value={goldRateForCash}
                                    onChange={(e) => setGoldRateForCash(e.target.value)}
                                    placeholder="e.g. 8000"
                                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[#b01622]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                                    Link to Purchase Bill (Optional)
                                  </label>
                                  <select
                                    value={selectedPurchaseId}
                                    onChange={(e) => setSelectedPurchaseId(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs"
                                  >
                                    <option value="">Auto-allocate to oldest unpaid cash bills</option>
                                    {purchases.filter(p => !p.is_unpriced && p.balance_amount > 0).map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.purchase_no} (Rem: ₹{p.balance_amount})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="bg-white p-2.5 rounded-lg border border-amber-200 flex justify-between items-center text-xs">
                                <span className="text-stone-600 font-medium">Cash Debt Extinguished:</span>
                                <span className="font-extrabold font-mono text-emerald-700 text-sm">
                                  ₹{((fineWtPreview || 0) * (parseFloat(goldRateForCash) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {/* SILVER METAL SETTLEMENT FORM */}
                    {settleType === 'silver' && (
                      <>
                        <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 flex justify-between items-center">
                          <span>Current Silver Owed:</span>
                          <strong className="font-mono text-sm">
                            {Math.abs(parseFloat(supplier.silver_balance_grams) || 0).toFixed(3)} g
                          </strong>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Physical Silver Weight Delivered (g) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            required
                            value={silverWeight}
                            onChange={(e) => setSilverWeight(e.target.value)}
                            placeholder="e.g. 500.000"
                            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-bold font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                          />
                        </div>

                        <div className="p-3 bg-stone-100 rounded-xl border border-stone-200">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={deductVault}
                              onChange={(e) => setDeductVault(e.target.checked)}
                              className="w-4 h-4 rounded text-[#b01622] accent-[#b01622]"
                            />
                            <span className="text-xs font-bold text-stone-800">
                              Deduct physical silver from Vault Raw Material Stock
                            </span>
                          </label>
                        </div>
                      </>
                    )}

                    {/* COMMON SETTLEMENT FIELDS */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Payment / Settlement Mode
                        </label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 font-medium"
                        >
                          {settleType === 'cash' ? (
                            <>
                              <option value="bank_transfer">Bank Transfer (NEFT / RTGS)</option>
                              <option value="cash">Cash Payment</option>
                              <option value="upi">UPI / Net Banking</option>
                              <option value="cheque">Cheque</option>
                            </>
                          ) : (
                            <>
                              <option value="physical_metal">Physical Bullion Bar</option>
                              <option value="coins">Gold Coins</option>
                              <option value="vault_transfer">Vault Stock Transfer</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Settlement Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={settlementDate}
                          onChange={(e) => setSettlementDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Reference / Voucher No <span className="text-stone-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        placeholder="e.g. UTR-982319, Cheque #01923"
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Notes / Remarks <span className="text-stone-400 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        rows="2"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Partial settlement for Diwali stock deliveries..."
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 resize-none"
                      ></textarea>
                    </div>

                    <div className="pt-3">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 bg-[#b01622] hover:bg-[#8e111a] text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin"></i>
                            <span>Recording Settlement...</span>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-check"></i>
                            <span>Record Settlement &amp; Update Ledger</span>
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                </div>
              )}

              {/* TAB 4: SUPPLIER PROFILE & BANK */}
              {activeTab === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* General Profile */}
                  <div className="border border-stone-200 rounded-xl p-4 bg-white space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
                      <i className="fa-solid fa-address-card text-stone-400"></i>
                      Firm &amp; Contact Information
                    </h4>
                    <div className="flex justify-between text-xs py-1 border-b border-stone-100">
                      <span className="text-stone-500">Supplier Name:</span>
                      <strong className="text-stone-900">{supplier.name}</strong>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-stone-100">
                      <span className="text-stone-500">Company / Trade Name:</span>
                      <span className="text-stone-800 font-medium">{supplier.company_name || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-stone-100">
                      <span className="text-stone-500">Supplier Code:</span>
                      <span className="font-mono font-bold text-[#b01622]">{supplier.supplier_code}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-stone-100">
                      <span className="text-stone-500">Supplier Category:</span>
                      <span className="capitalize text-stone-800">{supplier.supplier_type?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-stone-100">
                      <span className="text-stone-500">Phone:</span>
                      <span className="font-mono text-stone-800">{supplier.phone || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-stone-100">
                      <span className="text-stone-500">Email:</span>
                      <span className="font-mono text-stone-800">{supplier.email || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-stone-500">City / State:</span>
                      <span className="text-stone-800">{supplier.city ? `${supplier.city}, ${supplier.state || ''}` : '—'}</span>
                    </div>
                  </div>

                  {/* Tax & Banking Profile */}
                  <div className="border border-stone-200 rounded-xl p-4 bg-white space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
                      <i className="fa-solid fa-landmark text-stone-400"></i>
                      GSTIN &amp; Bank Account
                    </h4>
                    <div className="flex justify-between text-xs py-1 border-b border-stone-100">
                      <span className="text-stone-500">GSTIN:</span>
                      <span className="font-mono font-bold text-stone-900">{supplier.gstin || 'Unregistered'}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-stone-100">
                      <span className="text-stone-500">PAN Number:</span>
                      <span className="font-mono text-stone-800">{supplier.pan_number || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-stone-100">
                      <span className="text-stone-500">Bank Name:</span>
                      <span className="text-stone-800 font-medium">{supplier.bank_name || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-stone-100">
                      <span className="text-stone-500">Account Number:</span>
                      <span className="font-mono font-bold text-stone-900">{supplier.account_number || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-stone-100">
                      <span className="text-stone-500">IFSC Code:</span>
                      <span className="font-mono font-bold text-stone-800">{supplier.ifsc_code || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-stone-500">Branch:</span>
                      <span className="text-stone-800">{supplier.branch || '—'}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-stone-200 bg-stone-50/80 flex items-center justify-between">
          <div className="text-xs text-stone-500">
            Accounting Unit Separation: Monetary payables (₹) and 24K pure-gold payables (g) tracked distinctly.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Close Ledger
          </button>
        </div>

      </div>

      {/* Drill-down Purchase Details Modal */}
      {viewPurchase && (
        <PurchaseDetailsModal
          isOpen={!!viewPurchase}
          onClose={() => setViewPurchase(null)}
          purchase={viewPurchase}
          onConvertPaymentMode={(p) => setConvertPurchase(p)}
        />
      )}

      {/* Convert Purchase Payment Mode Modal */}
      {convertPurchase && (
        <ConvertPurchasePaymentModeModal
          isOpen={!!convertPurchase}
          onClose={() => setConvertPurchase(null)}
          purchase={convertPurchase}
          onSuccess={async () => {
            await fetchLedger();
            if (onUpdate) onUpdate();
          }}
        />
      )}

      {/* Adjust Supplier Balance Modal */}
      {showAdjustBalanceModal && (
        <AdjustSupplierBalanceModal
          isOpen={showAdjustBalanceModal}
          onClose={() => setShowAdjustBalanceModal(false)}
          supplier={supplier}
          onSuccess={async () => {
            await fetchLedger();
            if (onUpdate) onUpdate();
          }}
        />
      )}
    </div>
  );
}
