import React, { useRef, useState } from 'react';
import { X, Calendar, Database, AlertTriangle, Save, Loader2, Search, Plus, Trash2, CheckCircle2, ChevronRight, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { ClientMaterialType, ClientTransactionType, Product, JobWorkItem } from '../../../types';
import { Combobox } from '../ui/combobox';

interface ClientMaterialFormModalProps {
    show: boolean;
    onClose: () => void;
    editingId: string | null;
    form: any;
    setForm: (form: any) => void;
    customerSearch: string;
    handleCustomerSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showCustomerResults: boolean;
    customerResults: any[];
    baseSearch: string;
    handleBaseSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showBaseResults: boolean;
    baseResults: any[];
    dateDisplay: string;
    handleDateDisplayChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDatePickerChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleQuantityBlur: () => void;
    convertToKg: () => void;
    handleSubmit: (e: React.FormEvent) => void;
    submitting: boolean;
    setShowCustomerResults: (show: boolean) => void;
    setShowBaseResults: (show: boolean) => void;
    setCustomerSearch: (search: string) => void;
    setBaseSearch: (search: string) => void;
    jobWorkItems: JobWorkItem[];
}

export const ClientMaterialFormModal: React.FC<ClientMaterialFormModalProps> = ({
    show,
    onClose,
    editingId,
    form,
    setForm,
    customerSearch,
    handleCustomerSearch,
    showCustomerResults,
    customerResults,
    baseSearch,
    handleBaseSearch,
    showBaseResults,
    baseResults,
    dateDisplay,
    handleDateDisplayChange,
    handleDatePickerChange,
    handleQuantityBlur,
    convertToKg,
    handleSubmit,
    submitting,
    setShowCustomerResults,
    setShowBaseResults,
    setCustomerSearch,
    setBaseSearch,
    jobWorkItems
}) => {
    const datePickerRef = useRef<HTMLInputElement>(null);

    const [draftSpec, setDraftSpec] = useState({
        description: '',
        quantity: 0,
        unit: 'KG',
        rate: 0,
        has_addon: false,
        addon_service_id: '',
        addon_quantity: 0,
        addon_rate: 0
    });

    const [draftError, setDraftError] = useState('');

    const handleDraftChange = (key: string, value: any) => {
        setDraftSpec(prev => {
            const updated = { ...prev, [key]: value };

            // Auto-fetch rate if service is selected
            if (key === 'description' && value) {
                const jw = jobWorkItems.find(j => j.name === value);
                if (jw) {
                    updated.rate = jw.default_rate || 0;
                    updated.unit = jw.unit || 'KG';
                }
            }

            if (key === 'addon_service_id' && value) {
                const jw = jobWorkItems.find(j => j.id === value);
                if (jw) {
                    updated.addon_rate = jw.default_rate || 0;
                }
            }

            return updated;
        });
    };

    const addSpecification = () => {
        setDraftError('');
        if (!draftSpec.description) return setDraftError('Please select an item.');
        if (Number(draftSpec.quantity) <= 0) return setDraftError('Weight must be greater than zero.');

        const newDetail = {
            ...draftSpec,
            id: crypto.randomUUID(),
            base_quantity: draftSpec.quantity,
            base_rate: draftSpec.rate,
        };

        const details = form.order_details || [];
        setForm({ ...form, order_details: [...details, newDetail] });

        // Reset draft
        setDraftSpec({
            description: '',
            quantity: 0,
            unit: 'KG',
            rate: 0,
            has_addon: false,
            addon_service_id: '',
            addon_quantity: 0,
            addon_rate: 0
        });
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/60 z-[70] flex items-center justify-center sm:p-4 backdrop-blur-sm overflow-hidden">
            <div className="bg-white rounded-none sm:rounded-2xl shadow-xl w-full max-w-lg h-full sm:h-auto overflow-hidden flex flex-col sm:max-h-[90vh] animate-in slide-in-from-bottom sm:zoom-in duration-300 overscroll-behavior-contain">
                {/* Header */}
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
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form id="ledger-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar scroll-smooth overscroll-contain pb-32">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Type & Date */}
                        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Date</label>
                                </div>
                                <div className="relative group">
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

                        {/* Order Specifications (Only for CONSUMPTION) */}
                        {form.transaction_type === 'CONSUMPTION' && (
                            <div className="sm:col-span-2 space-y-4">
                                <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                        <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                            <ShoppingCart size={14} /> Item Specification
                                        </h4>
                                        <span className="text-[10px] font-bold text-amber-500 bg-amber-100/50 px-2 py-0.5 rounded-full">
                                            Internal Detail
                                        </span>
                                    </div>

                                    {/* DRAFT FORM CARD */}
                                    <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm space-y-4">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Item / Service</label>
                                            <Combobox
                                                options={jobWorkItems.map(j => ({ value: j.name, label: `${j.name} - ₹${j.default_rate}` }))}
                                                value={draftSpec.description}
                                                onValueChange={(val) => handleDraftChange('description', val)}
                                                placeholder="-- Select Item --"
                                                searchPlaceholder="Search product or service..."
                                                className="h-12 text-sm font-bold border-gray-200 rounded-xl"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Weight ({draftSpec.unit})</label>
                                                <input
                                                    type="number" step="any"
                                                    value={draftSpec.quantity || ''}
                                                    onChange={(e) => handleDraftChange('quantity', Number(e.target.value))}
                                                    className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl text-lg font-black text-gray-900 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                                    placeholder="0.000"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Rate (₹)</label>
                                                <input
                                                    type="number" step="any"
                                                    value={draftSpec.rate || ''}
                                                    onChange={(e) => handleDraftChange('rate', Number(e.target.value))}
                                                    className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl text-lg font-black text-gray-900 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        {/* ADDON SECTION */}
                                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-3">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={draftSpec.has_addon}
                                                    onChange={(e) => handleDraftChange('has_addon', e.target.checked)}
                                                    className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                                                />
                                                <span className="text-xs font-black text-amber-900 uppercase tracking-tight">Add Diamond Cutting / Chalai?</span>
                                            </label>

                                            {draftSpec.has_addon && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <div className="sm:col-span-2">
                                                        <label className="block text-[9px] font-bold text-amber-700 uppercase mb-1 ml-1">Select Addon Service</label>
                                                        <select
                                                            value={draftSpec.addon_service_id}
                                                            onChange={(e) => handleDraftChange('addon_service_id', e.target.value)}
                                                            className="w-full h-10 px-3 bg-white border border-amber-200 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-amber-500"
                                                        >
                                                            <option value="">-- Select Service --</option>
                                                            {jobWorkItems.filter(j => j.name.toLowerCase().includes('cutting') || j.name.toLowerCase().includes('chala')).map(j => (
                                                                <option key={j.id} value={j.id}>{j.name} (₹{j.default_rate})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-amber-700 uppercase mb-1 ml-1">PCS</label>
                                                        <input
                                                            type="number"
                                                            value={draftSpec.addon_quantity || ''}
                                                            onChange={(e) => handleDraftChange('addon_quantity', Number(e.target.value))}
                                                            className="w-full h-10 px-3 bg-white border border-amber-200 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-amber-500"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-amber-700 uppercase mb-1 ml-1">Addon Rate</label>
                                                        <input
                                                            type="number"
                                                            value={draftSpec.addon_rate || ''}
                                                            onChange={(e) => handleDraftChange('addon_rate', Number(e.target.value))}
                                                            className="w-full h-10 px-3 bg-white border border-amber-200 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-amber-500"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {draftError && <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1 mx-1"><AlertTriangle size={10} /> {draftError}</p>}

                                        <button
                                            type="button"
                                            onClick={addSpecification}
                                            className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-200/50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={16} /> Add to Specification
                                        </button>
                                    </div>
                                </div>

                                {/* SPECIFICATION LIST SUMMARY */}
                                {form.order_details && form.order_details.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Added Specifications</span>
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                {form.order_details.length} Items
                                            </span>
                                        </div>
                                        <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto custom-scrollbar">
                                            {form.order_details.map((item: any, idx: number) => {
                                                const addonJw = item.has_addon ? jobWorkItems.find(j => j.id === item.addon_service_id) : null;
                                                return (
                                                    <div key={item.id} className="p-4 hover:bg-gray-50/50 transition-colors group">
                                                        <div className="flex justify-between items-start gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-sm font-black text-gray-900 truncate">{item.description}</span>
                                                                    <ChevronRight size={12} className="text-gray-300" />
                                                                    <span className="text-xs font-bold text-gray-500">{item.base_quantity} {item.unit} @ ₹{item.base_rate}</span>
                                                                </div>
                                                                {item.has_addon && addonJw && (
                                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50/50 w-fit px-2 py-0.5 rounded-md">
                                                                        <CheckCircle2 size={10} />
                                                                        <span>{addonJw.name}: {item.addon_quantity} PCS @ ₹{item.addon_rate}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const details = [...form.order_details];
                                                                    details.splice(idx, 1);
                                                                    setForm({ ...form, order_details: details });
                                                                }}
                                                                className="text-gray-300 hover:text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg transition-all"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="p-4 bg-gray-50/30 border-t border-gray-100 flex justify-between items-center">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Est. Base Cost</span>
                                            <span className="text-sm font-black text-gray-900">
                                                ₹{form.order_details.reduce((acc: number, item: any) => acc + (Number(item.base_quantity) * Number(item.base_rate)) + (item.has_addon ? (Number(item.addon_quantity) * Number(item.addon_rate)) : 0), 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Customer Search */}
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
                                                onMouseDown={() => {
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

                        {/* Material Details */}
                        <div className="sm:col-span-2 bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Base Material</label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={baseSearch}
                                            onChange={handleBaseSearch}
                                            onFocus={() => setShowBaseResults(true)}
                                            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                                            placeholder="Search material"
                                        />
                                        {showBaseResults && baseResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl z-[80] max-h-48 overflow-y-auto py-1">
                                                {baseResults.map((m) => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        onMouseDown={() => {
                                                            setForm({ ...form, product_id: (m as any).id, base_type: m.name });
                                                            setBaseSearch(m.name);
                                                            setShowBaseResults(false);
                                                        }}
                                                        className="w-full px-4 py-3 text-left hover:bg-indigo-50 text-sm font-bold text-gray-700 border-b border-gray-50 last:border-0"
                                                    >
                                                        <span>{m.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                                    <select
                                        value={form.material_type}
                                        onChange={(e) => setForm({ ...form, material_type: e.target.value as any })}
                                        className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="White Metal">White Metal</option>
                                        <option value="Alloy">Alloy</option>
                                        <option value="Ghattak">Ghattak</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2 bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100/50">
                            <div className="flex justify-between items-end mb-2 px-1">
                                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest">Weight (KG)</label>
                                <button type="button" onClick={convertToKg} className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">/1000 (To KG)</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="relative group">
                                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                    <input
                                        type="text" required
                                        value={form.quantity}
                                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                        onBlur={handleQuantityBlur}
                                        className="w-full h-14 pl-11 pr-4 bg-white border border-indigo-200 rounded-xl text-lg font-black text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="0.000"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-black text-indigo-500">KG</span>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={form.pcs}
                                        onChange={(e) => setForm({ ...form, pcs: e.target.value })}
                                        className="w-full h-14 px-4 bg-white border border-indigo-200 rounded-xl text-lg font-black text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-black text-indigo-500">PCS</span>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 ml-1">PCS Work Type</label>
                                    <select
                                        value={form.pcs_work_type}
                                        onChange={(e) => setForm({ ...form, pcs_work_type: e.target.value })}
                                        className="w-full h-12 px-4 bg-white border border-indigo-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="None">None</option>
                                        {jobWorkItems.filter(s => s.unit === 'PCS').map(s => (
                                            <option key={s.id} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Misc */}
                        <div className="sm:col-span-2 space-y-4">
                            <input
                                type="text"
                                value={form.specification}
                                onChange={(e) => setForm({ ...form, specification: e.target.value })}
                                className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="Specification (Size/Gauge)"
                            />
                            {form.transaction_type === 'LOSS' && (
                                <input
                                    type="text" required
                                    value={form.reason}
                                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                    className="w-full h-11 px-3 bg-rose-50 border border-rose-100 rounded-xl text-sm font-bold text-rose-900 focus:ring-1 focus:ring-rose-500 outline-none"
                                    placeholder="Reason for Loss"
                                />
                            )}
                            <textarea
                                value={form.manual_remarks}
                                onChange={(e) => setForm({ ...form, manual_remarks: e.target.value })}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                rows={2}
                                placeholder="Extra Remarks..."
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-white flex gap-3 z-10">
                    <button
                        type="button"
                        onClick={onClose}
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
                        {editingId ? 'Update' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};
