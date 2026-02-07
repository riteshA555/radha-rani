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
    generalExpenses: number;
    karigarExpenses: number;
    totalExpenses: number;
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
        // 1. Get Incomes from system ledgers (transactions)
        let incomeQuery = supabase
            .from('transactions')
            .select('ledgers!inner(name), credit, date')
            .eq('user_id', user.id)
            .in('ledgers.name', ['Job Work Income', 'Product Sales Income'])

        if (startDate) incomeQuery = incomeQuery.gte('date', startDate)
        if (endDate) incomeQuery = incomeQuery.lte('date', endDate)

        const { data: incomeData, error: incomeError } = await incomeQuery

        if (incomeError) throw incomeError

        const jobWorkIncome = incomeData
            .filter((t: any) => (t.ledgers as any).name === 'Job Work Income')
            .reduce((sum: number, t: any) => sum + Number(t.credit), 0)

        const productSalesIncome = incomeData
            .filter((t: any) => (t.ledgers as any).name === 'Product Sales Income')
            .reduce((sum: number, t: any) => sum + Number(t.credit), 0)

        // 2. Get Expenses (from expenses table)
        let expenseQuery = supabase
            .from('expenses')
            .select('head, amount, gst_amount, gst_enabled, date')
            .eq('user_id', user.id)

        if (startDate) expenseQuery = expenseQuery.gte('date', startDate)
        if (endDate) expenseQuery = expenseQuery.lte('date', endDate)

        const { data: expenseData, error: expenseError } = await expenseQuery

        if (expenseError) throw expenseError

        const karigarExpenses = expenseData
            .filter((e: any) => e.head.startsWith('Karigar Payment'))
            .reduce((sum: number, e: any) => sum + Number(e.amount), 0)

        const generalExpenses = expenseData
            .filter((e: any) => !e.head.startsWith('Karigar Payment'))
            .reduce((sum: number, e: any) => {
                // For P&L, we should count the Net Expense (excluding GST if it's recorded)
                const netAmount = (e.gst_enabled && e.gst_amount)
                    ? (Number(e.amount) - Number(e.gst_amount))
                    : Number(e.amount)
                return sum + netAmount
            }, 0)

        const totalExpenses = generalExpenses + karigarExpenses

        return {
            jobWorkIncome,
            productSalesIncome,
            generalExpenses,
            karigarExpenses,
            totalExpenses,
            netProfit: (jobWorkIncome + productSalesIncome) - totalExpenses
        } as PLData
    })
}

export const getCustomerStatement = async (customerName: string, startDate?: string, endDate?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const cacheKey = `${CACHE_KEYS.CUSTOMER_STATEMENT_PREFIX}${customerName}_${startDate || 'all'}_${endDate || 'all'}`;

    return cacheStore.getOrFetch(cacheKey, async () => {
        // 1. Find Ledger ID
        const { data: ledgers, error: ledgerError } = await supabase
            .from('ledgers')
            .select('id')
            .eq('name', customerName)
            .eq('user_id', user.id)
            .limit(1)

        if (ledgerError || !ledgers.length) throw new Error("Customer not found or invalid name")
        const ledgerId = ledgers[0].id

        // 2. Fetch ALL transactions for this ledger to calculate running balance correctly
        // We cannot just fetch a date range because we need the opening balance
        const { data: allTransactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('ledger_id', ledgerId)
            .eq('user_id', user.id)
            .order('date', { ascending: true }) // Ascending to calculate running balance
            .order('created_at', { ascending: true })

        if (error) throw error

        // 3. Calculate Running Balances
        let runningBalance = 0;
        const processedTransactions = (allTransactions || []).map((t: any) => {
            const debit = Number(t.debit) || 0;
            const credit = Number(t.credit) || 0;
            // For Assets (Customers): Debit increases balance (receivable), Credit decreases it.
            runningBalance += (debit - credit);
            return { ...t, balance: runningBalance };
        });

        // 4. Filter by Date Range if provided
        // We filter AFTER calculating running balance so the balance column is correct
        let result = processedTransactions;
        if (startDate) {
            result = result.filter(t => t.date >= startDate);
        }
        if (endDate) {
            result = result.filter(t => t.date <= endDate);
        }

        // Return in descending order (newest first) for UI, but with correct closing balances
        return result.sort((a, b) => {
            const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateCompare !== 0) return dateCompare;
            // If same date, use created_at (descending)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    })
}

export const getAssetLedgers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Fetches Customers (Assets) for the dropdown
    const { data, error } = await supabase
        .from('ledgers')
        .select('id, name, contact_info, address, gst_number, credit_limit, payment_terms')
        .eq('type', 'ASSET')
        .eq('user_id', user.id)
        .order('name')

    if (error) throw error
    return data
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

    // Fetches Vendors (Liabilities)
    const { data, error } = await supabase
        .from('ledgers')
        .select('id, name, contact_info, address, gst_number')
        .eq('type', 'LIABILITY')
        .eq('user_id', user.id)
        .order('name')

    if (error) throw error
    return data
}

export const createLedger = async (data: { name: string, type: 'ASSET' | 'LIABILITY' | 'EXPENSE' | 'INCOME', contact_info?: string, address?: string, gst_number?: string, credit_limit?: number, payment_terms?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: res, error } = await supabase
        .from('ledgers')
        .insert([{ ...data, user_id: user.id }])
        .select()

    if (error) throw error
    return res[0]
}

export const updateLedger = async (id: string, data: { name?: string, contact_info?: string, address?: string, gst_number?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: res, error } = await supabase
        .from('ledgers')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()

    if (error) throw error
    return res[0]
}


export const deleteLedger = async (id: string, force: boolean = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Check for transactions (with ownership check)
    const { data: transactions, count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('ledger_id', id)
        .eq('user_id', user.id)

    if (countError) throw countError

    if (count && count > 0) {
        if (!force) {
            // Calculate total balance
            const totalDebit = transactions?.reduce((sum: number, t: any) => sum + Number(t.debit || 0), 0) || 0
            const totalCredit = transactions?.reduce((sum: number, t: any) => sum + Number(t.credit || 0), 0) || 0
            const balance = Math.abs(totalCredit - totalDebit)

            throw new Error(
                `❌ Cannot delete! This vendor has ${count} transaction(s).\n\n` +
                `📊 Balance: ₹${balance.toLocaleString('en-IN')}\n\n` +
                `⚠️ इस विक्रेता के ${count} लेनदेन हैं।\n` +
                `बैलेंस: ₹${balance.toLocaleString('en-IN')}\n\n` +
                `To delete:\n` +
                `1. Clear all dues (make balance ₹0)\n` +
                `2. Or contact support for force delete`
            )
        }

        // Force delete: Delete all transactions first (with ownership check)
        const { error: txnDeleteError } = await supabase
            .from('transactions')
            .delete()
            .eq('ledger_id', id)
            .eq('user_id', user.id)

        if (txnDeleteError) throw txnDeleteError
    }

    // 2. Delete Ledger
    const { error } = await supabase
        .from('ledgers')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) throw error
    cacheStore.invalidate(CACHE_KEYS.CUSTOMER_STATEMENT_PREFIX)
}
