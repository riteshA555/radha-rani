import { supabase } from '../supabaseClient'
import { cacheStore } from './cacheStore'

export interface BaseMaterialType {
    id: string;
    name: string;
    status: 'ACTIVE' | 'INACTIVE';
    usage_type: 'RECEIPT' | 'CONSUMPTION' | 'BOTH';
    created_at: string;
}

const CACHE_KEY = 'base_material_types'

export const getBaseMaterialTypes = async (): Promise<BaseMaterialType[]> => {
    return cacheStore.getOrFetch(CACHE_KEY, async () => {
        const { data, error } = await supabase
            .from('base_material_types')
            .select('*')
            .order('name');

        if (error) throw error;
        return data as BaseMaterialType[];
    });
};

export const createBaseMaterialType = async (name: string, usage_type: 'RECEIPT' | 'CONSUMPTION' | 'BOTH' = 'RECEIPT'): Promise<BaseMaterialType> => {
    const { data, error } = await supabase
        .from('base_material_types')
        .insert({ name, status: 'ACTIVE', usage_type })
        .select()
        .single();

    if (error) throw error;
    cacheStore.invalidate(CACHE_KEY);
    return data as BaseMaterialType;
};

export const updateBaseMaterialType = async (id: string, updates: Partial<BaseMaterialType>) => {
    const { error } = await supabase
        .from('base_material_types')
        .update(updates)
        .eq('id', id);

    if (error) throw error;
    cacheStore.invalidate(CACHE_KEY);
};

export const deleteBaseMaterialType = async (id: string) => {
    const { error } = await supabase
        .from('base_material_types')
        .delete()
        .eq('id', id);

    if (error) throw error;
    cacheStore.invalidate(CACHE_KEY);
};
