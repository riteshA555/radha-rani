import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Database, Search, History, Loader2, Download, User, ArrowRightLeft, AlertTriangle, Users, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/tabs';
import {
    getClientMaterialTransactions,
    addClientMaterialTransaction,
    updateClientMaterialTransaction,
    getClientMaterialBalances,
    deleteClientMaterialTransaction
} from '../../services/clientMaterialService';
import { getBaseMaterialTypes, ensureBaseMaterialType, BaseMaterialType } from '../../services/baseMaterialService';
import { getProducts } from '../../services/productService';
import { getJobWorkItems } from '../../services/jobWorkService';
import { getCustomerList } from '../../services/contactService';
import { getSettings } from '../../services/settingsService';
import { ClientMaterialTransaction, ClientMaterialBalance, ClientMaterialType, ClientTransactionType, Product, JobWorkItem } from '../../types';
import { useNavigate } from 'react-router-dom';
import { format, parse, isValid } from 'date-fns';

// Modular Components
import { ClientMaterialCard } from '../components/ledger/ClientMaterialCard';
import { CompactTransactionRow } from '../components/ledger/CompactTransactionRow';
import { ClientMaterialFormModal } from '../components/ledger/ClientMaterialFormModal';
import { ClientMaterialPrint } from '../components/ledger/ClientMaterialPrint';


