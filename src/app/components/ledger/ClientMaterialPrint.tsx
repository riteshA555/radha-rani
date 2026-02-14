import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format, parse } from 'date-fns';
import { ClientMaterialTransaction, ClientMaterialBalance } from '../../../types';

interface ClientMaterialPrintProps {
    clientName: string;
    balance: ClientMaterialBalance | undefined;
    transactions: ClientMaterialTransaction[];
    shopName?: string;
    businessProfile?: any;
}

export const ClientMaterialPrint: React.FC<ClientMaterialPrintProps> = ({
    clientName,
    balance,
    transactions,
    shopName = "STERLINGFLOW ERP",
    businessProfile
}) => {
    const received = transactions.filter(t => t.transaction_type === 'RECEIPT');
    const consumed = transactions.filter(t => t.transaction_type === 'CONSUMPTION');
    const losses = transactions.filter(t => t.transaction_type === 'LOSS');

    const totalReceived = received.reduce((acc, t) => acc + t.quantity, 0);
    const totalConsumed = consumed.reduce((acc, t) => acc + t.quantity, 0);
    const totalLoss = losses.reduce((acc, t) => acc + t.quantity, 0);

    // Create portal container
    useEffect(() => {
        const printContainer = document.getElementById('print-portal-root');
        if (!printContainer) {
            const container = document.createElement('div');
            container.id = 'print-portal-root';
            document.body.appendChild(container);
        }

        return () => {
            const printContainer = document.getElementById('print-portal-root');
            if (printContainer && printContainer.childNodes.length === 0) {
                document.body.removeChild(printContainer);
            }
        };
    }, []);

    const printContent = (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @media screen {
                    #print-portal-content {
                        display: none !important;
                    }
                }
                
                @media print {
                    @page {
                        size: A4;
                        margin: 15mm;
                    }

                    /* Reset html/body/portal for pagination */
                    html, body {
                        height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                    }
                    
                    /* Hide everything except portal root */
                    body > *:not(#print-portal-root) {
                        display: none !important;
                    }
                    
                    /* Explicitly show portal root with proper overflow */
                    #print-portal-root {
                        display: block !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    
                    /* Show print content and allow it to flow */
                    #print-portal-content {
                        display: block !important;
                        visibility: visible !important;
                        height: auto !important;
                        overflow: visible !important;
                    }

                    /* Ensure children are visible but respect their display types */
                    #print-portal-content * {
                        visibility: visible !important;
                    }
                    
                    /* Table display fixes */
                    #print-portal-content table {
                        display: table !important;
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                        page-break-inside: auto;
                    }
                    
                    #print-portal-content thead {
                        display: table-header-group !important;
                    }
                    
                    #print-portal-content tbody {
                        display: table-row-group !important;
                    }
                    
                    #print-portal-content tr {
                        display: table-row !important;
                        page-break-inside: avoid;
                    }
                    
                    #print-portal-content th,
                    #print-portal-content td {
                        display: table-cell !important;
                    }
                    
                    /* Flex fixes */
                    #print-portal-content .print-flex {
                        display: flex !important;
                    }
                    
                    #print-portal-content .print-grid {
                        display: grid !important;
                    }
                    
                    /* Color preservation */
                    #print-portal-content * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            ` }} />

            <div id="print-portal-content" style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#111827',
                lineHeight: 1.4,
                fontSize: '12px',
                background: 'white',
                padding: 0,
                margin: 0
            }}>
                {/* Header */}
                <div className="print-flex" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '2px solid #4f46e5',
                    paddingBottom: '16px',
                    marginBottom: '24px'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '24px',
                            fontWeight: 900,
                            color: '#4f46e5',
                            margin: 0,
                            marginBottom: '4px',
                            textTransform: 'uppercase'
                        }}>{shopName}</h1>
                        {businessProfile ? (
                            <div style={{ fontSize: '10px', color: '#4b5563', lineHeight: '1.4' }}>
                                {businessProfile.address && <div style={{ marginBottom: '2px' }}>{businessProfile.address}</div>}
                                {(businessProfile.city || businessProfile.state || businessProfile.pincode) && (
                                    <div style={{ marginBottom: '2px' }}>
                                        {[businessProfile.city, businessProfile.state, businessProfile.pincode].filter(Boolean).join(', ')}
                                    </div>
                                )}
                                {businessProfile.phone && <div style={{ marginBottom: '2px' }}>Phone: {businessProfile.phone}</div>}
                                {businessProfile.gstin && <div style={{ fontWeight: 700 }}>GSTIN: {businessProfile.gstin}</div>}
                            </div>
                        ) : (
                            <p style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                margin: 0
                            }}>Client Material Ledger</p>
                        )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{
                            fontSize: '11px',
                            color: '#6b7280',
                            margin: 0
                        }}>Date: {format(new Date(), 'dd/MM/yyyy')}</p>
                        <p style={{ fontSize: '14px', fontWeight: 900, color: '#111827', marginTop: '4px' }}>
                            CLIENT LEDGER
                        </p>
                    </div>
                </div>

                {/* Client Summary */}
                <div className="print-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '24px',
                    marginBottom: '24px',
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: '8px'
                }}>
                    <div>
                        <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>Client Name</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>{clientName}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>Total Received</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: '#2563eb', margin: 0 }}>{totalReceived.toFixed(3)} KG</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>Total Consumed</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: '#059669', margin: 0 }}>{totalConsumed.toFixed(3)} KG</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>Current Balance</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>{balance?.balance?.toFixed(3) || '0.000'} KG</p>
                    </div>
                </div>

                {/* RECEIVED SECTION */}
                <div style={{ marginBottom: '24px' }}>
                    <div className="print-flex" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                        paddingBottom: '8px',
                        borderBottom: '2px solid #2563eb'
                    }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }}></div>
                        <h3 style={{
                            fontSize: '14px',
                            fontWeight: 900,
                            color: '#2563eb',
                            textTransform: 'uppercase',
                            margin: 0,
                            flex: 1
                        }}>Received Entries</h3>
                        <span style={{ fontSize: '13px', fontWeight: 900, color: '#2563eb' }}>
                            {totalReceived.toFixed(3)} KG
                        </span>
                    </div>

                    {received.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                                <tr style={{ background: '#eff6ff' }}>
                                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '9px', fontWeight: 900, color: '#1e40af', border: '1px solid #bfdbfe' }}>Date</th>
                                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '9px', fontWeight: 900, color: '#1e40af', border: '1px solid #bfdbfe' }}>Material</th>
                                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '9px', fontWeight: 900, color: '#1e40af', border: '1px solid #bfdbfe' }}>Description</th>
                                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '9px', fontWeight: 900, color: '#1e40af', border: '1px solid #bfdbfe' }}>Quantity (KG)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {received.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()).map((t) => (
                                    <tr key={t.id}>
                                        <td style={{ padding: '8px', fontWeight: 600, color: '#6b7280', border: '1px solid #dbeafe' }}>
                                            {format(parse(t.transaction_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}
                                        </td>
                                        <td style={{ padding: '8px', fontWeight: 700, color: '#1f2937', border: '1px solid #dbeafe' }}>
                                            {t.material_type}
                                        </td>
                                        <td style={{ padding: '8px', border: '1px solid #dbeafe' }}>
                                            <div style={{ fontWeight: 600, color: '#111827' }}>{t.remarks?.split(' - ')[0] || '-'}</div>
                                            <div style={{ fontSize: '9px', color: '#9ca3af', fontStyle: 'italic' }}>
                                                {(t.remarks?.split(' - ').slice(1).join(' - ')) || '-'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, color: '#2563eb', border: '1px solid #dbeafe' }}>
                                            {t.quantity.toFixed(3)}
                                        </td>
                                    </tr>
                                ))}
                                <tr style={{ background: '#eff6ff', fontWeight: 900 }}>
                                    <td colSpan={3} style={{ padding: '8px', textAlign: 'right', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '10px' }}>
                                        TOTAL RECEIVED:
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #bfdbfe', color: '#2563eb', fontSize: '12px' }}>
                                        {totalReceived.toFixed(3)} KG
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '16px', textAlign: 'center', background: '#f9fafb', color: '#9ca3af', fontStyle: 'italic' }}>
                            No received entries
                        </div>
                    )}
                </div>

                {/* CONSUMED SECTION */}
                <div style={{ marginBottom: '24px' }}>
                    <div className="print-flex" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                        paddingBottom: '8px',
                        borderBottom: '2px solid #059669'
                    }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }}></div>
                        <h3 style={{
                            fontSize: '14px',
                            fontWeight: 900,
                            color: '#059669',
                            textTransform: 'uppercase',
                            margin: 0,
                            flex: 1
                        }}>Consumed Entries</h3>
                        <span style={{ fontSize: '13px', fontWeight: 900, color: '#059669' }}>
                            {totalConsumed.toFixed(3)} KG
                        </span>
                    </div>

                    {consumed.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                                <tr style={{ background: '#f0fdf4' }}>
                                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '9px', fontWeight: 900, color: '#15803d', border: '1px solid #bbf7d0' }}>Date</th>
                                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '9px', fontWeight: 900, color: '#15803d', border: '1px solid #bbf7d0' }}>Material</th>
                                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '9px', fontWeight: 900, color: '#15803d', border: '1px solid #bbf7d0' }}>Description</th>
                                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '9px', fontWeight: 900, color: '#15803d', border: '1px solid #bbf7d0' }}>Quantity (KG)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {consumed.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()).map((t) => (
                                    <tr key={t.id}>
                                        <td style={{ padding: '8px', fontWeight: 600, color: '#6b7280', border: '1px solid #dcfce7' }}>
                                            {format(parse(t.transaction_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}
                                        </td>
                                        <td style={{ padding: '8px', fontWeight: 700, color: '#1f2937', border: '1px solid #dcfce7' }}>
                                            {t.material_type}
                                        </td>
                                        <td style={{ padding: '8px', border: '1px solid #dcfce7' }}>
                                            {(() => {
                                                let details = [];
                                                try {
                                                    if (t.order_details) {
                                                        details = Array.isArray(t.order_details) ? t.order_details : JSON.parse(t.order_details);
                                                    }
                                                } catch (e) { }

                                                if (details.length > 0) {
                                                    return (
                                                        <div>
                                                            {details.map((item: any, idx: number) => {
                                                                const baseTotal = Number(item.base_quantity) * Number(item.base_rate);
                                                                const addonTotal = item.has_addon ? Number(item.addon_quantity) * Number(item.addon_rate) : 0;

                                                                return (
                                                                    <div key={idx} style={{ marginBottom: '4px', borderBottom: idx < details.length - 1 ? '1px dashed #e5e7eb' : 'none', paddingBottom: '4px' }}>
                                                                        <div style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', color: '#111827' }}>
                                                                            <span>{item.description}</span>
                                                                            <span>₹{(baseTotal + addonTotal).toLocaleString()}</span>
                                                                        </div>
                                                                        <div style={{ fontSize: '9px', color: '#4b5563' }}>
                                                                            {item.base_quantity} {item.unit} x ₹{item.base_rate}
                                                                        </div>
                                                                        {item.has_addon && (
                                                                            <div style={{ fontSize: '9px', color: '#b45309', paddingLeft: '4px', borderLeft: '2px solid #fcd34d', marginTop: '2px' }}>
                                                                                + {item.addon_quantity} pcs @ ₹{item.addon_rate}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {details.length > 1 && (
                                                                <div style={{ borderTop: '1px solid #d1fae5', paddingTop: '4px', marginTop: '4px', fontWeight: 900, display: 'flex', justifyContent: 'space-between', color: '#047857', fontSize: '10px' }}>
                                                                    <span>Total Value:</span>
                                                                    <span>₹{details.reduce((acc: number, item: any) => acc + (Number(item.base_quantity) * Number(item.base_rate)) + (item.has_addon ? Number(item.addon_quantity) * Number(item.addon_rate) : 0), 0).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <>
                                                            <div style={{ fontWeight: 600, color: '#111827' }}>{t.remarks?.split(' - ')[0] || '-'}</div>
                                                            <div style={{ fontSize: '9px', color: '#9ca3af', fontStyle: 'italic' }}>
                                                                {(t.remarks?.split(' - ').slice(1).join(' - ')) || '-'}
                                                            </div>
                                                        </>
                                                    );
                                                }
                                            })()}
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, color: '#059669', border: '1px solid #dcfce7' }}>
                                            {t.quantity.toFixed(3)}
                                        </td>
                                    </tr>
                                ))}
                                <tr style={{ background: '#f0fdf4', fontWeight: 900 }}>
                                    <td colSpan={3} style={{ padding: '8px', textAlign: 'right', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '10px' }}>
                                        TOTAL CONSUMED:
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #bbf7d0', color: '#059669', fontSize: '12px' }}>
                                        {totalConsumed.toFixed(3)} KG
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '16px', textAlign: 'center', background: '#f9fafb', color: '#9ca3af', fontStyle: 'italic' }}>
                            No consumed entries
                        </div>
                    )}
                </div>

                {/* LOSS SECTION */}
                <div style={{ marginBottom: '24px' }}>
                    <div className="print-flex" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                        paddingBottom: '8px',
                        borderBottom: '2px solid #e11d48'
                    }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e11d48' }}></div>
                        <h3 style={{
                            fontSize: '14px',
                            fontWeight: 900,
                            color: '#e11d48',
                            textTransform: 'uppercase',
                            margin: 0,
                            flex: 1
                        }}>Loss Entries</h3>
                        <span style={{ fontSize: '13px', fontWeight: 900, color: '#e11d48' }}>
                            {totalLoss.toFixed(3)} KG
                        </span>
                    </div>

                    {losses.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                                <tr style={{ background: '#fef2f2' }}>
                                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '9px', fontWeight: 900, color: '#b91c1c', border: '1px solid #fecaca' }}>Date</th>
                                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '9px', fontWeight: 900, color: '#b91c1c', border: '1px solid #fecaca' }}>Material</th>
                                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '9px', fontWeight: 900, color: '#b91c1c', border: '1px solid #fecaca' }}>Reason</th>
                                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '9px', fontWeight: 900, color: '#b91c1c', border: '1px solid #fecaca' }}>Quantity (KG)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {losses.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()).map((t) => (
                                    <tr key={t.id}>
                                        <td style={{ padding: '8px', fontWeight: 600, color: '#6b7280', border: '1px solid #fee2e2' }}>
                                            {format(parse(t.transaction_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}
                                        </td>
                                        <td style={{ padding: '8px', fontWeight: 700, color: '#1f2937', border: '1px solid #fee2e2' }}>
                                            {t.material_type}
                                        </td>
                                        <td style={{ padding: '8px', border: '1px solid #fee2e2' }}>
                                            <div style={{ fontWeight: 600, color: '#111827' }}>{t.reason || t.remarks?.split(' - ')[0] || '-'}</div>
                                            <div style={{ fontSize: '9px', color: '#9ca3af', fontStyle: 'italic' }}>
                                                {t.remarks || '-'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, color: '#e11d48', border: '1px solid #fee2e2' }}>
                                            {t.quantity.toFixed(3)}
                                        </td>
                                    </tr>
                                ))}
                                <tr style={{ background: '#fef2f2', fontWeight: 900 }}>
                                    <td colSpan={3} style={{ padding: '8px', textAlign: 'right', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '10px' }}>
                                        TOTAL LOSS:
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #fecaca', color: '#e11d48', fontSize: '12px' }}>
                                        {totalLoss.toFixed(3)} KG
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '16px', textAlign: 'center', background: '#f9fafb', color: '#9ca3af', fontStyle: 'italic' }}>
                            No loss entries
                        </div>
                    )}
                </div>

                {/* Signatures */}
                <div className="print-flex" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginTop: '48px',
                    paddingTop: '32px',
                    borderTop: '1px dashed #e5e7eb'
                }}>
                    <div style={{ textAlign: 'center', width: '160px' }}>
                        <div style={{ height: '2px', background: '#e5e7eb', marginBottom: '8px' }}></div>
                        <p style={{ fontSize: '9px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', margin: 0 }}>
                            Customer Signature
                        </p>
                    </div>
                    <div style={{ textAlign: 'center', width: '160px' }}>
                        <div style={{ height: '2px', background: '#c7d2fe', marginBottom: '8px' }}></div>
                        <p style={{ fontSize: '9px', fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase', margin: 0 }}>
                            Authorized Store Sign
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '9px', color: '#9ca3af' }}>
                    This is a computer generated document and does not require a physical stamp.
                    <br />Designed & Maintained by Nexora Redesign v3
                </div>
            </div>
        </>
    );

    const portalRoot = document.getElementById('print-portal-root');
    if (!portalRoot) return null;

    return createPortal(printContent, portalRoot);
};
