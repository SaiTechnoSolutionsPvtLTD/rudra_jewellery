import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BenchMetalModal({ isOpen, onClose, totalBenchMetal = 0, karigarsList = [], liveJobs = [] }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Aggregate metal on bench per Karigar
  const karigarDataMap = {};

  // First populate from karigarsList if available
  karigarsList.forEach((k) => {
    karigarDataMap[k.id] = {
      id: k.id,
      name: k.name,
      karigar_code: k.karigar_code || `KAR-${k.id}`,
      specialization: k.specialization || 'Goldsmith',
      phone: k.primary_phone || k.phone || '',
      base_balance: Number(k.current_gold_balance_grams || 0),
      allotted: 0,
      completed: 0,
      pending: 0,
      active_jobs_count: 0,
    };
  });

  // Calculate live active jobs per Karigar from liveJobs
  liveJobs.forEach((job) => {
    const kId = job.karigar_id || job.artisan_id;
    const kName = job.karigar_name || job.artisan_name || 'Unassigned';
    
    if (!kId) return;

    if (!karigarDataMap[kId]) {
      karigarDataMap[kId] = {
        id: kId,
        name: kName,
        karigar_code: `KAR-${kId}`,
        specialization: 'Goldsmith',
        phone: '',
        base_balance: 0,
        allotted: 0,
        completed: 0,
        pending: 0,
        active_jobs_count: 0,
      };
    }

    const itemAllotted = Number(job.allotted_weight || 0);
    const itemCompleted = Number(job.completed_weight || 0);
    const itemPending = Number(job.pending_weight || Math.max(0, itemAllotted - itemCompleted));

    karigarDataMap[kId].allotted += itemAllotted;
    karigarDataMap[kId].completed += itemCompleted;
    karigarDataMap[kId].pending += itemPending;
    karigarDataMap[kId].active_jobs_count += 1;
  });

  const karigarsArray = Object.values(karigarDataMap).map((k) => {
    // Total metal on bench for artisan = base balance or active pending
    const netBenchGold = k.pending > 0 ? k.pending : k.base_balance;
    return {
      ...k,
      netBenchGold,
    };
  });

  // Filter karigars
  const filteredKarigars = karigarsArray.filter((k) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      k.name.toLowerCase().includes(q) ||
      k.karigar_code.toLowerCase().includes(q) ||
      k.specialization.toLowerCase().includes(q)
    );
  });

  const sumBenchGold = karigarsArray.reduce((acc, k) => acc + k.netBenchGold, 0) || totalBenchMetal;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-amber-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center text-lg font-bold shadow-2xs">
              <i className="fa-solid fa-cubes-stacked"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 leading-tight">Metal On Bench Details</h2>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300/60">
                  Pure 24K / 22K Balance
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Raw bullion and active work-in-progress held at artisan workshop benches</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 w-8 h-8 rounded-lg hover:bg-stone-200/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Top Big Stat Card */}
        <div className="p-5 border-b border-stone-100 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-stone-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
            <div>
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Metal Currently On Bench</div>
              <div className="text-3xl font-black text-stone-900 font-mono tracking-tight mt-1 flex items-baseline gap-1.5">
                <span>{sumBenchGold.toFixed(3)}</span>
                <span className="text-sm font-sans font-bold text-amber-700">grams</span>
              </div>
              <p className="text-[11px] text-amber-800/90 font-medium mt-1">
                Pure 24K / 22K balance across all active artisan workshops
              </p>
            </div>

            <div className="bg-amber-50/80 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <i className="fa-solid fa-circle-info text-amber-700"></i>
                <span>Auto-Inventory Reduction Rules:</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                When a product is completed and delivered, the material amount automatically reduces from the artisan bench balance.
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-stone-100 flex items-center justify-between gap-3 bg-stone-50/30">
          <div className="text-xs font-bold text-stone-700">
            Artisan Workshop Breakdown ({filteredKarigars.length} Artisans)
          </div>
          <div className="relative w-full sm:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400"></i>
            <input
              type="text"
              placeholder="Search artisan or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-100/70 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                <th className="py-3 px-4">Artisan Code</th>
                <th className="py-3 px-4">Artisan Name</th>
                <th className="py-3 px-4">Craft Specialization</th>
                <th className="py-3 px-4 text-center">Active Jobs</th>
                <th className="py-3 px-4 text-right">Allotted Gold</th>
                <th className="py-3 px-4 text-right">Returned / Completed</th>
                <th className="py-3 px-4 text-right">Net Metal on Bench</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-stone-100 font-medium">
              {filteredKarigars.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <i className="fa-solid fa-people-carry-box text-2xl text-stone-300"></i>
                      <span>No artisans found matching search query.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredKarigars.map((k) => (
                  <tr key={k.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#b01622] whitespace-nowrap">
                      {k.karigar_code}
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
                          {k.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span>{k.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-700 font-medium whitespace-nowrap">
                      {k.specialization}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-800 font-bold text-[11px] rounded-full">
                        {k.active_jobs_count} Jobs
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                      {k.allotted.toFixed(3)}g
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                      {k.completed.toFixed(3)}g
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-amber-800 text-sm whitespace-nowrap">
                      {k.netBenchGold.toFixed(3)}g
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate('/karigars');
                        }}
                        className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Workbench
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
          <div className="text-xs text-stone-500 font-medium">
            Total Metal On Bench: <strong className="text-amber-800 font-mono text-sm">{sumBenchGold.toFixed(3)}g</strong>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/karigars');
              }}
              className="px-6 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-users text-xs"></i>
              <span>Manage Karigars</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
