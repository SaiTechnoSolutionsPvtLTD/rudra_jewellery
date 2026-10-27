import React, { useState, useEffect } from 'react';
import api, { sanitizeErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function ConvertPurchasePaymentModeModal({ isOpen, onClose, purchase, onSuccess }) {
  const { showToast } = useToast();

  const [targetMode, setTargetMode] = useState('monetary'); // 'monetary' | 'gold'
  const [rate, setRate] = useState('');
  const [calcBasis, setCalcBasis] = useState('net_weight'); // 'net_weight' | 'fine_weight'
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (purchase && isOpen) {
      const isCurrentlyUnpriced = (parseFloat(purchase.rate) || 0) <= 0;
      const initialMode = isCurrentlyUnpriced ? 'monetary' : 'gold';
      setTargetMode(initialMode);

      const netWt = parseFloat(purchase.net_weight || purchase.weight || 0);
      const fineWt = parseFloat(purchase.fine_weight || purchase.fine_weight_24k || 0);
      const existingRate = parseFloat(purchase.rate) || '';

      setRate(existingRate ? String(existingRate) : '');
      setCalcBasis('net_weight');

      const initialTotal = existingRate && netWt ? String(Math.round(netWt * existingRate)) : '';
      setTotalAmount(initialTotal);
      setPaidAmount(String(parseFloat(purchase.paid_amount || 0)));
      setPaymentStatus(purchase.payment_status || 'unpaid');
      setNotes('');
    }
  }, [purchase, isOpen]);

  if (!isOpen || !purchase) return null;

  const grossWt = parseFloat(purchase.weight || 0);
  const netWt = parseFloat(purchase.net_weight || grossWt);
  const fineWt24k = parseFloat(purchase.fine_weight || purchase.fine_weight_24k || 0);
  const currentlyUnpriced = (parseFloat(purchase.rate) || 0) <= 0;

  // Auto-calculate total bill amount when rate or basis changes
  const handleRateChange = (newRate) => {
    setRate(newRate);
    const r = parseFloat(newRate) || 0;
    const basisWt = calcBasis === 'fine_weight' ? fineWt24k : netWt;
    if (r > 0 && basisWt > 0) {
      const calcTot = Math.round(basisWt * r);
      setTotalAmount(String(calcTot));
      const paid = parseFloat(paidAmount) || 0;
      setPaymentStatus(paid >= calcTot && calcTot > 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid'));
    }
  };

  const handleBasisChange = (newBasis) => {
    setCalcBasis(newBasis);
    const r = parseFloat(rate) || 0;
    const basisWt = newBasis === 'fine_weight' ? fineWt24k : netWt;
    if (r > 0 && basisWt > 0) {
      const calcTot = Math.round(basisWt * r);
      setTotalAmount(String(calcTot));
      const paid = parseFloat(paidAmount) || 0;
      setPaymentStatus(paid >= calcTot && calcTot > 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid'));
    }
  };

  const handlePaidAmountChange = (newPaid) => {
    setPaidAmount(newPaid);
    const p = parseFloat(newPaid) || 0;
    const tot = parseFloat(totalAmount) || 0;
    if (p >= tot && tot > 0) setPaymentStatus('paid');
    else if (p > 0) setPaymentStatus('partial');
    else setPaymentStatus('unpaid');
  };

  const remainingCashDue = Math.max(0, (parseFloat(totalAmount) || 0) - (parseFloat(paidAmount) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (targetMode === 'monetary') {
      const r = parseFloat(rate);
      if (!r || r <= 0) {
        showToast('Please enter a valid rate per gram.', 'error');
        return;
      }
      const tot = parseFloat(totalAmount);
      if (!tot || tot <= 0) {
        showToast('Total amount must be greater than zero.', 'error');
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        target_mode: targetMode,
        rate: targetMode === 'monetary' ? parseFloat(rate) : 0,
        calculation_basis: calcBasis,
        total_amount: targetMode === 'monetary' ? parseFloat(totalAmount) : 0,
        paid_amount: targetMode === 'monetary' ? parseFloat(paidAmount || 0) : 0,
        payment_status: targetMode === 'monetary' ? paymentStatus : 'gold_payable',
        notes: notes,
      };

      const res = await api.post(`/purchase-entries/${purchase.id}/convert-payment-mode`, payload);
      showToast(res.data?.message || 'Payment mode successfully converted!', 'success');

      if (onSuccess) {
        onSuccess(res.data?.purchase, res.data?.supplier);
      }
      onClose();
    } catch (err) {
      console.error('Failed to convert payment mode:', err);
      showToast(sanitizeErrorMessage(err, 'Failed to update payment mode.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-stone-200 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center text-lg">
              <i className="fa-solid fa-scale-balanced"></i>
            </div>
            <div>
              <h3 className="font-bold text-base font-serif">
                Change Purchase Payment Mode / Fix Rate
              </h3>
              <p className="text-xs text-stone-300 font-mono">
                {purchase.purchase_no} — {purchase.supplier_name || purchase.supplier?.name || 'Supplier'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* PURCHASE STATS MINI BAR */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase block">Purchased Net Wt</span>
            <span className="font-extrabold font-mono text-stone-900">{netWt.toFixed(3)}g ({purchase.purity})</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase block">24K Pure Equiv</span>
            <span className="font-extrabold font-mono text-amber-800">{fineWt24k.toFixed(3)}g 24K</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase block">Current Mode</span>
            <span className={`inline-block font-bold text-[11px] ${currentlyUnpriced ? 'text-amber-800' : 'text-emerald-700'}`}>
              {currentlyUnpriced ? 'Gold Due (Unpriced)' : `Money Due (₹${purchase.rate}/g)`}
            </span>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* TARGET MODE SELECTION */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Select New Payment / Accounting Mode <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTargetMode('monetary')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  targetMode === 'monetary'
                    ? 'border-[#b01622] bg-red-50/60 ring-1 ring-[#b01622]'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  targetMode === 'monetary' ? 'bg-[#b01622] text-white' : 'bg-stone-100 text-stone-500'
                }`}>
                  <i className="fa-solid fa-indian-rupee-sign text-sm"></i>
                </div>
                <div>
                  <span className="font-bold text-stone-900 block">Money Giving</span>
                  <span className="text-[10.5px] text-stone-500 block">Fix rate and record cash liability to supplier</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetMode('gold')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  targetMode === 'gold'
                    ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  targetMode === 'gold' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-500'
                }`}>
                  <i className="fa-solid fa-coins text-sm"></i>
                </div>
                <div>
                  <span className="font-bold text-stone-900 block">Gold Giving</span>
                  <span className="text-[10.5px] text-stone-500 block">Unfixed rate; record 24K pure gold weight due</span>
                </div>
              </button>
            </div>
          </div>

          {targetMode === 'monetary' && (
            <div className="space-y-3.5 bg-stone-50/70 p-4 rounded-xl border border-stone-200 animate-fade-in">
              
              <div className="grid grid-cols-2 gap-3">
                {/* Rate per gram */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Gold Rate / Gram (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={rate}
                    onChange={(e) => handleRateChange(e.target.value)}
                    placeholder="e.g. 7250"
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-sm font-bold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                {/* Calculation basis */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Calculate Rate On
                  </label>
                  <select
                    value={calcBasis}
                    onChange={(e) => handleBasisChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="net_weight">Net Weight ({netWt.toFixed(3)}g)</option>
                    <option value="fine_weight">24K Pure Weight ({fineWt24k.toFixed(3)}g)</option>
                  </select>
                </div>
              </div>

              {/* Total bill & paid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Total Bill Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-sm font-extrabold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Paid Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={paidAmount}
                    onChange={(e) => handlePaidAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-sm font-bold text-emerald-700 focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </div>

              {/* Outstanding Cash Due Card */}
              <div className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Remaining Cash Balance Due</span>
                  <span className="text-xs text-stone-400">Will be debited to supplier ledger</span>
                </div>
                <div className={`text-base font-extrabold font-mono ${remainingCashDue > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  ₹{remainingCashDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Payment status */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-[#b01622]"
                >
                  <option value="unpaid">UNPAID (Pending Full Cash Settlement)</option>
                  <option value="partial">PARTIAL (Advance / Part Payment Recorded)</option>
                  <option value="paid">PAID (Settled In Full)</option>
                </select>
              </div>

            </div>
          )}

          {targetMode === 'gold' && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-stone-700 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <i className="fa-solid fa-circle-info text-amber-600"></i>
                <span>Switching to Pure Gold Balance Due</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-amber-900/90">
                This will clear any monetary rate and record an outstanding payable of <strong>{fineWt24k.toFixed(3)}g of 24K pure gold</strong> against {purchase.supplier_name || 'the supplier'}.
                Any previous cash liability from this bill will be reversed, and the 24K pure gold quantity will display in Supplier Ledger and Reports.
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">
              Remarks / Rate Fixing Reference (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Market rate confirmed via call at 11:30 AM"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-2 border-t border-stone-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl font-bold hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white rounded-xl font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin text-xs"></i>
                  <span>Updating Mode...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check text-xs"></i>
                  <span>Confirm Mode Change</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
