import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Helper to convert gross weight into 24K fine pure gold based on purity/karat standard
const convertToFineGold = (weight, purityStr) => {
  const wt = Number(weight || 0);
  if (wt <= 0) return 0;
  const str = String(purityStr || '').toUpperCase().trim();
  if (str.includes('24K') || str.includes('999') || str.includes('PURE')) {
    return wt * 1.0;
  }
  if (str.includes('22K') || str.includes('916')) {
    return wt * (22.0 / 24.0); // 91.6667%
  }
  if (str.includes('20K') || str.includes('833')) {
    return wt * (20.0 / 24.0); // 83.3333%
  }
  if (str.includes('18K') || str.includes('750')) {
    return wt * (18.0 / 24.0); // 75.0%
  }
  if (str.includes('14K') || str.includes('585')) {
    return wt * (14.0 / 24.0); // 58.3333%
  }
  if (str.includes('10K') || str.includes('417')) {
    return wt * (10.0 / 24.0); // 41.6667%
  }
  const numTouch = parseFloat(str);
  if (!isNaN(numTouch) && numTouch > 1) {
    return wt * (numTouch / 100);
  }
  return wt * (22.0 / 24.0); // Default standard 22K (916)
};

const formatINR = (val) => {
  const num = Number(val || 0);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BenchMetalModal({ isOpen, onClose, totalBenchMetal = 0, karigarsList = [], liveJobs = [] }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMaterialTab, setActiveMaterialTab] = useState('all'); // 'all', 'gold', 'silver', 'diamond', 'cash'

  if (!isOpen) return null;

  // Aggregate metal, fine gold, diamonds, and cash balances on bench per Karigar
  const karigarDataMap = {};

  // 1. Populate from karigarsList
  karigarsList.forEach((k) => {
    const baseGold = Number(k.current_gold_balance_grams || 0);
    const baseFine = k.fine_gold_balance !== undefined
      ? Number(k.fine_gold_balance)
      : convertToFineGold(baseGold, '22K Gold');
    const cashBal = k.cash_balance !== undefined
      ? Number(k.cash_balance)
      : (k.financial?.net_balance !== undefined ? Number(k.financial.net_balance) : 0);
    const diaBalCt = k.diamond_balance_carats !== undefined
      ? Number(k.diamond_balance_carats)
      : (k.diamond_on_bench !== undefined ? Number(k.diamond_on_bench) : 0);
    const diaBalPcs = k.diamond_balance_pieces !== undefined
      ? Number(k.diamond_balance_pieces)
      : (k.diamond_count_on_bench !== undefined ? Number(k.diamond_count_on_bench) : 0);

    karigarDataMap[k.id] = {
      id: k.id,
      name: k.name,
      karigar_code: k.karigar_code || `KAR-${k.id}`,
      specialization: k.specialization || '-',
      phone: k.primary_phone || k.phone || '',
      base_gold_balance: baseGold,
      base_fine_gold_balance: baseFine,
      cash_balance: cashBal,
      gold_pending: 0,
      fine_gold_pending: 0,
      silver_pending: 0,
      diamond_pending_ct: diaBalCt,
      diamond_pending_pcs: diaBalPcs,
      gold_allotted: 0,
      silver_allotted: 0,
      diamond_allotted_ct: 0,
      diamond_allotted_pcs: 0,
      active_jobs_count: 0,
    };
  });

  // 2. Aggregate live active jobs per Karigar from liveJobs
  liveJobs.forEach((job) => {
    let kId = job.karigar_id || job.artisan_id;
    const kName = job.karigar_name || job.artisan_name || 'Unassigned';

    if (!kId && kName !== 'Unassigned') {
      const match = karigarsList.find((k) => k.name?.toLowerCase().trim() === kName.toLowerCase().trim());
      if (match) kId = match.id;
    }

    if (!kId) return;

    if (!karigarDataMap[kId]) {
      karigarDataMap[kId] = {
        id: kId,
        name: kName,
        karigar_code: `KAR-${kId}`,
        specialization: job.specialization || '-',
        phone: '',
        base_gold_balance: 0,
        base_fine_gold_balance: 0,
        cash_balance: 0,
        gold_pending: 0,
        fine_gold_pending: 0,
        silver_pending: 0,
        diamond_pending_ct: 0,
        diamond_pending_pcs: 0,
        gold_allotted: 0,
        silver_allotted: 0,
        diamond_allotted_ct: 0,
        diamond_allotted_pcs: 0,
        active_jobs_count: 0,
      };
    }

    const itemAllotted = Number(job.allotted_weight || 0);
    const itemCompleted = Number(job.completed_weight || 0);
    const itemPending = Number(job.pending_weight || Math.max(0, itemAllotted - itemCompleted));

    const mat = (job.material || job.material_type || '').toLowerCase();
    const purity = job.purity || job.material || job.material_type || '22K Gold';

    if (mat.includes('silver')) {
      karigarDataMap[kId].silver_allotted += itemAllotted;
      karigarDataMap[kId].silver_pending += itemPending;
    } else if (!mat.includes('diamond')) {
      // Default to Gold
      karigarDataMap[kId].gold_allotted += itemAllotted;
      karigarDataMap[kId].gold_pending += itemPending;

      // Convert 22K or 18K to 24K Pure Fine Gold Equivalent
      const itemFinePending = job.fine_pending_weight !== undefined
        ? Number(job.fine_pending_weight)
        : convertToFineGold(itemPending, purity);
      karigarDataMap[kId].fine_gold_pending += itemFinePending;
    }

    // Studded diamonds on jewellery or standalone diamond jobs
    const diaAllottedCt = Number(job.diamond_allotted || (mat.includes('diamond') ? itemAllotted : 0));
    const diaPendingCt = job.diamond_pending != null
      ? Number(job.diamond_pending)
      : Math.max(0, diaAllottedCt - Number(job.diamond_received || 0));

    const diaCountAllotted = Number(job.diamond_count || 0);
    const diaCountPending = job.diamond_pending_count != null
      ? Number(job.diamond_pending_count)
      : Math.max(0, diaCountAllotted - Number(job.diamond_received_count || 0));

    if (diaAllottedCt > 0 || diaPendingCt > 0 || diaCountAllotted > 0) {
      karigarDataMap[kId].diamond_allotted_ct += diaAllottedCt;
      karigarDataMap[kId].diamond_pending_ct += diaPendingCt;
      karigarDataMap[kId].diamond_allotted_pcs += diaCountAllotted;
      karigarDataMap[kId].diamond_pending_pcs += diaCountPending;
    }

    karigarDataMap[kId].active_jobs_count += 1;
  });

  const karigarsArray = Object.values(karigarDataMap).map((k) => {
    const netGold = k.gold_pending > 0 ? k.gold_pending : k.base_gold_balance;
    const netFineGold = k.fine_gold_pending > 0
      ? k.fine_gold_pending
      : (k.base_fine_gold_balance !== undefined && k.base_fine_gold_balance !== 0
          ? k.base_fine_gold_balance
          : convertToFineGold(netGold, '22K Gold'));
    const netSilver = k.silver_pending;
    const netDiamondCt = k.diamond_pending_ct;
    const netDiamondPcs = k.diamond_pending_pcs;
    const cashBal = k.cash_balance;

    return {
      ...k,
      netGold,
      netFineGold,
      netSilver,
      netDiamondCt,
      netDiamondPcs,
      cashBal,
      totalBenchGramEquiv: netGold + netSilver,
    };
  });

  // Calculate totals across all Karigars
  const sumGoldBench = karigarsArray.reduce((acc, k) => acc + k.netGold, 0) || totalBenchMetal;
  const sumFineGoldBench = karigarsArray.reduce((acc, k) => acc + k.netFineGold, 0);
  const sumSilverBench = karigarsArray.reduce((acc, k) => acc + k.netSilver, 0);
  const sumDiamondBenchCt = karigarsArray.reduce((acc, k) => acc + k.netDiamondCt, 0);
  const sumDiamondBenchPcs = karigarsArray.reduce((acc, k) => acc + k.netDiamondPcs, 0);
  const sumCashBalance = karigarsArray.reduce((acc, k) => acc + k.cashBal, 0);

  // Filter karigars based on active material/cash tab and search term
  const filteredKarigars = karigarsArray.filter((k) => {
    if (activeMaterialTab === 'gold' && Math.abs(k.netGold) <= 0.0001 && Math.abs(k.netFineGold) <= 0.0001) return false;
    if (activeMaterialTab === 'silver' && k.netSilver <= 0) return false;
    if (activeMaterialTab === 'diamond' && k.netDiamondCt <= 0 && k.netDiamondPcs <= 0) return false;
    if (activeMaterialTab === 'cash' && Math.abs(k.cashBal) <= 0.01) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      k.name.toLowerCase().includes(q) ||
      k.karigar_code.toLowerCase().includes(q) ||
      k.specialization.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150 font-['Inter',sans-serif]">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto">

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
                  Gold (Gross &amp; Fine 24K), Silver, Diamonds &amp; Cash
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Comprehensive real-time tracking of metals, fine balances, stones &amp; financial accounts held on artisan benches</p>
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

        {/* Top 4 Material & Financial Breakdown Metric Cards */}
        <div className="p-4 sm:p-5 border-b border-stone-100 bg-gradient-to-r from-amber-50/60 via-stone-50 to-emerald-50/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Gold Bench (Gross & 24K Fine) */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Gold On Bench
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                  24K / 22K
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xl font-black text-stone-900 font-mono tracking-tight flex items-baseline gap-1">
                  <span>{sumGoldBench.toFixed(3)}</span>
                  <span className="text-xs font-sans font-bold text-amber-700">g gross</span>
                </div>
                <div className="text-[11px] font-bold text-amber-900 font-mono flex items-center gap-1 mt-0.5">
                  <span>Pure 24K Fine:</span>
                  <span className="bg-amber-100/80 px-1.5 py-0.2 rounded text-amber-950 font-black">{sumFineGoldBench.toFixed(3)} g</span>
                </div>
              </div>
              <p className="text-[10px] text-stone-500 font-medium mt-1.5">Converted pure fine gold balance</p>
            </div>

            {/* 2. Silver Bench */}
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                  Silver On Bench
                </span>
                <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                  Silver 925
                </span>
              </div>
              <div className="text-xl font-black text-stone-900 font-mono tracking-tight mt-2 flex items-baseline gap-1">
                <span>{sumSilverBench.toFixed(3)}</span>
                <span className="text-xs font-sans font-bold text-stone-500">grams</span>
              </div>
              <p className="text-[10px] text-stone-500 font-medium mt-1">Active silver bullion on bench</p>
            </div>

            {/* 3. Diamond Bench */}
            <div className="bg-white p-3.5 rounded-xl border border-blue-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Diamond Embellishments
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  Carats &amp; Pcs
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xl font-black text-stone-900 font-mono tracking-tight flex items-baseline gap-1">
                  <span>{sumDiamondBenchCt.toFixed(3)}</span>
                  <span className="text-xs font-sans font-bold text-blue-600">ct</span>
                </div>
                <div className="text-[11px] font-bold text-blue-800 flex items-center gap-1 mt-0.5">
                  <span>Count:</span>
                  <span className="bg-blue-100/70 px-1.5 py-0.2 rounded font-black font-mono">{sumDiamondBenchPcs} pcs</span>
                </div>
              </div>
              <p className="text-[10px] text-stone-500 font-medium mt-1.5">Active diamonds issued to bench</p>
            </div>

            {/* 4. Cash Balances (Artisan Ledger Balance) */}
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Artisan Cash Balances
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  sumCashBalance >= 0
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-amber-700 bg-amber-50 border-amber-200'
                }`}>
                  {sumCashBalance >= 0 ? 'Payable' : 'Advance'}
                </span>
              </div>
              <div className="text-xl font-black text-stone-900 font-mono tracking-tight mt-2 flex items-baseline gap-1">
                <span>{formatINR(Math.abs(sumCashBalance))}</span>
              </div>
              <p className="text-[10px] text-stone-500 font-medium mt-1">
                {sumCashBalance >= 0 ? 'Total making charges due to karigars' : 'Total excess advances with karigars'}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs and Search Bar */}
        <div className="px-6 py-3 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50/30">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveMaterialTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeMaterialTab === 'diamond'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Diamonds
            </button>
            <button
              type="button"
              onClick={() => setActiveMaterialTab('cash')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeMaterialTab === 'cash'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Cash Balance
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-100/70 text-[10.5px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                <th className="py-3 px-3 text-center w-12">S.No</th>
                <th className="py-3 px-3">Artisan Code</th>
                <th className="py-3 px-3">Artisan Name</th>
                <th className="py-3 px-3">Specialization</th>
                <th className="py-3 px-2 text-center">Active Jobs</th>
                <th className="py-3 px-3 text-right">Gold Gross (g)</th>
                <th className="py-3 px-3 text-right bg-amber-50/50">Fine Gold 24K (g)</th>
                <th className="py-3 px-3 text-right">Silver (g)</th>
                <th className="py-3 px-3 text-right">Diamonds (ct / pcs)</th>
                <th className="py-3 px-3 text-right bg-emerald-50/50">Cash Bal (₹)</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-stone-100 font-medium">
              {filteredKarigars.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-stone-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <i className="fa-solid fa-people-carry-box text-2xl text-stone-300"></i>
                      <span>No artisans found matching search query.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredKarigars.map((k, idx) => (
                  <tr key={k.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-stone-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#b01622] whitespace-nowrap">
                      {k.karigar_code}
                    </td>
                    <td className="py-3 px-3 font-bold text-stone-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
                          {k.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span>{k.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-stone-700 font-medium whitespace-nowrap">
                      {k.specialization}
                    </td>
                    <td className="py-3 px-2 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-800 font-bold text-[11px] rounded-full">
                        {k.active_jobs_count} Jobs
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-amber-800 text-xs whitespace-nowrap">
                      <span className={k.netGold < -0.0001 ? 'text-emerald-700 font-extrabold' : 'text-amber-800'}>
                        {k.netGold.toFixed(3)}
                      </span>{' '}
                      <span className="text-[10px] text-amber-600 font-sans font-normal">g</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-xs whitespace-nowrap bg-amber-50/40">
                      {k.netFineGold < -0.0001 ? (
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {k.netFineGold.toFixed(3)} 24K
                        </span>
                      ) : (
                        <>
                          <span className="text-amber-900 font-black">{k.netFineGold.toFixed(3)}</span>{' '}
                          <span className="text-[10px] text-amber-700 font-sans font-semibold">24K</span>
                        </>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-stone-700 whitespace-nowrap">
                      {k.netSilver.toFixed(3)} <span className="text-[10px] text-stone-400 font-sans font-normal">g</span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="font-mono font-bold text-blue-700 text-xs">
                        {k.netDiamondCt.toFixed(3)} <span className="text-[10px] text-blue-500 font-sans font-normal">ct</span>
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {k.netDiamondPcs} pcs
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap bg-emerald-50/40">
                      <span className={`font-mono font-bold text-xs ${k.cashBal >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {formatINR(Math.abs(k.cashBal))}
                      </span>
                      <span className="block text-[9.5px] uppercase font-bold text-stone-400">
                        {k.cashBal >= 0 ? 'Payable' : 'Advance'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
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
            <span>Gold Gross: <strong className="text-amber-800 font-mono text-xs">{sumGoldBench.toFixed(3)}g</strong></span>
            <span>Fine 24K: <strong className="text-amber-950 font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">{sumFineGoldBench.toFixed(3)}g</strong></span>
            <span>Silver: <strong className="text-stone-800 font-mono text-xs">{sumSilverBench.toFixed(3)}g</strong></span>
            <span>Diamonds: <strong className="text-blue-800 font-mono text-xs">{sumDiamondBenchCt.toFixed(3)}ct ({sumDiamondBenchPcs} pcs)</strong></span>
            <span>Net Cash: <strong className="text-emerald-800 font-mono text-xs">{formatINR(sumCashBalance)}</strong></span>
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
