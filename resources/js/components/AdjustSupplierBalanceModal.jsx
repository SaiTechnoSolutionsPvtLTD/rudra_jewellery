import React, { useState, useEffect } from 'react';
import api, { sanitizeErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function AdjustSupplierBalanceModal({ isOpen, onClose, supplier, onSuccess }) {
  const { showToast } = useToast();

  // Cash direction: 'owe' (-ve) | 'advance' (+ve) | 'cleared' (0)
  const [cashDirection, setCashDirection] = useState('owe');
  const [cashAmount, setCashAmount] = useState('');

  // Gold direction: 'owe' (-ve) | 'advance' (+ve) | 'cleared' (0)
  const [goldDirection, setGoldDirection] = useState('owe');
  const [goldWeight, setGoldWeight] = useState('');

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (supplier && isOpen) {
      const curCash = parseFloat(supplier.current_balance || 0);
      if (curCash < 0) {
        setCashDirection('owe');
        setCashAmount(String(Math.abs(curCash)));
      } else if (curCash > 0) {
        setCashDirection('advance');
        setCashAmount(String(curCash));
      } else {
        setCashDirection('cleared');
        setCashAmount('0');
      }

      const curGold = parseFloat(supplier.gold_balance_grams || 0);
      if (curGold < 0) {
        setGoldDirection('owe');
        setGoldWeight(String(Math.abs(curGold)));
      } else if (curGold > 0) {
        setGoldDirection('advance');
        setGoldWeight(String(curGold));
      } else {
        setGoldDirection('cleared');
        setGoldWeight('0');
      }

      setReason('');
    }
  }, [supplier, isOpen]);

  if (!isOpen || !supplier) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    let computedCash = 0;
    if (cashDirection === 'owe') {
      computedCash = -Math.abs(parseFloat(cashAmount) || 0);
    } else if (cashDirection === 'advance') {
      computedCash = Math.abs(parseFloat(cashAmount) || 0);
    }

    let computedGold = 0;
    if (goldDirection === 'owe') {
      computedGold = -Math.abs(parseFloat(goldWeight) || 0);
    } else if (goldDirection === 'advance') {
      computedGold = Math.abs(parseFloat(goldWeight) || 0);
    }

    try {
      setSubmitting(true);
      const res = await api.post(`/suppliers/${supplier.id}/adjust-balance`, {
        current_balance: computedCash,
        gold_balance_grams: computedGold,
        reason: reason || 'Manual balance adjustment in Supplier Management',
      });

      showToast(res.data?.message || 'Supplier balance adjusted successfully!', 'success');
      if (onSuccess) onSuccess(res.data?.supplier);
      onClose();
    } catch (err) {
      console.error('Balance adjustment error:', err);
      showToast(sanitizeErrorMessage(err, 'Failed to update supplier balances.'), 'error');
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
            <div className="w-10 h-10 rounded-xl bg-[#b01622]/30 border border-[#b01622]/40 text-red-300 flex items-center justify-center text-lg">
              <i className="fa-solid fa-pen-to-square"></i>
            </div>
            <div>
              <h3 className="font-bold text-base font-serif">
                Edit Balance Due &amp; Advances
              </h3>
              <p className="text-xs text-stone-300 font-mono">
                {supplier.name} ({supplier.supplier_code})
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

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          
          {/* SECTION 1: CASH / MONETARY BALANCE */}
          <div className="space-y-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <i className="fa-solid fa-indian-rupee-sign text-[#b01622]"></i>
                1. Money Balance Due (₹)
              </span>
              <span className="text-[10.5px] text-stone-500 font-mono">
                Current: {parseFloat(supplier.current_balance || 0) < 0
                  ? `Owes ₹${Math.abs(parseFloat(supplier.current_balance)).toLocaleString('en-IN')}`
                  : parseFloat(supplier.current_balance || 0) > 0
                  ? `Advance ₹${parseFloat(supplier.current_balance).toLocaleString('en-IN')}`
                  : '₹0.00'}
              </span>
            </div>

            {/* Direction Selector */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setCashDirection('owe')}
                className={`py-2 px-2 rounded-lg border text-center font-bold text-[11px] transition-all cursor-pointer ${
                  cashDirection === 'owe'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 ring-1 ring-rose-400'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                We Owe Supplier
              </button>

              <button
                type="button"
                onClick={() => setCashDirection('advance')}
                className={`py-2 px-2 rounded-lg border text-center font-bold text-[11px] transition-all cursor-pointer ${
                  cashDirection === 'advance'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-1 ring-emerald-400'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                Supplier Holds Extra
              </button>

              <button
                type="button"
                onClick={() => { setCashDirection('cleared'); setCashAmount('0'); }}
                className={`py-2 px-2 rounded-lg border text-center font-bold text-[11px] transition-all cursor-pointer ${
                  cashDirection === 'cleared'
                    ? 'bg-stone-100 border-stone-300 text-stone-800 ring-1 ring-stone-400'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                All Cleared (₹0)
              </button>
            </div>

            {cashDirection !== 'cleared' && (
              <div>
                <label className="block text-[10.5px] font-bold text-stone-600 mb-1">
                  {cashDirection === 'owe' ? 'Amount We Owe to Supplier (₹)' : 'Advance / Extra Money Held by Supplier (₹)'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-sm font-bold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                />
              </div>
            )}
          </div>

          {/* SECTION 2: 24K PURE GOLD BALANCE */}
          <div className="space-y-3 p-4 bg-amber-50/60 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <i className="fa-solid fa-cube text-amber-600"></i>
                2. 24K Pure Gold Balance Due (Grams)
              </span>
              <span className="text-[10.5px] text-amber-800 font-mono">
                Current: {parseFloat(supplier.gold_balance_grams || 0) < 0
                  ? `Owes ${Math.abs(parseFloat(supplier.gold_balance_grams)).toFixed(3)}g`
                  : parseFloat(supplier.gold_balance_grams || 0) > 0
                  ? `Advance ${parseFloat(supplier.gold_balance_grams).toFixed(3)}g`
                  : '0.000g'}
              </span>
            </div>

            {/* Direction Selector */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setGoldDirection('owe')}
                className={`py-2 px-2 rounded-lg border text-center font-bold text-[11px] transition-all cursor-pointer ${
                  goldDirection === 'owe'
                    ? 'bg-amber-100 border-amber-400 text-amber-900 ring-1 ring-amber-400'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                We Owe 24K Gold
              </button>

              <button
                type="button"
                onClick={() => setGoldDirection('advance')}
                className={`py-2 px-2 rounded-lg border text-center font-bold text-[11px] transition-all cursor-pointer ${
                  goldDirection === 'advance'
                    ? 'bg-cyan-50 border-cyan-300 text-cyan-800 ring-1 ring-cyan-400'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                Supplier Holds Extra
              </button>

              <button
                type="button"
                onClick={() => { setGoldDirection('cleared'); setGoldWeight('0'); }}
                className={`py-2 px-2 rounded-lg border text-center font-bold text-[11px] transition-all cursor-pointer ${
                  goldDirection === 'cleared'
                    ? 'bg-stone-100 border-stone-300 text-stone-800 ring-1 ring-stone-400'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                All Cleared (0g)
              </button>
            </div>

            {goldDirection !== 'cleared' && (
              <div>
                <label className="block text-[10.5px] font-bold text-amber-900 mb-1">
                  {goldDirection === 'owe' ? '24K Pure Gold Weight We Owe (grams)' : 'Advance / Extra Pure Gold with Supplier (grams)'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={goldWeight}
                  onChange={(e) => setGoldWeight(e.target.value)}
                  placeholder="0.000"
                  required
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-sm font-bold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                />
              </div>
            )}
          </div>

          {/* SECTION 3: REASON / AUDIT NOTE */}
          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">
              Adjustment Reason / Reconciliation Reference <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Opening balance reconciliation / outside settlement"
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
            />
          </div>

          {/* ACTIONS */}
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
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check text-xs"></i>
                  <span>Save Balance Adjustments</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
