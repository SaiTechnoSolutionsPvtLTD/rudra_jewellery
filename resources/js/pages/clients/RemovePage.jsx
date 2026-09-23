import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function RemovePage() {
  const [data, setData] = useState({ stats: null, clients: [] });
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [removeDateFilter, setRemoveDateFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [restoredFilter, setRestoredFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('Month');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals
  const [selectedClient, setSelectedClient] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const { showToast } = useToast();
  const isFirstMount = React.useRef(true);

  const fetchRemovedClients = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clients/removed', {
        params: {
          search: searchTerm,
          remove_date: removeDateFilter,
          reason: reasonFilter,
          can_be_restored: restoredFilter,
          month: monthFilter,
        }
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load removed clients:', err);
      showToast('Failed to load removed clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      fetchRemovedClients();
      return;
    }

    const timer = setTimeout(() => {
      fetchRemovedClients();
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, removeDateFilter, reasonFilter, restoredFilter, monthFilter]);

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      await api.post(`/clients/${restoreTarget.id}/restore`);
      showToast(`Client "${restoreTarget.full_name}" restored successfully!`, 'success', 'Client Restored');
      setRestoreTarget(null);
      fetchRemovedClients();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to restore client', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const stats = data?.stats || {};

  const clients = data?.clients || [];

  // Filter clients on frontend as well
  const filteredClients = clients.filter((c) => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const matchName = (c.full_name || '').toLowerCase().includes(s);
      const matchEmail = (c.email || '').toLowerCase().includes(s);
      const matchPhone = (c.primary_phone || '').toLowerCase().includes(s);
      const matchCode = (c.client_code || '').toLowerCase().includes(s);
      if (!matchName && !matchEmail && !matchPhone && !matchCode) return false;
    }

    if (reasonFilter !== 'all') {
      if ((c.remove_reason || '').toLowerCase() !== reasonFilter.toLowerCase()) return false;
    }

    if (restoredFilter !== 'all') {
      const isYes = restoredFilter === 'yes';
      if (c.can_be_restored !== isYes) return false;
    }

    return true;
  });

  const totalFiltered = filteredClients.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(validCurrentPage * itemsPerPage, totalFiltered);
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Avatar colors matching the screenshot
  const getAvatarStyle = (index, initials) => {
    const styles = [
      'bg-[#fce8e8] text-[#cf3b3b]', // MS - Pink/Red
      'bg-[#fef0e0] text-[#e67e22]', // RK - Orange
      'bg-[#fef8e7] text-[#c99700]', // AI - Gold/Yellow
      'bg-[#f5eef8] text-[#8e44ad]', // VM - Purple
      'bg-[#eafaf1] text-[#27ae60]', // SR - Green
    ];
    return styles[index % styles.length];
  };

  return (
    <div className="space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] pb-10">
      
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
            <Link to="/clients" className="hover:text-gray-900 transition-colors">Client Management</Link>
            <span className="text-gray-400">›</span>
            <span className="text-[#801824] font-semibold">Remove Page</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Remove Page</h1>
        </div>

        {/* Top Right Controls (Funnel Filter + Month Dropdown) */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            type="button"
            className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:border-gray-300 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title="Filter Settings"
          >
            <i className="fa-solid fa-filter text-xs"></i>
          </button>

          <div className="relative">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-semibold rounded-xl px-4 py-2 pr-8 shadow-2xs cursor-pointer focus:outline-none focus:border-[#a91d22]"
            >
              <option value="Month">This Month</option>
              {Array.from({ length: 6 }).map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const val = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return <option key={val} value={val}>{val}</option>;
              })}
              <option value="All">All Time</option>
            </select>
            <i className="fa-solid fa-chevron-down text-[9px] text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          </div>
        </div>
      </div>

      {/* Top Stat Cards (4-grid layout exactly matching reference image) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Active Clients */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-[#cf3b3b] flex items-center justify-center text-sm">
                <i className="fa-solid fa-chart-column"></i>
              </div>
              <span className="text-xs font-medium text-gray-500">Active Clients</span>
            </div>
            {loading && !data.stats ? (
              <div className="h-8 w-20 bg-stone-200 animate-pulse rounded my-1"></div>
            ) : (
              <div className="text-2xl font-bold text-gray-900 tracking-tight pt-1">
                {stats.activeClients ?? '0'}
              </div>
            )}
            {loading && !data.stats ? (
              <div className="h-3.5 w-24 bg-stone-100 animate-pulse rounded mt-1"></div>
            ) : stats.activeGrowth ? (
              <div className="text-[11px] font-semibold text-emerald-600">
                {stats.activeGrowth}
              </div>
            ) : null}
          </div>
        </div>

        {/* Card 2: Removed Clients */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#d97706] flex items-center justify-center text-sm">
                <i className="fa-solid fa-user"></i>
              </div>
              <span className="text-xs font-medium text-gray-500">Removed Clients</span>
            </div>
            {loading && !data.stats ? (
              <div className="h-8 w-16 bg-stone-200 animate-pulse rounded my-1"></div>
            ) : (
              <div className="text-2xl font-bold text-gray-900 tracking-tight pt-1">
                {stats.removedClients ?? '0'}
              </div>
            )}
            {loading && !data.stats ? (
              <div className="h-3.5 w-24 bg-stone-100 animate-pulse rounded mt-1"></div>
            ) : stats.removedGrowth ? (
              <div className="text-[11px] font-semibold text-emerald-600">
                {stats.removedGrowth}
              </div>
            ) : null}
          </div>
        </div>

        {/* Card 3: This Month Removed */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-[#cf3b3b] flex items-center justify-center text-sm">
                <i className="fa-regular fa-trash-can"></i>
              </div>
              <span className="text-xs font-medium text-gray-500">This Month Removed</span>
            </div>
            {loading && !data.stats ? (
              <div className="h-8 w-14 bg-stone-200 animate-pulse rounded my-1"></div>
            ) : (
              <div className="text-2xl font-bold text-gray-900 tracking-tight pt-1">
                {stats.thisMonthRemoved ?? '0'}
              </div>
            )}
            {loading && !data.stats ? (
              <div className="h-3.5 w-24 bg-stone-100 animate-pulse rounded mt-1"></div>
            ) : stats.thisMonthGrowth ? (
              <div className="text-[11px] font-semibold text-emerald-600">
                {stats.thisMonthGrowth}
              </div>
            ) : null}
          </div>
        </div>

        {/* Card 4: Can Be Restored */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-yellow-50 text-[#ca8a04] flex items-center justify-center text-sm">
                <i className="fa-solid fa-box-archive"></i>
              </div>
              <span className="text-xs font-medium text-gray-500">Can Be Restored</span>
            </div>
            {loading && !data.stats ? (
              <div className="h-8 w-14 bg-stone-200 animate-pulse rounded my-1"></div>
            ) : (
              <div className="text-2xl font-bold text-gray-900 tracking-tight pt-1">
                {stats.canBeRestored ?? '0'}
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => setRestoredFilter('yes')}
                className="text-[11px] font-bold text-[#801824] hover:underline cursor-pointer"
              >
                View removed clients
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass text-gray-400 text-xs absolute left-3.5 top-1/2 -translate-y-1/2"></i>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search client name, email, mobile..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#a91d22] shadow-2xs"
          />
        </div>

        {/* Remove Date Filter */}
        <div className="relative min-w-[170px]">
          <input
            type="date"
            value={removeDateFilter}
            onChange={(e) => setRemoveDateFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shadow-2xs focus:outline-none focus:border-[#a91d22] cursor-pointer"
          />
        </div>

        {/* Remove Reason Dropdown */}
        <div className="relative min-w-[170px]">
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="w-full appearance-none px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shadow-2xs focus:outline-none focus:border-[#a91d22] cursor-pointer pr-8"
          >
            <option value="all">Remove Reason</option>
            <option value="Client Request">Client Request</option>
            <option value="Not Interested">Not Interested</option>
            <option value="Account Inactive">Account Inactive</option>
            <option value="Duplicate Entry">Duplicate Entry</option>
            <option value="Payment Default">Payment Default</option>
          </select>
          <i className="fa-solid fa-chevron-down text-[9px] text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
        </div>

        {/* Can Be Restored Dropdown */}
        <div className="relative min-w-[170px]">
          <select
            value={restoredFilter}
            onChange={(e) => setRestoredFilter(e.target.value)}
            className="w-full appearance-none px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shadow-2xs focus:outline-none focus:border-[#a91d22] cursor-pointer pr-8"
          >
            <option value="all">Can Be Restored</option>
            <option value="yes">Yes (Restorable)</option>
            <option value="no">No (Permanent)</option>
          </select>
          <i className="fa-solid fa-chevron-down text-[9px] text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
        </div>

      </div>

      {/* Removed Clients Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[840px]">
            <thead>
              <tr className="bg-[#fff6f5] border-b border-[#fae5e3] text-[10.5px] font-bold uppercase tracking-wider text-[#9b4b4b]">
                <th className="pl-4 pr-2 py-3.5 w-[18%]">CLIENT NAME</th>
                <th className="px-2 py-3.5 w-[16%]">EMAIL / MOBILE</th>
                <th className="px-2 py-3.5 w-[12%]">TOTAL PURCHASES</th>
                <th className="px-2 py-3.5 w-[12%]">REMOVE DATE</th>
                <th className="px-2 py-3.5 w-[13%]">REMOVE REASON</th>
                <th className="px-2 py-3.5 text-center w-[9%]">CAN BE RESTORED</th>
                <th className="px-2 py-3.5 w-[12%]">REMOVED BY</th>
                <th className="pl-2 pr-4 py-3.5 text-center w-[8%]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400 text-xs">
                    <i className="fa-solid fa-circle-notch fa-spin text-xl text-[#a91d22] mr-2"></i>
                    Loading removed client records...
                  </td>
                </tr>
              ) : paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400 text-xs">
                    No removed clients match the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client, idx) => (
                  <tr key={client.id || idx} className="hover:bg-[#fffdfd] transition-colors">
                    
                    {/* CLIENT NAME (Initials Avatar + Bold Name) */}
                    <td className="pl-4 pr-2 py-3.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-full ${getAvatarStyle(idx, client.initials)} flex items-center justify-center font-bold text-[10.5px] shrink-0 uppercase select-none`}>
                          {client.initials || (client.full_name || 'CL').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900 text-xs tracking-tight truncate">
                          {client.full_name}
                        </span>
                      </div>
                    </td>

                    {/* EMAIL / MOBILE (Stacked) */}
                    <td className="px-2 py-3.5">
                      <div className="text-xs text-gray-700 font-normal leading-tight truncate">
                        {client.email || '—'}
                      </div>
                      <div className="text-[11px] text-gray-400 font-normal mt-0.5 leading-tight truncate">
                        {client.primary_phone || '—'}
                      </div>
                    </td>

                    {/* TOTAL PURCHASES */}
                    <td className="px-2 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-gray-800 text-xs font-mono">
                        {client.formatted_purchases || '₹0.00'}
                      </span>
                    </td>

                    {/* REMOVE DATE (Date stacked on top of Time) */}
                    <td className="px-2 py-3.5 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-700 leading-tight">
                        {client.remove_date_formatted || '—'}
                      </div>
                      {client.remove_time_formatted && (
                        <div className="text-[11px] text-gray-400 mt-0.5 leading-tight">
                          {client.remove_time_formatted}
                        </div>
                      )}
                    </td>

                    {/* REMOVE REASON */}
                    <td className="px-2 py-3.5 text-xs text-gray-700 font-normal truncate">
                      {client.remove_reason || 'Client Request'}
                    </td>

                    {/* CAN BE RESTORED (Soft green or soft red pill) */}
                    <td className="px-2 py-3.5 text-center whitespace-nowrap">
                      {client.can_be_restored ? (
                        <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#e3f8ec] text-[#22c55e] select-none">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#feeceb] text-[#cf3b3b] select-none">
                          No
                        </span>
                      )}
                    </td>

                    {/* REMOVED BY */}
                    <td className="px-2 py-3.5 whitespace-nowrap">
                      <div className="text-xs text-gray-700 font-medium leading-tight">
                        {client.removed_by || 'Admin'}
                      </div>
                    </td>

                    {/* ACTIONS (Eye Icon + Restore Icon) */}
                    <td className="pl-2 pr-4 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2.5 text-gray-400">
                        {/* 1. View Eye */}
                        <button
                          type="button"
                          onClick={() => setSelectedClient(client)}
                          className="hover:text-gray-700 transition-colors p-1 cursor-pointer"
                          title="View Client Removal Details"
                        >
                          <i className="fa-regular fa-eye text-sm"></i>
                        </button>

                        {/* 2. Restore Icon */}
                        <button
                          type="button"
                          disabled={!client.can_be_restored}
                          onClick={() => setRestoreTarget(client)}
                          className={`p-1 transition-colors ${
                            client.can_be_restored
                              ? 'hover:text-[#b01622] cursor-pointer text-gray-400'
                              : 'opacity-30 cursor-not-allowed text-gray-300'
                          }`}
                          title={client.can_be_restored ? "Restore Client to Active List" : "Restoration Not Permitted"}
                        >
                          <i className="fa-solid fa-rotate-left text-sm"></i>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section (Fully dynamic with accurate counts) */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-500 bg-white">
          <div>
            Showing {totalFiltered > 0 ? `${startIndex + 1} to ${endIndex}` : '0'} of {totalFiltered} removed {totalFiltered === 1 ? 'client' : 'clients'}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Prev */}
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs cursor-pointer"
              title="Previous Page"
            >
              <i className="fa-solid fa-chevron-left text-[9px]"></i>
            </button>

            {/* Dynamic Page Buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  validCurrentPage === pageNum
                    ? 'bg-[#801824] text-white shadow-2xs'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            ))}

            {/* Next */}
            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs cursor-pointer"
              title="Next Page"
            >
              <i className="fa-solid fa-chevron-right text-[9px]"></i>
            </button>
          </div>
        </div>
      </div>

      {/* CLIENT DETAILS VIEW MODAL */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-[#801824] flex items-center justify-center font-bold text-sm">
                  <i className="fa-solid fa-user-xmark"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">Removed Client Profile</h3>
                  <span className="text-xs text-gray-400">Archive Record Details</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer p-1"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-gray-700">
              <div className="flex items-center gap-3 p-3 bg-[#faf6f3] border border-[#f4e6e1] rounded-xl">
                <div className="w-11 h-11 rounded-full bg-[#fbf2d5] text-[#78601c] flex items-center justify-center font-bold text-sm uppercase">
                  {selectedClient.initials || 'CL'}
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900 leading-tight">{selectedClient.full_name}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{selectedClient.email} • {selectedClient.primary_phone}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Client Code</span>
                  <span className="font-mono font-bold text-gray-800 text-xs">{selectedClient.client_code || '—'}</span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Purchases</span>
                  <span className="font-mono font-bold text-gray-800 text-xs">{selectedClient.formatted_purchases}</span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Removed Date</span>
                  <span className="font-semibold text-gray-800 text-xs">{selectedClient.remove_date_formatted} {selectedClient.remove_time_formatted}</span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Removed By</span>
                  <span className="font-semibold text-gray-800 text-xs">{selectedClient.removed_by}</span>
                </div>
              </div>

              <div className="p-3 bg-red-50/40 border border-red-100 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Removal Reason</span>
                <div className="font-bold text-gray-900 text-xs">{selectedClient.remove_reason}</div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-gray-500 font-medium">Restoration Status:</span>
                  <span className="ml-2 font-bold text-gray-900">
                    {selectedClient.can_be_restored ? 'Eligible for restoration' : 'Cannot be restored'}
                  </span>
                </div>
                {selectedClient.can_be_restored && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setRestoreTarget(selectedClient);
                    }}
                    className="px-3 py-1.5 bg-[#801824] hover:bg-[#5a1119] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate-left text-[11px]"></i>
                    <span>Restore</span>
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {restoreTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base">
                <i className="fa-solid fa-rotate-left"></i>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 leading-tight">Restore Client Record?</h3>
                <p className="text-xs text-gray-400">Reactivate client and return to main Client Dashboard</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-5 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-200">
              Are you sure you want to restore <strong className="text-gray-900">"{restoreTarget.full_name}"</strong> back to active status? This client will be immediately restored to the active Client List.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRestoreTarget(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={restoring}
                onClick={handleConfirmRestore}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {restoring && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                <span>Confirm Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
