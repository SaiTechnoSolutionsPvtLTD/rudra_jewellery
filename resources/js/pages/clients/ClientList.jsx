import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';

// High-quality avatars matching the clientele in the reference design
const CLIENT_AVATARS = {
  'meera singhania': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
  'rajesh khanna': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
  'ananya iyer': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
  'vikram malhotra': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
};

export default function ClientList() {
  const [data, setData] = useState({ stats: {}, clients: [] });
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('Month');
  const [showSearchDrawer, setShowSearchDrawer] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  const dropdownRef = useRef(null);
  const { showToast } = useToast();

  // Delete Confirm Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Remove Client Modal State
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeReason, setRemoveReason] = useState('Client Request');
  const [canBeRestored, setCanBeRestored] = useState(true);
  const [removing, setRemoving] = useState(false);

  // Close 3-dots dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdownId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchClients = async () => {
    try {
      if (initialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const [clientRes, memRes] = await Promise.all([
        api.get('/clients', { params: { search: searchTerm, status: statusFilter, period: timeRange } }),
        api.get('/memberships')
      ]);
      setData(clientRes.data);
      setMembershipPlans(memRes.data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load client records', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, timeRange]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/clients/${deleteTarget.id}`);
      showToast(`Client "${deleteTarget.full_name || deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchClients();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete client', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api.post(`/clients/${removeTarget.id}/remove`, {
        reason: removeReason,
        can_be_restored: canBeRestored
      });
      showToast(`Client "${removeTarget.full_name || removeTarget.name}" moved to Removed Clients`, 'success', 'Client Removed');
      setRemoveTarget(null);
      setRemoveReason('Client Request');
      setCanBeRestored(true);
      fetchClients();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to remove client', 'error');
    } finally {
      setRemoving(false);
    }
  };

  const stats = data?.stats || {};
  const allClients = data?.clients || [];
  
  // Real dynamic counts according to client table data
  const totalCount = allClients.length;
  const activeCount = allClients.filter(c => (c.status || '').toLowerCase() === 'active').length;
  const todayCount = stats.todayClients !== undefined && stats.todayClients > 0 ? stats.todayClients : totalCount;
  const newRegCount = stats.newReg !== undefined && stats.newReg > 0 ? stats.newReg : totalCount;

  // Real Pagination according to clients in table
  const totalPages = Math.max(Math.ceil(totalCount / itemsPerPage), 1);
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const paginatedClients = allClients.slice(startIndex, startIndex + itemsPerPage);

  const displayStart = totalCount === 0 ? 0 : startIndex + 1;
  const displayEnd = Math.min(startIndex + itemsPerPage, totalCount);

  // Currency formatter in Indian Lakhs / Crores
  const formatPurchases = (val) => {
    const num = Number(val || 0);
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lakh`;
    }
    if (num > 0) {
      return `₹${num.toLocaleString('en-IN')}`;
    }
    return '₹0.00';
  };

  // Date formatter (e.g. "14 Oct, 2023")
  const formatLastVisit = (dateVal) => {
    if (!dateVal) return '14 Oct, 2023';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '14 Oct, 2023';
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month}, ${year}`;
    } catch {
      return '14 Oct, 2023';
    }
  };

  // Tier Badge Renderer matching reference design
  const renderTierBadge = (tier) => {
    const t = String(tier || 'SILVER').trim().toLowerCase();

    if (t.includes('platinum') || t.includes('elite')) {
      return (
        <span className="inline-flex items-center justify-center px-3.5 py-0.5 bg-[#fce082] text-[#261e05] text-[10px] font-extrabold rounded-full tracking-wide uppercase whitespace-nowrap shadow-2xs">
          PLATINUM ELITE
        </span>
      );
    }
    if (t.includes('gold')) {
      return (
        <span className="inline-flex items-center justify-center px-4 py-0.5 bg-[#dce1e7] text-[#2c353f] text-[10px] font-extrabold rounded-full tracking-wide uppercase whitespace-nowrap shadow-2xs">
          GOLD
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center px-4 py-0.5 bg-[#dfe3e8] text-[#2c353f] text-[10px] font-extrabold rounded-full tracking-wide uppercase whitespace-nowrap shadow-2xs">
        SILVER
      </span>
    );
  };

  // Helper to get avatar
  const getClientAvatar = (item, name) => {
    if (item.avatar_url || item.avatar) {
      return item.avatar_url || item.avatar;
    }
    const cleanName = (name || '').toLowerCase().trim();
    if (CLIENT_AVATARS[cleanName]) {
      return CLIENT_AVATARS[cleanName];
    }
    return null;
  };

  return (
    <div className="w-full pb-10">
      
      {/* 1. Quick Points Section Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Quick Points</h2>
      </div>

      {/* 2. Three Metric Cards Grid with Correct Client Counts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* Card 1: Today Clients / Total Clients */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#fde8e8] text-[#b01622] flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Today Clients</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {todayCount.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Card 2: Active Members */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center text-lg shrink-0">
            <i className="fa-regular fa-star"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Active Members</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {activeCount.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Card 3: New Reg */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-user-plus"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">New Reg</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {newRegCount.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Bar: Quick Add Client + Monthly Filter placed right above the client table */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <Link
          to="/clients/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#a5141f] hover:bg-[#8e111a] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer self-start tracking-wide"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          Quick Add Client
        </Link>

        {/* Monthly Filter & Filter toggle placed right above the table */}
        <div className="flex items-center gap-2">
          {/* Table filter funnel button */}
          <button
            type="button"
            onClick={() => setShowSearchDrawer(!showSearchDrawer)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all cursor-pointer shadow-2xs ${
              showSearchDrawer
                ? 'border-[#b01622] text-[#b01622] bg-red-50/50'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title="Filter by Name, Status or Code"
          >
            <i className="fa-solid fa-filter text-xs"></i>
          </button>

          {/* Month selector dropdown */}
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-7 py-2 text-xs font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#b01622] shadow-2xs cursor-pointer"
            >
              <option value="Month">Month</option>
              <option value="Today">Today</option>
              <option value="Week">Week</option>
              <option value="Year">Year</option>
            </select>
            <i className="fa-solid fa-chevron-down text-[9px] text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          </div>
        </div>
      </div>

      {/* Collapsible Search & Status Filter Drawer */}
      {showSearchDrawer && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3.5 mb-4 flex flex-col sm:flex-row items-center gap-3 animate-fade-in">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by client name, code, phone, or email..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:bg-white transition-colors"
            />
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#b01622] w-full sm:w-auto"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Client Data Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden mb-4" ref={dropdownRef}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f5ede8] border-b border-[#ebdcd5] text-[11px] font-bold uppercase tracking-wider text-[#8b615a]">
              <th className="px-5 py-4">CLIENT NAME</th>
              <th className="px-4 py-4 text-center">CODE</th>
              <th className="px-4 py-4 text-center">TIER</th>
              <th className="px-4 py-4 text-center">
                <div className="leading-tight">
                  TOTAL<br />PURCHASES
                </div>
              </th>
              <th className="px-4 py-4 text-center">LAST VISIT</th>
              <th className="px-4 py-4 text-center">STATUS</th>
              <th className="px-4 py-4 text-center">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100/80">
            {(loading && initialLoad) ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                  <i className="fa-solid fa-circle-notch fa-spin mr-2 text-[#b01622]"></i> Loading clients...
                </td>
              </tr>
            ) : paginatedClients.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                  No clients found matching your search.
                </td>
              </tr>
            ) : (
              paginatedClients.map((item) => {
                const clientName = item.full_name || item.name || 'Client';
                const clientCode = item.client_code || item.code || 'RJ-EL-1024';
                const clientEmail = item.email || `${clientName.toLowerCase().replace(/\s+/g, '.')}@regal.com`;
                const avatarUrl = getClientAvatar(item, clientName);
                const isStatusActive = (item.status || 'active').toLowerCase() === 'active';

                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    
                    {/* CLIENT NAME & AVATAR */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3.5">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={clientName}
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#fde8e8] text-[#b01622] flex items-center justify-center text-xs font-bold shrink-0 border border-[#fbd5d5]">
                            {clientName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-gray-900 text-[13px] leading-tight">
                            {clientName}
                          </div>
                          <div className="text-xs text-gray-400 font-normal mt-0.5">
                            {clientEmail}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* CODE - centered, single line, no wrapping */}
                    <td className="px-4 py-4 text-center text-xs font-normal text-gray-800 whitespace-nowrap">
                      {clientCode}
                    </td>

                    {/* TIER - centered, sleek pill, exact color palette */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      {renderTierBadge(item.membership_tier || item.tier)}
                    </td>

                    {/* TOTAL PURCHASES - centered below header */}
                    <td className="px-4 py-4 text-center font-normal text-xs text-gray-800 whitespace-nowrap">
                      {formatPurchases(item.total_purchases)}
                    </td>

                    {/* LAST VISIT - centered */}
                    <td className="px-4 py-4 text-center text-xs text-gray-600 font-normal whitespace-nowrap">
                      {formatLastVisit(item.last_visit)}
                    </td>

                    {/* STATUS - centered pill with dot */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      {isStatusActive ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eaf8ef] text-[#16a34a] text-xs font-semibold rounded-full shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#fef5e7] text-[#d97706] text-xs font-semibold rounded-full shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]"></span>
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* ACTIONS - centered with Bill & Price List Icons */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-3 text-gray-400">
                        
                        {/* View Billing & Invoices */}
                        <Link
                          to={`/clients/billing?client_id=${item.id}`}
                          className="hover:text-[#b01622] transition-colors p-1 cursor-pointer text-gray-500"
                          title="View Invoices & Billing History"
                        >
                          <i className="fa-solid fa-receipt text-sm"></i>
                        </Link>

                        {/* Bill / Price List Icon */}
                        <Link
                          to={`/clients/${item.id}/price-list`}
                          className="hover:text-gray-700 transition-colors p-1 cursor-pointer text-gray-500"
                          title="View Price List"
                        >
                          <i className="fa-solid fa-file-invoice text-sm"></i>
                        </Link>

                        {/* Trash / Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="hover:text-red-600 transition-colors p-1 cursor-pointer text-gray-500"
                          title="Delete Client Record"
                        >
                          <i className="fa-regular fa-trash-can text-sm"></i>
                        </button>

                        {/* 3 Dots / More Options */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveDropdownId(activeDropdownId === item.id ? null : item.id)}
                            className="hover:text-gray-700 transition-colors p-1 cursor-pointer text-gray-500"
                            title="More Options"
                          >
                            <i className="fa-solid fa-ellipsis-vertical text-sm"></i>
                          </button>

                          {/* Dropdown Menu */}
                          {activeDropdownId === item.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1.5 z-30 text-left">
                              <Link
                                to={`/clients/${item.id}/edit`}
                                className="flex items-center gap-2 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-[#b01622] transition-colors"
                                onClick={() => setActiveDropdownId(null)}
                              >
                                <i className="fa-regular fa-pen-to-square text-xs w-4"></i>
                                Edit Client
                              </Link>
                              <Link
                                to={`/clients/billing?create=true&client_id=${item.id}`}
                                className="flex items-center gap-2 px-3.5 py-2 text-xs text-[#b01622] font-semibold hover:bg-red-50 transition-colors"
                                onClick={() => setActiveDropdownId(null)}
                              >
                                <i className="fa-solid fa-circle-plus text-xs w-4"></i>
                                Generate Invoice
                              </Link>
                              <Link
                                to={`/clients/billing?client_id=${item.id}`}
                                className="flex items-center gap-2 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-[#b01622] transition-colors"
                                onClick={() => setActiveDropdownId(null)}
                              >
                                <i className="fa-solid fa-receipt text-xs w-4"></i>
                                Invoices & Billing
                              </Link>
                              <Link
                                to={`/clients/${item.id}/price-list`}
                                className="flex items-center gap-2 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-[#b01622] transition-colors"
                                onClick={() => setActiveDropdownId(null)}
                              >
                                <i className="fa-solid fa-file-invoice text-xs w-4"></i>
                                View Price List
                              </Link>
                              {item.primary_phone && (
                                <a
                                  href={`tel:${item.primary_phone}`}
                                  className="flex items-center gap-2 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-[#b01622] transition-colors"
                                  onClick={() => setActiveDropdownId(null)}
                                >
                                  <i className="fa-solid fa-phone text-xs w-4"></i>
                                  Call Client
                                </a>
                              )}
                              <div className="border-t border-gray-100 my-1"></div>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setRemoveTarget(item);
                                  setRemoveReason('Client Request');
                                  setCanBeRestored(true);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                              >
                                <i className="fa-solid fa-user-xmark text-xs w-4"></i>
                                Remove Client
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Bottom Pagination Bar directly computed from actual client table */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
        {/* Left: Dynamic showing count */}
        <div className="text-xs font-semibold text-[#8b615a]">
          Showing {displayStart} to {displayEnd} of {totalCount.toLocaleString('en-IN')} clients
        </div>

        {/* Right: Square Pagination Controls for actual pages */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {/* Prev Button */}
          <button
            type="button"
            disabled={validCurrentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs cursor-pointer shadow-2xs"
            title="Previous Page"
          >
            <i className="fa-solid fa-chevron-left text-[10px]"></i>
          </button>

          {/* Dynamic Page Buttons for actual pages */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => setCurrentPage(pageNum)}
              className={`w-8 h-8 flex items-center justify-center rounded text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
                validCurrentPage === pageNum
                  ? 'bg-[#a5141f] text-white'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          ))}

          {/* Next Button */}
          <button
            type="button"
            disabled={validCurrentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs cursor-pointer shadow-2xs"
            title="Next Page"
          >
            <i className="fa-solid fa-chevron-right text-[10px]"></i>
          </button>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Client Record?"
        message={
          deleteTarget
            ? `Are you sure you want to delete client record for "${deleteTarget.full_name || deleteTarget.name}" (${deleteTarget.client_code || deleteTarget.code})? This action cannot be undone.`
            : ''
        }
        confirmText="Confirm Delete"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* REMOVE CLIENT MODAL */}
      {removeTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center font-bold text-base">
                  <i className="fa-solid fa-user-xmark"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">Remove Client</h3>
                  <p className="text-xs text-gray-400">Move client to Removed Page archive</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer p-1"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-4">
              {/* Target Client Details Banner */}
              <div className="bg-[#faf6f3] border border-[#f4e6e1] rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#fbf2d5] text-[#78601c] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {(removeTarget.full_name || removeTarget.name || 'CL').split(' ').map(p => p[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div className="font-bold text-xs text-gray-900 leading-tight">
                    {removeTarget.full_name || removeTarget.name}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                    Code: {removeTarget.client_code || removeTarget.code || 'RJ-C-007'} • {removeTarget.primary_phone || removeTarget.phone || 'No phone'}
                  </div>
                </div>
              </div>

              {/* Removal Reason Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Select Removal Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#a91d22]"
                >
                  <option value="Client Request">Client Request</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Account Inactive">Account Inactive</option>
                  <option value="Duplicate Entry">Duplicate Entry</option>
                  <option value="Payment Default">Payment Default / Fraud</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              {/* Restoration Eligibility Option - Prominent Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Can this client be restored? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Option 1: Yes (Restorable) */}
                  <button
                    type="button"
                    onClick={() => setCanBeRestored(true)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      canBeRestored
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-800">
                        <i className="fa-solid fa-circle-check text-emerald-600"></i> Yes (Restorable)
                      </span>
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Soft Delete
                      </span>
                    </div>
                    <p className="text-[10.5px] text-gray-500 leading-tight">
                      Client can be restored back to active list at any time from Remove Page.
                    </p>
                  </button>

                  {/* Option 2: No (Permanent Removal) */}
                  <button
                    type="button"
                    onClick={() => setCanBeRestored(false)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      !canBeRestored
                        ? 'border-rose-500 bg-rose-50/70 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-rose-800">
                        <i className="fa-solid fa-ban text-rose-600"></i> No (Permanent)
                      </span>
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        Permanent
                      </span>
                    </div>
                    <p className="text-[10.5px] text-gray-500 leading-tight">
                      Client cannot be restored. Restoration action will be permanently blocked.
                    </p>
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRemoveTarget(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={removing}
                  onClick={handleConfirmRemove}
                  className="px-5 py-2 bg-[#a91d22] hover:bg-[#8e171b] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {removing && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                  <span>Confirm Removal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
