import { supabase } from '../supabaseClient'
import { cacheStore } from './cacheStore'

export interface Expense {
    id: string;
    date: string;
    head: string;
    amount: number;
    notes?: string;
    payment_mode?: 'CASH' | 'ONLINE' | 'UPI';
    gst_enabled?: boolean;
    gst_rate?: number;
    gst_amount?: number;
    invoice_number?: string;
    vendor_name?: string;
    created_at: string;
}

const CACHE_KEYS = {
    EXPENSES: 'expenses_list'
}

export const getExpenses = async (startDate?: string, endDate?: string) => {
    const cacheKey = `${CACHE_KEYS.EXPENSES}_${startDate || 'all'}_${endDate || 'all'}`;

    return cacheStore.getOrFetch(cacheKey, async () => {
        let query = supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false })

        if (startDate) query = query.gte('date', startDate)
        if (endDate) query = query.lte('date', endDate)

        const { data, error } = await query

        if (error) throw error
        return data as Expense[]
    })
}

export const createExpense = async (expense: Omit<Expense, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single()

    if (error) throw error

    // Invalidate related caches
    cacheStore.invalidate(CACHE_KEYS.EXPENSES)
    cacheStore.invalidate('dashboard_stats')
    cacheStore.invalidate('pl_report')

    return data as Expense
}

export const deleteExpense = async (expenseId: string) => {
    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

    if (error) throw error

    // Invalidate related caches
    cacheStore.invalidate(CACHE_KEYS.EXPENSES)
    cacheStore.invalidate('dashboard_stats')
    cacheStore.invalidate('pl_report')
}
