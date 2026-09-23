import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function KarigarWorkModal({ isOpen, onClose, workOrderId, onUpdated }) {
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('update'); // 'update' | 'specs' | 'timeline'

  // Artisan form state
  const [completedWeight, setCompletedWeight] = useState('');
  const [completedQty, setCompletedQty] = useState(1);
  const [goldUsed, setGoldUsed] = useState('');
  const [scrapWeight, setScrapWeight] = useState('');
  const [karigarNotes, setKarigarNotes] = useState('');
  const [delayDate, setDelayDate] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [timelineStage, setTimelineStage] = useState('');
  const [stones, setStones] = useState([]);
  const [uploadedImage, setUploadedImage] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (isOpen && workOrderId) {
      loadWorkOrder();
    }
  }, [isOpen, workOrderId]);

  const loadWorkOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/work-orders/${workOrderId}`);
      const data = res.data.data;
      setOrder(data);

      // Pre-fill existing data
      setCompletedWeight(data.completed_weight || '');
      setGoldUsed(data.karigar_data?.gold_used || data.completed_weight || '');
      setScrapWeight(data.karigar_data?.scrap_weight || data.wastage_weight || '');
      setCompletedQty(data.karigar_data?.completed_qty || 1);
      setKarigarNotes(data.karigar_notes || data.karigar_data?.remarks || '');
      setDelayDate(data.delivery_date || data.karigar_data?.delay_date || '');
      setDelayReason(data.karigar_data?.delay_reason || '');
      setTimelineStage(data.current_stage || 'work_in_progress');
      setStones(data.stone_details || []);
      setUploadedImage(data.karigar_data?.reference_image || '');
      setFormErrors({});
    } catch (err) {
      console.error('Failed to load work order:', err);
      showToast?.('Failed to load work order details', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleStoneChange = (index, field, value) => {
    setStones((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveOrSubmit = async (actionType) => {
    setFormErrors({});

    if (actionType === 'submit') {
      const errors = {};
      if (!completedWeight || parseFloat(completedWeight) <= 0) {
        errors.completed_weight = 'Actual completed weight is required before submission';
      }
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        showToast?.('Please complete required fields before submitting', 'warning');
        return;
      }
    }

    try {
      if (actionType === 'submit') {
        setSubmitting(true);
      } else {
        setSaving(true);
      }

      const payload = {
        action: actionType,
        completed_weight: completedWeight ? parseFloat(completedWeight) : 0,
        completed_qty: parseInt(completedQty) || 1,
        gold_used: goldUsed ? parseFloat(goldUsed) : (completedWeight ? parseFloat(completedWeight) : 0),
        scrap_weight: scrapWeight ? parseFloat(scrapWeight) : 0,
        karigar_notes: karigarNotes,
        delivery_date: delayDate,
        delay_date: delayDate,
        delay_reason: delayReason,
        current_stage: timelineStage,
        stone_details: stones,
        reference_image: uploadedImage,
        remarks: karigarNotes,
      };

      const res = await api.post(`/work-orders/${workOrderId}/karigar-update`, payload);
      const updatedOrder = res.data.data;
      setOrder(updatedOrder);

      if (actionType === 'submit') {
        showToast?.(
          order?.status === 'returned'
            ? 'Corrected work resubmitted for Admin review!'
            : 'Work submitted for Admin approval! Notification sent to Admin.',
          'success'
        );
        onUpdated?.(updatedOrder);
        onClose();
      } else {
        showToast?.('Work progress saved as draft successfully!', 'success');
        onUpdated?.(updatedOrder);
      }
    } catch (err) {
      console.error('Update error:', err);
      const msg = err.response?.data?.message || 'Failed to update work order';
      showToast?.(msg, 'error');
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isReturned = order?.status === 'returned';
  const isCompleted = order?.status === 'completed' || order?.status === 'final_received';
  const isSubmitted = order?.status === 'submitted' || order?.status === 'resubmitted';

  const allottedGold = parseFloat(order?.allotted_weight || 0);
  const currentGoldUsed = parseFloat(goldUsed || completedWeight || 0);
  const calculatedPendingGold = Math.max(0, allottedGold - currentGoldUsed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#801824] via-[#9c131d] to-[#b01622] text-white flex items-start justify-between gap-4 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 text-xl font-bold shadow-inner">
              <i className="fa-solid fa-hammer"></i>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold bg-white/10 text-amber-300 px-2.5 py-0.5 rounded-md">
                  {order?.work_order_number || 'Loading...'}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    isReturned
                      ? 'bg-rose-500 text-white animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : isSubmitted
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {isReturned ? 'REWORK REQUIRED' : order?.status?.replace('_', ' ') || 'ASSIGNED'}
                </span>
                {order?.return_count > 0 && (
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-400/30 px-2 py-0.5 rounded-md font-bold">
                    Cycle #{order.return_count}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white mt-1 leading-snug">
                {order?.product_name || 'Artisan Work Order Form'}
              </h2>
              <p className="text-xs text-stone-400">
                Assigned Artisan: <span className="text-stone-200 font-semibold">{order?.karigar_name || 'Self'}</span> • Due:{' '}
                <span className="text-amber-300 font-semibold">{order?.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-GB') : 'Immediate'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/job-order/receive?order_id=${workOrderId}`}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-box-archive"></i>
              <span>Receive Work Order ↗</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <i className="fa-solid fa-xmark text-base"></i>
            </button>
          </div>
        </div>

        {/* REWORK REQUIRED ALERT BANNER (If Returned by Admin) */}
        {isReturned && (
          <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 text-white p-4 px-6 flex items-start gap-3 shadow-inner">
            <i className="fa-solid fa-triangle-exclamation text-xl text-amber-300 shrink-0 mt-0.5"></i>
            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold uppercase tracking-wide text-xs text-amber-200">
                  REWORK REQUIRED FROM ADMIN / QUALITY HEAD
                </span>
                <span className="text-[10px] text-rose-200">
                  Returned on {order?.return_date ? new Date(order.return_date).toLocaleDateString('en-GB') : 'Recently'} by {order?.returned_by || 'Admin'}
                </span>
              </div>
              <div className="mt-1 bg-black/20 p-2.5 rounded-xl border border-white/10 font-medium text-rose-50 leading-relaxed">
                <span className="font-bold text-amber-200 mr-1">Correction Required:</span>
                "{order?.return_reason || 'Please correct weights and specifications according to client requirement.'}"
              </div>
              <p className="mt-1.5 text-[11px] text-rose-100">
                Please make the required corrections below, then click <strong>"Resubmit for Admin Approval"</strong> to send the updated work back.
              </p>
            </div>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 flex items-center gap-4 text-xs font-bold text-stone-600">
          <button
            type="button"
            onClick={() => setActiveTab('update')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'update'
                ? 'border-[#b01622] text-[#b01622]'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <i className="fa-solid fa-pen-to-square"></i>
            <span>Artisan Production Update</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'specs'
                ? 'border-[#b01622] text-[#b01622]'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <i className="fa-solid fa-list-check"></i>
            <span>Original Admin Specifications (Read-Only)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-[#b01622] text-[#b01622]'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <i className="fa-solid fa-timeline"></i>
            <span>Tracking History ({order?.timelines?.length || 0} Events)</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-stone-400 gap-2">
              <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622]"></i>
              <span className="text-xs font-semibold">Loading Work Order specifications...</span>
            </div>
          ) : activeTab === 'update' ? (
            <>
              {/* Material Allocation Summary Pill Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-center">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    Allotted Material
                  </span>
                  <span className="text-base font-black text-gray-900 font-mono mt-0.5 block">
                    {allottedGold.toFixed(3)} <span className="text-xs font-sans text-stone-500">g</span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">
                    {order?.material_type || '22K Gold (916)'}
                  </span>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-center">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    Gold Used Till Now
                  </span>
                  <span className="text-base font-black text-emerald-700 font-mono mt-0.5 block">
                    {currentGoldUsed.toFixed(3)} <span className="text-xs font-sans text-stone-500">g</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">Entered by Artisan</span>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-center">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    Pending Material
                  </span>
                  <span className="text-base font-black text-[#b01622] font-mono mt-0.5 block">
                    {calculatedPendingGold.toFixed(3)} <span className="text-xs font-sans text-stone-500">g</span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">To be returned</span>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-center">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    Wastage / Scrap
                  </span>
                  <span className="text-base font-black text-amber-700 font-mono mt-0.5 block">
                    {parseFloat(scrapWeight || order?.wastage_weight || 0).toFixed(3)}{' '}
                    <span className="text-xs font-sans text-stone-500">g</span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">
                    Standard: {order?.wastage_allowed_percent || 4.5}%
                  </span>
                </div>
              </div>

              {/* SECTION: ARTISAN UPDATABLE FIELDS */}
              <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-5 space-y-4">
                <div className="border-b border-stone-100 pb-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-weight-scale text-[#b01622]"></i>
                    <span>Production Details & Weight Tracking</span>
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Enter the exact completed weights and parameters achieved at your bench.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Actual Completed Weight (g) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        disabled={isCompleted}
                        value={completedWeight}
                        onChange={(e) => {
                          setCompletedWeight(e.target.value);
                          setGoldUsed(e.target.value);
                          if (formErrors.completed_weight) {
                            setFormErrors((prev) => ({ ...prev, completed_weight: null }));
                          }
                        }}
                        placeholder="e.g. 22.450"
                        className={`w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border ${
                          formErrors.completed_weight
                            ? 'border-red-500 bg-red-50/50'
                            : 'border-stone-300 focus:border-[#b01622] bg-stone-50/50 focus:bg-white'
                        } outline-hidden shadow-2xs`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                        g
                      </span>
                    </div>
                    {formErrors.completed_weight && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">{formErrors.completed_weight}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Total Completed Quantity (Pcs)
                    </label>
                    <input
                      type="number"
                      min="1"
                      disabled={isCompleted}
                      value={completedQty}
                      onChange={(e) => setCompletedQty(e.target.value)}
                      placeholder="1"
                      className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-stone-300 focus:border-[#b01622] bg-stone-50/50 focus:bg-white outline-hidden shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Scrap / Dust Recovered (g)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        disabled={isCompleted}
                        value={scrapWeight}
                        onChange={(e) => setScrapWeight(e.target.value)}
                        placeholder="0.450"
                        className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border border-stone-300 focus:border-[#b01622] bg-stone-50/50 focus:bg-white outline-hidden shadow-2xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                        g
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stone Details Verification */}
                {stones && stones.length > 0 && (
                  <div className="pt-3 border-t border-stone-100">
                    <label className="text-xs font-bold text-gray-700 block mb-2 flex items-center justify-between">
                      <span>Stone & Diamond Details:</span>
                      <span className="text-[10px] text-stone-400 font-normal">
                        Verify expected vs actual set stones
                      </span>
                    </label>
                    <div className="border border-stone-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                          <tr>
                            <th className="py-2 px-3">Stone Type</th>
                            <th className="py-2 px-3 text-center">Allotted</th>
                            <th className="py-2 px-3 text-center">Actually Set</th>
                            <th className="py-2 px-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {stones.map((st, idx) => (
                            <tr key={idx} className="hover:bg-stone-50/50">
                              <td className="py-2 px-3 font-semibold text-gray-900">{st.type}</td>
                              <td className="py-2 px-3 text-center font-mono font-bold">{st.expected || st.count || 0}</td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  disabled={isCompleted}
                                  value={st.received !== undefined ? st.received : (st.count || 0)}
                                  onChange={(e) => handleStoneChange(idx, 'received', e.target.value)}
                                  className="w-16 px-2 py-1 bg-white border border-stone-300 rounded font-mono font-bold text-center text-xs outline-hidden"
                                />
                              </td>
                              <td className="py-2 px-3 text-stone-500">
                                <input
                                  type="text"
                                  disabled={isCompleted}
                                  value={st.notes || ''}
                                  onChange={(e) => handleStoneChange(idx, 'notes', e.target.value)}
                                  placeholder="No broken stones..."
                                  className="w-full px-2 py-1 bg-transparent border-0 text-xs text-stone-700 focus:outline-hidden"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECTION: DELAY DATE, DELAY REASON & TIMELINE STAGE PROGRESSION */}
                <div className="pt-3 border-t border-stone-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-regular fa-calendar-clock text-[#b01622]"></i>
                      <span>Delivery Deadline, Delay Reason & Stage Progression</span>
                    </h4>
                    <span className="text-[10px] text-stone-400 font-medium">
                      Synchronizes directly with Receive Work Order
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Delay / Extended Delivery Date */}
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        Extended Due Date / Delay Date
                      </label>
                      <input
                        type="date"
                        disabled={isCompleted}
                        value={delayDate}
                        onChange={(e) => setDelayDate(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-stone-300 focus:border-[#b01622] bg-stone-50/50 focus:bg-white outline-hidden shadow-2xs"
                      />
                      <p className="text-[10px] text-stone-400 mt-1">
                        Original Due: {order?.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-GB') : 'Immediate'}
                      </p>
                    </div>

                    {/* Delay Reason Dropdown / Input */}
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        Reason for Delay / Work Update
                      </label>
                      <select
                        disabled={isCompleted}
                        value={delayReason}
                        onChange={(e) => setDelayReason(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-stone-300 focus:border-[#b01622] bg-stone-50/50 focus:bg-white outline-hidden shadow-2xs"
                      >
                        <option value="">-- No Delay / On Schedule --</option>
                        <option value="Intricate Hand Crafting & Detailing">Intricate Hand Crafting & Detailing</option>
                        <option value="Awaiting Client Stones / Diamonds">Awaiting Client Stones / Diamonds</option>
                        <option value="Rework on Prong / Clasp Setting">Rework on Prong / Clasp Setting</option>
                        <option value="Design Alteration Requested by Customer">Design Alteration Requested by Customer</option>
                        <option value="Hallmark / Quality Certification Queue">Hallmark / Quality Certification Queue</option>
                        <option value="Artisan Leave / Capacity Constraint">Artisan Leave / Capacity Constraint</option>
                        <option value="Custom Finishing / Dual Tone Polish">Custom Finishing / Dual Tone Polish</option>
                        <option value="Other">Other Reason</option>
                      </select>
                      <p className="text-[10px] text-stone-400 mt-1">
                        Logged in order audit trail & visible to Reception
                      </p>
                    </div>

                    {/* Timeline Stage Progression */}
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1 flex items-center justify-between">
                        <span>Timeline Stage Update</span>
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          <i className="fa-solid fa-lock text-[9px] mr-1"></i>Forward-Only
                        </span>
                      </label>
                      <select
                        disabled={isCompleted || isSubmitted}
                        value={timelineStage}
                        onChange={(e) => {
                          const STAGE_RANKS = {
                            created: 1,
                            allocated: 2,
                            received_by_artisan: 3,
                            work_started: 4,
                            work_in_progress: 5,
                            work_completed: 6,
                            sent_for_approval: 7,
                            quality_check: 8,
                            approved: 9,
                            ready: 10,
                            delivered: 11,
                            final_received: 12,
                          };
                          const selectedRank = STAGE_RANKS[e.target.value] || 0;
                          const currentRank = STAGE_RANKS[order?.current_stage] || 3;
                          if (selectedRank < currentRank && !isReturned) {
                            showToast?.('Workflow tracking can only move forward. Previous steps cannot be selected reversely.', 'warning');
                            return;
                          }
                          setTimelineStage(e.target.value);
                        }}
                        className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-stone-300 focus:border-[#b01622] bg-stone-50/50 focus:bg-white outline-hidden shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {[
                          { value: 'received_by_artisan', label: 'Received by Aachari', rank: 3 },
                          { value: 'work_started', label: 'Work Started', rank: 4 },
                          { value: 'work_in_progress', label: 'Work in Progress', rank: 5 },
                          { value: 'work_completed', label: 'Work Completed', rank: 6 },
                          { value: 'sent_for_approval', label: 'Sent for Admin Approval', rank: 7 },
                          { value: 'quality_check', label: 'Quality Check (QC Pending)', rank: 8 },
                          { value: 'ready', label: 'Ready for Reception', rank: 10 },
                        ].map((st) => {
                          const STAGE_RANKS = {
                            created: 1,
                            allocated: 2,
                            received_by_artisan: 3,
                            work_started: 4,
                            work_in_progress: 5,
                            work_completed: 6,
                            sent_for_approval: 7,
                            quality_check: 8,
                            approved: 9,
                            ready: 10,
                            delivered: 11,
                            final_received: 12,
                          };
                          const currentRank = STAGE_RANKS[order?.current_stage] || 3;
                          const isPast = st.rank < currentRank && !isReturned;
                          return (
                            <option key={st.value} value={st.value} disabled={isPast}>
                              {st.label} {isPast ? ' (Completed - Locked)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[10px] text-stone-400 mt-1">
                        Advances step in Tracking Timeline (Previous steps locked)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Artisan Remarks / Progress Notes */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Artisan Notes / Bench Observations
                  </label>
                  <textarea
                    rows={3}
                    disabled={isCompleted}
                    value={karigarNotes}
                    onChange={(e) => setKarigarNotes(e.target.value)}
                    placeholder="Enter details on casting quality, prongs setting, clasp polish, or delay explanation..."
                    className="w-full px-3 py-2 text-xs border border-stone-300 focus:border-[#b01622] rounded-xl outline-hidden bg-stone-50/50 focus:bg-white resize-none shadow-2xs"
                  ></textarea>
                </div>

                {/* Finished Craft Photo URL / File */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Finished Craft Visual / Reference Photo
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      disabled={isCompleted}
                      value={uploadedImage}
                      onChange={(e) => setUploadedImage(e.target.value)}
                      placeholder="e.g. /images/samples/ruby_set.jpg or image link"
                      className="flex-1 px-3 py-2 text-xs border border-stone-300 focus:border-[#b01622] rounded-xl outline-hidden bg-stone-50/50 focus:bg-white shadow-2xs"
                    />
                    <label className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors shrink-0 flex items-center gap-1.5">
                      <i className="fa-solid fa-cloud-arrow-up text-[#b01622]"></i>
                      <span>Upload File</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isCompleted}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (uploadEvt) => {
                              setUploadedImage(uploadEvt.target?.result || '');
                              showToast?.('Finished craft photo uploaded', 'success');
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {uploadedImage && (
                      <div className="relative group">
                        <img
                          src={uploadedImage}
                          alt="Preview"
                          className="w-10 h-10 object-cover rounded-lg border border-stone-300 shadow-2xs shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() => setUploadedImage('')}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'specs' ? (
            /* SECTION: ORIGINAL READ-ONLY ADMIN SPECIFICATIONS */
            <div className="space-y-4 text-xs">
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3 text-amber-900">
                <i className="fa-solid fa-lock text-amber-600 text-lg"></i>
                <p>
                  These are the authoritative job order specifications supplied by Admin upon issuance. They cannot be modified by the artisan.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2.5">
                  <h4 className="font-bold text-gray-900 uppercase text-[11px] tracking-wider border-b border-stone-200 pb-1.5">
                    Order Identification
                  </h4>
                  <p className="flex justify-between">
                    <span className="text-stone-500">Work Order No:</span>
                    <span className="font-mono font-bold text-gray-900">{order?.work_order_number}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-stone-500">Product / Item:</span>
                    <span className="font-bold text-gray-900">{order?.product_name}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-stone-500">Category / Subcategory:</span>
                    <span>{order?.category?.name || 'Jewelry'} / {order?.subcategory?.name || 'Choker'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-stone-500">Client / Customer:</span>
                    <span className="font-semibold">{order?.customer_name || order?.client?.full_name || order?.client?.name || 'Internal Showroom'}</span>
                  </p>
                </div>

                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2.5">
                  <h4 className="font-bold text-gray-900 uppercase text-[11px] tracking-wider border-b border-stone-200 pb-1.5">
                    Allocated Gold & Dates
                  </h4>
                  <p className="flex justify-between">
                    <span className="text-stone-500">Allocated Gold Weight:</span>
                    <span className="font-mono font-bold text-[#b01622]">{allottedGold.toFixed(3)} g</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-stone-500">Purity Standard:</span>
                    <span className="font-bold">{order?.material_type || '22K Gold (916)'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-stone-500">Allotted Date:</span>
                    <span>{order?.allotted_date ? new Date(order.allotted_date).toLocaleDateString('en-GB') : '—'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-stone-500">Promised Due Date:</span>
                    <span className="font-bold text-[#b01622]">
                      {order?.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-GB') : '—'}
                    </span>
                  </p>
                </div>
              </div>

              {order?.notes && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
                  <h4 className="font-bold text-gray-900 uppercase text-[11px] tracking-wider mb-1">
                    Admin Crafting Instructions
                  </h4>
                  <p className="text-stone-600 leading-relaxed font-sans">{order.notes}</p>
                </div>
              )}
            </div>
          ) : (
            /* SECTION: TRACKING HISTORY / TIMELINE */
            <div className="space-y-4">
              <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-[#b01622]"></i>
                  <span>Complete Database Tracking Events</span>
                </h3>

                {order?.timelines && order.timelines.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                    {order.timelines.map((ev, idx) => (
                      <div key={idx} className="relative">
                        <div
                          className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white shadow-xs flex items-center justify-center ${
                            ev.stage === 'returned'
                              ? 'bg-rose-600'
                              : ev.stage === 'final_received' || ev.stage === 'approved'
                              ? 'bg-emerald-600'
                              : 'bg-[#b01622]'
                          }`}
                        ></div>
                        <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-gray-900">{ev.stage_label || ev.stage}</span>
                            <span className="text-[10px] text-stone-400">
                              {ev.created_at ? new Date(ev.created_at).toLocaleString('en-GB') : ''}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600">{ev.notes || 'Status updated.'}</p>
                          <div className="mt-1 text-[10px] text-stone-400 flex items-center gap-3">
                            <span>By: <strong>{ev.action_by_name || 'System'}</strong></span>
                            {ev.completed_weight_at_step > 0 && (
                              <span>Weight: <strong>{Number(ev.completed_weight_at_step).toFixed(3)}g</strong></span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic">No timeline events logged yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 px-6 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-stone-500 font-medium">
            Status: <span className="font-bold text-gray-900 uppercase">{order?.status?.replace('_', ' ')}</span>
            {order?.karigar_submitted_at && (
              <span className="ml-2 text-stone-400">
                (Last submitted: {new Date(order.karigar_submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              Close
            </button>

            {!isCompleted && (
              <>
                <button
                  type="button"
                  disabled={saving || submitting}
                  onClick={() => handleSaveOrSubmit('save')}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
                >
                  {saving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Saving Draft...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-floppy-disk"></i>
                      <span>Save Progress</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={saving || submitting}
                  onClick={() => handleSaveOrSubmit('submit')}
                  className="px-5 py-2 bg-[#881337] hover:bg-[#70102d] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-red-950/20"
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      <span>{isReturned ? 'Resubmit for Admin Approval' : 'Submit for Admin Approval'}</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
