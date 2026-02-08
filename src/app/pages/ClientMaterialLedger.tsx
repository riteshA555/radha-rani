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
import { getProducts } from '../../services/productService';
import { getJobWorkItems } from '../../services/jobWorkService';
import { getCustomers, getCustomerList, Customer } from '../../services/contactService';
import { ClientMaterialTransaction, ClientMaterialBalance, ClientMaterialType, ClientTransactionType, Product, JobWorkItem } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { format, parse, isValid } from 'date-fns';


// Helper to generate simple random Job ID
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

interface CustomerResult {
    id: string;
    name: string;
    phone?: string;
}

export function ClientMaterialLedger() {
    const [transactions, setTransactions] = useState<ClientMaterialTransaction[]>([]);
    const [balances, setBalances] = useState<ClientMaterialBalance[]>([]);
    const [baseMaterialTypes, setBaseMaterialTypes] = useState<BaseMaterialType[]>([]);
    const [customers, setCustomers] = useState<{ id: string, name: string, phone?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'STATEMENT' | 'HISTORY'>('STATEMENT');
    const [historySubFilter, setHistorySubFilter] = useState<'ALL' | 'RECEIPT' | 'CONSUMPTION' | 'LOSS'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const { settings } = useSettings();

    // Integration States
    const [products, setProducts] = useState<Product[]>([]);
    const [jobWorkItems, setJobWorkItems] = useState<JobWorkItem[]>([]);
    const [selectedConsumptions, setSelectedConsumptions] = useState<string[]>([]);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [orderForm, setOrderForm] = useState({
        customer_name: '',
        order_date: format(new Date(), 'yyyy-MM-dd')
    });

    // Filter states for Customer Search
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
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
        pcs_work_type: 'None'
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
        const safeFetch = async <T,>(fn: () => Promise<T>, setter: (data: T) => void, name: string) => {
            try {
                const data = await fn();
                setter(data);
            } catch (err) {
                console.warn(`Failed to load ${name}:`, err);
            }
        };

        const promises = [
            safeFetch(getClientMaterialTransactions, (data) => setTransactions(data), 'Transactions'),
            safeFetch(getClientMaterialBalances, (data) => setBalances(data), 'Balances'),
            safeFetch(getBaseMaterialTypes, (data) => setBaseMaterialTypes(data), 'Base Materials'),
            safeFetch(getProducts, (data) => setProducts(data), 'Products'),
            safeFetch(getCustomerList, (data) => setCustomers(data), 'Customers'),
            safeFetch(getJobWorkItems, (data) => setJobWorkItems(data), 'Job Work Items')
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
                job_work_order_id: formData.job_work_order_id || undefined,
                product_id: formData.product_id || undefined,
                pcs: formData.pcs ? Number(formData.pcs) : undefined,
                pcs_work_type: formData.pcs_work_type || 'None'
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
            material_type_id: '',
            product_id: '',
            pcs: '',
            pcs_work_type: 'None'
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
            const filtered = customers.filter(c =>
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
        setForm(prev => ({ ...prev, base_type: query, product_id: '' }));

        if (query.length > 0) {
            // Priority 1: Search in Products (Catalog)
            const matchedProducts = products.filter((p: Product) =>
                p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.category.toLowerCase().includes(query.toLowerCase())
            );

            // Priority 2: Search in Legacy Base Material Types (for backwards compatibility if needed, or just use Products as source)
            // The request said: Replace FROM base_material_types TO products table.
            // So I will primarily show Products.

            setBaseResults(matchedProducts as any); // Cast as any for autocomplete compatibility since baseResults is BaseMaterialType[]
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

        let rawVal = form.quantity.toString().trim();
        let cleanStr = rawVal.replace(/,/g, '.');

        const val = parseFloat(cleanStr);
        if (isNaN(val)) return;

        // Smart Auto-Detection:
        // If it's a whole number (no decimal point in original input) AND >= 50,
        // we assume it's Grams and convert to KG.
        if (!rawVal.includes('.') && !rawVal.includes(',') && val >= 50) {
            setForm(prev => ({ ...prev, quantity: (val / 1000).toFixed(3) }));
        } else {
            setForm(prev => ({ ...prev, quantity: val.toFixed(3) }));
        }
    };

    const handleToggleSelection = (id: string) => {
        setSelectedConsumptions((prev: string[]) =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleCreateOrder = () => {
        if (selectedConsumptions.length === 0) return;

        // Map selected consumptions to Order Items
        const selectedItems = transactions.filter((t: ClientMaterialTransaction) => selectedConsumptions.includes(t.id));

        // Prepare prefilled data
        interface PrefilledOrderItem {
            description: string;
            quantity: number;
            unit: string;
            rate: number;
            product_id?: string;
            item_type: 'PRODUCT' | 'SERVICE';
        }
        const prefilledItems: PrefilledOrderItem[] = [];
        let errorMsg = '';

        const findService = (target: string) => {
            if (!target || target === 'None') return null;
            const cleanTarget = target.toLowerCase().trim();
            const baseTarget = cleanTarget.replace(/\s*\(.*\)/g, '').trim(); // Remove (Diamond Cutting) etc.

            return jobWorkItems.find((s: JobWorkItem) => {
                const sName = s.name.toLowerCase().trim();
                return (
                    sName === cleanTarget ||
                    sName === `${cleanTarget} work` ||
                    sName === baseTarget ||
                    sName === `${baseTarget} work`
                );
            });
        };

        for (const item of selectedItems) {
            const baseMaterial = item.remarks?.split(' - ')[0] || '';
            const pcsWorkType = item.pcs_work_type || 'None';

            // A) KG based item (Skip if Spring Locket Labour)
            if (item.quantity > 0 && pcsWorkType !== 'Spring Locket Labour') {
                if (!baseMaterial) {
                    errorMsg = `Base material missing for a selected row.`;
                    break;
                }
                const service = findService(baseMaterial);

                if (!service) {
                    errorMsg = `Service NOT FOUND in catalogue for: ${baseMaterial}`;
                    break;
                }
                if (!service.default_rate || parseFloat(service.default_rate.toString()) === 0) {
                    errorMsg = `Rate is ZERO or MISSING for service: ${service.name}. Please set rate in Service Catalogue.`;
                    break;
                }
                prefilledItems.push({
                    description: baseMaterial,
                    quantity: item.quantity,
                    unit: 'KG',
                    rate: service.default_rate,
                    product_id: item.product_id,
                    item_type: 'PRODUCT'
                });
            }

            // B) PCS based item (If PCS > 0 and Work Type selected)
            if (item.pcs && item.pcs > 0 && pcsWorkType !== 'None') {
                const service = findService(pcsWorkType);

                if (!service) {
                    errorMsg = `PCS Work Type NOT FOUND in catalogue: ${pcsWorkType}`;
                    break;
                }
                if (!service.default_rate || parseFloat(service.default_rate.toString()) === 0) {
                    errorMsg = `Rate is ZERO or MISSING for PCS Work: ${service.name}. Please set rate in Service Catalogue.`;
                    break;
                }
                prefilledItems.push({
                    description: `${pcsWorkType}${baseMaterial ? ' - ' + baseMaterial : ''}`,
                    quantity: item.pcs,
                    unit: 'PCS',
                    rate: service.default_rate,
                    product_id: item.product_id,
                    item_type: 'PRODUCT'
                });
            }
        }

        if (errorMsg) {
            alert(errorMsg);
            return;
        }

        // Use the first item's customer if available
        const customerName = orderForm.customer_name || selectedItems[0]?.client_name;

        navigate('/orders/create', {
            state: {
                prefilled: {
                    customer_name: customerName,
                    order_date: orderForm.order_date,
                    material_type: 'CLIENT',
                    items: prefilledItems
                }
            }
        });
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
        const materialMatch = baseMaterialTypes.find((m: BaseMaterialType) => m.name.toLowerCase() === baseType.toLowerCase());

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
            material_type_id: materialMatch?.id || '',
            product_id: transaction.product_id || '',
            pcs: transaction.pcs?.toString() || '',
            pcs_work_type: transaction.pcs_work_type || 'None'
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
        balances.filter((b: ClientMaterialBalance) => b.client_name.toLowerCase().includes(searchQuery.toLowerCase())),
        [balances, searchQuery]);

    const filteredTransactions = useMemo(() =>
        transactions.filter((t: ClientMaterialTransaction) => {
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

        const business = settings.business_profile;
        const title = activeTab === 'STATEMENT' ? 'Client Balance Statement' : 'Client Material History Log';
        const dateStr = format(new Date(), 'dd MMMM yyyy, HH:mm');

        const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        @page { size: A4; margin: 20mm; }
                        body { 
                            font-family: 'Inter', system-ui, -apple-system, sans-serif; 
                            color: #1f2937; 
                            line-height: 1.5;
                            margin: 0;
                            background: white;
                        }
                        .container { max-width: 100%; margin: 0 auto; }
                        
                        /* Header Section */
                        .header { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: flex-start; 
                            border-bottom: 2px solid #e5e7eb;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                        }
                        .biz-info h1 { 
                            font-size: 24px; 
                            font-weight: 800; 
                            margin: 0; 
                            color: #111827;
                            text-transform: uppercase;
                            letter-spacing: -0.025em;
                        }
                        .biz-details { font-size: 11px; color: #4b5563; margin-top: 4px; max-width: 300px; }
                        .doc-info { text-align: right; }
                        .doc-info h2 { font-size: 16px; margin: 0; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em; }
                        .doc-info p { font-size: 11px; margin: 4px 0 0; color: #6b7280; }

                        /* Recipient Section */
                        .info-grid { 
                            display: grid; 
                            grid-template-cols: 1fr 1fr; 
                            gap: 40px; 
                            margin-bottom: 30px; 
                        }
                        .info-block h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9ca3af; margin: 0 0 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
                        .info-content { font-size: 13px; font-weight: 600; }
                        .info-sub { font-size: 11px; color: #6b7280; font-weight: 400; margin-top: 2px; }

                        /* Table Section */
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th { 
                            background: #f9fafb; 
                            font-size: 10px; 
                            font-weight: 700; 
                            text-transform: uppercase; 
                            color: #4b5563; 
                            text-align: left; 
                            padding: 12px 10px;
                            border-bottom: 2px solid #e5e7eb;
                        }
                        td { 
                            padding: 10px; 
                            font-size: 11px; 
                            border-bottom: 1px solid #f3f4f6; 
                            vertical-align: middle;
                        }
                        tr:last-child td { border-bottom: 2px solid #e5e7eb; }
                        .text-right { text-align: right; }
                        .font-bold { font-weight: 700; }

                        /* Transaction Badges */
                        .badge { 
                            padding: 2px 6px; 
                            border-radius: 4px; 
                            font-size: 9px; 
                            font-weight: 700; 
                            text-transform: uppercase;
                        }
                        .badge-receipt { background: #dcfce7; color: #166534; }
                        .badge-consumption { background: #fee2e2; color: #991b1b; }
                        .badge-loss { background: #fef3c7; color: #92400e; }

                        /* Footer */
                        .footer { margin-top: 50px; }
                        .summary-row { display: flex; justify-content: flex-end; margin-bottom: 40px; }
                        .summary-table { width: 250px; }
                        .summary-table div { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; border-bottom: 1px dashed #e5e7eb; }
                        .summary-table .total { border-bottom: none; border-top: 2px solid #111827; margin-top: 4px; padding-top: 10px; font-size: 14px; font-weight: 800; }
                        
                        .sign-section { display: flex; justify-content: flex-end; margin-top: 60px; }
                        .sign-box { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; }

                        @media print {
                            body { -webkit-print-color-adjust: exact; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="biz-info">
                                <h1>${business.businessName || 'Your Business Name'}</h1>
                                <div class="biz-details">
                                    ${business.address ? `${business.address}<br>` : ''}
                                    ${business.city ? `${business.city}, ` : ''}${business.state ? `${business.state} - ` : ''}${business.pincode || ''}<br>
                                    ${business.phone ? `Phone: ${business.phone} | ` : ''}${business.email ? `Email: ${business.email}` : ''}<br>
                                    ${business.gstin ? `<strong>GSTIN: ${business.gstin}</strong>` : ''}
                                </div>
                            </div>
                            <div class="doc-info">
                                <h2>Material Ledger</h2>
                                <p>Report Type: ${activeTab === 'STATEMENT' ? 'Balance Summary' : 'Transaction History'}</p>
                                <p>Date: ${dateStr}</p>
                            </div>
                        </div>

                        <div class="info-grid">
                            <div class="info-block">
                                <h3>Account Information</h3>
                                <div class="info-content">All Active Clients</div>
                                <div class="info-sub">Material Type: All Base Materials</div>
                            </div>
                            ${searchQuery ? `
                            <div class="info-block">
                                <h3>Filtered Results</h3>
                                <div class="info-content">Searching for: "${searchQuery}"</div>
                                <div class="info-sub">Applied to ${activeTab === 'STATEMENT' ? 'Client Names' : 'All Fields'}</div>
                            </div>
                            ` : ''}
                        </div>

                        ${activeTab === 'STATEMENT' ? `
                            <table>
                                <thead>
                                    <tr>
                                        <th>Client Name</th>
                                        <th class="text-right">PCS</th>
                                        <th class="text-right">Received</th>
                                        <th class="text-right">Consumed</th>
                                        <th class="text-right">Loss</th>
                                        <th class="text-right">Net Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${filteredBalances.map((b: any) => `
                                        <tr>
                                            <td class="font-bold">${b.client_name}</td>
                                            <td class="text-right">${filteredTransactions.filter((t: any) => t.client_name === b.client_name).reduce((sum: number, t: any) => sum + (t.pcs || 0), 0)}</td>
                                            <td class="text-right">${b.received.toFixed(3)} KG</td>
                                            <td class="text-right">${b.consumed.toFixed(3)} KG</td>
                                            <td class="text-right">${b.loss.toFixed(3)} KG</td>
                                            <td class="text-right font-bold">${b.balance.toFixed(3)} KG</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            <div class="footer">
                                <div class="summary-row">
                                    <div class="summary-table">
                                        <div><span>Total Received:</span> <span>${totals.received.toFixed(3)} KG</span></div>
                                        <div><span>Total Consumed:</span> <span>${totals.consumed.toFixed(3)} KG</span></div>
                                        <div><span>Total Loss:</span> <span>${totals.loss.toFixed(3)} KG</span></div>
                                        <div class="total"><span>Net Balance:</span> <span>${totals.balance.toFixed(3)} KG</span></div>
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 0; border: 1px solid #e5e7eb; margin-top: 10px;">
                                <!-- Left Column: RECEIPTS (Material In) -->
                                <div style="border-right: 1px solid #e5e7eb;">
                                    <div style="background: #f0fdf4; color: #166534; padding: 10px; font-size: 11px; font-weight: 800; border-bottom: 2px solid #e5e7eb; text-align: center; text-transform: uppercase;">
                                        Material Receipts (IN)
                                    </div>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th style="padding: 8px 5px; font-size: 9px;">Details</th>
                                                <th class="text-right" style="padding: 8px 5px; font-size: 9px;">PCS</th>
                                                <th class="text-right" style="padding: 8px 5px; font-size: 9px;">Qty (KG)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${filteredTransactions.filter((t: any) => t.transaction_type === 'RECEIPT').map((t: any) => `
                                                <tr>
                                                    <td style="padding: 8px 5px;">
                                                        <div style="font-weight: 700;">${t.client_name}</div>
                                                        <div style="font-size: 9px; color: #4f46e5; font-weight: 600;">${t.material_type}</div>
                                                        <div style="font-size: 9px; color: #6b7280;">${format(new Date(t.transaction_date), 'dd/MM/yy')}</div>
                                                        ${t.remarks ? `<div style="font-size: 8px; color: #9ca3af; font-style: italic; margin-top: 2px;">Note: ${t.remarks}</div>` : ''}
                                                    </td>
                                                    <td class="text-right" style="padding: 8px 5px;">${t.pcs || 0}</td>
                                                    <td class="text-right font-bold" style="padding: 8px 5px;">${t.quantity.toFixed(3)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                    <div style="padding: 10px; border-top: 2px solid #e5e7eb; background: #f9fafb; font-size: 11px; font-weight: 800;">
                                        <div style="display: flex; justify-content: space-between;">
                                            <span>TOTAL INCOMING:</span>
                                            <span>${historyTotals.received.toFixed(3)} KG</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Right Column: ISSUES (Material Out) -->
                                <div>
                                    <div style="background: #fef2f2; color: #991b1b; padding: 10px; font-size: 11px; font-weight: 800; border-bottom: 2px solid #e5e7eb; text-align: center; text-transform: uppercase;">
                                        Material Issues (OUT)
                                    </div>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th style="padding: 8px 5px; font-size: 9px;">Details</th>
                                                <th class="text-right" style="padding: 8px 5px; font-size: 9px;">PCS</th>
                                                <th class="text-right" style="padding: 8px 5px; font-size: 9px;">Qty (KG)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${filteredTransactions.filter((t: any) => t.transaction_type !== 'RECEIPT').map((t: any) => `
                                                <tr>
                                                    <td style="padding: 8px 5px;">
                                                        <div style="font-weight: 700;">${t.client_name}</div>
                                                        <div style="font-size: 9px; color: #4f46e5; font-weight: 600;">${t.material_type}</div>
                                                        <div style="font-size: 9px; color: #6b7280;">
                                                            ${format(new Date(t.transaction_date), 'dd/MM/yy')} | ${t.transaction_type}
                                                        </div>
                                                        ${(t.remarks || t.reason) ? `<div style="font-size: 8px; color: #9ca3af; font-style: italic; margin-top: 2px;">Note: ${t.remarks || t.reason}</div>` : ''}
                                                    </td>
                                                    <td class="text-right" style="padding: 8px 5px;">${t.pcs || 0}</td>
                                                    <td class="text-right font-bold" style="padding: 8px 5px;">${t.quantity.toFixed(3)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                    <div style="padding: 10px; border-top: 2px solid #e5e7eb; background: #f9fafb; font-size: 11px; font-weight: 800;">
                                        <div style="display: flex; justify-content: space-between;">
                                            <span>TOTAL OUTGOING:</span>
                                            <span>${(historyTotals.consumed + historyTotals.loss).toFixed(3)} KG</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="footer">
                                <div class="summary-row">
                                    <div class="summary-table" style="width: 300px;">
                                        <div class="total" style="background: #f9fafb; padding: 10px; border: 1px solid #111827;">
                                            <span>NET LEDGER BALANCE:</span> 
                                            <span style="color: #4f46e5;">${(historyTotals.received - (historyTotals.consumed + historyTotals.loss)).toFixed(3)} KG</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `}

                        <div class="sign-section">
                            <div class="sign-box">
                                Authorized Signatory<br>
                                <span style="font-size: 8px; font-weight: 400; color: #6b7280; text-transform: none;">For ${business.businessName || 'the Organization'}</span>
                            </div>
                        </div>
                    </div>

                    <script>
                        window.onload = () => { 
                            setTimeout(() => {
                                window.print(); 
                                // Commented out close to let user see preview
                                // window.close(); 
                            }, 500);
                        };
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
                                                <th className="px-6 py-4 w-10">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        checked={selectedConsumptions.length > 0 && selectedConsumptions.length === filteredTransactions.filter(t => t.transaction_type === 'CONSUMPTION').length}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                const allCons = filteredTransactions.filter(t => t.transaction_type === 'CONSUMPTION').map(t => t.id);
                                                                setSelectedConsumptions(allCons);
                                                            } else {
                                                                setSelectedConsumptions([]);
                                                            }
                                                        }}
                                                    />
                                                </th>
                                                <th className="px-6 py-4">Date</th>
                                                <th className="px-6 py-4">Client</th>
                                                <th className="px-6 py-4">Type</th>
                                                <th className="px-6 py-4">Category</th>
                                                <th className="px-6 py-4">Base Material</th>
                                                <th className="px-6 py-4 text-right">PCS</th>
                                                <th className="px-6 py-4 text-right">Quantity</th>
                                                <th className="px-6 py-4">Remarks</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredTransactions.map((t) => (
                                                <tr key={t.id} className={`hover:bg-gray-50/30 transition-colors ${selectedConsumptions.includes(t.id) ? 'bg-indigo-50/30' : ''}`}>
                                                    <td className="px-6 py-5">
                                                        {t.transaction_type === 'CONSUMPTION' && (
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                                checked={selectedConsumptions.includes(t.id)}
                                                                onChange={() => handleToggleSelection(t.id)}
                                                            />
                                                        )}
                                                    </td>
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
                                                    <td className="px-6 py-5 text-right font-bold text-indigo-600">{t.pcs || 0}</td>
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
                                                                    setForm({ ...form, product_id: (m as any).id, base_type: m.name });
                                                                    setBaseSearch(m.name);
                                                                    setShowBaseResults(false);
                                                                }}
                                                                className="w-full px-4 py-3 text-left hover:bg-indigo-50 text-sm font-bold text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <span>{m.name}</span>
                                                                    <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 uppercase">{(m as any).category || 'Item'}</span>
                                                                </div>
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
                                        <div>
                                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest">Quantity Entry (Final KG)</label>
                                            <p className="text-[9px] text-indigo-300 font-bold uppercase mt-0.5">Auto-Detect: Whole numbers &ge; 50 become Grams</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={convertToKg}
                                                className="text-[10px] font-bold text-indigo-100 bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-full shadow-sm transition-all"
                                                title="Divide by 1000"
                                            >
                                                Convert to KG
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="relative group">
                                            <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 z-10 pointer-events-none" />
                                            <input
                                                type="text"
                                                required
                                                value={form.quantity}
                                                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                                onBlur={handleQuantityBlur}
                                                className="w-full h-14 pl-11 pr-4 bg-white border border-indigo-200 rounded-xl text-lg font-black text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                                placeholder="Ex: 750 (Grams) or 1.5 (KG)"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end">
                                                <span className="text-[12px] font-black text-indigo-500 uppercase">KG</span>
                                            </div>
                                        </div>

                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={form.pcs}
                                                onChange={(e) => setForm({ ...form, pcs: e.target.value })}
                                                className="w-full h-14 px-4 bg-white border border-indigo-200 rounded-xl text-lg font-black text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                                placeholder="0"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end">
                                                <span className="text-[12px] font-black text-indigo-500 uppercase">PCS</span>
                                            </div>
                                        </div>

                                        <div className="relative sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 ml-1">PCS Work Type</label>
                                            <select
                                                value={form.pcs_work_type}
                                                onChange={(e) => setForm({ ...form, pcs_work_type: e.target.value })}
                                                className="w-full h-12 px-4 bg-white border border-indigo-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="None">None</option>
                                                {jobWorkItems
                                                    .filter(s => s.unit === 'PCS')
                                                    .map(service => (
                                                        <option key={service.id} value={service.name}>
                                                            {service.name}
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-indigo-400/80 mt-3 font-bold flex items-center gap-1.5 bg-white/50 w-fit px-3 py-1 rounded-lg">
                                        <AlertTriangle size={12} className="text-indigo-400" />
                                        <span>Typing 850? Click <b>Convert to KG</b> to make it 0.850 KG</span>
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

            {/* Create Order Modal / Bar */}
            {selectedConsumptions.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom duration-300">
                    <div className="bg-gray-900 border border-gray-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 backdrop-blur-md bg-opacity-90">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selections</span>
                            <span className="text-lg font-black text-white">{selectedConsumptions.length} Consumptions</span>
                        </div>
                        <div className="h-8 w-px bg-gray-700 mx-2" />
                        <button
                            onClick={() => {
                                const firstSelected = transactions.find(t => selectedConsumptions.includes(t.id));
                                if (firstSelected) {
                                    setOrderForm(prev => ({ ...prev, customer_name: firstSelected.client_name }));
                                }
                                setShowOrderModal(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2"
                        >
                            <Plus size={18} /> Create Order
                        </button>
                        <button
                            onClick={() => setSelectedConsumptions([])}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-3 rounded-xl transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Order Modal */}
            {showOrderModal && (
                <div className="fixed inset-0 bg-gray-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Create New Order</h2>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">From {selectedConsumptions.length} selected items</p>
                            </div>
                            <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Customer Name</label>
                                <input
                                    type="text"
                                    value={orderForm.customer_name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderForm(prev => ({ ...prev, customer_name: e.target.value }))}
                                    placeholder="Enter or confirm customer name"
                                    className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Order Date</label>
                                <input
                                    type="date"
                                    value={orderForm.order_date}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderForm(prev => ({ ...prev, order_date: e.target.value }))}
                                    className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={handleCreateOrder}
                                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 mt-4"
                            >
                                <ArrowRightLeft size={20} /> Proceed to Bill
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
