import { createContext, useContext, useState, useEffect } from 'react'
import { getSettings, updateSettings } from '../services/settingsService'

interface SettingsContextType {
    settings: any // Replace with proper type later
    updateSetting: (key: string, value: any) => Promise<void>
    refreshSettings: () => Promise<void>
    loading: boolean
}

const SettingsContext = createContext<SettingsContextType>({
    settings: {}, // mocked initial state
    updateSetting: async () => { },
    refreshSettings: async () => { },
    loading: true
})

export const useSettings = () => useContext(SettingsContext)

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<any>({
        language: 'en',
        currency: 'INR',
        theme: 'light'
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadSettings()
    }, [])

    // Apply Theme Side-Effect
    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(settings.theme)
        root.style.colorScheme = settings.theme
    }, [settings.theme])

    const loadSettings = async () => {
        try {
            // Load User Settings for Theme/Language
            const userSettings = await getSettings<any>('user_settings')
            if (userSettings) {
                setSettings((prev: any) => ({
                    ...prev,
                    theme: userSettings.theme || 'light',
                    language: userSettings.language || 'en'
                }))
            }
        } catch (error) {
            console.error('Failed to load settings', error)
        } finally {
            setLoading(false)
        }
    }

    const updateSetting = async (key: string, value: any) => {
        setSettings((prev: any) => ({ ...prev, [key]: value }))

        // Persist specifics to DB
        if (key === 'theme' || key === 'language') {
            await updateSettings('user_settings', { [key]: value })
        }
    }

    return (
        <SettingsContext.Provider value={{ settings, updateSetting, refreshSettings: loadSettings, loading }}>
            {children}
        </SettingsContext.Provider>
    )
}
