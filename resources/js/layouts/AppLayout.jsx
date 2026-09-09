import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function AppLayout() {
  useEffect(() => {
    document.title = 'Rudra Jewellery - Dashboard';
  }, []);
  return (
    <div className="text-gray-800 antialiased overflow-hidden flex h-screen bg-[#f8fafc]">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-[#fcfcfc] p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
