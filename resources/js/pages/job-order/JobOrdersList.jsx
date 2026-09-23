import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function JobOrdersList() {
  const navigate = useNavigate();
  const toast = useToast();

  const [timeRange, setTimeRange] = useState('Month');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterRef = useRef(null);
  const tableScrollRef = useRef(null);
  const actionMenuRef = useRef(null);

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [liveJobs, setLiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state driven by backend API
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 4,
    total: 0,
    from: 0,
    to: 0,
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterDropdownOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchJobOrders(currentPage);
  }, [timeRange, currentPage]);

  const fetchJobOrders = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get('/work-orders/dashboard-stats', {
        params: { range: timeRange, page, per_page: 4 },
      });

      if (res.data?.status === 'success') {
        const d = res.data.data || res.data;
        setLiveJobs(Array.isArray(d.live_jobs) ? d.live_jobs : []);

        if (d.pagination) {
          setPaginationMeta({
            current_page: d.pagination.current_page || 1,
            last_page: d.pagination.last_page || 1,
            per_page: d.pagination.per_page || 4,
            total: d.pagination.total || 0,
            from: d.pagination.from || 0,
            to: d.pagination.to || 0,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load ongoing work orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    try {
      if (liveJobs.length === 0) {
        toast.info?.('No ongoing work orders available to export.');
        return;
      }
      const headers = ['Order ID', 'Artisan Name', 'Product / Item Type', 'Stage', 'Allotted Wt (g)', 'Completed Wt (g)', 'Pending Wt (g)', 'Due Date', 'Overdue'];
      const rows = liveJobs.map((j) => [
        `"${j.work_order_number}"`,
        `"${j.artisan_name}"`,
        `"${j.item_type}"`,
        `"${j.stage}"`,
        `"${j.allotted_weight || 0}"`,
        `"${j.completed_weight || 0}"`,
        `"${j.pending_weight || 0}"`,
        `"${j.due_date}"`,
        `"${j.is_overdue ? 'YES' : 'NO'}"`,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
          `"Rudra Jewellery - Ongoing Job Orders Report"`,
          `"Generated At: ${new Date().toLocaleString()}"`,
          '',
          headers.join(','),
          ...rows.map((e) => e.join(',')),
        ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Ongoing_Job_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success?.('Report downloaded successfully!');
    } catch (err) {
      toast.error?.('Failed to generate report.');
    }
  };

  return (
    <div className="w-full pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-gray-800 antialiased">
      
      {/* 1. Header & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 font-semibold mb-1">
            <span>Manufacturing</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-300"></i>
            <span className="text-stone-800 font-bold">Job Orders</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#111827] tracking-tight">
            Ongoing Projects & Job Orders
          </h1>
          <p className="text-xs text-[#6b7280] font-normal mt-0.5">
            Active artisan manufacturing orders list. Click any project row to open its sub-pages.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Download Report Button */}
          <button
            type="button"
            onClick={handleDownloadReport}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-[#374151] text-xs font-semibold rounded-xl border border-[#d1d5db] transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <i className="fa-solid fa-arrow-down-to-line text-xs text-gray-500"></i>
            <span>Download Report</span>
          </button>

          {/* New Work Order Button */}
          <Link
            to="/job-order/new"
            className="px-4 py-2 bg-[#9e1b27] hover:bg-[#83141f] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            <span>New Work Order</span>
          </Link>
        </div>
      </div>

      {/* 3. Full-Width Ongoing Projects List Table Section */}
      <div className="bg-white rounded-2xl border border-[#eceff3] p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#111827] tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9e1b27] animate-pulse"></span>
              <span>Ongoing Projects List</span>
            </h2>
            <p className="text-[11px] text-gray-400 font-normal mt-0.5">
              Click on any project row to open its Work in Progress, Delay, Waste, and Quality Check sub-pages.
            </p>
          </div>

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#e5e7eb] rounded-full text-xs font-medium text-[#4b5563] hover:border-gray-300 hover:text-gray-900 transition-colors cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-filter text-[11px] text-[#9ca3af]"></i>
              <span>{timeRange}</span>
              <i className={`fa-solid fa-chevron-down text-[9px] text-[#9ca3af] transition-transform ${filterDropdownOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {filterDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                {['Today', 'This Week', 'Month', 'This Quarter', 'This Year'].map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => {
                      setTimeRange(range);
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                      timeRange === range
                        ? 'bg-red-50 text-[#9e1b27] font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table View */}
        <div ref={tableScrollRef} className="overflow-x-auto scroll-smooth py-1">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="text-[10px] font-bold text-[#9ca3af] tracking-wider uppercase border-b border-gray-100 bg-stone-50/50">
                <th className="py-3 px-3 font-semibold whitespace-nowrap text-center w-12">S.NO</th>
                <th className="py-3 px-3.5 font-semibold whitespace-nowrap">WORK ORDER NO</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap">PRODUCT / ITEM</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap">AACHARI (ARTISAN)</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap text-right">ALLOTTED WT</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap text-right">COMPLETED WT</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap text-right">PENDING WT</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap">STAGE</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap">DUE DATE</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap text-center">STATUS</th>
                <th className="py-3 px-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && liveJobs.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-8 text-center text-gray-400 text-xs">
                    <i className="fa-solid fa-spinner fa-spin text-[#9e1b27] mr-2"></i>
                    Loading ongoing project work orders...
                  </td>
                </tr>
              ) : liveJobs.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-8 text-center text-gray-400 text-xs">
                    No active ongoing work orders found. Click "+ New Work Order" to create one.
                  </td>
                </tr>
              ) : (
                liveJobs.map((job, idx) => (
                  <tr
                    key={job.id}
                    onClick={() => navigate(`/job-order/in-progress?order_id=${job.id}`)}
                    className="hover:bg-stone-50/70 transition-colors group cursor-pointer"
                  >
                    {/* S.No */}
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-gray-400 text-xs whitespace-nowrap">
                      {(paginationMeta.current_page - 1) * (paginationMeta.per_page || 4) + idx + 1}
                    </td>

                    {/* Order ID */}
                    <td className="py-3.5 px-3.5 font-mono font-bold text-[#b01622] group-hover:underline text-xs whitespace-nowrap">
                      {job.work_order_number}
                    </td>

                    {/* Item Type */}
                    <td className="py-3.5 px-3 font-bold text-gray-900 text-xs">
                      <div className="max-w-[190px] truncate" title={job.item_type}>
                        {job.item_type}
                      </div>
                    </td>

                    {/* Artisan Name with Avatar */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] ${job.avatar_color}`}>
                          {job.initials}
                        </div>
                        <span className="font-semibold text-gray-900 text-xs">
                          {job.artisan_name}
                        </span>
                      </div>
                    </td>

                    {/* Allotted Wt */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-gray-900 text-xs whitespace-nowrap">
                      {Number(job.allotted_weight || 0).toFixed(3)}g
                    </td>

                    {/* Completed Wt */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 text-xs whitespace-nowrap">
                      {Number(job.completed_weight || 0).toFixed(3)}g
                    </td>

                    {/* Pending Wt */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-red-600 text-xs whitespace-nowrap">
                      {Number(job.pending_weight || 0).toFixed(3)}g
                    </td>

                    {/* Stage Pill */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${job.stage_class}`}>
                        {job.stage}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td className={`py-3.5 px-3 text-xs whitespace-nowrap font-medium ${
                      job.is_overdue ? 'text-[#dc2626] font-bold' : 'text-gray-500'
                    }`}>
                      {job.due_date}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase ${
                        job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        job.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
                        job.status === 'delayed' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {job.status?.replace('_', ' ') || 'ongoing'}
                      </span>
                    </td>

                    {/* 3-dots Actions Menu */}
                    <td className="py-3.5 px-2 text-right relative whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === job.id ? null : job.id);
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center text-xs transition-colors cursor-pointer ml-auto"
                      >
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                      </button>

                      {/* Dropdown Menu - Left-aligned to button with z-50 */}
                      {activeMenuId === job.id && (
                        <div
                          ref={actionMenuRef}
                          className="absolute right-8 -top-2 w-48 bg-white rounded-xl shadow-2xl border border-stone-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                        >
                          <Link
                            to={`/job-order/in-progress?order_id=${job.id}`}
                            className="w-full px-3.5 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2.5 font-semibold transition-colors"
                          >
                            <i className="fa-solid fa-file-invoice text-[#b01622] text-xs"></i>
                            <span>View Project Sub-Pages</span>
                          </Link>
                          <a
                            href={`/work-orders/${job.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full px-3.5 py-2 text-xs text-[#9e1b27] hover:bg-red-50 flex items-center gap-2.5 font-bold border-t border-stone-100 transition-colors"
                          >
                            <i className="fa-solid fa-file-pdf text-xs"></i>
                            <span>Download Work Order PDF</span>
                          </a>
                        </div>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-3 border-t border-gray-100">
          <div className="text-[11px] text-[#6b7280]">
            Showing{' '}
            <span className="font-semibold text-gray-900">{paginationMeta.from || 0}</span> to{' '}
            <span className="font-semibold text-gray-900">{paginationMeta.to || 0}</span> of{' '}
            <span className="font-semibold text-gray-900">{paginationMeta.total || 0}</span> ongoing work orders
          </div>

          {/* Dynamic Pagination Controls */}
          <div className="flex items-center gap-1">
            {/* Previous */}
            <button
              type="button"
              disabled={paginationMeta.current_page <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="w-6 h-6 flex items-center justify-center rounded border border-[#e5e7eb] disabled:opacity-40 text-gray-500 hover:bg-gray-50 text-[11px] transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-chevron-left text-[9px]"></i>
            </button>

            {/* Numbered Page Buttons */}
            {Array.from({ length: paginationMeta.last_page || 1 }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-6 h-6 flex items-center justify-center rounded text-[11px] font-semibold cursor-pointer ${
                  paginationMeta.current_page === pageNum
                    ? 'bg-[#9e1b27] text-white'
                    : 'border border-[#e5e7eb] text-gray-700 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            ))}

            {/* Next */}
            <button
              type="button"
              disabled={paginationMeta.current_page >= paginationMeta.last_page}
              onClick={() => setCurrentPage((prev) => Math.min(paginationMeta.last_page, prev + 1))}
              className="w-6 h-6 flex items-center justify-center rounded border border-[#e5e7eb] disabled:opacity-40 text-gray-500 hover:bg-gray-50 text-[11px] transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-chevron-right text-[9px]"></i>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
