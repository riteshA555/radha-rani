import { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, ChevronDown, CreditCard, Sparkles, Building2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { t } from '../../shared/utils/i18n';
import { useSettings } from '../../context/SettingsContext';

export function UserProfile() {
    const { user, signOut } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const userInitial = user?.email ? user.email[0].toUpperCase() : 'U';
    const userName = user?.user_metadata?.full_name || 'User';
    const userEmail = user?.email || '';

    // Premium logic - for now assumed true or strictly based on check
    const isPremium = true;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* TRIGGER BUTTON */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full border transition-all duration-300 cursor-pointer group select-none ${isOpen
                    ? 'bg-indigo-50 border-indigo-200 shadow-md ring-2 ring-indigo-100 ring-offset-1'
                    : 'bg-white border-gray-200 hover:border-indigo-200 hover:shadow-sm hover:bg-gray-50'
                    }`}
            >
                <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-200 border-2 border-white ring-1 ring-gray-100">
                        {user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Profile" className="h-full w-full rounded-full object-cover" />
                        ) : (
                            <span className="text-xs">{userInitial}</span>
                        )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 h-2.5 w-2.5 rounded-full border-2 border-white ring-1 ring-gray-50"></div>
                </div>

                <div className="flex flex-col items-start hidden sm:flex">
                    <span className="text-xs font-bold text-gray-800 leading-none group-hover:text-indigo-700 transition-colors">
                        {userName.split(' ')[0]}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 group-hover:text-indigo-400">
                        {user?.role === 'authenticated' ? 'Admin' : 'Staff'}
                    </span>
                </div>

                <div className={`p-0.5 rounded-full bg-gray-100 text-gray-400 transition-all duration-300 ml-1 ${isOpen ? 'rotate-180 bg-indigo-100 text-indigo-500' : 'group-hover:text-gray-600'}`}>
                    <ChevronDown size={12} strokeWidth={3} />
                </div>
            </div>

            {/* DROPDOWN MENU */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full right-0 mt-3 w-72 bg-white/95 backdrop-blur-xl rounded-[1.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right ring-1 ring-black/5">

                        {/* Header Section */}
                        <div className="p-5 bg-gradient-to-br from-indigo-50/80 via-white to-white border-b border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-100/20 to-violet-100/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

                            <div className="flex items-center gap-4 relative z-10">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-indigo-200 ring-2 ring-white">
                                    {userInitial}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-gray-900 font-bold truncate text-sm">{userName}</h4>
                                    <p className="text-gray-500 text-xs truncate font-medium">{userEmail}</p>
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest border border-amber-200 flex items-center gap-1 shadow-sm">
                                            <Sparkles size={8} /> Gold Plan
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="p-2 space-y-0.5">
                            <div className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Management</div>

                            <button onClick={() => { navigate('/settings?tab=business_profile'); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-gray-600 hover:text-indigo-600 transition-colors group">
                                <div className="p-1.5 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shadow-sm">
                                    <Building2 size={16} />
                                </div>
                                <div className="text-left">
                                    <div className="text-xs font-bold text-gray-700 group-hover:text-indigo-700 transition-colors">Business Profile</div>
                                    <div className="text-[10px] text-gray-400 font-medium">Manage company details</div>
                                </div>
                            </button>

                            <button onClick={() => { navigate('/settings?tab=subscription_billing'); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-gray-600 hover:text-indigo-600 transition-colors group">
                                <div className="p-1.5 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shadow-sm">
                                    <CreditCard size={16} />
                                </div>
                                <div className="text-left">
                                    <div className="text-xs font-bold text-gray-700 group-hover:text-indigo-700 transition-colors">Subscription & Billing</div>
                                    <div className="text-[10px] text-gray-400 font-medium">Manage your plan</div>
                                </div>
                            </button>

                            <button onClick={() => { navigate('/settings?tab=user_settings'); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-gray-600 hover:text-indigo-600 transition-colors group">
                                <div className="p-1.5 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shadow-sm">
                                    <Settings size={16} />
                                </div>
                                <div className="text-left">
                                    <div className="text-xs font-bold text-gray-700 group-hover:text-indigo-700 transition-colors">App Settings</div>
                                    <div className="text-[10px] text-gray-400 font-medium">Preferences & security</div>
                                </div>
                            </button>
                        </div>

                        {/* Footer / Logout */}
                        <div className="p-2 border-t border-gray-100 bg-gray-50/50">
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors group border border-transparent hover:border-rose-100 hover:shadow-sm"
                            >
                                <span className="text-xs font-bold flex items-center gap-2">
                                    <div className="p-1 rounded-md bg-rose-100 text-rose-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                                        <LogOut size={14} className="group-hover:rotate-12 transition-transform" />
                                    </div>
                                    Sign Out
                                </span>
                                <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors">v2.0.1</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
