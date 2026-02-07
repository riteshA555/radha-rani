import { supabase } from '../supabaseClient'
import { cacheStore } from './cacheStore'

export type MetalType = 'GOLD' | 'SILVER';

export interface MetalRate {
    id: string;
    rate_date: string;
    metal_type: MetalType;
    purity: string;
    selling_rate: number;
    buying_rate?: number;
    source: string;
    notes?: string;
    created_at: string;
}

const CACHE_KEYS = {
    LATEST_RATES: 'latest_metal_rates',
    RATE_HISTORY: 'metal_rate_history',
    RATE_HISTORY_PREFIX: 'metal_rate_history_'
}

const RATE_TTL = 1000 * 60 * 5; // 5 minutes

export const getLatestRates = async (): Promise<MetalRate[]> => {
    return cacheStore.getOrFetch(CACHE_KEYS.LATEST_RATES, async () => {
        // Fetch the latest entry for each distinct metal/purity combination
        const { data, error } = await supabase
            .from('metal_rates')
            .select('*')
            .order('rate_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Group by metal_type and purity to get only the latest for each
        const latestMap = new Map<string, MetalRate>();
        data?.forEach((rate: MetalRate) => {
            const key = `${rate.metal_type}_${rate.purity}`;
            if (!latestMap.has(key)) {
                latestMap.set(key, rate);
            }
        });

        return Array.from(latestMap.values());
    }, RATE_TTL, true); // Persist rates
}

export const getRateHistory = async (metal?: MetalType, purity?: string): Promise<MetalRate[]> => {
    const cacheKey = `${CACHE_KEYS.RATE_HISTORY_PREFIX}${metal || 'all'}_${purity || 'all'}`;

    return cacheStore.getOrFetch(cacheKey, async () => {
        let query = supabase
            .from('metal_rates')
            .select('*')
            .order('rate_date', { ascending: true });

        if (metal) query = query.eq('metal_type', metal);
        if (purity) query = query.eq('purity', purity);

        const { data, error } = await query;
        if (error) throw error;
        return data as MetalRate[];
    }, RATE_TTL, true); // Persist history
}

export const addMetalRate = async (rate: Omit<MetalRate, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('metal_rates')
        .upsert(rate, { onConflict: 'rate_date,metal_type,purity,source' })
        .select()
        .single();

    if (error) throw error;

    // Invalidate caches
    cacheStore.invalidate(CACHE_KEYS.LATEST_RATES);
    cacheStore.invalidatePattern(CACHE_KEYS.RATE_HISTORY);
    cacheStore.invalidatePattern('stock_summary');

    return data as MetalRate;
}

export const deleteMetalRate = async (id: string) => {
    const { error } = await supabase
        .from('metal_rates')
        .delete()
        .eq('id', id);

    if (error) throw error;

    cacheStore.invalidate(CACHE_KEYS.LATEST_RATES);
    cacheStore.invalidatePattern(CACHE_KEYS.RATE_HISTORY);
    cacheStore.invalidatePattern('stock_summary');
}
