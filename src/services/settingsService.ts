import { supabase } from '../supabaseClient'
import {
    Setting,
    SettingsCategory,
    BusinessProfileSettings,
    InvoiceSettings,
    GSTSettings,
    UserSettings,
    InventorySettings,
    PricingSettings,
    NotificationSettings,
    KarigarSettings,
    CustomerSettings,
    SystemSettings,
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
        case 'business_profile':
            return DEFAULT_BUSINESS_PROFILE
        case 'invoice_settings':
            return DEFAULT_INVOICE_SETTINGS
        case 'gst_settings':
            return DEFAULT_GST_SETTINGS
        case 'user_settings':
            return DEFAULT_USER_SETTINGS
        case 'inventory_settings':
            return DEFAULT_INVENTORY_SETTINGS
        case 'pricing_settings':
            return DEFAULT_PRICING_SETTINGS
        case 'notification_settings':
            return DEFAULT_NOTIFICATION_SETTINGS
        case 'karigar_settings':
            return DEFAULT_KARIGAR_SETTINGS
        case 'customer_settings':
            return DEFAULT_CUSTOMER_SETTINGS
        case 'system_settings':
            return DEFAULT_SYSTEM_SETTINGS
        default:
            return {}
    }
}

// Get settings by category
export async function getSettings<T>(category: SettingsCategory): Promise<T> {
    // Check cache first
    const cacheKey = `settings_${category}`
    if (settingsCache.has(cacheKey)) {
        return settingsCache.get(cacheKey) as T
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', category)
        .maybeSingle()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error
    }

    // If no settings found, return defaults
    const settings = data?.settings || getDefaultSettings(category)

    // Cache the result
    settingsCache.set(cacheKey, settings)

    return settings as T
}

// Update settings
export async function updateSettings<T>(category: SettingsCategory, settings: Partial<T>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get existing settings
    const existingSettings = await getSettings<T>(category)

    // Merge with new settings
    const updatedSettings = { ...existingSettings, ...settings }

    // Upsert (insert or update)
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

    // Update cache
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
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('settings')
        .select('category, settings')
        .eq('user_id', user.id)

    if (error) throw error

    const categories: SettingsCategory[] = [
        'business_profile',
        'invoice_settings',
        'gst_settings',
        'user_settings',
        'inventory_settings',
        'pricing_settings',
        'notification_settings',
        'karigar_settings',
        'customer_settings',
        'system_settings'
    ]

    const allSettings: any = {}

    // Initialize with defaults
    categories.forEach(cat => {
        allSettings[cat] = getDefaultSettings(cat)
    })

    // Override with database values
    data?.forEach((item: any) => {
        if (item.category && item.settings) {
            allSettings[item.category] = item.settings
            // Also update the individual cache
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
        'settings',
        'orders',
        'order_items',
        'products',
        'stock_transactions',
        'transactions',
        'karigars',
        'karigar_work_records',
        'contacts',
        'expenses',
        'base_material_types',
        'client_raw_material_ledger'
    ]

    const fullBackup: any = {
        meta: {
            version: '2.0',
            exported_at: new Date().toISOString(),
            user_id: user.id
        },
        data: {}
    }

    for (const table of tables) {
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

    return JSON.stringify(fullBackup, null, 2)
}

// Import all settings and data from JSON
export async function importFullData(jsonData: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const backup = JSON.parse(jsonData)
    if (!backup.data || typeof backup.data !== 'object') {
        throw new Error('Invalid backup file format')
    }

    // Sequence matters for foreign keys (e.g., Karigars before Work Records, Orders before Items)
    const tablesInOrder = [
        'settings',
        'contacts',
        'karigars',
        'products',
        'base_material_types',
        'orders',
        'order_items',
        'stock_transactions',
        'transactions',
        'karigar_work_records',
        'expenses',
        'client_raw_material_ledger'
    ]

    for (const table of tablesInOrder) {
        const tableData = backup.data[table]
        if (!tableData || !Array.isArray(tableData) || tableData.length === 0) continue

        // Remove ID and created_at if you want to regenerate them, 
        // but for a perfect clone, we keep IDs and use upsert. 
        // We MUST ensure user_id is set to the CURRENT user to prevent cross-account injection.
        const cleanedData = tableData.map(row => ({
            ...row,
            user_id: user.id
        }))

        const { error } = await supabase
            .from(table)
            .upsert(cleanedData, { onConflict: 'id' })

        if (error) {
            console.error(`Import: Failed for ${table}`, error)
            throw new Error(`Failed to restore ${table}: ${error.message}`)
        }
    }
}

// Factory Reset: Wipe all data and settings
export async function factoryReset(): Promise<void> {
    const { error } = await supabase.rpc('reset_app_data')
    if (error) throw error

    // Clear all caches
    clearSettingsCache()
}
