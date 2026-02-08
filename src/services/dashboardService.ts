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
    }, 1000 * 60 * 2, true); // 2 mins TTL, persistent
};

export const invalidateDashboardCache = () => {
    cacheStore.invalidate(DASHBOARD_CACHE_KEY);
};
