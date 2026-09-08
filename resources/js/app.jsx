import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import AppLayout from './layouts/AppLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import NewWorkOrder from './pages/job-creation/NewWorkOrder';
import ReceiveWorkOrder from './pages/job-creation/ReceiveWorkOrder';
import JobOrderPrint from './pages/job-creation/JobOrderPrint';
import ClientList from './pages/clients/ClientList';
import RegisterClient from './pages/clients/RegisterClient';
import BillingDashboard from './pages/clients/BillingDashboard';
import Users from './pages/authentication/Users';
import Roles from './pages/authentication/Roles';
import Permissions from './pages/authentication/Permissions';
import Categories from './pages/masters/Categories';
import Subcategories from './pages/masters/Subcategories';
import Products from './pages/masters/Products';
import CreateProduct from './pages/masters/CreateProduct';
import Memberships from './pages/masters/Memberships';
import ClientPriceList from './pages/clients/ClientPriceList';
import StockManagement from './pages/stock/StockManagement';
import SupplierManagement from './pages/stock/SupplierManagement';
import PurchaseEntry from './pages/purchase/PurchaseEntry';

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
              <Route path="/job-creation/new" element={<NewWorkOrder />} />
              <Route path="/job-creation/receive" element={<ReceiveWorkOrder />} />
              <Route path="/clients" element={<ClientList />} />
              <Route path="/clients/create" element={<RegisterClient />} />
              <Route path="/clients/:id/edit" element={<RegisterClient />} />
              <Route path="/clients/billing" element={<BillingDashboard />} />
              <Route path="/clients/price-list" element={<ClientPriceList />} />
              <Route path="/clients/:id/price-list" element={<ClientPriceList />} />
              <Route path="/authentication/users" element={<Users />} />
              <Route path="/authentication/roles" element={<Roles />} />
              <Route path="/authentication/permissions" element={<Permissions />} />
              <Route path="/masters/categories" element={<Categories />} />
              <Route path="/masters/subcategories" element={<Subcategories />} />
              <Route path="/masters/products" element={<Products />} />
              <Route path="/masters/products/create" element={<CreateProduct />} />
              <Route path="/masters/products/:id/edit" element={<CreateProduct />} />
              <Route path="/masters/memberships" element={<Memberships />} />
              <Route path="/stock-management" element={<StockManagement />} />
              <Route path="/stock-management/suppliers" element={<SupplierManagement />} />
              <Route path="/purchase/entry" element={<PurchaseEntry initialTab="new" />} />
              <Route path="/purchase/new" element={<PurchaseEntry initialTab="new" />} />
              <Route path="/purchase/details" element={<PurchaseEntry initialTab="details" />} />
            </Route>

            <Route path="/job-creation/order" element={
              <ProtectedRoute>
                <JobOrderPrint />
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
