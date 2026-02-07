import { useState, useEffect, useRef } from 'react';
import { Bell, Package, AlertTriangle, X, Check } from 'lucide-react';
import { getFinishedGoodsInventory } from '../../services/inventoryService';
import { getSettings } from '../../services/settingsService';
import { InventorySettings } from '../../types/settings';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';

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

        fetchNotifications();

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
                fetchNotifications();
            })
            .subscribe();

        // Fallback interval (every 5 mins)
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);

        return () => {
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

    const fetchNotifications = async () => {
        try {
            const products = await getFinishedGoodsInventory();
            const settings = await getSettings<InventorySettings>('inventory_settings');
            const threshold = settings?.lowStockThreshold || 10;

            const newNotifications: Notification[] = [];

            products.forEach(p => {
                const stock = Number(p.current_stock);

                // Reset read status if stock is now ABOVE threshold
                if (stock > threshold) {
                    localStorage.removeItem(`read-${p.id}`);
                    return;
                }

                // If BELOW threshold, add to notifications
                if (stock <= threshold) {
                    newNotifications.push({
                        id: `low-stock-${p.id}`,
                        type: 'stock',
                        title: stock === 0 ? 'Out of Stock' : 'Low Stock Alert',
                        message: `${p.name} is running low (${stock} ${settings?.defaultUnit || 'pcs'} left)`,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        read: localStorage.getItem(`read-${p.id}`) === 'true',
                        priority: stock === 0 ? 'high' : 'medium'
                    });
                }
            });

            setNotifications(newNotifications);
            setUnreadCount(newNotifications.filter(n => !n.read).length);
        } catch (err) {
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

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
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
                            <div className="p-10 text-center">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Check className="text-gray-300" size={20} />
                                </div>
                                <p className="text-sm font-medium text-gray-500">All caught up!</p>
                                <p className="text-xs text-gray-400 mt-1">No new alerts to show.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`p-4 transition-colors hover:bg-gray-50 relative group ${!n.read ? 'bg-indigo-50/30' : ''}`}
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
                                                        onClick={() => markAsRead(n.id)}
                                                        className="mt-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                                                    >
                                                        Mark as read
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="p-3 bg-gray-50/50 border-t border-gray-50 text-center">
                            <button className="text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors">
                                View all alerts
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
