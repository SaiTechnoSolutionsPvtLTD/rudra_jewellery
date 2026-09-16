import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Toggle to true whenever you want to unhide the Stock Management module
export const SHOW_STOCK_MANAGEMENT = false;

export default function Sidebar({ sidebarOpen = true }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isJobCreationActive = location.pathname.startsWith('/job-order') || location.pathname.startsWith('/job-creation');
  const isJobOrderSubActive = [
    '/job-order/in-progress',
    '/job-order/delay',
    '/job-order/waste',
    '/job-order/quality-check',
    '/job-order/final-receive',
    '/job-order/history',
  ].some((p) => location.pathname.startsWith(p));

  const isAuthActive = location.pathname.startsWith('/authentication');
  const isMastersActive = location.pathname.startsWith('/masters');
  const isInventoryActive = location.pathname.startsWith('/inventory');
  const isPurchaseActive = location.pathname.startsWith('/purchase');
  const isProductUploadActive = location.pathname.startsWith('/product-upload');
  const isClientsActive = location.pathname.startsWith('/clients');
  const isSalesActive = location.pathname.startsWith('/sales');

  const [jobCreationAccordionOpen, setJobCreationAccordionOpen] = useState(true);
  const [jobOrderSubAccordionOpen, setJobOrderSubAccordionOpen] = useState(isJobOrderSubActive || true);
  const [authAccordionOpen, setAuthAccordionOpen] = useState(isAuthActive);
  const [mastersAccordionOpen, setMastersAccordionOpen] = useState(isMastersActive);
  const [purchaseAccordionOpen, setPurchaseAccordionOpen] = useState(isPurchaseActive);
  const [clientsAccordionOpen, setClientsAccordionOpen] = useState(isClientsActive);
  const [salesAccordionOpen, setSalesAccordionOpen] = useState(isSalesActive);

  useEffect(() => {
    if (isClientsActive) {
      setClientsAccordionOpen(true);
    }
  }, [location.pathname, isClientsActive]);

  useEffect(() => {
    if (isSalesActive) setSalesAccordionOpen(true);
  }, [location.pathname, isSalesActive]);

  return (
    <aside
      className={`bg-white text-gray-600 border-r border-gray-200 flex flex-col h-full shrink-0 relative z-20 transition-all duration-300 ease-in-out overflow-hidden ${
        sidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-r-0 pointer-events-none'
      }`}
      id="sidebar"
    >
      <div className="w-64 flex flex-col h-full shrink-0">
        {/* Logo Area */}
        <div className="bg-[#b9121b] flex items-center justify-center border-b border-black/10 px-6 py-6 shrink-0">
          <img src="/logo.png" alt="Rudra Jewellers" className="w-auto h-20 max-h-20 object-contain drop-shadow-xs" />
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
                to="/masters/memberships"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/masters/memberships'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Membership
              </Link>
              <Link
                to="/masters/setting-styles"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/masters/setting-styles'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Setting Styles
              </Link>
              <Link
                to="/masters/gold-types"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/masters/gold-types'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Gold Types
              </Link>
              <Link
                to="/masters/diamond-ranges"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/masters/diamond-ranges'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Diamond Ranges
              </Link>
              <Link
                to="/masters/work-specifications"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname.startsWith('/masters/work-specifications')
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Work Specification
              </Link>
            </div>
          )}
        </div>

        {/* Inventory Module (Directly below Masters) */}
        <Link
          to="/inventory"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            isInventoryActive
              ? 'bg-red-50 text-[#b01622] font-semibold border-l-4 border-[#b01622]'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <i className="fa-solid fa-boxes-stacked w-5 text-center"></i>
          Inventory
        </Link>

        {/* Job Creation (Main Module Accordion) */}
        <div className="mt-1 mb-1">
          <button
            type="button"
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              isJobCreationActive
                ? 'bg-red-50 text-[#b01622] font-semibold border-l-4 border-[#b01622]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            onClick={() => setJobCreationAccordionOpen(!jobCreationAccordionOpen)}
          >
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-briefcase w-5 text-center"></i>
              <span>Job Creation</span>
            </div>
            <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${jobCreationAccordionOpen ? 'rotate-180' : ''}`}></i>
          </button>

          {jobCreationAccordionOpen && (
            <div className="flex flex-col gap-1 mt-1 pl-4 pr-2">
              <Link
                to="/job-creation"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/job-creation' || location.pathname === '/job-creation/dashboard'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/job-order/new"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/job-order/new'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                New Work Order
              </Link>
              <Link
                to="/job-order/receive"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/job-order/receive'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Receive Work Order
              </Link>
              <Link
                to="/job-order"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/job-order' || [
                    '/job-order/in-progress',
                    '/job-order/delay',
                    '/job-order/waste',
                    '/job-order/quality-check',
                    '/job-order/final-receive',
                    '/job-order/history',
                  ].some((p) => location.pathname === p)
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
        <Link
          to="/karigars"
          className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            location.pathname.startsWith('/karigars')
              ? 'bg-red-50 text-[#b01622] font-semibold border-l-4 border-[#b01622]'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-users-gear w-5 text-center"></i>
            Karigar Management
          </div>
          <i className="fa-solid fa-chevron-right text-[10px]"></i>
        </Link>

        {/* Product Upload (Single Direct Link) */}
        <Link
          to="/product-upload/step1"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            location.pathname.startsWith('/product-upload')
              ? 'bg-red-50 text-[#b01622] font-semibold border-l-4 border-[#b01622]'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <i className="fa-solid fa-cloud-arrow-up w-5 text-center"></i>
          Product Upload
        </Link>

        {/* Sales Module */}
        <button
          type="button"
          onClick={() => setSalesAccordionOpen(!salesAccordionOpen)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            isSalesActive
              ? 'bg-red-50 text-[#b01622] font-semibold border-l-4 border-[#b01622]'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <i className="fa-solid fa-cart-shopping w-5 text-center"></i>
          <span className="flex-1 text-left">Sales</span>
          <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${salesAccordionOpen ? 'rotate-180' : ''}`}></i>
        </button>
        {salesAccordionOpen && (
          <div className="flex flex-col gap-1 mt-1 pl-4 pr-2">
            <Link to="/sales" className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${location.pathname === '/sales' ? 'text-[#b01622] font-bold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>Dashboard</Link>
            <Link to="/sales/customers" className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${location.pathname.startsWith('/sales/customers') ? 'text-[#b01622] font-bold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>Customers</Link>
            <Link to="/sales/rates" className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${location.pathname === '/sales/rates' ? 'text-[#b01622] font-bold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>Live rates</Link>
          </div>
        )}

        {/* Clients Accordion Group */}
        <div className="mt-1 mb-1">
          <button
            type="button"
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isClientsActive
                ? 'bg-red-50 text-[#b01622] font-semibold border-l-4 border-[#b01622]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            onClick={() => setClientsAccordionOpen(!clientsAccordionOpen)}
          >
            <div className="flex items-center gap-3">
              <i className="fa-regular fa-user w-5 text-center"></i>
              Clients
            </div>
            <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${clientsAccordionOpen ? 'rotate-180' : ''}`}></i>
          </button>
          {clientsAccordionOpen && (
            <div className="flex flex-col gap-1 mt-1 pl-4 pr-2">
              <Link
                to="/clients"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/clients' || location.pathname === '/clients/' || location.pathname === '/clients/create' || (location.pathname.startsWith('/clients/') && location.pathname.endsWith('/edit'))
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/clients/billing"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/clients/billing'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Billing
              </Link>
              <Link
                to="/clients/price-list"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname.includes('/price-list')
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Price List
              </Link>
              <Link
                to="/clients/removed"
                className={`flex items-center py-2 px-3 rounded-md text-sm transition-colors ${
                  location.pathname === '/clients/removed'
                    ? 'text-[#b01622] font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Remove Page
              </Link>
            </div>
          )}
        </div>

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

        {/* Stock Management (Single Separate Menu Link) - Set SHOW_STOCK_MANAGEMENT = true to unhide */}
        {SHOW_STOCK_MANAGEMENT && (
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
        )}

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
      </div>
    </aside>
  );
}
