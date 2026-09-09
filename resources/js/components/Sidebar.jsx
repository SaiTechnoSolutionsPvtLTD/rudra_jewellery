import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  const isJobCreationActive = location.pathname.startsWith('/job-creation');
  const isAuthActive = location.pathname.startsWith('/authentication');
  const isMastersActive = location.pathname.startsWith('/masters');
  const isPurchaseActive = location.pathname.startsWith('/purchase');

  const [jobAccordionOpen, setJobAccordionOpen] = useState(isJobCreationActive);
  const [authAccordionOpen, setAuthAccordionOpen] = useState(isAuthActive);
  const [mastersAccordionOpen, setMastersAccordionOpen] = useState(isMastersActive);
  const [purchaseAccordionOpen, setPurchaseAccordionOpen] = useState(isPurchaseActive);

  return (
    <aside className="w-64 bg-white text-gray-600 border-r border-gray-200 flex flex-col h-full shrink-0 relative z-20 transition-all duration-300" id="sidebar">
      {/* Logo Area */}
      <div className="h-32 bg-[#b01622] flex items-center justify-center border-b border-white/10 p-2">
        <img src="/logo.png" alt="Rudra Jewellers" className="h-full w-full object-contain" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-4 px-3 flex flex-col gap-1">
        
        {/* Dashboard */}
        <Link
          to="/dashboard"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            location.pathname === '/dashboard' || location.pathname === '/'
              ? 'bg-red-50 text-[#b01622] border-l-4 border-[#b01622]'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <i className="fa-solid fa-house w-5 text-center"></i>
          Dashboard
        </Link>

        {/* Masters (Accordion Group) */}
        <div className="mt-1 mb-1">
          <button
            type="button"
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isMastersActive
                ? 'bg-red-50 text-[#b01622] font-semibold border-l-4 border-[#b01622]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            onClick={() => setMastersAccordionOpen(!mastersAccordionOpen)}
          >
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-cubes w-5 text-center"></i>
              Masters
            </div>
            <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${mastersAccordionOpen ? 'rotate-180' : ''}`}></i>
          </button>
          {mastersAccordionOpen && (
            <div className="flex flex-col gap-1 mt-1 pl-4 pr-2">
              <Link
                to="/masters/categories"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/masters/categories'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Category
              </Link>
              <Link
                to="/masters/subcategories"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/masters/subcategories'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Subcategory
              </Link>
              <Link
                to="/masters/products"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname.startsWith('/masters/products')
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Product
              </Link>
              <Link
                to="/masters/memberships"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/masters/memberships'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Membership
              </Link>
            </div>
          )}
        </div>

        {/* Job Creation (Accordion Group) */}
        <div className="mt-1 mb-1">
          <button
            type="button"
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isJobCreationActive
                ? 'bg-red-50 text-[#b01622] font-semibold border-l-4 border-[#b01622]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            onClick={() => setJobAccordionOpen(!jobAccordionOpen)}
          >
            <div className="flex items-center gap-3">
              <i className="fa-regular fa-calendar-plus w-5 text-center"></i>
              Job Creation
            </div>
            <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${jobAccordionOpen ? 'rotate-180' : ''}`}></i>
          </button>
          {jobAccordionOpen && (
            <div className="flex flex-col gap-1 mt-1 pl-4 pr-2">
              <Link
                to="/job-creation/new"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/job-creation/new'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                New Work Order
              </Link>
              <Link
                to="/job-creation/receive"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/job-creation/receive'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Receive Worker
              </Link>
              <Link
                to="/job-creation/order"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/job-creation/order'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Job Order
              </Link>
            </div>
          )}
        </div>

        {/* Karigar Management */}
        <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-users-gear w-5 text-center"></i>
            Karigar Management
          </div>
          <i className="fa-solid fa-chevron-right text-[10px]"></i>
        </a>

        {/* Clients (Single Direct Link) */}
        <Link
          to="/clients"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            location.pathname === '/clients' || location.pathname.startsWith('/clients/')
              ? 'bg-red-50 text-[#b01622] font-semibold border-l-4 border-[#b01622]'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <i className="fa-regular fa-user w-5 text-center"></i>
          Clients
        </Link>

        {/* Authentication Accordion Group */}
        <div className="mt-1 mb-1">
          <button
            type="button"
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isAuthActive
                ? 'bg-red-50 text-[#b01622] font-semibold border-l-4 border-[#b01622]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            onClick={() => setAuthAccordionOpen(!authAccordionOpen)}
          >
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-shield-halved w-5 text-center"></i>
              Authentication
            </div>
            <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${authAccordionOpen ? 'rotate-180' : ''}`}></i>
          </button>
          {authAccordionOpen && (
            <div className="flex flex-col gap-1 mt-1 pl-4 pr-2">
              <Link
                to="/authentication/users"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/authentication/users'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Users
              </Link>
              <Link
                to="/authentication/roles"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/authentication/roles'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Roles
              </Link>
              <Link
                to="/authentication/permissions"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/authentication/permissions'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Permission
              </Link>
            </div>
          )}
        </div>

        {/* Stock Management (Single Separate Menu Link) */}
        <Link
          to="/stock-management"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            location.pathname === '/stock-management'
              ? 'bg-red-50 text-[#b01622] font-semibold border-l-4 border-[#b01622]'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <i className="fa-solid fa-layer-group w-5 text-center"></i>
          Stock Management
        </Link>

        {/* Supplier Management (Single Separate Menu Link) */}
        <Link
          to="/stock-management/suppliers"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            location.pathname === '/stock-management/suppliers'
              ? 'bg-red-50 text-[#b01622] font-semibold border-l-4 border-[#b01622]'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <i className="fa-solid fa-building-user w-5 text-center"></i>
          Supplier Management
        </Link>

        {/* Report */}
        <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <div className="flex items-center gap-3">
            <i className="fa-regular fa-file-lines w-5 text-center"></i>
            Report
          </div>
          <i className="fa-solid fa-chevron-right text-[10px]"></i>
        </a>

        {/* Purchase Entry (Accordion Group) */}
        <div className="mt-1 mb-1">
          <button
            type="button"
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isPurchaseActive
                ? 'bg-red-50 text-[#b01622] font-semibold border-l-4 border-[#b01622]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            onClick={() => setPurchaseAccordionOpen(!purchaseAccordionOpen)}
          >
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-cart-shopping w-5 text-center"></i>
              Purchase Entry
            </div>
            <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${purchaseAccordionOpen ? 'rotate-180' : ''}`}></i>
          </button>
          {purchaseAccordionOpen && (
            <div className="flex flex-col gap-1 mt-1 pl-4 pr-2">
              <Link
                to="/purchase/new"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/purchase/new' || location.pathname === '/purchase/entry'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                New Purchase Entry
              </Link>
              <Link
                to="/purchase/details"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/purchase/details'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Purchase Entry Details
              </Link>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
