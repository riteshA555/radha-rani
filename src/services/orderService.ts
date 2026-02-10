import { supabase } from '../supabaseClient'
import { Order, OrderItem } from '../types'
import { cacheStore } from './cacheStore'
import { sanitizeString, validateNumber, validateDate } from '../shared/utils/validation'

const CACHE_KEYS = {
    ORDERS: 'orders_list'
}

export const getOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    return cacheStore.getOrFetch(CACHE_KEYS.ORDERS, async () => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                items:order_items(*),
                ledger:ledgers(customer_code, contact_info)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Flatten the joined data
        const flattened = (data || []).map((order: any) => ({
            ...order,
            customer_code: order.ledger?.customer_code,
            contact_info: order.ledger?.contact_info
        }))

        return flattened as Order[]
    }, 1000 * 60 * 5, true) // 5 mins TTL, persistent
}

export const getOrderById = async (orderId: string): Promise<Order | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

    if (error) {
        console.error('Fetch Order Error:', error);
        return null;
    }
    return data as Order;
}

// Updated type definition implicitly via the arguments
export const createOrder = async (
    order: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'order_number' | 'user_id' | 'gst_enabled' | 'gst_rate' | 'gst_amount' | 'subtotal' | 'total_amount' | 'advance_amount' | 'payment_mode' | 'ledger_id'> & {
        ledger_id?: string, // NEW: Specific ledger ID to link
        discount_amount?: number,
        delivery_date?: string,
        notes?: string
    },
    items: Omit<OrderItem, 'id' | 'order_id' | 'amount'>[],
    gstEnabled: boolean = false,
    gstRate: number = 3,
    advanceAmount: number = 0,
    paymentMode: string = 'CASH',
    includeLedgerBalance: boolean = true
) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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
        p_payment_mode: paymentMode,
        p_include_ledger_balance: includeLedgerBalance,
        p_ledger_id: order.ledger_id // PASS THE LEDGER ID
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
    cacheStore.invalidate('finished_goods') // Explicitly invalidate finished goods for notifications
    cacheStore.invalidatePattern('stock_') // Orders affect stock
    cacheStore.invalidatePattern('ledger_') // Payments affect ledgers

    return data
}

export const updateOrderStatus = async (orderId: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // If cancelling, use atomic reversal RPC
    if (status.toLowerCase() === 'cancelled') {
        const { data, error } = await supabase.rpc('cancel_order_atomic', { p_order_id: orderId })
        if (error) throw error
        cacheStore.invalidate(CACHE_KEYS.ORDERS)
        cacheStore.invalidate('dashboard_stats')
        cacheStore.invalidatePattern('stock_')
        cacheStore.invalidatePattern('ledger_')
        return data
    }

    const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .eq('user_id', user.id) // Ensure ownership
        .select()

    if (error) throw error
    if (data.length === 0) throw new Error('Order not found or access denied')

    cacheStore.invalidate(CACHE_KEYS.ORDERS)
    cacheStore.invalidate('dashboard_stats')
    return data[0]
}

export const deleteOrder = async (orderId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Security check: Verify ownership before RPC call if RPC doesn't check it
    const { data: order } = await supabase.from('orders').select('user_id').eq('id', orderId).single();
    if (!order || order.user_id !== user.id) throw new Error('Access denied');

    // Use atomic deletion RPC which handles side-effect reversal
    const { data, error } = await supabase.rpc('delete_order_atomic', { p_order_id: orderId })

    if (error) throw error

    // Check internal success flag from RPC
    if (data && typeof data === 'object' && 'success' in data && !data.success) {
        throw new Error((data as any).error || 'Failed to delete order')
    }

    // Invalidate related caches
    cacheStore.invalidate(CACHE_KEYS.ORDERS)
    cacheStore.invalidate('dashboard_stats')
    cacheStore.invalidatePattern('stock_') // Deleting orders affects stock
    cacheStore.invalidatePattern('ledger_') // Ledger entries are removed
    return data
}

export const deleteOrders = async (orderIds: string[]) => {
    if (orderIds.length === 0) return
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Delete Stock Transactions
    const { error: stockError } = await supabase
        .from('stock_transactions')
        .delete()
        .in('order_id', orderIds)
        .eq('user_id', user.id)
    if (stockError) throw stockError

    // 2. Delete Accounting Transactions
    const { error: transError } = await supabase
        .from('transactions')
        .delete()
        .in('order_id', orderIds)
        .eq('user_id', user.id)
    if (transError) throw transError

    // 3. Delete Karigar Work Records
    const { error: workError } = await supabase
        .from('karigar_work_records')
        .delete()
        .in('order_id', orderIds)
        .eq('user_id', user.id)
    if (workError) throw workError

    const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds)
        .eq('user_id', user.id)

    if (error) throw error

    // Invalidate related caches
    cacheStore.invalidate(CACHE_KEYS.ORDERS)
    cacheStore.invalidate('dashboard_stats')
    cacheStore.invalidatePattern('stock_')
}

export const getDashboardKPIs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    return cacheStore.getOrFetch('dashboard_kpis', async () => {
        const { data, error } = await supabase.rpc('get_dashboard_kpis');
        if (error) throw error;
        return data as {
            total_receivable: number;
            total_advance: number;
            today_sales: number;
            monthly_job_work_income: number;
            raw_silver_stock_value: number;
            finished_goods_stock_value: number;
        };
    }, 1000 * 60 * 2, true); // 2 minutes TTL, persistent
}
