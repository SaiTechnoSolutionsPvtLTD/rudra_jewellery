import React, { lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import AppLayout from './layouts/AppLayout';
import Login from './pages/auth/Login';
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenReloaded = sessionStorage.getItem('rudhra_chunk_reloaded');
    try {
      return await componentImport();
    } catch (error) {
      const isChunkError =
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('Loading chunk') ||
        error?.name === 'ChunkLoadError';

      if (isChunkError && !pageHasBeenReloaded) {
        sessionStorage.setItem('rudhra_chunk_reloaded', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem('rudhra_chunk_reloaded');
      throw error;
    }
  });

const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
import ClientList from './pages/clients/ClientList';
import RegisterClient from './pages/clients/RegisterClient';
const BillingDashboard = lazyWithRetry(() => import('./pages/clients/BillingDashboard'));
import Users from './pages/authentication/Users';
import Roles from './pages/authentication/Roles';
import Permissions from './pages/authentication/Permissions';
import Categories from './pages/masters/Categories';
import Subcategories from './pages/masters/Subcategories';
import ItemsMaster from './pages/masters/ItemsMaster';
import Products from './pages/masters/Products';
import CreateProduct from './pages/masters/CreateProduct';
import Memberships from './pages/masters/Memberships';
import ClientPriceList from './pages/clients/ClientPriceList';
import RemovePage from './pages/clients/RemovePage';
import StockManagement from './pages/stock/StockManagement';
import SupplierManagement from './pages/stock/SupplierManagement';
import PurchaseEntry from './pages/purchase/PurchaseEntry';
import Step1Upload from './pages/product-upload/Step1Upload';
import Step2Catalog from './pages/product-upload/Step2Catalog';
import Step3Selection from './pages/product-upload/Step3Selection';
import Step4Download from './pages/product-upload/Step4Download';
import SettingStyles from './pages/masters/SettingStyles';
import GoldTypes from './pages/masters/GoldTypes';
import DiamondRanges from './pages/masters/DiamondRanges';
import DiamondColors from './pages/masters/DiamondColors';
import DiamondClarities from './pages/masters/DiamondClarities';
import Karats from './pages/masters/Karats';
import Stamps from './pages/masters/Stamps';
import Units from './pages/masters/Units';
import ComponentCategories from './pages/masters/ComponentCategories';
import WorkSpecifications from './pages/masters/WorkSpecifications';
import BankAccounts from './pages/masters/BankAccounts';
import Operations from './pages/masters/Operations';
import CompanyInfoMaster from './pages/masters/CompanyInfoMaster';
import RawMaterials from './pages/masters/RawMaterials';
const KarigarManagement = lazyWithRetry(() => import('./pages/karigar/KarigarManagement'));
const SalesModule = lazyWithRetry(() => import('./pages/sales/SalesModule'));
const ReportModule = lazyWithRetry(() => import('./pages/reports/ReportModule'));

// Inventory Module
const InventoryDashboard = lazyWithRetry(() => import('./pages/inventory/InventoryDashboard'));
import InventoryBulkUpload from './pages/inventory/InventoryBulkUpload';
import InventoryAddNewCategory from './pages/inventory/InventoryAddNewCategory';
import InventoryAddNewSubcategory from './pages/inventory/InventoryAddNewSubcategory';
import InventoryAddNewUpload from './pages/inventory/InventoryAddNewUpload';
import InventoryUploadComplete from './pages/inventory/InventoryUploadComplete';
const InventoryViewProduct = lazyWithRetry(() => import('./pages/inventory/InventoryViewProduct'));
const InventoryEditProduct = lazyWithRetry(() => import('./pages/inventory/InventoryEditProduct'));
import InventoryJewelleryTag from './pages/inventory/InventoryJewelleryTag';
import InventoryBarcodeTag from './pages/inventory/InventoryBarcodeTag';

// Job Order / Karigar Workflow Module
const JobCreationDashboard = lazyWithRetry(() => import('./pages/job-order/JobCreationDashboard'));
const JobOrdersList = lazyWithRetry(() => import('./pages/job-order/JobOrdersList'));
const NewWorkOrder = lazyWithRetry(() => import('./pages/job-order/NewWorkOrder'));
const ReceiverWork = lazyWithRetry(() => import('./pages/job-order/ReceiverWork'));
const WorkInProgress = lazyWithRetry(() => import('./pages/job-order/WorkInProgress'));
const JobOrderDelay = lazyWithRetry(() => import('./pages/job-order/JobOrderDelay'));
const JobOrderHub = lazyWithRetry(() => import('./pages/job-order/JobOrderHub'));
const TagPrinting = lazyWithRetry(() => import('./pages/job-order/TagPrinting'));
const NotificationsHistory = lazyWithRetry(() => import('./pages/notifications/NotificationsHistory'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b08]">
        <div className="w-10 h-10 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white text-sm font-semibold text-stone-500">Loading Rudhra Jewellers...</div>}>{children}</Suspense>;
};

