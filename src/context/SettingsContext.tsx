import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSettings, updateSettings, getAllSettings } from '../services/settingsService'
import { useAuth } from './AuthContext'
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
    SettingsCategory
} from '../types/settings'

interface SettingsState {
    business_profile: BusinessProfileSettings | null
    invoice_settings: InvoiceSettings | null
    gst_settings: GSTSettings | null
    user_settings: UserSettings | null
    inventory_settings: InventorySettings | null
    pricing_settings: PricingSettings | null
    notification_settings: NotificationSettings | null
    karigar_settings: KarigarSettings | null
    customer_settings: CustomerSettings | null
    system_settings: SystemSettings | null
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
            business_profile: null,
            invoice_settings: null,
            gst_settings: null,
            user_settings: null,
            inventory_settings: null,
            pricing_settings: null,
            notification_settings: null,
            karigar_settings: null,
            customer_settings: null,
            system_settings: null
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
        } catch (error) {
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
