import { supabase } from '../supabaseClient';
import { cacheStore } from './cacheStore';
import { createLedger, deleteLedger, updateLedger } from './accountingService';

export interface Customer {
    id: string;
    name: string;
    customer_code?: string; // New: Unique ID
    phone: string;
    email: string;
    address: string;
    gstNumber?: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string;
    status: 'active' | 'inactive';
    balance: number; // For UI display (comes from ledgers.running_balance)
    running_balance: number; // Actual value from DB
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

    return cacheStore.getOrFetch('customer_list_names', async () => {
        const { data, error } = await supabase
            .from('ledgers')
            .select('id, name')
            .eq('type', 'ASSET')
            .eq('user_id', user.id)
            .eq('is_system', false)
            .order('name');

        if (error) throw error;
        return data || [];
    }, 1000 * 60 * 60, true); // 1 hour, persistent
};

export const getCustomers = async (): Promise<Customer[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    return cacheStore.getOrFetch('customers_detailed_list', async () => {
        const { data, error } = await supabase.rpc('get_customers_overview');
        if (error) throw error;

        return (data || []).map((l: any) => ({
            id: l.id,
            name: l.name,
            customer_code: l.customer_code, // Map the new field
            phone: l.contact_info || '',
            email: '',
            address: l.address || '',
            gstNumber: l.gst_number,
            totalOrders: Number(l.total_orders || 0),
            totalSpent: Number(l.total_spent || 0),
            lastOrderDate: l.last_order_date ? new Date(l.last_order_date).toLocaleDateString() : '-',
            status: 'active',
            balance: Number(l.running_balance || 0),
            running_balance: Number(l.running_balance || 0)
        } as Customer));
    }, 1000 * 60 * 30, true); // 30 mins, persistent
};

export const getVendors = async (): Promise<Vendor[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    return cacheStore.getOrFetch('vendors_list', async () => {
        // 1. Get Liability Ledgers (Vendors)
        const { data: ledgers, error } = await supabase
            .from('ledgers')
            .select('id, name, contact_info, address, gst_number, running_balance')
            .eq('type', 'LIABILITY')
            .eq('user_id', user.id)
            .order('name');

        if (error) throw error;

        return (ledgers || []).map((l: any) => ({
            id: l.id,
            name: l.name,
            companyName: l.name,
            phone: l.contact_info || '',
            email: '',
            address: l.address || '',
            category: 'Supplier',
            gstNumber: l.gst_number,
            totalPurchases: 0,
            totalAmount: 0,
            lastPurchaseDate: '-',
            status: 'active',
            balance: Number(l.running_balance || 0)
        } as Vendor));
    }, 1000 * 60 * 60, true); // 1 hour, persistent
};

export const addCustomer = async (customer: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'lastOrderDate' | 'status' | 'balance' | 'running_balance'> & { openingBalance?: number, openingBalanceType?: 'RECEIVABLE' | 'ADVANCE' }) => {
    const { createLedgerWithOpeningBalance } = await import('./accountingService');
    const signedBalance = (customer.openingBalanceType === 'ADVANCE')
        ? -(customer.openingBalance || 0)
        : (customer.openingBalance || 0);

    return await createLedgerWithOpeningBalance({
        name: customer.name,
        customer_code: customer.customer_code, // Pass the new field
        type: 'ASSET',
        openingBalance: signedBalance,
        contact_info: customer.phone,
        address: customer.address,
        gst_number: customer.gstNumber
    });
};

export const updateCustomer = async (id: string, customer: Partial<Customer>) => {
    return await updateLedger(id, {
        name: customer.name,
        customer_code: customer.customer_code, // Pass the new field
        contact_info: customer.phone,
        address: customer.address,
        gst_number: customer.gstNumber
    });
};

export const addVendor = async (vendor: Omit<Vendor, 'id' | 'totalPurchases' | 'totalAmount' | 'lastPurchaseDate' | 'status' | 'category' | 'balance' | 'running_balance'> & { openingBalance?: number, openingBalanceType?: 'PAYABLE' | 'ADVANCE' }) => {
    const { createLedgerWithOpeningBalance } = await import('./accountingService');
    // For Vendors (Liability): 
    // Credit increases balance (Payable), Debit decreases it (Advance).
    // RPC: Positive = Debit, Negative = Credit.
    // So Payable (Credit) -> Negative RPC value.
    // Advance (Debit) -> Positive RPC value.
    const signedBalance = (vendor.openingBalanceType === 'PAYABLE')
        ? -(vendor.openingBalance || 0)
        : (vendor.openingBalance || 0);

    return await createLedgerWithOpeningBalance({
        name: vendor.name,
        type: 'LIABILITY',
        openingBalance: signedBalance,
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
