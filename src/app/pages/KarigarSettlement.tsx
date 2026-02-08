import { useState, useEffect } from 'react';
import { Search, Calendar, Printer, CreditCard, ArrowUpRight, ArrowDownLeft, Wallet, Loader2, Hammer, Plus, X } from 'lucide-react';
import { getKarigars, getKarigarSettlementReport, recordKarigarPayment } from '../../services/karigarService';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { PageHeader } from '../components/ui/PageHeader';

export function KarigarSettlement() {
    const [karigars, setKarigars] = useState<any[]>([]);
    const [selectedKarigar, setSelectedKarigar] = useState('');
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Date Filters - Default to current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    // Payment Modal State
    const [showPayModal, setShowPayModal] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payMode, setPayMode] = useState('CASH');
    const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
    const [payNotes, setPayNotes] = useState('');
    const [paying, setPaying] = useState(false);

    useEffect(() => {
        loadKarigars();
    }, []);

    useEffect(() => {
        if (selectedKarigar) {
            fetchReport();
        } else {
            setReportData(null);
        }
    }, [selectedKarigar, selectedMonth]);

    const loadKarigars = async () => {
        try {
            const data = await getKarigars();
            setKarigars(data || []);
        } catch (err) {
            console.error("Failed to load karigars", err);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getKarigarSettlementReport(selectedKarigar, selectedMonth);
            setReportData(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedKarigar || !payAmount) return;

        setPaying(true);
        try {
            await recordKarigarPayment(selectedKarigar, Number(payAmount), payMode, payDate, payNotes);
            setShowPayModal(false);
            setPayAmount('');
            setPayNotes('');
            fetchReport(); // Refresh report
        } catch (err: any) {
            alert(err.message);
        } finally {
            setPaying(false);
        }
    };

    const handlePrint = () => {
        if (!reportData) return;
        const karigarName = karigars.find(k => k.id === selectedKarigar)?.name || 'Karigar';

        const win = window.open('', '', 'height=700,width=1000');
        if (win) {
            win.document.write(`
        <html>
          <head>
            <title>Karigar Settlement Statement - ${selectedMonth}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #111; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
              .biz-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .report-title { font-size: 18px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
              .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .meta-box { background: #f9f9f9; padding: 15px; border-radius: 8px; }
              .meta-label { font-size: 10px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 5px; }
              .meta-value { font-size: 16px; font-weight: bold; }
              
              .summary-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 10px; margin-bottom: 30px; }
              .summary-box { border: 1px solid #eee; padding: 15px; border-radius: 8px; text-align: center; }
              .summary-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
              .summary-value { font-size: 18px; font-weight: bold; }
              
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { background: #f4f4f4; padding: 12px 8px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #ddd; }
              td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .footer { text-align: center; font-size: 10px; color: #999; margin-top: 50px; }
              .type-tag { font-size: 10px; font-weight: bold; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="biz-name">Karigar Monthly Settlement</div>
              <div class="report-title">Monthly Account Statement</div>
            </div>
            
            <div class="meta-grid">
              <div class="meta-box">
                <div class="meta-label">Karigar Name</div>
                <div class="meta-value">${karigarName}</div>
              </div>
              <div class="meta-box">
                <div class="meta-label">Statement Period</div>
                <div class="meta-value">${selectedMonth}</div>
              </div>
            </div>
            
            <div class="summary-grid">
              <div class="summary-box">
                <div class="summary-label">Opening Due</div>
                <div class="summary-value">₹${formatIndianRupees(reportData.openingDue)}</div>
              </div>
              <div class="summary-box">
                <div class="summary-label">Total Work (Month)</div>
                <div class="summary-value">₹${formatIndianRupees(reportData.totalWorkMonth)}</div>
              </div>
              <div class="summary-box">
                <div class="summary-label">Total Paid (Month)</div>
                <div class="summary-value">₹${formatIndianRupees(reportData.totalPaidMonth)}</div>
              </div>
              <div class="summary-box">
                <div class="summary-label">Closing Due</div>
                <div class="summary-value">₹${formatIndianRupees(reportData.closingDue)}</div>
              </div>
            </div>

            <h3>Work Records</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order/Job Ref</th>
                  <th>Description</th>
                  <th>Weight/Qty</th>
                  <th>Rate</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.workRecords.map((r: any) => `
                  <tr>
                    <td>${new Date(r.work_date).toLocaleDateString()}</td>
                    <td>${r.order_id ? 'Order: ' + r.order_id.substring(0, 8) : 'Manual Job'}</td>
                    <td>${r.description || 'N/A'}</td>
                    <td>${r.quantity} gm/pcs</td>
                    <td>${r.rate}</td>
                    <td class="text-right font-bold">₹${formatIndianRupees(r.amount)}</td>
                  </tr>
                `).join('')}
                ${reportData.workRecords.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding: 20px; color:#999;">No work records this month</td></tr>' : ''}
              </tbody>
            </table>

            <h3>Payments Recorded</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Notes</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.payments.map((p: any) => `
                  <tr>
                    <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                    <td>${p.payment_mode}</td>
                    <td>${p.notes || ''}</td>
                    <td class="text-right font-bold">₹${formatIndianRupees(p.amount)}</td>
                  </tr>
                `).join('')}
                ${reportData.payments.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 20px; color:#999;">No payments recorded this month</td></tr>' : ''}
              </tbody>
            </table>
            
            <div class="footer">Generated on ${new Date().toLocaleString()}</div>
          </body>
        </html>
      `);
            win.document.close();
            win.print();
        }
    };

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            <PageHeader
                title="Karigar Settlement Report"
                subtitle="Monthly work and payment tracking for artisans"
                actions={
                    reportData && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowPayModal(true)}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium"
                            >
                                <Plus className="w-5 h-5" /> Record Payment
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium"
                            >
                                <Printer className="w-5 h-5" /> Print Statement
                            </button>
                        </div>
                    )
                }
            />

            {/* Filters */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 min-w-[250px] w-full">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Select Karigar</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={selectedKarigar}
                            onChange={e => setSelectedKarigar(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white text-sm font-medium text-gray-700"
                        >
                            <option value="">-- Choose Karigar --</option>
                            {karigars.map(k => <option key={k.id} value={k.id}>{k.name} ({k.work_type})</option>)}
                        </select>
                    </div>
                </div>

                <div className="w-full md:w-44">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Select Month</label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {loading && (
                <div className="flex flex-col justify-center items-center py-20 text-gray-400 text-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                    <span>Calculating monthly settlement...</span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center font-medium">
                    Error: {error}
                </div>
            )}

            {reportData && !loading && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <SummaryCard
                            label="Opening Due"
                            value={`₹${formatIndianRupees(reportData.openingDue)}`}
                            icon={<ArrowUpRight className="w-5 h-5 text-gray-400" />}
                            statusText={reportData.openingDue >= 0 ? "Payable" : "Advance"}
                        />
                        <SummaryCard
                            label="Work Done (Month)"
                            value={`₹${formatIndianRupees(reportData.totalWorkMonth)}`}
                            icon={<Hammer className="w-5 h-5 text-indigo-600" />}
                        />
                        <SummaryCard
                            label="Paid (Month)"
                            value={`₹${formatIndianRupees(reportData.totalPaidMonth)}`}
                            icon={<ArrowDownLeft className="w-5 h-5 text-emerald-600" />}
                        />
                        <SummaryCard
                            label="Closing Due"
                            value={`₹${formatIndianRupees(reportData.closingDue)}`}
                            icon={<Wallet className="w-5 h-5 text-amber-600" />}
                            statusText={reportData.closingDue >= 0 ? "Final Payable" : "Final Advance"}
                            highlight={reportData.closingDue > 0}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Work Records Table */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/10 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Work Records</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Ref</th>
                                            <th className="px-4 py-3 text-right">Qty/Rate</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reportData.workRecords.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center py-10 text-gray-400 italic text-xs">No work found</td>
                                            </tr>
                                        ) : (
                                            reportData.workRecords.map((r: any) => (
                                                <tr key={r.id} className="hover:bg-gray-50/30 transition-colors">
                                                    <td className="px-4 py-4 whitespace-nowrap text-gray-500 font-medium text-xs">
                                                        {new Date(r.work_date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="text-xs font-bold text-gray-900 truncate max-w-[100px]" title={r.description}>
                                                            {r.order_id ? `Order ${r.order_id.substring(0, 6)}` : r.description || 'Manual Job'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-gray-500 text-xs">
                                                        {r.quantity} × {r.rate}
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-indigo-600 font-bold text-xs whitespace-nowrap">
                                                        ₹{formatIndianRupees(r.amount)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Payments Records Table */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/10 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Payments</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Mode</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reportData.payments.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="text-center py-10 text-gray-400 italic text-xs">No payments found</td>
                                            </tr>
                                        ) : (
                                            reportData.payments.map((p: any) => (
                                                <tr key={p.id} className="hover:bg-gray-50/30 transition-colors">
                                                    <td className="px-4 py-4 whitespace-nowrap text-gray-500 font-medium text-xs">
                                                        {new Date(p.payment_date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase tracking-tighter">
                                                            {p.payment_mode}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-emerald-600 font-bold text-xs whitespace-nowrap">
                                                        ₹{formatIndianRupees(p.amount)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!selectedKarigar && !loading && (
                <div className="flex flex-col items-center justify-center py-32 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Hammer size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">Select a karigar to view their settlement report</p>
                </div>
            )}

            {/* Payment Modal */}
            {showPayModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                <CreditCard className="text-indigo-600 w-5 h-5" /> Record Settlement
                            </h3>
                            <button onClick={() => setShowPayModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handlePayment} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Payment Amount (₹)</label>
                                <input
                                    autoFocus
                                    type="number"
                                    required
                                    value={payAmount}
                                    onChange={e => setPayAmount(e.target.value)}
                                    placeholder="Enter amount to pay"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Payment Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={payDate}
                                        onChange={e => setPayDate(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Payment Mode</label>
                                    <select
                                        value={payMode}
                                        onChange={e => setPayMode(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                    >
                                        <option value="CASH">CASH</option>
                                        <option value="UPI">UPI / PHONEPE</option>
                                        <option value="BANK">BANK TRANSFER</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Additional Notes</label>
                                <textarea
                                    value={payNotes}
                                    onChange={e => setPayNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Reference number, month notes, etc."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={paying}
                                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                Confirm & Record Payment
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const SummaryCard = ({ label, value, icon, statusText, highlight }: { label: string, value: string, icon: React.ReactNode, statusText?: string, highlight?: boolean }) => (
    <div className={`bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all ${highlight ? 'ring-2 ring-indigo-500/10 border-indigo-100' : ''}`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-lg bg-gray-50 text-gray-400 group-hover:scale-110 transition-transform ${highlight ? 'text-indigo-600 bg-indigo-50' : ''}`}>
                {icon}
            </div>
            {statusText && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${statusText.includes('Payable') ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                    {statusText}
                </span>
            )}
        </div>
        <div>
            <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</div>
            <div className={`text-xl font-bold text-gray-900 leading-none ${highlight ? 'text-2xl font-black' : ''}`}>{value}</div>
        </div>
    </div>
);
