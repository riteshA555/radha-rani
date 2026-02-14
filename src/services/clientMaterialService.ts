import { supabase } from '../supabaseClient'
import { ClientMaterialTransaction, ClientMaterialBalance } from '../types'
import { cacheStore } from './cacheStore'

const CACHE_KEYS = {
    TRANSACTIONS: 'client_material_transactions',
    STATEMENT: 'client_material_statement'
}

export const getClientMaterialTransactions = async (page: number = 1, pageSize: number = 20, startDate?: string, endDate?: string, search?: string, type?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], count: 0 }

    const cacheKey = `${CACHE_KEYS.TRANSACTIONS}_p${page}_s${pageSize}_${startDate || 'all'}_${endDate || 'all'}_${search || 'all'}_${type || 'ALL'}`;

    // Note: Search cache invalidation needs pattern matching
    // We used to use invalidate() which only cleared exact keys. Now we use invalidatePattern() in mutators.

    return cacheStore.getOrFetch(cacheKey, async () => {
        let query = supabase
            .from('client_raw_material_ledger')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id);

        if (startDate) query = query.gte('transaction_date', startDate);
        if (endDate) query = query.lte('transaction_date', endDate);

        if (search) {
            // Search in client_name OR remarks
            // or logic needs specific syntax in Supabase
            query = query.or(`client_name.ilike.%${search}%,remarks.ilike.%${search}%`);
        }

        if (type && type !== 'ALL') {
            query = query.eq('transaction_type', type);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await query
            .order('transaction_date', { ascending: false })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const mappedData = (data as any[] || []).map(tx => ({
            ...tx,
            quantity: Number(tx.quantity || 0)
        }));

        return { data: mappedData as ClientMaterialTransaction[], count: count || 0 };
    }, 1000 * 60 * 2, true); // 2 mins
};

export const addClientMaterialTransaction = async (
    transaction: Omit<ClientMaterialTransaction, 'id' | 'created_at' | 'user_id'>
): Promise<ClientMaterialTransaction> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('client_raw_material_ledger')
        .insert({ ...transaction, user_id: user.id })
        .select()
        .single();

    if (error) throw error;

    // Invalidate caches
    cacheStore.invalidatePattern(CACHE_KEYS.TRANSACTIONS);
    cacheStore.invalidate(CACHE_KEYS.STATEMENT);

    return data as ClientMaterialTransaction;
};

export const updateClientMaterialTransaction = async (
    id: string,
    updates: Partial<Omit<ClientMaterialTransaction, 'id' | 'created_at' | 'user_id'>>
): Promise<ClientMaterialTransaction> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('client_raw_material_ledger')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) throw error;

    // Invalidate caches
    cacheStore.invalidatePattern(CACHE_KEYS.TRANSACTIONS);
    cacheStore.invalidate(CACHE_KEYS.STATEMENT);

    return data as ClientMaterialTransaction;
};

export const deleteClientMaterialTransaction = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('client_raw_material_ledger')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) throw error;

    // Invalidate caches
    cacheStore.invalidatePattern(CACHE_KEYS.TRANSACTIONS);
    cacheStore.invalidate(CACHE_KEYS.STATEMENT);
};

export const getClientMaterialBalances = async (): Promise<ClientMaterialBalance[]> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    return cacheStore.getOrFetch(CACHE_KEYS.STATEMENT, async () => {
        // Use RPC for server-side aggregation (Much faster for large datasets)
        const { data, error } = await supabase.rpc('get_client_material_balances', {
            p_user_id: user.id
        });

        if (error) {
            console.error('RPC Error:', error);
            // Fallback to client-side if RPC fails (or not deployed)
            const { data: transactions, error: txError } = await supabase
                .from('client_raw_material_ledger')
                .select('client_name, client_id, transaction_type, quantity')
                .eq('user_id', user.id);

            if (txError) throw txError;

            const summary: Record<string, ClientMaterialBalance> = {};
            (transactions as any[] || []).forEach(tx => {
                const rawName = tx.client_name || 'Unknown';
                const key = rawName.trim().toLowerCase();

                if (!summary[key]) {
                    summary[key] = {
                        client_name: rawName.trim(),
                        client_id: tx.client_id || null,
                        received: 0,
                        consumed: 0,
                        loss: 0,
                        balance: 0
                    };
                }
                if (tx.client_id && !summary[key].client_id) {
                    summary[key].client_id = tx.client_id;
                    summary[key].client_name = rawName.trim();
                }

                if (tx.transaction_type === 'RECEIPT') summary[key].received += Number(tx.quantity);
                if (tx.transaction_type === 'CONSUMPTION') summary[key].consumed += Number(tx.quantity);
                if (tx.transaction_type === 'LOSS') summary[key].loss += Number(tx.quantity);
            });

            return Object.values(summary).map(s => ({
                ...s,
                balance: s.received - s.consumed - s.loss
            }));
        }

        // Map RPC result
        return (data as any[] || []).map(row => ({
            client_name: row.client_name,
            client_id: row.client_id,
            received: Number(row.received),
            consumed: Number(row.consumed),
            loss: Number(row.loss),
            balance: Number(row.received) - Number(row.consumed) - Number(row.loss)
        }));
    });
};

export const getClientMaterialDetailStatement = async (clientName: string): Promise<ClientMaterialTransaction[]> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('client_raw_material_ledger')
        .select('*')
        .eq('client_name', clientName)
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as any[] || []).map(tx => ({
        ...tx,
        quantity: Number(tx.quantity || 0)
    })) as ClientMaterialTransaction[];
};
