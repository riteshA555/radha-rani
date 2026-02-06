import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  Plus,
  X,
  Loader2,
  Calculator,
  Scale,
  Coins,
  History,
  AlertCircle,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  getLatestRates,
  getRateHistory,
  addMetalRate,
  MetalRate,
  MetalType
} from '../../services/rateService';
import { formatIndianRupees } from '../../shared/utils/formatters';

// --- Sub-components to isolate rendering and errors ---

const RateCard = ({
  title,
  type,
  rates,
  icon: Icon,
  colorClass,
  bgAccent,
  calculateChange
}: {
  title: string;
  type: 'GOLD' | 'SILVER';
  rates: MetalRate[];
  icon: any;
  colorClass: string;
  bgAccent: string;
  calculateChange: (r: MetalRate) => number;
}) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 relative overflow-hidden group shadow-sm transition-all hover:shadow-md">
    <div className={`absolute top-0 right-0 w-32 h-32 ${bgAccent} rounded-full blur-3xl -mr-16 -mt-16 opacity-50`} />
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center gap-2 text-[10px] font-black ${colorClass} uppercase tracking-widest`}>
          <Icon className="w-3.5 h-3.5" /> {title}
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase">Rate / 1g</span>
      </div>
      <div className="space-y-6">
        {rates.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-4 text-center">No {type.toLowerCase()} data.</p>
        ) : rates.map(rate => {
          const change = calculateChange(rate);
          return (
            <div key={rate.id} className="group/item">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <div className="text-xs font-black text-gray-900 leading-none mb-1">{rate.purity}{type === 'GOLD' ? 'K' : ''} Purity</div>
                  <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">{rate.source || 'Market'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-gray-900 leading-none mb-1">₹{formatIndianRupees(rate.selling_rate || 0)}</div>
                  <div className={`text-[10px] font-black flex items-center justify-end gap-1 ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {change > 0 ? <TrendingUp size={10} /> : change < 0 ? <TrendingDown size={10} /> : null}
                    {change === 0 ? 'UNCH' : `₹${Math.abs(change).toLocaleString()}`}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50">
                <div className="text-center">
                  <div className="text-[8px] text-gray-400 font-black uppercase">1g</div>
                  <div className="text-[10px] font-bold text-gray-700">₹{formatIndianRupees(rate.selling_rate || 0)}</div>
                </div>
                <div className="text-center border-x border-gray-50">
                  <div className="text-[8px] text-gray-400 font-black uppercase">{type === 'GOLD' ? '10g (Tola)' : '100g'}</div>
                  <div className="text-[10px] font-bold text-gray-700">₹{formatIndianRupees((rate.selling_rate || 0) * (type === 'GOLD' ? 10 : 100))}</div>
                </div>
                <div className="text-center">
                  <div className="text-[8px] text-gray-400 font-black uppercase">{type === 'GOLD' ? '100g' : '1kg (Bar)'}</div>
                  <div className="text-[10px] font-bold text-gray-700">₹{formatIndianRupees((rate.selling_rate || 0) * (type === 'GOLD' ? 100 : 1000))}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const MarketChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-300 text-[10px] font-black uppercase tracking-[0.2em] italic">
        Awaiting more trend data...
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#facc15" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSilver" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fontWeight: 700, fill: '#9ca3af' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fontWeight: 700, fill: '#9ca3af' }}
            hide
          />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
            labelStyle={{ fontWeight: 900, marginBottom: '4px' }}
          />
          <Area
            type="monotone"
            dataKey="gold"
            stroke="#facc15"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorGold)"
            name="Gold (22K)"
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="silver"
            stroke="#6366f1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorSilver)"
            name="Silver (999)"
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Main Page ---

