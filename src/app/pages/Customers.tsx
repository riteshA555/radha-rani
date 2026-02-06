import { useState, useEffect } from 'react';
import { Plus, Search, User, Phone, MapPin, ShoppingBag, Loader2, Trash2, X, Edit2, Wallet, ArrowRight, History, CheckCircle } from 'lucide-react';
import { getCustomers, addCustomer, updateCustomer, deleteContact, Customer } from '../../services/contactService';
import { recordPayment } from '../../services/accountingService';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { useNavigate } from 'react-router-dom';

export function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', gstNumber: '' });

  // Payment Form
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('CASH');
  const [payNote, setPayNote] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
  );

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === 'active').length;
  const totalReceivable = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      gstNumber: customer.gstNumber || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          gstNumber: formData.gstNumber
        });
      } else {
        await addCustomer({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          gstNumber: formData.gstNumber
        });
      }
      setShowModal(false);
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '', gstNumber: '' });
      loadCustomers();
    } catch (err: any) {
      alert("Failed to save: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;
    setSubmitting(true);
    try {
      await recordPayment(paymentModal.id, Number(payAmount), payMode, payNote || 'Payment Received');
      setPaymentModal(null);
      setPayAmount('');
      setPayNote('');
      loadCustomers(); // Refresh balances
    } catch (err: any) {
      alert('Payment Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await deleteContact(id);
      loadCustomers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Customers</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage your customer database and credit
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ContactSummaryCard
          label="Total Customers"
          value={totalCustomers}
          icon={<User className="w-5 h-5 text-indigo-600" />}
        />
        <ContactSummaryCard
          label="Active Database"
          value={activeCustomers}
          icon={<User className="w-5 h-5 text-emerald-600" />}
        />
        <ContactSummaryCard
          label="Total Receivables"
          value={`₹${formatIndianRupees(totalReceivable)}`}
          icon={<Wallet className="w-5 h-5 text-rose-600" />}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search customers by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-100 rounded-lg focus:ring-1 focus:ring-indigo-500 text-sm bg-white shadow-sm"
        />
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all relative group hover:border-indigo-100"
            >
              <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(customer)}
                  className="text-gray-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(customer.id, customer.name)}
                  className="text-gray-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                  <User className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-base tracking-tight">
                      {customer.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider border ${customer.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                    >
                      {customer.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {customer.gstNumber && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">GST: {customer.gstNumber}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-gray-50/50 p-2 rounded-lg">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span className="truncate">{customer.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-gray-50/50 p-2 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span className="truncate">{customer.address || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50/50 border border-gray-50 rounded-xl mb-4">
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Orders</p>
                  <p className="text-sm font-bold text-gray-900">
                    {customer.totalOrders}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Balance</p>
                  <p className={`text-sm font-bold ${customer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {customer.balance > 0 ? 'Due' : 'Adv'} ₹{formatIndianRupees(Math.abs(customer.balance))}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Last Order</p>
                  <p className="text-[10px] font-bold text-gray-600 truncate">
                    {customer.lastOrderDate || 'Never'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentModal(customer)}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-100 flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" /> Receive Pay
                </button>
                <button
                  onClick={() => navigate('/ledger')}
                  className="flex-1 px-4 py-2 bg-white border border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-gray-50 hover:text-gray-600 transition-all flex items-center justify-center gap-2"
                >
                  <History className="w-4 h-4" /> History
                </button>
              </div>
            </div>
          ))}

          {filteredCustomers.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No customers found</p>
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => { setEditingCustomer(null); setFormData({ name: '', phone: '', email: '', address: '', gstNumber: '' }); setShowModal(true); }}
        className="fixed bottom-24 right-6 lg:bottom-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 flex items-center justify-center z-20"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add/Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{editingCustomer ? 'Update details' : 'New contact creation'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Customer Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm font-medium text-gray-700 outline-none" placeholder="e.g. John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Phone</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm font-medium text-gray-700 outline-none" placeholder="10-digit mobile" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">GST Number</label>
                  <input type="text" value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm font-medium text-gray-700 outline-none uppercase" placeholder="GSTIN" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Address</label>
                <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm font-medium text-gray-700 outline-none" rows={3} placeholder="Full communication address..." />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold text-xs uppercase tracking-widest rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-all active:scale-[0.98] shadow-sm shadow-indigo-100">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingCustomer ? <Edit2 size={16} /> : <Plus size={16} />)}
                  {editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-900">Receive Payment</h3>
                <p className="text-xs text-gray-500 mt-1">From: <span className="font-bold text-gray-800">{paymentModal.name}</span></p>
              </div>
              <button onClick={() => setPaymentModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={submitPayment} className="p-6 space-y-4">
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 text-center mb-4">
                <p className="text-[10px] uppercase font-bold text-rose-600 tracking-widest mb-1">Current Due</p>
                <p className="text-2xl font-bold text-rose-700">₹{formatIndianRupees(paymentModal.balance > 0 ? paymentModal.balance : 0)}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input type="number" required autoFocus value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 font-bold text-lg text-gray-900 outline-none" placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {['CASH', 'ONLINE', 'UPI'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMode(m)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${payMode === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Note (Optional)</label>
                <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm font-medium text-gray-700 outline-none" placeholder="Transaction ref, remarks..." />
              </div>

              <button type="submit" disabled={submitting} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 transition-all flex justify-center items-center gap-2 mt-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle size={18} />}
                Confirm Receipt
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const ContactSummaryCard = ({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm group hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 rounded-lg bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
        {icon}
      </div>
    </div>
    <div>
      <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-900 leading-none">{value}</div>
    </div>
  </div>
);