const PermissionRoute = ({ requiredPermission, superAdminOnly, children }) => {
  const { isAuthenticated, loading, isSuperAdmin, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b08]">
        <div className="w-10 h-10 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (superAdminOnly && !isSuperAdmin) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-12 bg-rose-50 border border-rose-200 rounded-xl">
        <i className="fa-solid fa-shield-xmark text-4xl text-rose-600 mb-3 block"></i>
        <h3 className="text-lg font-bold text-rose-900 mb-1">Access Denied</h3>
        <p className="text-sm text-rose-700 mb-4">You do not have Super Administrator privileges to view this section.</p>
        <button onClick={() => window.location.href = '/dashboard'} className="px-4 py-2 bg-rose-700 text-white rounded-lg text-xs font-semibold hover:bg-rose-800">Return to Dashboard</button>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-12 bg-amber-50 border border-amber-200 rounded-xl">
        <i className="fa-solid fa-lock text-4xl text-amber-600 mb-3 block"></i>
        <h3 className="text-lg font-bold text-amber-900 mb-1">Permission Required</h3>
        <p className="text-sm text-amber-700 mb-4">You do not have the required permission ({requiredPermission}) to access this page.</p>
        <button onClick={() => window.location.href = '/dashboard'} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-semibold hover:bg-amber-800">Return to Dashboard</button>
      </div>
    );
  }

  return children;
};

