import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Database, Search, History, Loader2, X, Download, Filter, User, ArrowRightLeft, AlertTriangle, Save, Pencil } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/tabs';
import {
    getClientMaterialTransactions,
    addClientMaterialTransaction,
    updateClientMaterialTransaction,
    getClientMaterialBalances,
    deleteClientMaterialTransaction
} from '../../services/clientMaterialService';
import { getBaseMaterialTypes, createBaseMaterialType, BaseMaterialType } from '../../services/baseMaterialService';
import { getCustomers, getCustomerList, Customer } from '../../services/contactService';
import { ClientMaterialTransaction, ClientMaterialBalance, ClientMaterialType, ClientTransactionType } from '../../types';
import { format } from 'date-fns';


// Helper to generate simple random Job ID
const generateJobId = () => `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export function ClientMaterialLedger() {
    const [transactions, setTransactions] = useState<ClientMaterialTransaction[]>([]);
    const [balances, setBalances] = useState<ClientMaterialBalance[]>([]);
    const [baseMaterialTypes, setBaseMaterialTypes] = useState<BaseMaterialType[]>([]);
    const [customers, setCustomers] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'STATEMENT' | 'HISTORY'>('STATEMENT');
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        client_name: '',
        client_id: '',
        material_type: 'White Metal' as ClientMaterialType,
        transaction_type: 'RECEIPT' as ClientTransactionType,
        quantity: '',
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        manual_remarks: '',
        base_type: '',
        specification: '',
        reason: '',
        job_work_order_id: generateJobId(),
        manual_client_entry: false
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [txs, bals, types, custs] = await Promise.all([
                getClientMaterialTransactions(),
                getClientMaterialBalances(),
                getBaseMaterialTypes(),
                getCustomerList()
            ]);
            setTransactions(txs);
            setBalances(bals);
            setBaseMaterialTypes(types.filter(t => t.status === 'ACTIVE'));
            setCustomers(custs);
        } catch (err) {
            console.error('Failed to load client material data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Auto-Add Base Material Type if it's new
            if (form.base_type) {
                const exists = baseMaterialTypes.some(t => t.name.toLowerCase() === form.base_type.toLowerCase());
                if (!exists) {
                    try {
                        const newType = await createBaseMaterialType(form.base_type);
                        // Optimistically update list so it's available immediately
                        setBaseMaterialTypes(prev => [...prev, newType]);
                    } catch (err) {
                        console.error("Failed to auto-create base type:", err);
                        // Convert to toast error in production
                    }
                }
            }

            const finalRemarksParts = [];
            if (form.base_type) finalRemarksParts.push(form.base_type);
            if (form.specification) finalRemarksParts.push(form.specification);
            if (form.manual_remarks) finalRemarksParts.push(form.manual_remarks);

            const finalRemarks = finalRemarksParts.join(' - ') || (form.transaction_type === 'LOSS' ? form.reason : '');

            const payload = {
                client_name: form.client_name,
                client_id: form.client_id || undefined,
                material_type: form.material_type,
                transaction_type: form.transaction_type,
                quantity: Number(form.quantity),
                transaction_date: form.transaction_date,
                remarks: finalRemarks,
                reason: form.transaction_type === 'LOSS' ? form.reason : undefined,
                job_work_order_id: form.job_work_order_id || undefined
            };

            if (editingId) {
                await updateClientMaterialTransaction(editingId, payload);
            } else {
                await addClientMaterialTransaction(payload);
            }

            setShowModal(false);
            resetForm();
            loadData();
        } catch (err: any) {
            alert('Error adding entry: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setForm({
            client_name: '',
            client_id: '',
            material_type: 'White Metal',
            transaction_type: 'RECEIPT',
            quantity: '',
            transaction_date: format(new Date(), 'yyyy-MM-dd'),
            manual_remarks: '',
            base_type: '',
            specification: '',
            reason: '',
            job_work_order_id: generateJobId(),
            manual_client_entry: false
        });
        setEditingId(null);
    };

    // NEW: Handle Quantity Blur with stricter parsing and lower threshold
    const handleQuantityBlur = () => {
        if (!form.quantity) return;

        // 1. Sanitize input: replace comma with dot, remove non-numeric chars (except dot)
        let cleanStr = form.quantity.toString().replace(/,/g, '.');
        // Remove multiple dots if any (keep first)
        const parts = cleanStr.split('.');
        if (parts.length > 2) {
            cleanStr = parts[0] + '.' + parts.slice(1).join('');
        }

        const val = parseFloat(cleanStr);
        if (isNaN(val)) return;

        let finalVal = val;

        // 2. Logic Update: Lower threshold to 50.
        // Reason: 850 (grams) was mistaken for 850 KG. 
        // Realistically, >50 KG transaction is rare. >50 Grams is common.
        // So: If val >= 50, we assume Grams and convert.
        // Exception: Unless checks prove otherwise, this catches the user's "850" error.
        if (val >= 50) {
            finalVal = val / 1000;
        }

        // 3. Update state with formatted value
        setForm(prev => ({ ...prev, quantity: finalVal.toFixed(3) }));
    };

    const handleEdit = (transaction: ClientMaterialTransaction) => {
        // Parse remarks back into components if possible (This is a simplified approach)
        // Ideally we store components separately, but for now we just put full remarks into manual_remarks
        setForm({
            client_name: transaction.client_name,
            client_id: transaction.client_id || '',
            material_type: transaction.material_type,
            transaction_type: transaction.transaction_type,
            quantity: transaction.quantity.toString(),
            transaction_date: format(new Date(transaction.transaction_date), 'yyyy-MM-dd'),
            manual_remarks: transaction.remarks || '', // Fill full remarks here for editing
            base_type: '', // Cannot easily extract
            specification: '', // Cannot easily extract
            reason: transaction.reason || '',
            job_work_order_id: transaction.job_work_order_id || generateJobId(),
            manual_client_entry: false,
        });
        setEditingId(transaction.id);
        setShowModal(true);
    };

    const totals = useMemo(() => {
        return balances.reduce((acc, b) => ({
            received: acc.received + b.received,
            consumed: acc.consumed + b.consumed,
            loss: acc.loss + b.loss,
            balance: acc.balance + b.balance
        }), { received: 0, consumed: 0, loss: 0, balance: 0 });
    }, [balances]);

    const filteredBalances = useMemo(() =>
        balances.filter(b => b.client_name.toLowerCase().includes(searchQuery.toLowerCase())),
        [balances, searchQuery]);

    const filteredTransactions = useMemo(() =>
        transactions.filter(t =>
            t.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.remarks?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [transactions, searchQuery]);

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            <PageHeader
                title="Client Raw Material Ledger"
                subtitle="Track daily client material receipts, consumption and loss"
                actions={
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium"
                    >
                        <Plus className="w-5 h-5" /> New Ledger Entry
                    </button>
                }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Total Received"
                    value={`${totals.received.toFixed(3)} KG`}
                    icon={<Database className="w-5 h-5" />}
                    color="blue"
                />
                <SummaryCard
                    title="Total Consumed"
                    value={`${totals.consumed.toFixed(3)} KG`}
                    icon={<ArrowRightLeft className="w-5 h-5" />}
                    color="emerald"
                />
                <SummaryCard
                    title="Total Loss"
                    value={`${totals.loss.toFixed(3)} KG`}
                    icon={<AlertTriangle className="w-5 h-5" />}
                    color="rose"
                />
                <SummaryCard
                    title="Net Balance"
                    value={`${totals.balance.toFixed(3)} KG`}
                    icon={<User className="w-5 h-5" />}
                    color="indigo"
                    subTitle="Currently with us"
                />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <Tabs
                    activeTab={activeTab}
                    onChange={setActiveTab}
                    tabs={[
                        { id: 'STATEMENT', label: 'Material Statement', icon: <User size={18} /> },
                        { id: 'HISTORY', label: 'History Logs', icon: <History size={18} /> }
                    ]}
                />

                <div className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h3 className="text-lg font-bold text-gray-800">
                            {activeTab === 'STATEMENT' ? 'Client-wise Material Balance' : 'Complete Transaction History'}
                        </h3>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search client name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center flex flex-col items-center">
                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                            <div className="font-bold text-gray-800">Loading Ledger Data...</div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {activeTab === 'STATEMENT' ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4">Client Name</th>
                                            <th className="px-6 py-4 text-right">Received</th>
                                            <th className="px-6 py-4 text-right">Consumed</th>
                                            <th className="px-6 py-4 text-right">Loss</th>
                                            <th className="px-6 py-4 text-right">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredBalances.map((b, i) => (
                                            <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                                                <td className="px-6 py-5">
                                                    <div className="font-bold text-gray-900">{b.client_name}</div>
                                                </td>
                                                <td className="px-6 py-5 text-right font-medium text-blue-600">{b.received.toFixed(3)} KG</td>
                                                <td className="px-6 py-5 text-right font-medium text-emerald-600">{b.consumed.toFixed(3)} KG</td>
                                                <td className="px-6 py-5 text-right font-medium text-rose-600">{b.loss.toFixed(3)} KG</td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className={`px-3 py-1 rounded-full font-bold ${b.balance > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {b.balance.toFixed(3)} KG
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredBalances.length === 0 && (
                                            <tr><td colSpan={5} className="py-20 text-center text-gray-400 italic">No records found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Client</th>
                                            <th className="px-6 py-4">Type</th>
                                            <th className="px-6 py-4">Material</th>
                                            <th className="px-6 py-4 text-right">Quantity</th>
                                            <th className="px-6 py-4">Remarks</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredTransactions.map((t) => (
                                            <tr key={t.id} className="hover:bg-gray-50/30 transition-colors">
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="font-semibold text-gray-900">{format(new Date(t.transaction_date), 'dd MMM yyyy')}</div>
                                                </td>
                                                <td className="px-6 py-5 font-bold text-gray-800">{t.client_name}</td>
                                                <td className="px-6 py-5">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.transaction_type === 'RECEIPT' ? 'bg-blue-50 text-blue-700' :
                                                        t.transaction_type === 'CONSUMPTION' ? 'bg-emerald-50 text-emerald-700' :
                                                            'bg-rose-50 text-rose-700'
                                                        }`}>
                                                        {t.transaction_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-gray-600 font-medium">{t.material_type}</td>
                                                <td className="px-6 py-5 text-right font-bold text-gray-900">{t.quantity.toFixed(3)} KG</td>
                                                <td className="px-6 py-5">
                                                    <div className="text-xs text-gray-500 max-w-xs">{t.remarks || t.reason || '—'}</div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button
                                                        onClick={() => handleEdit(t)}
                                                        className="text-gray-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition"
                                                        title="Edit Entry"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredTransactions.length === 0 && (
                                            <tr><td colSpan={7} className="py-20 text-center text-gray-400 italic">No transactions found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Ledger Entry' : 'New Ledger Entry'}</h2>
                                <p className="text-sm text-gray-500 font-medium">
                                    {editingId ? 'Update transaction details' : 'Add daily receipt, consumption or loss'}
                                </p>
                            </div>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* 1. Client Selection (Consolidated) */}
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                <label className="block text-[10px] font-bold text-indigo-700 uppercase tracking-widest mb-2">Client / Party Selection</label>
                                <input
                                    list="customer-list"
                                    type="text"
                                    placeholder="Search or Type Client Name..."
                                    className="w-full h-10 px-3 bg-white border border-indigo-200 rounded-md font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={form.client_name}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const matched = customers.find(c => c.name.toLowerCase() === val.toLowerCase());
                                        setForm({
                                            ...form,
                                            client_name: val,
                                            client_id: matched ? matched.id : ''
                                        });
                                    }}
                                />
                                <datalist id="customer-list">
                                    {customers?.length > 0 ? customers.map(c => (
                                        <option key={c.id} value={c.name} />
                                    )) : null}
                                </datalist>
                                <p className="text-[10px] text-indigo-400 mt-1 font-medium">
                                    * Type to search from {customers?.length || 0} customers, or enter a new name manually.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* 2. Core Transaction Details */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Action</label>
                                    <select
                                        value={form.transaction_type}
                                        onChange={(e) => setForm({ ...form, transaction_type: e.target.value as any })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value="RECEIPT">Material Receipt</option>
                                        <option value="CONSUMPTION">Consumption</option>
                                        <option value="LOSS">Work Loss</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Material</label>
                                    <select
                                        value={form.material_type}
                                        onChange={(e) => setForm({ ...form, material_type: e.target.value as any })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value="White Metal">White Metal</option>
                                        <option value="Alloy">Alloy</option>
                                        <option value="Ghattak">Ghattak</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex justify-between">
                                        <span>Quantity (KG)</span>
                                        <span className="text-indigo-600 text-[9px]">Auto-Convert</span>
                                    </label>
                                    <input
                                        type="text" inputMode="decimal" required
                                        value={form.quantity}
                                        onChange={(e) => {
                                            // Allow only numbers, dots, and commas during typing
                                            const val = e.target.value;
                                            if (/^[0-9.,]*$/.test(val)) {
                                                setForm({ ...form, quantity: val });
                                            }
                                        }}
                                        onBlur={handleQuantityBlur}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500"
                                        placeholder="0.000"
                                    />
                                    <p className="text-[9px] text-gray-400 mt-1 font-medium">Auto-Logic: Values &ge; 50 treated as Grams (e.g. 850 &rarr; 0.850 KG)</p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Date</label>
                                    <input
                                        type="date" required
                                        value={form.transaction_date}
                                        onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                {/* 3. Hybrid Remark Fields */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Base Type</label>
                                    <input
                                        list="base-types-list"
                                        type="text"
                                        placeholder="Select or Type..."
                                        className="w-full h-10 px-3 bg-white border border-gray-200 rounded-md font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={form.base_type}
                                        onChange={(e) => setForm({ ...form, base_type: e.target.value })}
                                    />
                                    <datalist id="base-types-list">
                                        {baseMaterialTypes
                                            .filter(type => {
                                                // Filter logic:
                                                // Receipt -> Receipt + Both
                                                // Consumption -> Consumption + Both
                                                // Loss -> Receipt + Both (Assuming loss is on raw material usually)
                                                if (form.transaction_type === 'RECEIPT') return type.usage_type === 'RECEIPT' || type.usage_type === 'BOTH' || !type.usage_type;
                                                if (form.transaction_type === 'CONSUMPTION') return type.usage_type === 'CONSUMPTION' || type.usage_type === 'BOTH';
                                                return type.usage_type === 'RECEIPT' || type.usage_type === 'BOTH' || !type.usage_type;
                                            })
                                            .map(type => (
                                                <option key={type.id} value={type.name} />
                                            ))}
                                    </datalist>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Spec (Gauge/Size)</label>
                                    <input
                                        type="text"
                                        value={form.specification}
                                        onChange={(e) => setForm({ ...form, specification: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500"
                                        placeholder="e.g. 28 Gauge"
                                    />
                                </div>

                                {/* 4. Conditional/Additional Fields */}
                                {
                                    form.transaction_type === 'LOSS' && (
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Reason for Loss</label>
                                            <input
                                                type="text" required
                                                value={form.reason}
                                                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500"
                                                placeholder="e.g. Melting loss"
                                            />
                                        </div>
                                    )
                                }

                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Manual Remarks (Optional)</label>
                                    <textarea
                                        value={form.manual_remarks}
                                        onChange={(e) => setForm({ ...form, manual_remarks: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        rows={2}
                                        placeholder="Add any extra notes here..."
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Reference / Job Order #</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.job_work_order_id}
                                            onChange={(e) => setForm({ ...form, job_work_order_id: e.target.value })}
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 pr-10"
                                            placeholder="Order UUID or number"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, job_work_order_id: generateJobId() })}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded transition"
                                            title="Generate New ID"
                                        >
                                            NEW
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="flex-1 py-3 text-gray-500 font-bold bg-gray-50 hover:bg-gray-100 rounded-xl transition text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-[2] py-3 text-white font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md shadow-indigo-200"
                                >
                                    {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={16} />}
                                    {editingId ? 'Update Entry' : 'Save Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const SummaryCard = ({ title, value, subTitle, icon, color }: any) => {
    const colorMap: any = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' }
    };
    const c = colorMap[color] || colorMap.indigo;

    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm group hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-lg ${c.bg} ${c.text}`}>
                    {icon}
                </div>
            </div>
            <div>
                <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</div>
                <div className="text-2xl font-bold text-gray-900 mb-0.5 leading-none">{value}</div>
                {subTitle && (
                    <div className="text-[11px] text-gray-500 font-medium">{subTitle}</div>
                )}
            </div>
        </div>
    );
};
