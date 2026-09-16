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
    <div className="text-gray-800 antialiased overflow-hidden flex h-screen bg-[#f8fafc]">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto bg-[#fcfcfc] p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
