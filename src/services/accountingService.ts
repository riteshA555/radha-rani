import { supabase } from '../supabaseClient'
import { cacheStore } from './cacheStore'

export interface LedgerSummary {
    ledger_name: string;
    total_debit: number;
    total_credit: number;
    balance: number;
}

export interface PLData {
    jobWorkIncome: number;
    productSalesIncome: number;
    karigarExpenses: number;
    staffSalary: number;
    rent: number;
    electricity: number;
    otherExpenses: number;
    totalIncome: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
}

export interface CustomerLedger {
    id: string;
    date: string;
    description: string;
    debit: number;
    credit: number;
    ledger_id: string;
    balance?: number;
    is_deleted?: boolean;
    deleted_at?: string;
    deleted_by?: string;
    reversal_of?: string;
}

const CACHE_KEYS = {
    PL_REPORT: 'pl_report',
    CUSTOMER_STATEMENT_PREFIX: 'customer_statement_'
}

export const getPLReport = async (startDate?: string, endDate?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const cacheKey = `${CACHE_KEYS.PL_REPORT}_${startDate || 'all'}_${endDate || 'all'}`;

    return cacheStore.getOrFetch(cacheKey, async () => {
        // 1. Get Income from Orders (Subtotal excludes GST)
        let orderQuery = supabase
            .from('orders')
            .select('subtotal, material_type, order_date')
            .eq('user_id', user.id)

        if (startDate) orderQuery = orderQuery.gte('order_date', startDate)
        if (endDate) orderQuery = orderQuery.lte('order_date', endDate)

        const { data: orderData, error: orderError } = await orderQuery
        if (orderError) throw orderError

        const jobWorkIncome = (orderData || [])
            .filter((o: any) => o.material_type === 'CLIENT')
            .reduce((sum: number, o: any) => sum + Number(o.subtotal || 0), 0)

        const productSalesIncome = (orderData || [])
            .filter((o: any) => o.material_type === 'OWN')
            .reduce((sum: number, o: any) => sum + Number(o.subtotal || 0), 0)

        const totalIncome = jobWorkIncome + productSalesIncome

        // 2. Get Expenses (from expenses table)
        let expenseQuery = supabase
            .from('expenses')
            .select('head, amount, gst_amount, gst_enabled, date')
            .eq('user_id', user.id)

        if (startDate) expenseQuery = expenseQuery.gte('date', startDate)
        if (endDate) expenseQuery = expenseQuery.lte('date', endDate)

        const { data: expenseData, error: expenseError } = await expenseQuery
        if (expenseError) throw expenseError

        let karigarExpenses = 0;
        let staffSalary = 0;
        let rent = 0;
        let electricity = 0;
        let otherExpenses = 0;

        (expenseData || []).forEach((e: any) => {
            const amount = (e.gst_enabled && e.gst_amount)
                ? (Number(e.amount) - Number(e.gst_amount))
                : Number(e.amount)

            const head = e.head.toLowerCase().trim()
            if (head.startsWith('karigar payment')) {
                karigarExpenses += amount
            } else if (head.includes('salary') || head.includes('staff')) {
                staffSalary += amount
            } else if (head.includes('rent')) {
                rent += amount
            } else if (head.includes('electricity') || head.includes('bill')) {
                electricity += amount
            } else {
                otherExpenses += amount
            }
        })

        const totalExpenses = karigarExpenses + staffSalary + rent + electricity + otherExpenses
        const grossProfit = totalIncome - karigarExpenses

        return {
            jobWorkIncome,
            productSalesIncome,
            karigarExpenses,
            staffSalary,
            rent,
            electricity,
            otherExpenses,
            totalIncome,
            totalExpenses,
            grossProfit,
            netProfit: totalIncome - totalExpenses
        } as PLData
    }, 1000 * 60 * 5, true) // 5 mins, persistent
}

export const getCustomerStatement = async (ledgerId: string, startDate?: string, endDate?: string, page: number = 1, pageSize: number = 20) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const cacheKey = `${CACHE_KEYS.CUSTOMER_STATEMENT_PREFIX}${ledgerId}_p${page}_s${pageSize}_${startDate || 'all'}_${endDate || 'all'}`;

    return cacheStore.getOrFetch(cacheKey, async () => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Note: For true "running balance" with pagination, we ideally fetch the 
        // starting balance once and then offset. 
        // For now, we fetch the range and calculate balance relative to ledger's current balance
        // or just fetch all for balance calc and slice (which is what it did, but lets improve the range)

        let query = supabase
            .from('transactions')
            .select('*')
            .eq('ledger_id', ledgerId)
            .eq('user_id', user.id);

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data, error } = await query
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Fetch current running balance to help UI show correct context
        const { data: ledger } = await supabase.from('ledgers').select('running_balance').eq('id', ledgerId).single();

        return (data || []).map((t: any) => ({
            ...t,
            debit: Number(t.debit) || 0,
            credit: Number(t.credit) || 0
        }));
    }, 1000 * 60 * 5, true) // 5 mins, persistent
}

