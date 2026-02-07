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

// Get all settings
export async function getAllSettings(): Promise<Record<SettingsCategory, any>> {
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

    for (const category of categories) {
        allSettings[category] = await getSettings(category)
    }

    return allSettings
}

// Export settings as JSON
export async function exportSettings(): Promise<string> {
    const allSettings = await getAllSettings()
    return JSON.stringify(allSettings, null, 2)
}

// Import settings from JSON
export async function importSettings(jsonData: string): Promise<void> {
    const settings = JSON.parse(jsonData)

    for (const [category, data] of Object.entries(settings)) {
        await updateSettings(category as SettingsCategory, data as any)
    }
}

// Factory Reset: Wipe all data and settings
export async function factoryReset(): Promise<void> {
    const { error } = await supabase.rpc('reset_app_data')
    if (error) throw error

    // Clear all caches
    clearSettingsCache()
}
