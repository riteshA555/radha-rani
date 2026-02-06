import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Calendar,
    Edit2,
    RefreshCw,
    Plus,
    X,
    Loader2,
    Calculator,
    Scale,
    Coins,
    History,
    ChevronRight,
    Search,
    IndianRupee,
    AlertCircle
} from 'lucide-react';
import {
    getLatestRates,
    getRateHistory,
    addMetalRate,
    deleteMetalRate,
    MetalRate,
    MetalType
} from '../../services/rateService';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { supabase } from '../../supabaseClient';

export function Rates() {
    const [latestRates, setLatestRates] = useState<MetalRate[]>([]);
    const [localHistory, setLocalHistory] = useState<MetalRate[]>([]);
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

    const loadData = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const [latest, hist] = await Promise.all([
                getLatestRates(),
                getRateHistory()
            ]);
            setLatestRates(latest || []);
            setLocalHistory(hist?.reverse() || []); // Latest history first

            if (latest && latest.length > 0 && !calcMetal) {
                setCalcMetal(latest[0].id);
            }
        } catch (err) {
            console.error('Failed to load rates', err);
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [calcMetal]);

    useEffect(() => {
        loadData(true);

        const channel = supabase
            .channel('market_rate_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'metal_rates' }, () => {
                loadData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadData]);

    const handleUpdateRate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
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
        const gold = latestRates.filter(r => r.metal_type === 'GOLD').sort((a, b) => b.purity.localeCompare(a.purity));
        const silver = latestRates.filter(r => r.metal_type === 'SILVER').sort((a, b) => b.purity.localeCompare(a.purity));
        return { gold, silver };
    }, [latestRates]);

    const calculateValue = () => {
        const rate = latestRates.find(r => r.id === calcMetal);
        if (!rate || !calcWeight) return 0;
        return Number(calcWeight) * rate.selling_rate;
    };

    const findPreviousRate = (current: MetalRate) => {
        return localHistory.find(h =>
            h.metal_type === current.metal_type &&
            h.purity === current.purity &&
            h.rate_date < current.rate_date
        );
    };

    const calculateChange = (current: MetalRate) => {
        const prev = findPreviousRate(current);
        if (!prev) return 0;
        return current.selling_rate - prev.selling_rate;
    };

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        Market Terminal
                    </h2>
                    <p className="text-xs text-gray-500 font-medium tracking-tight">Real-time metal price tracking & conversion</p>
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left & Middle Columns: Live Rates & Calculator */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Live Rates Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Gold Card */}
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-yellow-100/50 transition-colors" />
                                <div className="relative">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-4">
                                        <Coins className="w-3.5 h-3.5" /> Gold Rates
                                    </div>
                                    <div className="space-y-4">
                                        {sortedLatest.gold.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic py-4">No gold rates updated today.</p>
                                        ) : sortedLatest.gold.map(rate => {
                                            const change = calculateChange(rate);
                                            return (
                                                <div key={rate.id} className="flex justify-between items-center group/item hover:translate-x-1 transition-transform cursor-default">
                                                    <div>
                                                        <div className="text-sm font-black text-gray-900 leading-none mb-1">{rate.purity}K Purity</div>
                                                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">MCX Bullion Rate / 1g</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-black text-gray-900">₹{formatIndianRupees(rate.selling_rate)}</div>
                                                        <div className={`text-[10px] font-black flex items-center justify-end gap-1 ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                            {change === 0 ? '--' : `₹${Math.abs(change).toLocaleString()}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Silver Card */}
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-100/50 transition-colors" />
                                <div className="relative">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">
                                        <Scale className="w-3.5 h-3.5" /> Silver Rates
                                    </div>
                                    <div className="space-y-4">
                                        {sortedLatest.silver.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic py-4">No silver rates updated today.</p>
                                        ) : sortedLatest.silver.map(rate => {
                                            const change = calculateChange(rate);
                                            return (
                                                <div key={rate.id} className="flex justify-between items-center group/item hover:translate-x-1 transition-transform cursor-default">
                                                    <div>
                                                        <div className="text-sm font-black text-gray-900 leading-none mb-1">{rate.purity} Purity</div>
                                                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Fine Silver / 1g</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-black text-gray-900">₹{formatIndianRupees(rate.selling_rate)}</div>
                                                        <div className={`text-[10px] font-black flex items-center justify-end gap-1 ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                            {change === 0 ? '--' : `₹${Math.abs(change).toLocaleString()}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Price Calculator */}
                        <div className="bg-white p-6 rounded-2xl text-gray-900 border border-gray-100 shadow-sm relative overflow-hidden h-full flex flex-col justify-center">
                            <div className="absolute bottom-0 right-0 opacity-5 -mb-12 -mr-12 text-indigo-900">
                                <Calculator size={200} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Estimation Terminal
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Select Metal / Purity</label>
                                            <select
                                                value={calcMetal}
                                                onChange={(e) => setCalcMetal(e.target.value)}
                                                className="w-full bg-white border-2 border-gray-100 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-indigo-500 hover:border-gray-200 transition-colors cursor-pointer text-gray-900"
                                            >
                                                {latestRates.map(r => (
                                                    <option key={r.id} value={r.id}>{r.metal_type} ({r.purity}{r.metal_type === 'GOLD' ? 'K' : ''})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Net Weight (grams)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={calcWeight}
                                                    onChange={(e) => setCalcWeight(e.target.value)}
                                                    className="w-full bg-white border-2 border-gray-100 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-indigo-500 hover:border-gray-200 transition-colors text-gray-900 placeholder:text-gray-300"
                                                    placeholder="0.000"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400 uppercase">gm</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center md:text-right bg-indigo-50 p-8 rounded-3xl border border-indigo-100">
                                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">Estimated Value</div>
                                        <div className="text-4xl md:text-5xl font-black tracking-tighter text-indigo-900">
                                            <span className="text-indigo-300">₹</span>{formatIndianRupees(calculateValue())}
                                        </div>
                                        <p className="text-[10px] text-indigo-400 mt-4 italic">As per today's market selling rate</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Historical Ledger */}
                    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden max-h-[700px]">
                        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <History className="w-3.5 h-3.5" /> Trend Ledger
                            </h3>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr className="border-b border-gray-50">
                                        <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-tighter">Date</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-tighter">Metal</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-tighter text-right">Rate (1g)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 font-medium">
                                    {localHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-20 text-center text-gray-300 italic text-[10px] uppercase font-bold tracking-widest">Database Empty.</td>
                                        </tr>
                                    ) : (
                                        localHistory.map(h => (
                                            <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 text-[10px] text-gray-500 font-bold">{new Date(h.rate_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[10px] font-black text-gray-900">{h.metal_type}</div>
                                                    <div className="text-[9px] text-gray-400">{h.purity}{h.metal_type === 'GOLD' ? 'K' : ''} • {h.source}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="text-xs font-black text-gray-900">₹{h.selling_rate.toLocaleString()}</div>
                                                    {h.buying_rate && (
                                                        <div className="text-[9px] text-emerald-500 font-bold italic">Buy: ₹{h.buying_rate.toLocaleString()}</div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Rates Modal */}
            {showUpdateModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-gray-100">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2 italic">
                                <Plus className="w-5 h-5 text-indigo-600" /> Markets Live Entry
                            </h2>
                            <button onClick={() => setShowUpdateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUpdateRate} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Metal Type</label>
                                    <select
                                        value={rateForm.metal_type}
                                        onChange={(e) => setRateForm({ ...rateForm, metal_type: e.target.value as MetalType, purity: e.target.value === 'GOLD' ? '916' : '999' })}
                                        className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-indigo-500"
                                    >
                                        <option value="GOLD">24K/22K Gold</option>
                                        <option value="SILVER">Silver / Sterling</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Purity</label>
                                    {rateForm.metal_type === 'GOLD' ? (
                                        <select
                                            value={rateForm.purity}
                                            onChange={(e) => setRateForm({ ...rateForm, purity: e.target.value })}
                                            className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-indigo-500"
                                        >
                                            <option value="999">24K (99.9%)</option>
                                            <option value="916">22K (91.6%)</option>
                                            <option value="750">18K (75%)</option>
                                        </select>
                                    ) : (
                                        <select
                                            value={rateForm.purity}
                                            onChange={(e) => setRateForm({ ...rateForm, purity: e.target.value })}
                                            className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-indigo-500"
                                        >
                                            <option value="999">Fine (99.9%)</option>
                                            <option value="925">Sterling (92.5%)</option>
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Sales Rate (₹ / 1g)</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={rateForm.selling_rate}
                                        onChange={(e) => setRateForm({ ...rateForm, selling_rate: e.target.value })}
                                        className="w-full bg-indigo-50/50 border-none rounded-2xl p-4 text-2xl font-black text-indigo-700 outline-none ring-2 ring-indigo-100 focus:ring-indigo-500"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-300 uppercase">INR</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Buying Rate (Optional)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={rateForm.buying_rate}
                                        onChange={(e) => setRateForm({ ...rateForm, buying_rate: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-emerald-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">As Of Date</label>
                                    <input
                                        type="date"
                                        value={rateForm.rate_date}
                                        onChange={(e) => setRateForm({ ...rateForm, rate_date: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 bg-gray-900 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-gray-200 flex justify-center items-center gap-3 mt-4 hover:bg-black transition-all active:scale-95"
                            >
                                {submitting && <Loader2 size={14} className="animate-spin" />} Authorize Rate Push
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
