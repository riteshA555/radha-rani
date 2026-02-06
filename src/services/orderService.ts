import { supabase } from '../supabaseClient'
import { Order, OrderItem } from '../types'
import { cacheStore } from './cacheStore'
import { sanitizeString, validateNumber, validateDate } from '../shared/utils/validation'

const CACHE_KEYS = {
    ORDERS: 'orders_list'
}

export const getOrders = async () => {
    return cacheStore.getOrFetch(CACHE_KEYS.ORDERS, async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('*, items:order_items(*)')
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as Order[]
    })
}

// Updated type definition implicitly via the arguments
export const createOrder = async (
    order: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'order_number' | 'user_id' | 'gst_enabled' | 'gst_rate' | 'gst_amount' | 'subtotal' | 'total_amount'> & {
        discount_amount?: number,
        delivery_date?: string,
        notes?: string
    },
    items: Omit<OrderItem, 'id' | 'order_id' | 'amount'>[],
    gstEnabled: boolean = false,
    gstRate: number = 3,
    advanceAmount: number = 0,
    paymentMode: string = 'CASH'
) => {
    // Input validation
    const customerName = sanitizeString(order.customer_name, 100)
    if (!customerName) throw new Error('Invalid customer name')

    if (!validateDate(order.order_date)) throw new Error('Invalid order date')

    const validatedGstRate = validateNumber(gstRate, 0, 100)
    if (validatedGstRate === null) throw new Error('Invalid GST rate')

    // Validate items
    const validatedItems = items.map(item => ({
        ...item,
        description: sanitizeString(item.description || '', 200),
        quantity: validateNumber(item.quantity, 0, 10000) || 0,
        weight: validateNumber(item.weight, 0, 100000) || 0,
        rate: validateNumber(item.rate, 0, 999999) || 0
    }))

    const { data, error } = await supabase.rpc('create_order_atomic', {
        p_customer_name: customerName,
        p_order_date: order.order_date,
        p_material_type: order.material_type,
        p_items: validatedItems,
        p_gst_enabled: gstEnabled,
        p_gst_rate: validatedGstRate,
        // New Parameters
        p_discount_amount: order.discount_amount || 0,
        p_delivery_date: order.delivery_date || null,
        p_notes: order.notes || '',
        p_advance_amount: advanceAmount,
        p_payment_mode: paymentMode
    })

    if (error) {
        console.error('RPC Error Details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        })
        throw new Error(error.message || 'Failed to create order')
    }

    // Invalidate related caches
    cacheStore.invalidate(CACHE_KEYS.ORDERS)
    cacheStore.invalidate('dashboard_stats')
    cacheStore.invalidatePattern('stock_') // Orders affect stock
    cacheStore.invalidatePattern('ledger_') // Payments affect ledgers

    return data
}

export const updateOrderStatus = async (orderId: string, status: string) => {
    const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()

    if (error) throw error
    cacheStore.invalidate(CACHE_KEYS.ORDERS)
    cacheStore.invalidate('dashboard_stats')
    return data[0]
}

export const deleteOrder = async (orderId: string) => {
    // 1. Delete Stock Transactions
    const { error: stockError } = await supabase
        .from('stock_transactions')
        .delete()
        .eq('order_id', orderId)
    if (stockError) throw stockError

    // 2. Delete Accounting Transactions
    const { error: transError } = await supabase
        .from('transactions')
        .delete()
        .eq('order_id', orderId)
    if (transError) throw transError

    // 3. Delete Karigar Work Records
    const { error: workError } = await supabase
        .from('karigar_work_records')
        .delete()
        .eq('order_id', orderId)
    if (workError) throw workError


    const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

    if (error) throw error

    // Invalidate related caches
    cacheStore.invalidate(CACHE_KEYS.ORDERS)
    cacheStore.invalidate('dashboard_stats')
    cacheStore.invalidatePattern('stock_') // Deleting orders affects stock
}

export const deleteOrders = async (orderIds: string[]) => {
    if (orderIds.length === 0) return

    // 1. Delete Stock Transactions
    const { error: stockError } = await supabase
        .from('stock_transactions')
        .delete()
        .in('order_id', orderIds)
    if (stockError) throw stockError

    // 2. Delete Accounting Transactions
    const { error: transError } = await supabase
        .from('transactions')
        .delete()
        .in('order_id', orderIds)
    if (transError) throw transError

    // 3. Delete Karigar Work Records
    const { error: workError } = await supabase
        .from('karigar_work_records')
        .delete()
        .in('order_id', orderIds)
    if (workError) throw workError



    const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds)

    if (error) throw error

    // Invalidate related caches
    cacheStore.invalidate(CACHE_KEYS.ORDERS)
    cacheStore.invalidate('dashboard_stats')
    cacheStore.invalidatePattern('stock_')
}
