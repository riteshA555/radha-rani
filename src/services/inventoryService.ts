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
    STOCK_TRANSACTIONS_PREFIX: 'stock_transactions_'
}

export const getStockSummary = async (currentSilverRate: number): Promise<StockSummary> => {
    const cacheKey = `${CACHE_KEYS.STOCK_SUMMARY}_${currentSilverRate}`;

    return cacheStore.getOrFetch(cacheKey, async () => {
        // Use RPC or a more optimized query to get aggregated totals
        // SELECT item_type, type, SUM(quantity) as qty, SUM(weight_gm) as weight FROM stock_transactions GROUP BY item_type, type
        const { data, error } = await supabase
            .from('stock_transactions')
            .select('item_type, type, quantity, weight_gm')

        if (error) throw error

        let raw = 0
        let wastage = 0
        let fg_count = 0
        let fg_weight = 0

        data.forEach((t: any) => {
            const qty = Number(t.quantity || 0)
            const weight = Number(t.weight_gm || 0)

            if (t.item_type === 'RAW_SILVER') {
                if (t.type === 'RAW_IN') raw += qty
                else if (t.type === 'RAW_OUT' || t.type === 'PRODUCTION' || t.type === 'ADJUSTMENT') raw -= qty
            } else if (t.item_type === 'WASTAGE') {
                if (t.type === 'WASTAGE') wastage += qty
                else if (t.type === 'ADJUSTMENT') wastage -= qty
            } else if (t.item_type === 'FINISHED_GOODS') {
                if (t.type === 'PRODUCTION' || t.type === 'RAW_IN') {
                    fg_count += qty
                    fg_weight += weight
                } else if (t.type === 'ORDER_DEDUCTION' || t.type === 'ADJUSTMENT' || t.type === 'RAW_OUT') {
                    fg_count -= qty
                    fg_weight -= weight
                }
            }
        })

        return {
            raw_silver: raw,
            wastage: wastage,
            finished_goods_count: fg_count,
            finished_goods_weight: fg_weight,
            total_value: (raw + wastage + fg_weight) * (currentSilverRate / 1000)
        }
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
    const cacheKey = itemType
        ? `${CACHE_KEYS.STOCK_TRANSACTIONS_PREFIX}${itemType}`
        : CACHE_KEYS.STOCK_TRANSACTIONS;

    return cacheStore.getOrFetch(cacheKey, async () => {
        let query = supabase
            .from('stock_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)

        if (itemType) {
            query = query.eq('item_type', itemType)
        }

        const { data, error } = await query

        if (error) throw error
        return data as StockTransaction[]
    })
}

export const getFinishedGoodsInventory = async () => {
    return cacheStore.getOrFetch(CACHE_KEYS.FINISHED_GOODS, async () => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('name')

        if (error) throw error
        return data as Product[]
    })
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
