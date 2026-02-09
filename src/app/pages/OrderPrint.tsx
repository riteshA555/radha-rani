import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { updateOrderStatus } from '../../services/orderService';
import { useSettings } from '../../context/SettingsContext';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { Loader2, ArrowLeft, Printer, Trash2, AlertTriangle } from 'lucide-react';
import { deleteOrder } from '../../services/orderService';

export function OrderPrint() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const { settings } = useSettings();
    const business = settings.business_profile;
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [jobWorkItems, setJobWorkItems] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                // Fetch Order
                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .select('*, order_items(*)')
                    .eq('id', id)
                    .single();

                if (orderError) throw orderError;

                // Fetch Customer Ledger to get current running balance
                const { data: ledgerData } = await supabase
                    .from('ledgers')
                    .select('running_balance')
                    .eq('name', orderData.customer_name)
                    .single();

                const currentBalance = Number(ledgerData?.running_balance || 0);

                // Use snapshots if available, otherwise fallback to calculation
                const balanceBefore = orderData.ledger_balance_before !== null && orderData.ledger_balance_before !== undefined
                    ? Number(orderData.ledger_balance_before)
                    : (currentBalance - Number(orderData.total_amount || 0) + Number(orderData.advance_amount || 0));

                const balanceAfter = orderData.ledger_balance_after !== null && orderData.ledger_balance_after !== undefined
                    ? Number(orderData.ledger_balance_after)
                    : currentBalance;

                setOrder({
                    ...orderData,
                    ledger_balance_before: orderData.ledger_balance_before !== null ? Number(orderData.ledger_balance_before) : balanceBefore,
                    ledger_balance_after: orderData.ledger_balance_after !== null ? Number(orderData.ledger_balance_after) : balanceAfter
                });

                // Fetch Job Work Items for names
                const { data: jwData } = await supabase.from('job_work_items').select('*');
                setJobWorkItems(jwData || []);
            } catch (err) {
                console.error("Error loading invoice:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    const handleStatusChange = async (newStatus: string) => {
        if (!order || !id) return;
        try {
            setUpdatingStatus(true);
            await updateOrderStatus(id, newStatus);
            setOrder({ ...order, status: newStatus });
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Failed to update status");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            setDeleting(true);
            await deleteOrder(id);
            navigate('/orders', { replace: true });
        } catch (err: any) {
            console.error("Failed to delete order", err);
            alert("Deletion Failed: " + err.message);
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Loading Invoice...</div>;

    if (!order) return <div className="p-8 text-center text-red-500">Order not found.</div>;

    return (
        <div className="bg-gray-100 min-h-screen p-4 print:bg-white print:p-0">
            {/* Toolbar - Hidden in Print */}
            <div className="max-w-full sm:max-w-[210mm] mx-auto mb-4 flex flex-col sm:flex-row gap-4 justify-between items-center print:hidden px-4 sm:px-0">
                <button
                    onClick={() => navigate('/orders')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 w-full sm:w-auto"
                >
                    <ArrowLeft size={20} /> Back to Orders
                </button>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
                    <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={updatingStatus}
                        className="flex-1 sm:flex-none px-3 py-2 border rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>

                    <button
                        onClick={() => window.print()}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium"
                    >
                        <Printer size={20} /> Print
                    </button>

                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={deleting}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-lg hover:bg-rose-600 hover:text-white transition shadow-sm font-medium border border-rose-100"
                    >
                        {deleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                        Delete
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[110] backdrop-blur-sm p-4 print:hidden">
                    <div className="bg-white rounded-[2rem] w-full max-w-[450px] shadow-2xl animate-scale-in overflow-hidden border border-gray-100">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle size={40} className="text-rose-500" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Revert Order?</h3>
                            <p className="text-gray-600 font-medium mb-8">
                                Deleting this order will <strong>revert stock</strong> and <strong>remove financial entries</strong>. This action is atomic and permanent.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="p-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold transition-all"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="p-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
                                >
                                    {deleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Page */}
            <div
                className="bg-white shadow-lg mx-auto p-6 sm:p-10 print:shadow-none print:p-0 w-full min-h-auto sm:min-h-[297mm]"
                style={{
                    fontFamily: '"Inter", sans-serif',
                    maxWidth: '210mm',
                    color: '#111827'
                }}
            >
                {/* Header / Business Info */}
                <div className="flex flex-col sm:flex-row justify-between border-b-[3px] border-[#111827] pb-6 mb-8 gap-6">
                    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start text-center sm:text-left">
                        {business?.logoUrl && (
                            <div className="w-20 h-20 sm:w-[100px] sm:h-[100px] rounded-xl overflow-hidden border border-gray-100 p-2.5">
                                <img src={business.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl sm:text-[32px] font-black leading-tight uppercase tracking-wider text-[#111827] mb-2">
                                {business?.businessName || 'Business Name'}
                            </h1>
                            <div className="text-xs sm:text-[13px] [line-height:1.6] text-[#374151] max-w-full sm:max-w-[400px]">
                                {business?.address && <div className="font-semibold">{business.address}</div>}
                                <div className="font-semibold">
                                    {[business?.city, business?.state, business?.pincode].filter(Boolean).join(', ')}
                                </div>
                                <div className="mt-1.5 flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1">
                                    {business?.phone && <span><strong>Phone:</strong> {business.phone}</span>}
                                    {business?.email && <span><strong>Email:</strong> {business.email}</span>}
                                </div>
                                {business?.gstin && <div className="mt-1 italic text-[#111827]"><strong>GSTIN:</strong> {business.gstin}</div>}
                            </div>
                        </div>
                    </div>
                    <div className="text-center sm:text-right flex flex-col items-center sm:items-end">
                        <div className="inline-block px-6 py-2 bg-[#111827] text-white rounded-lg text-sm sm:text-lg font-black uppercase mb-4 tracking-[2px]">
                            Tax Invoice
                        </div>
                        <div className="text-xs sm:text-[14px] text-[#111827]">
                            <div className="mb-1"><strong>Invoice No:</strong> <span className="font-mono text-sm sm:text-[16px]">{order.order_number || `#${order.id.slice(0, 8)}`}</span></div>
                            <div><strong>Date:</strong> {new Date(order.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                            <div className="mt-2">
                                <span className={`
                                    px-3 py-1 border border-[#111827] rounded-md text-[10px] sm:text-[12px] font-extrabold uppercase
                                    ${order.status === 'Completed' ? 'bg-[#111827] text-white' : 'bg-transparent text-[#111827]'}
                                `}>
                                    Status: {order.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Party Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 mb-10">
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                        <h3 className="m-0 mb-3 text-[10px] sm:text-[11px] uppercase text-slate-500 font-black tracking-wider">Billing To</h3>
                        <div className="text-lg sm:text-[20px] font-black text-slate-900 mb-1">{order.customer_name}</div>
                        <div className="text-xs sm:text-[13px] text-slate-600 font-semibold px-2 py-0.5 bg-white border border-slate-100 rounded inline-block">Premium Customer</div>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                        <h3 className="m-0 mb-3 text-[10px] sm:text-[11px] uppercase text-slate-500 font-black tracking-wider">Shipping Details</h3>
                        <div className="text-sm sm:text-[14px] text-slate-600 font-semibold">Standard Delivery Service</div>
                        <div className="text-xs sm:text-[13px] text-slate-400 mt-1">Refer to billing address for delivery location.</div>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-xl overflow-hidden border border-slate-200 mb-8 overflow-x-auto">
                    <table className="w-full border-collapse min-w-[600px] sm:min-w-0">
                        <thead>
                            <tr className="bg-[#111827] text-white">
                                <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase">#</th>
                                <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase">Description</th>
                                <th className="px-5 py-3.5 text-center text-[11px] font-extrabold uppercase">Qty</th>
                                <th className="px-5 py-3.5 text-right text-[11px] font-extrabold uppercase">Rate (₹)</th>
                                <th className="px-5 py-3.5 text-right text-[11px] font-extrabold uppercase">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {order.order_items?.map((item: any, idx: number) => (
                                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                                    <td className="px-5 py-4 text-slate-400 text-[13px]">{String(idx + 1).padStart(2, '0')}</td>
                                    <td className="px-5 py-4">
                                        <div className="font-extrabold text-slate-800 text-sm">{item.description}</div>

                                        <div className="mt-2 space-y-1">
                                            {/* Base Breakdown */}
                                            <div className="text-[11px] sm:text-[12px] text-slate-600 flex items-center gap-2">
                                                <span className="font-bold">Base:</span>
                                                <span>{item.base_quantity || item.quantity} {item.unit} × ₹{item.base_rate || item.rate} = ₹{formatIndianRupees((item.base_quantity || item.quantity) * (item.base_rate || item.rate))}</span>
                                            </div>

                                            {/* Addon Breakdown */}
                                            {item.addon_service_id && (
                                                <div className="text-[11px] sm:text-[12px] text-amber-700 flex items-center gap-2 bg-amber-50 px-1.5 py-0.5 rounded w-fit">
                                                    <span className="font-bold">
                                                        {jobWorkItems.find(j => j.id === item.addon_service_id)?.name || 'Addon'}:
                                                    </span>
                                                    <span>{item.addon_quantity} PCS × ₹{item.addon_rate} = ₹{formatIndianRupees(item.addon_quantity * item.addon_rate)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-center font-bold text-slate-700">
                                        {item.addon_service_id ? (
                                            <div className="text-[11px]">
                                                <div className="text-slate-900">{item.base_quantity || item.quantity} {item.unit}</div>
                                                <div className="text-amber-700">+ {item.addon_quantity} PCS</div>
                                            </div>
                                        ) : (
                                            <div className="text-slate-900">{item.quantity} <span className="text-[10px] text-slate-400 font-normal ml-1">{item.unit}</span></div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-right font-bold text-slate-700 text-sm">
                                        {item.addon_service_id ? '-' : formatIndianRupees(item.rate)}
                                    </td>
                                    <td className="px-5 py-4 text-right font-black text-[#111827] text-base">
                                        {formatIndianRupees(item.amount || (
                                            ((item.base_quantity || item.quantity) * (item.base_rate || item.rate)) +
                                            ((item.addon_quantity || 0) * (item.addon_rate || 0))
                                        ))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals & Notes */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-16">
                    <div>
                        {/* Bank Details */}
                        <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl mb-8">
                            <h4 className="m-0 mb-4 text-[11px] font-black uppercase text-slate-400 tracking-wider">Payment Information</h4>
                            <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-xs sm:text-[13px] text-slate-700 font-bold">
                                <span className="text-slate-400 uppercase text-[10px]">Bank:</span> <span>{settings.invoice_settings?.bankName || '--'}</span>
                                <span className="text-slate-400 uppercase text-[10px]">A/c No:</span> <span className="font-mono">{settings.invoice_settings?.accountNumber || '--'}</span>
                                <span className="text-slate-400 uppercase text-[10px]">IFSC:</span> <span className="font-mono">{settings.invoice_settings?.ifscCode || '--'}</span>
                                <span className="text-slate-400 uppercase text-[10px]">Branch:</span> <span>{settings.invoice_settings?.branchName || '--'}</span>
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="text-[11px] leading-[1.6] text-slate-500">
                            <strong className="block text-slate-700 mb-2 uppercase font-black tracking-wide">Terms & Conditions:</strong>
                            {settings.business_profile?.termsAndConditions ? (
                                <div className="whitespace-pre-line">{settings.business_profile.termsAndConditions}</div>
                            ) : (
                                <ul className="m-0 pl-4 list-disc space-y-1">
                                    <li>Goods once sold will not be taken back.</li>
                                    <li>All disputes are subject to local jurisdiction.</li>
                                    <li>Interest @18% will be charged if not paid within due date.</li>
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 bg-slate-50 rounded-[2rem] border-2 border-[#111827] shadow-xl shadow-slate-100 h-fit">
                        <div className="flex justify-between items-center py-2.5 border-b border-slate-200 text-[13px] sm:text-[14px]">
                            <span className="text-slate-500 font-bold uppercase tracking-wider">Subtotal</span>
                            <span className="font-black text-slate-900">₹{formatIndianRupees(order.subtotal || order.total_amount)}</span>
                        </div>
                        {order.gst_enabled && (
                            <div className="flex justify-between items-center py-2.5 border-b border-slate-200 text-[13px] sm:text-[14px]">
                                <span className="text-slate-500 font-bold uppercase tracking-wider">GST ({order.gst_rate}%)</span>
                                <span className="font-black text-slate-900">₹{formatIndianRupees(order.gst_amount || 0)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-end py-6 mt-2">
                            <span className="text-sm font-black uppercase text-[#111827]">Grand Total</span>
                            <span className="text-3xl font-black text-[#111827] leading-none">₹{formatIndianRupees(order.total_amount)}</span>
                        </div>

                        {/* RUNNING BALANCE SUMMARY */}
                        <div className="mt-6 pt-6 border-t-2 border-[#111827]">
                            <div className="text-[11px] font-black uppercase text-slate-500 mb-5 tracking-[2px] text-center">
                                {order.include_ledger_balance ? 'Account Summary / खाता विवरण' : 'Bill Summary / विल विवरण'}
                            </div>
                            <div className="space-y-3">
                                {order.include_ledger_balance ? (
                                    <>
                                        <div className="flex justify-between text-[12px] sm:text-[13px]">
                                            <span className="text-slate-600 font-bold">Previous Bal:</span>
                                            <span className="font-black text-slate-900">₹{formatIndianRupees(Math.abs(Number(order.ledger_balance_before || 0)))} {Number(order.ledger_balance_before || 0) >= 0 ? '(Dr)' : '(Cr)'}</span>
                                        </div>
                                        <div className="flex justify-between text-[12px] sm:text-[13px]">
                                            <span className="text-slate-600 font-bold">Current Bill:</span>
                                            <span className="font-black text-slate-900">₹{formatIndianRupees(order.total_amount)}</span>
                                        </div>
                                        <div className="flex justify-between text-[12px] sm:text-[13px]">
                                            <span className="text-emerald-600 font-black">Paid Amount:</span>
                                            <span className="font-black text-emerald-600">- ₹{formatIndianRupees(order.advance_amount || 0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-[#111827] text-white rounded-2xl text-base font-black mt-6 shadow-lg shadow-slate-200">
                                            <span className="text-[11px] uppercase tracking-wider">Final Bal:</span>
                                            <span className="text-xl">₹{formatIndianRupees(Math.abs(Number(order.ledger_balance_after || 0)))}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between text-[12px] sm:text-[13px]">
                                            <span className="text-slate-600 font-bold">Bill Total:</span>
                                            <span className="font-black text-slate-900">₹{formatIndianRupees(order.total_amount)}</span>
                                        </div>
                                        <div className="flex justify-between text-[12px] sm:text-[13px]">
                                            <span className="text-emerald-600 font-black">Paid Today:</span>
                                            <span className="font-black text-emerald-600">₹{formatIndianRupees(order.advance_amount || 0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-[#111827] text-white rounded-2xl text-base font-black mt-6 shadow-lg shadow-slate-200">
                                            <span className="text-[11px] uppercase tracking-wider">Balance Due:</span>
                                            <span className="text-xl">₹{formatIndianRupees(Math.max(0, order.total_amount - (order.advance_amount || 0)))}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="text-[10px] sm:text-[11px] text-slate-400 text-right font-bold italic mt-4 px-2">
                            Rupees {[order.total_amount].toLocaleString()} Only
                        </div>
                    </div>
                </div>

                {/* Signature */}
                <div className="mt-16 flex justify-center sm:justify-end">
                    <div className="text-center min-w-[220px]">
                        <div className="mb-14 font-black text-sm text-[#111827] uppercase tracking-wider">For {business?.businessName || 'Us'}</div>
                        <div className="border-t-2 border-[#111827] pt-3 text-[12px] font-extrabold text-slate-500 uppercase tracking-widest">Authorized Signatory</div>
                        <div className="text-[10px] text-slate-300 mt-1">This is a computer generated document</div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { margin: 10mm; }
                    body { background: white; }
                    .no-print, nav, header, aside { display: none !important; }
                }
            `}</style>
        </div>
    );
}
