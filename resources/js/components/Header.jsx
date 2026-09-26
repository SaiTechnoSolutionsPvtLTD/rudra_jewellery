import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ConfirmModal from './ConfirmModal';
import GoldRateEditModal from './GoldRateEditModal';

import { SHOW_STOCK_MANAGEMENT } from './Sidebar';

const QUICK_SEARCH_ITEMS = [
  { label: 'Inventory', path: '/inventory', section: 'Inventory', icon: 'fa-solid fa-boxes-stacked' },
  { label: 'Karigar Management', path: '/karigars', section: 'Artisans', icon: 'fa-solid fa-people-group' },
  { label: 'Work Specifications Master', path: '/masters/work-specifications', section: 'Masters', icon: 'fa-solid fa-shapes' },
  { label: 'Billing Dashboard', path: '/clients/billing', section: 'Clients', icon: 'fa-solid fa-receipt' },
  { label: 'Client Directory', path: '/clients', section: 'Clients', icon: 'fa-solid fa-user-group' },
  { label: 'Register New Client', path: '/clients/register', section: 'Clients', icon: 'fa-solid fa-user-plus' },
  { label: 'Product Upload', path: '/product-upload/step1', section: 'Product Upload', icon: 'fa-solid fa-cloud-arrow-up' },
  ...(SHOW_STOCK_MANAGEMENT ? [{ label: 'Stock Management', path: '/stock-management', section: 'Inventory', icon: 'fa-solid fa-boxes-stacked' }] : []),
  { label: 'Supplier Management', path: '/stock-management/suppliers', section: 'Inventory', icon: 'fa-solid fa-building-user' },
  { label: 'Purchase Entry', path: '/purchase/entry', section: 'Inventory', icon: 'fa-solid fa-cart-shopping' },
  { label: 'Categories Master', path: '/masters/categories', section: 'Masters', icon: 'fa-solid fa-layer-group' },
  { label: 'Subcategories Master', path: '/masters/subcategories', section: 'Masters', icon: 'fa-solid fa-diagram-project' },
  { label: 'Inventory & Products', path: '/inventory', section: 'Inventory', icon: 'fa-solid fa-boxes-stacked' },
  { label: 'Add New Product', path: '/inventory/add-new/category', section: 'Inventory', icon: 'fa-solid fa-plus' },
  { label: 'Bulk Product Upload', path: '/inventory/bulk-upload', section: 'Inventory', icon: 'fa-solid fa-cloud-arrow-up' },
  { label: 'Setting Styles Master', path: '/masters/setting-styles', section: 'Masters', icon: 'fa-solid fa-ring' },
  { label: 'Gold Types Master', path: '/masters/gold-types', section: 'Masters', icon: 'fa-solid fa-coins' },
  { label: 'Diamond Ranges Master', path: '/masters/diamond-ranges', section: 'Masters', icon: 'fa-solid fa-certificate' },
  { label: 'Memberships Master', path: '/masters/memberships', section: 'Masters', icon: 'fa-solid fa-id-card' },
  { label: 'Bank Accounts Master', path: '/masters/bank-accounts', section: 'Masters', icon: 'fa-solid fa-building-columns' },
  { label: 'Company Info Master', path: '/masters/info', section: 'Masters', icon: 'fa-solid fa-building' },
  { label: 'User Accounts', path: '/authentication/users', section: 'Security', icon: 'fa-solid fa-users-gear' },
  { label: 'Roles & Permissions', path: '/authentication/roles', section: 'Security', icon: 'fa-solid fa-user-shield' },
];

