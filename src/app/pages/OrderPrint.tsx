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
                className="invoice-container bg-white shadow-2xl mx-auto p-8 sm:p-12 my-8 print:shadow-none print:m-0 print:p-0 w-full"
                style={{
                    fontFamily: '"Inter", sans-serif',
                    maxWidth: '210mm',
                    color: '#000',
                    lineHeight: '1.4'
                }}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-900">
                    <div className="flex gap-4 items-start">
                        {business?.logoUrl && (
                            <div className="w-16 h-16 object-contain">
                                <img src={business.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold uppercase tracking-tight text-gray-900 mb-1">
                                {business?.businessName || 'Business Name'}
                            </h1>
                            <div className="text-[11px] text-gray-600 leading-snug max-w-[300px]">
                                {business?.address && <div>{business.address}</div>}
                                <div>
                                    {[business?.city, business?.state, business?.pincode].filter(Boolean).join(', ')}
                                </div>
                                <div className="mt-1">
                                    {business?.phone && <span className="mr-3">Ph: {business.phone}</span>}
                                    {business?.email && <span>Email: {business.email}</span>}
                                </div>
                                {business?.gstin && <div className="mt-1 font-medium text-gray-900">GSTIN: {business.gstin}</div>}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-light text-gray-400 uppercase tracking-[4px] mb-2">{order.is_quotation ? 'QUOTATION' : 'INVOICE'}</h2>
                        <div className="text-[12px] text-gray-900">
                            <div className="mb-1">
                                <span className="text-gray-500 mr-2 uppercase text-[10px]">Invoice No:</span>
                                <span className="font-semibold font-mono text-base">
                                    {settings.invoice_settings?.invoicePrefix || ''}{order.order_number || `#${order.id.slice(0, 8)}`}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 mr-2 uppercase text-[10px]">Date:</span>
                                <span className="font-medium">
                                    {new Date(order.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Billing Info */}
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">Bill To</div>
                        <div className="text-lg font-bold text-gray-900 leading-none mb-1">{order.customer_name}</div>
                        <div className="text-[11px] text-gray-600">Premium Customer</div>
                    </div>
                    {/* Add shipping info if distinct, otherwise keep minimal */}
                </div>

                {/* Table */}
                <div className="mb-8">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-900">
                                <th className="py-2 text-left text-[10px] uppercase font-bold text-gray-900 w-10">SR</th>
                                <th className="py-2 text-left text-[10px] uppercase font-bold text-gray-900">Item Description</th>
                                {settings.invoice_settings?.showHsnCode && (
                                    <th className="py-2 text-center text-[10px] uppercase font-bold text-gray-900 w-20">HSN</th>
                                )}
                                <th className="py-2 text-center text-[10px] uppercase font-bold text-gray-900 w-20">Qty</th>
                                <th className="py-2 text-right text-[10px] uppercase font-bold text-gray-900 w-24">Rate</th>
                                <th className="py-2 text-right text-[10px] uppercase font-bold text-gray-900 w-24">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.order_items?.map((item: any, idx: number) => (
                                <tr key={item.id} className="border-b border-gray-100">
                                    <td className="py-3 text-[11px] text-gray-500 align-top">{String(idx + 1).padStart(2, '0')}</td>
                                    <td className="py-3 text-[12px] text-gray-900 font-medium align-top">
                                        <div>{item.description}</div>
                                        {(item.base_quantity || item.addon_service_id) && (
                                            <div className="text-[10px] text-gray-500 mt-1">
                                                {item.base_quantity && (
                                                    <span>Base: {item.base_quantity} {item.unit} @ {item.base_rate}</span>
                                                )}
                                                {item.addon_service_id && (
                                                    <span className={item.base_quantity ? "ml-3 border-l pl-3 border-gray-300" : ""}>
                                                        Addon: {jobWorkItems.find(j => j.id === item.addon_service_id)?.name} ({item.addon_quantity} pcs @ {item.addon_rate})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    {settings.invoice_settings?.showHsnCode && (
                                        <td className="py-3 text-center text-[11px] text-gray-600 align-top">{item.hsn_code || '-'}</td>
                                    )}
                                    <td className="py-3 text-center text-[11px] text-gray-900 align-top">
                                        {item.quantity} {item.unit}
                                    </td>
                                    <td className="py-3 text-right text-[11px] text-gray-900 align-top">
                                        {item.addon_service_id ? '-' : formatIndianRupees(item.rate)}
                                    </td>
                                    <td className="py-3 text-right text-[12px] font-bold text-gray-900 align-top">
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

                {/* Old Gold / Exchange */}
                {order.old_gold_details && order.old_gold_details.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-gray-100">
                        <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2">Old Gold Exchange</h4>
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-50">
                                    <th className="text-left font-normal pb-1">Description</th>
                                    <th className="text-center font-normal pb-1">Gross Wt</th>
                                    <th className="text-center font-normal pb-1">Purity</th>
                                    <th className="text-right font-normal pb-1">Net Wt</th>
                                    <th className="text-right font-normal pb-1">Rate</th>
                                    <th className="text-right font-normal pb-1 text-gray-900">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.old_gold_details.map((og: any, i: number) => (
                                    <tr key={i} className="text-gray-600">
                                        <td className="py-1">{og.description}</td>
                                        <td className="text-center py-1">{og.weight}g</td>
                                        <td className="text-center py-1">{og.purity}%</td>
                                        <td className="text-right py-1">{Number(og.net_weight).toFixed(3)}g</td>
                                        <td className="text-right py-1">{formatIndianRupees(og.rate)}</td>
                                        <td className="text-right py-1 font-bold text-gray-900">{formatIndianRupees(og.value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer Section: Notes & Totals */}
                <div className="flex flex-col sm:flex-row gap-8">
                    {/* Left Side: Bank & Terms */}
                    <div className="flex-1">
                        <div className="mb-6">
                            <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2">Bank Details</h4>
                            <div className="text-[11px] text-gray-800 grid grid-cols-[60px_1fr] gap-y-1">
                                <span className="text-gray-500">Bank:</span> <span className="font-medium">{settings.invoice_settings?.bankName || '-'}</span>
                                <span className="text-gray-500">A/c No:</span> <span className="font-mono">{settings.invoice_settings?.accountNumber || '-'}</span>
                                <span className="text-gray-500">IFSC:</span> <span className="font-mono">{settings.invoice_settings?.ifscCode || '-'}</span>
                                <span className="text-gray-500">Branch:</span> <span>{settings.invoice_settings?.branchName || '-'}</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2">Terms & Conditions</h4>
                            <div className="text-[10px] text-gray-500 leading-relaxed whitespace-pre-line">
                                {settings.business_profile?.termsAndConditions ||
                                    "1. Goods once sold will not be taken back.\n2. Interest @18% charged if not paid by due date.\n3. Subject to local jurisdiction."
                                }
                            </div>

                            {settings.invoice_settings?.paymentQrUrl && (
                                <div className="mt-6 flex flex-col items-start gap-1">
                                    <div className="w-20 h-20 bg-white border border-gray-200 p-1 rounded-sm">
                                        <img
                                            src={settings.invoice_settings.paymentQrUrl}
                                            className="w-full h-full object-contain"
                                            alt="Pay"
                                        />
                                    </div>
                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest pl-1">Scan to Pay</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Totals */}
                    <div className="w-full sm:w-1/3 min-w-[250px]">
                        <div className="space-y-2 text-[12px] text-gray-700 pb-4 border-b border-gray-200">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="font-semibold text-gray-900">₹{formatIndianRupees(order.subtotal || order.total_amount)}</span>
                            </div>
                            {order.gst_enabled && (
                                <div className="flex justify-between">
                                    <span>GST ({order.gst_rate}%)</span>
                                    <span className="font-semibold text-gray-900">₹{formatIndianRupees(order.gst_amount || 0)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-gray-900 pt-2">
                                <span>Gross Total</span>
                                <span>₹{formatIndianRupees(order.total_amount)}</span>
                            </div>
                            {Number(order.old_gold_value || 0) > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <span>Old Gold (-)</span>
                                    <span>- ₹{formatIndianRupees(order.old_gold_value)}</span>
                                </div>
                            )}
                        </div>

                        <div className="py-4">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-base font-bold text-gray-900">Net Payable</span>
                                <span className="text-2xl font-black text-gray-900">₹{formatIndianRupees(Number(order.total_amount) - Number(order.old_gold_value || 0))}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 text-right italic">
                                ({Number(order.advance_amount) > 0 ? `Paid: ₹${formatIndianRupees(order.advance_amount)}` : 'Unpaid'})
                            </div>
                        </div>

                        {/* Balance Summary Minimal */}
                        {order.include_ledger_balance && (
                            <div className="bg-gray-50 p-3 rounded text-[11px] mt-2 border border-gray-100">
                                <div className="flex justify-between mb-1">
                                    <span className="text-gray-500">Prev Balance</span>
                                    <span>₹{formatIndianRupees(Math.abs(Number(order.ledger_balance_before || 0)))} {Number(order.ledger_balance_before || 0) >= 0 ? 'Dr' : 'Cr'}</span>
                                </div>
                                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200 mt-1">
                                    <span>Balance Due</span>
                                    <span>₹{formatIndianRupees(Math.abs(Number(order.ledger_balance_after || 0)))}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Signature */}
                <div className="mt-12 pt-8 flex justify-between items-end">
                    <div className="text-[10px] text-gray-400">
                        This is a computer generated invoice.
                    </div>
                    <div className="text-center flex flex-col items-center justify-end h-32 w-48 relative">
                        <div className="text-[11px] font-bold text-gray-900 uppercase tracking-widest absolute top-0 w-full">For {business?.businessName}</div>

                        {settings.invoice_settings?.signatureUrl && (
                            <div className="absolute bottom-6 left-0 right-0 mx-auto w-32 h-16 mix-blend-multiply pointer-events-none z-10">
                                <img
                                    src={settings.invoice_settings.signatureUrl}
                                    className="w-full h-full object-contain opacity-90"
                                    alt="Sign"
                                    style={{ mixBlendMode: 'multiply' }}
                                />
                            </div>
                        )}

                        <div className="border-t border-gray-900 w-40 z-0"></div>
                        <div className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider">Authorized Signatory</div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { 
                        size: A4;
                        margin: 0; 
                    }
                    body { 
                        background: white !important;
                        margin: 0 !important; 
                        padding: 0 !important;
                        width: 210mm !important;
                        height: 297mm !important;
                    }
                    .no-print, nav, header, aside, .print\\:hidden { 
                        display: none !important; 
                    }
                    
                    /* Reset main wrapper */
                    .bg-gray-100 {
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }

                    /* Invoice Container */
                    .invoice-container {
                        width: 210mm !important;
                        min-height: 297mm !important;
                        margin: 0 !important;
                        padding: 15mm 15mm !important; /* 15mm standard margin */
                        box-sizing: border-box !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        background: white !important;
                        box-shadow: none !important;
                        max-width: none !important;
                    }

                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>
        </div>
    );
}
