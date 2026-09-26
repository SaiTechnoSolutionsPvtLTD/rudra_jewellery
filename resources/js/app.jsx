import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import AppLayout from './layouts/AppLayout';
import Login from './pages/auth/Login';
const Dashboard = lazy(() => import('./pages/Dashboard'));
import ClientList from './pages/clients/ClientList';
import RegisterClient from './pages/clients/RegisterClient';
const BillingDashboard = lazy(() => import('./pages/clients/BillingDashboard'));
import Users from './pages/authentication/Users';
import Roles from './pages/authentication/Roles';
import Permissions from './pages/authentication/Permissions';
import Categories from './pages/masters/Categories';
import Subcategories from './pages/masters/Subcategories';
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
import WorkSpecifications from './pages/masters/WorkSpecifications';
import BankAccounts from './pages/masters/BankAccounts';
import CompanyInfoMaster from './pages/masters/CompanyInfoMaster';
const KarigarManagement = lazy(() => import('./pages/karigar/KarigarManagement'));
const SalesModule = lazy(() => import('./pages/sales/SalesModule'));
const ReportModule = lazy(() => import('./pages/reports/ReportModule'));

// Inventory Module
const InventoryDashboard = lazy(() => import('./pages/inventory/InventoryDashboard'));
import InventoryBulkUpload from './pages/inventory/InventoryBulkUpload';
import InventoryAddNewCategory from './pages/inventory/InventoryAddNewCategory';
import InventoryAddNewSubcategory from './pages/inventory/InventoryAddNewSubcategory';
import InventoryAddNewUpload from './pages/inventory/InventoryAddNewUpload';
import InventoryUploadComplete from './pages/inventory/InventoryUploadComplete';
const InventoryViewProduct = lazy(() => import('./pages/inventory/InventoryViewProduct'));
const InventoryEditProduct = lazy(() => import('./pages/inventory/InventoryEditProduct'));
import InventoryJewelleryTag from './pages/inventory/InventoryJewelleryTag';
import InventoryBarcodeTag from './pages/inventory/InventoryBarcodeTag';

// Job Order / Karigar Workflow Module
const JobCreationDashboard = lazy(() => import('./pages/job-order/JobCreationDashboard'));
const JobOrdersList = lazy(() => import('./pages/job-order/JobOrdersList'));
const NewWorkOrder = lazy(() => import('./pages/job-order/NewWorkOrder'));
const ReceiverWork = lazy(() => import('./pages/job-order/ReceiverWork'));
const WorkInProgress = lazy(() => import('./pages/job-order/WorkInProgress'));
const JobOrderDelay = lazy(() => import('./pages/job-order/JobOrderDelay'));
const JobOrderHub = lazy(() => import('./pages/job-order/JobOrderHub'));

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
  const { isAuthenticated, loading, isSuperAdmin, hasPermission, isKarigar } = useAuth();

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
        <button onClick={() => window.location.href = isKarigar ? '/job-creation/dashboard' : '/dashboard'} className="px-4 py-2 bg-rose-700 text-white rounded-lg text-xs font-semibold hover:bg-rose-800">Return to Dashboard</button>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-12 bg-amber-50 border border-amber-200 rounded-xl">
        <i className="fa-solid fa-lock text-4xl text-amber-600 mb-3 block"></i>
        <h3 className="text-lg font-bold text-amber-900 mb-1">Permission Required</h3>
        <p className="text-sm text-amber-700 mb-4">You do not have the required permission ({requiredPermission}) to access this page.</p>
        <button onClick={() => window.location.href = isKarigar ? '/job-creation/dashboard' : '/dashboard'} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-semibold hover:bg-amber-800">Return to Dashboard</button>
      </div>
    );
  }

  return children;
};

const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading, isKarigar, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b08]">
        <div className="w-10 h-10 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    const target = (isKarigar || user?.role === 'Karigar') ? '/job-order/in-progress' : '/dashboard';
    return <Navigate to={target} replace />;
  }

  return children;
};

const HomeRedirect = () => {
  const { isKarigar, user } = useAuth();
  const target = (isKarigar || user?.role === 'Karigar') ? '/job-order/in-progress' : '/dashboard';
  return <Navigate to={target} replace />;
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
  }

  handleClearCacheAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6 font-['Inter',sans-serif]">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-stone-200 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h2 className="text-lg font-bold text-stone-900">Something went wrong</h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              An unexpected error occurred while loading this section:
            </p>
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-left overflow-x-auto text-[11px] font-mono text-rose-700 max-h-32">
              {this.state.error?.message || String(this.state.error)}
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#b01622] text-white text-xs font-semibold rounded-xl hover:bg-[#8e111a] transition-colors cursor-pointer"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleClearCacheAndReload}
                className="px-4 py-2 bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl hover:bg-stone-300 transition-colors cursor-pointer"
              >
                Reset Session & Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
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
                <Route path="/product-upload" element={<Navigate to="/product-upload/step1" replace />} />
                <Route path="/product-upload/step1" element={<Step1Upload />} />
                <Route path="/product-upload/upload" element={<Step1Upload />} />
                <Route path="/product-upload/step2" element={<Step2Catalog />} />
                <Route path="/product-upload/catalog" element={<Step2Catalog />} />
                <Route path="/product-upload/step3" element={<Step3Selection />} />
                <Route path="/product-upload/selection" element={<Step3Selection />} />
                <Route path="/product-upload/step4" element={<Step4Download />} />
                <Route path="/product-upload/download" element={<Step4Download />} />
                <Route path="/masters/setting-styles" element={<SettingStyles />} />
                <Route path="/masters/gold-types" element={<GoldTypes />} />
                <Route path="/masters/diamond-ranges" element={<DiamondRanges />} />
                <Route path="/masters/work-specifications" element={<WorkSpecifications />} />
                <Route path="/masters/bank-accounts" element={<BankAccounts />} />
                <Route path="/masters/info" element={<CompanyInfoMaster />} />
                <Route path="/masters/company-info" element={<CompanyInfoMaster />} />
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
                <Route path="/job-order" element={<JobOrdersList />} />
                <Route path="/job-orders" element={<JobOrdersList />} />
                <Route path="/job-order/new" element={<NewWorkOrder initialMode="create" />} />
                <Route path="/job-order/receive" element={<ReceiverWork />} />
                <Route path="/job-order/in-progress" element={<WorkInProgress />} />
                <Route path="/job-order/work-in-progress" element={<WorkInProgress />} />
                <Route path="/job-order/delay" element={<JobOrderDelay />} />
                <Route path="/job-order/delay-hold" element={<JobOrderDelay />} />
                <Route path="/job-order/waste" element={<JobOrderHub initialTab="waste" />} />
                <Route path="/job-order/quality-check" element={<JobOrderHub initialTab="quality-check" />} />
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

              <Route path="*" element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              } />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
