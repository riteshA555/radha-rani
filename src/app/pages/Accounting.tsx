import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, PieChart, ArrowUpRight, ArrowDownRight, Loader2, DollarSign, Filter } from 'lucide-react';
import { getPLReport, PLData } from '../../services/accountingService';
import { formatIndianRupees } from '../../shared/utils/formatters';

type FilterType = 'THIS_MONTH' | 'LAST_MONTH' | 'ALL';

export function Accounting() {
  const [data, setData] = useState<PLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterType>('THIS_MONTH');

  useEffect(() => {
    loadData();
  }, [filter]); // Reload when filter changes

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

      const report = await getPLReport(start, end);
      setData(report);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Error loading financial data: {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex justify-between items-start md:items-center mb-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Financial Dashboard</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Profit & Loss Overview
            </p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg">
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AccSummaryCard
          title="Gross Income"
          value={data.jobWorkIncome + data.productSalesIncome}
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
          subTitle="Sales & Services"
        />
        <AccSummaryCard
          title="Total Expenses"
          value={data.totalExpenses}
          icon={<TrendingDown className="w-5 h-5" />}
          color="rose"
          subTitle="Operational & Labour"
        />
        <AccSummaryCard
          title="Net Profit"
          value={data.netProfit}
          icon={<PieChart className="w-5 h-5" />}
          color="indigo"
          subTitle="Final Earnings"
        />
      </div>

      {/* Breakdown Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Income & Expense Breakdown</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <BreakdownRow
              label="Job Work / Service Income"
              value={data.jobWorkIncome}
              type="income"
            />
            <BreakdownRow
              label="Product Sales Income"
              value={data.productSalesIncome}
              type="income"
            />
            <div className="border-t border-gray-50 my-4"></div>
            <BreakdownRow
              label="Karigar Payments (Labour)"
              value={data.karigarExpenses}
              type="expense"
            />
            <BreakdownRow
              label="General Operating Expenses"
              value={data.generalExpenses}
              type="expense"
            />

            <div className="border-t border-gray-100 mt-6 pt-6 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Net Statement</span>
                <span className="text-sm font-bold text-gray-900">Cumulative Profit</span>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold tracking-tight ${data.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{formatIndianRupees(data.netProfit)}
                </span>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Post-expenses</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-center text-gray-400 italic mt-4">
        * GST collected is not included in Profit calculation.
      </div>
    </div>
  );
}

function AccSummaryCard({ title, value, icon, color, subTitle }: any) {
  const colorMap: any = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600' }
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm group hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-lg ${c.bg} ${c.text}`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</div>
        <div className="text-xl font-bold text-gray-900 leading-none mb-1">₹{formatIndianRupees(value)}</div>
        <div className="text-[11px] text-gray-500 font-medium">{subTitle}</div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, type }: any) {
  const isIncome = type === 'income';
  return (
    <div className="flex justify-between items-center py-2 group">
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-full ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {isIncome ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        </div>
        <span className="text-sm font-bold text-gray-700">{label}</span>
      </div>
      <span className={`text-sm font-bold ${isIncome ? 'text-gray-900' : 'text-gray-500'}`}>
        {isIncome ? '+' : '-'} ₹{formatIndianRupees(value)}
      </span>
    </div>
  );
}
