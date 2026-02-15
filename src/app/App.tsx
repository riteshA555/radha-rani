import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Layout } from './components/Layout';
import { SessionTimeout } from './components/shared/SessionTimeout';
import { SettingsProvider } from '../context/SettingsContext';

// Lazy load all pages
import * as Pages from './lazyPages';

// Loading fallback component
const PageLoader = () => (
  <div className="h-[40vh] w-full flex flex-col items-center justify-center gap-4">
    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Fast Loading Module...</p>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Layout Wrapper to handle active state based on URL
const LayoutWrapper = () => {
  const location = useLocation();
  // Extract current page from path (e.g., /orders -> orders)
  const currentPage = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1);

  return (
    <Layout currentPage={currentPage} onNavigate={() => { }}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<Pages.Dashboard />} />
          <Route path="orders" element={<Pages.Orders />} />
          <Route path="orders/create" element={<Pages.CreateOrder />} />
          <Route path="orders/:id" element={<Pages.OrderPrint />} />
          <Route path="stock" element={<Pages.Stock />} />
          <Route path="client-material" element={<Pages.ClientMaterialLedger />} />
          <Route path="accounting" element={<Pages.Accounting />} />
          <Route path="customer-payments" element={<Pages.CustomerPayments />} />
          <Route path="base-material-types" element={<Pages.BaseMaterialTypes />} />
          <Route path="service-master" element={<Pages.ServiceMaster />} />
          <Route path="catalog" element={<Pages.Catalog />} />
          <Route path="karigar" element={<Pages.Karigars />} />
          <Route path="karigar-settlement" element={<Pages.KarigarSettlement />} />
          <Route path="settlement" element={<Pages.Karigars defaultTab="SETTLEMENT" />} />
          <Route path="rates" element={<Pages.Rates />} />
          <Route path="audit" element={<Pages.AuditLogs />} />
          <Route path="backup-restore" element={<Pages.BackupRestore />} />
          <Route path="factory-reset" element={<Pages.FactoryReset />} />
          <Route path="profit-loss" element={<Pages.ProfitLoss />} />
          <Route path="expenses" element={<Pages.Expenses />} />
          <Route path="ledger" element={<Pages.Ledger />} />
          <Route path="client-statement" element={<Pages.ClientStatement />} />
          <Route path="gst-reports" element={<Pages.GSTReports />} />
          <Route path="customers" element={<Pages.Customers />} />
          <Route path="vendors" element={<Pages.Vendors />} />
          <Route path="settings" element={<Pages.SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

import { Toaster } from 'sonner';

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <SessionTimeout />
          <Toaster position="top-center" richColors />
          <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-indigo-50/10">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>}>
            <Routes>
              <Route path="/login" element={<Pages.Login />} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <LayoutWrapper />
                </ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}