const generateJobId = () => `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

interface SummaryCardProps {
    title: string;
    value: string;
    subTitle?: string;
    icon: React.ReactNode;
    color: 'indigo' | 'emerald' | 'rose' | 'blue';
}

const SummaryCard = ({ title, value, subTitle, icon, color }: SummaryCardProps) => {
    const colorMap = {
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
    const [customers, setCustomers] = useState<{ id: string, name: string, phone?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'STATEMENT' | 'HISTORY'>('STATEMENT');
    const [historySubFilter, setHistorySubFilter] = useState<'ALL' | 'RECEIPT' | 'CONSUMPTION' | 'LOSS'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 20;
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    // Integration States
    const [products, setProducts] = useState<Product[]>([]);
    const [jobWorkItems, setJobWorkItems] = useState<JobWorkItem[]>([]);
    const [baseMaterialTypes, setBaseMaterialTypes] = useState<BaseMaterialType[]>([]);
    const [selectedConsumptions, setSelectedConsumptions] = useState<string[]>([]);
    const [businessProfile, setBusinessProfile] = useState<any>(null); // New state for print details
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [orderForm, setOrderForm] = useState({
        customer_name: '',
        order_date: format(new Date(), 'yyyy-MM-dd')
    });

    const [customerSearch, setCustomerSearch] = useState('');
    const [customerResults, setCustomerResults] = useState<any[]>([]);
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
        material_type_id: '',
        product_id: '',
        pcs: '',
        pcs_work_type: 'None',
        order_details: [] as any[]
    });

    const [baseSearch, setBaseSearch] = useState('');
    const [baseResults, setBaseResults] = useState<any[]>([]);
    const [showBaseResults, setShowBaseResults] = useState(false);

    const [dateDisplay, setDateDisplay] = useState(format(new Date(), 'dd-MM-yyyy'));

    const loadMetadata = useCallback(async () => {
        try {
            const [b, p, c, jw, bm] = await Promise.all([
                getClientMaterialBalances(),
                getProducts(),
                getCustomerList(),
                getJobWorkItems(),
                getBaseMaterialTypes()
            ]);
            setBalances(b); setProducts(p); setCustomers(c); setJobWorkItems(jw); setBaseMaterialTypes(bm);
        } catch (err) {
            console.error("Failed to load metadata", err);
        }
    }, []);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const { data, count } = await getClientMaterialTransactions(page, PAGE_SIZE, startDate, endDate, searchQuery, historySubFilter);
            setTransactions(data);
            setTotalCount(count);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, startDate, endDate, searchQuery, historySubFilter]); // Type filter triggers fetch

    useEffect(() => { loadMetadata(); }, [loadMetadata]);
    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    // Fetch business profile for print
    useEffect(() => {
        getSettings('business_profile').then((settings: any) => {
            if (settings) setBusinessProfile(settings);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const finalRemarksParts = [form.base_type, form.specification, form.manual_remarks].filter(Boolean);
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
                job_work_order_id: form.job_work_order_id || undefined,
                product_id: form.product_id || undefined,
                pcs: form.pcs ? Number(form.pcs) : undefined,
                pcs_work_type: form.pcs_work_type || 'None',
                order_details: form.transaction_type === 'CONSUMPTION' ? (form.order_details || []) : []
            };

            if (editingId) {
                await updateClientMaterialTransaction(editingId, payload);
            } else {
                await addClientMaterialTransaction(payload);
            }

            // Auto-save base material type
            if (form.base_type) {
                const usage = form.transaction_type === 'RECEIPT' ? 'RECEIPT' : 'CONSUMPTION';
                await ensureBaseMaterialType(form.base_type, usage);
            }

            setShowModal(false);
            resetForm();
            loadMetadata();
            fetchTransactions();
        } catch (err: any) {
            alert(err.message);
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
            material_type_id: '',
            product_id: '',
            pcs: '',
            pcs_work_type: 'None',
            order_details: []
        });
        setEditingId(null);
        setCustomerSearch('');
        setBaseSearch('');
        setDateDisplay(format(new Date(), 'dd-MM-yyyy'));
    };

    const handleCustomerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setCustomerSearch(query);
        setForm(prev => ({ ...prev, client_name: query, client_id: '' }));
        if (query.length > 0) {
            setCustomerResults(customers.filter(c => c.name.toLowerCase().includes(query.toLowerCase())));
            setShowCustomerResults(true);
        } else {
            setShowCustomerResults(false);
        }
    };

    const handleBaseSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setBaseSearch(query);
        setForm(prev => ({ ...prev, base_type: query, product_id: '' }));

        if (query.length > 0) {
            const isReceipt = form.transaction_type === 'RECEIPT';
            const filtered = baseMaterialTypes.filter(t => {
                const matches = t.name.toLowerCase().includes(query.toLowerCase());
                if (!matches) return false;

                if (isReceipt) {
                    return t.usage_type === 'RECEIPT' || t.usage_type === 'BOTH';
                } else {
                    // Consumption and Loss share the same "Out" categories
                    return t.usage_type === 'CONSUMPTION' || t.usage_type === 'BOTH';
                }
            });

            // Map to the format expected by the results list (usually just needs a name or label)
            setBaseResults(filtered);
            setShowBaseResults(true);
        } else {
            setShowBaseResults(false);
        }
    };

    const handleDateDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDateDisplay(val);
        if (val.length === 10) {
            const parsed = parse(val, 'dd-MM-yyyy', new Date());
            if (isValid(parsed)) setForm(prev => ({ ...prev, transaction_date: format(parsed, 'yyyy-MM-dd') }));
        }
    };

    const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val) {
            setForm(prev => ({ ...prev, transaction_date: val }));
            setDateDisplay(format(new Date(val), 'dd-MM-yyyy'));
        }
    };

    const handleQuantityBlur = () => {
        if (!form.quantity) return;
        let val = parseFloat(form.quantity.replace(/,/g, '.'));
        if (isNaN(val)) return;
        if (!form.quantity.includes('.') && val >= 50) {
            setForm(prev => ({ ...prev, quantity: (val / 1000).toFixed(3) }));
        } else {
            setForm(prev => ({ ...prev, quantity: val.toFixed(3) }));
        }
    };

    const convertToKg = () => {
        const val = parseFloat(form.quantity);
        if (!isNaN(val)) setForm(prev => ({ ...prev, quantity: (val / 1000).toFixed(3) }));
    };

    const totals = useMemo(() => balances.reduce((acc, b) => ({
        received: acc.received + b.received,
        consumed: acc.consumed + b.consumed,
        loss: acc.loss + b.loss,
        balance: acc.balance + b.balance
    }), { received: 0, consumed: 0, loss: 0, balance: 0 }), [balances]);

    const filteredBalances = useMemo(() => balances.filter(b => b.client_name.toLowerCase().includes(searchQuery.toLowerCase())), [balances, searchQuery]);

    // Removed historyTotals as it was unused

    const handleEdit = (t: ClientMaterialTransaction) => {
        const parts = (t.remarks || '').split(' - ');
        setForm({
            client_name: t.client_name,
            client_id: t.client_id || '',
            material_type: t.material_type,
            transaction_type: t.transaction_type,
            quantity: t.quantity.toString(),
            transaction_date: format(new Date(t.transaction_date), 'yyyy-MM-dd'),
            manual_remarks: parts.slice(2).join(' - '),
            base_type: parts[0] || '',
            specification: parts[1] || '',
            reason: t.reason || '',
            job_work_order_id: t.job_work_order_id || generateJobId(),
            manual_client_entry: false,
            material_type_id: '',
            product_id: t.product_id || '',
            pcs: t.pcs?.toString() || '',
            pcs_work_type: t.pcs_work_type || 'None',
            order_details: t.order_details || []
        });
        setCustomerSearch(t.client_name);
        setBaseSearch(parts[0] || '');
        setDateDisplay(format(new Date(t.transaction_date), 'dd-MM-yyyy'));
        setEditingId(t.id);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Delete this entry?")) {
            await deleteClientMaterialTransaction(id);
            await deleteClientMaterialTransaction(id);
            fetchTransactions();
            loadMetadata();
        }
    };

    const handleCreateOrder = () => {
        const selectedItems = transactions.filter(t => selectedConsumptions.includes(t.id));

        // Aggregate items for Order
        const prefilledItems: any[] = [];

        selectedItems.forEach(tx => {
            if (tx.order_details && tx.order_details.length > 0) {
                // If we have granular details, use them!
                tx.order_details.forEach((detail: any) => {
                    const jw = jobWorkItems.find(j => j.name === detail.description);

                    prefilledItems.push({
                        description: detail.description,
                        quantity: detail.base_quantity || detail.weight || 1,
                        base_quantity: detail.base_quantity || detail.weight || 1,
                        unit: detail.unit || 'Piece',
                        weight: detail.base_quantity || detail.weight || 0,
                        rate: detail.base_rate || detail.rate || 0,
                        base_rate: detail.base_rate || detail.rate || 0,
                        item_type: 'SERVICE',
                        service_id: jw?.id
                    });

                    // Add Add-on Service if exists (New Structure)
                    if (detail.has_addon && detail.addon_service_id) {
                        const addonJw = jobWorkItems.find(j => j.id === detail.addon_service_id);
                        if (addonJw) {
                            prefilledItems.push({
                                description: addonJw.name,
                                quantity: detail.addon_quantity || 1,
                                base_quantity: detail.addon_quantity || 1,
                                unit: addonJw.unit || 'Piece',
                                rate: detail.addon_rate || addonJw.default_rate || 0,
                                base_rate: detail.addon_rate || addonJw.default_rate || 0,
                                item_type: 'SERVICE',
                                service_id: addonJw.id
                            });
                        }
                    }

                    // Legacy structure support (strings array)
                    if (detail.addon_services && detail.addon_services.length > 0) {
                        detail.addon_services.forEach((addonName: string) => {
                            const addonJw = jobWorkItems.find(j =>
                                j.name.toLowerCase().includes(addonName.toLowerCase()) ||
                                addonName.toLowerCase().includes(j.name.toLowerCase())
                            );
                            prefilledItems.push({
                                description: addonName,
                                quantity: 1,
                                base_quantity: 1,
                                unit: addonJw?.unit || 'Piece',
                                rate: addonJw?.default_rate || 0,
                                base_rate: addonJw?.default_rate || 0,
                                item_type: 'SERVICE',
                                service_id: addonJw?.id
                            });
                        });
                    }
                });
            } else {
                // Fallback to basic tx info if no granular details
                const baseMaterial = (tx.remarks || '').split(' - ')[0] || '';
                const service = jobWorkItems.find(s => s.name.toLowerCase().includes(baseMaterial.toLowerCase()));
                prefilledItems.push({
                    description: baseMaterial || 'Job Work',
                    quantity: tx.pcs || 1,
                    base_quantity: tx.pcs || 1,
                    unit: 'Piece',
                    rate: service?.default_rate || 0,
                    base_rate: service?.default_rate || 0,
                    weight: tx.quantity,
                    item_type: 'SERVICE',
                    service_id: service?.id
                });
            }
        });

        navigate('/orders/create', {
            state: {
                prefilled: {
                    customer_name: orderForm.customer_name || selectedItems[0]?.client_name,
                    ledger_id: selectedItems[0]?.client_id,
                    order_date: orderForm.order_date,
                    material_type: 'CLIENT',
                    items: prefilledItems,
                    gst_enabled: false,
                    source_ledger_ids: selectedItems.map(tx => tx.id) // NEW: Link to ledger consumption entries
                }
            }
        });
        setShowOrderModal(false);
    };

    const handlePrint = () => {
        window.print();
    };


    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto pb-24">
            <PageHeader
                title="Client Material Ledger"
                subtitle="Track daily client material receipts, consumption and loss"
                actions={
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 font-bold text-sm"
                    >
                        <Plus className="w-5 h-5" /> New Ledger Entry
                    </button>
                }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard title="Total Received" value={`${totals.received.toFixed(3)} KG`} icon={<Database className="w-5 h-5" />} color="blue" />
                <SummaryCard title="Total Consumed" value={`${totals.consumed.toFixed(3)} KG`} icon={<ArrowRightLeft className="w-5 h-5" />} color="emerald" />
                <SummaryCard title="Total Loss" value={`${totals.loss.toFixed(3)} KG`} icon={<AlertTriangle className="w-5 h-5" />} color="rose" />
                <SummaryCard title="Net Balance" value={`${totals.balance.toFixed(3)} KG`} icon={<Users className="w-5 h-5" />} color="indigo" subTitle="Overall Client Inventory" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[60vh]">
                <Tabs
                    activeTab={activeTab}
                    onChange={setActiveTab}
                    tabs={[
                        { id: 'STATEMENT', label: 'Material Statement', icon: <Users size={18} /> },
                        { id: 'HISTORY', label: 'History Logs', icon: <History size={18} /> }
                    ]}
                />

                <div className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 leading-none">
                                {activeTab === 'STATEMENT' ? 'Client Scorecards' : 'Audit Trail'}
                            </h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                                {activeTab === 'STATEMENT' ? 'Click on a card to see detailed audit' : 'Detailed material movements log'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            {activeTab === 'HISTORY' && (
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    {(['ALL', 'RECEIPT', 'CONSUMPTION', 'LOSS'] as const).map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => { setHistorySubFilter(f); setPage(1); }}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${historySubFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="relative w-full sm:w-72 group">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by client name..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                    className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
                                />
                            </div>

                            {/* Date Filter */}
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-transparent text-xs font-bold outline-none text-gray-600 w-24"
                                />
                                <span className="text-gray-300">-</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-transparent text-xs font-bold outline-none text-gray-600 w-24"
                                />
                                {(startDate || endDate) && (
                                    <button onClick={() => { setStartDate(''); setEndDate(''); }} className="ml-1 text-gray-400 hover:text-rose-500">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <button onClick={handlePrint} className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded-xl transition-all shadow-sm">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-24 text-center">
                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                            <div className="font-bold text-gray-900 uppercase tracking-widest text-[10px]">Syncing Data...</div>
                        </div>
                    ) : (
                        <div>
                            {activeTab === 'STATEMENT' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredBalances.map((b, i) => (
                                        <ClientMaterialCard
                                            key={i}
                                            balance={b}
                                            onClick={() => {
                                                setSearchQuery(b.client_name);
                                                setActiveTab('HISTORY');
                                            }}
                                        />
                                    ))}
                                    {filteredBalances.length === 0 && (
                                        <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                                            <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                            <p className="text-gray-400 font-bold italic">No clients found matching your search.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-widest text-[10px] border-b border-gray-100">
                                            <tr>
                                                <th className="px-6 py-4 w-10">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-indigo-600"
                                                        checked={selectedConsumptions.length > 0 && selectedConsumptions.length === transactions.filter(t => t.transaction_type === 'CONSUMPTION').length}
                                                        onChange={(e) => {
                                                            const allCons = transactions.filter(t => t.transaction_type === 'CONSUMPTION').map(t => t.id);
                                                            setSelectedConsumptions(e.target.checked ? allCons : []);
                                                        }}
                                                    />
                                                </th>
                                                <th className="px-6 py-4">Date</th>
                                                <th className="px-6 py-4">Client</th>
                                                <th className="px-6 py-4">Type</th>
                                                <th className="px-6 py-4">Material</th>
                                                <th className="px-6 py-4 text-right">Quantity</th>
                                                <th className="px-6 py-4">Notes</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {transactions.map((t) => (
                                                <CompactTransactionRow
                                                    key={t.id}
                                                    transaction={t}
                                                    isSelected={selectedConsumptions.includes(t.id)}
                                                    onToggle={(id) => setSelectedConsumptions(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                                                    onEdit={handleEdit}
                                                    onDelete={handleDelete}
                                                />
                                            ))}
                                            {transactions.length === 0 && (
                                                <tr><td colSpan={8} className="py-24 text-center text-gray-400 font-bold italic">No history found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {activeTab === 'HISTORY' && totalCount > 0 && (
                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Showing {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-all border border-gray-200"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                <button
                                    disabled={page * PAGE_SIZE >= totalCount}
                                    onClick={() => setPage(p => p + 1)}
                                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-all border border-gray-200"
                                >
                                    <ChevronRight className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ClientMaterialFormModal
                show={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                editingId={editingId}
                form={form}
                setForm={setForm}
                customerSearch={customerSearch}
                handleCustomerSearch={handleCustomerSearch}
                showCustomerResults={showCustomerResults}
                customerResults={customerResults}
                baseSearch={baseSearch}
                handleBaseSearch={handleBaseSearch}
                showBaseResults={showBaseResults}
                baseResults={baseResults}
                dateDisplay={dateDisplay}
                handleDateDisplayChange={handleDateDisplayChange}
                handleDatePickerChange={handleDatePickerChange}
                handleQuantityBlur={handleQuantityBlur}
                convertToKg={convertToKg}
                handleSubmit={handleSubmit}
                submitting={submitting}
                setShowCustomerResults={setShowCustomerResults}
                setShowBaseResults={setShowBaseResults}
                setCustomerSearch={setCustomerSearch}
                setBaseSearch={setBaseSearch}
                jobWorkItems={jobWorkItems}
            />

            {selectedConsumptions.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom duration-500">
                    <div className="bg-gray-900 p-2 pl-6 rounded-2xl shadow-2xl flex items-center gap-6 border border-gray-800">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Selections</span>
                            <span className="text-sm font-bold text-white">{selectedConsumptions.length} Consumptions</span>
                        </div>
                        <div className="h-8 w-px bg-gray-800" />
                        <button
                            onClick={() => {
                                const firstItem = transactions.find(t => selectedConsumptions.includes(t.id));
                                setOrderForm(prev => ({ ...prev, customer_name: firstItem?.client_name || '' }));
                                setShowOrderModal(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                        >
                            <Plus size={16} /> CREATE ORDER
                        </button>
                        <button onClick={() => setSelectedConsumptions([])} className="p-3 text-gray-500 hover:text-white transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {showOrderModal && (
                <div className="fixed inset-0 bg-gray-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Finalize Order</h2>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Convert material into a job work bill</p>
                            </div>
                            <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm Customer Name</label>
                                <input
                                    type="text"
                                    value={orderForm.customer_name}
                                    onChange={(e) => setOrderForm(prev => ({ ...prev, customer_name: e.target.value }))}
                                    className="w-full h-14 px-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Order Date</label>
                                <input
                                    type="date"
                                    value={orderForm.order_date}
                                    onChange={(e) => setOrderForm(prev => ({ ...prev, order_date: e.target.value }))}
                                    className="w-full h-14 px-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={handleCreateOrder}
                                className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 mt-4"
                            >
                                <ArrowRightLeft size={20} /> Generate Billing
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ClientMaterialPrint
                clientName={searchQuery || "All Clients"}
                balance={balances.find(b => b.client_name === searchQuery)}
                transactions={transactions}
                shopName={businessProfile?.companyName || "STERLINGFLOW ERP"}
                businessProfile={businessProfile}
            />
        </div>
    );
}

