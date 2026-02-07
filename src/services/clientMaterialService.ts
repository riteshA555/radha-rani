import { supabase } from '../supabaseClient'
import { ClientMaterialTransaction, ClientMaterialBalance } from '../types'
import { cacheStore } from './cacheStore'

const CACHE_KEYS = {
    TRANSACTIONS: 'client_material_transactions',
    STATEMENT: 'client_material_statement'
}

export const getClientMaterialTransactions = async (): Promise<ClientMaterialTransaction[]> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    return cacheStore.getOrFetch(CACHE_KEYS.TRANSACTIONS, async () => {
        const { data, error } = await supabase
            .from('client_raw_material_ledger')
            .select('*')
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as ClientMaterialTransaction[];
    });
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
    cacheStore.invalidate(CACHE_KEYS.TRANSACTIONS);
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
    cacheStore.invalidate(CACHE_KEYS.TRANSACTIONS);
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
    cacheStore.invalidate(CACHE_KEYS.TRANSACTIONS);
    cacheStore.invalidate(CACHE_KEYS.STATEMENT);
};

export const getClientMaterialBalances = async (): Promise<ClientMaterialBalance[]> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    return cacheStore.getOrFetch(CACHE_KEYS.STATEMENT, async () => {
        const { data: transactions, error: txError } = await supabase
            .from('client_raw_material_ledger')
            .select('client_name, client_id, transaction_type, quantity')
            .eq('user_id', user.id);

        if (txError) throw txError;

        const summary: Record<string, ClientMaterialBalance> = {};

        (transactions as any[] || []).forEach(tx => {
            const key = tx.client_id || tx.client_name;
            if (!summary[key]) {
                summary[key] = {
                    client_name: tx.client_name,
                    client_id: tx.client_id,
                    received: 0,
                    consumed: 0,
                    loss: 0,
                    balance: 0
                };
            }

            if (tx.transaction_type === 'RECEIPT') summary[key].received += Number(tx.quantity);
            if (tx.transaction_type === 'CONSUMPTION') summary[key].consumed += Number(tx.quantity);
            if (tx.transaction_type === 'LOSS') summary[key].loss += Number(tx.quantity);
        });

        return Object.values(summary).map(s => ({
            ...s,
            balance: s.received - s.consumed - s.loss
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
    return data as ClientMaterialTransaction[];
};
