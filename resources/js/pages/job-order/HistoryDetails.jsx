import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const tabs = [
  ['Work in Progress', '/job-order/in-progress'],
  ['Delay / Job Details', '/job-order/delay'],
  ['Waste Details', '/job-order/waste'],
  ['Quality Check & Final Receive', '/job-order/quality-check'],
  ['History', '/job-order/history'],
];

const displayDate = (value) => value ? new Date(value).toLocaleDateString('en-GB') : '20/04/2024';

export default function HistoryDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [ongoingOrders, setOngoingOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const queryId = new URLSearchParams(location.search).get('order_id');
        const listResponse = await api.get('/work-orders', { params: { tab: 'ongoing' } });
        const list = listResponse.data?.data || [];
        setOngoingOrders(list);
        const id = queryId || list[0]?.id;
        if (!id) return;
        const response = await api.get(`/work-orders/${id}`);
        if (mounted) setOrder(response.data?.data || null);
      } catch (error) {
        console.error('Failed to load work-order history:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [location.search]);

  const orderId = order?.id;
  const jobId = order?.design_code || order?.work_order_number || 'RJ-3836-000125';
  const clientId = order?.client?.client_code || (order?.client_id ? `CL-2024-00${order.client_id}` : 'CL-2024-00456');
  const clientName = order?.customer_name || order?.client?.full_name || order?.client?.name || 'Rajesh Vishwakarma';
  const karigarName = order?.karigar?.name || order?.karigar_name || 'Manikandan';
  const timeline = useMemo(() => {
    if (order?.timelines?.length) return order.timelines;
    return [{ stage_label: 'Work Order Created', stage: 'created', created_at: order?.created_at, action_by_name: 'Admin', notes: 'Work order created and assigned.' }];
  }, [order]);
  const openTab = (path) => `${path}${orderId ? `?order_id=${orderId}` : ''}`;
  const switchOrder = (event) => navigate(`/job-order/history?order_id=${event.target.value}`);

  if (loading) return <div className="min-h-[450px] flex items-center justify-center text-sm font-semibold text-stone-500">Loading history...</div>;

  return (
    <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-gray-800">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-xs text-stone-400 font-semibold mb-1.5"><span>Manufacturing</span><span>&gt;</span><span>Job Orders</span><span>&gt;</span><span>Reception</span><span>&gt;</span><span className="text-stone-600">History</span></div><h1 className="text-xl font-bold text-gray-900 tracking-tight">History &amp; Audit - {jobId}</h1>{ongoingOrders.length > 0 && <select value={order?.id || ''} onChange={switchOrder} className="mt-3 w-full sm:w-[420px] text-sm bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 font-semibold shadow-2xs cursor-pointer focus:outline-hidden focus:border-[#b01622]">{ongoingOrders.map((ongoingOrder) => <option key={ongoingOrder.id} value={ongoingOrder.id}>Switch: {ongoingOrder.design_code || ongoingOrder.work_order_number} ({ongoingOrder.product_name})</option>)}</select>}</div><Link to={openTab('/job-order/receive')} className="px-4 py-2 bg-white border border-stone-300 text-stone-800 text-xs font-semibold rounded-lg shadow-2xs hover:bg-stone-50">Back to Receive Summary</Link></div>
      <div className="border-b border-stone-200 flex items-center gap-8 overflow-x-auto no-scrollbar">{tabs.map(([label, path]) => <Link key={path} to={openTab(path)} className={`pb-3 text-sm whitespace-nowrap border-b-2 ${path === '/job-order/history' ? 'font-bold text-[#b01622] border-[#b01622]' : 'font-medium text-stone-500 border-transparent hover:text-stone-900'}`}>{label}</Link>)}</div>
      <div className="bg-white rounded-xl border border-stone-200 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">{[['Job ID', jobId], ['Client ID', clientId], ['Client Name', clientName], ['Assigned Karigar', karigarName], ['Current Status', order?.status || 'In Progress']].map(([label, value]) => <div key={label} className="min-w-0"><span className="text-[11px] font-medium text-stone-400 block">{label}</span><span className="text-xs font-bold text-gray-900 block mt-0.5 truncate" title={value}>{value}</span></div>)}</div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-8 bg-white rounded-xl border border-stone-200 p-4"><div className="flex items-center justify-between mb-4"><h2 className="text-sm font-bold text-gray-900">Work Order Timeline</h2><span className="text-xs text-stone-400">{timeline.length} updates</span></div><div className="relative pl-7 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-stone-200">{timeline.map((event, index) => <div key={event.id || `${event.stage}-${index}`} className="relative"><span className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-[#b01622] ring-4 ring-white"></span><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"><span className="text-xs font-bold text-gray-900">{event.stage_label || event.stage || 'Update'}</span><span className="text-[11px] font-mono text-stone-400">{event.created_at ? new Date(event.created_at).toLocaleString('en-GB') : '—'}</span></div><p className="text-xs text-stone-600 mt-1">{event.notes || 'Status progression recorded.'}</p><span className="text-[11px] text-stone-400 block mt-1">Recorded by: {event.action_by_name || 'System'}</span></div>)}</div></section>
        <section className="lg:col-span-4 bg-white rounded-xl border border-stone-200 p-4 h-fit"><h2 className="text-sm font-bold text-gray-900 mb-4">Audit Summary</h2><div className="space-y-3 text-xs"><div className="flex justify-between"><span className="text-stone-500">Created Date</span><span className="font-semibold">{displayDate(order?.created_at)}</span></div><div className="flex justify-between"><span className="text-stone-500">Allotted Date</span><span className="font-semibold">{displayDate(order?.allotted_date)}</span></div><div className="flex justify-between"><span className="text-stone-500">Due Date</span><span className="font-semibold">{displayDate(order?.delivery_date)}</span></div><div className="flex justify-between"><span className="text-stone-500">Last Updated</span><span className="font-semibold">{displayDate(order?.updated_at)}</span></div><div className="border-t border-stone-200 pt-3 flex justify-between"><span className="text-stone-500">Current Stage</span><span className="font-bold text-[#b01622]">{String(order?.current_stage || 'created').replace(/_/g, ' ')}</span></div></div></section>
      </div>

      <section className="bg-white rounded-xl border border-stone-200 overflow-hidden"><div className="px-4 py-3 border-b border-stone-200"><h2 className="text-sm font-bold text-gray-900">Audit Details</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-xs"><thead><tr className="bg-stone-50 text-stone-500 uppercase text-[11px] border-b border-stone-200"><th className="text-left px-4 py-3">Date &amp; Time</th><th className="text-left px-3 py-3">Event</th><th className="text-left px-3 py-3">Updated By</th><th className="text-left px-4 py-3">Remarks</th></tr></thead><tbody className="divide-y divide-stone-100">{timeline.map((event, index) => <tr key={`audit-${event.id || index}`}><td className="px-4 py-3 font-mono text-stone-500">{event.created_at ? new Date(event.created_at).toLocaleString('en-GB') : '—'}</td><td className="px-3 py-3 font-bold text-gray-900">{event.stage_label || event.stage || 'Update'}</td><td className="px-3 py-3 text-stone-600">{event.action_by_name || 'System'}</td><td className="px-4 py-3 text-stone-600">{event.notes || 'Status progression recorded.'}</td></tr>)}</tbody></table></div></section>
    </div>
  );
}