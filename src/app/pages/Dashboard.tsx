import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Package,
  Wrench,
  Clock,
  Scale,
  ShoppingCart,
  FileText,
  Calculator,
  Plus,
  Receipt,
  ChevronRight,
  User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { getLatestRates, getRateHistory, MetalRate } from '../../services/rateService';
import { getMetalInventory, getFinishedGoodsWeight, MetalInventory } from '../../services/inventoryService';
import { getOrders, updateOrderStatus } from '../../services/orderService';
import { getKarigars, getKarigarBalances, Karigar } from '../../services/karigarService';
import { getProducts } from '../../services/productService';
import { Order, Product } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { t } from '../../shared/utils/i18n';
import { GstCalculatorModal } from '../components/modals/GstCalculatorModal';

// Helper Components
const CardSkeleton = memo(({ loading, children }: { loading: boolean, children: React.ReactNode }) => {
  if (!loading) return <>{children}</>;
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
    </div>
  );
});

export function Dashboard() {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [showGstCalc, setShowGstCalc] = useState(false);

  // Data States
  const [rate, setRate] = useState<MetalRate | null>(null);
  const [recentRates, setRecentRates] = useState<MetalRate[]>([]);
  const [inventory, setInventory] = useState<MetalInventory[]>([]);
  const [finishedWeight, setFinishedWeight] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // New Data States
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [karigarBalances, setKarigarBalances] = useState<{ [key: string]: { cash: number, metal: number } }>({});

  // Refactored granular data fetching
  const loadData = useCallback(async () => {
    // 1. Fetch Rates (Persisted)
    getLatestRates().then(rates => {
      const silverRate = rates.find(r => r.metal_type === 'SILVER') || null;
      setRate(silverRate);
    }).catch(e => console.error('Rate fetch failed', e));

    getRateHistory().then(hist => {
      setRecentRates(hist.filter(h => h.metal_type === 'SILVER'));
    }).catch(e => console.error('History fetch failed', e));

    // 2. Fetch Inventory & finished weight
    getMetalInventory().then(setInventory).catch(e => console.error('Inventory fetch failed', e));
    getFinishedGoodsWeight().then(setFinishedWeight).catch(e => console.error('Weight fetch failed', e));

    // 3. Fetch Orders & Products
    getOrders().then(setOrders).catch(e => console.error('Orders fetch failed', e));
    getProducts().then(setProducts).catch(e => console.error('Products fetch failed', e));

    // 4. Fetch Karigars
    getKarigars().then(setKarigars).catch(e => console.error('Karigars fetch failed', e));
    getKarigarBalances().then(setKarigarBalances).catch(e => console.error('Balances fetch failed', e));

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Debounced realtime refresh
    let refreshTimer: NodeJS.Timeout;
    const debouncedRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(loadData, 1000);
    };

    const ordersChannel = supabase
      .channel('dashboard_order_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, debouncedRefresh)
      .subscribe();

    const stockChannel = supabase
      .channel('dashboard_stock_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_transactions' }, debouncedRefresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, debouncedRefresh)
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(stockChannel);
      clearTimeout(refreshTimer);
    };
  }, [loadData]);


  // --- Derived Stats (Memoized) ---
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyOrders = orders.filter(o => {
      const d = new Date(o.order_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const rawSilverWeight = inventory.reduce((sum, item) => sum + (item.weight_gm || 0), 0);
    const totalSilverStockKg = (rawSilverWeight + finishedWeight) / 1000;

    const pendingOrders = orders.filter(o => o.status !== 'Completed');
    const pendingValue = pendingOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const pendingCount = pendingOrders.length;

    const monthlySales = monthlyOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Rate Calculations
    const prevRate = recentRates.length > 1 ? (recentRates[recentRates.length - 2].selling_rate * 10) : ((rate?.selling_rate || 0) * 10);
    const currentRate10g = (rate?.selling_rate || 0) * 10;
    const rateChangePercent = rate ? ((currentRate10g - prevRate) / (prevRate || 1)) * 100 : 0;
    const rateChangeAmt = currentRate10g - prevRate;
    const currentRateKg = (rate?.selling_rate || 0) * 1000;

    return {
      totalSilverStockKg,
      currentRateKg,
      rateChangePercent,
      rateChangeAmt,
      pendingCount,
      pendingValue,
      monthlySales,
      monthlyOrdersCount: monthlyOrders.length
    };
  }, [orders, inventory, finishedWeight, recentRates, rate]);

  const gstPayable = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyOrders = orders.filter(o => {
      const d = new Date(o.order_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    return monthlyOrders.reduce((sum, o) => sum + (o.gst_amount || 0), 0);
  }, [orders]);

  const recentOrdersSubset = useMemo(() => orders.slice(0, 5), [orders]);

  // 5 Most Recent Rates
  const rateHistorySubset = useMemo(() => {
    return [...recentRates].sort((a, b) => new Date(b.rate_date).getTime() - new Date(a.rate_date).getTime()).slice(0, 5);
  }, [recentRates]);

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    // Optimistic Update
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus as any } : o));
    try {
      await updateOrderStatus(id, newStatus);
    } catch (err) {
      console.error("Failed to update status", err);
      loadData(); // Revert on failure
    }
  }, [loadData]);

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Real-time business performance overview
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Monthly Sales"
          value={`₹${stats.monthlySales.toLocaleString()}`}
          subLabel={`${stats.monthlyOrdersCount} orders this month`}
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          trend={stats.rateChangePercent}
          loading={loading}
        />
        <SummaryCard
          label="Pending Orders"
          value={stats.pendingCount.toString()}
          subLabel={`Worth ₹${stats.pendingValue.toLocaleString()}`}
          icon={<ShoppingBag className="w-5 h-5 text-orange-600" />}
          loading={loading}
        />
        <SummaryCard
          label="Total Silver Stock"
          value={`${stats.totalSilverStockKg.toFixed(2)} kg`}
          subLabel="In Hand + Finished"
          icon={<Scale className="w-5 h-5 text-indigo-600" />}
          loading={loading}
        />
        <SummaryCard
          label="Today's Rate (1kg)"
          value={`₹${stats.currentRateKg.toLocaleString()}`}
          subLabel="Live Market Rate"
          icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          trend={stats.rateChangePercent}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders List */}
        <div className="bg-white rounded-xl border border-gray-200 lg:col-span-2 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">
              Recent Orders
            </h3>
            <Link to="/orders" className="text-xs text-indigo-600 font-bold hover:text-indigo-700 uppercase tracking-wider">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-50 flex-1 overflow-auto max-h-[400px]">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading orders...</div>
            ) : recentOrdersSubset.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm italic">No recent orders found</div>
            ) : (
              recentOrdersSubset.map((order) => (
                <div key={order.id} className="p-4 hover:bg-gray-50/50 transition-colors group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {order.customer_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {order.items?.map(i => i.description).join(', ') || 'No items'}
                      </p>
                    </div>
                    <span
                      className={`ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tight ${order.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : order.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-indigo-50 text-indigo-700'
                        }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">#{order.order_number}</span>
                    <div className="flex items-center gap-3">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="text-[10px] font-bold border-gray-200 rounded px-2 py-1 bg-white text-gray-600 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">Processing</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <span className="text-sm font-bold text-gray-900">
                        ₹{order.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/10">
              <h3 className="text-sm font-bold tracking-tight text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <Link to="/orders" className="flex flex-col items-center gap-2 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 hover:bg-indigo-50 transition-colors text-center group">
                <div className="p-2 text-indigo-600">
                  <Plus size={18} />
                </div>
                <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">New Order</span>
              </Link>

              <button onClick={() => setShowGstCalc(true)} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors text-center group">
                <div className="p-2 text-gray-600">
                  <Calculator size={18} />
                </div>
                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">GST Calc</span>
              </button>

              <div className="col-span-2 bg-blue-50/50 rounded-lg p-3 border border-blue-100 flex items-center justify-between">
                <div>
                  <div className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mb-1">GST Payable (Month)</div>
                  <div className="text-lg font-bold text-gray-900 leading-none">₹{gstPayable.toLocaleString()}</div>
                </div>
                <div className="p-2 text-blue-600 opacity-40">
                  <FileText size={18} />
                </div>
              </div>
            </div>
          </div>

          {/* Stock Quick View */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-gray-50/10">
              <h3 className="text-sm font-bold tracking-tight text-gray-900">
                Stock Breakdown
              </h3>
            </div>
            <div className="p-4 space-y-5">
              {/* Raw Silver */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Raw Silver</span>
                  <span className="text-gray-900 font-bold">{(inventory.find(i => i.name === 'Raw Silver')?.weight_gm || 0) / 1000} kg</span>
                </div>
                <div className="w-full bg-gray-50 rounded-full h-1.5 border border-gray-100">
                  <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '70%' }}></div>
                </div>
              </div>

              {/* Wastage */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Wastage</span>
                  <span className="text-gray-900 font-bold">{(inventory.find(i => i.name === 'Wastage Silver')?.weight_gm || 0) / 1000} kg</span>
                </div>
                <div className="w-full bg-gray-50 rounded-full h-1.5 border border-gray-100">
                  <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>

              {/* Finished Goods */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Finished Goods</span>
                  <span className="text-gray-900 font-bold">{(finishedWeight / 1000).toFixed(2)} kg</span>
                </div>
                <div className="w-full bg-gray-50 rounded-full h-1.5 border border-gray-100">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '40%' }}></div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50/50 border-t border-gray-100">
              <Link to="/stock" className="text-[10px] text-center block text-indigo-600 font-bold uppercase tracking-widest hover:text-indigo-700">
                Manage Inventory
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* --- New Sections: Karigar Status & Rates --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* Karigar Status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/10">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              Karigar Status
            </h3>
            <Link to="/karigars" className="text-[10px] text-indigo-600 font-bold hover:text-indigo-700 uppercase tracking-widest">
              View All
            </Link>
          </div>
          <div className="p-4">
            {karigars.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-8 italic">No active artisan records</p>
            ) : (
              <div className="space-y-4">
                {karigars.slice(0, 4).map(k => (
                  <div key={k.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 font-bold group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors text-xs">
                        {k.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{k.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{k.work_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        ₹{(karigarBalances[k.id]?.cash || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-amber-600 font-bold uppercase">Pending</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Metal Rates History */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              Live Metal Rates
            </h3>
            <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Market Feed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Timeline</th>
                  <th className="px-4 py-3">Rate (10g)</th>
                  <th className="px-4 py-3 text-right">Market (1kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rateHistorySubset.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-400 italic text-xs">No rate feed available</td>
                  </tr>
                ) : (
                  rateHistorySubset.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/30 group">
                      <td className="px-4 py-3">
                        <div className="text-gray-900 font-bold text-xs">{new Date(r.rate_date).toLocaleDateString()}</div>
                        <div className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">{r.source}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-medium text-xs">₹{(r.selling_rate * 10).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-gray-900 font-bold text-xs">₹{(r.selling_rate * 1000).toLocaleString()}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showGstCalc && <GstCalculatorModal onClose={() => setShowGstCalc(false)} />}
    </div>
  );
}

// Components
const SummaryCard = ({ label, value, subLabel, icon, trend, loading }: any) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 rounded-lg bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
        {icon}
      </div>
      {trend !== undefined && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-700'}`}>
          {trend > 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
    <div className="relative z-10">
      <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</div>
      <CardSkeleton loading={loading}>
        <div className="text-xl font-bold text-gray-900 mb-0.5 leading-none">{value}</div>
        <div className="text-[11px] text-gray-500 font-medium">{subLabel}</div>
      </CardSkeleton>
    </div>
  </div>
);
