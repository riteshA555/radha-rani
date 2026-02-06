import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Database, Search, Loader2, X, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { getBaseMaterialTypes, createBaseMaterialType, updateBaseMaterialType, deleteBaseMaterialType, BaseMaterialType } from '../../services/baseMaterialService';

export function BaseMaterialTypes() {
    const [types, setTypes] = useState<BaseMaterialType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingType, setEditingType] = useState<BaseMaterialType | null>(null);

    const [form, setForm] = useState({
        name: '',
        usage_type: 'RECEIPT' as 'RECEIPT' | 'CONSUMPTION' | 'BOTH'
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getBaseMaterialTypes();
            setTypes(data);
        } catch (err) {
            console.error('Failed to load material types', err);
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
            if (editingType) {
                await updateBaseMaterialType(editingType.id, { name: form.name, usage_type: form.usage_type });
            } else {
                await createBaseMaterialType(form.name, form.usage_type);
            }
            setShowModal(false);
            setForm({ name: '', usage_type: 'RECEIPT' });
            setEditingType(null);
            loadData();
        } catch (err: any) {
            alert('Error saving material type: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (type: BaseMaterialType) => {
        try {
            const newStatus = type.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            await updateBaseMaterialType(type.id, { status: newStatus });
            loadData();
        } catch (err: any) {
            alert('Error updating status: ' + err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this material type?')) return;
        try {
            await deleteBaseMaterialType(id);
            loadData();
        } catch (err: any) {
            alert('Error deleting material type: ' + err.message);
        }
    };

    const filteredTypes = types.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            <PageHeader
                title="Base Material Types"
                subtitle="Manage base material categories for structured remarks"
                actions={
                    <button
                        onClick={() => {
                            setEditingType(null);
                            setForm({ name: '', usage_type: 'RECEIPT' });
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium"
                    >
                        <Plus className="w-5 h-5" /> New Material Type
                    </button>
                }
            />

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-800">Available Types</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search types..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="py-20 text-center">
                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                            <div className="font-bold text-gray-800">Loading...</div>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Usage Type</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTypes.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{t.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${t.usage_type === 'CONSUMPTION' ? 'bg-orange-50 text-orange-700' :
                                                    t.usage_type === 'BOTH' ? 'bg-purple-50 text-purple-700' :
                                                        'bg-blue-50 text-blue-700'
                                                }`}>
                                                {t.usage_type || 'RECEIPT'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => toggleStatus(t)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${t.status === 'ACTIVE'
                                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                                    } transition-colors`}
                                            >
                                                {t.status === 'ACTIVE' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                {t.status}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingType(t);
                                                        setForm({ name: t.name, usage_type: t.usage_type || 'RECEIPT' });
                                                        setShowModal(true);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(t.id)}
                                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredTypes.length === 0 && (
                                    <tr><td colSpan={3} className="py-20 text-center text-gray-400 italic">No material types found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{editingType ? 'Edit Material Type' : 'New Material Type'}</h2>
                                <p className="text-sm text-gray-500 font-medium">Define a base category for remarks</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Material Type Name</label>
                                <input
                                    type="text" required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Patra, Wire, Rod"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Usage Type</label>
                                <select
                                    value={form.usage_type}
                                    onChange={(e) => setForm({ ...form, usage_type: e.target.value as any })}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="RECEIPT">Receipt Only</option>
                                    <option value="CONSUMPTION">Consumption Only</option>
                                    <option value="BOTH">Both</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 text-gray-500 font-bold bg-gray-50 hover:bg-gray-100 rounded-xl transition text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-[2] py-3 text-white font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md shadow-indigo-200"
                                >
                                    {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Database size={16} />}
                                    {editingType ? 'Update Type' : 'Create Type'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