export const getClientStatementReport = async (ledgerId: string, startDate: string, endDate: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 2. Get Opening Balance (Total before startDate)
    const { data: openingData, error: openingError } = await supabase
        .from('transactions')
        .select('debit, credit')
        .eq('ledger_id', ledgerId)
        .lt('date', startDate)

    if (openingError) throw openingError
    const openingBalance = (openingData || []).reduce((sum: number, t: any) => sum + (Number(t.debit) - Number(t.credit)), 0)

    // 3. Get Transactions in range
    const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('ledger_id', ledgerId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true })

    if (transError) throw transError

    // 4. Calculate Running Balances starting from openingBalance
    let currentBal = openingBalance;
    const billed = (transactions || [])
        .filter((t: any) => Number(t.debit) > 0)
        .reduce((sum: number, t: any) => sum + Number(t.debit), 0)

    const paid = (transactions || [])
        .filter((t: any) => Number(t.credit) > 0)
        .reduce((sum: number, t: any) => sum + Number(t.credit), 0)

    const processedTransactions = (transactions || []).map((t: any) => {
        currentBal += (Number(t.debit) - Number(t.credit));
        return { ...t, balance: currentBal };
    });

    return {
        openingBalance,
        transactions: processedTransactions,
        totalBilled: billed,
        totalPaid: paid,
        closingBalance: currentBal
    }
}

export const getAssetLedgers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    return cacheStore.getOrFetch('asset_ledgers_list', async () => {
        // Fetches Customers (Assets) for the dropdown
        const { data, error } = await supabase
            .from('ledgers')
            .select('id, name, contact_info, address, gst_number, credit_limit, payment_terms, running_balance, is_system')
            .eq('type', 'ASSET')
            .eq('user_id', user.id)
            .order('name')

        if (error) throw error
        return data
    }, 1000 * 60 * 30, true) // 30 mins, persistent
}

export const recordPayment = async (ledgerId: string, amount: number, mode: string, note: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const date = new Date().toISOString().split('T')[0]

    // Use atomic RPC to handle double-entry (Customer Credit / Cash Debit)
    const { data, error } = await supabase.rpc('record_ledger_payment_atomic', {
        p_ledger_id: ledgerId,
        p_amount: amount,
        p_mode: mode,
        p_date: date,
        p_note: note,
        p_type: 'IN'
    })

    if (error) throw error

    // Invalidate caches
    cacheStore.invalidatePattern(CACHE_KEYS.CUSTOMER_STATEMENT_PREFIX)
    cacheStore.invalidate('pl_report')
    return data
}

export const recordPaymentOut = async (ledgerId: string, amount: number, mode: string, note: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const date = new Date().toISOString().split('T')[0]

    // Use atomic RPC for Vendor Payment (Vendor Debit / Cash Credit)
    const { data, error } = await supabase.rpc('record_ledger_payment_atomic', {
        p_ledger_id: ledgerId,
        p_amount: amount,
        p_mode: mode,
        p_date: date,
        p_note: note,
        p_type: 'OUT'
    })

    if (error) throw error

    // Invalidate caches
    cacheStore.invalidatePattern(CACHE_KEYS.CUSTOMER_STATEMENT_PREFIX)
    cacheStore.invalidate('pl_report')
    return data
}


export const getLiabilityLedgers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    return cacheStore.getOrFetch('liability_ledgers_list', async () => {
        // Fetches Vendors (Liabilities)
        const { data, error } = await supabase
            .from('ledgers')
            .select('id, name, contact_info, address, gst_number, running_balance')
            .eq('type', 'LIABILITY')
            .eq('user_id', user.id)
            .order('name')

        if (error) throw error
        return data
    }, 1000 * 60 * 60, true) // 1 hour, persistent
}

export const createLedger = async (data: { name: string, customer_code?: string, type: 'ASSET' | 'LIABILITY' | 'EXPENSE' | 'INCOME', contact_info?: string, address?: string, gst_number?: string, credit_limit?: number, payment_terms?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: res, error } = await supabase
        .from('ledgers')
        .insert([{ ...data, user_id: user.id }])
        .select()

    if (error) throw error

        // Invalidate caches to ensure UI shows new customer
        ;['asset_ledgers_list', 'liability_ledgers_list', 'customers_detailed_list', 'customer_list_names'].forEach((k: string) => cacheStore.invalidate(k));
    cacheStore.invalidatePattern('customer_list');

    return res[0]
}

