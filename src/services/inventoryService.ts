import { supabase } from '../supabaseClient'
import { Product, StockTransaction, StockSummary, StockItemType } from '../types'
import { cacheStore } from './cacheStore'

export interface MetalInventory {
    id: string;
    name: string;
    weight_gm: number;
}

const CACHE_KEYS = {
    STOCK_SUMMARY: 'stock_summary',
    FINISHED_GOODS: 'finished_goods',
    STOCK_TRANSACTIONS: 'stock_transactions',
    STOCK_TRANSACTIONS_PREFIX: 'stock_transactions_',
    LOW_STOCK_ALERTS: 'low_stock_alerts'
}

export const getStockSummary = async (currentSilverRate: number): Promise<StockSummary> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {
        raw_silver: 0, wastage: 0, finished_goods_count: 0, finished_goods_weight: 0, total_value: 0
    };

    const cacheKey = `${CACHE_KEYS.STOCK_SUMMARY}_${currentSilverRate}`;

    return cacheStore.getOrFetch(cacheKey, async () => {
        const { data, error } = await supabase.rpc('get_stock_summary_v2', {
            p_silver_rate: currentSilverRate
        });

        if (error) {
            console.error('Stock Summary RPC failed:', error);
            throw error;
        }

        return data as StockSummary;
    }, 1000 * 60 * 10, true) // Persist for 10 mins
}

interface StockPaymentDetails {
    amount: number;
    mode: string;
    notes?: string;
    vendorId?: string; // Optional, required if mode is 'Credit'
}

export const addStockTransaction = async (
    transaction: Omit<StockTransaction, 'id' | 'created_at' | 'user_id'>,
    paymentDetails?: StockPaymentDetails
) => {
    // Prepare RPC params
    const params = {
        p_date: transaction.date,
        p_type: transaction.type,
        p_item_type: transaction.item_type,
        p_quantity: transaction.quantity,
        p_weight_gm: transaction.weight_gm || 0,
        p_product_id: transaction.product_id || null,
        p_note: transaction.note || '',
        p_source: transaction.source || '',
        p_rate_at_time: transaction.rate_at_time || 0,
        p_wastage_percent: transaction.wastage_percent || 0,
        p_payment_amount: paymentDetails?.amount || 0,
        p_payment_mode: paymentDetails?.mode || null,
        p_vendor_id: paymentDetails?.vendorId || null
    }

    const { data, error } = await supabase.rpc('add_stock_entry_atomic', params)

    if (error) throw error

    // Invalidate all related caches
    cacheStore.invalidate('pl_report') // Financials changed
    cacheStore.invalidatePattern(CACHE_KEYS.STOCK_SUMMARY)
    cacheStore.invalidatePattern(CACHE_KEYS.STOCK_TRANSACTIONS)
    cacheStore.invalidate(CACHE_KEYS.FINISHED_GOODS)

    return data
}

export const getStockTransactions = async (itemType?: StockItemType) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const cacheKey = itemType
        ? `${CACHE_KEYS.STOCK_TRANSACTIONS_PREFIX}${itemType}`
        : CACHE_KEYS.STOCK_TRANSACTIONS;

    return cacheStore.getOrFetch(cacheKey, async () => {
        let query = supabase
            .from('stock_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (itemType) {
            query = query.eq('item_type', itemType)
        }

        const { data, error } = await query

        if (error) throw error
        return data as StockTransaction[]
    }, 1000 * 60 * 10, true) // 10 mins, persistent
}

export const getFinishedGoodsInventory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    return cacheStore.getOrFetch(CACHE_KEYS.FINISHED_GOODS, async () => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('name')

        if (error) throw error
        return data as Product[]
    }, 1000 * 60 * 30, true) // 30 mins, persistent
}

// Finalized export for runtime stability
export const getLowStockAlerts = async (): Promise<any[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    return cacheStore.getOrFetch(CACHE_KEYS.LOW_STOCK_ALERTS, async () => {
        const { data, error } = await supabase.rpc('get_low_stock_alerts');
        if (error) throw error;
        return data || [];
    }, 1000 * 60 * 5, true); // 5 mins, persistent
}

// Legacy helpers kept for compatibility
export const getMetalInventory = async (): Promise<MetalInventory[]> => {
    const summary = await getStockSummary(0)
    return [
        { id: 'raw', name: 'Raw Silver', weight_gm: summary.raw_silver },
        { id: 'wastage', name: 'Wastage Silver', weight_gm: summary.wastage }
    ]
}

export const getFinishedGoodsWeight = async (): Promise<number> => {
    const summary = await getStockSummary(0)
    return summary.finished_goods_weight
}
