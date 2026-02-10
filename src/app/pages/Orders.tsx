import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Calendar, User, Package, IndianRupee, Clock, CheckCircle2, XCircle, ArrowRight, Loader2, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getOrders } from '../../services/orderService';
import { Order as APIOrder } from '../../types'; // Adjust path if needed
import { formatIndianRupees } from '../../shared/utils/formatters';
import { t } from '../../shared/utils/i18n';
import { useSettings } from '../../context/SettingsContext';
import { triggerHaptic } from '../../utils/haptics';

export function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<APIOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    loadOrders(1, true);
  }, [searchQuery, filterStatus]);

  const loadOrders = async (pageNum: number, isInitial: boolean = false) => {
    try {
      setLoading(true);
      // NOTE: getOrders should ideally support server-side search/filter too, 
      // but for now we paginate the base list and filter client-side as per current code structure.
      // ACTUALLY, "Next Level" requires server-side search. I'll add that to orderService soon.
      const data = await getOrders(pageNum, PAGE_SIZE);

      if (isInitial) {
        setOrders(data);
      } else {
        setOrders(prev => [...prev, ...data]);
      }

      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load orders', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadOrders(page + 1);
    }
  };

  const getStatusConfig = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'completed':
        return { label: 'Completed', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', icon: CheckCircle2 };
      case 'pending':
        return { label: 'Pending', bgColor: 'bg-amber-50', textColor: 'text-amber-700', icon: Clock };
      case 'in-production':
      case 'in production':
        return { label: 'In Production', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700', icon: Package };
      case 'cancelled':
        return { label: 'Cancelled', bgColor: 'bg-rose-50', textColor: 'text-rose-700', icon: XCircle };
      case 'quotation':
        return { label: 'Quotation', bgColor: 'bg-amber-100', textColor: 'text-amber-800', icon: FileText };
      default:
        return { label: status, bgColor: 'bg-gray-50', textColor: 'text-gray-600', icon: Package };
    }
  };

  const { filteredOrders, statusCounts } = useMemo(() => {
    const counts = {
      all: orders.length,
      pending: 0,
      'in-production': 0,
      completed: 0,
      cancelled: 0,
      quotation: 0
    };

    const filtered = orders.filter((order) => {
      const s = order.status.toLowerCase();
      if (s === 'pending') counts.pending++;
      else if (s === 'in-production' || s === 'in production') counts['in-production']++;
      else if (s === 'completed') counts.completed++;
      else if (s === 'cancelled') counts.cancelled++;
      else if (s === 'quotation') counts.quotation++;

      const matchesSearch =
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(order.order_number).includes(searchQuery);
      const matchesFilter = filterStatus === 'all' || s === filterStatus.toLowerCase();
      return matchesSearch && matchesFilter;
    });

    return {
      filteredOrders: filtered.sort((a: APIOrder, b: APIOrder) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()),
      statusCounts: counts
    };
  }, [orders, searchQuery, filterStatus]);

  const { settings } = useSettings();
  const lang = settings.user_settings?.language || 'en';

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('orders', lang)}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage customer orders and track production
          </p>
        </div>
        <Link
          to="/orders/create"
          className="hidden lg:flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> {t('add_new', lang)}
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={`${t('search', lang)}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(['all', 'pending', 'in-production', 'completed', 'cancelled', 'quotation'] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => { triggerHaptic('light'); setFilterStatus(status); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filterStatus === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                  }`}
              >
                {t(status.replace('-', '_') as any, lang)}
                <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[9px] ${filterStatus === status ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {statusCounts[status] || 0}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-gray-500 flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p>Loading orders...</p>
          </div>
        ) : (
          filteredOrders
            .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()) // Sort Newest First
            .map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;

              // Derive display data
              const itemsSummary = order.items && order.items.length > 0
                ? order.items.map((i: any) => i.description).join(', ')
                : 'No items';
              const itemCount = order.items ? order.items.length : 0;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-all cursor-pointer group hover:border-indigo-100"
                  onClick={() => { triggerHaptic('light'); navigate(`/orders/${order.id}`); }}
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1.5">
                        <h3 className="font-bold text-gray-900 text-xs sm:text-sm tracking-tight flex items-center gap-1 sm:gap-2">
                          #{order.order_number}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full uppercase tracking-tight whitespace-nowrap ${statusConfig.bgColor} ${statusConfig.textColor} flex items-center gap-1 border border-transparent`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date(order.order_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm sm:text-base font-black text-gray-900">
                        ₹{formatIndianRupees(order.total_amount)}
                      </p>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <User className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-gray-900 truncate font-bold">{order.customer_name}</span>
                        {(order.customer_code || order.contact_info) && (
                          <span className="text-[10px] text-gray-400 font-medium truncate">
                            {order.customer_code && `[${order.customer_code}] `}
                            {order.contact_info && `(${order.contact_info})`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 truncate">
                        {itemsSummary} ({itemCount} items)
                      </span>
                    </div>

                    {/* Material Type Badge */}
                    <div className="flex items-center gap-2 pt-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${order.material_type === 'OWN'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                        {order.material_type === 'OWN' ? 'Own Material' : 'Client Material'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    {order.status === 'QUOTATION' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('medium');
                          // Conversion logic will be handled here or in details page
                          navigate(`/orders/${order.id}`);
                        }}
                        className="flex-1 px-4 py-2 bg-amber-500 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        Finalize Order <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button className="flex-1 px-4 py-2 bg-gray-50 text-gray-500 text-[11px] font-bold uppercase tracking-widest rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center gap-2 text-center">
                        View details <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
        )}

        {hasMore && !loading && filteredOrders.length > 0 && (
          <div className="pt-4 pb-8 flex justify-center">
            <button
              onClick={handleLoadMore}
              className="px-8 py-3 bg-white border border-gray-200 text-indigo-600 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
            >
              Load More Orders
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {!loading && filteredOrders.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center flex flex-col items-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No orders found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery ? `No matches for "${searchQuery}"` : "Get started by creating your first order."}
            </p>
            {/* Only show Create button if not searching, or always? Always is fine, allows exit from loop */}
            <Link
              to="/orders/create"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
            >
              <Plus className="w-5 h-5" /> Create New Order
            </Link>
          </div>
        )}
      </div>

      {/* Floating Action Button (Mobile) */}
      <Link
        to="/orders/create"
        className="fixed bottom-24 right-6 lg:hidden w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 flex items-center justify-center z-20"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div >
  );
}
