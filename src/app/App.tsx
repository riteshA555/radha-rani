import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Layout } from './components/Layout';
import { SessionTimeout } from './components/shared/SessionTimeout';
import { SettingsProvider } from '../context/SettingsContext';

// Lazy load all pages
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Orders = lazy(() => import('./pages/Orders').then(m => ({ default: m.Orders })));
const CreateOrder = lazy(() => import('./pages/OrderCreate').then(m => ({ default: m.CreateOrder })));
const OrderPrint = lazy(() => import('./pages/OrderPrint').then(m => ({ default: m.OrderPrint })));
const Stock = lazy(() => import('./pages/Stock').then(m => ({ default: m.Stock })));
const Catalog = lazy(() => import('./pages/Catalog').then(m => ({ default: m.Catalog })));
const Karigars = lazy(() => import('./pages/Karigars').then(m => ({ default: m.Karigars })));
const Rates = lazy(() => import('./pages/Rates').then(m => ({ default: m.Rates })));
const Accounting = lazy(() => import('./pages/Accounting').then(m => ({ default: m.Accounting })));
const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const Ledger = lazy(() => import('./pages/Ledger').then(m => ({ default: m.Ledger })));
const GSTReports = lazy(() => import('./pages/GSTReports').then(m => ({ default: m.GSTReports })));
const ClientStatement = lazy(() => import('./pages/ClientStatement').then(m => ({ default: m.ClientStatement })));
const KarigarSettlement = lazy(() => import('./pages/KarigarSettlement').then(m => ({ default: m.KarigarSettlement })));
const ProfitLoss = lazy(() => import('./pages/ProfitLoss').then(m => ({ default: m.ProfitLoss })));
const BackupRestore = lazy(() => import('./pages/BackupRestore').then(m => ({ default: m.BackupRestore })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then(m => ({ default: m.AuditLogs })));
const FactoryReset = lazy(() => import('./pages/FactoryReset').then(m => ({ default: m.FactoryReset })));
const Customers = lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const Vendors = lazy(() => import('./pages/Vendors').then(m => ({ default: m.Vendors })));
const ClientMaterialLedger = lazy(() => import('./pages/ClientMaterialLedger').then(m => ({ default: m.ClientMaterialLedger })));
const CustomerPayments = lazy(() => import('./pages/CustomerPayments').then(m => ({ default: m.CustomerPayments })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const BaseMaterialTypes = lazy(() => import('./pages/BaseMaterialTypes').then(m => ({ default: m.BaseMaterialTypes })));
const ServiceMaster = lazy(() => import('./pages/ServiceMaster').then(m => ({ default: m.ServiceMaster })));
const Login = lazy(() => import('./pages/Login'));

// Loading fallback component
const PageLoader = () => (
  <div className="h-[60vh] w-full flex flex-col items-center justify-center gap-4">
    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-gray-500 font-medium animate-pulse">Initializing module...</p>
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
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/create" element={<CreateOrder />} />
          <Route path="orders/:id" element={<OrderPrint />} />
          <Route path="stock" element={<Stock />} />
          <Route path="client-material" element={<ClientMaterialLedger />} />
          <Route path="customer-payments" element={<CustomerPayments />} />
          <Route path="base-material-types" element={<BaseMaterialTypes />} />
          <Route path="service-master" element={<ServiceMaster />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="karigar" element={<Karigars />} />
          <Route path="karigar-settlement" element={<KarigarSettlement />} />
          <Route path="settlement" element={<Karigars defaultTab="SETTLEMENT" />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="backup-restore" element={<BackupRestore />} />
          <Route path="factory-reset" element={<FactoryReset />} />
          <Route path="profit-loss" element={<ProfitLoss />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="client-statement" element={<ClientStatement />} />
          <Route path="gst-reports" element={<GSTReports />} />
          <Route path="customers" element={<Customers />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <SessionTimeout />
          <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-indigo-50/10">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
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
