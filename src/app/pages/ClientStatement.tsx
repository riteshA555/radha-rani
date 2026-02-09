import { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Printer, Download, ArrowUpRight, ArrowDownLeft, Wallet, Loader2, FileText } from 'lucide-react';
import { getAssetLedgers, getClientStatementReport } from '../../services/accountingService';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { PageHeader } from '../components/ui/PageHeader';

export function ClientStatement() {
    const [customers, setCustomers] = useState<{ id: string, name: string }[]>([]);
    const [selectedLedgerId, setSelectedLedgerId] = useState('');
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Date Filters - Default to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);

    useEffect(() => {
        loadCustomers();
    }, []);

    useEffect(() => {
        if (selectedLedgerId) {
            fetchReport();
        } else {
            setReportData(null);
        }
    }, [selectedLedgerId, startDate, endDate]);

    const loadCustomers = async () => {
        try {
            const data = await getAssetLedgers();
            setCustomers(data || []);
        } catch (err) {
            console.error("Failed to load customers", err);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getClientStatementReport(selectedLedgerId, startDate, endDate);
            setReportData(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('report-content');
        if (!printContent) return;

        const win = window.open('', '', 'height=700,width=1000');
        if (win) {
            win.document.write('<html><head><title>Client Monthly Statement</title>');
            win.document.write('<style>');
            win.document.write(`
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
        th { background: #f4f4f4; padding: 12px 8px; text-align: left; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #ddd; }
        td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 50px; }
      `);
            win.document.write('</style></head><body>');

            win.document.write(`
        <div class="header">
          <div class="biz-name">Client Monthly Statement</div>
          <div class="report-title">Monthly Account Summary</div>
        </div>
        
        <div class="meta-grid">
          <div class="meta-box">
            <div class="meta-label">Client Name</div>
            <div class="meta-value">${customers.find(c => c.id === selectedLedgerId)?.name || 'Client'}</div>
          </div>
          <div class="meta-box">
            <div class="meta-label">Statement Period</div>
            <div class="meta-value">${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}</div>
          </div>
        </div>
        
        <div class="summary-grid">
          <div class="summary-box">
            <div class="summary-label">Opening Balance</div>
            <div class="summary-value">₹${formatIndianRupees(reportData.openingBalance)}</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Total Billed</div>
            <div class="summary-value">₹${formatIndianRupees(reportData.totalBilled)}</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Total Paid</div>
            <div class="summary-value">₹${formatIndianRupees(reportData.totalPaid)}</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Closing Balance</div>
            <div class="summary-value">₹${formatIndianRupees(reportData.closingBalance)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Particulars</th>
              <th class="text-right">Debit (Dr)</th>
              <th class="text-right">Credit (Cr)</th>
              <th class="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${new Date(startDate).toLocaleDateString()}</td>
              <td class="font-bold">Opening Balance</td>
              <td class="text-right">-</td>
              <td class="text-right">-</td>
              <td class="text-right font-bold">₹${formatIndianRupees(reportData.openingBalance)}</td>
            </tr>
            ${reportData.transactions.map((t: any) => `
              <tr>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.description}</td>
                <td class="text-right">${t.debit > 0 ? '₹' + formatIndianRupees(t.debit) : '-'}</td>
                <td class="text-right">${t.credit > 0 ? '₹' + formatIndianRupees(t.credit) : '-'}</td>
                <td class="text-right font-bold">₹${formatIndianRupees(t.balance)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">Generated on ${new Date().toLocaleString()}</div>
      `);

            win.document.write('</body></html>');
            win.document.close();
            win.print();
        }
    };

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            <PageHeader
                title="Client Monthly Statement"
                subtitle="Detailed financial report for clients with opening balance"
                actions={
                    reportData && (
                        <div className="flex gap-2">
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
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Select Client</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={selectedLedgerId}
                            onChange={e => setSelectedLedgerId(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white text-sm font-medium text-gray-700"
                        >
                            <option value="">-- Choose Client --</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="w-full md:w-44">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">From Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div className="w-full md:w-44">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">To Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {loading && (
                <div className="flex justify-center items-center py-20 text-gray-400 text-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                    <span>Generating Report...</span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center font-medium">
                    Error: {error}
                </div>
            )}

            {reportData && !loading && (
                <div id="report-content" className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <ReportSummaryCard
                            label="Opening Balance"
                            value={`₹${formatIndianRupees(reportData.openingBalance)}`}
                            icon={<ArrowUpRight className="w-5 h-5 text-gray-400" />}
                            statusText={reportData.openingBalance >= 0 ? "Receivable" : "Advance"}
                        />
                        <ReportSummaryCard
                            label="Total Billed"
                            value={`₹${formatIndianRupees(reportData.totalBilled)}`}
                            icon={<FileText className="w-5 h-5 text-indigo-600" />}
                        />
                        <ReportSummaryCard
                            label="Payments Received"
                            value={`₹${formatIndianRupees(reportData.totalPaid)}`}
                            icon={<ArrowDownLeft className="w-5 h-5 text-emerald-600" />}
                        />
                        <ReportSummaryCard
                            label="Closing Balance"
                            value={`₹${formatIndianRupees(reportData.closingBalance)}`}
                            icon={<Wallet className="w-5 h-5 text-amber-600" />}
                            statusText={reportData.closingBalance >= 0 ? "Final Receivable" : "Final Advance"}
                            highlight={reportData.closingBalance > 0}
                        />
                    </div>

                    {/* Detailed Table */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/10 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Statement Details</h3>
                            <div className="text-[10px] text-gray-500 font-bold">
                                {new Date(startDate).toLocaleDateString()} — {new Date(endDate).toLocaleDateString()}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Particulars</th>
                                        <th className="px-6 py-4 text-right">Debit (Dr)</th>
                                        <th className="px-6 py-4 text-right">Credit (Cr)</th>
                                        <th className="px-6 py-4 text-right bg-gray-50/60">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {/* Opening Balance Row */}
                                    <tr className="bg-indigo-50/30">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium text-xs">
                                            {new Date(startDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-black text-sm text-indigo-900 italic">
                                            Opening Balance Brought Forward
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-300">-</td>
                                        <td className="px-6 py-4 text-right text-gray-300">-</td>
                                        <td className="px-6 py-4 text-right font-black text-sm text-indigo-900 bg-indigo-50/50">
                                            ₹{formatIndianRupees(reportData.openingBalance)}
                                        </td>
                                    </tr>

                                    {reportData.transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-20 text-gray-400 italic text-sm">
                                                No transactions found in this period
                                            </td>
                                        </tr>
                                    ) : (
                                        reportData.transactions.map((t: any) => (
                                            <tr key={t.id} className="hover:bg-gray-50/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium text-xs">
                                                    {new Date(t.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900 font-bold text-sm">
                                                    {t.description}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-bold text-sm ${t.debit > 0 ? 'text-indigo-600' : 'text-gray-200'}`}>
                                                    {t.debit > 0 ? `₹${formatIndianRupees(t.debit)}` : '-'}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-bold text-sm ${t.credit > 0 ? 'text-emerald-600' : 'text-gray-200'}`}>
                                                    {t.credit > 0 ? `₹${formatIndianRupees(t.credit)}` : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-sm text-gray-700 bg-gray-50/30">
                                                    ₹{formatIndianRupees(t.balance)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {!selectedLedgerId && !loading && (
                <div className="flex flex-col items-center justify-center py-32 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">Select a client to generate the monthly statement</p>
                </div>
            )}
        </div>
    );
}

const ReportSummaryCard = ({ label, value, icon, statusText, highlight }: { label: string, value: string, icon: React.ReactNode, statusText?: string, highlight?: boolean }) => (
    <div className={`bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all ${highlight ? 'ring-2 ring-indigo-500/10 border-indigo-100' : ''}`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-lg bg-gray-50 text-gray-400 group-hover:scale-110 transition-transform ${highlight ? 'text-indigo-600 bg-indigo-50' : ''}`}>
                {icon}
            </div>
            {statusText && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${statusText.includes('Receivable') ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
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
