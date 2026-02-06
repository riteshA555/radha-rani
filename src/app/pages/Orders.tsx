import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, User, Package, IndianRupee, Clock, CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getOrders } from '../../services/orderService';
import { Order as APIOrder } from '../../types'; // Adjust path if needed
import { formatIndianRupees } from '../../shared/utils/formatters';

export function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<APIOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders', error);
    } finally {
      setLoading(false);
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
      default:
        return { label: status, bgColor: 'bg-gray-50', textColor: 'text-gray-600', icon: Package };
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(order.order_number).includes(searchQuery);
    const matchesFilter = filterStatus === 'all' || order.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status.toLowerCase() === 'pending').length,
    'in-production': orders.filter((o) => o.status.toLowerCase() === 'in-production').length,
    completed: orders.filter((o) => o.status.toLowerCase() === 'completed').length,
    cancelled: orders.filter((o) => o.status.toLowerCase() === 'cancelled').length,
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Orders</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage customer orders and track production
          </p>
        </div>
        <Link
          to="/orders/create"
          className="hidden lg:flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> New Order
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name or order number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(['all', 'pending', 'in-production', 'completed', 'cancelled'] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filterStatus === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                  }`}
              >
                {status === 'all' ? 'All' : status.replace('-', ' ')}
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
                  className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer group hover:border-indigo-100"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="font-bold text-gray-900 text-sm tracking-tight flex items-center gap-2">
                          #{order.order_number}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tight ${statusConfig.bgColor} ${statusConfig.textColor} flex items-center gap-1 border border-transparent`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date(order.order_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-900">
                        ₹{formatIndianRupees(order.total_amount)}
                      </p>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{order.customer_name}</span>
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
                    <button className="flex-1 px-4 py-2 bg-gray-50 text-gray-500 text-[11px] font-bold uppercase tracking-widest rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center gap-2">
                      View details <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
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
