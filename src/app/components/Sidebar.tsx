import {
  Home,
  ShoppingBag,
  Package,
  Database,
  Gem,
  Users,
  Coins,
  TrendingUp,
  Calculator,
  FileText,
  Receipt,
  CreditCard,
  PieChart,
  UserCircle,
  Building2,
  Settings,
  Layers,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { triggerHaptic } from '../../utils/haptics';
import * as Pages from '../lazyPages';

const preloadMap: Record<string, any> = {
  '/': Pages.Dashboard,
  '/orders': Pages.Orders,
  '/orders/create': Pages.CreateOrder,
  '/stock': Pages.Stock,
  '/catalog': Pages.Catalog,
  '/karigar': Pages.Karigars,
  '/rates': Pages.Rates,
  '/accounting': Pages.Accounting,
  '/ledger': Pages.Ledger,
  '/settings': Pages.SettingsPage,
  '/client-material': Pages.ClientMaterialLedger
};

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { t } = useTranslation();

  const menuSections = [
    {
      title: t('masters'),
      items: [
        { id: 'dashboard', path: '/', label: t('dashboard'), icon: Home },
      ],
    },
    {
      title: t('orders_sales'),
      items: [
        { id: 'orders', path: '/orders', label: t('orders'), icon: ShoppingBag },
      ],
    },
    {
      title: t('inventory_production'),
      items: [
        { id: 'stock', path: '/stock', label: t('stock_management'), icon: Package },
        { id: 'client-material', path: '/client-material', label: t('client_material'), icon: Database },
        { id: 'catalog', path: '/catalog', label: t('catalog'), icon: Gem },
        { id: 'karigar', path: '/karigar', label: t('karigar'), icon: Users },
        { id: 'karigar-settlement', path: '/karigar-settlement', label: 'Karigar Settlement', icon: Coins },
        { id: 'settlement', path: '/settlement', label: t('settlement'), icon: Coins },
        { id: 'rates', path: '/rates', label: t('rates'), icon: TrendingUp, live: true },
      ],
    },
    {
      title: t('accounting_finance'),
      items: [
        { id: 'accounting', path: '/accounting', label: t('accounting'), icon: Calculator },
        { id: 'profit-loss', path: '/profit-loss', label: 'P&L Report', icon: PieChart },
        { id: 'customer-payments', path: '/customer-payments', label: t('customer_payments'), icon: CreditCard },
        { id: 'expenses', path: '/expenses', label: t('expenses'), icon: Receipt },
        { id: 'ledger', path: '/ledger', label: t('ledger'), icon: FileText },
        { id: 'client-statement', path: '/client-statement', label: 'Client Statement', icon: FileText },
        { id: 'gst-reports', path: '/gst-reports', label: t('gst_reports'), icon: FileText },
      ],
    },
    {
      title: t('masters'),
      items: [
        { id: 'base-material-types', path: '/base-material-types', label: t('base_material_types'), icon: Layers },
      ],
    },
    {
      title: t('contacts'),
      items: [
        { id: 'customers', path: '/customers', label: t('customers'), icon: UserCircle },
        { id: 'vendors', path: '/vendors', label: t('vendors'), icon: Building2 },
      ],
    },
    {
      title: t('system'),
      items: [
        { id: 'audit', path: '/audit', label: 'Audit Logs', icon: ShieldCheck },
        { id: 'backup-restore', path: '/backup-restore', label: 'Backup & Restore', icon: Database },
        { id: 'settings', path: '/settings', label: t('settings'), icon: Settings },
      ],
    },
  ];

  return (
    <nav className="p-4 space-y-6">
      {menuSections.map((section, idx) => (
        <div key={`${section.title}-${idx}`}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
            {section.title}
          </h3>
          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onMouseEnter={() => {
                    // Trigger preloading of the module
                    const component = preloadMap[item.path];
                    if (component && (component as any)._payload) {
                      // Internal React lazy trigger (hacky but works for preloading)
                      try { (component as any)._payload._result(); } catch (e) { }
                    }
                  }}
                  onClick={() => {
                    triggerHaptic('light');
                    onNavigate(item.path);
                  }}
                  className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {(item as any).live && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500 text-[8px] font-black text-white uppercase tracking-tighter animate-pulse">
                      <div className="w-1 h-1 rounded-full bg-white transition-opacity" />
                      Live
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
