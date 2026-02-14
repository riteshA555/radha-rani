import { lazy } from 'react';

// Lazy load all pages in a separate file to avoid circular dependencies
export const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
export const Orders = lazy(() => import('./pages/Orders').then(m => ({ default: m.Orders })));
export const CreateOrder = lazy(() => import('./pages/OrderCreate').then(m => ({ default: m.CreateOrder })));
export const OrderPrint = lazy(() => import('./pages/OrderPrint').then(m => ({ default: m.OrderPrint })));
export const Stock = lazy(() => import('./pages/Stock').then(m => ({ default: m.Stock })));
export const Catalog = lazy(() => import('./pages/Catalog').then(m => ({ default: m.Catalog })));
export const Karigars = lazy(() => import('./pages/Karigars').then(m => ({ default: m.Karigars })));
export const Rates = lazy(() => import('./pages/Rates').then(m => ({ default: m.Rates })));
export const Accounting = lazy(() => import('./pages/Accounting').then(m => ({ default: m.Accounting })));
export const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
export const Ledger = lazy(() => import('./pages/Ledger').then(m => ({ default: m.Ledger })));
export const GSTReports = lazy(() => import('./pages/GSTReports').then(m => ({ default: m.GSTReports })));
export const ClientStatement = lazy(() => import('./pages/ClientStatement').then(m => ({ default: m.ClientStatement })));
export const KarigarSettlement = lazy(() => import('./pages/KarigarSettlement').then(m => ({ default: m.KarigarSettlement })));
export const ProfitLoss = lazy(() => import('./pages/ProfitLoss').then(m => ({ default: m.ProfitLoss })));
export const BackupRestore = lazy(() => import('./pages/BackupRestore').then(m => ({ default: m.BackupRestore })));
export const AuditLogs = lazy(() => import('./pages/AuditLogs').then(m => ({ default: m.AuditLogs })));
export const FactoryReset = lazy(() => import('./pages/FactoryReset').then(m => ({ default: m.FactoryReset })));
export const Customers = lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
export const Vendors = lazy(() => import('./pages/Vendors').then(m => ({ default: m.Vendors })));
export const ClientMaterialLedger = lazy(() => import('./pages/ClientMaterialLedger').then(m => ({ default: m.ClientMaterialLedger })));
export const CustomerPayments = lazy(() => import('./pages/CustomerPayments').then(m => ({ default: m.CustomerPayments })));
export const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
export const BaseMaterialTypes = lazy(() => import('./pages/BaseMaterialTypes').then(m => ({ default: m.BaseMaterialTypes })));
export const ServiceMaster = lazy(() => import('./pages/ServiceMaster').then(m => ({ default: m.ServiceMaster })));
export const Login = lazy(() => import('./pages/Login'));
