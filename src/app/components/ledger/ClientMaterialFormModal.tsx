import React, { useRef } from 'react';
import { X, Calendar, Database, AlertTriangle, Save, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ClientMaterialType, ClientTransactionType, BaseMaterialType, Product, JobWorkItem } from '../../../types';

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
    jobWorkItems
}) => {
    const datePickerRef = useRef<HTMLInputElement>(null);

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
                                                onClick={() => {
                                                    setForm({ ...form, client_id: c.id, client_name: c.name });
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
                                                        onClick={() => {
                                                            setForm({ ...form, product_id: (m as any).id, base_type: m.name });
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
