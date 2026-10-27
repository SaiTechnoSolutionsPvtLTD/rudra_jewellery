import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function ClientMetalDepositModal({ isOpen, onClose, client, onSuccess }) {
  const { showToast } = useToast();

  const [metalType, setMetalType] = useState('gold');
  const [grossWeight, setGrossWeight] = useState('');
  const [touch, setTouch] = useState('91.6');
  const [purityPreset, setPurityPreset] = useState('22K');
  const [hasRate, setHasRate] = useState(false);
  const [rate, setRate] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMetalType('gold');
      setGrossWeight('');
      setTouch('91.6');
      setPurityPreset('22K');
      setHasRate(false);
      setRate('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setRemarks('');
      setSubmitting(false);
    }
  }, [isOpen, client]);

  if (!isOpen || !client) return null;

  const gw = parseFloat(grossWeight) || 0;
  const t = parseFloat(touch) || 91.6;
  const fineWeight = gw > 0 ? (gw * (t / 100)).toFixed(3) : '0.000';
  const r = parseFloat(rate) || 0;
  const totalCashCredit = hasRate && r > 0 ? (parseFloat(fineWeight) * r).toFixed(2) : '0.00';

  const handlePurityPresetChange = (preset) => {
    setPurityPreset(preset);
    if (preset === '24K') setTouch('99.9');
    else if (preset === '22K') setTouch('91.6');
    else if (preset === '18K') setTouch('75.0');
    else if (preset === '925') setTouch('92.5');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (gw <= 0) {
      showToast('Please enter a valid gross weight greater than 0', 'error');
      return;
    }
    if (hasRate && r <= 0) {
      showToast('Please enter a valid gold rate per gram', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        metal_type: metalType,
        gross_weight: gw,
        touch: t,
        purity: purityPreset,
        rate: hasRate ? r : 0,
        transaction_date: transactionDate,
        remarks: remarks.trim() || (hasRate ? `Gold advance @ ₹${r}/g` : 'Pure gold deposit advance without rate'),
      };

      const res = await api.post(`/clients/${client.id}/metal-deposit`, payload);
      showToast(res.data?.message || 'Metal deposit recorded successfully!', 'success');
      if (onSuccess) {
        onSuccess(res.data?.client || client);
      }
      onClose();
    } catch (err) {
      console.error('Metal deposit failed:', err);
      showToast(err.response?.data?.message || 'Failed to record metal deposit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const clientName = client.full_name || client.name || 'Client';
  const currentGoldBalance = parseFloat(client.gold_balance_grams || 0).toFixed(3);
  const currentSilverBalance = parseFloat(client.silver_balance_grams || 0).toFixed(3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden transition-all scale-100">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 text-lg shadow-inner">
              <i className="fa-solid fa-coins"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-wide leading-tight">
                Client Metal Deposit / Advance
              </h3>
              <p className="text-[11px] text-amber-200/90 font-medium">
                Pure Gold Ledger &amp; Metal Advance Management
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
            title="Close"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Client Current Balance Summary */}
        <div className="bg-amber-50/70 border-b border-amber-200/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-gray-900 block">{clientName}</span>
              <span className="text-[11px] font-mono text-gray-500">{client.client_code || client.code || 'RJ-CLIENT'}</span>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300/80">
              {client.membership_tier || 'Client Ledger'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-200/50">
            <div className="p-2.5 rounded-xl bg-white border border-amber-200 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Pure Gold Balance
              </span>
              <span className="text-base font-mono font-black text-amber-950">
                {currentGoldBalance} <span className="text-xs font-normal text-amber-800">g</span>
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
              <span className="text-[10px] font-bold text-stone-700 uppercase tracking-wider block">
                Pure Silver Balance
              </span>
              <span className="text-base font-mono font-black text-stone-900">
                {currentSilverBalance} <span className="text-xs font-normal text-stone-600">g</span>
              </span>
            </div>
          </div>
        </div>

        {/* Deposit Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Metal Type & Presets */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Metal Type
              </label>
              <select
                value={metalType}
                onChange={(e) => {
                  const m = e.target.value;
                  setMetalType(m);
                  if (m === 'silver') handlePurityPresetChange('925');
                  else handlePurityPresetChange('22K');
                }}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-amber-600 focus:bg-white"
              >
                <option value="gold">Gold (Au)</option>
                <option value="silver">Silver (Ag)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Purity Standard
              </label>
              {metalType === 'gold' ? (
                <div className="grid grid-cols-3 gap-1">
                  {['22K', '24K', '18K'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePurityPresetChange(p)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                        purityPreset === p
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-stone-50 text-gray-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-gray-700 text-center">
                  92.5% Sterling Silver
                </div>
              )}
            </div>
          </div>

          {/* Weight & Touch */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Gross Weight (Grams) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={grossWeight}
                onChange={(e) => setGrossWeight(e.target.value)}
                placeholder="e.g. 10.500"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-amber-600 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Touch (%) <span className="text-stone-400 font-normal">Pure Ratio</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="100"
                value={touch}
                onChange={(e) => setTouch(e.target.value)}
                placeholder="e.g. 91.6"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-amber-600 shadow-2xs"
              />
            </div>
          </div>

          {/* Calculated Fine Weight Banner */}
          <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <i className="fa-solid fa-scale-balanced text-amber-700"></i>
              Calculated Pure Metal:
            </span>
            <span className="text-sm font-mono font-black text-amber-900">
              {fineWeight} <span className="text-xs font-bold">g pure {metalType}</span>
            </span>
          </div>

          {/* With vs Without Rate Toggle Section (The Client's core requirement!) */}
          <div className="border border-stone-200 rounded-xl p-3 bg-stone-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-900 block">
                  Deposit With Rate?
                </span>
                <span className="text-[11px] text-gray-500 block">
                  {hasRate
                    ? 'Convert to cash credit based on fixed rate'
                    : 'Do not convert to cash — Retain purely as Gold in grams'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasRate}
                  onChange={(e) => setHasRate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {hasRate ? (
              <div className="pt-2 border-t border-stone-200 space-y-2 animate-fade-in">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Rate Per Gram (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required={hasRate}
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="e.g. 7100"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-amber-600 shadow-2xs"
                  />
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-emerald-50 text-emerald-900 font-bold border border-emerald-200">
                  <span>Cash Credit Amount:</span>
                  <span className="font-mono text-sm">₹{Number(totalCashCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-blue-50/80 border border-blue-200/80 text-[11px] text-blue-900 flex items-start gap-1.5">
                <i className="fa-solid fa-circle-info text-blue-600 mt-0.5 text-xs"></i>
                <span>
                  <strong>Without Rate:</strong> Gold will sit strictly as pure metal in client's gold balance ({fineWeight}g). No cash will be created or debited.
                </span>
              </div>
            )}
          </div>

          {/* Date & Remarks */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Transaction Date
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-semibold text-gray-800 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Remarks / Reference
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Old gold advance"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                  <span>Recording Deposit...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check text-xs"></i>
                  <span>Confirm Deposit</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
