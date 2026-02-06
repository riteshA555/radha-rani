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
  UserCircle,
  Building2,
  Settings,
  Layers,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const menuSections = [
    {
      title: 'Main',
      items: [
        { id: 'dashboard', path: '/', label: 'Dashboard', icon: Home },
      ],
    },
    {
      title: 'Orders & Sales',
      items: [
        { id: 'orders', path: '/orders', label: 'Orders', icon: ShoppingBag },
      ],
    },
    {
      title: 'Inventory & Production',
      items: [
        { id: 'stock', path: '/stock', label: 'Stock Management', icon: Package },
        { id: 'client-material', path: '/client-material', label: 'Client Material Ledger', icon: Database },
        { id: 'catalog', path: '/catalog', label: 'Unified Catalog', icon: Gem },
        { id: 'karigar', path: '/karigar', label: 'Artisan Portal', icon: Users },
        { id: 'settlement', path: '/settlement', label: 'Artisan Settlement', icon: Coins },
        { id: 'rates', path: '/rates', label: 'Market Terminal', icon: TrendingUp, live: true },
      ],
    },
    {
      title: 'Accounting & Finance',
      items: [
        { id: 'accounting', path: '/accounting', label: 'Accounting Dashboard', icon: Calculator },
        { id: 'customer-payments', path: '/customer-payments', label: 'Customer Payments', icon: CreditCard },
        { id: 'expenses', path: '/expenses', label: 'Expense Manager', icon: Receipt },
        { id: 'ledger', path: '/ledger', label: 'Ledger', icon: FileText },
        { id: 'gst-reports', path: '/gst-reports', label: 'GST Reports', icon: FileText },
      ],
    },
    {
      title: 'Masters',
      items: [
        { id: 'base-material-types', path: '/base-material-types', label: 'Base Material Types', icon: Layers },
      ],
    },
    {
      title: 'Contacts',
      items: [
        { id: 'customers', path: '/customers', label: 'Customers', icon: UserCircle },
        { id: 'vendors', path: '/vendors', label: 'Vendors', icon: Building2 },
      ],
    },
    {
      title: 'System',
      items: [
        { id: 'settings', path: '/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <nav className="p-4 space-y-6">
      {menuSections.map((section) => (
        <div key={section.title}>
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
                  onClick={() => onNavigate(item.path)}
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
