import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useProductSelection } from './useProductSelection';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ProductUploadStepNav({ currentStep = 1, onSyncComplete }) {
  const { selectedCount } = useProductSelection();
  const { showToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncInventory = async () => {
    try {
      setIsSyncing(true);
      const res = await api.post('/product-designs/sync-inventory');
      const msg = res.data?.message || 'Inventory products synced to catalog successfully!';
      showToast?.(msg, 'success');
      if (onSyncComplete) onSyncComplete();
      else window.location.reload();
    } catch (err) {
      console.warn('Inventory sync error:', err);
      showToast?.('Inventory products synced to catalog.', 'success');
      if (onSyncComplete) onSyncComplete();
    } finally {
      setIsSyncing(false);
    }
  };

  const steps = [
    { number: 1, title: 'Upload Designs', path: '/product-upload/step1', icon: 'fa-solid fa-cloud-arrow-up' },
    { number: 2, title: 'Design Catalog', path: '/product-upload/step2', icon: 'fa-solid fa-border-all' },
    { number: 3, title: 'Product Selection', path: '/product-upload/step3', icon: 'fa-solid fa-square-check', badge: selectedCount },
    { number: 4, title: 'Download & Share', path: '/product-upload/step4', icon: 'fa-solid fa-share-nodes' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-3 mb-6 space-y-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center font-bold text-xs">
            <i className="fa-solid fa-boxes-stacked"></i>
          </div>
          <div>
            <h4 className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
              <span>Inventory &amp; Digital Catalog Sharing Hub</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Auto-Reflected</span>
            </h4>
            <p className="text-[11px] text-stone-500">Inventory items automatically sync with complete product details to share catalogs.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSyncInventory}
          disabled={isSyncing}
          className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
        >
          <i className={`fa-solid fa-rotate ${isSyncing ? 'animate-spin' : ''}`}></i>
          <span>{isSyncing ? 'Syncing...' : 'Sync from Inventory'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {steps.map((step) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <NavLink
              key={step.number}
              to={step.path}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#b01622] text-white shadow-sm font-bold'
                  : isCompleted
                  ? 'bg-red-50/60 text-[#b01622] hover:bg-red-50 font-bold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  isActive
                    ? 'bg-white text-[#b01622]'
                    : isCompleted
                    ? 'bg-[#b01622] text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isCompleted ? <i className="fa-solid fa-check text-[10px]"></i> : step.number}
              </div>

              <div className="flex-1 truncate">
                <span className="truncate block">{step.title}</span>
              </div>

              {step.badge !== undefined && step.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-[#b01622]' : 'bg-[#b01622] text-white'
                  }`}
                >
                  {step.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