export const createLedgerWithOpeningBalance = async (data: {
    name: string,
    customer_code?: string,
    type: 'ASSET' | 'LIABILITY',
    openingBalance: number,
    contact_info?: string,
    address?: string,
    gst_number?: string
}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: res, error } = await supabase.rpc('create_ledger_with_opening_balance', {
        l_name: data.name,
        l_type: data.type,
        l_opening_balance: data.openingBalance,
        l_user_id: user.id,
        l_contact_info: data.contact_info,
        l_address: data.address,
        l_gst_number: data.gst_number,
        l_customer_code: data.customer_code
    });

    if (error) throw error;

    // Invalidate caches to ensure UI shows new customer/balance
    ;['asset_ledgers_list', 'liability_ledgers_list', 'customers_detailed_list', 'customer_list_names'].forEach((k: string) => cacheStore.invalidate(k));
    cacheStore.invalidatePattern('customer_list');
    cacheStore.invalidatePattern(CACHE_KEYS.CUSTOMER_STATEMENT_PREFIX);

    return res;
};

export const updateLedger = async (id: string, data: { name?: string, customer_code?: string, contact_info?: string, address?: string, gst_number?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: res, error } = await supabase
        .from('ledgers')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()

    if (error) throw error

        // Invalidate caches to ensure UI shows updated info
        ;['asset_ledgers_list', 'liability_ledgers_list', 'customers_detailed_list', 'customer_list_names'].forEach((k: string) => cacheStore.invalidate(k));
    cacheStore.invalidatePattern('customer_list');
    cacheStore.invalidatePattern(CACHE_KEYS.CUSTOMER_STATEMENT_PREFIX);

    return res[0]
}


export const deleteLedger = async (id: string, force: boolean = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 0. Check if it's a system ledger
    const { data: ledger, error: ledgerError } = await supabase
        .from('ledgers')
        .select('name, is_system')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (ledgerError) throw ledgerError;
    if (!ledger) return; // Already deleted

    if (ledger.is_system) {
        throw new Error(
            `❌ Cannot delete System Account: "${ledger.name}"\n` +
            `⚠️ यह एक सिस्टम अकाउंट है और इसे हटाया नहीं जा सकता।`
        );
    }

    // 1. Get transaction count
    const { count: txCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('ledger_id', id)
        .eq('user_id', user.id);

    // 2. Get Order count
    const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('ledger_id', id)
        .eq('user_id', user.id);

    // 3. Get Raw Material records count
    const { count: rmCount } = await supabase
        .from('client_raw_material_ledger')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', id)
        .eq('user_id', user.id);

    const hasDeps = (txCount && txCount > 0) || (orderCount && orderCount > 0) || (rmCount && rmCount > 0);

    if (hasDeps && !force) {
        let msg = `❌ Cannot delete! Dependencies found for "${ledger.name}":\n\n`;
        if (txCount) msg += `- ${txCount} transaction(s)\n`;
        if (orderCount) msg += `- ${orderCount} order(s)\n`;
        if (rmCount) msg += `- ${rmCount} raw material record(s)\n`;
        msg += `\n⚠️ इस ग्राहक के रिकॉर्ड मौजूद हैं। Pehle inhe delete karein.`;
        throw new Error(msg);
    }

    // 4. Force delete transactions if force=true (Only reachable if not blocked by orders/rm)
    if (force) {
        // A. Delete Transactions
        if (txCount) await supabase.from('transactions').delete().eq('ledger_id', id).eq('user_id', user.id);

        // B. Delete Orders & Items
        if (orderCount) {
            const { data: orders } = await supabase.from('orders').select('id').eq('ledger_id', id).eq('user_id', user.id);
            if (orders?.length) {
                const orderIds = orders.map((o: any) => o.id);
                await supabase.from('order_items').delete().in('order_id', orderIds);
            }
            await supabase.from('orders').delete().eq('ledger_id', id).eq('user_id', user.id);
        }

        // C. Delete Raw Material
        if (rmCount) await supabase.from('client_raw_material_ledger').delete().eq('client_id', id).eq('user_id', user.id);
    }

    const { error: finalError } = await supabase.from('ledgers').delete().eq('id', id).eq('user_id', user.id);
    if (finalError) throw finalError;

    // Cache invalidation
    cacheStore.invalidatePattern(CACHE_KEYS.CUSTOMER_STATEMENT_PREFIX);
    cacheStore.invalidatePattern('customer_list');
    cacheStore.invalidatePattern('orders_list');
    ['asset_ledgers_list', 'liability_ledgers_list', 'customers_detailed_list', 'customer_list_names'].forEach(k => cacheStore.invalidate(k));
}

export const deleteTransaction = async (txId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('delete_ledger_transaction_atomic', {
        p_tx_id: txId,
        p_user_id: user.id
    });

    if (error) throw error;

    // Invalidate caches
    cacheStore.invalidatePattern(CACHE_KEYS.CUSTOMER_STATEMENT_PREFIX)
    cacheStore.invalidate('pl_report')
    return data;
}
