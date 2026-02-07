import { supabase } from '../supabaseClient';
import { createLedger, deleteLedger, updateLedger } from './accountingService';

export interface Customer {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    gstNumber?: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string;
    status: 'active' | 'inactive';
    balance: number; // Positive = Receivable (Due), Negative = Advance
}

export interface Vendor {
    id: string;
    name: string;
    companyName: string;
    phone: string;
    email: string;
    address: string;
    category: string;
    gstNumber?: string;
    totalPurchases: number;
    totalAmount: number;
    lastPurchaseDate: string;
    status: 'active' | 'inactive';
    balance: number; // Positive = Payable (Credit), Negative = Advance (Debit)
}

export const getCustomerList = async (): Promise<{ id: string, name: string }[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('ledgers')
        .select('id, name')
        .eq('type', 'ASSET')
        .eq('user_id', user.id)
        .order('name');

    if (error) throw error;
    return data || [];
};

export const getCustomers = async (): Promise<Customer[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // 1. Get Asset Ledgers (Customers)
    const { data: ledgers, error } = await supabase
        .from('ledgers')
        .select('id, name, contact_info, address, gst_number')
        .eq('type', 'ASSET')
        .eq('user_id', user.id)
        .order('name');

    if (error) throw error;

    // 2. Get Stats for each customer
    const customers = await Promise.all(ledgers.map(async (l: any) => {
        // Fetch Orders Stats
        const { data: orders } = await supabase
            .from('orders')
            .select('total_amount, order_date')
            .eq('customer_id', l.id)
            .eq('user_id', user.id)
            .order('order_date', { ascending: false });

        // Fetch Ledger Balance
        const { data: transactions } = await supabase
            .from('transactions')
            .select('debit, credit')
            .eq('ledger_id', l.id)
            .eq('user_id', user.id);

        const totalDebit = transactions?.reduce((sum: number, t: any) => sum + Number(t.debit || 0), 0) || 0;
        const totalCredit = transactions?.reduce((sum: number, t: any) => sum + Number(t.credit || 0), 0) || 0;
        const balance = totalDebit - totalCredit;

        const totalOrders = orders?.length || 0;
        const totalSpent = orders?.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0) || 0;
        const lastOrderDate = orders?.[0]?.order_date || '';

        return {
            id: l.id,
            name: l.name,
            phone: l.contact_info || '',
            email: '',
            address: l.address || '',
            gstNumber: l.gst_number,
            totalOrders,
            totalSpent,
            lastOrderDate: lastOrderDate ? new Date(lastOrderDate).toLocaleDateString() : '-',
            status: 'active',
            balance
        } as Customer;
    }));

    return customers;
};

export const getVendors = async (): Promise<Vendor[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // 1. Get Liability Ledgers (Vendors)
    const { data: ledgers, error } = await supabase
        .from('ledgers')
        .select('id, name, contact_info, address, gst_number')
        .eq('type', 'LIABILITY')
        .eq('user_id', user.id)
        .order('name');

    if (error) throw error;

    // 2. Get Stats
    const vendors = await Promise.all(ledgers.map(async (l: any) => {
        // Fetch Ledger Balance
        const { data: transactions } = await supabase
            .from('transactions')
            .select('debit, credit')
            .eq('ledger_id', l.id)
            .eq('user_id', user.id);

        const totalDebit = transactions?.reduce((sum: number, t: any) => sum + Number(t.debit || 0), 0) || 0;
        const totalCredit = transactions?.reduce((sum: number, t: any) => sum + Number(t.credit || 0), 0) || 0;

        // Liability: Credit - Debit = Balance (Payable)
        const balance = totalCredit - totalDebit;

        return {
            id: l.id,
            name: l.name,
            companyName: l.name,
            phone: l.contact_info || '',
            email: '',
            address: l.address || '',
            category: 'Supplier',
            gstNumber: l.gst_number,
            totalPurchases: 0, // Placeholder
            totalAmount: 0, // Placeholder
            lastPurchaseDate: '-',
            status: 'active',
            balance
        } as Vendor;
    }));

    return vendors;
};

export const addCustomer = async (customer: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'lastOrderDate' | 'status' | 'balance'>) => {
    return await createLedger({
        name: customer.name,
        type: 'ASSET',
        contact_info: customer.phone,
        address: customer.address,
        gst_number: customer.gstNumber
    });
};

export const updateCustomer = async (id: string, customer: Partial<Customer>) => {
    return await updateLedger(id, {
        name: customer.name,
        contact_info: customer.phone,
        address: customer.address,
        gst_number: customer.gstNumber
    });
};

export const addVendor = async (vendor: Omit<Vendor, 'id' | 'totalPurchases' | 'totalAmount' | 'lastPurchaseDate' | 'status' | 'category' | 'balance'>) => {
    return await createLedger({
        name: vendor.name,
        type: 'LIABILITY',
        contact_info: vendor.phone,
        address: vendor.address,
        gst_number: vendor.gstNumber
    });
};

export const updateVendor = async (id: string, vendor: Partial<Vendor>) => {
    return await updateLedger(id, {
        name: vendor.name,
        contact_info: vendor.phone,
        address: vendor.address,
        gst_number: vendor.gstNumber
    });
};

export const deleteContact = async (id: string) => {
    return await deleteLedger(id);
};
