import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function MaterialAllocationModal({ isOpen, onClose, summaryData = {}, liveJobs = [] }) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('allocations'); // 'allocations' or 'karigar_management'
  const [filterMaterial, setFilterMaterial] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Karigar Management State
  const [karigarsList, setKarigarsList] = useState([]);
  const [selectedKarigarId, setSelectedKarigarId] = useState('');
  const [karigarLedger, setKarigarLedger] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Material Action Form
  const [actionForm, setActionForm] = useState({
    action_type: 'additional_allocation',
    weight: '',
    work_order_id: '',
    reason: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isOpen) {
      fetchKarigars();
    }
  }, [isOpen]);

  const fetchKarigars = async () => {
    try {
      const res = await api.get('/karigar-materials');
      const list = res.data?.data || [];
      setKarigarsList(list);
      if (list.length > 0 && !selectedKarigarId) {
        setSelectedKarigarId(String(list[0].id));
      }
    } catch (err) {
      console.warn('Failed to load karigar materials:', err);
    }
  };

  useEffect(() => {
    if (selectedKarigarId) {
      fetchKarigarLedger(selectedKarigarId);
    }
  }, [selectedKarigarId]);

  const fetchKarigarLedger = async (id) => {
    try {
      setLoadingLedger(true);
      const res = await api.get(`/karigars/${id}/material-ledger`);
      setKarigarLedger(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load karigar ledger:', err);
      showToast?.('Failed to load karigar material details', 'error');
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleManageKarigarClick = (karigarId) => {
    setSelectedKarigarId(String(karigarId));
    setActiveTab('karigar_management');
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    if (!selectedKarigarId) {
      showToast?.('Please select a Karigar', 'error');
      return;
    }
    const wt = parseFloat(actionForm.weight);
    if (!wt || wt <= 0) {
      showToast?.('Please enter a valid weight greater than zero', 'error');
      return;
    }
    if (!actionForm.reason.trim()) {
      showToast?.('Mandatory reason/remarks is required for material movement', 'error');
      return;
    }

    try {
      setSubmittingAction(true);
      const payload = {
        action_type: actionForm.action_type,
        weight: wt,
        work_order_id: actionForm.work_order_id || null,
        reason: actionForm.reason.trim(),
        transaction_date: actionForm.transaction_date,
      };

      const res = await api.post(`/karigars/${selectedKarigarId}/material-action`, payload);
      showToast?.(res.data?.message || 'Material action recorded successfully!', 'success');

      // Reset form
      setActionForm((prev) => ({
        ...prev,
        weight: '',
        reason: '',
      }));

      // Refresh ledger & karigar list
      await fetchKarigarLedger(selectedKarigarId);
      await fetchKarigars();
    } catch (err) {
      console.error('Record material action error:', err);
      showToast?.(err.response?.data?.message || 'Failed to record material action', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-lg font-bold shadow-2xs">
              <i className="fa-solid fa-vault"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 leading-tight">Material Allocation &amp; Karigar Bench Hub</h2>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  Audited Ledger
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Track company-owned gold, karigar-supplied gold, wastage, returns and signed settlement balances</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch buttons */}
            <div className="inline-flex rounded-xl bg-stone-200/70 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('allocations')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'allocations' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Work Orders
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('karigar_management')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'karigar_management' ? 'bg-[#b01622] text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <i className="fa-solid fa-scale-balanced text-[11px]"></i>
                <span>Karigar Management</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 w-8 h-8 rounded-lg hover:bg-stone-200/60 flex items-center justify-center transition-colors cursor-pointer ml-2"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        {/* TAB 1: WORK ORDER ALLOCATIONS */}
        {activeTab === 'allocations' && (
          <>
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

                {/* Pending Metal On Bench */}
                <div className="bg-white p-3.5 rounded-xl border border-red-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#b01622] uppercase tracking-wider">Material On Bench</span>
                    <span className="w-2 h-2 rounded-full bg-[#b01622]"></span>
                  </div>
                  <div className="text-xl font-black text-[#b01622] font-mono mt-0.5">
                    {pendingWeightVal.toFixed(3)} <span className="text-xs font-sans text-stone-500 font-bold">g</span>
                  </div>
                  <div className="text-[11px] text-[#b01622] font-medium mt-1">
                    Physical company metal
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
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
                    <th className="py-3 px-4 text-right">Pending on Bench</th>
                    <th className="py-3 px-4 text-center">Stage &amp; Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-stone-100 font-medium">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-stone-400">
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
                      const pending = Number(job.pending_weight != null ? job.pending_weight : Math.max(0, allotted - completed));
                      const artisan = job.karigar_name || job.artisan_name || '-';
                      const mat = job.material || job.material_type || '-';

                      return (
                        <tr key={job.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-stone-900">
                            <button
                              type="button"
                              onClick={() => job.karigar_id && handleManageKarigarClick(job.karigar_id)}
                              className="flex items-center gap-2 hover:text-[#b01622] text-left cursor-pointer group"
                              title="Click to manage Karigar material balance"
                            >
                              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-red-100 group-hover:text-red-900 transition-colors">
                                {artisan !== '-' ? artisan.substring(0, 2).toUpperCase() : '-'}
                              </div>
                              <span className="group-hover:underline">{artisan}</span>
                            </button>
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
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => job.karigar_id && handleManageKarigarClick(job.karigar_id)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-[#b01622] hover:text-white text-stone-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              title="Open Karigar Material Ledger"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB 2: KARIGAR MATERIAL MANAGEMENT & RECONCILIATION */}
        {activeTab === 'karigar_management' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Karigar Selection Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-[#b01622] flex items-center justify-center font-bold text-base shrink-0">
                  <i className="fa-solid fa-user-gear"></i>
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-stone-400 uppercase tracking-wider block">
                    Select Artisan / Karigar
                  </label>
                  <select
                    value={selectedKarigarId}
                    onChange={(e) => setSelectedKarigarId(e.target.value)}
                    className="mt-0.5 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm font-bold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                  >
                    {karigarsList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name} ({k.karigar_code || `K-${k.id}`}) • {k.specialization || 'Goldsmith'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {karigarLedger && (
                <div className="flex items-center gap-3 text-xs text-stone-600">
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-2xs">
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Workshop</span>
                    <span className="font-bold text-stone-800">{karigarLedger.karigar?.workshop_name || 'Standard Bench'}</span>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-2xs">
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Contact</span>
                    <span className="font-bold text-stone-800">{karigarLedger.karigar?.primary_phone || '—'}</span>
                  </div>
                </div>
              )}
            </div>

            {loadingLedger ? (
              <div className="flex items-center justify-center h-48 text-stone-400">
                <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622] mr-3"></i>
                <span className="text-sm font-semibold">Loading Karigar material ledger...</span>
              </div>
            ) : karigarLedger ? (
              <>
                {/* 8-Card Detailed Accounting Breakdown */}
                <div>
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2.5">
                    Material Accounting Breakdown
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    {/* 1. Company Gold Allocated */}
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-center">
                      <span className="text-[9.5px] font-bold text-amber-800 uppercase block truncate">Company Allocated</span>
                      <span className="font-mono font-black text-stone-900 text-sm mt-0.5 block">
                        {Number(karigarLedger.summary?.company_gold_allocated || 0).toFixed(3)}g
                      </span>
                    </div>

                    {/* 2. Additional Company Gold Issued */}
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-center">
                      <span className="text-[9.5px] font-bold text-amber-800 uppercase block truncate">Additional Issued</span>
                      <span className="font-mono font-black text-stone-900 text-sm mt-0.5 block">
                        {Number(karigarLedger.summary?.additional_gold_issued || 0).toFixed(3)}g
                      </span>
                    </div>

                    {/* 3. Karigar-Owned Gold Contributed */}
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
                      <span className="text-[9.5px] font-bold text-purple-800 uppercase block truncate">Karigar's Own Gold</span>
                      <span className="font-mono font-black text-purple-950 text-sm mt-0.5 block">
                        {Number(karigarLedger.summary?.karigar_gold_contributed || 0).toFixed(3)}g
                      </span>
                    </div>

                    {/* 4. Finished Product Gold Received */}
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                      <span className="text-[9.5px] font-bold text-emerald-800 uppercase block truncate">Finished Received</span>
                      <span className="font-mono font-black text-emerald-950 text-sm mt-0.5 block">
                        {Number(karigarLedger.summary?.finished_gold_received || 0).toFixed(3)}g
                      </span>
                    </div>

                    {/* 5. Approved Wastage */}
                    <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-center">
                      <span className="text-[9.5px] font-bold text-stone-600 uppercase block truncate">Approved Wastage</span>
                      <span className="font-mono font-black text-stone-900 text-sm mt-0.5 block">
                        {Number(karigarLedger.summary?.approved_wastage || 0).toFixed(3)}g
                      </span>
                    </div>

                    {/* 6. Physical Unused Returned */}
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                      <span className="text-[9.5px] font-bold text-blue-800 uppercase block truncate">Unused Returned</span>
                      <span className="font-mono font-black text-blue-950 text-sm mt-0.5 block">
                        {Number(karigarLedger.summary?.unused_gold_returned || 0).toFixed(3)}g
                      </span>
                    </div>

                    {/* 7. Material Physically on Bench */}
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-300 text-center shadow-2xs">
                      <span className="text-[9.5px] font-black text-[#b01622] uppercase block truncate">Material on Bench</span>
                      <span className="font-mono font-black text-[#b01622] text-sm mt-0.5 block">
                        {Number(karigarLedger.summary?.material_on_bench || 0).toFixed(3)}g
                      </span>
                    </div>

                    {/* 8. Signed Settlement Balance */}
                    <div className={`p-3 rounded-xl border text-center shadow-2xs ${
                      Number(karigarLedger.summary?.settlement_balance || 0) < 0
                        ? 'bg-purple-100 border-purple-400 text-purple-900'
                        : Number(karigarLedger.summary?.settlement_balance || 0) > 0
                        ? 'bg-amber-100 border-amber-400 text-amber-900'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    }`}>
                      <span className="text-[9.5px] font-black uppercase block truncate">
                        {Number(karigarLedger.summary?.settlement_balance || 0) < 0 ? 'Company Owes' : 'Karigar Holds'}
                      </span>
                      <span className="font-mono font-black text-sm mt-0.5 block">
                        {Number(karigarLedger.summary?.settlement_balance || 0).toFixed(3)}g
                      </span>
                    </div>
                  </div>

                  {/* Clarification notes */}
                  <div className="mt-2 text-[11px] text-stone-500 flex flex-wrap items-center justify-between gap-2 px-1">
                    <span>
                      <strong>Bench Metal:</strong> Physical company gold outstanding. Not affected by karigar-owned contributions.
                    </span>
                    <span>
                      <strong>Negative Settlement Balance (-):</strong> Indicates company owes gold to Karigar (e.g. Karigar supplied own gold).
                    </span>
                  </div>
                </div>

                {/* Manager / Admin Control Panel to Record Material Movements */}
                <div className="bg-stone-50/80 rounded-2xl border border-stone-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-pen-to-square text-[#b01622]"></i>
                    <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Record Material Action / Adjustment (Authorized Managers)
                    </h3>
                  </div>

                  <form onSubmit={handleSubmitAction} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Action Type *</label>
                      <select
                        value={actionForm.action_type}
                        onChange={(e) => setActionForm({ ...actionForm, action_type: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-bold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                      >
                        <option value="additional_allocation">Issue Additional Company Gold</option>
                        <option value="karigar_contribution">Karigar Supplies Own Gold</option>
                        <option value="unused_returned">Return Unused Company Gold</option>
                        <option value="approve_wastage">Approve Work Order Wastage</option>
                        <option value="settlement">Settle Gold Owed to Karigar</option>
                        <option value="adjustment">Auditable Adjustment (+/-)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Weight (g) *</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        placeholder="0.000"
                        value={actionForm.weight}
                        onChange={(e) => setActionForm({ ...actionForm, weight: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono font-bold text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Work Order (Optional)</label>
                      <select
                        value={actionForm.work_order_id}
                        onChange={(e) => setActionForm({ ...actionForm, work_order_id: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                      >
                        <option value="">General (No specific WO)</option>
                        {(karigarLedger.all_work_orders || []).map((wo) => (
                          <option key={wo.id} value={wo.id}>
                            {wo.work_order_number} ({wo.product_name || 'Item'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Transaction Date</label>
                      <input
                        type="date"
                        value={actionForm.transaction_date}
                        onChange={(e) => setActionForm({ ...actionForm, transaction_date: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Reason / Notes *</label>
                      <input
                        type="text"
                        required
                        placeholder="Mandatory audit remarks"
                        value={actionForm.reason}
                        onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-5 flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={submittingAction}
                        className="px-6 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {submittingAction ? (
                          <>
                            <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                            <span>Recording Transaction...</span>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-check text-xs"></i>
                            <span>Record Material Transaction</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Assigned Work Orders for this Karigar */}
                <div>
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Assigned Work Orders ({karigarLedger.all_work_orders?.length || 0})
                  </h3>
                  <div className="overflow-x-auto border border-stone-200 rounded-xl bg-white shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-stone-100/70 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                          <th className="py-2.5 px-3">Work Order #</th>
                          <th className="py-2.5 px-3">Product Name</th>
                          <th className="py-2.5 px-3 text-right">Allotted</th>
                          <th className="py-2.5 px-3 text-right">Completed</th>
                          <th className="py-2.5 px-3 text-right">Wastage</th>
                          <th className="py-2.5 px-3 text-right">Karigar Gold</th>
                          <th className="py-2.5 px-3 text-right">Pending on Bench</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium">
                        {(karigarLedger.all_work_orders || []).length === 0 ? (
                          <tr>
                            <td colSpan="8" className="py-6 text-center text-stone-400">
                              No work orders assigned to this artisan.
                            </td>
                          </tr>
                        ) : (
                          karigarLedger.all_work_orders.map((wo) => {
                            const isCompleted = wo.status === 'completed';
                            return (
                              <tr key={wo.id} className="hover:bg-stone-50/80">
                                <td className="py-2.5 px-3 font-mono font-bold text-[#b01622]">{wo.work_order_number}</td>
                                <td className="py-2.5 px-3 font-bold text-stone-800">{wo.product_name || 'Jewellery Product'}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">{Number(wo.allotted_weight || 0).toFixed(3)}g</td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">{Number(wo.completed_weight || 0).toFixed(3)}g</td>
                                <td className="py-2.5 px-3 text-right font-mono text-stone-600">{Number(wo.wastage_weight || 0).toFixed(3)}g</td>
                                <td className="py-2.5 px-3 text-right font-mono text-purple-700 font-bold">{Number(wo.karigar_gold_weight || 0).toFixed(3)}g</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#b01622]">{Number(wo.pending_weight || 0).toFixed(3)}g</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {wo.status ? wo.status.replace(/_/g, ' ') : 'Ongoing'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Transaction History Audit Ledger */}
                <div>
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Transaction Audit Ledger ({karigarLedger.transactions?.length || 0})
                  </h3>
                  <div className="overflow-x-auto border border-stone-200 rounded-xl bg-white shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-stone-100/70 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Movement Type</th>
                          <th className="py-2.5 px-3">WO Reference</th>
                          <th className="py-2.5 px-3 text-right">Weight</th>
                          <th className="py-2.5 px-3 text-right">Signed Impact</th>
                          <th className="py-2.5 px-3 text-right">Bench Balance</th>
                          <th className="py-2.5 px-3">Reason / Remarks</th>
                          <th className="py-2.5 px-3">Action By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium">
                        {(karigarLedger.transactions || []).length === 0 ? (
                          <tr>
                            <td colSpan="8" className="py-6 text-center text-stone-400">
                              No recorded material transactions yet for this artisan.
                            </td>
                          </tr>
                        ) : (
                          karigarLedger.transactions.map((tx) => {
                            const isPositive = Number(tx.signed_change) > 0;
                            return (
                              <tr key={tx.id} className="hover:bg-stone-50/80">
                                <td className="py-2.5 px-3 whitespace-nowrap text-stone-600 font-mono">
                                  {tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString('en-GB') : '—'}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800">
                                    {tx.transaction_type ? tx.transaction_type.replace(/_/g, ' ') : 'Movement'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-[#b01622]">
                                  {tx.work_order?.work_order_number || '—'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                                  {Number(tx.weight || 0).toFixed(3)}g
                                </td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                                  isPositive ? 'text-amber-800' : 'text-emerald-700'
                                }`}>
                                  {isPositive ? '+' : ''}{Number(tx.signed_change || 0).toFixed(3)}g
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-stone-700 whitespace-nowrap">
                                  {Number(tx.bench_balance_after || 0).toFixed(3)}g
                                </td>
                                <td className="py-2.5 px-3 text-stone-600 max-w-[200px] truncate" title={tx.reason}>
                                  {tx.reason || '—'}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap text-stone-500 font-medium">
                                  {tx.action_by_name || 'Admin'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
          <div className="text-xs text-stone-500 font-medium">
            {activeTab === 'allocations' ? (
              <>Showing <strong className="text-stone-900">{filteredJobs.length}</strong> active material allocations</>
            ) : (
              <>Managing Artisan Material Ledger &bull; Strictly Audited</>
            )}
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
