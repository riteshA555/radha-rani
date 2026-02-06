import { useState, useEffect } from 'react';
import { Search, Plus, Calendar, Download, Printer, ArrowUpRight, ArrowDownLeft, Wallet, Loader2, X, IndianRupee } from 'lucide-react';
import { getCustomerStatement, getAssetLedgers, recordPayment, CustomerLedger } from '../../services/accountingService';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { PageHeader } from '../components/ui/PageHeader';

export function Ledger() {
  const [customers, setCustomers] = useState<{ id: string, name: string }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [transactions, setTransactions] = useState<CustomerLedger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Date Filters
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0].substring(0, 8) + '01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Payment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', mode: 'Cash', note: '' });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchStatement();
    } else {
      setTransactions([]);
    }
  }, [selectedCustomer, startDate, endDate]);

  const loadCustomers = async () => {
    try {
      const data = await getAssetLedgers();
      setCustomers(data || []);
    } catch (err) {
      console.error("Failed to load customers", err);
    }
  };

  const fetchStatement = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCustomerStatement(selectedCustomer, startDate, endDate);
      setTransactions(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSubmitting(true);
    try {
      const customer = customers.find(c => c.name === selectedCustomer);
      if (!customer) throw new Error("Customer not found");

      await recordPayment(
        customer.id,
        Number(payForm.amount),
        payForm.mode,
        payForm.note
      );

      setShowPayModal(false);
      setPayForm({ amount: '', mode: 'Cash', note: '' });
      fetchStatement();
      alert("Payment recorded successfully");
    } catch (err: any) {
      alert('Payment Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalDebit = transactions.reduce((sum, t) => sum + Number(t.debit), 0);
  const totalCredit = transactions.reduce((sum, t) => sum + Number(t.credit), 0);
  const balance = totalDebit - totalCredit;

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      {/* Header */}
      <PageHeader
        title="Customer Ledger"
        subtitle="View statements and record payments"
        actions={
          selectedCustomer && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const printContent = document.getElementById('ledger-table');
                  const win = window.open('', '', 'height=700,width=1000');
                  if (win && printContent) {
                    win.document.write('<html><head><title>Ledger Statement</title>');
                    win.document.write('<style>body{font-family:sans-serif; padding: 20px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background-color:#f4f4f4;} .text-right{text-align:right;} .header{margin-bottom:20px; text-align:center;} </style>');
                    win.document.write('</head><body>');
                    win.document.write(`<div class="header"><h1>${selectedCustomer}</h1><p>Statement from ${startDate} to ${endDate}</p></div>`);
                    win.document.write(printContent.innerHTML);
                    win.document.write('</body></html>');
                    win.document.close();
                    win.print();
                  }
                }}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium"
              >
                <Printer className="w-5 h-5" /> Print
              </button>
              <button
                onClick={() => setShowPayModal(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm font-medium"
              >
                <Plus className="w-5 h-5" /> Receive Payment
              </button>
            </div>
          )
        }
      />

      {/* Selection & Constraints */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 min-w-[250px] w-full">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Select Customer</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white text-sm font-medium text-gray-700"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {selectedCustomer && (
          <>
            <div className="w-full md:w-44">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="w-full md:w-44">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4" /> {error}
        </div>
      )}

      {selectedCustomer && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <LedgerSummaryCard
              label="Total Billed (Dr)"
              value={`₹${formatIndianRupees(totalDebit)}`}
              icon={<ArrowUpRight className="w-5 h-5 text-indigo-600" />}
            />
            <LedgerSummaryCard
              label="Total Received (Cr)"
              value={`₹${formatIndianRupees(totalCredit)}`}
              icon={<ArrowDownLeft className="w-5 h-5 text-emerald-600" />}
            />
            <LedgerSummaryCard
              label="Balance Due"
              value={`₹${formatIndianRupees(balance)}`}
              icon={<Wallet className="w-5 h-5 text-amber-600" />}
              isWarning={balance > 0}
            />
          </div>

          {/* Transactions Table */}
          <div id="ledger-table" className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-20 text-gray-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin mr-3 text-indigo-600" /> Loading Ledger...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">Debit (Dr)</th>
                      <th className="px-6 py-4 text-right">Credit (Cr)</th>
                      <th className="px-6 py-4 text-right bg-gray-50/60">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm italic">No transactions found for this period.</td></tr>
                    ) : (
                      transactions.map((t, idx) => (
                        <tr key={t.id || idx} className="hover:bg-gray-50/30 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium text-xs">
                            {new Date(t.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900 text-sm">
                            {t.description}
                          </td>
                          <td className={`px-6 py-4 text-right font-bold text-sm ${t.debit > 0 ? 'text-indigo-600' : 'text-gray-200'}`}>
                            {t.debit > 0 ? `₹${formatIndianRupees(Number(t.debit))}` : '-'}
                          </td>
                          <td className={`px-6 py-4 text-right font-bold text-sm ${t.credit > 0 ? 'text-emerald-600' : 'text-gray-200'}`}>
                            {t.credit > 0 ? `₹${formatIndianRupees(Number(t.credit))}` : '-'}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-sm text-gray-700 bg-gray-50/30">
                            ₹{formatIndianRupees(Number(t.balance))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Payment</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Record incoming funds</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  autoFocus
                  value={payForm.amount}
                  onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl text-2xl font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Payment Mode</label>
                <select
                  value={payForm.mode}
                  onChange={e => setPayForm({ ...payForm, mode: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm font-bold text-gray-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option>Cash</option>
                  <option>Online / UPI</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Notes</label>
                <input
                  type="text"
                  value={payForm.note}
                  onChange={e => setPayForm({ ...payForm, note: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Payment remarks..."
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm shadow-indigo-100"
                >
                  {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <IndianRupee size={16} />}
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const LedgerSummaryCard = ({ label, value, icon, isWarning }: { label: string, value: string, icon: React.ReactNode, isWarning?: boolean }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 rounded-lg bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
        {icon}
      </div>
      {isWarning && (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 uppercase tracking-wider border border-amber-100">
          Due
        </span>
      )}
    </div>
    <div>
      <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-900 leading-none">{value}</div>
    </div>
  </div>
);
