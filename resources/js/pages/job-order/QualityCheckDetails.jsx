import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const tabs = [
  ['Work in Progress', '/job-order/in-progress'],
  ['Delay / Job Details', '/job-order/delay'],
  ['Waste Details', '/job-order/waste'],
  ['Quality Check & Final Receive', '/job-order/quality-check'],
  ['History', '/job-order/history'],
];

const checkItems = [
  { key: 'purity', label: 'Gold Purity', expected: '22K (916)', note: 'Purity 22K confirmed' },
  { key: 'weight', label: 'Weight Verification', expected: 'Allotted weight', note: 'Weight matches order' },
  { key: 'diamond', label: 'Diamond / Stone Check', expected: 'VS1 / G - Good', note: 'All stones OK' },
  { key: 'polish', label: 'Polish / Finish', expected: 'High Standard', note: 'Good finish' },
  { key: 'hallmark', label: 'Hallmark Verification', expected: 'BIS Hallmarked', note: 'Hallmark verified' },
  { key: 'quality', label: 'Overall Quality', expected: 'As per Standard', note: 'Approved' },
];

const displayDate = (value) => value ? new Date(value).toLocaleDateString('en-GB') : '20/04/2024';

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

  // Pagination state for check points
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const totalChecks = checkItems.length;
  const totalPages = Math.ceil(totalChecks / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startRecord = totalChecks === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(safePage * itemsPerPage, totalChecks);
  const paginatedCheckItems = checkItems.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

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
        setStatuses(Object.fromEntries(checkItems.map((item) => [item.key, saved[item.key] === false ? 'Pending' : 'Accept'])));
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
  const jobId = order?.design_code || order?.work_order_number || (order?.id ? `ORD-${order.id}` : '—');
  const clientId = order?.client?.client_code || (order?.client_id ? `CL-${order.client_id}` : '—');
  const clientName = order?.customer_name || order?.client?.full_name || order?.client?.name || '—';
  const karigarName = order?.karigar?.name || order?.karigar_name || 'Unassigned';
  const receivedWeight = Number(order?.completed_weight || 0);
  const wastage = Number(order?.wastage_weight || 0);
  const wastagePercent = Number(order?.wastage_allowed_percent || 0);

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

  if (!order) {
    return (
      <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-400 font-semibold mb-1.5"><span>Manufacturing</span><span>&gt;</span><span>Job Orders</span><span>&gt;</span><span>Reception</span><span>&gt;</span><span className="text-stone-600">Quality Check</span></div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Quality Check &amp; Final Receive</h1>
          </div>
          <Link to="/job-order/receive" className="px-4 py-2 bg-white border border-stone-300 text-stone-800 text-xs font-semibold rounded-lg shadow-2xs hover:bg-stone-50">Back to Receive Summary</Link>
        </div>

        <div className="border-b border-stone-200 flex items-center gap-8 overflow-x-auto no-scrollbar">
          {tabs.map(([label, path]) => (
            <Link key={path} to={path} className={`pb-3 text-sm whitespace-nowrap border-b-2 ${path === '/job-order/quality-check' ? 'font-bold text-[#b01622] border-[#b01622]' : 'font-medium text-stone-500 border-transparent hover:text-stone-900'}`}>{label}</Link>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-full bg-red-50 text-[#b01622] flex items-center justify-center text-2xl">
            <i className="fa-solid fa-list-check"></i>
          </div>
          <h2 className="text-lg font-bold text-gray-900">No Job Orders Pending Quality Check</h2>
          <p className="text-xs text-stone-500 max-w-md">
            There are currently no job orders awaiting quality check inspection in the database.
          </p>
          <Link
            to="/job-order/new"
            className="px-4 py-2.5 bg-[#b01622] text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-[#8e111a] transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Create New Job Order</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-gray-800">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-400 font-semibold mb-1.5"><span>Manufacturing</span><span>&gt;</span><span>Job Orders</span><span>&gt;</span><span>Reception</span><span>&gt;</span><span className="text-stone-600">Quality Check</span></div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Quality Check &amp; Final Receive - {jobId}</h1>
          {ongoingOrders.length > 0 && <select value={order?.id || ''} onChange={switchOrder} className="mt-3 w-full sm:w-[420px] text-sm bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 font-semibold shadow-2xs cursor-pointer focus:outline-hidden focus:border-[#b01622]">{ongoingOrders.map((ongoingOrder) => <option key={ongoingOrder.id} value={ongoingOrder.id}>Switch: {ongoingOrder.design_code || ongoingOrder.work_order_number} ({ongoingOrder.product_name})</option>)}</select>}
        </div>
        <Link to={openTab('/job-order/receive')} className="px-4 py-2 bg-white border border-stone-300 text-stone-800 text-xs font-semibold rounded-lg shadow-2xs hover:bg-stone-50">Back to Receive Summary</Link>
      </div>

      <div className="border-b border-stone-200 flex items-center gap-8 overflow-x-auto no-scrollbar">
        {tabs.map(([label, path]) => <Link key={path} to={openTab(path)} className={`pb-3 text-sm whitespace-nowrap border-b-2 ${path === '/job-order/quality-check' ? 'font-bold text-[#b01622] border-[#b01622]' : 'font-medium text-stone-500 border-transparent hover:text-stone-900'}`}>{label}</Link>)}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[[ 'Job ID', jobId ], [ 'Client ID', clientId ], [ 'Client Name', clientName ], [ 'Assigned Karigar', karigarName ], [ 'Work Completed', displayDate(order?.karigar_submitted_at || order?.updated_at) ]].map(([label, value]) => <div key={label} className="min-w-0"><span className="text-[11px] font-medium text-stone-400 block">{label}</span><span className="text-xs font-bold text-gray-900 block mt-0.5 truncate" title={value}>{value}</span></div>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-8 bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Quality Check (All Receive)</h2>
          <div className="grid grid-cols-[1.2fr_1fr_0.8fr_1.4fr] gap-x-3 px-2 pb-2 text-[10px] font-bold text-stone-400 uppercase border-b border-stone-200"><span>Check Point</span><span>Expected</span><span>Status</span><span>Remarks</span></div>
          <div className="divide-y divide-stone-100">
            {paginatedCheckItems.map((item) => <div key={item.key} className="grid grid-cols-[1.2fr_1fr_0.8fr_1.4fr] gap-x-3 items-center px-2 py-3 text-xs"><span className="font-medium text-gray-800">{item.label}</span><span className="text-stone-500">{item.expected}</span><select value={statuses[item.key] || 'Accept'} onChange={(event) => setStatuses((current) => ({ ...current, [item.key]: event.target.value }))} className={`w-fit px-2 py-1 rounded-md border text-[11px] font-semibold outline-hidden ${statuses[item.key] === 'Pending' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><option>Accept</option><option>Pending</option></select><span className="text-stone-500">{item.note}</span></div>)}
          </div>

          {/* Pagination Controls */}
          <div className="mt-4 pt-3 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
            <div>
              Showing {startRecord} to {endRecord} of {totalChecks} entries
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={safePage <= 1}
                className="w-7 h-7 rounded-md border border-stone-200 hover:bg-stone-50 flex items-center justify-center text-stone-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                &lt;
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${
                    safePage === pageNum
                      ? 'bg-[#b01622] text-white'
                      : 'border border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={safePage >= totalPages}
                className="w-7 h-7 rounded-md border border-stone-200 hover:bg-stone-50 flex items-center justify-center text-stone-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                &gt;
              </button>
            </div>
          </div>
        </section>

        <section className="lg:col-span-4 bg-white rounded-xl border border-stone-200 p-4 h-fit">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Final Receive Summary</h2>
          <div className="space-y-3 text-xs"><div className="flex justify-between"><span className="text-stone-500">Received Weight (g)</span><span className="font-mono font-bold">{receivedWeight.toFixed(3)}</span></div><div className="flex justify-between"><span className="text-stone-500">Wastage (g)</span><span className="font-mono font-bold">{wastage.toFixed(3)}</span></div><div className="flex justify-between"><span className="text-stone-500">Wastage (%)</span><span className="font-mono font-bold">{wastagePercent.toFixed(2)}%</span></div><div className="flex justify-between"><span className="text-stone-500">QC Status</span><span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">Pending</span></div><div className="flex justify-between"><span className="text-stone-500">Verified By</span><span className="font-semibold">Admin</span></div><div className="flex justify-between"><span className="text-stone-500">Verification Date</span><span className="font-semibold">{displayDate(order?.updated_at)}</span></div></div>
          <button type="button" onClick={handleRework} disabled={saving || !notes.trim()} className="w-full mt-5 py-2 border border-[#b01622] text-[#b01622] rounded-md text-xs font-bold hover:bg-red-50 disabled:opacity-50">Send Back for Rework</button>
        </section>
      </div>

      <section className="bg-white rounded-xl border border-stone-200 p-4 max-w-[calc(66.666%-0.75rem)]"><label className="text-xs font-bold text-gray-800 block mb-2">Remarks (Optional)</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="3" placeholder="Quality check is good. Ready to deliver." className="w-full border border-stone-200 rounded-lg p-3 text-xs text-gray-700 outline-hidden focus:border-[#b01622] resize-none" /></section>

      <div className="flex items-center gap-3"><button type="button" onClick={handleApprove} disabled={saving} className="px-5 py-2.5 bg-[#b01622] text-white rounded-md text-xs font-bold hover:bg-[#8f1019] disabled:opacity-50">Final Receive &amp; Approve</button><button type="button" onClick={handleRework} disabled={saving || !notes.trim()} className="px-5 py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md text-xs font-bold hover:bg-stone-50 disabled:opacity-50">Send Back / Rework</button></div>
    </div>
  );
}