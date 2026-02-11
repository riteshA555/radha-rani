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

export const ensureBaseMaterialType = async (name: string, usage: 'RECEIPT' | 'CONSUMPTION'): Promise<void> => {
    if (!name || name.trim() === '') return;

    const normalized = name.trim();

    // Check if exists (case-insensitive)
    const { data: existing, error: fetchError } = await supabase
        .from('base_material_types')
        .select('*')
        .ilike('name', normalized)
        .maybeSingle();

    if (fetchError) {
        console.error('Error checking base material:', fetchError);
        return;
    }

    if (existing) {
        // Upgrade usage_type if necessary
        let newUsage = existing.usage_type;
        if (existing.usage_type === 'BOTH') return;
        if (existing.usage_type !== usage) {
            newUsage = 'BOTH';
        } else {
            return; // No change needed
        }

        await updateBaseMaterialType(existing.id, { usage_type: newUsage });
    } else {
        // Create new
        await createBaseMaterialType(normalized, usage);
    }
};
