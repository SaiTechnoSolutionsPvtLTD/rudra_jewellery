import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BenchMetalModal({ isOpen, onClose, totalBenchMetal = 0, karigarsList = [], liveJobs = [] }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMaterialTab, setActiveMaterialTab] = useState('all'); // 'all', 'gold', 'silver', 'diamond'

  if (!isOpen) return null;

  // Aggregate metal on bench per Karigar
  const karigarDataMap = {};

  // First populate from karigarsList
  karigarsList.forEach((k) => {
    karigarDataMap[k.id] = {
      id: k.id,
      name: k.name,
      karigar_code: k.karigar_code || `KAR-${k.id}`,
      specialization: k.specialization || '-',
      phone: k.primary_phone || k.phone || '',
      base_gold_balance: Number(k.current_gold_balance_grams || 0),
      gold_pending: 0,
      silver_pending: 0,
      diamond_pending: 0,
      gold_allotted: 0,
      silver_allotted: 0,
      diamond_allotted: 0,
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
        specialization: job.specialization || '-',
        phone: '',
        base_gold_balance: 0,
        gold_pending: 0,
        silver_pending: 0,
        diamond_pending: 0,
        gold_allotted: 0,
        silver_allotted: 0,
        diamond_allotted: 0,
        active_jobs_count: 0,
      };
    }

    const itemAllotted = Number(job.allotted_weight || 0);
    const itemCompleted = Number(job.completed_weight || 0);
    const itemPending = Number(job.pending_weight || Math.max(0, itemAllotted - itemCompleted));

    const mat = (job.material || job.material_type || '').toLowerCase();

    if (mat.includes('silver')) {
      karigarDataMap[kId].silver_allotted += itemAllotted;
      karigarDataMap[kId].silver_pending += itemPending;
    } else if (mat.includes('diamond')) {
      karigarDataMap[kId].diamond_allotted += itemAllotted;
      karigarDataMap[kId].diamond_pending += itemPending;
    } else {
      // Default to Gold
      karigarDataMap[kId].gold_allotted += itemAllotted;
      karigarDataMap[kId].gold_pending += itemPending;
    }

    karigarDataMap[kId].active_jobs_count += 1;
  });

  const karigarsArray = Object.values(karigarDataMap).map((k) => {
    const netGold = k.gold_pending > 0 ? k.gold_pending : k.base_gold_balance;
    const netSilver = k.silver_pending;
    const netDiamond = k.diamond_pending;
    return {
      ...k,
      netGold,
      netSilver,
      netDiamond,
      totalBenchGramEquiv: netGold + netSilver,
    };
  });

  // Calculate totals across all Karigars
  const sumGoldBench = karigarsArray.reduce((acc, k) => acc + k.netGold, 0) || totalBenchMetal;
  const sumSilverBench = karigarsArray.reduce((acc, k) => acc + k.netSilver, 0);
  const sumDiamondBench = karigarsArray.reduce((acc, k) => acc + k.netDiamond, 0);

  // Filter karigars
  const filteredKarigars = karigarsArray.filter((k) => {
    if (activeMaterialTab === 'gold' && k.netGold <= 0) return false;
    if (activeMaterialTab === 'silver' && k.netSilver <= 0) return false;
    if (activeMaterialTab === 'diamond' && k.netDiamond <= 0) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      k.name.toLowerCase().includes(q) ||
      k.karigar_code.toLowerCase().includes(q) ||
      k.specialization.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto font-['Inter',sans-serif]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-amber-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center text-lg font-bold shadow-2xs">
              <i className="fa-solid fa-cubes-stacked"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 leading-tight">All Materials On Bench Details</h2>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300/60">
                  Gold, Silver & Diamond Balances
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Comprehensive real-time tracking of all metals and gemstones held on artisan benches</p>
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

        {/* Top 3 Material Breakdown Metric Cards */}
        <div className="p-5 border-b border-stone-100 bg-gradient-to-r from-amber-50/60 via-stone-50 to-blue-50/40">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Gold Bench */}
            <div className="bg-white p-4 rounded-xl border border-amber-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Gold On Bench
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                  24K / 22K
                </span>
              </div>
              <div className="text-2xl font-black text-stone-900 font-mono tracking-tight mt-2 flex items-baseline gap-1">
                <span>{sumGoldBench.toFixed(3)}</span>
                <span className="text-xs font-sans font-bold text-amber-700">grams</span>
              </div>
              <p className="text-[10.5px] text-stone-500 font-medium mt-1">Active gold held by artisans</p>
            </div>

            {/* Silver Bench */}
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                  Silver On Bench
                </span>
                <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                  Silver 925
                </span>
              </div>
              <div className="text-2xl font-black text-stone-900 font-mono tracking-tight mt-2 flex items-baseline gap-1">
                <span>{sumSilverBench.toFixed(3)}</span>
                <span className="text-xs font-sans font-bold text-stone-500">grams</span>
              </div>
              <p className="text-[10.5px] text-stone-500 font-medium mt-1">Active silver bullion on bench</p>
            </div>

            {/* Diamond Bench */}
            <div className="bg-white p-4 rounded-xl border border-blue-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Diamond Embellishments
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  Carats
                </span>
              </div>
              <div className="text-2xl font-black text-stone-900 font-mono tracking-tight mt-2 flex items-baseline gap-1">
                <span>{sumDiamondBench.toFixed(3)}</span>
                <span className="text-xs font-sans font-bold text-blue-600">ct</span>
              </div>
              <p className="text-[10.5px] text-stone-500 font-medium mt-1">Active stones issued to bench</p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-3 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50/30">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveMaterialTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeMaterialTab === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              All Artisans ({karigarsArray.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveMaterialTab('gold')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeMaterialTab === 'gold'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Gold Bench
            </button>
            <button
              type="button"
              onClick={() => setActiveMaterialTab('silver')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeMaterialTab === 'silver'
                  ? 'bg-stone-600 text-white'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-stone-400"></span>
              Silver Bench
            </button>
            <button
              type="button"
              onClick={() => setActiveMaterialTab('diamond')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeMaterialTab === 'diamond'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Diamonds
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400"></i>
            <input
              type="text"
              placeholder="Search artisan or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-amber-600"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              >
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-100/70 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                <th className="py-3 px-4">Artisan Code</th>
                <th className="py-3 px-4">Artisan Name</th>
                <th className="py-3 px-4">Specialization</th>
                <th className="py-3 px-4 text-center">Active Jobs</th>
                <th className="py-3 px-4 text-right">Gold Bench</th>
                <th className="py-3 px-4 text-right">Silver Bench</th>
                <th className="py-3 px-4 text-right">Diamond Bench</th>
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
                    <td className="py-3 px-4 text-right font-mono font-black text-amber-800 text-sm whitespace-nowrap">
                      {k.netGold.toFixed(3)} <span className="text-[10px] text-amber-600 font-sans font-normal">g</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-700 whitespace-nowrap">
                      {k.netSilver.toFixed(3)} <span className="text-[10px] text-stone-400 font-sans font-normal">g</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                      {k.netDiamond.toFixed(3)} <span className="text-[10px] text-blue-500 font-sans font-normal">ct</span>
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
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-500 font-medium flex items-center gap-4 flex-wrap">
            <span>Gold Bench: <strong className="text-amber-800 font-mono text-xs">{sumGoldBench.toFixed(3)}g</strong></span>
            <span>Silver Bench: <strong className="text-stone-800 font-mono text-xs">{sumSilverBench.toFixed(3)}g</strong></span>
            <span>Diamonds: <strong className="text-blue-800 font-mono text-xs">{sumDiamondBench.toFixed(3)}ct</strong></span>
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
