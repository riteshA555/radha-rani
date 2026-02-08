import { supabase } from '../supabaseClient'
import { cacheStore } from './cacheStore'

export interface Karigar {
    id: string;
    name: string;
    work_type: string;
    rate_type: 'Per KG' | 'Per Piece' | 'Fixed';
    default_rate: number;
    status: 'ACTIVE' | 'INACTIVE';
    contact_number?: string;
    specialization?: string;
    address?: string;
}

const KARIGARS_CACHE_KEY = 'karigars_list'

export interface KarigarWorkRecord {
    id: string;
    karigar_id: string;
    order_id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    payment_status: 'PENDING' | 'PAID';
    payment_date?: string;
    payment_mode?: string;
    work_date: string;
    karigars?: { name: string };
}

export interface KarigarPayment {
    id: string;
    karigar_id: string;
    amount: number;
    payment_date: string;
    payment_mode: string;
    notes?: string;
    created_at: string;
}

export const getKarigars = async (): Promise<Karigar[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    return cacheStore.getOrFetch(KARIGARS_CACHE_KEY, async () => {
        const { data, error } = await supabase
            .from('karigars')
            .select('*')
            .eq('user_id', user.id)
            .order('name');
        if (error) throw error;
        return data as Karigar[];
    }, 1000 * 60 * 60, true); // Persist for 1 hour
}

export const createKarigar = async (karigar: Omit<Karigar, 'id' | 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('karigars')
        .insert([{ ...karigar, user_id: user.id }])
        .select()
        .single()
    if (error) throw error
    cacheStore.invalidate(KARIGARS_CACHE_KEY)
    return data as Karigar
}

export const getKarigarWorkHistory = async (karigarId?: string, month?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
        .from('karigar_work_records')
        .select('*, karigars(name)')
        .eq('user_id', user.id)
        .order('work_date', { ascending: false })

    if (karigarId) query = query.eq('karigar_id', karigarId)
    if (month) {
        // Simple month filter for YYYY-MM
        query = query.gte('work_date', `${month}-01`).lte('work_date', `${month}-31`)
    }

    const { data, error } = await query
    if (error) throw error
    return data as KarigarWorkRecord[]
}

export const settleKarigarPayments = async (ids: string[], paymentDate: string, paymentMode: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Fetch record details for accounting (with ownership check)
    const { data: records, error: fetchError } = await supabase
        .from('karigar_work_records')
        .select('karigar_id, amount, karigars(name)')
        .in('id', ids)
        .eq('user_id', user.id)

    if (fetchError) throw fetchError

    // 2. Group by Karigar to create consolidated Expense entries
    const settlements: { [key: string]: { name: string, amount: number } } = {}

    records?.forEach((r: any) => {
        const kId = r.karigar_id
        if (!settlements[kId]) {
            settlements[kId] = { name: (r.karigars as any)?.name || 'Unknown', amount: 0 }
        }
        settlements[kId].amount += Number(r.amount)
    })

    // 3. Insert into Expenses (This feeds the P&L)
    const expensesToAdd = Object.keys(settlements).map(kId => ({
        date: paymentDate,
        head: `Karigar Payment - ${settlements[kId].name}`, // MUST start with "Karigar Payment" for P&L Service
        amount: settlements[kId].amount,
        notes: `Settlement via ${paymentMode} for ${ids.length} work records`,
        gst_enabled: false,
        user_id: user.id
    }))

    if (expensesToAdd.length > 0) {
        const { error: expenseError } = await supabase
            .from('expenses')
            .insert(expensesToAdd)
        if (expenseError) throw expenseError
    }

    // 4. Update Status in Work Records
    const { error } = await supabase
        .from('karigar_work_records')
        .update({
            payment_status: 'PAID',
            payment_date: paymentDate,
            payment_mode: paymentMode
        })
        .in('id', ids)
        .eq('user_id', user.id)

    if (error) throw error

    // Invalidate P&L cache
    cacheStore.invalidate('pl_report')
}

export const updateKarigar = async (id: string, updates: Partial<Karigar>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('karigars')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) throw error
    cacheStore.invalidate(KARIGARS_CACHE_KEY)
}

export const deleteKarigar = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check for work records first to prevent FK error
    const { count, error: countError } = await supabase
        .from('karigar_work_records')
        .select('*', { count: 'exact', head: true })
        .eq('karigar_id', id)
        .eq('user_id', user.id)

    if (countError) throw countError
    if (count && count > 0) throw new Error("Cannot delete Karigar with existing work records. Deactivate instead.")

    const { error } = await supabase
        .from('karigars')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) throw error
    cacheStore.invalidate(KARIGARS_CACHE_KEY)
}

