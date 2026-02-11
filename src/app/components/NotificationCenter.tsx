import { useState, useEffect, useRef } from 'react';
import { Bell, Package, AlertTriangle, X, Check } from 'lucide-react';
import { getFinishedGoodsInventory, getLowStockAlerts } from '../../services/inventoryService';
import { getSettings } from '../../services/settingsService';
import { InventorySettings } from '../../types/settings';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
    id: string;
    type: 'stock' | 'system';
    title: string;
    message: string;
    time: string;
    read: boolean;
    priority: 'low' | 'medium' | 'high';
}

export function NotificationCenter() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        const controller = new AbortController();
        fetchNotifications(controller.signal);

        // Real-time Stock Monitoring - Only if user exists
        const channel = supabase
            .channel(`notification_stock_${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'products',
                filter: `user_id=eq.${user.id}`
            }, (payload: any) => {
                // When stock changes, re-fetch to update the alerts
                fetchNotifications(controller.signal);
            })
            .subscribe();

        // Fallback interval (every 5 mins)
        const interval = setInterval(() => fetchNotifications(controller.signal), 5 * 60 * 1000);

        return () => {
            controller.abort();
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async (signal?: AbortSignal) => {
        try {
            // Check if signal is already aborted
            if (signal?.aborted) return;

            // NEW: Fetch ONLY products that match the threshold on the server
            const lowStockItems = await getLowStockAlerts();

            if (signal?.aborted) return;

            const newNotifications: Notification[] = [];

            lowStockItems.forEach((p: any) => {
                const stock = Number(p.current_stock);
                const threshold = p.min_stock;

                newNotifications.push({
                    id: `low-stock-${p.id}`,
                    type: 'stock',
                    title: stock === 0 ? 'Out of Stock' : 'Low Stock Alert',
                    message: `${p.name} is running low (${stock} units left)`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    read: localStorage.getItem(`read-${p.id}`) === 'true',
                    priority: stock === 0 ? 'high' : 'medium'
                });
            });

            setNotifications(newNotifications);
            setUnreadCount(newNotifications.filter(n => !n.read).length);
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            console.error("Failed to fetch notifications", err);
        }
    };

    const markAsRead = (id: string) => {
        const productId = id.replace('low-stock-', '');
        localStorage.setItem(`read-${productId}`, 'true');
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllRead = () => {
        notifications.forEach(n => {
            const productId = n.id.replace('low-stock-', '');
            localStorage.setItem(`read-${productId}`, 'true');
        });
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-xl transition-all duration-300 ${isOpen
                    ? 'bg-indigo-50 text-indigo-600 shadow-inner'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
            >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-wiggle' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center animate-in zoom-in duration-300">
                        {unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                    >
                        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">
                                        {unreadCount} New
                                    </span>
                                )}
                            </h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-12 text-center"
                                >
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Check className="text-emerald-500" size={24} />
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-900 mb-1">All Caught Up!</h4>
                                    <p className="text-xs text-gray-400">Your inventory is healthy and there are no active alerts.</p>
                                </motion.div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    <AnimatePresence initial={false}>
                                        {notifications.map((n) => (
                                            <motion.div
                                                key={n.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                layout
                                                onClick={() => {
                                                    if (n.type === 'stock') navigate('/catalog');
                                                    setIsOpen(false);
                                                }}
                                                className={`p-4 transition-colors hover:bg-gray-50 relative group cursor-pointer ${!n.read ? 'bg-indigo-50/30' : ''}`}
                                            >
                                                <div className="flex gap-3">
                                                    <div className={`mt-1 p-2 rounded-lg shrink-0 ${n.priority === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                                        }`}>
                                                        {n.type === 'stock' ? <Package size={16} /> : <AlertTriangle size={16} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-0.5">
                                                            <h4 className={`text-sm font-bold truncate ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>
                                                                {n.title}
                                                            </h4>
                                                            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">
                                                                {n.time}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 leading-relaxed">
                                                            {n.message}
                                                        </p>
                                                        {!n.read && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    markAsRead(n.id);
                                                                }}
                                                                className="mt-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                                                            >
                                                                Mark as read
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="p-3 bg-gray-50/50 border-t border-gray-50 text-center">
                                <button
                                    onClick={() => { navigate('/catalog'); setIsOpen(false); }}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest"
                                >
                                    View full Catalog
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
