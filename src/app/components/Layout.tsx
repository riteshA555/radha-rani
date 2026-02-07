import { Menu, X, Bell } from 'lucide-react';
import { useState } from 'react';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { NotificationCenter } from './NotificationCenter';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden select-none safe-pb">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between sticky top-0 z-40 h-16 flex-shrink-0 safe-pt box-content">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg"
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
          <NotificationCenter />

          <div className="h-8 w-[1px] bg-gray-100 mx-1 hidden sm:block"></div>

          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Current Date</span>
            <span className="text-xs font-bold text-gray-700">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm bg-white z-[70] shadow-2xl animate-in slide-in-from-left-4 duration-300 flex flex-col h-full">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 safe-pt box-content">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 overflow-hidden relative flex items-center justify-center rounded-lg">
                    <img
                      src="/logo.png"
                      alt="Logo"
                      className="h-full w-full object-cover scale-150"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <span className="font-bold text-gray-900">Menu</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pb-32">
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
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-4 touch-pan-y">
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
