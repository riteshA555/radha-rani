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
  User,
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { getDashboardFullData, DashboardCompositeData, invalidateDashboardCache } from '../../services/dashboardService';
import { getProducts } from '../../services/productService';
import { updateOrderStatus, getOrderById } from '../../services/orderService';
import { generateInvoicePDF } from '../../services/pdfService';
import { MetalRate, addMetalRate } from '../../services/rateService';
import { MetalInventory } from '../../services/inventoryService';
import { Karigar } from '../../services/karigarService';
import { Order, Product } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { GstCalculatorModal } from '@/app/components/modals/GstCalculatorModal';
import { QrScannerModal } from '../components/QrScannerModal'; // Added QrScannerModal import
import { ProductQuickView } from '../components/ProductQuickView'; // Added ProductQuickView import
import { triggerHaptic } from '../../utils/haptics'; // Added triggerHaptic import

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
  const [error, setError] = useState<string | null>(null);
  const [showGstCalc, setShowGstCalc] = useState(false);
  const [showScanner, setShowScanner] = useState(false); // Added showScanner state
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null); // Added scannedProduct state

  // ... (rest of the component)


  // Data States
  const [dashboardData, setDashboardData] = useState<DashboardCompositeData | null>(null);
  const [rate, setRate] = useState<MetalRate | null>(null);
  const [recentRates, setRecentRates] = useState<MetalRate[]>([]);
  const [inventory, setInventory] = useState<MetalInventory[]>([]);
  const [finishedWeight, setFinishedWeight] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [karigarBalances, setKarigarBalances] = useState<{ [key: string]: { cash: number, metal: number } }>({});
  const [kpis, setKpis] = useState<any>(null);
  const [localRate, setLocalRate] = useState<any>(null);
  const [localRateGold, setLocalRateGold] = useState<any>(null);
  const [rateGold, setRateGold] = useState<MetalRate | null>(null);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [newLocalRate, setNewLocalRate] = useState({ selling: '', buying: '', metal: 'SILVER' as 'SILVER' | 'GOLD' });

  const refreshAll = useCallback(async (showLoader = false, force = false) => {
    // Only show loader if we have absolutely no data yet
    const shouldShowLoader = showLoader && !dashboardData;
    if (shouldShowLoader) setLoading(true);
    setError(null);

    try {
      const data = await getDashboardFullData(force || showLoader);

      if (!data) throw new Error("No data received");

      console.log("Dashboard Data Loaded:", {
        user: data.debug_user_id,
        silver: data.live_rate,
        gold: data.live_rate_gold,
        localSilver: data.local_rate,
        localGold: data.local_rate_gold
      });

      setDashboardData(data);

      // Map composite data to legacy states for minimal UI change
      // Added safe checks for all properties
      setKpis(data.kpis || {});

      const stockData = data.stock || { raw_silver: 0, wastage: 0, finished_goods_weight: 0 };
      setInventory([
        { id: 'raw', name: 'Raw Silver', weight_gm: stockData.raw_silver || 0 },
        { id: 'wastage', name: 'Wastage Silver', weight_gm: stockData.wastage || 0 }
      ]);
      setFinishedWeight(stockData.finished_goods_weight || 0);

      setOrders(data.recent_orders || []);
      setRecentRates(data.recent_rates || []);

      if (data.live_rate) {
        setRate({
          id: 'live',
          metal_type: 'SILVER',
          selling_rate: data.live_rate,
          rate_date: new Date().toISOString(),
          source: 'Market'
        } as any);
      }

      if (data.live_rate_gold) {
        setRateGold({
          id: 'live_gold',
          metal_type: 'GOLD',
          selling_rate: data.live_rate_gold,
          rate_date: new Date().toISOString(),
          source: 'Market'
        } as any);
      }

      const balances: any = {};
      (data.karigar_overview || []).forEach(k => {
        balances[k.id] = { cash: k.current_balance, metal: k.current_metal_balance };
      });
      setKarigarBalances(balances);
      setKarigars(data.karigar_overview || []);
      setLocalRate(data.local_rate);
      setLocalRateGold(data.local_rate_gold);

      if (data.local_rate && newLocalRate.metal === 'SILVER') {
        setNewLocalRate(prev => ({
          ...prev,
          selling: data.local_rate!.selling_rate.toString(),
          buying: (data.local_rate!.buying_rate || '').toString()
        }));
      } else if (data.local_rate_gold && newLocalRate.metal === 'GOLD') {
        setNewLocalRate(prev => ({
          ...prev,
          selling: data.local_rate_gold!.selling_rate.toString(),
          buying: (data.local_rate_gold!.buying_rate || '').toString()
        }));
      }

      // NEW: Use low stock products from the Super RPC instead of a separate fetch
      if (data.low_stock_products) {
        setProducts(data.low_stock_products);
      }

    } catch (e: any) {
      console.error('Core refresh failed', e);
      setError(e.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdateLocalRate = async () => {
    if (!newLocalRate.selling) return;
    setIsUpdatingRate(true);
    try {
      await addMetalRate({
        metal_type: newLocalRate.metal,
        purity: newLocalRate.metal === 'SILVER' ? '999' : '916',
        selling_rate: parseFloat(newLocalRate.selling),
        buying_rate: newLocalRate.buying ? parseFloat(newLocalRate.buying) : undefined,
        rate_date: new Date().toISOString().split('T')[0],
        source: 'Local Dealer'
      });
      invalidateDashboardCache();
      await refreshAll(false, true); // Force fresh load
      setIsUpdatingRate(false);
    } catch (err) {
      console.error('Failed to update rate', err);
      setIsUpdatingRate(false);
    }
  };

  useEffect(() => {
    // Progressive Loading: Show cached data first, then fetch fresh
    // Progressive Loading: Show cached data first, then fetch fresh
    refreshAll(false); // Initial load allows cache (instant), deduplication handles double-mount

    // Consolidated Real-time Subscription (4 channels → 1 channel)
    // Debounce increased from 1s to 3s to reduce overhead
    let timer: any;
    const dRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => refreshAll(false, true), 3000); // 3 second debounce, force fresh
    };

    const dashboardChannel = supabase
      .channel('dashboard_realtime_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, dRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_transactions' }, dRefresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, dRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, dRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metal_rates' }, dRefresh)
      .subscribe();

    return () => {
      if (dashboardChannel) {
        supabase.removeChannel(dashboardChannel);
      }
      clearTimeout(timer);
    };
  }, [refreshAll]);


  // --- Derived Stats (Memoized) ---
  const stats = useMemo(() => {
    const rawSilverWeight = inventory.reduce((sum, item) => sum + (item.weight_gm || 0), 0);
    const totalSilverStockKg = (rawSilverWeight + finishedWeight) / 1000;

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
      pendingCount: kpis?.stats_pending_count || 0,
      pendingValue: kpis?.stats_pending_value || 0,
      monthlySales: kpis?.stats_monthly_sales || 0,
      monthlyOrdersCount: kpis?.stats_monthly_count || 0,
      lowStockCount: products.length // Use the filtered list directly
    };
  }, [inventory, finishedWeight, recentRates, rate, products, kpis]);

  const gstPayable = useMemo(() => kpis?.stats_monthly_gst || 0, [kpis]);

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
      refreshAll(); // Revert on failure
    }
  }, [refreshAll]);

  const handleQrScan = async (data: string) => {
    setShowScanner(false);
    if (data.startsWith('nexora:product:')) {
      const productId = data.replace('nexora:product:', '');
      try {
        const allProducts = await getProducts();
        const found = allProducts.find(p => p.id === productId);
        if (found) {
          setScannedProduct(found);
        } else {
          alert("Product not found in catalog");
        }
      } catch (err) {
        console.error("Scan lookup failed", err);
      }
    }
  };

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const fullOrder = await getOrderById(orderId);
      if (!fullOrder) throw new Error('Order not found');

      generateInvoicePDF({
        order_number: fullOrder.order_number,
        customer_name: fullOrder.customer_name,
        order_date: fullOrder.order_date,
        items: (fullOrder as any).items || [],
        subtotal: fullOrder.subtotal || 0,
        gst_amount: fullOrder.gst_amount || 0,
        total_amount: fullOrder.total_amount || 0,
        notes: (fullOrder as any).notes
      });
    } catch (err) {
      console.error('Invoice generation failed', err);
      alert('Could not generate invoice. Please try again.');
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Real-time business performance overview
              {settings.system_settings?.lastBackupAt && (
                <span className="ml-3 text-emerald-600 font-bold">
                  • Last Backup: {new Date(settings.system_settings.lastBackupAt).toLocaleDateString()}
                </span>
              )}
              {stats.lowStockCount > 0 && (
                <Link to="/stock" className="ml-3 px-2 py-0.5 bg-rose-50 text-rose-600 font-bold rounded border border-rose-100 uppercase animate-pulse">
                  • {stats.lowStockCount} Items Low Stock
                </Link>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { triggerHaptic('medium'); setShowScanner(true); }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold flex items-center gap-2 shadow-lg shadow-indigo-200"
            >
              <QrCode size={18} />
              <span className="hidden sm:inline">Scan Product</span>
            </button>
            <button
              onClick={() => refreshAll(true, true)}
              className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-rose-700 text-sm">
            <span>Error: {error}</span>
            <button onClick={() => refreshAll(true)} className="underline font-bold">Retry</button>
          </div>
        )}
      </div>


      {/* Financial KPIs Grid (2 rows) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard
          label="Total Receivable (उधारी)"
          value={kpis?.total_receivable || 0}
          icon={<ArrowUpRight className="w-5 h-5 text-rose-600" />}
          loading={loading && !kpis}
          color="rose"
        />
        <KpiCard
          label="Total Advance (जमा)"
          value={kpis?.total_advance || 0}
          icon={<ArrowDownLeft className="w-5 h-5 text-emerald-600" />}
          loading={loading && !kpis}
          color="emerald"
        />
        <KpiCard
          label="Today's Sales (आज की बिक्री)"
          value={kpis?.today_sales || 0}
          icon={<ShoppingCart className="w-5 h-5 text-indigo-600" />}
          loading={loading && !kpis}
          color="indigo"
        />
        <KpiCard
          label="Job Work Income (Monthly)"
          value={kpis?.monthly_job_work_income || 0}
          icon={<Wrench className="w-5 h-5 text-amber-600" />}
          loading={loading && !kpis}
          color="amber"
        />
        <KpiCard
          label="Raw Silver Stock Value"
          value={kpis?.raw_silver_stock_value || 0}
          icon={<Package className="w-5 h-5 text-blue-600" />}
          loading={loading && !kpis}
          color="blue"
        />
        <KpiCard
          label="Finished Goods Stock Value"
          value={kpis?.finished_goods_stock_value || 0}
          icon={<ShoppingBag className="w-5 h-5 text-violet-600" />}
          loading={loading && !kpis}
          color="violet"
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
                      <button
                        onClick={() => handleDownloadInvoice(order.id)}
                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                        title="Download Invoice"
                      >
                        <FileText size={14} />
                      </button>
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

        {/* Rate Control Center */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30">
            <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
              <Scale size={16} />
              Shop Rate Control
            </h3>
            <span className="text-[9px] font-bold uppercase text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100">Local PRICING</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-[9px] text-gray-400 font-bold uppercase mb-1">Live Silver (1g)</div>
                <div className="text-lg font-black text-gray-900">₹{rate?.selling_rate || '---'}</div>
              </div>
              <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                <div className="text-[9px] text-orange-600 font-bold uppercase mb-1">Live Gold (1g)</div>
                <div className="text-lg font-black text-orange-700">₹{rateGold?.selling_rate || '---'}</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="text-[9px] text-emerald-600 font-bold uppercase mb-1">Shop Silver</div>
                <div className="text-lg font-black text-emerald-700">₹{localRate?.selling_rate || '---'}</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div className="text-[9px] text-amber-600 font-bold uppercase mb-1">Shop Gold</div>
                <div className="text-lg font-black text-amber-700">₹{localRateGold?.selling_rate || '---'}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="mb-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewLocalRate(prev => ({ ...prev, metal: 'SILVER' }))}
                    className={`flex-1 py-1 text-[10px] font-bold rounded uppercase transition-all ${newLocalRate.metal === 'SILVER' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}
                  >
                    Silver 999
                  </button>
                  <button
                    onClick={() => setNewLocalRate(prev => ({ ...prev, metal: 'GOLD' }))}
                    className={`flex-1 py-1 text-[10px] font-bold rounded uppercase transition-all ${newLocalRate.metal === 'GOLD' ? 'bg-amber-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}
                  >
                    Gold 916
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Selling Rate</label>
                  <input
                    type="number"
                    value={newLocalRate.selling}
                    onChange={(e) => setNewLocalRate(prev => ({ ...prev, selling: e.target.value }))}
                    placeholder="e.g. 75.50"
                    className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Buying Rate</label>
                  <input
                    type="number"
                    value={newLocalRate.buying}
                    onChange={(e) => setNewLocalRate(prev => ({ ...prev, buying: e.target.value }))}
                    placeholder="e.g. 72.00"
                    className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleUpdateLocalRate}
                disabled={isUpdatingRate || !newLocalRate.selling}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100"
              >
                {isUpdatingRate ? 'Updating...' : 'Set Local Rates'}
              </button>
              <p className="text-[9px] text-center text-gray-400 font-medium">
                This rate will be used for all new billing and calculations.
              </p>
            </div>
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
      {/* Scanner Modal Overlay */}
      {showScanner && (
        <QrScannerModal
          onScan={handleQrScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Product Quick View (from Scan) */}
      {scannedProduct && (
        <ProductQuickView
          product={scannedProduct}
          silverRate={stats.currentRateKg}
          onClose={() => setScannedProduct(null)}
        />
      )}
    </div>
  );
}

// Components

const KpiCard = memo(({ label, value, icon, loading, color }: any) => (
  <div className={`bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-${color}-100/50 transition-all`}>
    <div className="flex justify-between items-start mb-4 sm:mb-6">
      <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
    </div>
    <div className="relative z-10">
      <div className="text-gray-400 text-[9px] sm:text-xs font-black uppercase tracking-[0.1em] mb-1 sm:mb-2">{label}</div>
      <CardSkeleton loading={loading}>
        <div className="text-2xl min-[400px]:text-3xl lg:text-4xl font-black text-gray-900 leading-tight">
          ₹{Math.round(value).toLocaleString()}
        </div>
      </CardSkeleton>
    </div>
    <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-50/30 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`}></div>
  </div>
), (prev, next) => prev.value === next.value && prev.loading === next.loading);
