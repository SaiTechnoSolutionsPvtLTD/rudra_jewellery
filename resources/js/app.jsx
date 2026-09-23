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

function App() {
  return (
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
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/karigars" element={<KarigarManagement />} />
              <Route path="/clients" element={<ClientList />} />
              <Route path="/clients/create" element={<RegisterClient />} />
              <Route path="/clients/:id/edit" element={<RegisterClient />} />
              <Route path="/clients/billing" element={<BillingDashboard />} />
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
              <Route path="/reports" element={<ReportModule />} />
              <Route path="/reports/:tab" element={<ReportModule />} />
              <Route path="/clients/price-list" element={<ClientPriceList />} />
              <Route path="/clients/:id/price-list" element={<ClientPriceList />} />
              <Route path="/clients/removed" element={<RemovePage />} />
              <Route path="/authentication/users" element={<Users />} />
              <Route path="/authentication/roles" element={<Roles />} />
              <Route path="/authentication/permissions" element={<Permissions />} />
              <Route path="/masters/categories" element={<Categories />} />
              <Route path="/masters/subcategories" element={<Subcategories />} />
              <Route path="/masters/products" element={<Navigate to="/inventory" replace />} />
              <Route path="/masters/products/create" element={<Navigate to="/inventory/add-new/category" replace />} />
              <Route path="/masters/products/:id/edit" element={<Navigate to="/inventory" replace />} />
              <Route path="/masters/memberships" element={<Memberships />} />
              <Route path="/stock-management" element={<StockManagement />} />
              <Route path="/stock-management/suppliers" element={<SupplierManagement />} />
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
  );
}

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
