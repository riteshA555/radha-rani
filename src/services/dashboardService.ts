import { supabase } from '../supabaseClient';
import { cacheStore } from './cacheStore';

export interface DashboardCompositeData {
    kpis: {
        total_receivable: number;
        total_advance: number;
        today_sales: number;
    };
    stock: {
        raw_silver: number;
        wastage: number;
        finished_goods_weight: number;
    };
    recent_orders: any[];
    recent_rates: any[];
    karigar_overview: any[];
    live_rate: number;
    local_rate?: {
        selling_rate: number;
        buying_rate: number;
        rate_date: string;
        purity: string;
    } | null;
}

const DASHBOARD_CACHE_KEY = 'dashboard_full_bundle';

export const getDashboardFullData = async (): Promise<DashboardCompositeData> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    return cacheStore.getOrFetch(DASHBOARD_CACHE_KEY, async () => {
        const { data, error } = await supabase.rpc('get_dashboard_composite_data');
        if (error) {
            console.error('Super RPC Failed:', error);
            throw error;
        }
        return data as DashboardCompositeData;
    }, 1000 * 60 * 1, true); // 1 min TTL (reduced from 10 mins) for better responsiveness
};

export const invalidateDashboardCache = () => {
    cacheStore.invalidate(DASHBOARD_CACHE_KEY);
};
