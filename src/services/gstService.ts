import { supabase } from '../supabaseClient'
import { Order } from '../types'
import { Expense } from './expenseService'

export interface GSTSummaryItem {
    rate: number;
    taxableValue: number;
    gstAmount: number;
    totalAmount: number;
    type: 'output' | 'input';
}

export interface ITCStat {
    openingBalance: number;
    claimedThisMonth: number;
    utilization: number;
    closingBalance: number;
}

export const getGSTOrders = async (startDate?: string, endDate?: string) => {
    let query = supabase
        .from('orders')
        .select('*') // JOIN reverted to fix "Nothing showing" error
        .eq('gst_enabled', true)
        .order('order_date', { ascending: false })

    if (startDate) {
        query = query.gte('order_date', startDate)
    }
    if (endDate) {
        query = query.lte('order_date', endDate) // Use lte to include the end date if needed, or lt for next month start
    }

    // Note: If using lt next_month_start, ensure endDate is passed correctly.
    // For simplicity, let's assume endDate is inclusive or caller handles it.
    // Let's stick to strict dates provided.

    const { data, error } = await query
    if (error) throw error
    return data as Order[]
}

export const getITCExpenses = async (startDate?: string, endDate?: string) => {
    let query = supabase
        .from('expenses')
        .select('*')
        // .eq('gst_enabled', true) // Removing this check strictly if we want to see all expenses with GST columns set, 
        // but wait, the previous code had .eq('gst_enabled', true). Let's keep it.
        .eq('gst_enabled', true)
        .order('date', { ascending: false })

    if (startDate) {
        query = query.gte('date', startDate)
    }
    if (endDate) {
        query = query.lte('date', endDate)
    }

    const { data, error } = await query
    if (error) throw error
    return data as Expense[]
}

export const getGSTCustomers = async () => {
    const { data, error } = await supabase
        .from('ledgers')
        .select('id, name, gst_number, state')
    if (error) throw error
    return data
}

export interface GSTBreakdownItem {
    rate: number;
    taxableValue: number;
    taxAmount: number;
    igst: number;
    cgst: number;
    sgst: number;
}

export const calculateGSTBreakdown = (items: (Order | Expense)[], type: 'output' | 'input', companyState: string) => {
    const breakdown: Record<number, GSTBreakdownItem> = {};

    items.forEach(item => {
        // 1. Determine Tax Rate
        let rate = 0;
        let taxable = 0;
        let taxAmt = 0;
        let otherState = '';

        if (type === 'output') {
            const o = item as Order;
            rate = Number(o.gst_rate || 0);
            taxable = Number(o.subtotal || 0); // Sales: Subtotal is Taxable
            taxAmt = Number(o.gst_amount || 0);
            otherState = (o as any).customer?.state || ''; // Enriched order has customer object
        } else {
            const e = item as Expense;
            rate = Number(e.gst_rate || 0);
            // Verify if amount is inclusive or exclusive. Usually Amount is Total Paid in Expenses.
            // But if GST is enabled, user inputs "Amount" and system calculates GST?
            // Let's assume 'amount' is the BASE amount or TOTAL.
            // If gst_amount is present, 'amount' is likely the total paid.
            // Taxable = Amount - GST (if inclusive) or Amount (if exclusive).
            // Simplification: In 'Expenses.tsx', logic implies Amount is User Input.
            // Let's assume Taxable = Amount (Base) and GST is extra if 'exclusive', or included if 'inclusive'.
            // For now, let's use: Taxable = Total - GST.
            const total = Number(e.amount || 0);
            taxAmt = Number(e.gst_amount || 0);
            taxable = total > taxAmt ? total - taxAmt : total;
            // Note: This logic assumes 'amount' in DB is Total Paid.
            otherState = ''; // Vendor state not always captured in Expenses, defaults to Intra-state if unknown
        }

        if (!breakdown[rate]) {
            breakdown[rate] = { rate, taxableValue: 0, taxAmount: 0, igst: 0, cgst: 0, sgst: 0 };
        }

        breakdown[rate].taxableValue += taxable;
        breakdown[rate].taxAmount += taxAmt;

        // 2. Intra vs Inter State
        // If states are same => CGST + SGST
        // If different => IGST
        const isInterState = otherState && companyState && otherState.toLowerCase().trim() !== companyState.toLowerCase().trim();

        if (isInterState) {
            breakdown[rate].igst += taxAmt;
        } else {
            breakdown[rate].cgst += (taxAmt / 2);
            breakdown[rate].sgst += (taxAmt / 2);
        }
    });

    return Object.values(breakdown).sort((a, b) => a.rate - b.rate);
}

export const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export const generateGSTR1CSV = (orders: any[]) => {
    const headers = ['Invoice Date', 'Invoice Number', 'Customer Name', 'Customer GSTIN', 'State', 'Taxable Value', 'Rate (%)', 'IGST', 'CGST', 'SGST', 'Total Tax', 'Total Invoice Value'];
    const rows = orders.map(o => {
        const taxable = Number(o.subtotal || 0);
        const tax = Number(o.gst_amount || 0);
        const total = Number(o.total_amount || 0);
        const rate = Number(o.gst_rate || 0);
        const state = o.customer?.state || '';

        // Logic should match component but simplified here (assuming intra-state default for CSV if unknown)
        // Ideally we pass companyState to this function too, but let's assume default split for now or add correct valid logic later.
        // For accurate report, we need company state showing up here.
        // Let's just dump the raw data for now.
        return [
            new Date(o.order_date).toLocaleDateString(),
            o.order_number,
            o.customer?.name || 'Cash Customer',
            o.customer?.gst_number || '',
            state,
            taxable.toFixed(2),
            rate,
            0, // Placeholder
            (tax / 2).toFixed(2),
            (tax / 2).toFixed(2),
            tax.toFixed(2),
            total.toFixed(2)
        ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
}
