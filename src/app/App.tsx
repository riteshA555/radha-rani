import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { CreateOrder } from './pages/OrderCreate';
import { OrderPrint } from './pages/OrderPrint';
import { Stock } from './pages/Stock';
import { Catalog } from './pages/Catalog';
import { Karigars } from './pages/Karigars';
import { Rates } from './pages/Rates';
import { Accounting } from './pages/Accounting';
import { Expenses } from './pages/Expenses';
import { Ledger } from './pages/Ledger';
import { GSTReports } from './pages/GSTReports';
import { Customers } from './pages/Customers';
import { Vendors } from './pages/Vendors';
import { ClientMaterialLedger } from './pages/ClientMaterialLedger';
import { CustomerPayments } from './pages/CustomerPayments';
import { SettingsPage } from './pages/SettingsPage';
import { BaseMaterialTypes } from './pages/BaseMaterialTypes';
import { ServiceMaster } from './pages/ServiceMaster';
import Login from './pages/Login';
import { SessionTimeout } from './components/shared/SessionTimeout';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
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
        <Route path="settlement" element={<Karigars defaultTab="SETTLEMENT" />} />
        <Route path="rates" element={<Rates />} />
        <Route path="accounting" element={<Accounting />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="gst-reports" element={<GSTReports />} />
        <Route path="customers" element={<Customers />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

import { SettingsProvider } from '../context/SettingsContext';

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <SessionTimeout />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <LayoutWrapper />
              </ProtectedRoute>
            } />
            {/* We need to ensure nested routes are handled or define them explicitly */}
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}
