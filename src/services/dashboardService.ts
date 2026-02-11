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
    low_stock_products?: any[];
    live_rate: number;
    live_rate_gold: number;
    local_rate?: {
        selling_rate: number;
        buying_rate: number;
        rate_date: string;
        purity: string;
        metal_type: string;
    } | null;
    local_rate_gold?: {
        selling_rate: number;
        buying_rate: number;
        rate_date: string;
        purity: string;
        metal_type: string;
    } | null;
    debug_user_id?: string;
}

const DASHBOARD_CACHE_KEY = 'dashboard_full_bundle';

// Shared promise for deduplication
let activeDashboardRequest: Promise<DashboardCompositeData> | null = null;

export const getDashboardFullData = async (forceRefresh: boolean = false): Promise<DashboardCompositeData> => {
    // Return existing request if pending (Deduplication)
    if (activeDashboardRequest) {
        return activeDashboardRequest;
    }

    const request = (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const fetchFn = async () => {
            const { data, error } = await supabase.rpc('get_dashboard_composite_data');
            if (error) {
                console.error('Super RPC Failed:', error);
                throw error;
            }
            return data as DashboardCompositeData;
        };

        if (forceRefresh) {
            invalidateDashboardCache();
        }

        return cacheStore.getOrFetch(DASHBOARD_CACHE_KEY, fetchFn, 1000 * 60 * 1, true); // 1 min TTL
    })();

    activeDashboardRequest = request;

    try {
        return await request;
    } finally {
        activeDashboardRequest = null;
    }
};

export const invalidateDashboardCache = () => {
    cacheStore.invalidate(DASHBOARD_CACHE_KEY);
};
