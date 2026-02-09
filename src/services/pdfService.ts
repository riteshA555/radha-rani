import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface InvoiceData {
    order_number: string | number;
    customer_name: string;
    order_date: string;
    items: any[];
    subtotal: number;
    gst_amount: number;
    total_amount: number;
    notes?: string;
    shop_info?: {
        name: string;
        address: string;
        phone: string;
        gstin?: string;
    }
}

export const generateInvoicePDF = (data: InvoiceData) => {
    const doc = new jsPDF();
    const shop = data.shop_info || {
        name: 'STERLINGFLOW ERP',
        address: 'B-12, Zaveri Bazar, Mumbai - 400002',
        phone: '+91 9876543210',
        gstin: '27AAAAA0000A1Z5'
    };

    // --- Header ---
    doc.setFontSize(20);
    doc.setTextColor(40, 44, 52);
    doc.text(shop.name, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(shop.address, 14, 28);
    doc.text(`Phone: ${shop.phone}`, 14, 33);
    if (shop.gstin) doc.text(`GSTIN: ${shop.gstin}`, 14, 38);

    // --- Invoice Title & Info ---
    doc.setFontSize(16);
    doc.setTextColor(40, 44, 52);
    doc.text('TAX INVOICE', 140, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Invoice No: #${data.order_number}`, 140, 30);
    doc.text(`Date: ${format(new Date(data.order_date), 'dd/MM/yyyy')}`, 140, 35);

    doc.setDrawColor(220);
    doc.line(14, 45, 196, 45);

    // --- Billing Info ---
    doc.setFontSize(11);
    doc.setTextColor(40, 44, 52);
    doc.text('Bill To:', 14, 55);
    doc.setFontSize(12);
    doc.text(data.customer_name, 14, 61);

    // --- Items Table ---
    const tableRows = data.items.map((item, index) => [
        index + 1,
        item.description || item.product_name || 'Jewelry Item',
        `${item.quantity} ${item.unit || 'pcs'}`,
        item.weight ? `${item.weight}g` : '-',
        `Rs. ${item.rate.toLocaleString()}`,
        `Rs. ${item.amount.toLocaleString()}`
    ]);

    autoTable(doc, {
        startY: 70,
        head: [['#', 'Description', 'Qty', 'Weight', 'Rate', 'Amount']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255 }, // Indigo-600
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 10 },
            5: { halign: 'right' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // --- Summary ---
    doc.setFontSize(10);
    doc.text('Subtotal:', 140, finalY);
    doc.text(`Rs. ${data.subtotal.toLocaleString()}`, 196, finalY, { align: 'right' });

    doc.text('GST (3%):', 140, finalY + 7);
    doc.text(`Rs. ${data.gst_amount.toLocaleString()}`, 196, finalY + 7, { align: 'right' });

    doc.setFontSize(12);
    doc.text('Total Amount:', 140, finalY + 16);
    doc.text(`Rs. ${data.total_amount.toLocaleString()}`, 196, finalY + 16, { align: 'right' });

    // --- Footer ---
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Thank you for your business!', 105, 280, { align: 'center' });
    doc.text('This is a computer-generated invoice.', 105, 285, { align: 'center' });

    doc.save(`Invoice_${data.order_number}.pdf`);
};
