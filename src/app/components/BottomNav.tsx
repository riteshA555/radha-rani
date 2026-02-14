import { Home, ShoppingBag, Package, Calculator, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { triggerHaptic } from '../../utils/haptics';
import * as Pages from '../lazyPages';

const preloadMap: Record<string, any> = {
  '/': Pages.Dashboard,
  '/orders': Pages.Orders,
  '/stock': Pages.Stock,
  '/accounting': Pages.Accounting,
  '/settings': Pages.SettingsPage
};

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const navItems = [
    { id: 'dashboard', path: '/', label: 'Home', icon: Home },
    { id: 'orders', path: '/orders', label: 'Orders', icon: ShoppingBag },
    { id: 'stock', path: '/stock', label: 'Stock', icon: Package },
    { id: 'accounting', path: '/accounting', label: 'Finance', icon: Calculator },
    { id: 'settings', path: '/settings', label: 'More', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
      <div className="grid grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.id}
              to={item.path}
              onMouseEnter={() => {
                const component = preloadMap[item.path];
                if (component && (component as any)._payload) {
                  try { (component as any)._payload._result(); } catch (e) { }
                }
              }}
              onTouchStart={() => {
                const component = preloadMap[item.path];
                if (component && (component as any)._payload) {
                  try { (component as any)._payload._result(); } catch (e) { }
                }
              }}
              onClick={() => triggerHaptic('light')}
              className={({ isActive }) => `flex flex-col items-center justify-center py-2 px-1 transition-colors ${isActive
                ? 'text-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-6 h-6 mb-1 ${isActive ? 'fill-indigo-100' : ''}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
