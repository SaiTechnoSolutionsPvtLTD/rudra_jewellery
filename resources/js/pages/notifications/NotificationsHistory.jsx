import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';

export default function NotificationsHistory() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, unread, read
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchNotifications = useCallback(async (targetPage = page, targetPerPage = perPage) => {
    try {
      setLoading(true);
      const params = {
        paginate: 1,
        page: targetPage,
        per_page: targetPerPage,
        filter: activeTab,
      };

      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const res = await api.get('/notifications', { params });
      if (res.data?.status === 'success') {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unread_count || 0);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
          setPage(res.data.pagination.current_page);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
      showToast?.('Failed to load notifications history.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCategory, debouncedSearch, page, perPage, showToast]);

  useEffect(() => {
    fetchNotifications(page, perPage);
  }, [page, perPage, activeTab, selectedCategory, debouncedSearch]);

  const handleMarkRead = async (notif, e) => {
    e?.stopPropagation();
    try {
      await api.post(`/notifications/${notif.id}/read`);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      showToast?.('Marked as read', 'success');
    } catch {
      showToast?.('Failed to mark as read', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      showToast?.('All notifications marked as read', 'success');
    } catch {
      showToast?.('Failed to mark all as read', 'error');
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      showToast?.('Notification removed', 'info');
    } catch {
      showToast?.('Failed to dismiss notification', 'error');
    }
  };

  const handleNavigate = (notif) => {
    if (!notif.is_read) {
      handleMarkRead(notif);
    }
    const url = notif.action_url || (notif.work_order_id ? `/job-order/in-progress?order_id=${notif.work_order_id}` : null);
    if (url) {
      navigate(url);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'qc_submitted':
      case 'submitted':
        return { label: 'QC Submitted', icon: 'fa-paper-plane', bg: 'bg-blue-100 text-blue-800' };
      case 'qc_passed':
      case 'approved':
        return { label: 'QC Passed', icon: 'fa-check-double', bg: 'bg-emerald-100 text-emerald-800' };
      case 'returned':
        return { label: 'Rework Required', icon: 'fa-rotate-left', bg: 'bg-rose-100 text-rose-800' };
      case 'rework_resubmitted':
        return { label: 'Rework Resubmitted', icon: 'fa-arrows-rotate', bg: 'bg-purple-100 text-purple-800' };
      case 'work_order_created':
        return { label: 'New Work Order', icon: 'fa-file-lines', bg: 'bg-indigo-100 text-indigo-800' };
      case 'work_order_updated':
        return { label: 'Work Order Updated', icon: 'fa-pen-to-square', bg: 'bg-indigo-100 text-indigo-800' };
      case 'assigned':
        return { label: 'Artisan Assigned', icon: 'fa-user-tag', bg: 'bg-amber-100 text-amber-800' };
      case 'ready_for_receive':
        return { label: 'Ready to Receive', icon: 'fa-truck-ramp-box', bg: 'bg-teal-100 text-teal-800' };
      case 'piece_received':
        return { label: 'Piece Received', icon: 'fa-clipboard-check', bg: 'bg-emerald-100 text-emerald-800' };
      case 'certification_completed':
        return { label: 'Certified', icon: 'fa-certificate', bg: 'bg-sky-100 text-sky-800' };
      case 'hallmarking_completed':
        return { label: 'Hallmarked', icon: 'fa-stamp', bg: 'bg-yellow-100 text-yellow-800' };
      case 'inventory_posted':
        return { label: 'Inventory Posted', icon: 'fa-boxes-stacked', bg: 'bg-emerald-100 text-emerald-800' };
      case 'completed':
        return { label: 'Work Completed', icon: 'fa-circle-check', bg: 'bg-emerald-100 text-emerald-800' };
      case 'job_added':
        return { label: 'Job Added', icon: 'fa-circle-plus', bg: 'bg-indigo-100 text-indigo-800' };
      case 'progress_update':
        return { label: 'Progress Update', icon: 'fa-bars-progress', bg: 'bg-blue-100 text-blue-800' };
      case 'delay':
        return { label: 'Delayed', icon: 'fa-clock', bg: 'bg-red-100 text-red-800' };
      case 'sales_created':
        return { label: 'Sale Created', icon: 'fa-receipt', bg: 'bg-green-100 text-green-800' };
      case 'purchase_created':
        return { label: 'Purchase Entry', icon: 'fa-cart-shopping', bg: 'bg-cyan-100 text-cyan-800' };
      case 'stock_shortage':
        return { label: 'Stock Alert', icon: 'fa-triangle-exclamation', bg: 'bg-rose-100 text-rose-800' };
      case 'system':
      default:
        return { label: 'System', icon: 'fa-bell', bg: 'bg-amber-100 text-amber-800' };
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 font-['Inter',sans-serif]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg">
              <i className="fa-solid fa-bell"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight">Notification Center</h1>
              <p className="text-xs text-stone-500">Live operational events, QC approvals, gate milestones, and system updates</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <i className="fa-solid fa-check-double text-[#b01622]"></i>
              <span>Mark all read</span>
            </button>
          )}
          <button
            onClick={() => fetchNotifications(page, perPage)}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="Refresh"
          >
            <i className={`fa-solid fa-rotate ${loading ? 'animate-spin' : ''}`}></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab('all'); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => { setActiveTab('unread'); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'unread' ? 'bg-white text-[#b01622] shadow-2xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#b01622] text-white text-[10px] font-black rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('read'); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'read' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Read
          </button>
        </div>

        {/* Category Filter & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="w-full sm:w-auto bg-stone-50 border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-stone-800 focus:border-[#b01622]"
          >
            <option value="all">All Modules</option>
            <option value="qc">Quality Control (QC)</option>
            <option value="work_order">Work Orders &amp; Jobs</option>
            <option value="receive">Receiving &amp; Gates</option>
            <option value="sales_purchase">Sales &amp; Purchase</option>
          </select>

          <div className="relative w-full sm:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-stone-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-900 focus:border-[#b01622]"
            />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400 text-xs">
            <i className="fa-solid fa-spinner fa-spin text-2xl text-[#b01622] mb-3 block"></i>
            Loading notifications history...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center text-stone-400">
            <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center text-2xl text-stone-400 mx-auto mb-3">
              <i className="fa-regular fa-bell-slash"></i>
            </div>
            <h3 className="font-bold text-sm text-stone-700 mb-1">No notifications found</h3>
            <p className="text-xs text-stone-400">
              {activeTab === 'unread' ? 'You are all caught up! No unread notifications.' : 'No notification records match your filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {notifications.map((notif) => {
              const badge = getTypeBadge(notif.type);
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNavigate(notif)}
                  className={`p-4 sm:p-5 flex items-start gap-4 transition-colors cursor-pointer hover:bg-stone-50/80 ${
                    !notif.is_read ? 'bg-rose-50/20' : 'bg-white'
                  }`}
                >
                  {/* Badge Icon */}
                  <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-sm shadow-2xs ${badge.bg}`}>
                    <i className={`fa-solid ${badge.icon || 'fa-bell'}`}></i>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-[#b01622]"></span>
                        )}
                        <h4 className="font-bold text-sm text-stone-900 leading-snug">{notif.title}</h4>
                      </div>

                      <span className="text-[11px] text-stone-400 font-mono">
                        {notif.created_at ? new Date(notif.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        }) : '—'}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed mb-2">
                      {notif.message}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      {notif.work_order?.work_order_number && (
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-700 font-mono font-bold rounded-md">
                          WO: {notif.work_order.work_order_number}
                        </span>
                      )}
                      {notif.piece?.piece_number && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-mono font-bold rounded-md">
                          Piece #{notif.piece.piece_number}
                        </span>
                      )}
                      {notif.action_url && (
                        <span className="text-[#b01622] hover:underline font-bold flex items-center gap-1 cursor-pointer">
                          <span>Open Record</span>
                          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!notif.is_read && (
                      <button
                        onClick={(e) => handleMarkRead(notif, e)}
                        className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-xs transition-colors"
                        title="Mark as read"
                      >
                        <i className="fa-solid fa-check"></i>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-rose-100 hover:text-rose-700 text-stone-400 flex items-center justify-center text-xs transition-colors"
                      title="Dismiss"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.total > 0 && (
          <Pagination
            currentPage={pagination.current_page}
            totalPages={pagination.last_page}
            totalItems={pagination.total}
            itemsPerPage={pagination.per_page || perPage}
            onPageChange={(newPage) => {
              setPage(newPage);
            }}
            onItemsPerPageChange={(newPerPage) => {
              setPerPage(newPerPage);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