export function Rates() {
  const [latestRates, setLatestRates] = useState<MetalRate[]>([]);
  const [history, setHistory] = useState<MetalRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [rateForm, setRateForm] = useState({
    metal_type: 'SILVER' as MetalType,
    purity: '999',
    selling_rate: '',
    buying_rate: '',
    source: 'Local Dealer',
    rate_date: new Date().toISOString().split('T')[0]
  });

  // Calculator state
  const [calcWeight, setCalcWeight] = useState('');
  const [calcMetal, setCalcMetal] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [latest, hist] = await Promise.all([
        getLatestRates(),
        getRateHistory()
      ]);
      setLatestRates(latest || []);
      setHistory(hist || []);

      if (latest && latest.length > 0 && !calcMetal) {
        setCalcMetal(latest[0].id);
      }
    } catch (err) {
      console.error('Failed to load rates', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!rateForm.selling_rate) throw new Error('Selling rate required');
      await addMetalRate({
        ...rateForm,
        selling_rate: Number(rateForm.selling_rate),
        buying_rate: rateForm.buying_rate ? Number(rateForm.buying_rate) : undefined
      } as any);
      setShowUpdateModal(false);
      loadData();
    } catch (err: any) {
      alert('Error updating rate: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const sortedLatest = useMemo(() => {
    if (!latestRates) return { gold: [], silver: [] };
    const gold = latestRates.filter(r => r && r.metal_type === 'GOLD').sort((a, b) => (b.purity || '').localeCompare(a.purity || ''));
    const silver = latestRates.filter(r => r && r.metal_type === 'SILVER').sort((a, b) => (b.purity || '').localeCompare(a.purity || ''));
    return { gold, silver };
  }, [latestRates]);

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    const gold916 = history.filter(h => h && h.metal_type === 'GOLD' && h.purity === '916').slice(-7);
    const silver999 = history.filter(h => h && h.metal_type === 'SILVER' && h.purity === '999').slice(-7);

    const dates = Array.from(new Set([
      ...gold916.map(h => h.rate_date),
      ...silver999.map(h => h.rate_date)
    ].filter(Boolean))).sort();

    return dates.map(date => {
      try {
        const d = new Date(date);
        const label = isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const gRate = gold916.find(h => h.rate_date === date)?.selling_rate;
        const sRate = silver999.find(h => h.rate_date === date)?.selling_rate;

        return {
          date: label,
          gold: typeof gRate === 'number' ? gRate : null,
          silver: typeof sRate === 'number' ? sRate : null,
        };
      } catch (e) {
        return { date: 'N/A', gold: null, silver: null };
      }
    });
  }, [history]);

  const calculateValue = () => {
    if (!calcMetal || !calcWeight) return 0;
    const rate = latestRates.find(r => r.id === calcMetal);
    if (!rate || !rate.selling_rate) return 0;
    return Number(calcWeight) * rate.selling_rate;
  };

  const findPreviousRate = (current: MetalRate) => {
    if (!current || !history) return undefined;
    return history.find(h =>
      h &&
      h.metal_type === current.metal_type &&
      h.purity === current.purity &&
      (h.rate_date || '') < (current.rate_date || '')
    );
  };

  const calculateChange = (current: MetalRate) => {
    if (!current) return 0;
    const prev = findPreviousRate(current);
    if (!prev) return 0;
    return (current.selling_rate || 0) - (prev.selling_rate || 0);
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Market Terminal
          </h2>
          <p className="text-xs text-gray-500 font-medium tracking-tight">Professional Gold & Silver Price Tracking</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={loadData}
            className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowUpdateModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-all text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" /> Update Market
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-4 italic">Syncing with bullion servers...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <RateCard
                title="Gold (Live)"
                type="GOLD"
                rates={sortedLatest.gold}
                icon={Coins}
                colorClass="text-yellow-600"
                bgAccent="bg-yellow-50/50"
                calculateChange={calculateChange}
              />
              <RateCard
                title="Silver (Live)"
                type="SILVER"
                rates={sortedLatest.silver}
                icon={Scale}
                colorClass="text-indigo-400"
                bgAccent="bg-indigo-50/50"
                calculateChange={calculateChange}
              />
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <Activity className="w-3.5 h-3.5" /> Market Trend (7 Days)
                  </div>
                </div>
                <MarketChart data={chartData} />
                <div className="mt-2 flex items-center justify-center gap-4 text-[9px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> Gold</div>
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Silver</div>
                </div>
              </div>
            </div>

            {/* Price Calculator */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-6">
                  <Calculator className="w-3.5 h-3.5" /> Estimation Terminal
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Metal / Purity</label>
                        <select
                          value={calcMetal}
                          onChange={(e) => setCalcMetal(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                          {latestRates.map(r => (
                            <option key={r.id} value={r.id}>{r.metal_type} ({r.purity}{r.metal_type === 'GOLD' ? 'K' : ''})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Weight (gm)</label>
                        <input
                          type="number"
                          value={calcWeight}
                          onChange={(e) => setCalcWeight(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-300"
                          placeholder="0.000"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100/50 flex items-center gap-3">
                      <AlertCircle size={14} className="text-indigo-400" />
                      <p className="text-[9px] text-indigo-600 font-bold">Prices exclude GST and making charges.</p>
                    </div>
                  </div>
                  <div className="bg-indigo-600 px-8 py-10 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg animate-scale-in">
                    <div className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em] mb-2">Estimated Market Value</div>
                    <div className="text-3xl lg:text-5xl font-black tracking-tighter text-white">
                      <span className="text-indigo-300">₹</span>{formatIndianRupees(calculateValue())}
                    </div>
                    <div className="mt-4 flex gap-4 text-[9px] font-black uppercase text-indigo-100">
                      <span>{calcWeight || '0'} Grams</span>
                      <span className="opacity-40">•</span>
                      <span>₹{formatIndianRupees(latestRates.find(r => r.id === calcMetal)?.selling_rate || 0)} / 1g</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Ledger */}
          <div className="bg-white rounded-2xl border border-gray-100 flex flex-col shadow-sm h-full max-h-[850px]">
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <History className="w-3.5 h-3.5" /> Trend Ledger
              </h3>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 sticky top-0 z-10">
                  <tr className="border-b border-gray-50">
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.length === 0 ? (
                    <tr><td colSpan={2} className="px-6 py-20 text-center text-gray-300 text-[10px] uppercase font-bold tracking-widest">No history data.</td></tr>
                  ) : history.map(h => (
                    <tr key={h.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-4">
                        <div className="text-[10px] font-black text-gray-900">{new Date(h.rate_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                        <div className="text-[9px] text-gray-400 font-bold">{h.metal_type} ({h.purity}{h.metal_type === 'GOLD' ? 'K' : ''})</div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="text-xs font-black text-gray-900">₹{h.selling_rate.toLocaleString()}</div>
                        {h.buying_rate && <div className="text-[8px] text-emerald-500 font-bold">Buy: ₹{h.buying_rate.toLocaleString()}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Update Rates Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border border-gray-100">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-sm font-black text-gray-900 italic uppercase">
                Update Market Rate
              </h2>
              <button onClick={() => setShowUpdateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateRate} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.1s">
                  <label className="text-[9px] font-black text-gray-400 uppercase">Metal</label>
                  <select
                    value={rateForm.metal_type}
                    onChange={(e) => setRateForm({ ...rateForm, metal_type: e.target.value as MetalType })}
                    className="w-full bg-gray-50 border-none rounded-xl p-2.5 text-xs font-bold ring-1 ring-gray-100"
                  >
                    <option value="GOLD">GOLD</option>
                    <option value="SILVER">SILVER</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase">Purity</label>
                  <select
                    value={rateForm.purity}
                    onChange={(e) => setRateForm({ ...rateForm, purity: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl p-2.5 text-xs font-bold ring-1 ring-gray-100"
                  >
                    {rateForm.metal_type === 'GOLD' ? (
                      <><option value="916">22K (916)</option><option value="999">24K (999)</option><option value="750">18K (750)</option></>
                    ) : (
                      <><option value="999">Fine (999)</option><option value="925">Sterling (925)</option></>
                    )}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase">Selling Rate (₹ / 1g)</label>
                <input required type="number" step="0.01" value={rateForm.selling_rate} onChange={(e) => setRateForm({ ...rateForm, selling_rate: e.target.value })} className="w-full bg-indigo-50/50 border-none rounded-2xl p-4 text-2xl font-black text-indigo-700 ring-2 ring-indigo-100" />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-3.5 bg-gray-900 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl flex justify-center items-center gap-3">
                {submitting && <Loader2 size={12} className="animate-spin" />} Save Daily Rate
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
