import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    document.title = 'Rudra Jewellery - Dashboard';
    try {
      localStorage.removeItem('rj_sidebar_open');
    } catch (e) {}
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <div className="text-gray-800 antialiased overflow-hidden flex h-screen bg-[#f8fafc] print:h-auto print:overflow-visible print:block print:bg-white">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 print:h-auto print:overflow-visible print:block">
        <Header toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto bg-[#fcfcfc] p-6 flex flex-col justify-between print:p-0 print:bg-white print:overflow-visible print:block">
          <div>
            <Outlet />
          </div>
          <footer className="mt-10 pt-4 pb-2 border-t border-stone-200/80 text-center text-xs text-stone-500 font-medium tracking-wide print:hidden shrink-0">
            <span>© 2026 <strong className="font-bold text-[#b01622]">Rudhra Jewellers</strong>. All Rights Reserved.</span>
            <span className="mx-2 text-stone-300">|</span>
            <span>Developed by <strong className="font-semibold text-[#b01622]">Sai Techno Solutions</strong>.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
