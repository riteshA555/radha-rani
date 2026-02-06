import { useState, useEffect, useMemo } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Wallet,
    X,
    Loader2,
    Briefcase,
    History,
    CheckCircle2,
    Scale,
    ArrowUpRight,
    ArrowDownLeft,
    Coins,
    User,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import {
    getKarigars,
    createKarigar,
    updateKarigar,
    deleteKarigar,
    getKarigarBalances,
    getKarigarWorkHistory,
    recordKarigarPayment,
    issueMetalToKarigar,
    receiveProductionFromKarigar,
    Karigar
} from '../../services/karigarService';
import { getProducts } from '../../services/productService';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { Product } from '../../types';

type TabType = 'MASTER' | 'SETTLEMENT';

export function Karigars({ defaultTab = 'MASTER' }: { defaultTab?: TabType }) {
    const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
    const [karigars, setKarigars] = useState<Karigar[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [balances, setBalances] = useState<{ [key: string]: { cash: number, metal: number } }>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Selected Karigar for Settlement View
    const [selectedKarigarId, setSelectedKarigarId] = useState<string | null>(null);

    // Modal State
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showActionModal, setShowActionModal] = useState<'ISSUE' | 'RECEIVE' | 'PAYOUT' | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form States
    const [registerForm, setRegisterForm] = useState({
        name: '',
        work_type: 'General',
        rate_type: 'Per KG' as 'Per KG' | 'Per Piece' | 'Fixed',
        default_rate: 0,
        status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
        contact_number: '',
        specialization: '',
        address: ''
    });

    const [issueForm, setIssueForm] = useState({ weight: '', date: new Date().toISOString().split('T')[0], note: '' });
    const [payoutForm, setPayoutForm] = useState({ amount: '', mode: 'Cash', date: new Date().toISOString().split('T')[0], notes: '' });
    const [receiveForm, setReceiveForm] = useState({
        productId: '',
        quantity: '',
        weight: '',
        wastage: '',
        laborRate: '',
        date: new Date().toISOString().split('T')[0],
        note: ''
    });

    const [workHistory, setWorkHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Sync state if navigating between Master and Settlement via Sidebar
    useEffect(() => {
        setActiveTab(defaultTab);
    }, [defaultTab]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedKarigarId) {
            loadHistory();
        }
    }, [selectedKarigarId]);

    const loadData = async () => {
        try {
            const [kData, bData, pData] = await Promise.all([
                getKarigars(),
                getKarigarBalances(),
                getProducts()
            ]);
            setKarigars(kData || []);
            setBalances(bData || {});
            setProducts(pData || []);
        } catch (err) {
            console.error('Failed to load karigars', err);
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        if (!selectedKarigarId) return;
        setHistoryLoading(true);
        try {
            const data = await getKarigarWorkHistory(selectedKarigarId);
            setWorkHistory(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const selectedKarigar = useMemo(() =>
        karigars.find(k => k.id === selectedKarigarId),
        [karigars, selectedKarigarId]);

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await updateKarigar(editingId, registerForm as any);
            } else {
                await createKarigar(registerForm as any);
            }
            setShowRegisterModal(false);
            setEditingId(null);
            loadData();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleIssueSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedKarigarId) return;
        setSubmitting(true);
        try {
            await issueMetalToKarigar(selectedKarigarId, Number(issueForm.weight), issueForm.date, issueForm.note);
            setShowActionModal(null);
            setIssueForm({ weight: '', date: new Date().toISOString().split('T')[0], note: '' });
            loadData();
            loadHistory();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReceiveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedKarigarId) return;
        setSubmitting(true);
        try {
            await receiveProductionFromKarigar(
                selectedKarigarId,
                receiveForm.productId,
                Number(receiveForm.quantity),
                Number(receiveForm.weight),
                Number(receiveForm.wastage),
                Number(receiveForm.laborRate),
                receiveForm.date,
                receiveForm.note
            );
            setShowActionModal(null);
            setReceiveForm({ productId: '', quantity: '', weight: '', wastage: '', laborRate: '', date: new Date().toISOString().split('T')[0], note: '' });
            loadData();
            loadHistory();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePayoutSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedKarigarId) return;
        setSubmitting(true);
        try {
            await recordKarigarPayment(
                selectedKarigarId,
                Number(payoutForm.amount),
                payoutForm.mode,
                payoutForm.date,
                payoutForm.notes
            );
            setShowActionModal(null);
            setPayoutForm({ amount: '', mode: 'Cash', date: new Date().toISOString().split('T')[0], notes: '' });
            loadData();
            loadHistory();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredKarigars = karigars.filter(k =>
        k.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-indigo-600" />
                        Artisan Portal
                    </h2>
                    <p className="text-xs text-gray-500 font-medium tracking-tight">Manage artisans, metal balances, and labor payments</p>
                </div>
                {activeTab === 'MASTER' && (
                    <button
                        onClick={() => { setEditingId(null); setRegisterForm({ name: '', work_type: 'General', rate_type: 'Per KG', default_rate: 0, status: 'ACTIVE', contact_number: '', specialization: '', address: '' }); setShowRegisterModal(true); }}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all text-sm font-semibold shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Artisan
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100/50 rounded-xl w-fit">
                {(['MASTER', 'SETTLEMENT'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {tab === 'MASTER' ? 'Artisan Master' : 'Settlement Audit'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-24 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-4">Syncing Portal Data...</p>
                </div>
            ) : activeTab === 'MASTER' ? (
                /* MASTER TAB CONTENT */
                <div className="space-y-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search artisans..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredKarigars.map(k => (
                            <div key={k.id} className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-sm transition-all group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-bold text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                                            {k.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 leading-none">{k.name}</h3>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1 block">{k.work_type}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingId(k.id); setRegisterForm({ ...k, contact_number: k.contact_number || '', specialization: k.specialization || '', address: k.address || '' } as any); setShowRegisterModal(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                                        <button onClick={async () => { if (confirm('Delete?')) { await deleteKarigar(k.id); loadData(); } }} className="p-1.5 text-gray-400 hover:text-rose-500"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-4 border-t border-gray-50">
                                    <div className="text-gray-400 font-semibold px-2 py-0.5 bg-gray-50 rounded italic text-[10px]">{k.status}</div>
                                    <button
                                        onClick={() => { setSelectedKarigarId(k.id); setActiveTab('SETTLEMENT'); }}
                                        className="text-indigo-600 font-bold hover:underline flex items-center gap-1 text-[10px]"
                                    >
                                        Audit <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* SETTLEMENT TAB CONTENT */
                <div className="space-y-6">
                    {/* Selector */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 max-w-lg">
                        <User className="w-5 h-5 text-gray-400" />
                        <select
                            value={selectedKarigarId || ''}
                            onChange={(e) => setSelectedKarigarId(e.target.value)}
                            className="bg-transparent text-sm font-bold text-gray-900 outline-none flex-1 appearance-none cursor-pointer"
                        >
                            <option value="">Select Artisan to Audit...</option>
                            {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                        </select>
                    </div>

                    {selectedKarigarId ? (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Left Column: Stats & Actions */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-6">
                                    <div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                            <Scale className="w-3 h-3 text-indigo-400" /> Metal Balance
                                        </div>
                                        <div className="text-2xl font-black text-gray-900">{balances[selectedKarigarId]?.metal || 0} g</div>
                                        <p className="text-[10px] text-gray-400 mt-1 font-medium italic">Net weight currently with artisan</p>
                                    </div>
                                    <div className="pt-6 border-t border-gray-50">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                            <Wallet className="w-3 h-3 text-emerald-400" /> Cash Ledger
                                        </div>
                                        <div className={`text-2xl font-black ${(balances[selectedKarigarId]?.cash || 0) > 0 ? 'text-gray-900' : 'text-emerald-600'}`}>
                                            ₹{formatIndianRupees(Math.abs(balances[selectedKarigarId]?.cash || 0))}
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1 font-medium italic">{(balances[selectedKarigarId]?.cash || 0) >= 0 ? 'Due for labor charges' : 'Advance credit'}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button onClick={() => setShowActionModal('ISSUE')} className="w-full flex items-center justify-between p-4 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                            Issue Metal
                                        </div>
                                    </button>
                                    <button onClick={() => setShowActionModal('RECEIVE')} className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 text-gray-900 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <ArrowDownLeft className="w-4 h-4 group-hover:-translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
                                            Receive Production
                                        </div>
                                    </button>
                                    <button onClick={() => setShowActionModal('PAYOUT')} className="w-full flex items-center justify-between p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all">
                                        <div className="flex items-center gap-3">
                                            <Coins className="w-4 h-4" />
                                            Record Payout
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Right Column: History */}
                            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 flex flex-col min-h-[500px]">
                                <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30 rounded-t-2xl">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <History className="w-3.5 h-3.5" /> Recent Ledger
                                    </h3>
                                    {historyLoading && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                                </div>
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full text-[10px] text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50">
                                                <th className="px-6 py-3 font-bold text-gray-400 uppercase tracking-tighter">Date</th>
                                                <th className="px-6 py-3 font-bold text-gray-400 uppercase tracking-tighter">Activity</th>
                                                <th className="px-6 py-3 font-bold text-gray-400 uppercase tracking-tighter text-right">Labor (₹)</th>
                                                <th className="px-6 py-3 font-bold text-gray-400 uppercase tracking-tighter text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 font-medium">
                                            {workHistory.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-20 text-center text-gray-300 italic">No entry found for this artisan.</td>
                                                </tr>
                                            ) : (
                                                workHistory.map(h => (
                                                    <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(h.work_date).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-gray-900">{h.description}</div>
                                                            <div className="text-[9px] text-gray-400 mt-0.5">Qty: {h.quantity} • Ref: {h.id.slice(0, 8)}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-bold text-gray-900">₹{formatIndianRupees(h.amount)}</td>
                                                        <td className="px-6 py-4 text-right italic font-medium">
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${h.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                {h.payment_status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-32 text-center bg-gray-50/30 rounded-[3rem] border border-dashed border-gray-200">
                            <AlertCircle size={40} className="mx-auto text-gray-200 mb-4" />
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Audit Terminal Ready</h3>
                            <p className="text-xs text-gray-400 mt-1">Select an artisan from the dropdown to start material and cash balancing.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900 tracking-tight">{editingId ? 'Edit Profile' : 'Register Artisan'}</h2>
                            <button onClick={() => setShowRegisterModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleRegisterSubmit} className="p-6 grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                                <input required type="text" value={registerForm.name} onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-medium" placeholder="Ex: Ramesh Kumar" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Work Type</label>
                                <select value={registerForm.work_type} onChange={e => setRegisterForm({ ...registerForm, work_type: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-medium">
                                    <option value="General">General Jewelry</option>
                                    <option value="Cutting">Cutting</option>
                                    <option value="Choti">Choti</option>
                                    <option value="Half Belt">Half Belt</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Base Rate (₹)</label>
                                <input required type="number" value={registerForm.default_rate} onChange={e => setRegisterForm({ ...registerForm, default_rate: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold" />
                            </div>
                            <div className="col-span-2 pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowRegisterModal(false)} className="flex-1 py-3 text-gray-400 font-bold uppercase tracking-widest text-[10px] hover:text-gray-600">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-indigo-600 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-indigo-700 shadow-sm flex justify-center items-center gap-2">
                                    {submitting && <Loader2 size={12} className="animate-spin" />} {editingId ? 'Save Profile' : 'Confirm Registration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showActionModal === 'ISSUE' && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border border-gray-100">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-indigo-50/30">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 italic">
                                <ArrowUpRight className="w-4 h-4 text-indigo-600" /> Issue Raw Metal
                            </h2>
                            <button onClick={() => setShowActionModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleIssueSubmit} className="p-6 space-y-4">
                            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Weight to Issue (grams)</label>
                                <input autoFocus required type="number" step="0.001" value={issueForm.weight} onChange={e => setIssueForm({ ...issueForm, weight: e.target.value })} className="w-full bg-transparent border-none p-0 text-2xl font-black text-indigo-700 outline-none focus:ring-0 placeholder:text-indigo-200" placeholder="0.000" />
                            </div>
                            <input required type="date" value={issueForm.date} onChange={e => setIssueForm({ ...issueForm, date: e.target.value })} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 outline-none" />
                            <input type="text" placeholder="Add memo (Ex: Silver Choti Order)" value={issueForm.note} onChange={e => setIssueForm({ ...issueForm, note: e.target.value })} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none" />
                            <button type="submit" disabled={submitting} className="w-full py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-indigo-100 flex justify-center items-center gap-2 mt-4 transition-all active:scale-95">
                                {submitting && <Loader2 size={16} className="animate-spin" />} Authorize Transfer
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showActionModal === 'RECEIVE' && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in my-8">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 italic">
                                <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> Receive Production
                            </h2>
                            <button onClick={() => setShowActionModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleReceiveSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Select Catalog Product</label>
                                <select required value={receiveForm.productId} onChange={e => {
                                    const p = products.find(x => x.id === e.target.value);
                                    setReceiveForm({ ...receiveForm, productId: e.target.value, weight: p?.default_weight?.toString() || '', laborRate: p?.labour_cost?.toString() || '', wastage: ((p?.default_weight || 0) * (p?.wastage_percent || 0) / 100).toString() });
                                }} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none appearance-none">
                                    <option value="">Select Product...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Quantity</label>
                                    <input required type="number" value={receiveForm.quantity} onChange={e => setReceiveForm({ ...receiveForm, quantity: e.target.value })} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none" placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Total Weight (g)</label>
                                    <input required type="number" step="0.001" value={receiveForm.weight} onChange={e => setReceiveForm({ ...receiveForm, weight: e.target.value })} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none" placeholder="0.000" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Wastage Allowed (g)</label>
                                    <input required type="number" step="0.001" value={receiveForm.wastage} onChange={e => setReceiveForm({ ...receiveForm, wastage: e.target.value })} className="w-full p-3 bg-emerald-50 text-emerald-700 border-none rounded-xl text-sm font-bold outline-none" placeholder="0.000" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Labor Rate (₹)</label>
                                    <input required type="number" value={receiveForm.laborRate} onChange={e => setReceiveForm({ ...receiveForm, laborRate: e.target.value })} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none" placeholder="0.00" />
                                </div>
                            </div>
                            <div className="bg-indigo-50/30 p-4 rounded-xl space-y-2 border border-indigo-100/30">
                                <div className="flex justify-between text-[10px] font-bold uppercase text-indigo-400">
                                    <span>Calculated Labor Credit:</span>
                                    <span>₹{formatIndianRupees(Number(receiveForm.quantity || 0) * Number(receiveForm.laborRate || 0))}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold uppercase text-red-400">
                                    <span>Total Metal Deduction:</span>
                                    <span>{(Number(receiveForm.weight || 0) + Number(receiveForm.wastage || 0)).toFixed(3)} g</span>
                                </div>
                            </div>
                            <button type="submit" disabled={submitting} className="w-full py-4 bg-gray-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl flex justify-center items-center gap-2 shadow-xl shadow-gray-200 mt-4 active:scale-95">
                                {submitting && <Loader2 size={16} className="animate-spin" />} Finalize Receipt
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showActionModal === 'PAYOUT' && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-sm overflow-hidden animate-scale-in border border-gray-100">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-emerald-50/50">
                            <h2 className="text-base font-bold text-emerald-900 flex items-center gap-2 italic">
                                <CheckCircle2 className="w-4 h-4" /> Final Payout
                            </h2>
                            <button onClick={() => setShowActionModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <form onSubmit={handlePayoutSubmit} className="p-6 space-y-4">
                            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                                <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Cash Amount (₹)</label>
                                <input autoFocus required type="number" value={payoutForm.amount} onChange={e => setPayoutForm({ ...payoutForm, amount: e.target.value })} className="w-full bg-transparent border-none p-0 text-3xl font-black text-emerald-700 outline-none focus:ring-0 placeholder:text-emerald-200" placeholder="0.00" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input required type="date" value={payoutForm.date} onChange={e => setPayoutForm({ ...payoutForm, date: e.target.value })} className="w-full p-3 bg-gray-50 border-none rounded-xl text-[10px] font-bold text-gray-900 outline-none" />
                                <select value={payoutForm.mode} onChange={e => setPayoutForm({ ...payoutForm, mode: e.target.value })} className="w-full p-3 bg-gray-50 border-none rounded-xl text-[10px] font-bold text-gray-900 outline-none px-2">
                                    <option>Cash</option>
                                    <option>Bank</option>
                                    <option>UPI</option>
                                </select>
                            </div>
                            <button type="submit" disabled={submitting} className="w-full py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-emerald-100 flex justify-center items-center gap-2 mt-4 active:scale-95">
                                {submitting && <Loader2 size={16} className="animate-spin" />} Release Funds
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
