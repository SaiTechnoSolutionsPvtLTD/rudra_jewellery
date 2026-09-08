import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ConfirmModal from './ConfirmModal';

export default function Header() {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [rates, setRates] = useState(null);
  const [loadingRates, setLoadingRates] = useState(true);

  useEffect(() => {
    api.get('/metal-rates')
      .then(res => {
        setRates(res.data);
        setLoadingRates(false);
      })
      .catch(err => {
        console.error('Error fetching Chennai live metal rates:', err);
        setLoadingRates(false);
      });
  }, []);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setShowLogoutModal(false);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-10">
      {/* Left Side */}
      <div className="flex items-center gap-4 flex-1">
        <button className="text-gray-500 hover:text-gray-700 lg:hidden">
          <i className="fa-solid fa-bars text-xl"></i>
        </button>
        
        <div className="relative w-full max-w-md hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-12 py-2 border border-gray-200 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] bg-gray-50/50"
            placeholder="Search..."
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <span className="text-gray-400 text-xs flex gap-1">
              <kbd className="border border-gray-200 rounded px-1 text-[10px] bg-white">⌘</kbd>
              <kbd className="border border-gray-200 rounded px-1 text-[10px] bg-white">F</kbd>
            </span>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-6">
        {/* Chennai Live Gold & Silver Rate Widget */}
        <div className="hidden md:flex items-center gap-3 bg-amber-50/80 border border-amber-200/80 rounded-full px-4 py-1.5 shadow-2xs">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
            ₹
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
              <span>Today's Rate ({rates?.location || 'Chennai'} • {rates?.date || 'Today'})</span>
              {rates?.isLive && (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold mt-0.5">
              <span className="text-amber-800">24K (999) <span className="text-[#b01622] font-bold">₹{rates?.gold24k || '7,320'}</span></span>
              <span className="text-gray-300">|</span>
              <span className="text-amber-800">22K (916) <span className="text-[#b01622] font-bold">₹{rates?.gold22k || '6,710'}</span></span>
              <span className="text-gray-300">|</span>
              <span className="text-slate-700">Silver <span className="text-[#b01622] font-bold">₹{rates?.silverGram || '94.0'}/g</span></span>
            </div>
          </div>
        </div>

        {/* Icons */}
        <div className="flex items-center gap-3">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors border border-gray-200">
            <i className="fa-regular fa-bell"></i>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors border border-gray-200">
            <i className="fa-regular fa-comment-dots"></i>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </div>

        {/* User Profile / Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-[#b01622]">
              {user?.name || 'Arvind'} <span className="text-gray-500 font-normal text-xs">({user?.role || 'Super Admin'})</span>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-1.5 text-xs text-gray-500 hover:text-[#b01622] rounded transition-colors cursor-pointer"
            title="Sign Out"
          >
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
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
