import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MaterialAllocationModal({ isOpen, onClose, summaryData = {}, liveJobs = [] }) {
  const navigate = useNavigate();
  const [filterMaterial, setFilterMaterial] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const sumLiveAllotted = liveJobs.reduce((acc, job) => acc + Number(job.allotted_weight || 0), 0);
  const sumLivePending = liveJobs.reduce((acc, job) => acc + Number(job.pending_weight || 0), 0);

  const allocatedWeightVal = Number(summaryData?.allocated_weight ?? summaryData?.total_allocated_weight ?? sumLiveAllotted);
  const pendingWeightVal = Number(summaryData?.pending_weight ?? summaryData?.total_pending_weight ?? sumLivePending);
  const activeJobsCount = Number(summaryData?.total_active ?? summaryData?.active_work_orders ?? liveJobs.length);

  const goldWeightVal = Number(summaryData?.gold_weight ?? liveJobs.filter(j => !(j.material||'').toLowerCase().includes('silver') && !(j.material||'').toLowerCase().includes('diamond')).reduce((a, b) => a + Number(b.allotted_weight||0), 0));
  const silverWeightVal = Number(summaryData?.silver_weight ?? liveJobs.filter(j => (j.material||'').toLowerCase().includes('silver')).reduce((a, b) => a + Number(b.allotted_weight||0), 0));
  const diamondWeightVal = Number(summaryData?.diamond_weight ?? liveJobs.filter(j => (j.material||'').toLowerCase().includes('diamond')).reduce((a, b) => a + Number(b.allotted_weight||0), 0));

  // Filter jobs
  const filteredJobs = liveJobs.filter((job) => {
    const mat = (job.material || job.material_type || '').toLowerCase();
    if (filterMaterial === 'gold' && !mat.includes('gold')) return false;
    if (filterMaterial === 'silver' && !mat.includes('silver')) return false;
    if (filterMaterial === 'diamond' && !mat.includes('diamond')) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (job.karigar_name || job.artisan_name || '').toLowerCase().includes(q);
      const matchWo = (job.work_order_number || '').toLowerCase().includes(q);
      const matchProd = (job.product_name || job.item_type || '').toLowerCase().includes(q);
      if (!matchName && !matchWo && !matchProd) return false;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-lg font-bold shadow-2xs">
              <i className="fa-solid fa-vault"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 leading-tight">Total Materials Allocated Details</h2>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  Active Vault
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Which metal is allocated to which artisan across active job orders</p>
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

        {/* Top Summary Banner */}
        <div className="p-5 border-b border-stone-100 bg-gradient-to-br from-red-50/40 via-amber-50/30 to-stone-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Total Allotted */}
            <div className="bg-white p-3.5 rounded-xl border border-red-100 shadow-2xs">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Allotted Metal</div>
              <div className="text-xl font-black text-stone-900 font-mono mt-0.5">
                {allocatedWeightVal.toFixed(3)} <span className="text-xs font-sans text-stone-500 font-bold">g</span>
              </div>
              <div className="text-[11px] text-stone-500 font-medium mt-1">
                Active Runs: <strong className="text-gray-900">{activeJobsCount} Jobs</strong>
              </div>
            </div>

            {/* Gold Allocated */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Gold 22K/18K</span>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              </div>
              <div className="text-xl font-black text-stone-900 font-mono mt-0.5">
                {goldWeightVal.toFixed(3)} <span className="text-xs font-sans text-stone-500 font-bold">g</span>
              </div>
              <div className="text-[11px] text-amber-700 font-medium mt-1">
                Primary crafting gold
              </div>
            </div>

            {/* Silver Allocated */}
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Silver 925</span>
                <span className="w-2 h-2 rounded-full bg-stone-400"></span>
              </div>
              <div className="text-xl font-black text-stone-900 font-mono mt-0.5">
                {silverWeightVal.toFixed(3)} <span className="text-xs font-sans text-stone-500 font-bold">g</span>
              </div>
              <div className="text-[11px] text-stone-400 font-medium mt-1">
                Silver bullion
              </div>
            </div>

            {/* Diamond Allocated */}
            <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Diamond</span>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              </div>
              <div className="text-xl font-black text-stone-900 font-mono mt-0.5">
                {diamondWeightVal.toFixed(3)} <span className="text-xs font-sans text-stone-500 font-bold">cts/g</span>
              </div>
              <div className="text-[11px] text-blue-700 font-medium mt-1">
                Precious stone allocation
              </div>
            </div>

            {/* Pending Metal */}
            <div className="bg-white p-3.5 rounded-xl border border-red-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#b01622] uppercase tracking-wider">Pending Balance</span>
                <span className="w-2 h-2 rounded-full bg-[#b01622]"></span>
              </div>
              <div className="text-xl font-black text-[#b01622] font-mono mt-0.5">
                {pendingWeightVal.toFixed(3)} <span className="text-xs font-sans text-stone-500 font-bold">g</span>
              </div>
              <div className="text-[11px] text-[#b01622] font-medium mt-1">
                Work-in-progress on bench
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-3 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50/30">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterMaterial('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterMaterial === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              All Materials ({liveJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMaterial('gold')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterMaterial === 'gold'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Gold
            </button>
            <button
              type="button"
              onClick={() => setFilterMaterial('silver')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterMaterial === 'silver'
                  ? 'bg-stone-600 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-stone-400"></span>
              Silver
            </button>
            <button
              type="button"
              onClick={() => setFilterMaterial('diamond')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterMaterial === 'diamond'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-blue-200 text-blue-800 hover:bg-blue-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Diamond
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400"></i>
            <input
              type="text"
              placeholder="Search artisan or order..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
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

        {/* Modal Table Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-100/70 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                <th className="py-3 px-4">Artisan / Karigar</th>
                <th className="py-3 px-4">Work Order #</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Material / Purity</th>
                <th className="py-3 px-4 text-right">Allotted Wt</th>
                <th className="py-3 px-4 text-right">Completed</th>
                <th className="py-3 px-4 text-right">Pending Wt</th>
                <th className="py-3 px-4 text-center">Stage & Status</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-stone-100 font-medium">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <i className="fa-solid fa-box-open text-2xl text-stone-300"></i>
                      <span>No active material allocations found matching filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const allotted = Number(job.allotted_weight || 0);
                  const completed = Number(job.completed_weight || 0);
                  const pending = Number(job.pending_weight || Math.max(0, allotted - completed));
                  const artisan = job.karigar_name || job.artisan_name || '-';
                  const mat = job.material || job.material_type || '-';

                  return (
                    <tr key={job.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-stone-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
                            {artisan !== '-' ? artisan.substring(0, 2).toUpperCase() : '-'}
                          </div>
                          <span>{artisan}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#b01622] whitespace-nowrap">
                        {job.work_order_number}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-800 max-w-[160px] truncate" title={job.product_name || job.item_type}>
                        {job.product_name || job.item_type || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold text-[11px]">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            mat.toLowerCase().includes('silver')
                              ? 'bg-stone-400'
                              : mat.toLowerCase().includes('diamond')
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}></span>
                          {mat}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                        {allotted.toFixed(3)}g
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                        {completed.toFixed(3)}g
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#b01622] whitespace-nowrap">
                        {pending.toFixed(3)}g
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                          {job.current_stage ? job.current_stage.replace(/_/g, ' ') : 'In Progress'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
          <div className="text-xs text-stone-500 font-medium">
            Showing <strong className="text-stone-900">{filteredJobs.length}</strong> active material allocations
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
                navigate('/job-order/new');
              }}
              className="px-6 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>Allocate New Job Order</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
