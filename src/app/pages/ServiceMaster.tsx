import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Database, Search, Loader2, Edit2, Trash2, CheckCircle, XCircle, X } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { getJobWorkItems, addJobWorkItem, updateJobWorkItem, deleteJobWorkItem } from '../../services/jobWorkService';
import { JobWorkItem } from '../../types';

export function ServiceMaster() {
    const [services, setServices] = useState<JobWorkItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingItem, setEditingItem] = useState<JobWorkItem | null>(null);

    const [form, setForm] = useState({
        name: '',
        unit: 'PCS',
        default_rate: 0
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getJobWorkItems();
            setServices(data);
        } catch (err) {
            console.error('Failed to load services', err);
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
            if (editingItem) {
                await updateJobWorkItem(editingItem.id, {
                    name: form.name,
                    unit: form.unit,
                    default_rate: form.default_rate
                });
            } else {
                await addJobWorkItem({
                    name: form.name,
                    unit: form.unit,
                    default_rate: form.default_rate,
                    is_active: true
                });
            }
            setShowModal(false);
            setForm({ name: '', unit: 'PCS', default_rate: 0 });
            setEditingItem(null);
            loadData();
        } catch (err: any) {
            alert('Error saving service: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service?')) return;
        try {
            await deleteJobWorkItem(id);
            loadData();
        } catch (err: any) {
            alert('Error deleting service: ' + err.message);
        }
    };

    const handleEdit = (item: JobWorkItem) => {
        setEditingItem(item);
        setForm({
            name: item.name,
            unit: item.unit,
            default_rate: item.default_rate
        });
        setShowModal(true);
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            <PageHeader
                title="Service Master"
                subtitle="Manage services and labor charges"
                actions={
                    <button
                        onClick={() => {
                            setEditingItem(null);
                            setForm({ name: '', unit: 'PCS', default_rate: 0 });
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium"
                    >
                        <Plus className="w-5 h-5" /> Add Service
                    </button>
                }
            />

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-800">Available Services</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search services..."
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
                                    <th className="px-6 py-4">Service Name</th>
                                    <th className="px-6 py-4">Unit</th>
                                    <th className="px-6 py-4 text-right">Default Rate (₹)</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredServices.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold uppercase">{item.unit}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-medium text-gray-700">₹{item.default_rate}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredServices.length === 0 && (
                                    <tr><td colSpan={4} className="py-20 text-center text-gray-400 italic">No services found.</td></tr>
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
                                <h2 className="text-xl font-bold text-gray-900">{editingItem ? 'Edit Service' : 'Add New Service'}</h2>
                                <p className="text-sm text-gray-500 font-medium">Configure service details and rates</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Service Name</label>
                                <input
                                    type="text" required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Polishing, Casting"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Unit</label>
                                    <select
                                        value={form.unit}
                                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="PCS">PCS</option>
                                        <option value="KG">KG</option>
                                        <option value="GRAMS">GRAMS</option>
                                        <option value="SET">SET</option>
                                        <option value="JODI">JODI</option>
                                        <option value="FIXED">FIXED</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Default Rate (₹)</label>
                                    <input
                                        type="number" step="0.01" min="0"
                                        value={form.default_rate}
                                        onChange={(e) => setForm({ ...form, default_rate: Number(e.target.value) })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
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
                                    {editingItem ? 'Update Service' : 'Create Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
