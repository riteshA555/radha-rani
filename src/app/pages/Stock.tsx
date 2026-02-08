import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Minus, Package, Database, TrendingUp, Search, Sparkles, X, Loader2, ArrowRight, RefreshCw, ShoppingCart, History } from 'lucide-react';
import { getStockSummary, getFinishedGoodsInventory, addStockTransaction, getStockTransactions } from '../../services/inventoryService';
import { getLatestRates, getRateHistory } from '../../services/rateService';
import { getLiabilityLedgers } from '../../services/accountingService';
import { getSettings } from '../../services/settingsService';
import { InventorySettings, NotificationSettings, BusinessProfileSettings } from '../../types/settings';
import { StockSummary, Product, StockType, StockItemType, StockTransaction } from '../../types';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/tabs';

export function Stock() {
  // Data State
  const [summary, setSummary] = useState<StockSummary>({
    raw_silver: 0,
    wastage: 0,
    finished_goods_count: 0,
    finished_goods_weight: 0,
    total_value: 0
  });
  const [finishedGoods, setFinishedGoods] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [vendors, setVendors] = useState<{ id: string, name: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'RAW' | 'WASTAGE' | 'FINISHED'>('FINISHED');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [auditLog, setAuditLog] = useState<StockTransaction[]>([]);

  // Settings & Context
  const [silverRate, setSilverRate] = useState(0);
  const [rateChange, setRateChange] = useState(0);
  const [invSettings, setInvSettings] = useState<InventorySettings | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'RAW_IN' as StockType,
    item_type: 'RAW_SILVER' as StockItemType,
    quantity: '',
    weight_gm: '',
    product_id: '',
    source: '',
    rate_at_time: '',
    wastage_percent: '',
    note: '',
    record_purchase: false,
    payment_amount: '',
    payment_mode: 'Cash',
    vendorId: ''
  });

  const loadData = useCallback(async () => {
    try {
      if (summary.total_value === 0) setLoading(true);

      const [rates, rateHist] = await Promise.all([
        getLatestRates(),
        getRateHistory()
      ]);

      const silverRate = rates.find(r => r.metal_type === 'SILVER') || null;
      const currentRateKg = silverRate ? (silverRate.selling_rate * 1000) : 75000;
      setSilverRate(currentRateKg);

      if (rateHist && rateHist.length > 1) {
        const prev = rateHist[rateHist.length - 2].selling_rate * 1000;
        setRateChange(((currentRateKg - prev) / prev) * 100);
      }

      let transactionType: StockItemType | undefined = undefined;
      if (activeTab === 'RAW') transactionType = 'RAW_SILVER';
      if (activeTab === 'WASTAGE') transactionType = 'WASTAGE';
      if (activeTab === 'FINISHED') transactionType = 'FINISHED_GOODS';

      const promises: Promise<any>[] = [
        getStockSummary(currentRateKg),
        getFinishedGoodsInventory(),
        getLiabilityLedgers(),
        getSettings('inventory_settings'),
        getStockTransactions('FINISHED_GOODS') // Always fetch audit log
      ];

      // Optimise transaction fetching for the selected tab
      if (transactionType && transactionType !== 'FINISHED_GOODS') {
        promises.push(getStockTransactions(transactionType));
      } else {
        promises.push(Promise.resolve([]));
      }

      const [stockSummary, fgInventory, vendorList, invSet, fgHistory, tabTransactions] = await Promise.all(promises);

      setSummary(stockSummary);
      setFinishedGoods(fgInventory);
      setVendors(vendorList);
      setInvSettings(invSet);
      setAuditLog(fgHistory);

      if (transactionType) {
        setTransactions(transactionType === 'FINISHED_GOODS' ? fgHistory : tabTransactions);
      }

    } catch (err) {
      console.error('Failed to load stock data', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addStockTransaction({
        date: new Date().toISOString(),
        type: form.type,
        item_type: form.item_type,
        quantity: Number(form.quantity),
        weight_gm: form.weight_gm ? Number(form.weight_gm) : undefined,
        product_id: form.product_id || undefined,
        note: form.note,
        source: form.source || undefined,
        rate_at_time: form.rate_at_time ? Number(form.rate_at_time) : undefined,
        wastage_percent: form.wastage_percent ? Number(form.wastage_percent) : undefined
      }, {
        amount: form.record_purchase ? Number(form.payment_amount) : 0,
        mode: form.record_purchase ? (form.payment_mode || 'Cash') : '',
        vendorId: form.record_purchase ? form.vendorId : undefined
      });

      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      alert('Error adding stock: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      type: 'RAW_IN',
      item_type: 'RAW_SILVER',
      quantity: '',
      weight_gm: '',
      product_id: '',
      source: '',
      rate_at_time: '',
      wastage_percent: '',
      note: '',
      record_purchase: false,
      payment_amount: '',
      payment_mode: 'Cash',
      vendorId: ''
    });
  };

  // Filter Logic
  const filteredFG = useMemo(() =>
    finishedGoods.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [finishedGoods, searchQuery]
  );

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      {/* Header */}
      <PageHeader
        title="Stock Management"
        subtitle="Track raw silver, wastage & finished goods"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium"
          >
            <Plus className="w-5 h-5" /> Add Stock Entry
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Raw Silver"
          value={`${(summary.raw_silver / 1000).toFixed(2)} kg`}
          subTitle="Weight in hand"
          icon={<Database className="w-5 h-5" />}
          color="indigo"
        />
        <SummaryCard
          title="Wastage Pool"
          value={`${(summary.wastage / 1000).toFixed(2)} kg`}
          subTitle="Refined estimate"
          icon={<Sparkles className="w-5 h-5" />}
          color="amber"
        />
        <SummaryCard
          title="Finished Goods"
          value={`${summary.finished_goods_count} Pcs`}
          subTitle={`${(summary.finished_goods_weight / 1000).toFixed(2)} kg weight`}
          icon={<Package className="w-5 h-5" />}
          color="emerald"
        />
        <SummaryCard
          title="Inventory Value"
          value={`₹${formatIndianRupees(Math.round(summary.total_value))}`}
          subTitle="Market Rate estimate"
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
          trend={rateChange}
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tabs */}
        <Tabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'FINISHED', label: 'Finished Goods', icon: <Package size={18} /> },
            { id: 'RAW', label: 'Raw Silver', icon: <Database size={18} /> },
            { id: 'WASTAGE', label: 'Wastage', icon: <Sparkles size={18} /> }
          ]}
        />

        <div className="p-6">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h3 className="text-lg font-bold text-gray-800">
              {activeTab === 'FINISHED' ? 'Finished Goods Inventory' :
                activeTab === 'RAW' ? 'Raw Silver Transaction History' : 'Wastage Accrual History'}
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-500 flex flex-col items-center">
              <div className="relative mb-4">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <Database className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="font-bold text-gray-800 text-lg">Fetching Stock Safely...</div>
              <div className="text-sm text-gray-400">Verifying live inventory levels</div>
            </div>
          ) : (
            <>
              {activeTab === 'FINISHED' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">Product Identity</th>
                        <th className="px-6 py-4 text-right">Current Stock</th>
                        <th className="px-6 py-4 text-right">Unit Wt.</th>
                        <th className="px-6 py-4 text-right">Total Net Silver</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredFG.map(p => (
                        <tr key={p.id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 font-bold group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors text-xs">
                                {p.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 leading-tight">{p.name}</div>
                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight mt-0.5">{p.category} • {p.id.slice(0, 8).toUpperCase()}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex flex-col items-end">
                              <span className={`text-base font-bold ${p.current_stock < (p.min_stock || 5) ? 'text-rose-600' : 'text-gray-900'}`}>
                                {p.current_stock} <span className="text-[10px] text-gray-400 uppercase font-medium">Pcs</span>
                              </span>
                              {p.current_stock < (p.min_stock || 5) && (
                                <span className="mt-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-bold rounded border border-rose-100 uppercase">Stock Low</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right font-medium text-gray-500">{p.default_weight}g</td>
                          <td className="px-6 py-5 text-right">
                            <div className="text-base font-bold text-gray-900">
                              {(p.current_stock * p.default_weight).toFixed(1)} <span className="text-[10px] uppercase font-bold text-gray-400">g</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredFG.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-20 text-gray-500 italic">No products found for this search.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {(activeTab === 'RAW' || activeTab === 'WASTAGE') && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">Timeline</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4 text-right">Weight Impact</th>
                        <th className="px-6 py-4 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {transactions
                        .filter(t => !searchQuery || t.note?.toLowerCase().includes(searchQuery.toLowerCase()) || t.source?.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(t => {
                          const isIngoing = t.type.includes('IN') || t.type === 'PRODUCTION' || (t.type === 'WASTAGE' && activeTab === 'WASTAGE');
                          const value = (t.quantity || 0) * (t.rate_at_time || 0);
                          return (
                            <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="font-semibold text-gray-900 text-xs">{new Date(t.date).toLocaleDateString()}</div>
                                <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </td>
                              <td className="px-6 py-5">
                                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border ${isIngoing ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                                  }`}>
                                  {isIngoing ? <Plus size={10} /> : <Minus size={10} />}
                                  {t.type.replace('_', ' ')}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="font-semibold text-gray-800 text-xs">{t.source || 'Standard Entry'}</div>
                                <div className="text-[10px] text-gray-400 italic line-clamp-1">{t.note || 'No notes'}</div>
                              </td>
                              <td className="px-6 py-5 text-right whitespace-nowrap">
                                <div className={`text-base font-bold ${isIngoing ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {isIngoing ? '+' : '-'}{t.quantity.toFixed(1)} <span className="text-[10px] uppercase font-bold text-gray-400">{activeTab === 'WASTAGE' ? 'g' : (t.item_type === 'FINISHED_GOODS' ? 'pcs' : 'g')}</span>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right">
                                {value > 0 ? (
                                  <div className="font-bold text-gray-900 text-xs">₹{formatIndianRupees(Math.round(value))}</div>
                                ) : (
                                  <div className="text-gray-200 text-xs">—</div>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      }
                      {transactions.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-20 text-gray-400 italic">No transactions found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Stock Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Stock Entry</h2>
                <p className="text-sm text-gray-500 font-medium">Record movements for silvers & products</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {/* Item Type Selector */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'RAW_SILVER', label: 'Raw Silver', icon: <Database /> },
                  { id: 'FINISHED_GOODS', label: 'Finished Items', icon: <Package /> },
                  { id: 'WASTAGE', label: 'Wastage', icon: <Sparkles /> }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setForm({ ...form, item_type: type.id as any })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${form.item_type === type.id
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 text-gray-400'
                      }`}
                  >
                    <span className={form.item_type === type.id ? 'text-indigo-600' : 'text-gray-400'}>
                      {React.cloneElement(type.icon as any, { size: 24 })}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{type.label}</span>
                  </button>
                ))}
              </div>

              {/* Transaction Type Selector */}
              <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                {[
                  { id: 'RAW_IN', label: 'Stock IN', icon: <Plus size={14} /> },
                  { id: 'RAW_OUT', label: 'Stock OUT', icon: <Minus size={14} /> },
                  { id: 'PRODUCTION', label: 'Production', icon: <RefreshCw size={14} /> },
                  { id: 'ADJUSTMENT', label: 'Adjust', icon: <TrendingUp size={14} /> }
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setForm({ ...form, type: mode.id as any })}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${form.type === mode.id
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
                      : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                    {mode.icon} {mode.label}
                  </button>
                ))}
              </div>

              {/* Product Selection for Finished Goods */}
              {form.item_type === 'FINISHED_GOODS' && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Target Product</label>
                  <select
                    value={form.product_id}
                    onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                    required
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-gray-800"
                  >
                    <option value="">Search & Select Product</option>
                    {finishedGoods.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock})</option>)}
                  </select>
                </div>
              )}

              {/* Quantitative Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    {form.item_type === 'FINISHED_GOODS' ? 'Quantity (Pcs)' : 'Weight (Grams)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number" step="any" required
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="w-full pl-4 pr-12 py-3 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 text-lg font-bold text-gray-900 placeholder-gray-300"
                      placeholder="0.00"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">
                      {form.item_type === 'FINISHED_GOODS' ? 'PCS' : 'GMS'}
                    </div>
                  </div>
                </div>

                {form.item_type === 'FINISHED_GOODS' && (
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Net Item weight (g)</label>
                    <div className="relative">
                      <input
                        type="number" step="any" required
                        value={form.weight_gm}
                        onChange={(e) => setForm({ ...form, weight_gm: e.target.value })}
                        className="w-full pl-4 pr-12 py-3 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 text-lg font-bold text-gray-900"
                        placeholder="0.00"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">GMS</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Source / Method</label>
                  <input
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    placeholder="e.g. Local Purchase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Reference Notes</label>
                  <input
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    placeholder="Special instructions..."
                  />
                </div>
              </div>

              {/* Purchase Details (Financial) */}
              <div className="space-y-4 pt-6 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.record_purchase}
                    onChange={(e) => setForm({ ...form, record_purchase: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="font-bold text-sm text-gray-700 select-none">Record financial purchase transaction?</span>
                </label>

                {form.record_purchase && (
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Supplier / Account</label>
                      <select
                        value={form.vendorId}
                        onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                        className="w-full p-2.5 bg-white border border-emerald-200 rounded-lg text-sm font-bold"
                      >
                        <option value="">Select Vendor</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Amount Paid (₹)</label>
                        <input
                          type="number"
                          value={form.payment_amount}
                          onChange={(e) => setForm({ ...form, payment_amount: e.target.value })}
                          className="w-full p-2.5 bg-white border border-emerald-200 rounded-lg text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Payment Mode</label>
                        <select
                          value={form.payment_mode}
                          onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
                          className="w-full p-2.5 bg-white border border-emerald-200 rounded-lg text-sm font-bold"
                        >
                          <option value="Cash">Cash</option>
                          <option value="Online">UPI / Online</option>
                          <option value="Bank">Bank Transfer</option>
                          <option value="Credit">On Credit</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Footbar */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-gray-500 font-bold bg-gray-50 hover:bg-gray-100 rounded-xl transition text-sm"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-3 text-white font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center justify-center gap-2 text-sm"
                >
                  {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Database size={16} />}
                  Commit Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Production & Sales History Audit Log */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-8 mb-4">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">Production & Sales Audit</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Inventory Movement History</p>
            </div>
          </div>
          <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">Finished Goods Logs</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-50">
              <tr>
                <th className="px-6 py-4">Timeline</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4 text-right">Impact</th>
                <th className="px-6 py-4 text-right">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {auditLog.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400 italic">No movement recorded yet</td></tr>
              ) : (
                auditLog.slice(0, 10).map(t => {
                  const isProduction = t.type === 'PRODUCTION' || t.type === 'RAW_IN';
                  const productName = finishedGoods.find(p => p.id === t.product_id)?.name || 'Unknown Product';

                  return (
                    <tr key={t.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="font-semibold text-gray-900 text-xs">{new Date(t.date).toLocaleDateString()}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border ${isProduction ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                          {isProduction ? <Package size={12} /> : <ShoppingCart size={12} />}
                          {isProduction ? 'Production' : 'Sale / Out'}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-gray-800 text-xs">{productName}</div>
                        <div className="text-[10px] text-gray-400 font-bold mt-0.5">Ref: {t.id.slice(0, 8).toUpperCase()}</div>
                      </td>
                      <td className="px-6 py-5 text-right whitespace-nowrap">
                        <div className={`text-base font-bold ${isProduction ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isProduction ? '+' : '-'}{t.quantity} <span className="text-[10px] uppercase font-bold text-gray-400">Pcs</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="text-xs font-medium text-gray-500 italic">{t.note || t.source || 'Direct Entry'}</div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Components
const SummaryCard = ({ title, value, subTitle, icon, color, trend }: any) => {
  const colorMap: any = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' }
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm group hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-lg ${c.bg} ${c.text}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend > 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% market
          </span>
        )}
      </div>
      <div>
        <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</div>
        <div className="text-2xl font-bold text-gray-900 mb-0.5 leading-none">{value}</div>
        <div className="text-[11px] text-gray-500 font-medium">{subTitle}</div>
      </div>
    </div>
  );
};
