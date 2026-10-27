import React, { useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function PurchaseDetailsModal({ isOpen, onClose, purchase, onDelete, onConvertPaymentMode, onPaymentUpdated }) {
  if (!isOpen || !purchase) return null;

  const { showToast } = useToast();
  const [showPaymentEdit, setShowPaymentEdit] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(purchase.payment_status || 'unpaid');
  const [paidAmountInput, setPaidAmountInput] = useState(String(purchase.paid_amount ?? 0));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const isRaw = purchase.purchase_type === 'raw_material';
  const isFinished = purchase.purchase_type === 'finished_product';
  const metalType = (purchase.metal_type || '').toLowerCase();
  const isDiamond = metalType === 'diamond' || purchase.unit === 'ct' || Boolean(purchase.diamond_weight);
  const isSilver = metalType === 'silver';
  const isGold = !isDiamond && !isSilver && !isFinished;

  const isUnpriced = (parseFloat(purchase.rate) || 0) <= 0;
  const grossWt = parseFloat(purchase.weight || 0);
  const lessWt = parseFloat(purchase.less_weight || 0);
  const netWt = parseFloat(purchase.net_weight || grossWt);
  const fineWt24k = parseFloat(purchase.fine_weight || 0);
  const rate = parseFloat(purchase.rate || 0);
  const totalAmount = parseFloat(purchase.total_amount || 0);
  const paidAmount = parseFloat(purchase.paid_amount || 0);
  const balanceAmount = Math.max(0, totalAmount - paidAmount);
  const effectivePaymentStatus = isUnpriced
    ? (isSilver ? 'Silver Payable' : '24K Gold Payable')
    : (balanceAmount <= 0 && totalAmount > 0) || purchase.payment_status === 'paid'
    ? 'paid'
    : (paidAmount > 0 && balanceAmount > 0) || purchase.payment_status === 'partial'
    ? 'partial'
    : (purchase.payment_status || 'unpaid');
  const itemImg = purchase.image || purchase.product?.image_url || purchase.product?.image;

  const components = Array.isArray(purchase.components)
    ? purchase.components
    : (purchase.product?.attributes?.components || []);

  const totalComponentCarats = components.reduce((sum, c) => sum + (parseFloat(c.weight_carats || c.total_weight || c.gross_wt || c.weight) || 0), 0);
  const totalComponentStones = components.reduce((sum, c) => sum + (parseInt(c.stones_count || c.no_of_pieces || c.stone_count || c.count) || 0), 0);
  const totalComponentValue = components.reduce((sum, c) => sum + (parseFloat(c.row_value || c.value) || 0), 0);

  const categoryTitle = isFinished
    ? 'Finished Jewellery'
    : isDiamond
    ? 'Diamond Purchase'
    : isSilver
    ? 'Silver Purchase'
    : 'Gold Bullion Purchase';

  const handleSavePayment = async (e) => {
    e?.preventDefault?.();
    const parsedPaid = parseFloat(paidAmountInput) || 0;
    if (paymentStatus === 'partial' && parsedPaid <= 0) {
      showToast('Please enter the partial amount paid (must be greater than ₹0).', 'error', 'Validation Error');
      return;
    }
    if (parsedPaid > totalAmount && totalAmount > 0) {
      showToast('Paid amount cannot exceed total bill amount.', 'error', 'Validation Error');
      return;
    }
    try {
      setIsSavingPayment(true);
      const res = await api.patch(`/purchase-entries/${purchase.id}/payment-status`, {
        payment_status: paymentStatus,
        paid_amount: parsedPaid,
        payment_notes: paymentNotes
      });
      if (res.data?.status === 'success' || res.status === 200) {
        showToast(`Payment updated! Paid: ₹${parsedPaid.toLocaleString('en-IN')}`, 'success', 'Payment Recorded');
        purchase.paid_amount = parsedPaid;
        purchase.payment_status = res.data?.data?.payment_status || (parsedPaid >= totalAmount && totalAmount > 0 ? 'paid' : (parsedPaid > 0 ? 'partial' : 'unpaid'));
        setShowPaymentEdit(false);
        if (onPaymentUpdated) onPaymentUpdated(purchase);
        window.dispatchEvent(new CustomEvent('rudhra_purchase_updated'));
      }
    } catch (err) {
      console.error('Failed to update purchase payment:', err);
      showToast(err.response?.data?.message || 'Failed to update payment status', 'error', 'Update Failed');
    } finally {
      setIsSavingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs text-lg ${
              isDiamond
                ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                : isSilver
                ? 'bg-slate-100 text-slate-700 border-slate-300'
                : isFinished
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <i className={`fa-solid ${isDiamond ? 'fa-gem' : isFinished ? 'fa-ring' : 'fa-coins'}`}></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stone-900 font-mono tracking-tight">
                  {purchase.purchase_no}
                </h2>
                <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                  isUnpriced
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : effectivePaymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : effectivePaymentStatus === 'partial'
                    ? 'bg-sky-100 text-sky-800 border-sky-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {effectivePaymentStatus}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isDiamond
                    ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                    : isSilver
                    ? 'bg-slate-100 text-slate-800 border-slate-300'
                    : isFinished
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {categoryTitle}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Supplier: <strong className="text-stone-800">{purchase.supplier?.name || 'N/A'}</strong> &bull; Date: <strong className="text-stone-700">{purchase.purchase_date}</strong>
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

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-stone-700">
          
          {/* STAT CARDS BASED ON CATEGORY */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Card 1: Weight / Carats */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                {isDiamond ? 'Total Carats' : 'Gross Weight'}
              </span>
              <div className="text-base font-extrabold text-stone-900 font-mono">
                {grossWt.toFixed(3)} {purchase.unit || 'g'}
              </div>
              <div className="text-[10.5px] text-stone-500 mt-0.5">
                {isDiamond
                  ? `Stones: ${parseInt(purchase.count_qty || totalComponentStones || 0)} pcs`
                  : `Net: ${netWt.toFixed(3)} ${purchase.unit || 'g'}`}
              </div>
            </div>

            {/* Card 2: Purity / Stamp / Stones */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80 block mb-1">
                {isDiamond ? 'Diamond Stamp' : 'Purity & Grade'}
              </span>
              <div className="text-base font-extrabold text-amber-900 truncate">
                {purchase.stamp || purchase.purity || (isGold ? '22K' : isSilver ? '999' : 'Standard')}
              </div>
              <div className="text-[10.5px] text-amber-700 font-mono mt-0.5">
                {isDiamond
                  ? `${components.length > 0 ? components.length + ' Type Rows' : 'Single Grade'}`
                  : `Touch: ${parseFloat(purchase.touch || 100)}%`}
              </div>
            </div>

            {/* Card 3: 24K Equiv (for Gold) or Total Carat Value (for Diamond) */}
            {isGold ? (
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 block mb-1">
                  24K Pure Gold Equiv
                </span>
                <div className="text-base font-extrabold text-cyan-950 font-mono">
                  {fineWt24k.toFixed(3)} g
                </div>
                <div className="text-[10px] text-cyan-700 font-mono mt-0.5">
                  ({(fineWt24k / 1000).toFixed(4)} KG Pure)
                </div>
              </div>
            ) : isDiamond ? (
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 block mb-1">
                  Purchase Rate
                </span>
                <div className="text-base font-extrabold text-cyan-950 font-mono">
                  {rate > 0 ? `₹${rate.toLocaleString('en-IN')}/ct` : 'Unfixed Rate'}
                </div>
                <div className="text-[10px] text-cyan-700 font-mono mt-0.5">
                  {rate > 0 ? `Total: ₹${totalAmount.toLocaleString('en-IN')}` : 'Payable in Stone Count'}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Purchase Rate
                </span>
                <div className="text-base font-extrabold text-slate-900 font-mono">
                  {rate > 0 ? `₹${rate.toLocaleString('en-IN')}/g` : 'Unfixed Rate'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {isSilver ? 'Silver Bullion' : 'Jewellery'}
                </div>
              </div>
            )}

            {/* Card 4: Outstanding Payable */}
            <div className={`rounded-xl p-3 border ${
              isUnpriced
                ? 'bg-amber-100/70 border-amber-300'
                : balanceAmount > 0
                ? 'bg-rose-50 border-rose-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block mb-1">
                {isUnpriced ? (isSilver ? 'Silver Owed (g)' : 'Gold Owed (24K)') : 'Money Owed (₹)'}
              </span>
              <div className={`text-base font-extrabold font-mono ${
                isUnpriced
                  ? 'text-amber-950'
                  : balanceAmount > 0
                  ? 'text-rose-700'
                  : 'text-emerald-700'
              }`}>
                {isUnpriced
                  ? (isSilver ? `${netWt.toFixed(3)} g` : `${fineWt24k.toFixed(3)} g`)
                  : `₹${balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">
                {isUnpriced ? 'Metal quantity payable' : (balanceAmount > 0 ? 'Cash balance payable' : 'Fully Paid')}
              </div>
            </div>
          </div>

          {/* GOLD CONVERSION FORMULA BANNER (ONLY FOR GOLD) */}
          {isGold && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-calculator text-xs"></i>
              </div>
              <div className="text-xs">
                <span className="font-bold text-amber-950">24K Pure-Gold Conversion Formula: </span>
                <span className="text-amber-900 font-mono">
                  {netWt}g &times; {purchase.purity || '22K'} &divide; 24 = <strong className="text-amber-950 font-bold">{fineWt24k.toFixed(3)}g 24K Pure Gold</strong>
                </span>
                <div className="text-[11px] text-amber-800/80 mt-0.5">
                  Original purchased weight ({grossWt}g) and purity ({purchase.purity || '22K'}) are preserved for inventory tracking &amp; audit history.
                </div>
              </div>
            </div>
          )}

          {/* REPEATABLE DIAMOND ROWS TABLE (WHEN DIAMOND PURCHASE OR FINISHED JEWELLERY HAS COMPONENTS) */}
          {components.length > 0 && (
            <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <i className="fa-solid fa-gem text-cyan-600"></i>
                  Diamond &amp; Gem Components Breakdown ({components.length} Types)
                </h3>
                <span className="text-[11px] text-stone-500 font-mono">
                  Total: <strong className="text-stone-900">{totalComponentCarats.toFixed(3)} ct</strong> &bull; <strong className="text-stone-900">{totalComponentStones} pcs</strong>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-100/60 text-stone-600 text-[10.5px] uppercase font-bold border-b border-stone-200">
                      <th className="py-2 px-3 whitespace-nowrap">S.No</th>
                      <th className="py-2 px-3">Stamp / Sieve</th>
                      <th className="py-2 px-3">Diamond Type</th>
                      <th className="py-2 px-3 text-right">Stones</th>
                      <th className="py-2 px-3 text-right">Carat Wt (ct)</th>
                      <th className="py-2 px-3 text-right">Rate (₹/ct)</th>
                      <th className="py-2 px-3 text-right">Value (₹)</th>
                      <th className="py-2 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {components.map((c, idx) => {
                      const cStamp = c.stamp || c.sieve_size || c.diamond_stamp || '—';
                      const cType = c.diamond_type || c.category_name || 'Round';
                      const cStones = parseInt(c.stones_count || c.no_of_pieces || c.stone_count || 0);
                      const cCts = parseFloat(c.weight_carats || c.total_weight || c.gross_wt || 0);
                      const cRate = parseFloat(c.rate_per_carat || c.rate || 0);
                      const cVal = parseFloat(c.row_value || (cCts > 0 && cRate > 0 ? cCts * cRate : 0));

                      return (
                        <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-2 px-3 text-stone-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-stone-900 font-mono">{cStamp}</td>
                          <td className="py-2 px-3 text-stone-700">{cType}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-stone-800">{cStones}</td>
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-cyan-900">{cCts.toFixed(3)}</td>
                          <td className="py-2 px-3 text-right font-mono text-stone-700">{cRate > 0 ? `₹${cRate.toLocaleString('en-IN')}` : '—'}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">{cVal > 0 ? `₹${cVal.toLocaleString('en-IN')}` : '—'}</td>
                          <td className="py-2 px-3 text-stone-500 italic text-[11px] max-w-xs truncate">{c.notes || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {components.length > 1 && (
                    <tfoot className="bg-stone-50 font-bold border-t border-stone-200 text-stone-900">
                      <tr>
                        <td colSpan="3" className="py-2 px-3 uppercase text-[10.5px]">Total Aggregate</td>
                        <td className="py-2 px-3 text-right font-mono">{totalComponentStones}</td>
                        <td className="py-2 px-3 text-right font-mono text-cyan-950 font-extrabold">{totalComponentCarats.toFixed(3)} ct</td>
                        <td className="py-2 px-3 text-right font-mono">—</td>
                        <td className="py-2 px-3 text-right font-mono font-extrabold">₹{totalComponentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* TWO COLUMN DETAILS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* COLUMN 1: Supplier & Item Info */}
            <div className="space-y-4">
              {/* Supplier Card */}
              <div className="border border-stone-200 rounded-xl p-3.5 bg-white">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-truck-field text-stone-400"></i>
                  Supplier Details
                </h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Supplier Name:</span>
                    <strong className="text-stone-900">{purchase.supplier?.name || 'N/A'}</strong>
                  </div>
                  {purchase.supplier?.company_name && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Firm / Company:</span>
                      <span className="text-stone-800 font-medium">{purchase.supplier.company_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-500">Supplier Code:</span>
                    <span className="font-mono text-stone-800 font-bold">{purchase.supplier?.supplier_code || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Contact Phone:</span>
                    <span className="font-mono text-stone-800">{purchase.supplier?.phone || '—'}</span>
                  </div>
                  {purchase.supplier?.gstin && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">GSTIN:</span>
                      <span className="font-mono text-stone-800 text-[11px]">{purchase.supplier.gstin}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Item & Material Details */}
              <div className="border border-stone-200 rounded-xl p-3.5 bg-white">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-gem text-stone-400"></i>
                  Item &amp; Stock Info
                </h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Item Name:</span>
                    <strong className="text-stone-900">
                      {purchase.product?.name || purchase.raw_material?.name || purchase.item_name || (isRaw ? `${purchase.metal_type?.toUpperCase()} Vault Stock` : 'Jewellery Item')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Metal / Material:</span>
                    <span className="capitalize font-semibold text-stone-800">{purchase.metal_type || 'Gold'}</span>
                  </div>
                  {purchase.design_no && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Design No:</span>
                      <span className="font-mono font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        {purchase.design_no}
                      </span>
                    </div>
                  )}
                  {purchase.product_code && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Product Code / SKU:</span>
                      <span className="font-mono text-stone-800">{purchase.product_code}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-500">Gross Weight:</span>
                    <span className="font-mono font-bold text-stone-800">{grossWt.toFixed(3)} {purchase.unit || 'g'}</span>
                  </div>
                  {lessWt > 0 && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Less Weight (Deduction):</span>
                      <span className="font-mono text-stone-600">{lessWt.toFixed(3)} {purchase.unit || 'g'}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-500">Net Weight:</span>
                    <span className="font-mono font-bold text-emerald-800">{netWt.toFixed(3)} {purchase.unit || 'g'}</span>
                  </div>
                  {parseFloat(purchase.touch || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Touch Purity:</span>
                      <span className="font-mono font-bold text-amber-900">{parseFloat(purchase.touch)}%</span>
                    </div>
                  )}
                  {parseFloat(purchase.wastage_percent || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Wastage (%):</span>
                      <span className="font-mono font-bold text-amber-800">{parseFloat(purchase.wastage_percent)}%</span>
                    </div>
                  )}
                  {Array.isArray(purchase.product?.attributes?.tags) && purchase.product.attributes.tags.length > 0 && (
                    <div className="pt-2 border-t border-stone-100">
                      <span className="text-[11px] font-bold text-stone-600 block mb-1">Generated Inventory Tags:</span>
                      <div className="flex flex-wrap gap-1">
                        {purchase.product.attributes.tags.map((t, tidx) => (
                          <span key={tidx} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200 text-[10px] font-mono font-bold">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 2: Accounting & Payment Info */}
            <div className="space-y-4">
              {/* Financial & Payable Breakdown */}
              <div className="border border-stone-200 rounded-xl p-3.5 bg-white">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-coins text-stone-400"></i>
                  Accounting &amp; Payables
                </h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Accounting Type:</span>
                    <strong className={isUnpriced ? 'text-amber-800' : 'text-stone-900'}>
                      {isUnpriced
                        ? (isSilver ? 'Silver Quantity Payable' : '24K Pure Gold Quantity Payable')
                        : 'Monetary Cash Payable'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Purchase Rate:</span>
                    <span className="font-mono font-bold text-stone-800">
                      {isUnpriced ? '— (Unpriced / Unfixed)' : `₹${rate.toLocaleString('en-IN')}/${purchase.unit || 'g'}`}
                    </span>
                  </div>
                  {parseFloat(purchase.making_charge || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">
                        Making Charges
                        {purchase.making_charge_type === 'per_gram' ? ' (₹/g)' : purchase.making_charge_type === 'per_ct' ? ' (₹/ct)' : ' (Total)'}:
                      </span>
                      <span className="font-mono font-bold text-purple-800">
                        ₹{parseFloat(purchase.making_charge).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {parseFloat(purchase.stone_cost || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Stone Cost:</span>
                      <span className="font-mono font-bold text-stone-800">
                        ₹{parseFloat(purchase.stone_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {parseFloat(purchase.total_tax_amount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">GST Taxes:</span>
                      <span className="font-mono font-bold text-emerald-800">
                        ₹{parseFloat(purchase.total_tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {!isUnpriced && (
                    <>
                      <div className="flex justify-between pt-1 border-t border-stone-100">
                        <span className="text-stone-500">Total Bill Amount:</span>
                        <strong className="font-mono text-stone-900 text-sm">
                          ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Paid Amount:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-stone-100">
                        <span className="text-stone-600 font-bold">Outstanding Money Owed:</span>
                        <span className={`font-mono font-extrabold ${balanceAmount > 0 ? 'text-rose-700 text-sm' : 'text-stone-500'}`}>
                          ₹{balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}
                  {isUnpriced && (
                    <div className="flex justify-between pt-1 border-t border-stone-100">
                      <span className="text-amber-900 font-bold">
                        Outstanding {isSilver ? 'Silver' : '24K Gold'} Owed:
                      </span>
                      <span className="font-mono font-extrabold text-amber-950 text-sm">
                        {isSilver ? `${netWt.toFixed(3)} g` : `${fineWt24k.toFixed(3)} g`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Credit Terms & Notes */}
              <div className="border border-stone-200 rounded-xl p-3.5 bg-white">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar-check text-stone-400"></i>
                    Credit Terms &amp; Settlement Details
                  </h3>
                  {!isUnpriced && totalAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPaymentEdit(!showPaymentEdit);
                        setPaymentStatus(purchase.payment_status || 'unpaid');
                        setPaidAmountInput(String(purchase.paid_amount ?? 0));
                      }}
                      className="text-[11px] font-bold text-[#b01622] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                      {showPaymentEdit ? 'Cancel Edit' : 'Update Payment'}
                    </button>
                  )}
                </div>

                {showPaymentEdit && (
                  <form onSubmit={handleSavePayment} className="mb-3 p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5 animate-fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                        Payment Status
                      </label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => {
                          const st = e.target.value;
                          let amt = paidAmountInput;
                          if (st === 'paid') amt = String(totalAmount.toFixed(2));
                          if (st === 'unpaid') amt = '0';
                          if (st === 'partial' && (parseFloat(amt) >= totalAmount || parseFloat(amt) <= 0)) amt = '';
                          setPaymentStatus(st);
                          setPaidAmountInput(amt);
                        }}
                        className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white text-xs font-semibold focus:outline-hidden focus:border-[#b01622]"
                      >
                        <option value="unpaid">UNPAID (Pending Bill)</option>
                        <option value="partial">PARTIAL (Advance / Part Payment)</option>
                        <option value="paid">PAID (Settled In Full)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                        Paid Amount (₹) {paymentStatus === 'partial' && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={totalAmount > 0 ? totalAmount : undefined}
                        value={paidAmountInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPaidAmountInput(val);
                          const parsed = parseFloat(val) || 0;
                          if (parsed >= totalAmount && totalAmount > 0) setPaymentStatus('paid');
                          else if (parsed > 0) setPaymentStatus('partial');
                          else setPaymentStatus('unpaid');
                        }}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg font-mono text-xs font-bold text-emerald-800 bg-white focus:outline-hidden focus:border-[#b01622]"
                      />
                      {totalAmount > 0 && (
                        <div className="flex justify-between text-[11px] mt-1 font-mono">
                          <span className="text-stone-500">Remaining Due:</span>
                          <span className={`font-bold ${Math.max(0, totalAmount - (parseFloat(paidAmountInput) || 0)) > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                            ₹{Math.max(0, totalAmount - (parseFloat(paidAmountInput) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Payment reference (Cash / Cheque / Bank Txn)"
                        className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs bg-white focus:outline-hidden focus:border-[#b01622]"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowPaymentEdit(false)}
                        className="px-2.5 py-1 text-xs border border-stone-300 text-stone-600 rounded-lg hover:bg-stone-100 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingPayment}
                        className="px-3 py-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {isSavingPayment ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                        <span>Save Payment</span>
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Payment Status:</span>
                    <span className="font-bold capitalize text-stone-800">{effectivePaymentStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Paid Amount:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ₹{Number(purchase.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {Number(purchase.total_amount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Remaining Balance Due:</span>
                      <span className={`font-mono font-bold ${Math.max(0, Number(purchase.total_amount || 0) - Number(purchase.paid_amount || 0)) > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                        ₹{Math.max(0, Number(purchase.total_amount || 0) - Number(purchase.paid_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-500">Credit Days:</span>
                    <span className="font-mono text-stone-800">{purchase.credit_days ? `${purchase.credit_days} days` : 'Immediate'}</span>
                  </div>
                  {purchase.due_date && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Payment Due Date:</span>
                      <span className="font-mono text-rose-700 font-bold">{purchase.due_date}</span>
                    </div>
                  )}
                  {purchase.notes && (
                    <div className="mt-2 pt-2 border-t border-stone-100">
                      <span className="text-stone-500 block mb-0.5">Notes:</span>
                      <p className="text-stone-700 italic bg-stone-50 p-2 rounded-lg border border-stone-100">
                        {purchase.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Item Photo if available */}
              {itemImg && (
                <div className="border border-stone-200 rounded-xl p-3.5 bg-white">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
                    <i className="fa-solid fa-camera text-stone-400"></i>
                    Attached Item Photo
                  </h3>
                  <img
                    src={itemImg}
                    alt={purchase.purchase_no}
                    className="w-full h-36 object-contain rounded-lg border border-stone-100 bg-stone-50"
                  />
                </div>
              )}
            </div>

          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-stone-200 bg-stone-50/80 flex items-center justify-between">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(purchase.id, purchase.purchase_no);
                }}
                className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <i className="fa-regular fa-trash-can"></i>
                <span>Delete Entry</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isUnpriced && totalAmount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowPaymentEdit(!showPaymentEdit);
                  setPaymentStatus(purchase.payment_status || 'unpaid');
                  setPaidAmountInput(String(purchase.paid_amount ?? 0));
                }}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <i className="fa-solid fa-credit-card text-xs"></i>
                <span>{showPaymentEdit ? 'Cancel Payment' : 'Update Payment'}</span>
              </button>
            )}
            {onConvertPaymentMode && isGold && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onConvertPaymentMode(purchase);
                }}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <i className="fa-solid fa-scale-balanced text-xs"></i>
                <span>{isUnpriced ? 'Fix Rate / Convert to Money' : 'Convert to Gold Due'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
