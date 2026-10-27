import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { normalizeNumericInput, handleNumericFocus } from '../utils/numberInputUtils';
import Pagination from './Pagination';

const convertToFineGold = (weight, purityStr) => {
  const wt = Number(weight || 0);
  if (wt <= 0) return 0;
  const str = String(purityStr || '').toUpperCase().trim();
  if (str.includes('24K') || str.includes('999') || str.includes('PURE')) return wt;
  if (str.includes('22K') || str.includes('916')) return wt * (22.0 / 24.0);
  if (str.includes('18K') || str.includes('750')) return wt * (18.0 / 24.0);
  if (str.includes('14K') || str.includes('585')) return wt * (14.0 / 24.0);
  const numTouch = parseFloat(str);
  if (!isNaN(numTouch) && numTouch > 1) return wt * (numTouch / 100);
  return wt * (22.0 / 24.0);
};

export default function MaterialAllocationModal({
  isOpen,
  onClose,
  summaryData = {},
  liveJobs = [],
  initialKarigarId = null,
  initialWorkOrderId = null,
  initialTab = 'allocations'
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState(initialTab || 'allocations'); // 'allocations' or 'karigar_management'
  const [filterMaterial, setFilterMaterial] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Karigar Management State
  const [karigarsList, setKarigarsList] = useState([]);
  const [selectedKarigarId, setSelectedKarigarId] = useState(initialKarigarId ? String(initialKarigarId) : '');
  const [karigarLedger, setKarigarLedger] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [stampsList, setStampsList] = useState([]);

  // Audit Ledger Pagination State
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerItemsPerPage, setLedgerItemsPerPage] = useState(10);

  // Work Order Requirement State for "Material Allocation Needed" Section
  const [workOrderRequirements, setWorkOrderRequirements] = useState(null);
  const [loadingRequirements, setLoadingRequirements] = useState(false);

  // Multi-Row Material Allocation Form State
  const [allocationWorkOrderId, setAllocationWorkOrderId] = useState(initialWorkOrderId ? String(initialWorkOrderId) : '');
  const [allocationDate, setAllocationDate] = useState(new Date().toISOString().split('T')[0]);
  const [allocationNotes, setAllocationNotes] = useState('');
  const [allocationRows, setAllocationRows] = useState([
    {
      source: 'vault',
      material_type: 'gold',
      material_item: '24K Raw Pure Gold',
      purity: '24K',
      touch: 100.0,
      stamp: '',
      stamp_id: null,
      sieve_size: '',
      unit: 'g',
      pieces: 1,
      gross_weight: '',
      net_weight: '',
      fine_weight: '',
      notes: ''
    }
  ]);
  const [submittingMultiAllocation, setSubmittingMultiAllocation] = useState(false);

  // Cash / Making Charges Settlement State
  const [cashForm, setCashForm] = useState({
    transaction_type: 'payment', // payment, advance, adjustment
    amount: '',
    payment_mode: 'cash', // cash, bank_transfer, upi, cheque, adjustment
    reference_no: '',
    transaction_date: new Date().toISOString().split('T')[0],
    work_order_id: '',
    notes: '',
  });
  const [submittingCash, setSubmittingCash] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      if (initialKarigarId) {
        setSelectedKarigarId(String(initialKarigarId));
      }
      if (initialWorkOrderId) {
        setAllocationWorkOrderId(String(initialWorkOrderId));
      }
      fetchKarigars();
      fetchStamps();
    }
  }, [isOpen, initialKarigarId, initialWorkOrderId, initialTab]);

  const fetchWorkOrderRequirements = async (woId) => {
    if (!woId) {
      setWorkOrderRequirements(null);
      return;
    }
    try {
      setLoadingRequirements(true);
      const res = await api.get(`/work-orders/${woId}/material-requirements`);
      if (res.data?.status === 'success' && res.data.data) {
        setWorkOrderRequirements(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load work order material requirements:', err);
      // Fallback from karigarLedger if available
      const matchedWo = (karigarLedger?.all_work_orders || []).find(w => String(w.id) === String(woId));
      if (matchedWo?.material_requirements) {
        setWorkOrderRequirements(matchedWo.material_requirements);
      }
    } finally {
      setLoadingRequirements(false);
    }
  };

  useEffect(() => {
    if (allocationWorkOrderId) {
      fetchWorkOrderRequirements(allocationWorkOrderId);
    } else {
      setWorkOrderRequirements(null);
    }
  }, [allocationWorkOrderId]);

  const fetchStamps = async () => {
    try {
      const res = await api.get('/stamps');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setStampsList(list);
    } catch (err) {
      console.warn('Failed to load stamps:', err);
    }
  };

  const fetchKarigars = async () => {
    try {
      const res = await api.get('/karigar-materials');
      const list = res.data?.data || [];
      setKarigarsList(list);
      if (initialKarigarId && list.some(k => String(k.id) === String(initialKarigarId))) {
        setSelectedKarigarId(String(initialKarigarId));
      } else if (list.length > 0 && (!selectedKarigarId || !list.some(k => String(k.id) === String(selectedKarigarId)))) {
        setSelectedKarigarId(String(list[0].id));
      }
    } catch (err) {
      console.warn('Failed to load karigar materials:', err);
    }
  };

  useEffect(() => {
    if (selectedKarigarId) {
      setLedgerPage(1);
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

  // Helper to handle row field updates with fine weight calculation
  const updateAllocationRow = (index, field, value) => {
    setAllocationRows(prev => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };

      if (field === 'material_type') {
        if (value === 'gold') {
          row.unit = 'g';
          if (!row.purity) row.purity = '24K';
          row.touch = 100.0;
        } else if (value === 'diamond') {
          row.unit = 'ct';
          row.purity = '';
          row.touch = 0;
          row.fine_weight = 0;
        } else if (value === 'stone' || value === 'colour_stone') {
          row.unit = 'pcs';
          row.purity = '';
          row.touch = 0;
          row.fine_weight = 0;
        }
      }

      if (field === 'purity' && row.material_type === 'gold') {
        const p = String(value).toUpperCase();
        if (p.includes('24K') || p.includes('999')) row.touch = 100.0;
        else if (p.includes('22K') || p.includes('916')) row.touch = 91.6;
        else if (p.includes('18K') || p.includes('750')) row.touch = 75.0;
        else if (p.includes('14K') || p.includes('585')) row.touch = 58.5;
        else {
          const num = parseFloat(p.replace(/[^0-9.]/g, ''));
          if (!isNaN(num) && num > 0) row.touch = num <= 1.0 ? num * 100 : num;
        }
      }

      if (field === 'touch' && row.material_type === 'gold') {
        row.touch = value;
      }

      if (field === 'gross_weight' && (!row.net_weight || row.net_weight === '')) {
        row.net_weight = value;
      }

      // Formula: Fine Weight = Net Gold Weight * Purity Percentage / 100
      if (row.material_type === 'gold') {
        if (field === 'fine_weight') {
          row.fine_weight = value;
        } else {
          const net = parseFloat(row.net_weight || row.gross_weight || 0);
          const touch = parseFloat(row.touch !== '' && row.touch !== undefined ? row.touch : 100);
          row.fine_weight = net > 0 ? (net * (touch / 100)).toFixed(3) : '';
        }
      } else {
        row.fine_weight = 0;
      }

      updated[index] = row;
      return updated;
    });
  };

  const addAllocationRow = () => {
    setAllocationRows(prev => [
      ...prev,
      {
        material_type: 'gold',
        material_item: '',
        purity: '22K',
        touch: 91.6,
        stamp: '',
        sieve_size: '',
        unit: 'g',
        pieces: 1,
        gross_weight: '',
        net_weight: '',
        fine_weight: '',
        notes: ''
      }
    ]);
  };

  const removeAllocationRow = (index) => {
    if (allocationRows.length <= 1) {
      showToast?.('At least one material row is required', 'info');
      return;
    }
    setAllocationRows(prev => prev.filter((_, idx) => idx !== index));
  };

  // Helper to pre-fill remaining fine gold requirement
  const handlePrefillGold = (remFine) => {
    const fineGrams = parseFloat(remFine || 0);
    if (fineGrams <= 0) return;
    setAllocationRows(prev => {
      const newRow = {
        source: 'vault',
        material_type: 'gold',
        material_item: '24K Raw Pure Gold',
        purity: '24K',
        touch: 100.0,
        stamp: '',
        stamp_id: null,
        sieve_size: '',
        unit: 'g',
        pieces: 1,
        gross_weight: fineGrams.toFixed(3),
        net_weight: fineGrams.toFixed(3),
        fine_weight: fineGrams.toFixed(3),
        notes: `Work Order #${workOrderRequirements?.work_order_number || allocationWorkOrderId} Fine Gold allocation`,
      };
      if (prev.length === 1 && (!prev[0].gross_weight || prev[0].gross_weight === '')) {
        return [newRow];
      }
      return [...prev, newRow];
    });
    showToast?.(`Added ${fineGrams.toFixed(3)}g 24K Fine Gold to allocation rows`, 'info');
  };

  // Helper to pre-fill remaining diamond requirement
  const handlePrefillDiamond = (dReq) => {
    const remCt = parseFloat(dReq.remaining_carats || 0);
    const remPcs = dReq.has_pieces ? parseInt(dReq.remaining_pieces || 0, 10) : 1;
    if (remCt <= 0 && (!dReq.has_pieces || remPcs <= 0)) return;

    setAllocationRows(prev => {
      const newRow = {
        source: 'vault',
        material_type: 'diamond',
        material_item: `${dReq.name || dReq.stamp} Diamond`,
        purity: '',
        touch: 0,
        stamp: dReq.stamp,
        stamp_id: dReq.stamp_id || null,
        sieve_size: dReq.stamp,
        unit: 'ct',
        pieces: remPcs,
        gross_weight: remCt.toFixed(3),
        net_weight: remCt.toFixed(3),
        fine_weight: 0,
        notes: `Work Order #${workOrderRequirements?.work_order_number || allocationWorkOrderId} Diamond [${dReq.stamp}]`,
      };
      if (prev.length === 1 && (!prev[0].gross_weight || prev[0].gross_weight === '')) {
        return [newRow];
      }
      return [...prev, newRow];
    });
    showToast?.(`Added ${remCt.toFixed(3)}ct ${dReq.stamp} to allocation rows`, 'info');
  };

  // Helper to pre-fill all remaining requirements (Gold + all Diamond stamps)
  const handlePrefillAll = () => {
    if (!workOrderRequirements) return;
    const rowsToAdd = [];

    const remGold = parseFloat(workOrderRequirements.gold_requirement?.remaining_fine_gold || 0);
    if (remGold > 0.0001) {
      rowsToAdd.push({
        source: 'vault',
        material_type: 'gold',
        material_item: '24K Raw Pure Gold',
        purity: '24K',
        touch: 100.0,
        stamp: '',
        stamp_id: null,
        sieve_size: '',
        unit: 'g',
        pieces: 1,
        gross_weight: remGold.toFixed(3),
        net_weight: remGold.toFixed(3),
        fine_weight: remGold.toFixed(3),
        notes: `Work Order #${workOrderRequirements.work_order_number} Fine Gold requirement`,
      });
    }

    (workOrderRequirements.diamond_requirements || []).forEach(dReq => {
      const remCt = parseFloat(dReq.remaining_carats || 0);
      const remPcs = dReq.has_pieces ? parseInt(dReq.remaining_pieces || 0, 10) : 1;
      if (remCt > 0.0001 || (dReq.has_pieces && remPcs > 0)) {
        rowsToAdd.push({
          source: 'vault',
          material_type: 'diamond',
          material_item: `${dReq.name || dReq.stamp} Diamond`,
          purity: '',
          touch: 0,
          stamp: dReq.stamp,
          stamp_id: dReq.stamp_id || null,
          sieve_size: dReq.stamp,
          unit: 'ct',
          pieces: remPcs,
          gross_weight: remCt.toFixed(3),
          net_weight: remCt.toFixed(3),
          fine_weight: 0,
          notes: `Work Order #${workOrderRequirements.work_order_number} Diamond [${dReq.stamp}]`,
        });
      }
    });

    if (rowsToAdd.length === 0) {
      showToast?.('All material requirements for this Work Order are already fulfilled!', 'info');
      return;
    }

    setAllocationRows(rowsToAdd);
    showToast?.(`Populated ${rowsToAdd.length} requirement row(s) for allocation`, 'success');
  };

  // Submit Multi-Row Material Allocation
  const handleMultiRowAllocate = async (e) => {
    e.preventDefault();
    if (!selectedKarigarId) {
      showToast?.('Please select a Karigar', 'error');
      return;
    }
    if (allocationRows.length === 0) {
      showToast?.('Please add at least one material row', 'error');
      return;
    }
    for (let i = 0; i < allocationRows.length; i++) {
      const r = allocationRows[i];
      const wt = parseFloat(r.gross_weight || r.net_weight || 0);
      const pcs = parseInt(r.pieces || 0, 10);
      if (wt <= 0 && pcs <= 0) {
        showToast?.(`Row #${i + 1}: Please enter a valid weight or piece count`, 'error');
        return;
      }
    }

    try {
      setSubmittingMultiAllocation(true);
      const payload = {
        work_order_id: allocationWorkOrderId || null,
        allocation_date: allocationDate,
        notes: allocationNotes,
        materials: allocationRows.map(r => ({
          source: r.source || 'vault',
          material_type: r.material_type,
          material_item: r.material_item || null,
          purity: r.purity || null,
          touch: parseFloat(r.touch) || null,
          stamp: r.stamp || null,
          stamp_id: r.stamp_id || null,
          sieve_size: r.sieve_size || null,
          unit: r.unit || (r.material_type === 'diamond' ? 'ct' : 'g'),
          pieces: parseInt(r.pieces || 0, 10),
          gross_weight: parseFloat(r.gross_weight) || parseFloat(r.net_weight) || 0,
          net_weight: parseFloat(r.net_weight) || parseFloat(r.gross_weight) || 0,
          fine_weight: parseFloat(r.fine_weight) || 0,
          notes: r.notes || null,
        })),
      };

      const res = await api.post(`/karigars/${selectedKarigarId}/allocate-materials`, payload);
      showToast?.(res.data?.message || 'Materials allocated successfully!', 'success');

      setAllocationRows([
        {
          source: 'vault',
          material_type: 'gold',
          material_item: '24K Raw Pure Gold',
          purity: '24K',
          touch: 100.0,
          stamp: '',
          stamp_id: null,
          sieve_size: '',
          unit: 'g',
          pieces: 1,
          gross_weight: '',
          net_weight: '',
          fine_weight: '',
          notes: ''
        }
      ]);
      setAllocationNotes('');

      // Refresh requirements from persisted backend response or fetch
      if (res.data?.material_requirements) {
        setWorkOrderRequirements(res.data.material_requirements);
      } else if (allocationWorkOrderId) {
        await fetchWorkOrderRequirements(allocationWorkOrderId);
      }

      await fetchKarigarLedger(selectedKarigarId);
      await fetchKarigars();
    } catch (err) {
      console.error('Allocate materials error:', err);
      showToast?.(err.response?.data?.message || 'Failed to allocate materials', 'error');
    } finally {
      setSubmittingMultiAllocation(false);
    }
  };

  // Submit Cash / Making Charges Settlement
  const handleCashSubmit = async (e) => {
    e.preventDefault();
    if (!selectedKarigarId) {
      showToast?.('Please select a Karigar', 'error');
      return;
    }
    const amt = parseFloat(cashForm.amount);
    if (!amt || amt <= 0) {
      showToast?.('Please enter a valid amount greater than zero', 'error');
      return;
    }

    try {
      setSubmittingCash(true);
      const res = await api.post(`/karigars/${selectedKarigarId}/settle-cash`, {
        transaction_type: cashForm.transaction_type,
        amount: amt,
        payment_mode: cashForm.payment_mode,
        reference_no: cashForm.reference_no,
        transaction_date: cashForm.transaction_date,
        work_order_id: cashForm.work_order_id || null,
        notes: cashForm.notes,
      });
      showToast?.(res.data?.message || 'Payment recorded successfully!', 'success');
      setCashForm(prev => ({
        ...prev,
        amount: '',
        reference_no: '',
        notes: '',
      }));
      await fetchKarigarLedger(selectedKarigarId);
      await fetchKarigars();
    } catch (err) {
      console.error('Cash settlement error:', err);
      showToast?.(err.response?.data?.message || 'Failed to record cash transaction', 'error');
    } finally {
      setSubmittingCash(false);
    }
  };

  // Reversal handler for material transactions
  const handleReverseTransaction = async (txId) => {
    const reason = window.prompt('Please enter mandatory reason for reversing transaction #' + txId + ':');
    if (!reason || !reason.trim()) {
      showToast?.('Reversal cancelled: reason is required.', 'info');
      return;
    }
    try {
      const res = await api.post(`/karigars/${selectedKarigarId}/reverse-material-transaction/${txId}`, { reason: reason.trim() });
      showToast?.(res.data?.message || 'Transaction reversed successfully', 'success');
      fetchKarigarLedger(selectedKarigarId);
      fetchKarigars();
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Failed to reverse transaction', 'error');
    }
  };

  if (!isOpen) return null;

  const sumLiveAllotted = liveJobs.reduce((acc, job) => acc + Number(job.allotted_weight || 0), 0);
  const sumLivePending = liveJobs.reduce((acc, job) => acc + Number(job.pending_weight || 0), 0);

  const allocatedWeightVal = Number(summaryData?.allocated_weight ?? sumLiveAllotted);
  const remainingWeightVal = Number(summaryData?.remaining_weight ?? sumLivePending);
  const activeJobsCount = Number(summaryData?.active_jobs_count ?? liveJobs.length);
  const totalKarigarsCount = Number(summaryData?.total_karigars ?? karigarsList.length);

  const filteredJobs = liveJobs.filter((job) => {
    const matchesMat = filterMaterial === 'all' || (job.material_type || '').toLowerCase().includes(filterMaterial.toLowerCase());
    const matchesSearch = !searchTerm ||
      (job.work_order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.karigar_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMat && matchesSearch;
  });

  const fin = karigarLedger?.financial_summary || {};
  const currentPayableVal = Number(fin.outstanding_payable || 0);
  const proposedAmt = parseFloat(cashForm.amount) || 0;
  const previewRemainingPayable = Math.max(0, currentPayableVal - proposedAmt);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150 font-['Inter',sans-serif]">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-lg font-bold shadow-2xs">
              <i className="fa-solid fa-vault"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 leading-tight">Material Allocation &amp; Karigar Accounting Hub</h2>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  Audited Ledger
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Multi-row material allocations, gold fine weight calculation, making charges settlement, and balance reconciliation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
                <span>Karigar Management &amp; Settlement</span>
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
            <div className="p-5 border-b border-stone-100 bg-gradient-to-br from-red-50/40 via-amber-50/30 to-stone-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white p-3.5 rounded-xl border border-red-100 shadow-2xs">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Allotted Metal</div>
                  <div className="text-xl font-black text-stone-900 font-mono mt-0.5">
                    {allocatedWeightVal.toFixed(3)} <span className="text-xs font-sans text-stone-500 font-bold">g</span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-medium mt-1">
                    Active Runs: <strong className="text-gray-900">{activeJobsCount} Jobs</strong>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-2xs">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Remaining on Bench</div>
                  <div className="text-xl font-black text-[#b01622] font-mono mt-0.5">
                    {remainingWeightVal.toFixed(3)} <span className="text-xs font-sans text-stone-500 font-bold">g</span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-medium mt-1">
                    Pending physical piece recovery
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Artisan Capacity</div>
                  <div className="text-xl font-black text-blue-900 font-mono mt-0.5">
                    {totalKarigarsCount} <span className="text-xs font-sans text-stone-500 font-bold">Artisans</span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-medium mt-1">
                    Workshop benches ready
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Quick Action</div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('karigar_management')}
                    className="mt-2 w-full py-1.5 px-3 bg-[#b01622] hover:bg-[#8f1019] text-white font-bold rounded-lg text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <i className="fa-solid fa-plus text-xs"></i>
                    <span>Allocate to Karigar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter controls */}
            <div className="px-6 py-3 border-b border-stone-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Filter by Order #, Product, Artisan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 placeholder-stone-400 focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Material:</span>
                <select
                  value={filterMaterial}
                  onChange={(e) => setFilterMaterial(e.target.value)}
                  className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 focus:outline-hidden focus:border-[#b01622]"
                >
                  <option value="all">All Materials</option>
                  <option value="gold">Gold</option>
                  <option value="diamond">Diamond</option>
                  <option value="stone">Colour Stone</option>
                </select>
              </div>
            </div>

            {/* Table of active jobs */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-[10.5px] font-bold text-stone-500 uppercase tracking-wider">
                      <th className="py-3 px-3 text-center w-12">#</th>
                      <th className="py-3 px-3">Work Order #</th>
                      <th className="py-3 px-3">Product Name</th>
                      <th className="py-3 px-3">Artisan / Karigar</th>
                      <th className="py-3 px-3 text-right">Allotted Gross</th>
                      <th className="py-3 px-3 text-right bg-amber-50/50">Fine Gold 24K</th>
                      <th className="py-3 px-3 text-right">Completed</th>
                      <th className="py-3 px-3 text-right">Pending</th>
                      <th className="py-3 px-3 text-right">Diamonds</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {filteredJobs.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="py-8 text-center text-stone-400">
                          No active work order allocations match your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredJobs.map((job, idx) => {
                        const purity = job.purity || job.material || job.material_type || '22K Gold';
                        const fineAllotted = job.fine_weight !== undefined
                          ? Number(job.fine_weight)
                          : convertToFineGold(Number(job.allotted_weight || 0), purity);
                        const diaCt = Number(job.diamond_allotted || job.diamond_pending || 0);
                        const diaPcs = Number(job.diamond_count || job.diamond_pending_count || 0);

                        return (
                          <tr key={job.id || idx} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-stone-400 font-medium">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#b01622]">{job.work_order_number}</td>
                            <td className="py-2.5 px-3 font-bold text-stone-800">{job.product_name || 'Jewellery Item'}</td>
                            <td className="py-2.5 px-3 text-stone-700 font-medium">
                              {job.karigar_name || (job.worker_allocation?.worker_name) || 'Artisan'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                              {Number(job.allotted_weight || 0).toFixed(3)}g
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-amber-900 bg-amber-50/40">
                              {fineAllotted.toFixed(3)} <span className="text-[10px] font-sans font-semibold text-amber-700">24K</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                              {Number(job.completed_weight || 0).toFixed(3)}g
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[#b01622]">
                              {Number(job.pending_weight || 0).toFixed(3)}g
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              {diaCt > 0 || diaPcs > 0 ? (
                                <div>
                                  <span className="font-mono font-bold text-blue-700">{diaCt.toFixed(3)} ct</span>
                                  {diaPcs > 0 && <span className="text-[10px] text-stone-400 block font-mono">({diaPcs} pcs)</span>}
                                </div>
                              ) : (
                                <span className="text-stone-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 capitalize">
                                {job.status?.replace(/_/g, ' ') || 'In Progress'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleManageKarigarClick(job.karigar_id)}
                                className="px-2.5 py-1 text-[11px] font-bold text-stone-700 bg-stone-100 hover:bg-[#b01622] hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Manage Karigar Allocation & Ledger"
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
                  {karigarsList.length === 0 ? (
                    <div className="mt-1 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                      No artisans found in master list.
                    </div>
                  ) : (
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
                  )}
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
                {/* 1. Overall Balance Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-center">
                    <span className="text-[9.5px] font-bold text-amber-800 uppercase block truncate">Total Issued (Fine 24K)</span>
                    <span className="font-mono font-black text-stone-900 text-sm mt-0.5 block">
                      {Number(karigarLedger.summary?.total_issued_fine || 0).toFixed(3)}g
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                    <span className="text-[9.5px] font-bold text-emerald-800 uppercase block truncate">Total Received (Fine 24K)</span>
                    <span className="font-mono font-black text-emerald-950 text-sm mt-0.5 block">
                      {Number(karigarLedger.summary?.total_received_fine || 0).toFixed(3)}g
                    </span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                    <span className="text-[9.5px] font-bold text-rose-800 uppercase block truncate">Approved Wastage</span>
                    <span className="font-mono font-black text-rose-950 text-sm mt-0.5 block">
                      {Number(karigarLedger.summary?.total_wastage_fine || 0).toFixed(3)}g
                    </span>
                  </div>
                  <div className={`p-3 rounded-xl border text-center shadow-2xs ${
                    Number(karigarLedger.summary?.outstanding_gold_fine || 0) < 0
                      ? 'bg-purple-100 border-purple-400 text-purple-900'
                      : 'bg-red-50 border-red-300 text-[#b01622]'
                  }`}>
                    <span className="text-[9.5px] font-black uppercase block truncate">
                      {Number(karigarLedger.summary?.outstanding_gold_fine || 0) < 0 ? 'Company Owes Gold' : 'Gold on Bench (Fine)'}
                    </span>
                    <span className="font-mono font-black text-sm mt-0.5 block">
                      {Number(karigarLedger.summary?.outstanding_gold_fine || 0).toFixed(3)}g
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-center">
                    <span className="text-[9.5px] font-bold text-blue-800 uppercase block truncate">Diamond on Bench</span>
                    <span className="font-mono font-black text-stone-900 text-sm mt-0.5 block">
                      {Number(karigarLedger.summary?.diamond_on_bench || 0).toFixed(3)} ct
                    </span>
                    <span className="text-[10px] text-blue-600 block mt-0.5 font-bold">
                      Count: {karigarLedger.summary?.diamond_count_on_bench || 0} pcs
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-300 text-center shadow-2xs">
                    <span className="text-[9.5px] font-black text-emerald-800 uppercase block truncate">Making Charges Payable</span>
                    <span className="font-mono font-black text-emerald-900 text-sm mt-0.5 block">
                      ₹{Number(fin.outstanding_payable || 0).toLocaleString()}
                    </span>
                    {Number(fin.excess_advance || 0) > 0 && (
                      <span className="text-[10px] text-purple-700 block font-bold">
                        Advance: ₹{Number(fin.excess_advance).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Gold Breakdown by Purity */}
                {Array.isArray(karigarLedger.summary?.gold_by_purity) && karigarLedger.summary.gold_by_purity.length > 0 && (
                  <div className="bg-white rounded-2xl border border-amber-200/90 p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        <i className="fa-solid fa-gem text-amber-600"></i>
                        Gold Breakdown by Purity (Issued vs Received vs Wastage)
                      </h4>
                      <span className="text-[10.5px] text-stone-500 font-medium">Fine Weight = Net Weight × Touch% ÷ 100</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-amber-50/70 text-amber-950 font-bold uppercase text-[10px] border-b border-amber-200">
                            <th className="py-2 px-3">Purity</th>
                            <th className="py-2 px-3 text-right">Touch %</th>
                            <th className="py-2 px-3 text-right">Issued (Gross / Net)</th>
                            <th className="py-2 px-3 text-right">Issued Fine 24K</th>
                            <th className="py-2 px-3 text-right">Received (Gross / Net)</th>
                            <th className="py-2 px-3 text-right">Received Fine 24K</th>
                            <th className="py-2 px-3 text-right">Approved Wastage</th>
                            <th className="py-2 px-3 text-right">Outstanding Net</th>
                            <th className="py-2 px-3 text-right">Outstanding Fine 24K</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100 font-medium">
                          {karigarLedger.summary.gold_by_purity.map((gp, gIdx) => (
                            <tr key={gIdx} className="hover:bg-amber-50/40">
                              <td className="py-2 px-3 font-bold text-stone-900">{gp.purity}</td>
                              <td className="py-2 px-3 text-right font-mono text-stone-600">{Number(gp.touch || 0).toFixed(1)}%</td>
                              <td className="py-2 px-3 text-right font-mono text-stone-800">{Number(gp.issued_gross || 0).toFixed(3)}g / {Number(gp.issued_net || 0).toFixed(3)}g</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-amber-900">{Number(gp.issued_fine || 0).toFixed(3)}g</td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-800">{Number(gp.received_gross || 0).toFixed(3)}g / {Number(gp.received_net || 0).toFixed(3)}g</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900">{Number(gp.received_fine || 0).toFixed(3)}g</td>
                              <td className="py-2 px-3 text-right font-mono text-rose-700">{Number(gp.wastage_fine || 0).toFixed(3)}g</td>
                              <td className={`py-2 px-3 text-right font-mono font-bold ${Number(gp.outstanding_net || 0) < 0 ? 'text-purple-700' : 'text-stone-900'}`}>
                                {Number(gp.outstanding_net || 0).toFixed(3)}g
                              </td>
                              <td className={`py-2 px-3 text-right font-mono font-black ${Number(gp.outstanding_fine || 0) < 0 ? 'text-purple-800 bg-purple-50 rounded px-1.5' : 'text-[#b01622]'}`}>
                                {Number(gp.outstanding_fine || 0).toFixed(3)}g
                                {Number(gp.outstanding_fine || 0) < 0 && <span className="block text-[9px] font-normal text-purple-600">Excess returned</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. MULTI-ROW MATERIAL ALLOCATION FORM */}
                <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#b01622] text-white flex items-center justify-center text-xs">
                        <i className="fa-solid fa-boxes-stacked"></i>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                          Allocate Materials to Karigar (Multi-Row Supported)
                        </h3>
                        <p className="text-[11px] text-stone-500">Gold, Diamonds, Stones, and Alloys issued with automatic stock validation &amp; 24K fine weight calculation</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={addAllocationRow}
                        className="px-3 py-1.5 bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-plus text-[#b01622]"></i>
                        <span>Add Material Row</span>
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleMultiRowAllocate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-xl border border-stone-200">
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Work Order Reference (Optional)</label>
                        <select
                          value={allocationWorkOrderId}
                          onChange={(e) => setAllocationWorkOrderId(e.target.value)}
                          className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg font-bold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                        >
                          <option value="">General Allocation (No specific WO)</option>
                          {(karigarLedger.all_work_orders || []).map((wo) => (
                            <option key={wo.id} value={wo.id}>
                              {wo.work_order_number} — {wo.product_name || 'Jewellery Piece'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Allocation Date *</label>
                        <input
                          type="date"
                          required
                          value={allocationDate}
                          onChange={(e) => setAllocationDate(e.target.value)}
                          className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg font-medium text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Global Audit Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. Issued for casting and setting batch"
                          value={allocationNotes}
                          onChange={(e) => setAllocationNotes(e.target.value)}
                          className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg font-medium text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                        />
                      </div>
                    </div>

                    {/* MATERIAL ALLOCATION NEEDED SECTION */}
                    {allocationWorkOrderId && (
                      <div className="bg-white rounded-2xl border-2 border-amber-300 p-4 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-900 flex items-center justify-center font-bold text-sm shadow-2xs">
                              <i className="fa-solid fa-clipboard-list"></i>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-stone-900">
                                  Material Allocation Needed
                                </h4>
                                {workOrderRequirements && (
                                  <span className="font-mono text-[11px] font-bold text-[#b01622] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                    WO: {workOrderRequirements.work_order_number}
                                  </span>
                                )}
                              </div>
                              {workOrderRequirements ? (
                                <p className="text-[11px] text-stone-600 mt-0.5 font-medium">
                                  Product: <span className="font-bold text-stone-800">{workOrderRequirements.product_name}</span> •{' '}
                                  Design: <span className="font-mono font-bold text-stone-800">{workOrderRequirements.design_code}</span> •{' '}
                                  Assigned Artisan: <span className="font-bold text-stone-800">{workOrderRequirements.karigar_name}</span>
                                </p>
                              ) : (
                                <p className="text-[11px] text-stone-500">Loading requirement breakdown from persisted work order data...</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {loadingRequirements ? (
                              <span className="text-xs text-stone-400 flex items-center gap-1.5 font-medium">
                                <i className="fa-solid fa-circle-notch fa-spin text-amber-600"></i> Fetching requirements...
                              </span>
                            ) : workOrderRequirements?.is_all_fully_allocated ? (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                                <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                <span>Fully Allocated</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handlePrefillAll}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-900 font-black rounded-lg text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                title="Populate allocation rows with all remaining fine gold and diamond requirements"
                              >
                                <i className="fa-solid fa-bolt text-xs"></i>
                                <span>Pre-fill All Remaining</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {workOrderRequirements && (
                          <div className="space-y-3.5">
                            {/* 24K Fine Gold Requirement Card */}
                            <div className="bg-amber-50/60 border border-amber-200/90 rounded-xl p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-amber-950 flex items-center gap-2 uppercase tracking-wide">
                                  <i className="fa-solid fa-coins text-amber-600"></i>
                                  <span>24K Fine-Gold Requirement (Grams)</span>
                                </span>
                                <span className="text-[10px] text-amber-800 font-mono bg-white px-2 py-0.5 rounded border border-amber-200">
                                  Gold Basis: 24K Fine Equivalent Exclusively
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                                <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                                  <span className="text-[10.5px] text-stone-500 block">Required 24K Fine Gold</span>
                                  <span className="text-sm font-extrabold text-stone-900 font-mono block mt-0.5">
                                    {Number(workOrderRequirements.gold_requirement?.required_fine_gold || 0).toFixed(3)} g
                                  </span>
                                  <span className="text-[9.5px] text-stone-500 block mt-0.5">
                                    From {Number(workOrderRequirements.gold_requirement?.net_gold_weight || 0).toFixed(3)}g net @ {Number(workOrderRequirements.gold_requirement?.touch || 100).toFixed(2)}% ({workOrderRequirements.gold_requirement?.purity_label})
                                  </span>
                                </div>

                                <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                                  <span className="text-[10.5px] text-stone-500 block">Previously Allocated</span>
                                  <span className="text-sm font-extrabold text-stone-900 font-mono block mt-0.5">
                                    {Number(workOrderRequirements.gold_requirement?.allocated_fine_gold || 0).toFixed(3)} g
                                  </span>
                                  <span className="text-[9.5px] text-stone-500 block mt-0.5">
                                    Persisted 24K equivalent
                                  </span>
                                </div>

                                <div className={`p-2.5 rounded-lg border ${Number(workOrderRequirements.gold_requirement?.remaining_fine_gold || 0) > 0 ? 'bg-amber-100/70 border-amber-300' : 'bg-emerald-50 border-emerald-200'}`}>
                                  <span className="text-[10.5px] font-bold text-stone-700 block">Remaining Fine Gold</span>
                                  <span className={`text-sm font-black font-mono block mt-0.5 ${Number(workOrderRequirements.gold_requirement?.remaining_fine_gold || 0) > 0 ? 'text-[#b01622]' : 'text-emerald-700'}`}>
                                    {Number(workOrderRequirements.gold_requirement?.remaining_fine_gold || 0).toFixed(3)} g
                                  </span>
                                  <span className="text-[9.5px] text-stone-600 block mt-0.5">
                                    {Number(workOrderRequirements.gold_requirement?.remaining_fine_gold || 0) > 0 ? 'Pending to allocate' : 'Gold requirement met'}
                                  </span>
                                </div>

                                <div className="bg-white p-2.5 rounded-lg border border-amber-200 flex flex-col justify-center items-center">
                                  {Number(workOrderRequirements.gold_requirement?.remaining_fine_gold || 0) > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => handlePrefillGold(workOrderRequirements.gold_requirement?.remaining_fine_gold)}
                                      className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold rounded-lg text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                      <i className="fa-solid fa-plus text-xs"></i>
                                      <span>Allocate Remaining Gold</span>
                                    </button>
                                  ) : (
                                    <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                                      <i className="fa-solid fa-check"></i> Gold Fulfilled
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Diamond Requirements Section (All stamps supported) */}
                            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-stone-900 flex items-center gap-2 uppercase tracking-wide">
                                  <i className="fa-solid fa-gem text-sky-600"></i>
                                  <span>Diamond Component Requirements (By Stamp / Sieve)</span>
                                </span>
                                <span className="text-[10.5px] text-stone-500 font-mono">
                                  {workOrderRequirements.diamond_requirements?.length || 0} Stamp Type(s) in Work Order
                                </span>
                              </div>

                              {workOrderRequirements.diamond_requirements && workOrderRequirements.diamond_requirements.length > 0 ? (
                                <div className="overflow-x-auto border border-stone-200 rounded-lg bg-white shadow-2xs">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-stone-100 text-[10.5px] font-bold uppercase tracking-wider text-stone-600 border-b border-stone-200">
                                        <th className="py-2 px-3">Diamond Stamp / Master ID</th>
                                        <th className="py-2 px-3 text-right">Required (Carats / Pieces)</th>
                                        <th className="py-2 px-3 text-right">Already Allocated</th>
                                        <th className="py-2 px-3 text-right">Remaining to Allocate</th>
                                        <th className="py-2 px-3 text-center w-28">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 font-medium">
                                      {workOrderRequirements.diamond_requirements.map((dReq, dIdx) => (
                                        <tr key={dIdx} className="hover:bg-stone-50/70">
                                          <td className="py-2.5 px-3">
                                            <div className="flex items-center gap-2">
                                              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                              <span className="font-mono font-bold text-stone-900">{dReq.stamp}</span>
                                              {dReq.stamp_id && (
                                                <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded border border-stone-200 font-mono">
                                                  Master ID: {dReq.stamp_id}
                                                </span>
                                              )}
                                            </div>
                                            {dReq.name && dReq.name !== dReq.stamp && (
                                              <span className="text-[10.5px] text-stone-500 block pl-4">{dReq.name}</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-800">
                                            {Number(dReq.required_carats || 0).toFixed(3)} ct
                                            {dReq.has_pieces && (
                                              <span className="text-stone-500 font-normal ml-1">/ {dReq.required_pieces} pcs</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-mono text-stone-700">
                                            {Number(dReq.allocated_carats || 0).toFixed(3)} ct
                                            {dReq.has_pieces && (
                                              <span className="text-stone-500 font-normal ml-1">/ {dReq.allocated_pieces || 0} pcs</span>
                                            )}
                                          </td>
                                          <td className={`py-2.5 px-3 text-right font-mono font-black ${Number(dReq.remaining_carats || 0) > 0 ? 'text-[#b01622] bg-rose-50/40' : 'text-emerald-700'}`}>
                                            {Number(dReq.remaining_carats || 0).toFixed(3)} ct
                                            {dReq.has_pieces && (
                                              <span className="text-stone-600 font-normal ml-1">/ {dReq.remaining_pieces || 0} pcs</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            {Number(dReq.remaining_carats || 0) > 0 || (dReq.has_pieces && Number(dReq.remaining_pieces || 0) > 0) ? (
                                              <button
                                                type="button"
                                                onClick={() => handlePrefillDiamond(dReq)}
                                                className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold rounded-md text-[11px] transition-colors cursor-pointer shadow-2xs"
                                              >
                                                Allocate
                                              </button>
                                            ) : (
                                              <span className="text-emerald-600 text-xs font-bold flex items-center justify-center gap-1">
                                                <i className="fa-solid fa-check"></i> Fulfilled
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="bg-white border border-dashed border-stone-200 rounded-lg p-3 text-center text-xs text-stone-400 italic">
                                  No diamond components required for this Work Order.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Table of Material Rows */}
                    {karigarLedger && (
                      <div className="mb-3 px-3.5 py-2.5 bg-amber-50/70 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900 font-medium">
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-scale-balanced text-amber-700"></i>
                          <span>
                            <strong>Artisan Bench Balance:</strong> {Number(karigarLedger.summary?.outstanding_gold_fine || 0).toFixed(3)}g Gold (Fine 24K) • {Number(karigarLedger.summary?.diamond_on_bench || 0).toFixed(3)} ct Diamonds
                          </span>
                        </div>
                        <span className="text-[10.5px] text-stone-600 bg-white/90 px-2.5 py-1 rounded-md border border-amber-200 font-mono">
                          Selecting "Karigar Bench" assigns carried-forward metal without re-debiting company vault stock.
                        </span>
                      </div>
                    )}

                    <div className="overflow-x-auto border border-stone-200 rounded-xl bg-white shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                        <thead>
                          <tr className="bg-stone-100/80 text-[10.5px] font-bold uppercase tracking-wider text-stone-600 border-b border-stone-200">
                            <th className="py-2.5 px-2 text-center w-8">#</th>
                            <th className="py-2.5 px-2 w-36">Source</th>
                            <th className="py-2.5 px-2 w-32">Material Type *</th>
                            <th className="py-2.5 px-2 w-44">Item Description</th>
                            <th className="py-2.5 px-2 w-28">Purity / Touch</th>
                            <th className="py-2.5 px-2 w-28">Stamp / Sieve</th>
                            <th className="py-2.5 px-2 text-right w-20">Pieces</th>
                            <th className="py-2.5 px-2 text-right w-24">Gross Wt</th>
                            <th className="py-2.5 px-2 text-right w-24">Net Wt</th>
                            <th className="py-2.5 px-2 text-right w-28">Fine Wt (g)</th>
                            <th className="py-2.5 px-2 text-center w-10">Del</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {allocationRows.map((row, rIdx) => {
                            const isGold = row.material_type === 'gold';
                            const isBench = row.source === 'bench';
                            return (
                              <tr key={rIdx} className={`hover:bg-stone-50/60 ${isBench ? 'bg-purple-50/20' : ''}`}>
                                <td className="py-2 px-2 text-center font-mono text-stone-400 font-bold">{rIdx + 1}</td>
                                <td className="py-2 px-2">
                                  <select
                                    value={row.source || 'vault'}
                                    onChange={(e) => updateAllocationRow(rIdx, 'source', e.target.value)}
                                    className={`w-full px-2 py-1.5 border rounded-lg font-bold text-xs focus:outline-hidden ${
                                      isBench
                                        ? 'bg-purple-50 text-purple-900 border-purple-300'
                                        : 'bg-white text-stone-800 border-stone-300 focus:border-[#b01622]'
                                    }`}
                                    title="Vault Stock debits Company Vault; Karigar Bench carries forward existing artisan material"
                                  >
                                    <option value="vault">🏢 Vault Stock</option>
                                    <option value="bench">🪑 Karigar Bench</option>
                                  </select>
                                </td>
                                <td className="py-2 px-2">
                                  <select
                                    value={row.material_type}
                                    onChange={(e) => updateAllocationRow(rIdx, 'material_type', e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg font-bold text-stone-800 text-xs focus:outline-hidden focus:border-[#b01622]"
                                  >
                                    <option value="gold">Gold (g)</option>
                                    <option value="diamond">Diamond (ct)</option>
                                    <option value="stone">Colour Stone</option>
                                    <option value="silver">Silver (g)</option>
                                    <option value="platinum">Platinum (g)</option>
                                    <option value="other">Other Material</option>
                                  </select>
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    placeholder="e.g. 24K Pure Casting Grain"
                                    value={row.material_item}
                                    onChange={(e) => updateAllocationRow(rIdx, 'material_item', e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  {isGold ? (
                                    <div className="flex items-center gap-1">
                                      <select
                                        value={row.purity}
                                        onChange={(e) => updateAllocationRow(rIdx, 'purity', e.target.value)}
                                        className="w-16 px-1.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
                                      >
                                        <option value="24K">24K</option>
                                        <option value="22K">22K</option>
                                        <option value="18K">18K</option>
                                        <option value="14K">14K</option>
                                      </select>
                                      <input
                                        type="number"
                                        step="0.1"
                                        placeholder="%"
                                        value={row.touch}
                                        onChange={(e) => updateAllocationRow(rIdx, 'touch', e.target.value)}
                                        className="w-14 px-1 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-800 text-right focus:outline-hidden focus:border-[#b01622]"
                                        title="Touch percentage"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-stone-300 font-mono block text-center">—</span>
                                  )}
                                </td>
                                <td className="py-2 px-2">
                                  {row.material_type === 'diamond' ? (
                                    <div className="relative">
                                      <input
                                        type="text"
                                        list={`stamp-options-${rIdx}`}
                                        placeholder="Stamp/Sieve"
                                        value={row.stamp || row.sieve_size || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const matched = stampsList.find(s => s.name?.toLowerCase() === val.toLowerCase() || s.code?.toLowerCase() === val.toLowerCase());
                                          updateAllocationRow(rIdx, 'stamp', val);
                                          updateAllocationRow(rIdx, 'sieve_size', val);
                                          if (matched) {
                                            updateAllocationRow(rIdx, 'stamp_id', matched.id);
                                          }
                                        }}
                                        className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                                      />
                                      <datalist id={`stamp-options-${rIdx}`}>
                                        {stampsList.map((st) => (
                                          <option key={st.id} value={st.name}>
                                            {st.code ? `[${st.code}] ` : ''}{st.name}
                                          </option>
                                        ))}
                                      </datalist>
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder={row.material_type === 'gold' ? '24K / Pure' : 'Stamp/Size'}
                                      value={row.stamp || row.sieve_size || ''}
                                      onChange={(e) => {
                                        updateAllocationRow(rIdx, 'stamp', e.target.value);
                                        updateAllocationRow(rIdx, 'sieve_size', e.target.value);
                                      }}
                                      className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                                    />
                                  )}
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={row.pieces}
                                    onChange={(e) => updateAllocationRow(rIdx, 'pieces', e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 text-right focus:outline-hidden focus:border-[#b01622]"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    step="0.001"
                                    placeholder="0.000"
                                    value={row.gross_weight}
                                    onChange={(e) => updateAllocationRow(rIdx, 'gross_weight', e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 text-right focus:outline-hidden focus:border-[#b01622]"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    step="0.001"
                                    placeholder="0.000"
                                    value={row.net_weight}
                                    onChange={(e) => updateAllocationRow(rIdx, 'net_weight', e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 text-right focus:outline-hidden focus:border-[#b01622]"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  {isGold ? (
                                    <input
                                      type="number"
                                      step="0.001"
                                      placeholder="0.000"
                                      value={row.fine_weight ?? ''}
                                      onChange={(e) => updateAllocationRow(rIdx, 'fine_weight', e.target.value)}
                                      className="w-full px-2 py-1.5 bg-amber-50/70 border border-amber-300 rounded-lg text-xs font-mono font-black text-amber-950 text-right focus:outline-hidden focus:border-amber-600 focus:bg-white"
                                      title="Fine Gold Weight (Net Wt × Purity% / 100)"
                                    />
                                  ) : (
                                    <span className="text-stone-300 font-mono block text-center">—</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeAllocationRow(rIdx)}
                                    className="w-6 h-6 rounded text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Delete Row"
                                  >
                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={submittingMultiAllocation}
                        className="px-6 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {submittingMultiAllocation ? (
                          <>
                            <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                            <span>Processing Material Allocation...</span>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-check text-xs"></i>
                            <span>Confirm Material Allocation ({allocationRows.length} Rows)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* 4. DEDICATED CASH / MAKING CHARGES SETTLEMENT SECTION (Requirement 6) */}
                <div className="bg-gradient-to-br from-emerald-50/50 via-white to-stone-50 rounded-2xl border border-emerald-200 p-5 shadow-2xs">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs">
                      <i className="fa-solid fa-hand-holding-dollar"></i>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                        Karigar Cash / Making Charges Settlement Section
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        Making charges earned from product receipts, partial/full cash settlements, advances, and adjustments
                      </p>
                    </div>
                  </div>

                  {/* Financial Statistics Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                    <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">Total MC Earned</span>
                      <span className="font-mono font-black text-stone-900 text-sm mt-0.5 block">
                        ₹{Number(fin.total_earned || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">Total Cash Paid</span>
                      <span className="font-mono font-black text-emerald-800 text-sm mt-0.5 block">
                        ₹{Number(fin.total_paid || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">Total Advances</span>
                      <span className="font-mono font-black text-purple-800 text-sm mt-0.5 block">
                        ₹{Number(fin.total_advances || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">Adjustments</span>
                      <span className="font-mono font-black text-stone-700 text-sm mt-0.5 block">
                        ₹{Number(fin.total_adjustments || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className={`p-3 rounded-xl border shadow-2xs ${
                      Number(fin.outstanding_payable || 0) > 0 ? 'bg-emerald-100 border-emerald-300 text-emerald-950' : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}>
                      <span className="text-[10px] font-black uppercase block">Current Payable Due</span>
                      <span className="font-mono font-black text-sm mt-0.5 block">
                        ₹{Number(fin.outstanding_payable || 0).toLocaleString()}
                      </span>
                      {Number(fin.excess_advance || 0) > 0 && (
                        <span className="text-[9.5px] font-bold text-purple-700 block mt-0.5">
                          Excess Advance: ₹{Number(fin.excess_advance).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Payment Proposal & Settlement Form */}
                  <form onSubmit={handleCashSubmit} className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs space-y-3">
                    <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center justify-between">
                      <span>Record Payment / Advance / Settlement</span>
                      {proposedAmt > 0 && (
                        <span className="text-stone-600 normal-case font-medium">
                          Remaining Due Preview: <strong className="text-emerald-800">₹{previewRemainingPayable.toLocaleString()}</strong>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Transaction Type *</label>
                        <select
                          value={cashForm.transaction_type}
                          onChange={(e) => setCashForm({ ...cashForm, transaction_type: e.target.value })}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-bold text-stone-800 focus:outline-hidden focus:border-emerald-600"
                        >
                          <option value="payment">Payment against MC</option>
                          <option value="advance">Cash Advance</option>
                          <option value="adjustment">Approved Adjustment (+/-)</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Amount (₹) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="0.00"
                          value={cashForm.amount}
                          onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono font-black text-stone-900 text-right focus:outline-hidden focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Payment Method</label>
                        <select
                          value={cashForm.payment_mode}
                          onChange={(e) => setCashForm({ ...cashForm, payment_mode: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-800 focus:outline-hidden focus:border-emerald-600"
                        >
                          <option value="cash">Cash in Hand</option>
                          <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                          <option value="upi">UPI / GPay</option>
                          <option value="cheque">Cheque</option>
                          <option value="adjustment">Book Adjustment</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Reference / UTR #</label>
                        <input
                          type="text"
                          placeholder="Txn ID or Cheque No"
                          value={cashForm.reference_no}
                          onChange={(e) => setCashForm({ ...cashForm, reference_no: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-hidden focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Payment Date</label>
                        <input
                          type="date"
                          value={cashForm.transaction_date}
                          onChange={(e) => setCashForm({ ...cashForm, transaction_date: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-hidden focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Specific Work Order</label>
                        <select
                          value={cashForm.work_order_id}
                          onChange={(e) => setCashForm({ ...cashForm, work_order_id: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-800 focus:outline-hidden focus:border-emerald-600"
                        >
                          <option value="">General Payment</option>
                          {(karigarLedger.all_work_orders || []).map((wo) => (
                            <option key={wo.id} value={wo.id}>
                              {wo.work_order_number}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-5">
                        <label className="font-bold text-stone-700 block mb-1">Notes / Remarks</label>
                        <input
                          type="text"
                          placeholder="Settlement notes or receipt confirmation"
                          value={cashForm.notes}
                          onChange={(e) => setCashForm({ ...cashForm, notes: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-hidden focus:border-emerald-600"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={submittingCash}
                          className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {submittingCash ? (
                            <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                          ) : (
                            <i className="fa-solid fa-check text-xs"></i>
                          )}
                          <span>Record Payment</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Financial Transactions Ledger Table */}
                  {Array.isArray(karigarLedger.payments) && karigarLedger.payments.length > 0 && (
                    <div className="mt-4 overflow-x-auto border border-stone-200 rounded-xl bg-white shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-200 text-[10.5px] font-bold text-stone-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3 text-center w-10">#</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3">Reference / WO</th>
                            <th className="py-2.5 px-3">Notes</th>
                            <th className="py-2.5 px-3">Posted By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 font-medium">
                          {karigarLedger.payments.map((p, pIdx) => {
                            const isPayable = p.transaction_type === 'payable';
                            return (
                              <tr key={p.id} className="hover:bg-stone-50/60">
                                <td className="py-2.5 px-3 text-center font-mono text-stone-400">{pIdx + 1}</td>
                                <td className="py-2.5 px-3 font-mono text-stone-600 whitespace-nowrap">{p.transaction_date}</td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                    isPayable ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  }`}>
                                    {p.transaction_type}
                                  </span>
                                </td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                                  isPayable ? 'text-stone-900' : 'text-emerald-700'
                                }`}>
                                  ₹{Number(p.amount || 0).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 capitalize text-stone-700 whitespace-nowrap">{p.payment_mode?.replace(/_/g, ' ')}</td>
                                <td className="py-2.5 px-3 font-mono text-stone-800 whitespace-nowrap">
                                  {p.work_order?.work_order_number || p.reference_no || '—'}
                                </td>
                                <td className="py-2.5 px-3 text-stone-600 max-w-[200px] truncate" title={p.notes}>{p.notes || '—'}</td>
                                <td className="py-2.5 px-3 text-stone-500 whitespace-nowrap">{p.action_by_name || 'Admin'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 5. Assigned Work Orders */}
                <div>
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Assigned Work Orders ({karigarLedger.all_work_orders?.length || 0})
                  </h3>
                  <div className="overflow-x-auto border border-stone-200 rounded-xl bg-white shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-stone-100/70 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                          <th className="py-2.5 px-3 text-center w-12">S.No</th>
                          <th className="py-2.5 px-3">Work Order #</th>
                          <th className="py-2.5 px-3">Product Name</th>
                          <th className="py-2.5 px-3 text-right">Gold Allotted</th>
                          <th className="py-2.5 px-3 text-right">Diamond Allotted</th>
                          <th className="py-2.5 px-3 text-right">Completed</th>
                          <th className="py-2.5 px-3 text-right">Wastage</th>
                          <th className="py-2.5 px-3 text-right">Pending on Bench</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium">
                        {(karigarLedger.all_work_orders || []).length === 0 ? (
                          <tr>
                            <td colSpan="9" className="py-6 text-center text-stone-400">
                              No work orders assigned to this artisan.
                            </td>
                          </tr>
                        ) : (
                          karigarLedger.all_work_orders.map((wo, idx) => {
                            const isCompleted = wo.status === 'completed';
                            return (
                              <tr key={wo.id} className="hover:bg-stone-50/80">
                                <td className="py-2.5 px-3 text-center font-mono text-stone-400 font-medium">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-[#b01622]">{wo.work_order_number}</td>
                                <td className="py-2.5 px-3 font-bold text-stone-800">{wo.product_name || 'Jewellery Product'}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">{Number(wo.allotted_weight || 0).toFixed(3)}g</td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  {Number(wo.diamond_allotted || 0) > 0 ? (
                                    <span className="font-mono font-bold text-blue-700">
                                      💎 {Number(wo.diamond_allotted).toFixed(3)} ct
                                    </span>
                                  ) : (
                                    <span className="text-stone-300 font-mono">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">{Number(wo.completed_weight || 0).toFixed(3)}g</td>
                                <td className="py-2.5 px-3 text-right font-mono text-stone-600">{Number(wo.wastage_weight || 0).toFixed(3)}g</td>
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

                {/* 6. Material Transaction History Audit Ledger */}
                <div>
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Material Transaction Audit Ledger ({karigarLedger.transactions?.length || 0})
                  </h3>
                  <div className="border border-stone-200 rounded-xl bg-white shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-stone-100/70 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                            <th className="py-2.5 px-3 text-center w-12">S.No</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Movement Type</th>
                            <th className="py-2.5 px-3">Material &amp; Purity/Stamp</th>
                            <th className="py-2.5 px-3">WO Reference</th>
                            <th className="py-2.5 px-3 text-right">Quantity</th>
                            <th className="py-2.5 px-3 text-right">Fine Wt</th>
                            <th className="py-2.5 px-3">Reason / Remarks</th>
                            <th className="py-2.5 px-3">Action By</th>
                            <th className="py-2.5 px-3 text-center">Reversal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 font-medium">
                          {(() => {
                            const allTxs = karigarLedger.transactions || [];
                            const totalTxs = allTxs.length;
                            if (totalTxs === 0) {
                              return (
                                <tr>
                                  <td colSpan="10" className="py-6 text-center text-stone-400">
                                    No recorded material transactions yet for this artisan.
                                  </td>
                                </tr>
                              );
                            }

                            const totalPages = Math.max(1, Math.ceil(totalTxs / ledgerItemsPerPage));
                            const safePage = Math.min(Math.max(1, ledgerPage), totalPages);
                            const paginatedTxs = allTxs.slice(
                              (safePage - 1) * ledgerItemsPerPage,
                              safePage * ledgerItemsPerPage
                            );

                            return paginatedTxs.map((tx, idx) => {
                              const actualIdx = (safePage - 1) * ledgerItemsPerPage + idx + 1;
                              const isDiamond = tx.material_type === 'diamond' || tx.material_type === 'colour_stone';
                              const unitLabel = tx.unit || (isDiamond ? 'ct' : 'g');
                              return (
                                <tr key={tx.id} className={`hover:bg-stone-50/80 ${tx.is_reversed ? 'opacity-50 line-through bg-stone-50' : ''}`}>
                                  <td className="py-2.5 px-3 text-center font-mono text-stone-400 font-medium">{actualIdx}</td>
                                  <td className="py-2.5 px-3 whitespace-nowrap text-stone-600 font-mono">
                                    {tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString('en-GB') : '—'}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md ${
                                      tx.is_reversed ? 'bg-red-100 text-red-800' : 'bg-stone-100 text-stone-800'
                                    }`}>
                                      {tx.transaction_type ? tx.transaction_type.replace(/_/g, ' ') : 'Movement'}
                                      {tx.is_reversed && ' (Reversed)'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="text-[11px] font-bold text-stone-800 capitalize">
                                      {tx.material_type ? tx.material_type.replace(/_/g, ' ') : 'Gold'}
                                    </span>
                                    {tx.purity && (
                                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 font-bold text-[10px]">
                                        {tx.purity}
                                      </span>
                                    )}
                                    {tx.stamp && (
                                      <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-950 font-mono font-bold text-[10px] border border-blue-200 uppercase">
                                        {tx.stamp}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-[#b01622]">
                                    {tx.work_order?.work_order_number || '—'}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                                    {Number(tx.weight || tx.net_weight || 0).toFixed(3)} {unitLabel}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-black text-amber-900 whitespace-nowrap">
                                    {Number(tx.fine_weight || tx.company_gold_weight || 0).toFixed(3)}g
                                  </td>
                                  <td className="py-2.5 px-3 text-stone-600 max-w-[200px] truncate" title={tx.reason}>
                                    {tx.reason || '—'}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap text-stone-500 font-medium">
                                    {tx.action_by_name || 'Admin'}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {!tx.is_reversed && tx.transaction_type !== 'reversal' && (
                                      <button
                                        type="button"
                                        onClick={() => handleReverseTransaction(tx.id)}
                                        className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition-colors cursor-pointer"
                                        title="Reverse this transaction with audit remarks"
                                      >
                                        Reverse
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {(karigarLedger.transactions || []).length > 0 && (
                      <Pagination
                        currentPage={Math.min(Math.max(1, ledgerPage), Math.max(1, Math.ceil((karigarLedger.transactions || []).length / ledgerItemsPerPage)))}
                        totalPages={Math.max(1, Math.ceil((karigarLedger.transactions || []).length / ledgerItemsPerPage))}
                        totalItems={(karigarLedger.transactions || []).length}
                        itemsPerPage={ledgerItemsPerPage}
                        onPageChange={(page) => setLedgerPage(page)}
                        onItemsPerPageChange={(limit) => {
                          setLedgerItemsPerPage(limit);
                          setLedgerPage(1);
                        }}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-stone-400">
                <i className="fa-solid fa-user-xmark text-3xl mb-2 text-stone-300"></i>
                <span className="text-sm font-semibold">No artisan material ledger selected</span>
                <span className="text-xs text-stone-400 mt-1">Please select an artisan from the dropdown.</span>
              </div>
            )}

          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
          <div className="text-xs text-stone-500 font-medium">
            {activeTab === 'allocations' ? (
              <>Showing <strong className="text-stone-900">{filteredJobs.length}</strong> active material allocations</>
            ) : (
              <>Managing Artisan Material &amp; Cash Settlements &bull; Strictly Audited</>
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
          </div>
        </div>

      </div>
    </div>
  );
}
