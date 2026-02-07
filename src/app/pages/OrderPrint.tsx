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
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                        {business?.logoUrl && (
                            <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                <img src={business.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                        )}
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {business?.businessName || 'Business Name'}
                            </h1>
                            <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#4b5563' }}>
                                {business?.address && <div>{business.address}</div>}
                                {business?.city && <span>{business.city}, </span>}
                                {business?.state && <span>{business.state}</span>}
                                {business?.pincode && <span> - {business.pincode}</span>}
                                {business?.phone && <div style={{ marginTop: '4px' }}><strong>Phone:</strong> {business.phone}</div>}
                                {business?.email && <div><strong>Email:</strong> {business.email}</div>}
                                {business?.gstin && <div style={{ marginTop: '4px' }}><strong>GSTIN:</strong> {business.gstin}</div>}
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#6b7280', margin: '0 0 10px 0', textTransform: 'uppercase' }}>Tax Invoice</h2>
                        <div style={{ fontSize: '14px' }}>
                            <div><strong>Invoice No:</strong> {order.order_number || `#${order.id.slice(0, 6)}`}</div>
                            <div><strong>Date:</strong> {new Date(order.order_date).toLocaleDateString('en-IN')}</div>
                            <div style={{ marginTop: '5px' }}>
                                <span style={{
                                    padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                                    background: order.status === 'Completed' ? '#dcfce7' : '#f3f4f6',
                                    color: order.status === 'Completed' ? '#166534' : '#374151'
                                }}>
                                    {order.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Customer Details */}
                <div style={{ marginBottom: '30px', padding: '15px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Bill To</h3>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{order.customer_name}</div>
                </div>

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                    <thead>
                        <tr style={{ background: '#111827', color: 'white' }}>
                            <th style={{ padding: '12px', textAlign: 'left', borderRadius: '4px 0 0 4px' }}>#</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Item Description</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Qty</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Rate</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderRadius: '0 4px 4px 0' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.order_items?.map((item: any, idx: number) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '12px', color: '#6b7280' }}>{idx + 1}</td>
                                <td style={{ padding: '12px', fontWeight: 600 }}>{item.description}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity} {item.unit}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>₹{formatIndianRupees(item.rate)}</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>₹{formatIndianRupees(item.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <div style={{ width: '250px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                            <span style={{ color: '#6b7280' }}>Subtotal</span>
                            <span style={{ fontWeight: 600 }}>₹{formatIndianRupees(order.subtotal || order.total_amount)}</span>
                        </div>
                        {order.gst_enabled && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                                <span style={{ color: '#6b7280' }}>GST ({order.gst_rate}%)</span>
                                <span style={{ fontWeight: 600 }}>₹{formatIndianRupees(order.gst_amount || 0)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '18px', fontWeight: 800, color: '#111827', borderTop: '2px solid #111827', marginTop: '10px' }}>
                            <span>Grand Total</span>
                            <span>₹{formatIndianRupees(order.total_amount)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Content */}
                <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '12px' }}>
                    <div style={{ maxWidth: '60%' }}>
                        {business?.termsAndConditions ? (
                            <>
                                <strong style={{ color: '#6b7280' }}>Terms & Conditions:</strong>
                                <p style={{ marginTop: '5px', whiteSpace: 'pre-line', color: '#6b7280' }}>{business.termsAndConditions}</p>
                            </>
                        ) : (
                            <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>Thank you for your business!</div>
                        )}
                    </div>

                    <div style={{ textAlign: 'center', minWidth: '150px' }}>
                        <div style={{ marginBottom: '40px', fontWeight: 600 }}>For {business?.businessName || 'Us'}</div>
                        <div style={{ borderTop: '1px solid #000', paddingTop: '5px' }}>Authorized Signatory</div>
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
