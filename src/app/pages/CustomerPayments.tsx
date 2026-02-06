import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Receipt, History, Search, Loader2, X, Filter, User, ArrowDownRight, ArrowUpRight, Wallet, Banknote, CreditCard } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/tabs';
import { addCustomerPayment, getCustomerLedgerEntries, getCustomersForPayment } from '../../services/paymentService';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { format } from 'date-fns';

export function CustomerPayments() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [activeTab, setActiveTab] = useState<'RECEIPT' | 'LEDGER'>('RECEIPT');
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Filters for Ledger
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const [form, setForm] = useState({
        customerId: '',
        amount: '',
        mode: 'Cash',
        date: format(new Date(), 'yyyy-MM-dd'),
        remarks: ''
    });

    const loadCustomers = useCallback(async () => {
        try {
            setLoadingCustomers(true);
            const data = await getCustomersForPayment();
            setCustomers(data || []);
        } catch (err) {
            console.error('Failed to load customers', err);
        } finally {
            setLoadingCustomers(false);
        }
    }, []);

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    const loadLedger = useCallback(async () => {
        if (!selectedCustomer) return;
        setLoading(true);
        try {
            const data = await getCustomerLedgerEntries(selectedCustomer, startDate, endDate);
            setLedgerEntries(data || []);
        } catch (err) {
            console.error('Failed to load ledger', err);
        } finally {
            setLoading(false);
        }
    }, [selectedCustomer, startDate, endDate]);

    useEffect(() => {
        if (activeTab === 'LEDGER') {
            loadLedger();
        }
    }, [activeTab, loadLedger]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.customerId || !form.amount) {
            alert('Please select customer and enter amount');
            return;
        }

        setSubmitting(true);
        try {
            await addCustomerPayment(
                form.customerId,
                Number(form.amount),
                form.mode,
                form.remarks
            );
            alert('Payment recorded successfully!');
            setShowModal(false);
            setForm({
                customerId: '',
                amount: '',
                mode: 'Cash',
                date: format(new Date(), 'yyyy-MM-dd'),
                remarks: ''
            });
            if (activeTab === 'LEDGER') loadLedger();
        } catch (err: any) {
            alert('Error recording payment: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const currentCustomerBalance = useMemo(() => {
        if (ledgerEntries.length === 0) return 0;
        return ledgerEntries[0].balance; // Since ledger is sorted newest first
    }, [ledgerEntries]);

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            <PageHeader
                title="Customer Payments"
                subtitle="Record lump-sum receipts and track customer ledgers"
                actions={
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium"
                    >
                        <Plus className="w-5 h-5" /> Record Receipt
                    </button>
                }
            />

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <Tabs
                    activeTab={activeTab}
                    onChange={(tab: any) => setActiveTab(tab)}
                    tabs={[
                        { id: 'RECEIPT', label: 'Payment Receipts', icon: <Receipt size={18} /> },
                        { id: 'LEDGER', label: 'Customer Ledger', icon: <History size={18} /> }
                    ]}
                />

                <div className="p-6">
                    {activeTab === 'RECEIPT' ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800">Recent Receipts</h3>
                            </div>
                            <div className="text-center py-20 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium italic">Use the "Record Receipt" button to log a new payment.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Ledger Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Select Customer</label>
                                    <select
                                        value={selectedCustomer}
                                        onChange={(e) => setSelectedCustomer(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900"
                                    >
                                        <option value="">Choose a customer...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">From Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">To Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900"
                                    />
                                </div>
                            </div>

                            {selectedCustomer ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Statement for</h4>
                                            <div className="text-2xl font-black text-gray-900">{selectedCustomer}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Current Balance</div>
                                            <div className={`text-2xl font-black ${currentCustomerBalance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                ₹{formatIndianRupees(Math.abs(currentCustomerBalance))}
                                                <span className="text-xs ml-1 uppercase">{currentCustomerBalance >= 0 ? 'Due' : 'Adv'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto border border-gray-100 rounded-xl">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                                                <tr>
                                                    <th className="px-6 py-4">Date</th>
                                                    <th className="px-6 py-4">Description</th>
                                                    <th className="px-6 py-4 text-right">Debit (Job Work)</th>
                                                    <th className="px-6 py-4 text-right">Credit (Paid)</th>
                                                    <th className="px-6 py-4 text-right">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {loading ? (
                                                    <tr><td colSpan={5} className="py-10 text-center text-gray-400 italic">Loading ledger...</td></tr>
                                                ) : ledgerEntries.length === 0 ? (
                                                    <tr><td colSpan={5} className="py-10 text-center text-gray-400 italic">No transactions in this period.</td></tr>
                                                ) : (
                                                    ledgerEntries.map((t, i) => (
                                                        <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">
                                                                {format(new Date(t.date), 'dd MMM yyyy')}
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-900 font-bold">
                                                                {t.description}
                                                            </td>
                                                            <td className="px-6 py-4 text-right text-rose-600 font-bold">
                                                                {t.debit > 0 ? `₹${formatIndianRupees(t.debit)}` : '—'}
                                                            </td>
                                                            <td className="px-6 py-4 text-right text-emerald-600 font-bold">
                                                                {t.credit > 0 ? `₹${formatIndianRupees(t.credit)}` : '—'}
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-gray-900">
                                                                ₹{formatIndianRupees(Math.abs(t.balance))}
                                                                <span className="text-[10px] ml-1 text-gray-400">{t.balance >= 0 ? 'D' : 'C'}</span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-gray-50/30 rounded-xl border border-dashed border-gray-200">
                                    <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 font-medium italic">Please select a customer to view their statement.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Receipt Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Record Customer Payment</h2>
                                <p className="text-sm text-gray-500 font-medium">Lump-sum receipt from client</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Select Customer</label>
                                <select
                                    required
                                    value={form.customerId}
                                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">Select customer...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Amount (₹)</label>
                                    <input
                                        type="number" required
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Date</label>
                                    <input
                                        type="date" required
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Payment Mode</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Cash', 'Bank', 'UPI'].map(mode => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setForm({ ...form, mode })}
                                            className={`py-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${form.mode === mode
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {mode === 'Cash' && <Wallet size={14} />}
                                            {mode === 'Bank' && <Banknote size={14} />}
                                            {mode === 'UPI' && <CreditCard size={14} />}
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Remarks / Notes</label>
                                <textarea
                                    value={form.remarks}
                                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    placeholder="Optional notes"
                                    rows={3}
                                />
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
                                    {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Receipt size={16} />}
                                    Save Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
