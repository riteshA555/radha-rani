import { useState, useEffect } from 'react';
import {
    TrendingUp,
    TrendingDown,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Printer,
    Calendar,
    Wallet,
    DollarSign
} from 'lucide-react';
import { getPLReport, PLData } from '../../services/accountingService';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { PageHeader } from '../components/ui/PageHeader';

export function ProfitLoss() {
    const [data, setData] = useState<PLData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Date Filters - Default to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);

    useEffect(() => {
        loadData();
    }, [startDate, endDate]);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const report = await getPLReport(startDate, endDate);
            setData(report);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        if (!data) return;
        const win = window.open('', '', 'height=700,width=1000');
        if (win) {
            win.document.write(`
        <html>
          <head>
            <title>Profit & Loss Report</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #111; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
              .biz-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .report-title { font-size: 18px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
              .period { font-size: 13px; color: #999; margin-top: 5px; }
              
              .summary-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 10px; margin-bottom: 30px; }
              .summary-box { border: 1px solid #eee; padding: 15px; border-radius: 8px; text-align: center; }
              .summary-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
              .summary-value { font-size: 16px; font-weight: bold; }
              
              .section-title { font-size: 14px; font-weight: bold; font-black text-gray-900 uppercase tracking-widest mb-4 mt-8 pb-2 border-b-2 border-gray-100; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th { background: #f9f9f9; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #666; }
              td { padding: 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .income-row { color: #059669; }
              .expense-row { color: #dc2626; }
              .total-row { background: #f9fafb; font-weight: bold; border-top: 2px solid #eee; }
              .footer { text-align: center; font-size: 10px; color: #999; margin-top: 50px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="biz-name">Financial Statement</div>
              <div class="report-title">Profit & Loss Account</div>
              <div class="period">For the period ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}</div>
            </div>

            <div class="summary-grid">
              <div class="summary-box">
                <div class="summary-label">Total Income</div>
                <div class="summary-value">₹${formatIndianRupees(data.totalIncome)}</div>
              </div>
              <div class="summary-box">
                <div class="summary-label">Total Expense</div>
                <div class="summary-value">₹${formatIndianRupees(data.totalExpenses)}</div>
              </div>
              <div class="summary-box">
                <div class="summary-label">Gross Profit</div>
                <div class="summary-value">₹${formatIndianRupees(data.grossProfit)}</div>
              </div>
              <div class="summary-box">
                <div class="summary-label">Net Profit</div>
                <div class="summary-value" style="color: ${data.netProfit >= 0 ? '#059669' : '#dc2626'}">₹${formatIndianRupees(data.netProfit)}</div>
              </div>
            </div>

            <div class="section-title">Income / राजस्व</div>
            <table>
              <thead>
                <tr>
                  <th>Particulars</th>
                  <th class="text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="income-row">
                  <td>Product Sales Income (Own Material)</td>
                  <td class="text-right font-bold">₹${formatIndianRupees(data.productSalesIncome)}</td>
                </tr>
                <tr class="income-row">
                  <td>Job Work Income (Client Material)</td>
                  <td class="text-right font-bold">₹${formatIndianRupees(data.jobWorkIncome)}</td>
                </tr>
                <tr class="total-row">
                  <td>Total Income (A)</td>
                  <td class="text-right">₹${formatIndianRupees(data.totalIncome)}</td>
                </tr>
              </tbody>
            </table>

            <div class="section-title">Expenses / व्यय</div>
            <table>
              <thead>
                <tr>
                  <th>Particulars</th>
                  <th class="text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="expense-row">
                  <td>Karigar Labour Payments</td>
                  <td class="text-right font-bold">₹${formatIndianRupees(data.karigarExpenses)}</td>
                </tr>
                <tr class="expense-row">
                  <td>Staff Salary</td>
                  <td class="text-right font-bold">₹${formatIndianRupees(data.staffSalary)}</td>
                </tr>
                <tr class="expense-row">
                  <td>Rent</td>
                  <td class="text-right font-bold">₹${formatIndianRupees(data.rent)}</td>
                </tr>
                <tr class="expense-row">
                  <td>Electricity</td>
                  <td class="text-right font-bold">₹${formatIndianRupees(data.electricity)}</td>
                </tr>
                <tr class="expense-row">
                  <td>Other Operational Expenses</td>
                  <td class="text-right font-bold">₹${formatIndianRupees(data.otherExpenses)}</td>
                </tr>
                <tr class="total-row">
                  <td>Total Expenses (B)</td>
                  <td class="text-right">₹${formatIndianRupees(data.totalExpenses)}</td>
                </tr>
              </tbody>
            </table>

            <div class="section-title">Net Result</div>
            <table>
              <tbody>
                <tr>
                  <td class="font-bold">Gross Profit (Total Income - Karigar Labour)</td>
                  <td class="text-right font-bold">₹${formatIndianRupees(data.grossProfit)}</td>
                </tr>
                <tr class="total-row" style="font-size: 16px;">
                  <td class="font-bold">Net Profit / (Loss) (A - B)</td>
                  <td class="text-right font-bold" style="color: ${data.netProfit >= 0 ? '#059669' : '#dc2626'}">
                    ₹${formatIndianRupees(data.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div class="footer">Sorted by SterlingFlow ERP • Generated on ${new Date().toLocaleString()}</div>
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
                title="Profit & Loss Report"
                subtitle="Comprehensive financial performance statement"
                actions={
                    data && (
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium"
                        >
                            <Printer className="w-5 h-5" /> Export P&L
                        </button>
                    )
                }
            />

            {/* Date Filters */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-56">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">From Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                <div className="w-full md:w-56">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">To Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                <div className="flex-1 text-right text-[10px] text-gray-400 italic mb-2">
                    * Taxable subtotals are used for income calculation.
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col justify-center items-center py-32 text-gray-400 text-sm">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                    <p className="font-bold uppercase tracking-widest">Aggregating Ledgers...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 text-red-600 p-8 rounded-2xl text-center font-bold">
                    {error}
                </div>
            ) : data ? (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatsCard
                            label="Total Income"
                            value={`₹${formatIndianRupees(data.totalIncome)}`}
                            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                            subText="Revenue generated"
                        />
                        <StatsCard
                            label="Total Expenses"
                            value={`₹${formatIndianRupees(data.totalExpenses)}`}
                            icon={<TrendingDown className="w-5 h-5 text-rose-600" />}
                            subText="Operational costs"
                        />
                        <StatsCard
                            label="Gross Profit"
                            value={`₹${formatIndianRupees(data.grossProfit)}`}
                            icon={<DollarSign className="w-5 h-5 text-indigo-600" />}
                            subText="After labour costs"
                        />
                        <StatsCard
                            label="Net Profit"
                            value={`₹${formatIndianRupees(data.netProfit)}`}
                            icon={<Wallet className="w-5 h-5 text-amber-600" />}
                            subText="Final bottom line"
                            highlight={data.netProfit >= 0}
                            isNegative={data.netProfit < 0}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Income Breakdown */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue Breakdown / आय</h3>
                                <span className="text-[10px] font-bold text-emerald-600">INFLOW</span>
                            </div>
                            <div className="p-4 flex-1">
                                <div className="space-y-4">
                                    <BreakdownItem
                                        label="Product Sales (Own Material)"
                                        value={data.productSalesIncome}
                                        color="emerald"
                                    />
                                    <BreakdownItem
                                        label="Job Work Income (Client Material)"
                                        value={data.jobWorkIncome}
                                        color="emerald"
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-emerald-50/50 border-t border-emerald-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-emerald-900 uppercase tracking-tighter">Total Revenue (Gross)</span>
                                <span className="text-sm font-black text-emerald-700">₹{formatIndianRupees(data.totalIncome)}</span>
                            </div>
                        </div>

                        {/* Expense Breakdown */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expense Breakdown / खर्च</h3>
                                <span className="text-[10px] font-bold text-rose-600">OUTFLOW</span>
                            </div>
                            <div className="p-4 flex-1">
                                <div className="space-y-3">
                                    <BreakdownItem label="Karigar Labour" value={data.karigarExpenses} color="rose" />
                                    <BreakdownItem label="Staff Salary" value={data.staffSalary} color="rose" />
                                    <BreakdownItem label="Rent" value={data.rent} color="rose" />
                                    <BreakdownItem label="Electricity" value={data.electricity} color="rose" />
                                    <BreakdownItem label="Other Expenses" value={data.otherExpenses} color="rose" />
                                </div>
                            </div>
                            <div className="p-4 bg-rose-50/50 border-t border-rose-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-rose-900 uppercase tracking-tighter">Total Expenditures</span>
                                <span className="text-sm font-black text-rose-700">₹{formatIndianRupees(data.totalExpenses)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Summary Line */}
                    <div className={`p-8 rounded-3xl border text-center transition-all ${data.netProfit >= 0 ? 'bg-emerald-600 border-emerald-500 shadow-xl shadow-emerald-200' : 'bg-rose-600 border-rose-500 shadow-xl shadow-rose-200'}`}>
                        <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Final Performance Indicator</div>
                        <div className="text-4xl font-black text-white tracking-tighter mb-1">
                            ₹{formatIndianRupees(data.netProfit)}
                        </div>
                        <div className="text-xs font-bold text-white/90">
                            {data.netProfit >= 0 ? "Congratulations! The business is in Profit." : "Attention: The business is incurring a Loss."}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function StatsCard({ label, value, icon, subText, highlight, isNegative }: any) {
    return (
        <div className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all ${highlight ? 'ring-2 ring-emerald-500/20' : ''} ${isNegative ? 'ring-2 ring-rose-500/20' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 rounded-xl bg-gray-50 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                {highlight && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 uppercase tracking-tighter animate-pulse">
                        Healthy
                    </span>
                )}
            </div>
            <div>
                <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</div>
                <div className={`text-xl font-black text-gray-900 leading-none mb-1 ${isNegative ? 'text-rose-600' : ''}`}>{value}</div>
                <div className="text-[10px] text-gray-400 font-medium">{subText}</div>
            </div>
        </div>
    );
}

function BreakdownItem({ label, value, color }: { label: string, value: number, color: 'emerald' | 'rose' }) {
    return (
        <div className="flex justify-between items-center group">
            <div className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full ${color === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-tight text-[11px]">{label}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className={`text-sm font-black ${color === 'emerald' ? 'text-emerald-600' : 'text-gray-900 text-opacity-80'}`}>₹{formatIndianRupees(value)}</span>
            </div>
        </div>
    );
}
