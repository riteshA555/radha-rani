import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, FileText, Calendar, Wallet, Loader2, X } from 'lucide-react';
import { getExpenses, createExpense, deleteExpense, Expense } from '../../services/expenseService';
import { formatIndianRupees } from '../../shared/utils/formatters';

export function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'ALL'>('THIS_MONTH');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    head: '',
    amount: '',
    notes: '',
    payment_mode: 'CASH',
    gst_enabled: false,
    gst_rate: '3',
    vendor_name: '',
    invoice_number: ''
  });

  const commonHeads = [
    'Shop Rent', 'Electricity Bill', 'Staff Salary', 'Tea & Coffee',
    'Travel Expenses', 'Stationery', 'Mobile Recharge', 'Internet/WiFi',
    'Maintenance', 'Packaging Material', 'Tools Purchase'
  ];

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      let start, end;
      const now = new Date();

      if (filter === 'THIS_MONTH') {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      } else if (filter === 'LAST_MONTH') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      }

      const data = await getExpenses(start, end);
      setExpenses(data || []);
    } catch (err) {
      console.error('Failed to load expenses', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const amount = Number(form.amount);
      const gstRate = Number(form.gst_rate);
      const gstAmount = form.gst_enabled ? (amount * gstRate / (100 + gstRate)) : 0;

      await createExpense({
        date: form.date,
        head: form.head,
        amount: amount,
        notes: form.notes,
        payment_mode: form.payment_mode as any,
        gst_enabled: form.gst_enabled,
        gst_rate: form.gst_enabled ? gstRate : 0,
        gst_amount: gstAmount,
        vendor_name: form.vendor_name,
        invoice_number: form.invoice_number
      });

      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      alert('Error adding expense: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    setDeletingId(id);
    try {
      await deleteExpense(id);
      loadData();
    } catch (err: any) {
      alert('Error deleting: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      head: '',
      amount: '',
      notes: '',
      payment_mode: 'CASH',
      gst_enabled: false,
      gst_rate: '3',
      vendor_name: '',
      invoice_number: ''
    });
  };

  const filteredExpenses = expenses.filter(e =>
    e.head.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Expenses Manager</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Track daily operating costs
          </p>
        </div>

        {/* Date Filter & Add Button */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex bg-gray-100 p-1 rounded-lg self-start">
            <button
              onClick={() => setFilter('THIS_MONTH')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'THIS_MONTH' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              This Month
            </button>
            <button
              onClick={() => setFilter('LAST_MONTH')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'LAST_MONTH' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Last Month
            </button>
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm text-sm font-bold whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-100 rounded-lg focus:ring-1 focus:ring-indigo-500 text-sm bg-gray-50/50"
          />
        </div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
          Total Expenses: <span className="text-indigo-600 ml-1 text-sm">₹{formatIndianRupees(totalAmount)}</span>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 text-center text-gray-500 flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          Loading expenses...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Head / Details</th>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-tight">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(exp.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 tracking-tight">{exp.head}</div>
                      {exp.notes && <div className="text-[11px] text-gray-500 mt-0.5">{exp.notes}</div>}
                      {exp.vendor_name && (
                        <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5 opacity-80">
                          <FileText className="w-3 h-3" /> {exp.vendor_name} <span className="text-gray-300 mx-1">/</span> {exp.invoice_number}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${exp.payment_mode === 'ONLINE' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          exp.payment_mode === 'UPI' ? 'bg-teal-50 text-teal-600 border-teal-100' :
                            'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                        {exp.payment_mode || 'CASH'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-900">₹{formatIndianRupees(Number(exp.amount))}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        disabled={deletingId === exp.id}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        {deletingId === exp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">No expenses found matching your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New Expense</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Operating cost entry</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70vh] scrollbar-hide">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                  <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm font-medium text-gray-700 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Payment Mode</label>
                  <select
                    value={form.payment_mode}
                    onChange={e => setForm({ ...form, payment_mode: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-gray-700 outline-none bg-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="ONLINE">Online Transfer</option>
                    <option value="UPI">UPI / GPay</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Amount (₹)</label>
                <input type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full p-3 border-2 border-indigo-50 rounded-xl focus:border-indigo-500 text-xl font-bold text-gray-900 outline-none" placeholder="0.00" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Expense Head</label>
                <input
                  type="text"
                  list="expense-heads"
                  required
                  placeholder="e.g. Shop Rent, Electricity..."
                  value={form.head}
                  onChange={e => setForm({ ...form, head: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm font-medium text-gray-700 outline-none"
                />
                <datalist id="expense-heads">
                  {commonHeads.map(h => <option key={h} value={h} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Notes (Optional)</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm font-medium text-gray-700 outline-none" placeholder="Additional details..." />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                  <input type="checkbox" checked={form.gst_enabled} onChange={e => setForm({ ...form, gst_enabled: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 transition-all" />
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Include GST Details (ITC)</span>
                </label>

                {form.gst_enabled && (
                  <div className="mt-4 p-5 bg-indigo-50/30 rounded-2xl border border-indigo-50 space-y-5 animate-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="block text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 ml-1">Vendor Name</label>
                      <input type="text" value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} className="w-full p-2.5 border border-indigo-100 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm font-medium text-gray-700 outline-none bg-white" placeholder="Supplier name for ITC" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 ml-1">Invoice No</label>
                        <input type="text" value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} className="w-full p-2.5 border border-indigo-100 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm font-medium text-gray-700 outline-none bg-white uppercase" placeholder="INV-2024" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 ml-1">GST Rate</label>
                        <select value={form.gst_rate} onChange={e => setForm({ ...form, gst_rate: e.target.value })} className="w-full p-2.5 border border-indigo-100 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-gray-700 outline-none bg-white">
                          <option value="3">3% (Silver)</option>
                          <option value="5">5% (Goods/Svcs)</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold text-xs uppercase tracking-widest rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm shadow-indigo-100">
                  {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus size={16} />}
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
