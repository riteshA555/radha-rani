import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSettings, updateSettings, getAllSettings } from '../services/settingsService'
import { useAuth } from './AuthContext'
import i18n from '../i18n'
import {
    BusinessProfileSettings,
    GSTSettings,
    InvoiceSettings,
    UserSettings,
    InventorySettings,
    PricingSettings,
    NotificationSettings,
    KarigarSettings,
    CustomerSettings,
    SystemSettings,
    SettingsCategory,
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

interface SettingsState {
    business_profile: BusinessProfileSettings
    invoice_settings: InvoiceSettings
    gst_settings: GSTSettings
    user_settings: UserSettings
    inventory_settings: InventorySettings
    pricing_settings: PricingSettings
    notification_settings: NotificationSettings
    karigar_settings: KarigarSettings
    customer_settings: CustomerSettings
    system_settings: SystemSettings
}

interface SettingsContextType {
    settings: SettingsState
    updateSetting: (category: SettingsCategory, value: any) => Promise<void>
    refreshSettings: () => Promise<void>
    loading: boolean
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const useSettings = () => {
    const context = useContext(SettingsContext)
    if (!context) throw new Error('useSettings must be used within a SettingsProvider')
    return context
}

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, loading: authLoading } = useAuth()
    const [settings, setSettings] = useState<SettingsState>(() => {
        // Try to load from localStorage for ultra-fast initial load
        const cached = localStorage.getItem('app_settings_v2')
        if (cached) {
            try {
                return JSON.parse(cached)
            } catch (e) {
                console.warn('Failed to parse cached settings', e)
            }
        }
        return {
            business_profile: DEFAULT_BUSINESS_PROFILE,
            invoice_settings: DEFAULT_INVOICE_SETTINGS,
            gst_settings: DEFAULT_GST_SETTINGS,
            user_settings: DEFAULT_USER_SETTINGS,
            inventory_settings: DEFAULT_INVENTORY_SETTINGS,
            pricing_settings: DEFAULT_PRICING_SETTINGS,
            notification_settings: DEFAULT_NOTIFICATION_SETTINGS,
            karigar_settings: DEFAULT_KARIGAR_SETTINGS,
            customer_settings: DEFAULT_CUSTOMER_SETTINGS,
            system_settings: DEFAULT_SYSTEM_SETTINGS
        }
    })
    const [loading, setLoading] = useState(!localStorage.getItem('app_settings_v2'))

    const loadAllSettings = useCallback(async () => {
        try {
            // If we have cached data, don't show the blocking loader
            const hasData = !!settings.business_profile
            if (!hasData) setLoading(true)

            const all = await getAllSettings()
            setSettings(all as any)

            // Persist to localStorage
            localStorage.setItem('app_settings_v2', JSON.stringify(all))
        } catch (error: any) {
            if (error.name === 'AbortError') return;
            console.error('Failed to load global settings', error)
        } finally {
            setLoading(false)
        }
    }, [settings.business_profile])

    useEffect(() => {
        if (!authLoading) {
            if (user) {
                loadAllSettings()
            } else {
                setLoading(false)
                localStorage.removeItem('app_settings_v2')
            }
        }
    }, [user, authLoading, loadAllSettings])

    // Apply Theme & Side-Effects
    useEffect(() => {
        if (settings.user_settings) {
            const theme = settings.user_settings.theme || 'light'
            const root = window.document.documentElement
            root.classList.remove('light', 'dark')
            root.classList.add(theme)
            root.style.colorScheme = theme

            // Apply Language
            const lang = settings.user_settings.language || 'en'
            i18n.changeLanguage(lang).catch(e => console.warn('Failed to apply language', e))
        }
    }, [settings.user_settings])

    const updateSetting = async (category: SettingsCategory, value: any) => {
        // Optimistic Update
        setSettings(prev => ({
            ...prev,
            [category]: { ...prev[category as keyof SettingsState], ...value }
        }))

        try {
            await updateSettings(category, value)
        } catch (error) {
            console.error(`Failed to update settings for ${category}`, error)
            // Rollback could be implemented here if needed
            await loadAllSettings()
        }
    }

    return (
        <SettingsContext.Provider value={{ settings, updateSetting, refreshSettings: loadAllSettings, loading }}>
            {children}
        </SettingsContext.Provider>
    )
}
