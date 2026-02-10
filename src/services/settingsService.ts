import { supabase } from '../supabaseClient'
import { cacheStore } from './cacheStore'
import {
    Setting,
    SettingsCategory,
    // ... imports kept for type safety, though logic is simplified for brevity in this replace
    DEFAULT_BUSINESS_PROFILE,
    DEFAULT_INVOICE_SETTINGS,
    DEFAULT_GST_SETTINGS,
    DEFAULT_USER_SETTINGS,
    DEFAULT_INVENTORY_SETTINGS,
    DEFAULT_PRICING_SETTINGS,
    DEFAULT_NOTIFICATION_SETTINGS,
    DEFAULT_KARIGAR_SETTINGS,
    DEFAULT_CUSTOMER_SETTINGS,
    DEFAULT_SYSTEM_SETTINGS
} from '../types/settings'

// Cache for settings
const settingsCache = new Map<string, any>()

// Get default settings for a category
function getDefaultSettings(category: SettingsCategory): any {
    switch (category) {
        case 'business_profile': return DEFAULT_BUSINESS_PROFILE
        case 'invoice_settings': return DEFAULT_INVOICE_SETTINGS
        case 'gst_settings': return DEFAULT_GST_SETTINGS
        case 'user_settings': return DEFAULT_USER_SETTINGS
        case 'inventory_settings': return DEFAULT_INVENTORY_SETTINGS
        case 'pricing_settings': return DEFAULT_PRICING_SETTINGS
        case 'notification_settings': return DEFAULT_NOTIFICATION_SETTINGS
        case 'karigar_settings': return DEFAULT_KARIGAR_SETTINGS
        case 'customer_settings': return DEFAULT_CUSTOMER_SETTINGS
        case 'system_settings': return DEFAULT_SYSTEM_SETTINGS
        default: return {}
    }
}

// Get settings by category
export async function getSettings<T>(category: SettingsCategory): Promise<T> {
    const cacheKey = `settings_${category}`
    if (settingsCache.has(cacheKey)) {
        return settingsCache.get(cacheKey) as T
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return getDefaultSettings(category) as T

    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', category)
        .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error

    const settings = data?.settings || getDefaultSettings(category)
    settingsCache.set(cacheKey, settings)
    return settings as T
}

// Update settings
export async function updateSettings<T>(category: SettingsCategory, settings: Partial<T>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const existingSettings = await getSettings<T>(category)
    const updatedSettings = { ...existingSettings, ...settings }

    const { error } = await supabase
        .from('settings')
        .upsert({
            user_id: user.id,
            category,
            settings: updatedSettings
        }, {
            onConflict: 'user_id,category'
        })

    if (error) throw error
    const cacheKey = `settings_${category}`
    settingsCache.set(cacheKey, updatedSettings)
}

// Reset settings to default
export async function resetSettings(category: SettingsCategory): Promise<void> {
    const defaultSettings = getDefaultSettings(category)
    await updateSettings(category, defaultSettings)
}

// Clear settings cache
export function clearSettingsCache(category?: SettingsCategory): void {
    if (category) {
        settingsCache.delete(`settings_${category}`)
    } else {
        settingsCache.clear()
    }
}

// Get all settings in a single efficient query
export async function getAllSettings(): Promise<Record<string, any>> {
    const { data: { user } } = await supabase.auth.getUser()
    const categories: SettingsCategory[] = [
        'business_profile', 'invoice_settings', 'gst_settings', 'user_settings',
        'inventory_settings', 'pricing_settings', 'notification_settings',
        'karigar_settings', 'customer_settings', 'system_settings'
    ]

    const allSettings: any = {}
    categories.forEach(cat => {
        allSettings[cat] = getDefaultSettings(cat)
    })

    if (!user) return allSettings

    const { data, error } = await supabase
        .from('settings')
        .select('category, settings')
        .eq('user_id', user.id)

    if (error) throw error

    data?.forEach((item: any) => {
        if (item.category && item.settings) {
            allSettings[item.category] = item.settings
            settingsCache.set(`settings_${item.category}`, item.settings)
        }
    })

    return allSettings
}

// Export all settings and data as a single JSON
export async function exportFullData(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const tables = [
        'settings', 'ledgers', 'karigars', 'products', 'job_work_items',
        'base_material_types', 'metal_inventory', 'metal_rates', 'orders',
        'order_items', 'stock_transactions', 'transactions', 'karigar_work_records',
        'karigar_payments', 'expenses', 'client_raw_material_ledger'
        // Removed 'contacts' as it does not exist
    ]

    const fullBackup: any = {
        meta: {
            version: '3.0',
            exported_at: new Date().toISOString(),
            user_id: user.id
        },
        data: {}
    }

    for (const table of tables) {
        // Safe check if table exists (handled by try/catch in calling code usually, but here we just warn)
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('user_id', user.id)

        if (error) {
            console.warn(`Backup: Failed to fetch ${table}`, error)
            fullBackup.data[table] = []
        } else {
            fullBackup.data[table] = data
        }
    }

    await updateSettings('system_settings', { lastBackupAt: new Date().toISOString() })
    return JSON.stringify(fullBackup, null, 2)
}

// Import all settings and data from JSON
export async function importFullData(jsonData: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    try {
        const backup = JSON.parse(jsonData)
        if (!backup.data || typeof backup.data !== 'object') {
            throw new Error('Invalid backup file format')
        }

        const tablesInOrder = [
            'settings', 'ledgers', 'karigars', 'products', 'job_work_items',
            'base_material_types', 'metal_inventory', 'metal_rates', 'orders',
            'order_items', 'stock_transactions', 'transactions', 'karigar_work_records',
            'karigar_payments', 'expenses', 'client_raw_material_ledger'
        ]

        for (const table of tablesInOrder) {
            const tableData = backup.data[table]
            if (!tableData || !Array.isArray(tableData) || tableData.length === 0) continue

            const cleanedData = tableData.map(row => ({
                ...row,
                user_id: user.id
            }))

            const { error } = await supabase
                .from(table)
                .upsert(cleanedData, { onConflict: 'id' })

            if (error) {
                console.error(`Import: Failed for ${table}`, error)
                // Continue best effort or throw?
                throw new Error(`Failed to restore ${table}: ${error.message}`)
            }
        }
    } catch (e) {
        throw new Error('Import failed: ' + (e as Error).message)
    }
}

// ------------------------------------------------------------------
// NEW SECURE FACTORY RESET - Digital Precision Implementation
// ------------------------------------------------------------------
export async function factoryReset(): Promise<void> {
    console.log('Initiating Secure Factory Reset...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Call the new secure RPC function
    const { error } = await supabase.rpc('secure_factory_reset');

    if (error) {
        console.error('Secure Reset Failed:', error);
        // Provide user-friendly error
        throw new Error(`System Wipe failed: ${error.message}. Please contact support.`);
    }

    // Aggressive Cache Clearing
    try {
        console.log('Clearing local caches...');
        cacheStore.clear(true);
        settingsCache.clear();
        localStorage.clear();
        sessionStorage.clear();

        // Unregister service workers to ensure fresh start
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }
    } catch (e) {
        console.warn('Cache clear warning:', e);
    }

    console.log('Factory Reset Complete.');
}
