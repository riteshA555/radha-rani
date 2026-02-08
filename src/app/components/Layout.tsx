import { Menu, X, Bell, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { NotificationCenter } from './NotificationCenter';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { t, i18n } = useTranslation();

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden select-none safe-pb">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2 flex items-center justify-between sticky top-0 z-40 h-16 flex-shrink-0 safe-pt box-content">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo Container - Digitally cropped to remove redundant borders */}
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="h-10 w-40 overflow-hidden relative flex items-center justify-center transition-all duration-500 group-hover:scale-105">
              <img
                src="/logo.png"
                alt="NEXORA DIGITAL"
                className="h-full w-full object-cover object-center scale-125 transition-transform duration-700 group-hover:scale-140"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerText = 'NEXORA DIGITAL'; e.currentTarget.parentElement!.className = 'text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-800 to-indigo-600 tracking-tight'; }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* User Profile & Sign Out - Production Grade */}
          <div className="flex items-center gap-1.5 sm:gap-3 mr-0.5 sm:mr-2 px-1.5 sm:px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm border border-indigo-400">
                <User size={14} />
              </div>
              <div className="flex flex-col hidden min-[450px]:flex">
                <span className="text-[10px] font-black text-gray-900 leading-none truncate max-w-[80px] sm:max-w-[100px]">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{t('gold_member')}</span>
              </div>
            </div>
            <div className="h-4 w-[1px] bg-gray-200 mx-0.5 sm:mx-1"></div>
            <button
              onClick={() => signOut()}
              className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
              title={t('logout')}
            >
              <LogOut size={16} />
            </button>
          </div>

          <NotificationCenter />

          <div className="h-8 w-[1px] bg-gray-100 mx-1 hidden sm:block"></div>

          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('current_date')}</span>
            <span className="text-xs font-bold text-gray-700">
              {new Date().toLocaleDateString(i18n.language === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 overflow-y-auto custom-scrollbar">
          <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {/* ... (sidebarOpen logic) ... */}
        {sidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm bg-white z-[70] shadow-2xl animate-in slide-in-from-left-4 duration-300 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto pb-32 pt-10 relative custom-scrollbar">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>
                <Sidebar
                  currentPage={currentPage}
                  onNavigate={(page) => {
                    onNavigate(page);
                    setSidebarOpen(false);
                  }}
                />
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-24 lg:pb-4 touch-pan-y">
          {children}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-pb">
        <BottomNav currentPage={currentPage} onNavigate={onNavigate} />
      </footer>
    </div>
  );
}
