import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Database, Search, History, Loader2, X, Download, Filter, User, ArrowRightLeft, AlertTriangle, Save, Pencil, Calendar } from 'lucide-react';
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
import { format, parse, isValid } from 'date-fns';


// Helper to generate simple random Job ID
const generateJobId = () => `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

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

export function ClientMaterialLedger() {
    const [transactions, setTransactions] = useState<ClientMaterialTransaction[]>([]);
    const [balances, setBalances] = useState<ClientMaterialBalance[]>([]);
    const [baseMaterialTypes, setBaseMaterialTypes] = useState<BaseMaterialType[]>([]);
    const [customers, setCustomers] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'STATEMENT' | 'HISTORY'>('STATEMENT');
    const [historySubFilter, setHistorySubFilter] = useState<'ALL' | 'RECEIPT' | 'CONSUMPTION' | 'LOSS'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Filter states for Customer Search
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerResults, setCustomerResults] = useState<{ id: string, name: string, phone: string }[]>([]);
    const [showCustomerResults, setShowCustomerResults] = useState(false);

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
        manual_client_entry: false,
        material_type_id: ''
    });

    const [baseSearch, setBaseSearch] = useState('');
    const [baseResults, setBaseResults] = useState<BaseMaterialType[]>([]);
    const [showBaseResults, setShowBaseResults] = useState(false);

    // Hybrid Date States
    const [dateDisplay, setDateDisplay] = useState(format(new Date(), 'dd-MM-yyyy'));
    const datePickerRef = useRef<HTMLInputElement>(null);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        // Load each independently so one failure doesn't block the whole page
        const safeFetch = async (fn: () => Promise<any>, setter: (data: any) => void, name: string) => {
            try {
                const data = await fn();
                setter(data);
            } catch (err) {
                console.warn(`Failed to load ${name}:`, err);
            }
        };

        const promises = [
            safeFetch(getClientMaterialTransactions, setTransactions, 'Transactions'),
            safeFetch(getClientMaterialBalances, setBalances, 'Balances'),
            safeFetch(getBaseMaterialTypes, setBaseMaterialTypes, 'Base Materials'),
            safeFetch(getCustomerList, setCustomers, 'Customers')
        ];

        await Promise.all(promises);
        if (!silent) setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Close autocomplete on click outside
    useEffect(() => {
        const handleClickOutside = () => {
            setShowCustomerResults(false);
            setShowBaseResults(false);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Capture data for background processing
        const formData = { ...form };
        const editing = editingId;

        try {
            // 1. Prepare payload (Sync logic)
            const finalRemarksParts = [];
            if (formData.base_type) finalRemarksParts.push(formData.base_type);
            if (formData.specification) finalRemarksParts.push(formData.specification);
            if (formData.manual_remarks) finalRemarksParts.push(formData.manual_remarks);
            const finalRemarks = finalRemarksParts.join(' - ') || (formData.transaction_type === 'LOSS' ? formData.reason : '');

            const payload = {
                client_name: formData.client_name,
                client_id: formData.client_id || undefined,
                material_type: formData.material_type,
                transaction_type: formData.transaction_type,
                quantity: Number(formData.quantity),
                transaction_date: formData.transaction_date,
                remarks: finalRemarks,
                reason: formData.transaction_type === 'LOSS' ? formData.reason : undefined,
                job_work_order_id: formData.job_work_order_id || undefined
            };

            // 2. CLOSE MODAL IMMEDIATELY - "Na ke barabar" loading feel
            setShowModal(false);
            resetForm();

            // 3. Perform network operations in background
            const backgroundOps = async () => {
                try {
                    // Auto-Add Base Material Type if it's new
                    if (formData.base_type) {
                        const exists = baseMaterialTypes.some(t => t.name.toLowerCase() === formData.base_type.toLowerCase());
                        if (!exists) {
                            // Tag with the current transaction type for better future suggestions
                            const usageType = formData.transaction_type === 'RECEIPT' ? 'RECEIPT' : 'CONSUMPTION';
                            await createBaseMaterialType(formData.base_type, usageType);
                        }
                    }

                    if (editing) {
                        await updateClientMaterialTransaction(editing, payload);
                    } else {
                        await addClientMaterialTransaction(payload);
                    }

                    // 4. Silent refresh in background
                    loadData(true);
                } catch (err: any) {
                    console.error('Background save failed:', err);
                    alert('Error saving: ' + err.message);
                }
            };

            backgroundOps();
        } catch (err: any) {
            console.error('Background save failed:', err);
            // In a real app, we might reopen the modal or show a retry toast
            alert('Error saving: ' + err.message);
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
            manual_client_entry: false,
            material_type_id: ''
        });
        setEditingId(null);
        setCustomerSearch('');
        setShowCustomerResults(false);
        setBaseSearch('');
        setShowBaseResults(false);
        setDateDisplay(format(new Date(), 'dd-MM-yyyy'));
    };

    const handleCustomerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setCustomerSearch(query);
        setForm(prev => ({ ...prev, client_name: query, client_id: '' })); // Reset ID if typing manually

        if (query.length > 0) {
            const filtered = (customers as any[]).filter(c =>
                c.name.toLowerCase().includes(query.toLowerCase()) ||
                (c.phone && c.phone.includes(query))
            );
            setCustomerResults(filtered);
            setShowCustomerResults(true);
        } else {
            setCustomerResults([]);
            setShowCustomerResults(false);
        }
    };

    const handleBaseSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setBaseSearch(query);
        setForm(prev => ({ ...prev, base_type: query, material_type_id: '' }));

        if (query.length > 0) {
            const currentType = form.transaction_type;
            const filtered = baseMaterialTypes.filter(m => {
                const matchesSearch = m.name.toLowerCase().includes(query.toLowerCase());
                // Filter by usage_type: Show if BOTH or matching the current transaction type
                const matchesType = m.usage_type === 'BOTH' ||
                    (currentType === 'RECEIPT' && m.usage_type === 'RECEIPT') ||
                    (currentType !== 'RECEIPT' && m.usage_type === 'CONSUMPTION');

                return matchesSearch && matchesType;
            });
            setBaseResults(filtered);
            setShowBaseResults(true);
        } else {
            setBaseResults([]);
            setShowBaseResults(false);
        }
    };

    // Hybrid Date Handlers
    const handleDateDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDateDisplay(val);

        // Auto-parse if DD-MM-YYYY format reached
        if (val.length === 10) {
            // Support both - and / separators
            const cleanVal = val.replace(/\//g, '-');
            const parsedDate = parse(cleanVal, 'dd-MM-yyyy', new Date());
            if (isValid(parsedDate)) {
                setForm(prev => ({ ...prev, transaction_date: format(parsedDate, 'yyyy-MM-dd') }));
            }
        }
    };

    const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value; // YYYY-MM-DD
        if (val) {
            setForm(prev => ({ ...prev, transaction_date: val }));
            setDateDisplay(format(new Date(val), 'dd-MM-yyyy'));
        }
    };

    // Simplified Quantity Blur: Only cleanup and format, no auto-guessing
    const handleQuantityBlur = () => {
        if (!form.quantity) return;

        let cleanStr = form.quantity.toString().replace(/,/g, '.');
        const parts = cleanStr.split('.');
        if (parts.length > 2) {
            cleanStr = parts[0] + '.' + parts.slice(parts.length - 1).join('');
        }

        const val = parseFloat(cleanStr);
        if (isNaN(val)) return;

        setForm(prev => ({ ...prev, quantity: val.toFixed(3) }));
    };

    // Helper for manual gram conversion
    const convertToKg = () => {
        const val = parseFloat(form.quantity);
        if (isNaN(val)) return;
        setForm(prev => ({ ...prev, quantity: (val / 1000).toFixed(3) }));
    };

    const handleEdit = (transaction: ClientMaterialTransaction) => {
        // Parse remarks back into components: "Base - Spec - Manual"
        const parts = (transaction.remarks || '').split(' - ');
        const baseType = parts[0] || '';
        const spec = parts[1] || '';
        const manual = parts.slice(2).join(' - ') || '';

        // Try to find material_type_id from baseMaterialTypes
        const materialMatch = baseMaterialTypes.find(m => m.name.toLowerCase() === baseType.toLowerCase());

        setForm({
            client_name: transaction.client_name,
            client_id: transaction.client_id || '',
            material_type: transaction.material_type,
            transaction_type: transaction.transaction_type,
            quantity: transaction.quantity.toString(),
            transaction_date: format(new Date(transaction.transaction_date), 'yyyy-MM-dd'),
            manual_remarks: manual,
            base_type: baseType,
            specification: spec,
            reason: transaction.reason || '',
            job_work_order_id: transaction.job_work_order_id || generateJobId(),
            manual_client_entry: false,
            material_type_id: materialMatch?.id || ''
        });
        setCustomerSearch(transaction.client_name);
        setBaseSearch(baseType);
        setDateDisplay(format(new Date(transaction.transaction_date), 'dd-MM-yyyy'));
        setEditingId(transaction.id);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this entry?")) return;
        try {
            await deleteClientMaterialTransaction(id);
            loadData();
        } catch (err: any) {
            alert("Delete failed: " + err.message);
        }
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
        transactions.filter(t => {
            const matchesSearch = t.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.remarks?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = historySubFilter === 'ALL' || t.transaction_type === historySubFilter;
            return matchesSearch && matchesFilter;
        }),
        [transactions, searchQuery, historySubFilter]);

    const historyTotals = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            if (t.transaction_type === 'RECEIPT') acc.received += t.quantity;
            if (t.transaction_type === 'CONSUMPTION') acc.consumed += t.quantity;
            if (t.transaction_type === 'LOSS') acc.loss += t.quantity;
            return acc;
        }, { received: 0, consumed: 0, loss: 0 });
    }, [filteredTransactions]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const title = `Client Material Ledger - ${activeTab === 'STATEMENT' ? 'Balance Statement' : 'History Log'}`;
        const filterText = searchQuery ? ` | Search: ${searchQuery}` : '';
        const subFilterText = activeTab === 'HISTORY' && historySubFilter !== 'ALL' ? ` | Filter: ${historySubFilter}` : '';

        const html = `
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        h1 { font-size: 24px; margin-bottom: 5px; }
                        h2 { font-size: 16px; color: #666; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
                        th { bg-color: #f9f9f9; font-weight: bold; }
                        .text-right { text-align: right; }
                        .summary-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
                        .summary-box { border: 1px solid #eee; padding: 10px; border-radius: 8px; }
                        .summary-label { font-size: 10px; text-transform: uppercase; color: #888; margin-bottom: 5px; }
                        .summary-value { font-size: 16px; font-weight: bold; }
                        .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
                        .badge-receipt { background: #eff6ff; color: #1e40af; }
                        .badge-consumption { background: #ecfdf5; color: #065f46; }
                        .badge-loss { background: #fff1f2; color: #9f1239; }
                    </style>
                </head>
                <body>
                    <h1>${title}</h1>
                    <h2>Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}${filterText}${subFilterText}</h2>

                    ${activeTab === 'STATEMENT' ? `
                        <div class="summary-grid">
                            <div class="summary-box"><div class="summary-label">Total Received</div><div class="summary-value">${totals.received.toFixed(3)} KG</div></div>
                            <div class="summary-box"><div class="summary-label">Total Consumed</div><div class="summary-value">${totals.consumed.toFixed(3)} KG</div></div>
                            <div class="summary-box"><div class="summary-label">Total Loss</div><div class="summary-value">${totals.loss.toFixed(3)} KG</div></div>
                            <div class="summary-box"><div class="summary-label">Net Balance</div><div class="summary-value">${totals.balance.toFixed(3)} KG</div></div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Client Name</th>
                                    <th class="text-right">Received</th>
                                    <th class="text-right">Consumed</th>
                                    <th class="text-right">Loss</th>
                                    <th class="text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredBalances.map(b => `
                                    <tr>
                                        <td><strong>${b.client_name}</strong></td>
                                        <td class="text-right">${b.received.toFixed(3)} KG</td>
                                        <td class="text-right">${b.consumed.toFixed(3)} KG</td>
                                        <td class="text-right">${b.loss.toFixed(3)} KG</td>
                                        <td class="text-right"><strong>${b.balance.toFixed(3)} KG</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="summary-grid">
                            <div class="summary-box"><div class="summary-label">Filtered Received</div><div class="summary-value">${historyTotals.received.toFixed(3)} KG</div></div>
                            <div class="summary-box"><div class="summary-label">Filtered Consumed</div><div class="summary-value">${historyTotals.consumed.toFixed(3)} KG</div></div>
                            <div class="summary-box"><div class="summary-label">Filtered Loss</div><div class="summary-value">${historyTotals.loss.toFixed(3)} KG</div></div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Client</th>
                                    <th>Type</th>
                                    <th>Material</th>
                                    <th class="text-right">Quantity</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredTransactions.map(t => `
                                    <tr>
                                        <td>${format(new Date(t.transaction_date), 'dd MMM yyyy')}</td>
                                        <td><strong>${t.client_name}</strong></td>
                                        <td><span class="badge badge-${t.transaction_type.toLowerCase()}">${t.transaction_type}</span></td>
                                        <td>${t.material_type}</td>
                                        <td class="text-right"><strong>${t.quantity.toFixed(3)} KG</strong></td>
                                        <td>${t.remarks || t.reason || ''}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}

                    <script>
                        window.onload = () => { window.print(); window.close(); };
                    </script>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

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
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            {activeTab === 'HISTORY' && (
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    {(['ALL', 'RECEIPT', 'CONSUMPTION', 'LOSS'] as const).map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setHistorySubFilter(f)}
                                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${historySubFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            )}
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
                            <button
                                onClick={handlePrint}
                                title="Print this view"
                                className="flex items-center gap-2 bg-white text-gray-700 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium text-sm"
                            >
                                <Download className="w-4 h-4" /> Print
                            </button>
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
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                            <div className="text-[10px] font-bold text-blue-500 uppercase">Received (Filtered)</div>
                                            <div className="text-xl font-bold text-blue-700">{historyTotals.received.toFixed(3)} KG</div>
                                        </div>
                                        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                            <div className="text-[10px] font-bold text-emerald-500 uppercase">Consumed (Filtered)</div>
                                            <div className="text-xl font-bold text-emerald-700">{historyTotals.consumed.toFixed(3)} KG</div>
                                        </div>
                                        <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                                            <div className="text-[10px] font-bold text-rose-500 uppercase">Loss (Filtered)</div>
                                            <div className="text-xl font-bold text-rose-700">{historyTotals.loss.toFixed(3)} KG</div>
                                        </div>
                                    </div>
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                                            <tr>
                                                <th className="px-6 py-4">Date</th>
                                                <th className="px-6 py-4">Client</th>
                                                <th className="px-6 py-4">Type</th>
                                                <th className="px-6 py-4">Category</th>
                                                <th className="px-6 py-4">Base Material</th>
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
                                                    <td className="px-6 py-5">
                                                        <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                                            {(t.remarks || '').split(' - ')[0] || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-bold text-gray-900">{t.quantity.toFixed(3)} KG</td>
                                                    <td className="px-6 py-5">
                                                        <div className="text-xs text-gray-500 max-w-xs">{(t.remarks || '').split(' - ').slice(1).join(' - ') || t.reason || '—'}</div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleEdit(t)}
                                                                className="text-gray-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition"
                                                                title="Edit Entry"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(t.id)}
                                                                className="text-gray-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition"
                                                                title="Delete Entry"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredTransactions.length === 0 && (
                                                <tr><td colSpan={7} className="py-20 text-center text-gray-400 italic">No transactions found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-gray-900/60 z-[70] flex items-center justify-center sm:p-4 backdrop-blur-sm overflow-hidden">
                    <div className="bg-white rounded-none sm:rounded-2xl shadow-xl w-full max-w-lg h-full sm:h-auto overflow-hidden flex flex-col sm:max-h-[90vh] animate-in slide-in-from-bottom sm:zoom-in duration-300 overscroll-behavior-contain">
                        {/* Header - Fixed on top */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30 sticky top-0 z-10 backdrop-blur-md">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {editingId ? 'Edit Ledger Entry' : 'New Ledger Entry'}
                                </h2>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                    Record and track client material transactions
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Form Body - flex-1 ensures it takes available space */}
                        <form id="ledger-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar scroll-smooth overscroll-contain pb-32">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Type & Date Section - Modern Grid */}
                                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Transaction Type Card */}
                                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Transaction Type</label>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {(['RECEIPT', 'CONSUMPTION', 'LOSS'] as const).map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, transaction_type: type })}
                                                    className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all border ${form.transaction_type === type
                                                        ? type === 'RECEIPT' ? 'bg-emerald-600 text-white border-emerald-600' :
                                                            type === 'LOSS' ? 'bg-rose-600 text-white border-rose-600' :
                                                                'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {type === 'RECEIPT' ? 'RECEIVE' : type === 'CONSUMPTION' ? 'CONSUME' : 'LOSS'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Transaction Date Card */}
                                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Date</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const today = new Date();
                                                    setForm({ ...form, transaction_date: format(today, 'yyyy-MM-dd') });
                                                    setDateDisplay(format(today, 'dd-MM-yyyy'));
                                                }}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full"
                                            >
                                                Today
                                            </button>
                                        </div>
                                        <div className="relative group">
                                            {/* Hidden Date Picker triggered by icon */}
                                            <input
                                                type="date"
                                                ref={datePickerRef}
                                                className="absolute bottom-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
                                                value={form.transaction_date}
                                                onChange={handleDatePickerChange}
                                            />

                                            <Calendar
                                                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 z-10 cursor-pointer hover:text-indigo-600"
                                                onClick={() => datePickerRef.current?.showPicker?.()}
                                            />

                                            <input
                                                type="text"
                                                required
                                                value={dateDisplay}
                                                onChange={handleDateDisplayChange}
                                                className="w-full h-12 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                                                placeholder="DD-MM-YYYY"
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* Customer Selection */}
                                <div className="sm:col-span-2 relative">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Customer / Client</label>
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type="text"
                                            required
                                            value={customerSearch}
                                            onChange={handleCustomerSearch}
                                            onFocus={() => setShowCustomerResults(true)}
                                            className="w-full pl-10 pr-4 h-12 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                                            placeholder="Search by name or phone..."
                                        />
                                        {showCustomerResults && customerResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto py-1 animate-in fade-in zoom-in duration-200">
                                                {customerResults.map((c) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setForm({ ...form, client_id: c.id, client_name: c.name });
                                                            setCustomerSearch(c.name);
                                                            setShowCustomerResults(false);
                                                        }}
                                                        className="w-full px-4 py-2 text-left hover:bg-indigo-50 text-sm font-medium text-gray-700 flex justify-between items-center"
                                                    >
                                                        <span>{c.name}</span>
                                                        <span className="text-[10px] text-gray-400">{c.phone}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Material Details Section - Columnar Layout */}
                                <div className="sm:col-span-2 bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Base Material</label>
                                            <div className="relative group" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={baseSearch}
                                                    onChange={handleBaseSearch}
                                                    onFocus={() => setShowBaseResults(true)}
                                                    className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                                                    placeholder="Search material (e.g. Patra, Patti)"
                                                />
                                                {showBaseResults && baseResults.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl z-[80] max-h-48 overflow-y-auto py-1 border-t-4 border-t-indigo-500">
                                                        {baseResults.map((m) => (
                                                            <button
                                                                key={m.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setForm({ ...form, material_type_id: m.id, base_type: m.name });
                                                                    setBaseSearch(m.name);
                                                                    setShowBaseResults(false);
                                                                }}
                                                                className="w-full px-4 py-3 text-left hover:bg-indigo-50 text-sm font-bold text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
                                                            >
                                                                {m.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Material Category</label>
                                            <select
                                                value={form.material_type}
                                                onChange={(e) => setForm({ ...form, material_type: e.target.value as any })}
                                                className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="White Metal">White Metal (Silver)</option>
                                                <option value="Alloy">Alloy / Copper</option>
                                                <option value="Ghattak">Ghattak / Scrap</option>
                                                <option value="Other">Other Material</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Quantity Entry with Manual Unit Toggles */}
                                <div className="sm:col-span-2 bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100/50">
                                    <div className="flex justify-between items-end mb-2 px-1">
                                        <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest">Quantity Entry (Final KG)</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={convertToKg}
                                                className="text-[10px] font-bold text-indigo-100 bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-full shadow-sm transition-all"
                                                title="Divide by 1000"
                                            >
                                                Convert Grams to KG
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            required
                                            value={form.quantity}
                                            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                            onBlur={handleQuantityBlur}
                                            className="w-full h-16 pl-6 pr-16 bg-white border-2 border-indigo-100 rounded-2xl text-3xl font-black text-indigo-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner"
                                            placeholder="0.000"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end">
                                            <span className="text-[12px] font-black text-indigo-500 uppercase">KG</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-indigo-400/80 mt-3 font-bold flex items-center gap-1.5 bg-white/50 w-fit px-3 py-1 rounded-lg">
                                        <AlertTriangle size={12} className="text-indigo-400" />
                                        <span>Typing 850? Click <b>Convert Grams</b> to make it 0.850 KG</span>
                                    </p>
                                </div>

                                <div className="col-span-1 sm:col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Specification (e.g. Size/Gauge)</label>
                                    <input
                                        type="text"
                                        value={form.specification}
                                        onChange={(e) => setForm({ ...form, specification: e.target.value })}
                                        className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. 28 Gauge"
                                    />
                                </div>

                                {/* Conditional/Additional Fields */}
                                {form.transaction_type === 'LOSS' && (
                                    <div className="col-span-1 sm:col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 text-rose-500">Reason for Loss</label>
                                        <input
                                            type="text" required
                                            value={form.reason}
                                            onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                            className="w-full h-11 px-3 bg-rose-50 border border-rose-100 rounded-xl text-sm font-bold text-rose-900 focus:ring-1 focus:ring-rose-500 outline-none"
                                            placeholder="e.g. Melting loss"
                                        />
                                    </div>
                                )}

                                <div className="col-span-1 sm:col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Reference / Job Order #</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.job_work_order_id}
                                            onChange={(e) => setForm({ ...form, job_work_order_id: e.target.value })}
                                            className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none pr-12"
                                            placeholder="Order UUID or number"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, job_work_order_id: generateJobId() })}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[10px] font-black text-indigo-600 hover:bg-white bg-indigo-50 rounded-lg transition-all"
                                            title="Generate New ID"
                                        >
                                            NEW
                                        </button>
                                    </div>
                                </div>

                                <div className="col-span-1 sm:col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Manual Remarks</label>
                                    <textarea
                                        value={form.manual_remarks}
                                        onChange={(e) => setForm({ ...form, manual_remarks: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        rows={2}
                                        placeholder="Add any extra notes here..."
                                    />
                                </div>
                            </div>
                        </form>

                        {/* Footer for Buttons - Fixed structure without tricky stickiness issues */}
                        <div className="p-6 border-t border-gray-100 bg-white flex gap-3 z-10 safe-pb">
                            <button
                                type="button"
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="flex-1 h-14 text-gray-500 font-bold bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all text-sm uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                form="ledger-form"
                                type="submit"
                                disabled={submitting}
                                className="flex-[2] h-14 text-white font-bold bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={18} />}
                                {editingId ? 'Update Entry' : 'Save Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
