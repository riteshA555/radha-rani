import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js'

interface AuthContextType {
    session: Session | null
    user: User | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    signOut: async () => { }
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Optimize: Only fetch session once
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

    const signOut = async () => {
        setLoading(true) // Show loading state immediately
        await supabase.auth.signOut()
        setLoading(false)
    }

    return (
        <AuthContext.Provider value={{ session, user, loading, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
