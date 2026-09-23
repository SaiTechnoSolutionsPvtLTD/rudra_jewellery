import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function GoldRateEditModal({ isOpen, onClose, currentRates, onSaved }) {
  const { showToast } = useToast();

  const [rate24kTenG, setRate24kTenG] = useState('');
  const [rate22kTenG, setRate22kTenG] = useState('');
  const [silverKg, setSilverKg] = useState('0');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const g24kRaw = String(currentRates?.gold24k_10g || currentRates?.gold24k || '0').replace(/,/g, '');
      const g22kRaw = String(currentRates?.gold22k_10g || currentRates?.gold22k || '0').replace(/,/g, '');
      
      const num24 = parseFloat(g24kRaw) || 0;
      const num22 = parseFloat(g22kRaw) || 0;

      // Ensure 10g value
      const tenG24 = num24 > 0 && num24 < 50000 ? num24 * 10 : num24;
      const tenG22 = num22 > 0 && num22 < 50000 ? num22 * 10 : num22;

      setRate24kTenG(String(Math.round(tenG24)));
      setRate22kTenG(String(Math.round(tenG22)));
      setSilverKg(String(currentRates?.silverKg || '0').replace(/,/g, ''));
    }
  }, [isOpen, currentRates]);

  if (!isOpen) return null;

  const num24k10g = parseFloat(rate24kTenG) || 0;
  const num22k10g = parseFloat(rate22kTenG) || 0;

  const num24kGram = Math.round(num24k10g / 10);
  const num22kGram = Math.round(num22k10g / 10);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!rate24kTenG || !rate22kTenG) {
      showToast('Please enter valid 24K and 22K Gold Rates', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        gold24k: num24kGram,
        gold22k: num22kGram,
        silverGram: (parseFloat(silverKg) || 110000) / 1000,
        silverKg: silverKg,
      };

      const res = await api.post('/metal-rates', payload);
      const newRates = res.data?.rates || res.data;

      // Update localStorage & global custom events
      try {
        const stored = {
          rate24k: String(newRates.gold24k),
          rate22k: String(newRates.gold22k),
          rate24k_10g: String(newRates.gold24k_10g),
          rate22k_10g: String(newRates.gold22k_10g),
          date: newRates.date,
          isManual: true,
          lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
        localStorage.setItem('rudhra_master_live_rates', JSON.stringify(stored));
        localStorage.setItem(`rudhra_manual_rates_${new Date().toISOString().split('T')[0]}`, JSON.stringify(stored));
        
        window.dispatchEvent(new CustomEvent('rudhra_price_list_updated', { detail: stored }));
        window.dispatchEvent(new CustomEvent('rudhra_metal_rates_updated', { detail: newRates }));
      } catch (err) {}

      showToast('Today\'s Gold & Silver rates updated successfully!', 'success', 'Rates Saved');
      if (onSaved) onSaved(newRates);
      onClose();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save gold rates', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToLive = async () => {
    setResetting(true);
    try {
      const res = await api.post('/metal-rates/reset');
      const liveRates = res.data?.rates || res.data;

      try {
        const stored = {
          rate24k: String(liveRates.gold24k),
          rate22k: String(liveRates.gold22k),
          rate24k_10g: String(liveRates.gold24k_10g),
          rate22k_10g: String(liveRates.gold22k_10g),
          date: liveRates.date,
          isManual: false,
        };
        localStorage.setItem('rudhra_master_live_rates', JSON.stringify(stored));
        localStorage.removeItem(`rudhra_manual_rates_${new Date().toISOString().split('T')[0]}`);
        
        window.dispatchEvent(new CustomEvent('rudhra_price_list_updated', { detail: stored }));
        window.dispatchEvent(new CustomEvent('rudhra_metal_rates_updated', { detail: liveRates }));
      } catch (e) {}

      showToast('Reset to Live Internet Gold Rates successfully!', 'success', 'Live Rates Fetched');
      if (onSaved) onSaved(liveRates);
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to reset live rates', 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden transform transition-all">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#2c2621] to-[#1a1714] text-white flex items-center justify-between border-b border-amber-900/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#f5ca56] to-[#b37f1a] flex items-center justify-center text-white font-bold text-sm shadow-xs">
              ₹
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-100 tracking-tight">Today's Gold Rate Editor</h3>
              <p className="text-[10.5px] text-amber-200/70 font-medium">
                Set manual benchmark rates for {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          
          {/* Rate Status Banner */}
          <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            currentRates?.isManual ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-stone-50 border-stone-200 text-stone-700'
          }`}>
            <div className="flex items-center gap-2">
              <i className={`fa-solid ${currentRates?.isManual ? 'fa-user-pen text-amber-700' : 'fa-globe text-emerald-600'}`}></i>
              <span className="font-semibold">
                Status: {currentRates?.isManual ? 'Manual Override Active (Today)' : 'Live Internet API Rate'}
              </span>
            </div>
            {currentRates?.isManual && (
              <span className="text-[9.5px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded uppercase">Manual</span>
            )}
          </div>

          {/* 24K Gold Rate Input */}
          <div className="bg-stone-50/80 rounded-xl p-3.5 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>24K (999 Purity) Gold Rate</span>
              </label>
              <span className="text-[11px] font-bold text-[#b01622] font-mono">
                ₹{num24kGram.toLocaleString('en-IN')} / gram
              </span>
            </div>
            <div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  value={rate24kTenG}
                  onChange={(e) => setRate24kTenG(e.target.value)}
                  placeholder="e.g. 146340 for 10g or 14634 for 1g"
                  className="w-full pl-7 pr-16 py-2 bg-white border border-stone-300 rounded-lg text-sm font-bold font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622]"
                  required
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 text-xs font-semibold">per 10g</span>
              </div>
            </div>
          </div>

          {/* 22K Gold Rate Input */}
          <div className="bg-stone-50/80 rounded-xl p-3.5 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                <span>22K (916 Standard) Gold Rate</span>
              </label>
              <span className="text-[11px] font-bold text-[#b01622] font-mono">
                ₹{num22kGram.toLocaleString('en-IN')} / gram
              </span>
            </div>
            <div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  value={rate22kTenG}
                  onChange={(e) => setRate22kTenG(e.target.value)}
                  placeholder="e.g. 134140 for 10g or 13414 for 1g"
                  className="w-full pl-7 pr-16 py-2 bg-white border border-stone-300 rounded-lg text-sm font-bold font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622]"
                  required
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 text-xs font-semibold">per 10g</span>
              </div>
            </div>
          </div>

          {/* Silver Rate Input */}
          <div className="bg-stone-50/80 rounded-xl p-3.5 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Silver Rate (Per Kg)</span>
              </label>
              <span className="text-[11px] font-bold text-slate-700 font-mono">
                ₹{((parseFloat(silverKg) || 110000) / 1000).toFixed(1)} / gram
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 font-bold text-xs">₹</span>
              <input
                type="number"
                value={silverKg}
                onChange={(e) => setSilverKg(e.target.value)}
                placeholder="e.g. 110000 for 1kg"
                className="w-full pl-7 pr-16 py-2 bg-white border border-stone-300 rounded-lg text-sm font-bold font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622]"
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 text-xs font-semibold">per Kg</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={resetting || saving}
              onClick={handleResetToLive}
              className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {resetting ? (
                <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
              ) : (
                <i className="fa-solid fa-rotate text-xs"></i>
              )}
              <span>Live Internet Rates</span>
            </button>

            <button
              type="submit"
              disabled={saving || resetting}
              className="flex-1 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check text-xs"></i>
                  <span>Save Rates for Today</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