export const getKarigarBalances = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    return cacheStore.getOrFetch('karigar_balances', async () => {
        const { data, error } = await supabase
            .from('karigars')
            .select('id, current_balance, current_metal_balance')
            .eq('user_id', user.id)

        if (error) throw error

        const balances: { [key: string]: { cash: number, metal: number } } = {}
        data?.forEach((k: any) => {
            balances[k.id] = {
                cash: Number(k.current_balance) || 0,
                metal: Number(k.current_metal_balance) || 0
            }
        })
        return balances
    }, 1000 * 60 * 5); // 5 minutes TTL
}

export const issueMetalToKarigar = async (karigarId: string, weight: number, date: string, note: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('issue_metal_to_karigar', {
        p_karigar_id: karigarId,
        p_weight: weight,
        p_date: date,
        p_note: note
    })
    if (error) throw error
    cacheStore.invalidatePattern('stock_')
    cacheStore.invalidate(KARIGARS_CACHE_KEY)
    return data
}

export const receiveProductionFromKarigar = async (
    karigarId: string,
    productId: string,
    quantity: number,
    weight: number,
    wastageWeight: number,
    laborRate: number,
    date: string,
    note: string
) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('receive_production_from_karigar', {
        p_karigar_id: karigarId,
        p_product_id: productId,
        p_quantity: quantity,
        p_weight: weight,
        p_wastage: wastageWeight,
        p_labor_rate: laborRate,
        p_date: date,
        p_note: note
    })
    if (error) throw error
    cacheStore.invalidatePattern('stock_')
    cacheStore.invalidate(KARIGARS_CACHE_KEY)
    cacheStore.invalidate('pl_report')
    return data
}

export const recordKarigarPayment = async (karigarId: string, amount: number, mode: string, date: string, notes: string = '') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const params = {
        p_karigar_id: karigarId,
        p_amount: amount,
        p_mode: mode,
        p_date: date,
        p_notes: notes
    }

    const { data, error } = await supabase.rpc('settle_karigar_payment_atomic', params)

    if (error) throw error

    // Invalidate caches
    cacheStore.invalidate(KARIGARS_CACHE_KEY)
    cacheStore.invalidate('pl_report')

    return data
}

// Helper to get name
const getKarigarName = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'Unknown';

    const { data } = await supabase.from('karigars')
        .select('name')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
    return data?.name || 'Unknown'
}

export const getKarigarStats = async (karigarId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    return cacheStore.getOrFetch(`karigar_stats_${karigarId}`, async () => {
        const { data: records, error: rError } = await supabase
            .from('karigar_work_records')
            .select('amount')
            .eq('karigar_id', karigarId)
            .eq('payment_status', 'PENDING')
            .eq('user_id', user.id)

        if (rError) throw rError

        const pendingWork = records.reduce((sum: number, r: any) => sum + Number(r.amount), 0)

        const { data: kData, error: kError } = await supabase
            .from('karigars')
            .select('current_balance, current_metal_balance')
            .eq('id', karigarId)
            .eq('user_id', user.id)
            .single()

        if (kError) throw kError

        return {
            pendingWork: 0, // In this new model, balance logic is handled by current_balance directly
            cashBalance: Number(kData.current_balance) || 0,
            metalBalance: Number(kData.current_metal_balance) || 0
        }
    }, 1000 * 60 * 5); // 5 minutes TTL
}

export const getKarigarSettlementReport = async (karigarId: string, month: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const startDate = `${month}-01`;
    const lastDay = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).getDate();
    const endDate = `${month}-${lastDay}`;

    // 1. Calculate Opening Due (Work - Payments before month)
    const { data: earlyWork, error: ewError } = await supabase
        .from('karigar_work_records')
        .select('amount')
        .eq('karigar_id', karigarId)
        .eq('user_id', user.id)
        .lt('work_date', startDate)

    if (ewError) throw ewError
    const totalWorkBefore = (earlyWork || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0)

    const { data: earlyPayments, error: epError } = await supabase
        .from('karigar_payments')
        .select('amount')
        .eq('karigar_id', karigarId)
        .eq('user_id', user.id)
        .lt('payment_date', startDate)

    if (epError) throw epError
    const totalPaidBefore = (earlyPayments || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0)

    const openingDue = totalWorkBefore - totalPaidBefore

    // 2. Get Work Records for Month
    const { data: monthWork, error: mwError } = await supabase
        .from('karigar_work_records')
        .select('*')
        .eq('karigar_id', karigarId)
        .eq('user_id', user.id)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .order('work_date', { ascending: true })

    if (mwError) throw mwError

    // 3. Get Payments for Month
    const { data: monthPayments, error: mpError } = await supabase
        .from('karigar_payments')
        .select('*')
        .eq('karigar_id', karigarId)
        .eq('user_id', user.id)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date', { ascending: true })

    if (mpError) throw mpError

    const totalWorkMonth = (monthWork || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0)
    const totalPaidMonth = (monthPayments || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0)

    return {
        openingDue,
        workRecords: monthWork || [],
        payments: monthPayments || [],
        totalWorkMonth,
        totalPaidMonth,
        closingDue: openingDue + totalWorkMonth - totalPaidMonth
    }
}
