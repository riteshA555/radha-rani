import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { updateOrderStatus } from '../../services/orderService';
import { useSettings } from '../../context/SettingsContext';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { Loader2, ArrowLeft, Printer } from 'lucide-react';

export function OrderPrint() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const { settings } = useSettings();
    const business = settings.business_profile;
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
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

                setOrder(orderData);

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

    if (loading) return <div className="h-screen flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Loading Invoice...</div>;

    if (!order) return <div className="p-8 text-center text-red-500">Order not found.</div>;

    return (
        <div className="bg-gray-100 min-h-screen p-4 print:bg-white print:p-0">
            {/* Toolbar - Hidden in Print */}
            <div className="max-w-[210mm] mx-auto mb-4 flex justify-between items-center print:hidden">
                <button
                    onClick={() => navigate('/orders')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft size={20} /> Back to Orders
                </button>

                <div className="flex items-center gap-3">
                    <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={updatingStatus}
                        className="px-3 py-2 border rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>

                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium"
                    >
                        <Printer size={20} /> Print Invoice
                    </button>
                </div>
            </div>

            {/* Invoice Page */}
            <div
                className="bg-white shadow-lg mx-auto p-10 print:shadow-none print:p-0"
                style={{
                    fontFamily: '"Inter", sans-serif',
                    maxWidth: '210mm',
                    minHeight: '297mm',
                    color: '#111827'
                }}
            >
                {/* Header / Business Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #111827', paddingBottom: '24px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                        {business?.logoUrl && (
                            <div style={{ width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #f3f4f6', padding: '10px' }}>
                                <img src={business.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                        )}
                        <div>
                            <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px', color: '#111827' }}>
                                {business?.businessName || 'Business Name'}
                            </h1>
                            <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#374151', maxWidth: '400px' }}>
                                {business?.address && <div style={{ fontWeight: 600 }}>{business.address}</div>}
                                <div style={{ fontWeight: 600 }}>
                                    {[business?.city, business?.state, business?.pincode].filter(Boolean).join(', ')}
                                </div>
                                <div style={{ marginTop: '6px', display: 'flex', gap: '15px' }}>
                                    {business?.phone && <span><strong>Phone:</strong> {business.phone}</span>}
                                    {business?.email && <span><strong>Email:</strong> {business.email}</span>}
                                </div>
                                {business?.gstin && <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#111827' }}><strong>GSTIN:</strong> {business.gstin}</div>}
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-block', padding: '8px 24px', background: '#111827', color: 'white', borderRadius: '8px', fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '2px' }}>
                            Tax Invoice
                        </div>
                        <div style={{ fontSize: '14px', color: '#111827' }}>
                            <div style={{ marginBottom: '4px' }}><strong>Invoice No:</strong> <span style={{ fontFamily: 'monospace', fontSize: '16px' }}>{order.order_number || `#${order.id.slice(0, 8)}`}</span></div>
                            <div><strong>Date:</strong> {new Date(order.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                            <div style={{ marginTop: '8px' }}>
                                <span style={{
                                    padding: '4px 12px', border: '1px solid #111827', borderRadius: '6px', fontSize: '12px', fontWeight: 800,
                                    textTransform: 'uppercase',
                                    background: order.status === 'Completed' ? '#111827' : 'transparent',
                                    color: order.status === 'Completed' ? '#fff' : '#111827'
                                }}>
                                    Status: {order.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Party Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
                    <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 900, letterSpacing: '1px' }}>Billing To</h3>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}>{order.customer_name}</div>
                        <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Premium Customer</div>
                    </div>
                    <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 900, letterSpacing: '1px' }}>Shipping Details</h3>
                        <div style={{ fontSize: '14px', color: '#475569', fontWeight: 600 }}>Standard Delivery Service</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Refer to billing address for delivery location.</div>
                    </div>
                </div>

                {/* Table */}
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#111827', color: 'white' }}>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>#</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Description</th>
                                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Qty</th>
                                <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Rate (₹)</th>
                                <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {order.order_items?.map((item: any, idx: number) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px' }}>{String(idx + 1).padStart(2, '0')}</td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>{item.description}</div>

                                        <div style={{ marginTop: '8px', spaceY: '4px' }}>
                                            {/* Base Breakdown */}
                                            <div style={{ fontSize: '12px', color: '#475569', display: 'flex', gap: '8px' }}>
                                                <span style={{ fontWeight: 600 }}>Base:</span>
                                                <span>{item.base_quantity || item.quantity} {item.unit} × ₹{item.base_rate || item.rate} = ₹{formatIndianRupees((item.base_quantity || item.quantity) * (item.base_rate || item.rate))}</span>
                                            </div>

                                            {/* Addon Breakdown */}
                                            {item.addon_service_id && (
                                                <div style={{ fontSize: '12px', color: '#b45309', display: 'flex', gap: '8px', marginTop: '4px' }}>
                                                    <span style={{ fontWeight: 600 }}>
                                                        {jobWorkItems.find(j => j.id === item.addon_service_id)?.name || 'Addon'}:
                                                    </span>
                                                    <span>{item.addon_quantity} PCS × ₹{item.addon_rate} = ₹{formatIndianRupees(item.addon_quantity * item.addon_rate)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>
                                        {item.addon_service_id ? (
                                            <div style={{ fontSize: '11px' }}>
                                                <div>{item.base_quantity || item.quantity} {item.unit}</div>
                                                <div style={{ color: '#b45309' }}>+ {item.addon_quantity} PCS</div>
                                            </div>
                                        ) : (
                                            <>{item.quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{item.unit}</span></>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>
                                        {item.addon_service_id ? '-' : formatIndianRupees(item.rate)}
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 900, color: '#111827' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '60px' }}>
                    <div>
                        {/* Bank Details */}
                        <div style={{ padding: '20px', border: '1px dashed #cbd5e1', borderRadius: '12px', marginBottom: '32px' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 900 }}>Payment Information</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 20px', fontSize: '12px', color: '#1e293b', fontWeight: 600 }}>
                                <span style={{ color: '#64748b' }}>Bank:</span> <span>{settings.invoice_settings?.bankName || '--'}</span>
                                <span style={{ color: '#64748b' }}>A/c No:</span> <span style={{ fontFamily: 'monospace' }}>{settings.invoice_settings?.accountNumber || '--'}</span>
                                <span style={{ color: '#64748b' }}>IFSC:</span> <span style={{ fontFamily: 'monospace' }}>{settings.invoice_settings?.ifscCode || '--'}</span>
                                <span style={{ color: '#64748b' }}>Branch:</span> <span>{settings.invoice_settings?.branchName || '--'}</span>
                            </div>
                        </div>

                        {/* Terms */}
                        <div style={{ fontSize: '11px', lineHeight: '1.6', color: '#64748b' }}>
                            <strong style={{ display: 'block', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Terms & Conditions:</strong>
                            {settings.business_profile?.termsAndConditions ? (
                                <div style={{ whiteSpace: 'pre-line' }}>{settings.business_profile.termsAndConditions}</div>
                            ) : (
                                <ul style={{ margin: '0', paddingLeft: '16px' }}>
                                    <li>Goods once sold will not be taken back.</li>
                                    <li>All disputes are subject to local jurisdiction.</li>
                                    <li>Interest @18% will be charged if not paid within due date.</li>
                                </ul>
                            )}
                        </div>
                    </div>

                    <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '2px solid #111827' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                            <span style={{ color: '#64748b', fontWeight: 700 }}>SUBTOTAL</span>
                            <span style={{ fontWeight: 800, color: '#1e293b' }}>₹{formatIndianRupees(order.subtotal || order.total_amount)}</span>
                        </div>
                        {order.gst_enabled && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                                <span style={{ color: '#64748b', fontWeight: 700 }}>GST ({order.gst_rate}%)</span>
                                <span style={{ fontWeight: 800, color: '#1e293b' }}>₹{formatIndianRupees(order.gst_amount || 0)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0 10px 0', marginTop: '10px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 900, color: '#111827', textTransform: 'uppercase' }}>Grand Total</span>
                            <span style={{ fontSize: '24px', fontWeight: 900, color: '#111827' }}>₹{formatIndianRupees(order.total_amount)}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'right', fontWeight: 700, fontStyle: 'italic', marginTop: '10px' }}>
                            Amount in words: Rupees {[order.total_amount].toLocaleString()} Only
                        </div>
                    </div>
                </div>

                {/* Signature */}
                <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ textAlign: 'center', minWidth: '220px' }}>
                        <div style={{ marginBottom: '60px', fontWeight: 900, fontSize: '14px', color: '#111827', textTransform: 'uppercase' }}>For {business?.businessName || 'Us'}</div>
                        <div style={{ borderTop: '2px solid #111827', paddingTop: '10px', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Authorized Signatory</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>This is a computer generated document</div>
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
