import { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, Calendar, Loader2 } from 'lucide-react';
import { getGSTOrders, getITCExpenses, calculateGSTSummary, getGSTCustomers, calculateGSTBreakdown, generateGSTR1CSV, downloadCSV } from '../../services/gstService';
import { getSettings, updateSettings } from '../../services/settingsService';
import { BusinessProfileSettings, GSTSettings, InvoiceSettings } from '../../types/settings';
import { Expense } from '../../services/expenseService';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/tabs';

import { generateGSTPrintHTML } from '../utils/GSTPrintTemplate';

export function GSTReports() {
  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfileSettings | null>(null);
  const [gstSettings, setGstSettings] = useState<GSTSettings | null>(null);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
  const [gstFilings, setGstFilings] = useState<any>({});

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [fyYear, setFyYear] = useState(new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'OUTPUT' | 'INPUT'>('OUTPUT');

  useEffect(() => {
    loadData();
  }, [month, viewMode, fyYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      if (viewMode === 'MONTHLY') {
        const [y, m] = month.split('-');
        startDate = `${month}-01`;
        endDate = new Date(Number(y), Number(m), 0).toISOString().split('T')[0];
      } else {
        startDate = `${fyYear}-04-01`;
        endDate = `${fyYear + 1}-03-31`;
      }

      const [outData, inData, bizData, gData, iData, filingsData, custData] = await Promise.all([
        getGSTOrders(startDate, endDate),
        getITCExpenses(startDate, endDate),
        getSettings<BusinessProfileSettings>('business_profile'),
        getSettings<GSTSettings>('gst_settings'),
        getSettings<InvoiceSettings>('invoice_settings'),
        getSettings<any>('gst_filings'),
        getGSTCustomers()
      ]);

      const enrichedOrders = outData.map((o: any) => ({
        ...o,
        customer: custData?.find((c: any) => c.id === o.customer_id)
      }));

      setOrders(enrichedOrders);
      setExpenses(inData);
      setBusinessProfile(bizData);
      setGstSettings(gData);
      setInvoiceSettings(iData);
      setGstFilings(filingsData || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const outputTotal = orders.reduce((sum, o) => sum + Number(o.gst_amount || 0), 0);
  const inputTotal = expenses.reduce((sum, e) => sum + Number(e.gst_amount || 0), 0);
  const netCredit = inputTotal - outputTotal;
  const OPENING_ITC = gstSettings?.itcOpeningBalance || 0;
  const carryForward = OPENING_ITC + inputTotal - outputTotal;

  // Calculate Breakdowns
  const companyState = businessProfile?.state || '';
  const outputBreakdown = calculateGSTBreakdown(orders, 'output', companyState);
  const inputBreakdown = calculateGSTBreakdown(expenses, 'input', companyState);
  const currentBreakdown = activeTab === 'OUTPUT' ? outputBreakdown : inputBreakdown;

  const handleExportCSV = (type: 'GSTR1' | 'GSTR3B') => {
    if (type === 'GSTR1') {
      const csv = generateGSTR1CSV(orders);
      downloadCSV(csv, `GSTR1_${month}.csv`);
    } else {
      alert("GSTR-3B CSV Export logic coming soon.");
    }
  };

  const handlePrint = (type: 'GSTR1' | 'GSTR3B') => {
    const html = generateGSTPrintHTML({
      type,
      period: month,
      businessProfile,
      orders: orders,
      expenses: expenses,
      breakdown: activeTab === 'OUTPUT' ? outputBreakdown : inputBreakdown
    });

    const win = window.open('', '', 'height=800,width=1200');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        title="GST Reports"
        subtitle="Manage Input/Output GST and Filings"
        actions={
          <div className="flex gap-2">
            <div className="flex bg-white rounded-lg border border-gray-300 shadow-sm overflow-hidden">
              <button
                onClick={() => handlePrint('GSTR1')}
                className="px-3 py-2 text-gray-700 hover:bg-gray-50 border-r border-gray-200 text-sm font-medium flex items-center gap-2"
                title="Print Detailed GSTR-1"
              >
                <FileText className="w-4 h-4" /> Print GSTR-1
              </button>
              <button
                onClick={() => handlePrint('GSTR3B')}
                className="px-3 py-2 text-gray-700 hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
                title="Print Summary GSTR-3B"
              >
                <TrendingUp className="w-4 h-4" /> GSTR-3B
              </button>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300 shadow-sm">
              <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)} className="bg-transparent text-sm font-semibold text-gray-700 outline-none">
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
              {viewMode === 'MONTHLY' ? (
                <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="text-sm border-none bg-transparent font-medium text-gray-600 outline-none" />
              ) : (
                <select value={fyYear} onChange={e => setFyYear(Number(e.target.value))} className="text-sm bg-transparent font-medium text-gray-600 outline-none">
                  <option value={2024}>FY 24-25</option>
                  <option value={2025}>FY 25-26</option>
                </select>
              )}
            </div>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
      ) : (
        <>
          {/* Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-green-600 text-sm font-bold mb-2">
                <ArrowUpRight className="w-4 h-4" /> Output GST (Collected)
              </div>
              <div className="text-2xl font-bold text-gray-900">₹{formatIndianRupees(outputTotal)}</div>
              <div className="text-xs text-gray-400 mt-1">Sales & Services</div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-amber-600 text-sm font-bold mb-2">
                <ArrowDownLeft className="w-4 h-4" /> Input GST (Paid)
              </div>
              <div className="text-2xl font-bold text-gray-900">₹{formatIndianRupees(inputTotal)}</div>
              <div className="text-xs text-gray-400 mt-1">Purchases & Expenses</div>
            </div>

            <div className={`p-6 rounded-xl border shadow-sm ${netCredit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <div className={`flex items-center gap-2 text-sm font-bold mb-2 ${netCredit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                <Wallet className="w-4 h-4" /> {netCredit >= 0 ? 'Net Credit Available' : 'Net Payable'}
              </div>
              <div className={`text-2xl font-bold ${netCredit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                ₹{formatIndianRupees(Math.abs(netCredit))}
              </div>
              <div className={`text-xs mt-1 ${netCredit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netCredit >= 0 ? 'To be carried forward' : 'To be paid in cash'}
              </div>
            </div>
          </div>

          {/* ITC Utilization */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">ITC Balance & Utilization</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-sm text-gray-500 font-medium mb-1">Opening Balance</div>
                <div className="text-xl font-bold">₹{formatIndianRupees(OPENING_ITC)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 font-medium mb-1">Total Available ITC</div>
                <div className="text-xl font-bold">₹{formatIndianRupees(OPENING_ITC + inputTotal)}</div>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                <div className="text-sm text-amber-700 font-bold mb-1">Carry Forward</div>
                <div className="text-xl font-bold text-amber-900">₹{formatIndianRupees(carryForward)}</div>
              </div>
            </div>
          </div>

          {/* Detailed View & Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 bg-gray-50/50">
              <Tabs
                activeTab={activeTab}
                onChange={setActiveTab}
                tabs={[
                  { id: 'OUTPUT', label: 'Output Register (GSTR-1)', icon: <ArrowUpRight className="w-4 h-4" /> },
                  { id: 'INPUT', label: 'Input Register (GSTR-2B)', icon: <ArrowDownLeft className="w-4 h-4" /> }
                ]}
              />

              {activeTab === 'OUTPUT' && (
                <button
                  onClick={() => handleExportCSV('GSTR1')}
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
              {/* Tax Breakdown Sidebar */}
              <div className="lg:col-span-1 bg-gray-50/30 p-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Tax Breakdown</h4>
                <div className="space-y-3">
                  {currentBreakdown.map((item) => (
                    <div key={item.rate} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-800">{item.rate}% GST</span>
                        <span className="text-xs text-gray-500">Taxable: ₹{formatIndianRupees(item.taxableValue)}</span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        {item.igst > 0 && <div className="flex justify-between"><span>IGST</span><span>₹{formatIndianRupees(item.igst)}</span></div>}
                        {item.cgst > 0 && <div className="flex justify-between"><span>CGST</span><span>₹{formatIndianRupees(item.cgst)}</span></div>}
                        {item.sgst > 0 && <div className="flex justify-between"><span>SGST</span><span>₹{formatIndianRupees(item.sgst)}</span></div>}
                        <div className="flex justify-between pt-1 border-t border-gray-100 font-bold text-gray-900 mt-1">
                          <span>Total</span>
                          <span>₹{formatIndianRupees(item.taxAmount)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {currentBreakdown.length === 0 && <div className="text-xs text-gray-400 italic text-center py-4">No data available</div>}
                </div>
              </div>

              {/* Main Table */}
              <div className="lg:col-span-3 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Invoice / Party</th>
                      <th className="px-4 py-3 text-right">Taxable</th>
                      <th className="px-4 py-3 text-center">Rate</th>
                      <th className="px-4 py-3 text-right">IGST</th>
                      <th className="px-4 py-3 text-right">CGST</th>
                      <th className="px-4 py-3 text-right">SGST</th>
                      <th className="px-4 py-3 text-right bg-gray-50">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {activeTab === 'OUTPUT' ? (
                      orders.length === 0 ? <EmptyRow /> : orders.map(o => {
                        // Helper for display logic
                        const stateMatch = !o.customer?.state || !companyState || o.customer.state.toLowerCase() === companyState.toLowerCase();
                        const tax = Number(o.gst_amount);
                        const igst = stateMatch ? 0 : tax;
                        const cgst = stateMatch ? tax / 2 : 0;
                        const sgst = stateMatch ? tax / 2 : 0;

                        return (
                          <tr key={o.id} className="hover:bg-gray-50 bg-white">
                            <td className="px-4 py-3 text-xs text-gray-500">{new Date(o.order_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{invoiceSettings?.invoicePrefix || ''}{o.order_number}</div>
                              <div className="text-xs text-gray-500">{o.customer?.name}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">₹{Number(o.subtotal).toLocaleString()}</td>
                            <td className="px-4 py-3 text-center text-xs bg-gray-50 rounded mx-2">{o.gst_rate}%</td>
                            <td className="px-4 py-3 text-right text-gray-400 text-xs">{igst > 0 ? `₹${igst.toFixed(0)}` : '-'}</td>
                            <td className="px-4 py-3 text-right text-gray-400 text-xs">{cgst > 0 ? `₹${cgst.toFixed(0)}` : '-'}</td>
                            <td className="px-4 py-3 text-right text-gray-400 text-xs">{sgst > 0 ? `₹${sgst.toFixed(0)}` : '-'}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900 bg-gray-50">₹{o.gst_amount.toLocaleString()}</td>
                          </tr>
                        )
                      })
                    ) : (
                      expenses.length === 0 ? <EmptyRow /> : expenses.map(e => {
                        // Assuming all expenses are Intra-state for now unless vendor state logic added
                        const tax = Number(e.gst_amount || 0);
                        const cgst = tax / 2;
                        const sgst = tax / 2;
                        return (
                          <tr key={e.id} className="hover:bg-gray-50 bg-white">
                            <td className="px-4 py-3 text-xs text-gray-500">{new Date(e.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{e.vendor_name || e.head}</div>
                              <div className="text-xs text-gray-500 font-mono">{e.invoice_number || '-'}</div>
                            </td>
                            {/* Simplified logic for expense taxable value */}
                            <td className="px-4 py-3 text-right font-medium">₹{(Number(e.amount) - (Number(e.gst_amount) || 0)).toLocaleString()}</td>
                            <td className="px-4 py-3 text-center text-xs bg-gray-50 rounded mx-2">{e.gst_rate}%</td>
                            <td className="px-4 py-3 text-right text-gray-400 text-xs">-</td>
                            <td className="px-4 py-3 text-right text-gray-400 text-xs">₹{cgst.toFixed(0)}</td>
                            <td className="px-4 py-3 text-right text-gray-400 text-xs">₹{sgst.toFixed(0)}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900 bg-gray-50">₹{(e.gst_amount || 0).toLocaleString()}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Print Styles */}
      <style>{`
            @media print {
                @page { size: A4 landscape; margin: 1cm; }
                body * { visibility: hidden; }
                .p-4, .p-4 * { visibility: visible; }
                .p-4 { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
                button, input, select { display: none !important; }
            }
      `}</style>
    </div>
  );
}

function EmptyRow() {
  return (
    <tr>
      <td colSpan={6} className="text-center py-12 text-gray-400">No records found for this period.</td>
    </tr>
  );
}