export default function Header({ toggleSidebar, sidebarOpen }) {
  const navigate = useNavigate();
  const { user, logout, isKarigar } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [rates, setRates] = useState(null);
  const [loadingRates, setLoadingRates] = useState(true);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);

  // Quick Auto-Search
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  const fetchMetalRates = () => {
    api.get('/metal-rates')
      .then(res => {
        if (res.data) setRates(res.data);
        setLoadingRates(false);
      })
      .catch(err => {
        console.error('Error fetching live metal rates:', err);
        setLoadingRates(false);
      });
  };

  useEffect(() => {
    fetchMetalRates();
    const interval = setInterval(fetchMetalRates, 60000);
    const handleSync = (e) => {
      if (e?.detail) setRates(prev => ({ ...prev, ...e.detail }));
      fetchMetalRates();
    };
    const handleOpenModal = () => setIsRateModalOpen(true);
    window.addEventListener('rudhra_price_list_updated', handleSync);
    window.addEventListener('rudhra_metal_rates_updated', handleSync);
    window.addEventListener('open_gold_rate_edit_modal', handleOpenModal);
    return () => {
      clearInterval(interval);
      window.removeEventListener('rudhra_price_list_updated', handleSync);
      window.removeEventListener('rudhra_metal_rates_updated', handleSync);
      window.removeEventListener('open_gold_rate_edit_modal', handleOpenModal);
    };
  }, []);

  // Keyboard shortcut Ctrl+F or Cmd+F
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live Notifications Feed
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifContainerRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.status === 'success') {
        const unreadList = (res.data.data || []).filter(n => !n.is_read);
        setNotifications(unreadList);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (e) {
      // quiet fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to dismiss search results & notification dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifications([]);
    } catch (e) { }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await api.post(`/notifications/${notif.id}/read`);
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) { }

    // Remove ONLY the clicked notification from active feed while keeping all others
    setNotifications(prev => prev.filter(item => item.id !== notif.id));
    setNotifOpen(false);

    const orderId = notif.data?.order_id || notif.work_order_id;
    if (orderId) {
      if (user?.role === 'Karigar' || isKarigar) {
        navigate(`/job-order/in-progress?order_id=${orderId}`);
      } else {
        navigate(`/job-order/receive?order_id=${orderId}`);
      }
    }
  };

  const searchResults = globalSearch.trim()
    ? QUICK_SEARCH_ITEMS.filter(item =>
      item.label.toLowerCase().includes(globalSearch.toLowerCase()) ||
      item.section.toLowerCase().includes(globalSearch.toLowerCase())
    )
    : [];

  const handleSelectResult = (path) => {
    setGlobalSearch('');
    setSearchOpen(false);
    navigate(path);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setShowLogoutModal(false);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 print:hidden">
      {/* Left Side: 3-line menu toggle icon + search bar */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="text-gray-700 hover:text-gray-900 cursor-pointer p-1.5 -ml-1 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center shrink-0"
          title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          aria-label="Toggle Sidebar"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* Global Auto Search */}
        <div ref={searchContainerRef} className="relative w-80 max-w-sm hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <i className="fa-solid fa-magnifying-glass text-xs"></i>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              if (globalSearch.trim()) setSearchOpen(true);
            }}
            className="w-full pl-9 pr-14 py-2 border border-gray-200 rounded-full text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-2 focus:ring-[#b01622]/10 bg-white shadow-2xs transition-all"
            placeholder="Auto-search pages, masters, clients..."
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {globalSearch ? (
              <button
                type="button"
                onClick={() => {
                  setGlobalSearch('');
                  setSearchOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600 text-xs mr-1 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            ) : (
              <span className="text-gray-400 text-[10px] font-mono tracking-wider bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                ⌘F
              </span>
            )}
          </div>

          {/* Quick Auto-Search Results Dropdown */}
          {searchOpen && globalSearch.trim() && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 max-h-80 overflow-y-auto animate-fade-in">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 flex items-center justify-between">
                <span>Quick Navigation</span>
                <span>{searchResults.length} Match{searchResults.length === 1 ? '' : 'es'}</span>
              </div>

              {searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectResult(item.path)}
                      className="w-full px-3.5 py-2 hover:bg-red-50/60 flex items-center justify-between text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-red-100 text-gray-600 group-hover:text-[#b01622] flex items-center justify-center text-xs transition-colors shrink-0">
                          <i className={item.icon}></i>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900 group-hover:text-[#b01622] transition-colors">
                            {item.label}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {item.section}
                          </p>
                        </div>
                      </div>
                      <i className="fa-solid fa-arrow-right text-[10px] text-gray-300 group-hover:text-[#b01622] transition-colors"></i>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-gray-400">
                  <p>No sections matching "{globalSearch}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Spacious Gap between searchbar and gold rate widget */}
      <div className="flex-1 min-w-[24px]"></div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Today's Gold Rate Widget (Clickable to Edit Rates) */}
        <div
          onClick={() => setIsRateModalOpen(true)}
          className="hidden lg:flex items-center gap-3 bg-[#fdf6ea] hover:bg-[#faeed6] border border-[#f5e7c8] hover:border-[#d69f2e] rounded-full px-4 py-1.5 shadow-2xs cursor-pointer group transition-all select-none"
          title="Click to edit or view today's gold rates"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#f5ca56] via-[#d69f2e] to-[#b37f1a] p-[1.5px] shadow-2xs shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-gradient-to-b from-[#ffdb73] via-[#e5aa32] to-[#bc8320] flex items-center justify-center border border-[#ffea9f]/60">
              <span className="text-white font-serif font-black text-sm drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)] leading-none">₹</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="text-[11px] font-semibold text-[#2D2A26] leading-tight whitespace-nowrap flex items-center gap-1.5">
              <span>Today's Gold Rate : <span className="font-normal text-[#4A4641]">{rates?.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></span>
              <i className="fa-solid fa-pen text-[9px] text-[#a38749] opacity-60 group-hover:opacity-100 transition-opacity"></i>
            </div>
            <div className="flex items-center gap-2 text-[10px] mt-0.5 whitespace-nowrap">
              <span className="text-[#a38749] font-semibold">24K (999) <span className="text-[#b01622] font-bold text-[11px]">₹{rates?.gold24k || '14,634'}</span></span>
              <span className="text-stone-300">|</span>
              <span className="text-[#a38749] font-semibold">22K (916) <span className="text-[#b01622] font-bold text-[11px]">₹{rates?.gold22k || '13,414'}</span></span>
              {rates?.isManual && (
                <span className="text-[8px] font-extrabold bg-amber-200/80 text-amber-900 px-1 rounded uppercase tracking-wider">Manual</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal for editing Gold & Silver Rates */}
        <GoldRateEditModal
          isOpen={isRateModalOpen}
          onClose={() => setIsRateModalOpen(false)}
          currentRates={rates}
          onSaved={(updated) => setRates(updated)}
        />

        {/* Live Notification Bell & Dropdown */}
        <div className="relative" ref={notifContainerRef}>
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            className={`relative w-9 h-9 flex items-center justify-center text-gray-700 hover:text-gray-900 rounded-full hover:bg-gray-50 transition-colors border ${notifOpen ? 'border-[#b01622] bg-red-50/30' : 'border-gray-200'
              } cursor-pointer shadow-2xs`}
            title="Notifications"
          >
            <i className="fa-regular fa-bell text-sm"></i>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#a5141f] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-2xs animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Panel */}
          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl border border-stone-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="p-3.5 px-4 bg-stone-50/90 border-b border-stone-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-gray-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-extrabold bg-[#a5141f] text-white px-2 py-0.5 rounded-full">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-[#b01622] hover:underline font-semibold cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 px-4 flex items-start gap-3 cursor-pointer hover:bg-stone-50 transition-colors ${!n.is_read ? 'bg-red-50/30 font-medium' : 'bg-white text-stone-600'
                        }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs mt-0.5 shadow-2xs ${n.type === 'submitted'
                            ? 'bg-blue-100 text-blue-700'
                            : n.type === 'rework_resubmitted'
                              ? 'bg-purple-100 text-purple-700'
                              : n.type === 'returned'
                                ? 'bg-rose-100 text-rose-700'
                                : n.type === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                          }`}
                      >
                        <i
                          className={`fa-solid ${n.type === 'submitted'
                              ? 'fa-paper-plane'
                              : n.type === 'rework_resubmitted'
                                ? 'fa-arrows-rotate'
                                : n.type === 'returned'
                                  ? 'fa-rotate-left'
                                  : n.type === 'approved'
                                    ? 'fa-check-double'
                                    : 'fa-bell'
                            }`}
                        ></i>
                      </div>
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-gray-900 leading-tight text-[12px]">{n.title}</h4>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#a5141f] shrink-0"></span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-600 mt-0.5 leading-snug line-clamp-2">
                          {n.message}
                        </p>
                        <span className="text-[10px] text-stone-400 mt-1 block font-mono">
                          {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-stone-400">
                    <i className="fa-regular fa-bell-slash text-2xl text-stone-300 block mb-2"></i>
                    <p>No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Subtle Vertical Divider */}
        <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>

        {/* User Profile Pill (Clean Text without avatar photo/logo) */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
          title="Account Menu / Logout"
        >
          <span className="text-[#a5141f] font-bold text-xs">{user?.name || 'Arvind'}</span>
          <span className="text-gray-500 font-normal text-xs">({user?.role || 'Super Admin'})</span>
          <i className="fa-solid fa-chevron-down text-[10px] text-gray-700 ml-1"></i>
        </button>
      </div>

      <ConfirmModal
        isOpen={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to log out of your account?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        headerIcon="fa-solid fa-right-from-bracket"
        confirmIcon="fa-solid fa-right-from-bracket"
        loading={isLoggingOut}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </header>
  );
}
