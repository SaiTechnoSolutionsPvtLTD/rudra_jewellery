import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const tabs = [
  ['Work in Progress', '/job-order/in-progress'],
  ['Dealy / Job Details', '/job-order/delay'],
  ['Waste Details', '/job-order/waste'],
  ['Quality Check & Final Receive', '/job-order/quality-check'],
  ['History', '/job-order/history'],
];

const checkItems = [
  { key: 'purity', label: 'Gold Purity Testing', expected: '22K (916)', note: 'Purity 22K confirmed' },
  { key: 'weight', label: 'Weight Verification', expected: '20.000 gm', note: 'Weight matches' },
  { key: 'diamond', label: 'Diamond / Stone Check', expected: 'VVS1 / G - Good', note: 'All stones OK' },
  { key: 'polish', label: 'Polish / Finish', expected: 'High Standard', note: 'Good finish' },
  { key: 'hallmark', label: 'Hallmark Verification', expected: 'BIS Hallmarked', note: 'Hallmark verified' },
  { key: 'quality', label: 'Overall Quality', expected: 'As per Standard', note: 'Approved' },
];

const displayDate = (value) => value ? new Date(value).toLocaleDateString('en-GB') : '28/04/2024';

export default function QualityCheckDetails() {
  const { showToast, showConfirm, showPrompt } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [ongoingOrders, setOngoingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const queryId = new URLSearchParams(location.search).get('order_id');
        // Fetch products sent for Quality Check (tab: 'quality_check')
        const listResponse = await api.get('/work-orders', { params: { tab: 'quality_check' } });
        const list = listResponse.data?.data || [];

        // Filter product selector list to ONLY include products that are sent for QC by karigar
        const qcOnlyList = list.filter((item) => {
          const status = (item.status || '').toLowerCase();
          const stage = (item.current_stage || '').toLowerCase();
          return (
            status === 'pending_approval' ||
            ['work_completed', 'sent_for_approval', 'quality_check', 'completed_approval', 'submitted'].includes(stage) ||
            Boolean(item.karigar_submitted_at) ||
            Number(item.completed_weight || 0) > 0
          );
        });

        const finalOrdersList = qcOnlyList.length > 0 ? qcOnlyList : list;
        setOngoingOrders(finalOrdersList);

        const id = queryId || finalOrdersList[0]?.id;
        if (!id) return;
        const response = await api.get(`/work-orders/${id}`);
        if (!mounted) return;
        const nextOrder = response.data?.data || null;
        setOrder(nextOrder);
        setNotes(nextOrder?.quality_notes || '');
        const saved = nextOrder?.checklist || {};
        setStatuses(Object.fromEntries(checkItems.map((item) => [
          item.key,
          saved[item.key] === false ? 'Pending' : (item.key === 'weight' && !saved[item.key] ? 'Pending' : 'Accept')
        ])));
      } catch (error) {
        console.error('Failed to load quality check:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [location.search]);

  const orderId = order?.id;
  const jobId = order?.design_code || order?.work_order_number || (order?.id ? `RJ-3836-000${order.id}` : 'RJ-3836-000125');
  const clientId = order?.client?.client_code || (order?.client_id ? `CL-2024-00${order.client_id}` : 'CL-2024-00458');
  const clientName = order?.customer_name || order?.client?.full_name || order?.client?.name || 'Rajesh Vishwakarma';
  const karigarName = order?.karigar?.name || order?.karigar_name || 'Manikandan';
  const receivedWeight = Number(order?.completed_weight || 19.650);
  const wastage = Number(order?.wastage_weight || 0.350);
  const wastagePercent = Number(order?.wastage_allowed_percent || 1.75);

  const openTab = (path) => `${path}${orderId ? `?order_id=${orderId}` : ''}`;
  const switchOrder = (event) => navigate(`/job-order/quality-check?order_id=${event.target.value}`);

  const handleApprove = async () => {
    if (!orderId) return;
    const confirmed = await showConfirm({
      title: 'Approve Quality Check',
      message: 'Are you sure you want to approve quality check and mark this job order ready for delivery?',
      icon: 'fa-solid fa-circle-check',
      confirmText: 'Approve & Pass QC'
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      await api.post(`/work-orders/${orderId}/approve`, { quality_notes: notes || 'Quality check approved.' });
      await api.post(`/work-orders/${orderId}/mark-ready`);
      showToast('Quality check approved successfully!', 'success');
      navigate(openTab('/job-order/receive'));
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to approve quality check.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRework = async () => {
    if (!orderId) return;
    let reason = notes;
    if (!reason || !reason.trim()) {
      reason = await showPrompt({
        title: 'Return to Artisan for Rework',
        message: 'Enter reason for returning to artisan (e.g. Solder defect, loose stone):',
        placeholder: 'Enter reason for return...',
        icon: 'fa-solid fa-rotate-left',
        confirmText: 'Submit Rework'
      });
      if (!reason || !reason.trim()) return;
      setNotes(reason);
    } else {
      const confirmed = await showConfirm({
        title: 'Return to Artisan for Rework',
        message: `Return this job order to artisan with reason: "${reason.trim()}"?`,
        icon: 'fa-solid fa-rotate-left',
        confirmText: 'Submit Rework'
      });
      if (!confirmed) return;
    }

    try {
      setSaving(true);
      await api.post(`/work-orders/${orderId}/return`, { return_reason: reason.trim(), returned_weight: receivedWeight });
      showToast('Job order returned for rework.', 'info');
      navigate(openTab('/job-order/in-progress'));
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to send work order for rework.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-[450px] flex items-center justify-center text-sm font-semibold text-stone-500">Loading quality check...</div>;

  return (
    <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-[#1c1917]">
      
      {/* 1. BREADCRUMB & TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[12px] text-stone-500 font-medium mb-1">
            <span>Manufacturing</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span>Job Orders</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span>Reception</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span className="text-stone-800 font-semibold">Quality Check</span>
          </div>

          {/* Main Title & Order Switcher */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight">
              Quality Check &amp; Final Receive - <span className="font-extrabold">{jobId}</span>
            </h1>

            {ongoingOrders.length > 0 && (
              <select
                value={order?.id || ''}
                onChange={switchOrder}
                className="text-xs bg-white border border-stone-200 rounded-md px-3 py-1.5 text-stone-800 font-semibold shadow-2xs cursor-pointer focus:outline-none focus:border-[#b01622]"
              >
                {ongoingOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    Switch Job: {o.design_code || o.work_order_number || `ORD-${o.id}`} ({o.product_name || 'Jewelry Item'})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div>
          <Link
            to={openTab('/job-order/receive')}
            className="px-3.5 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-md shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left text-[11px] text-stone-500"></i>
            <span>Back to Receive Summary</span>
          </Link>
        </div>
      </div>

      {/* 2. SUB NAVIGATION TABS */}
      <div className="border-b border-[#e7e5e4]">
        <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
          {tabs.map(([label, path]) => (
            <Link
              key={path}
              to={openTab(path)}
              className={`pb-2.5 text-sm whitespace-nowrap transition-colors cursor-pointer ${
                path === '/job-order/quality-check'
                  ? 'font-bold text-[#881337] border-b-2 border-[#b01622]'
                  : 'font-semibold text-stone-600 hover:text-stone-900 border-b-2 border-transparent'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* 3. TOP INFO BAR */}
      <div className="bg-[#F4F6F7] rounded-xl border border-[#eed5d1] p-4 sm:p-5 shadow-2xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        <div>
          <span className="text-[11px] font-semibold text-stone-500 block mb-1">
            Job ID
          </span>
          <span className="text-sm font-bold text-[#1c1917] block">
            {jobId}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-stone-500 block mb-1">
            Client ID
          </span>
          <span className="text-sm font-bold text-[#1c1917] block">
            {clientId}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-stone-500 block mb-1">
            Client Name
          </span>
          <span className="text-sm font-bold text-[#1c1917] block truncate" title={clientName}>
            {clientName}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-stone-500 block mb-1">
            Assigned Karigar
          </span>
          <span className="text-sm font-bold text-[#1c1917] block truncate" title={karigarName}>
            {karigarName}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-stone-500 block mb-1">
            Work Completed
          </span>
          <span className="text-sm font-bold text-[#1c1917] block">
            {displayDate(order?.karigar_submitted_at || order?.updated_at)}
          </span>
        </div>
      </div>

      {/* 4. MAIN SECTION: LEFT 7 COLS & RIGHT 5 COLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: QC Table + Remarks */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Quality Check Table Card */}
          <div className="bg-[#F4F6F7] rounded-xl border border-[#eed5d1] p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Quality Check (At Receive)</h2>

            <div className="overflow-x-auto bg-white rounded-lg border border-[#eed5d1] p-1">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#eed5d1] text-[10.5px] font-bold text-stone-500 uppercase tracking-wider bg-[#f4ebe9]/50">
                    <th className="py-2.5 px-3">CHECK POINT</th>
                    <th className="py-2.5 px-3">STANDARD</th>
                    <th className="py-2.5 px-3">RESULT</th>
                    <th className="py-2.5 px-3">REMARKS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eed5d1]/60">
                  {checkItems.map((item) => {
                    const statusVal = statuses[item.key] || 'Accept';
                    const expectedText = item.key === 'weight'
                      ? (order?.allotted_weight ? `${Number(order.allotted_weight).toFixed(3)} gm` : '20.000 gm')
                      : item.expected;

                    return (
                      <tr key={item.key} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-3.5 px-3 font-medium text-gray-900">{item.label}</td>
                        <td className="py-3.5 px-3 text-stone-600 font-normal">{expectedText}</td>
                        <td className="py-3.5 px-3">
                          <div className="relative inline-block">
                            <select
                              value={statusVal}
                              onChange={(event) =>
                                setStatuses((current) => ({ ...current, [item.key]: event.target.value }))
                              }
                              className={`appearance-none bg-white border font-semibold text-xs rounded-lg px-3 py-1 pr-6 cursor-pointer focus:outline-none shadow-2xs ${
                                statusVal === 'Pending'
                                  ? 'border-amber-300 text-amber-800'
                                  : 'border-[#E08D8D] text-[#7A0000]'
                              }`}
                            >
                              <option value="Accept">Accept</option>
                              <option value="Pending">Pending</option>
                            </select>
                            <i className={`fa-solid fa-chevron-down text-[9px] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
                              statusVal === 'Pending' ? 'text-amber-800' : 'text-[#7A0000]'
                            }`}></i>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-stone-600 font-normal">{item.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remarks Card */}
          <div className="bg-[#F4F6F7] rounded-xl border border-[#eed5d1] p-5 shadow-2xs space-y-2">
            <label className="text-xs font-bold text-gray-800 block">Remarks (Optional)</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows="3"
              placeholder="Item quality is good. Ready to deliver."
              className="w-full bg-white border border-[#eed5d1] rounded-lg p-3 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#b01622] resize-none"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Final Receive Summary Card */}
        <div className="lg:col-span-5">
          <div className="bg-[#F4F6F7] rounded-xl border border-[#eed5d1] p-6 shadow-2xs space-y-6">
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Final Receive Summary</h2>

            <div className="bg-white rounded-xl border border-[#eed5d1] p-4 space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-normal">Received Weight (gm)</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{receivedWeight.toFixed(3)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-normal">Wastage (gm)</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{wastage.toFixed(3)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-normal">Wastage (%)</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{wastagePercent.toFixed(2)}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-normal">QC Status</span>
                {order?.status === 'completed' || order?.approved_at ? (
                  <span className="px-2.5 py-0.5 rounded bg-[#E6F4EA] text-[#137333] font-semibold text-[11px]">
                    Approved
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded bg-[#EBF5FF] text-[#1E429F] border border-[#BFDBFE] font-semibold text-[11px]">
                    Pending Verification
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-normal">Verified By</span>
                <span className="font-bold text-gray-900 text-xs">
                  {order?.approved_by_user?.name || order?.verified_by || 'Arvind (Super Admin)'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-normal">Verification Date</span>
                <span className="font-medium text-gray-900 text-xs">
                  {order?.approved_at ? new Date(order.approved_at).toLocaleString('en-GB') : '28/04/2024 11:20 AM'}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#eed5d1] space-y-3">
              <h3 className="text-[10.5px] font-bold text-stone-500 uppercase tracking-wider">
                RETURN / REWORK (IF ANY)
              </h3>
              <button
                type="button"
                onClick={handleRework}
                disabled={saving}
                className="w-full py-2.5 bg-white border border-[#b01622] text-[#b01622] rounded-lg text-xs font-bold hover:bg-red-50 transition-colors shadow-2xs cursor-pointer"
              >
                Send Back for Rework
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM ACTION BUTTONS */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={saving}
          className="px-6 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
        >
          Final Receive &amp; Approve
        </button>
        <button
          type="button"
          onClick={handleRework}
          disabled={saving}
          className="px-6 py-2.5 bg-white border border-[#eed5d1] text-stone-700 hover:bg-stone-50 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
        >
          Send Back / Rework
        </button>
      </div>

    </div>
  );
}