const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b08]">
        <div className="w-10 h-10 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const HomeRedirect = () => {
  return <Navigate to="/dashboard" replace />;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
    const isChunkError =
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('Loading chunk');

    if (isChunkError) {
      const storageKey = 'rudhra_error_boundary_chunk_reload';
      if (!sessionStorage.getItem(storageKey)) {
        sessionStorage.setItem(storageKey, 'true');
        window.location.reload();
      }
    }
  }

  handleClearCacheAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) { }
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message?.includes('dynamically imported module') ||
        this.state.error?.message?.includes('Failed to fetch') ||
        this.state.error?.message?.includes('Loading chunk');

      return (
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6 font-['Inter',sans-serif]">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-stone-200 shadow-xl text-center space-y-4">
            <div className={`w-14 h-14 ${isChunkError ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'} rounded-full flex items-center justify-center mx-auto text-2xl`}>
              <i className={`fa-solid ${isChunkError ? 'fa-rotate' : 'fa-triangle-exclamation'}`}></i>
            </div>
            <h2 className="text-lg font-bold text-stone-900">
              {isChunkError ? 'Application Update Available' : 'Something went wrong'}
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              {isChunkError
                ? 'The application has been updated with latest components. Please reload the page to load the newest version.'
                : 'A temporary display issue occurred while rendering this view. Please try reloading or return to the dashboard.'}
            </p>
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-center text-xs text-stone-600">
              <span className="font-semibold text-stone-700">Status:</span> System Error (500)
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  try {
                    sessionStorage.removeItem('rudhra_chunk_reloaded');
                    sessionStorage.removeItem('rudhra_error_boundary_chunk_reload');
                  } catch (e) {}
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-[#b01622] text-white text-xs font-semibold rounded-xl hover:bg-[#8e111a] transition-colors cursor-pointer shadow-xs"
              >
                Reload &amp; Update
              </button>
              <button
                onClick={this.handleClearCacheAndReload}
                className="px-4 py-2.5 bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl hover:bg-stone-300 transition-colors cursor-pointer"
              >
                Reset Session &amp; Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Automatically updates document.title based on active route
 */
function PageTitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.toLowerCase().replace(/\/+$/, '') || '/';

    const titleMap = [
      { pattern: /^\/login$/, title: 'Login' },
      { pattern: /^\/(dashboard)?$/, title: 'Dashboard' },
      { pattern: /^\/notifications$/, title: 'Notifications' },

      // Job Order / Karigar Workflow
      { pattern: /^\/job-creation(\/dashboard)?$/, title: 'Job Creation' },
      { pattern: /^\/job-order\/new$/, title: 'New Work Order Creation' },
      { pattern: /^\/job-order\/receive$/, title: 'Receive Work Order' },
      { pattern: /^\/job-order\/tag-printing$/, title: 'Tag Printing' },
      { pattern: /^\/job-order\/(work-in-progress|in-progress)$/, title: 'Work In Progress' },
      { pattern: /^\/job-order\/(delay|delay-hold)$/, title: 'Delayed & On-Hold Jobs' },
      { pattern: /^\/job-order\/quality-check$/, title: 'Quality Check' },
      { pattern: /^\/job-order\/certification$/, title: 'Certification' },
      { pattern: /^\/job-order\/hallmarking$/, title: 'Hallmarking' },
      { pattern: /^\/job-order\/ready$/, title: 'Ready Orders' },
      { pattern: /^\/job-order\/final-receive$/, title: 'Final Receive' },
      { pattern: /^\/job-order\/history$/, title: 'Job History' },
      { pattern: /^\/job-orders?$/, title: 'Work In Progress' },
      { pattern: /^\/job-order\/[^\/]+(\/details)?$/, title: 'Work Order Details' },

      // Inventory
      { pattern: /^\/inventory$/, title: 'Inventory' },
      { pattern: /^\/inventory\/bulk-upload$/, title: 'Bulk Inventory Upload' },
      { pattern: /^\/inventory\/add-new\/category$/, title: 'Add Category' },
      { pattern: /^\/inventory\/add-new\/subcategory$/, title: 'Add Subcategory' },
      { pattern: /^\/inventory\/add-new\/upload$/, title: 'Add Product' },
      { pattern: /^\/inventory\/(add-new\/complete|upload-complete)$/, title: 'Upload Complete' },
      { pattern: /^\/inventory\/products\/[^\/]+\/edit$/, title: 'Edit Product' },
      { pattern: /^\/inventory\/products\/[^\/]+\/jewellery-tag$/, title: 'Jewellery Tag' },
      { pattern: /^\/inventory\/products\/[^\/]+\/barcode-tag$/, title: 'Barcode Tag' },
      { pattern: /^\/inventory\/products\/[^\/]+$/, title: 'View Product' },

      // Clients & Billing
      { pattern: /^\/clients\/billing$/, title: 'Billing Dashboard' },
      { pattern: /^\/clients\/create$/, title: 'Register Client' },
      { pattern: /^\/clients\/[^\/]+\/edit$/, title: 'Edit Client' },
      { pattern: /^\/clients(\/[^\/]+)?\/price-list$/, title: 'Client Price List' },
      { pattern: /^\/clients\/removed$/, title: 'Removed Clients' },
      { pattern: /^\/clients$/, title: 'Clients' },

      // Sales
      { pattern: /^\/sales$/, title: 'Sales Dashboard' },
      { pattern: /^\/sales\/list$/, title: 'Sales List' },
      { pattern: /^\/sales\/(create|customer)$/, title: 'New Sale' },
      { pattern: /^\/sales\/profit(-per-invoice)?$/, title: 'Profit Per Invoice' },
      { pattern: /^\/sales\/profit-per-metal$/, title: 'Profit Per Metal' },
      { pattern: /^\/sales\/rates$/, title: 'Live Metal Rates' },
      { pattern: /^\/sales\/customers$/, title: 'Customers' },
      { pattern: /^\/sales\/customers\/[^\/]+$/, title: 'Customer Profile' },
      { pattern: /^\/sales\/[^\/]+$/, title: 'Sale Invoice Details' },

      // Reports & Karigars & Suppliers & Purchases
      { pattern: /^\/reports(\/[^\/]+)?$/, title: 'Reports' },
      { pattern: /^\/karigars$/, title: 'Karigar Management' },
      { pattern: /^\/(stock-management\/)?suppliers$/, title: 'Supplier Management' },
      { pattern: /^\/purchase\/(entry|new)$/, title: 'Purchase Entry' },
      { pattern: /^\/purchase\/details$/, title: 'Purchase Details' },

      // Product Upload
      { pattern: /^\/product-upload(\/step1|\/upload)?$/, title: 'Product Upload' },
      { pattern: /^\/product-upload(\/step2|\/catalog|\/selection)$/, title: 'Product Catalog' },
      { pattern: /^\/product-upload(\/step3|\/step4|\/download)$/, title: 'Product Download' },

      // Auth Management
      { pattern: /^\/authentication\/users$/, title: 'User Management' },
      { pattern: /^\/authentication\/roles$/, title: 'Roles Management' },
      { pattern: /^\/authentication\/permissions$/, title: 'Permissions' },

      // Masters
      { pattern: /^\/masters\/(categories|category)$/, title: 'Categories Master' },
      { pattern: /^\/masters\/subcategories$/, title: 'Subcategories Master' },
      { pattern: /^\/masters\/items$/, title: 'Items Master' },
      { pattern: /^\/masters\/karats$/, title: 'Karats Master' },
      { pattern: /^\/masters\/stamps$/, title: 'Stamps Master' },
      { pattern: /^\/masters\/units$/, title: 'Units Master' },
      { pattern: /^\/masters\/component-categories$/, title: 'Component Categories' },
      { pattern: /^\/masters\/memberships$/, title: 'Memberships Master' },
      { pattern: /^\/(masters\/setting-styles|settings-style)$/, title: 'Setting Styles' },
      { pattern: /^\/masters\/gold-types$/, title: 'Gold Types' },
      { pattern: /^\/masters\/diamond-ranges$/, title: 'Diamond Ranges' },
      { pattern: /^\/masters\/diamond-colors$/, title: 'Diamond Colors' },
      { pattern: /^\/masters\/diamond-clarities$/, title: 'Diamond Clarities' },
      { pattern: /^\/(masters\/work-specifications|masters\/specifications)$/, title: 'Work Specifications' },
      { pattern: /^\/masters\/(operations|operation)$/, title: 'Operations Master' },
      { pattern: /^\/masters\/bank-accounts$/, title: 'Bank Accounts' },
      { pattern: /^\/masters\/(company-info|info)$/, title: 'Company Information' },
      { pattern: /^\/masters\/raw-materials$/, title: 'Raw Materials Master' },
    ];

    let pageTitle = '';
    for (const item of titleMap) {
      if (item.pattern.test(path)) {
        pageTitle = item.title;
        break;
      }
    }

    if (!pageTitle) {
      const segments = path.split('/').filter(Boolean);
      if (segments.length > 0) {
        pageTitle = segments[segments.length - 1]
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      } else {
        pageTitle = 'Dashboard';
      }
    }

    document.title = `Rudra Jewellery - ${pageTitle}`;
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <PageTitleUpdater />
            <Routes>
              <Route path="/login" element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              } />

              <Route element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/notifications" element={<NotificationsHistory />} />
                <Route path="/karigars" element={
                  <PermissionRoute requiredPermission="karigars.view">
                    <KarigarManagement />
                  </PermissionRoute>
                } />
                <Route path="/clients" element={<ClientList />} />
                <Route path="/clients/create" element={<RegisterClient />} />
                <Route path="/clients/:id/edit" element={<RegisterClient />} />
                <Route path="/clients/billing" element={
                  <PermissionRoute requiredPermission="billing.view">
                    <BillingDashboard />
                  </PermissionRoute>
                } />
                <Route path="/sales" element={<SalesModule view="dashboard" />} />
                <Route path="/sales/list" element={<SalesModule view="list" />} />
                <Route path="/sales/create" element={<SalesModule view="create" />} />
                <Route path="/sales/customer" element={<SalesModule view="create" />} />
                <Route path="/sales/profit" element={<SalesModule view="profit-per-invoice" />} />
                <Route path="/sales/profit-per-invoice" element={<SalesModule view="profit-per-invoice" />} />
                <Route path="/sales/profit-per-metal" element={<SalesModule view="profit-per-metal" />} />
                <Route path="/sales/rates" element={<SalesModule view="rates" />} />
                <Route path="/sales/customers" element={<SalesModule view="customer-index" />} />
                <Route path="/sales/customers/:clientId" element={<SalesModule view="customer" />} />
                <Route path="/sales/:id" element={<SalesModule view="details" />} />
                <Route path="/reports" element={
                  <PermissionRoute requiredPermission="reports.view">
                    <ReportModule />
                  </PermissionRoute>
                } />
                <Route path="/reports/:tab" element={
                  <PermissionRoute requiredPermission="reports.view">
                    <ReportModule />
                  </PermissionRoute>
                } />
                <Route path="/clients/price-list" element={<ClientPriceList />} />
                <Route path="/clients/:id/price-list" element={<ClientPriceList />} />
                <Route path="/clients/removed" element={<RemovePage />} />
                <Route path="/authentication/users" element={
                  <PermissionRoute requiredPermission="users.view">
                    <Users />
                  </PermissionRoute>
                } />
                <Route path="/authentication/roles" element={
                  <PermissionRoute requiredPermission="roles.view">
                    <Roles />
                  </PermissionRoute>
                } />
                <Route path="/authentication/permissions" element={
                  <PermissionRoute requiredPermission="permissions.view">
                    <Permissions />
                  </PermissionRoute>
                } />
                <Route path="/masters/categories" element={<Categories />} />
                <Route path="/masters/category" element={<Navigate to="/masters/categories" replace />} />
                <Route path="/masters/subcategories" element={<Subcategories />} />
                <Route path="/masters/items" element={<ItemsMaster />} />
                <Route path="/masters/karats" element={<Karats />} />
                <Route path="/masters/stamps" element={<Stamps />} />
                <Route path="/masters/units" element={<Units />} />
                <Route path="/masters/component-categories" element={<ComponentCategories />} />
                <Route path="/masters/products" element={<Navigate to="/inventory" replace />} />
                <Route path="/masters/products/create" element={<Navigate to="/inventory/add-new/category" replace />} />
                <Route path="/masters/products/:id/edit" element={<Navigate to="/inventory" replace />} />
                <Route path="/masters/memberships" element={<Memberships />} />
                <Route path="/stock-management" element={<Navigate to="/inventory" replace />} />
                <Route path="/stock-management/suppliers" element={<SupplierManagement />} />
                <Route path="/suppliers" element={<SupplierManagement />} />
                <Route path="/purchase/entry" element={<PurchaseEntry initialTab="new" />} />
                <Route path="/purchase/new" element={<PurchaseEntry initialTab="new" />} />
                <Route path="/purchase/details" element={<PurchaseEntry initialTab="details" />} />
                <Route path="/purchase/stock" element={<PurchaseEntry initialTab="stock" />} />
                <Route path="/product-upload" element={<Navigate to="/product-upload/step1" replace />} />
                <Route path="/product-upload/step1" element={<Step1Upload />} />
                <Route path="/product-upload/upload" element={<Step1Upload />} />
                <Route path="/product-upload/step2" element={<Step2Catalog />} />
                <Route path="/product-upload/catalog" element={<Step2Catalog />} />
                <Route path="/product-upload/selection" element={<Step2Catalog />} />
                <Route path="/product-upload/step3" element={<Step4Download />} />
                <Route path="/product-upload/download" element={<Step4Download />} />
                <Route path="/product-upload/step4" element={<Step4Download />} />
                <Route path="/masters/setting-styles" element={<SettingStyles />} />
                <Route path="/masters/gold-types" element={<GoldTypes />} />
                <Route path="/masters/diamond-ranges" element={<DiamondRanges />} />
                <Route path="/masters/diamond-colors" element={<DiamondColors />} />
                <Route path="/masters/diamond-clarities" element={<DiamondClarities />} />
                <Route path="/masters/work-specifications" element={<WorkSpecifications />} />
                <Route path="/masters/operations" element={<Operations />} />
                <Route path="/masters/operation" element={<Navigate to="/masters/operations" replace />} />
                <Route path="/masters/bank-accounts" element={<BankAccounts />} />
                <Route path="/masters/info" element={<CompanyInfoMaster />} />
                <Route path="/masters/company-info" element={<CompanyInfoMaster />} />
                <Route path="/masters/raw-materials" element={<RawMaterials />} />
                <Route path="/masters/specifications" element={<Navigate to="/masters/work-specifications" replace />} />
                <Route path="/settings-style" element={<Navigate to="/masters/setting-styles" replace />} />

                {/* Inventory Module Routes */}
                <Route path="/inventory" element={<InventoryDashboard />} />
                <Route path="/inventory/bulk-upload" element={<InventoryBulkUpload />} />
                <Route path="/inventory/add-new/category" element={<InventoryAddNewCategory />} />
                <Route path="/inventory/add-new/subcategory" element={<InventoryAddNewSubcategory />} />
                <Route path="/inventory/add-new/upload" element={<InventoryAddNewUpload />} />
                <Route path="/inventory/add-new/complete" element={<InventoryUploadComplete />} />
                <Route path="/inventory/upload-complete" element={<InventoryUploadComplete />} />
                <Route path="/inventory/products/:id" element={<InventoryViewProduct />} />
                <Route path="/inventory/products/:id/edit" element={<InventoryEditProduct />} />

                {/* Job Order / Karigar Workflow Routes */}
                <Route path="/job-creation" element={<JobCreationDashboard />} />
                <Route path="/job-creation/dashboard" element={<JobCreationDashboard />} />
                <Route path="/job-order" element={<WorkInProgress />} />
                <Route path="/job-orders" element={<WorkInProgress />} />
                <Route path="/job-order/new" element={<NewWorkOrder initialMode="create" />} />
                <Route path="/job-order/receive" element={<ReceiverWork />} />
                <Route path="/job-order/tag-printing" element={<TagPrinting />} />
                <Route path="/job-order/in-progress" element={<WorkInProgress />} />
                <Route path="/job-order/work-in-progress" element={<WorkInProgress />} />
                <Route path="/job-order/delay" element={<JobOrderDelay />} />
                <Route path="/job-order/delay-hold" element={<JobOrderDelay />} />
                <Route path="/job-order/quality-check" element={<JobOrderHub initialTab="quality-check" />} />
                <Route path="/job-order/certification" element={<JobOrderHub initialTab="certification" />} />
                <Route path="/job-order/hallmarking" element={<JobOrderHub initialTab="hallmarking" />} />
                <Route path="/job-order/ready" element={<JobOrderHub initialTab="ready" />} />
                <Route path="/job-order/final-receive" element={<JobOrderHub initialTab="final-receive" />} />
                <Route path="/job-order/history" element={<JobOrderHub initialTab="history" />} />
                <Route path="/job-order/:id" element={<NewWorkOrder initialMode="details" />} />
                <Route path="/job-order/:id/details" element={<NewWorkOrder initialMode="details" />} />
              </Route>

              <Route path="/inventory/products/:id/jewellery-tag" element={
                <ProtectedRoute>
                  <InventoryJewelleryTag />
                </ProtectedRoute>
              } />

              <Route path="/inventory/products/:id/barcode-tag" element={
                <ProtectedRoute>
                  <InventoryBarcodeTag />
                </ProtectedRoute>
              } />

              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

const container = document.getElementById('app');
if (container) {
  if (!container._reactRoot) {
    container._reactRoot = createRoot(container);
  }
  container._reactRoot.render(<App />);
}
