import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js'

interface AuthContextType {
    session: Session | null
    user: User | null
    loading: boolean
    signOut: () => Promise<void>
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
    signIn: (email: string, password: string) => Promise<{ error: any }>
    resetPassword: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    signOut: async () => { },
    signUp: async () => ({ error: 'Auth not initialized' }),
    signIn: async () => ({ error: 'Auth not initialized' }),
    resetPassword: async () => ({ error: 'Auth not initialized' })
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const signUp = async (email: string, password: string, fullName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        })
        return { error }
    }

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error }
    }

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login?type=recovery`,
        })
        return { error }
    }

    const signOut = async () => {
        setLoading(true)
        await supabase.auth.signOut()
        setLoading(false)
    }

    return (
        <AuthContext.Provider value={{ session, user, loading, signOut, signUp, signIn, resetPassword }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
