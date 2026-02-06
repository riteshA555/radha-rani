import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSignup, setIsSignup] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (!email || !email.includes('@')) {
            setError('Invalid email format')
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            navigate('/', { replace: true })
        }
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            navigate('/', { replace: true })
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 relative overflow-hidden font-inter">
            {/* Background decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] opacity-60"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-50 rounded-full blur-[120px] opacity-60"></div>

            <div className="bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-md border border-white relative z-10 transition-all duration-500">
                <div className="flex flex-col gap-8">
                    <div className="text-center">
                        <div className="flex justify-center">
                            <div className="h-32 w-full flex items-center justify-center group transition-all duration-500">
                                <img
                                    src="/logo.png"
                                    alt="SterlingFlow ERP"
                                    className="h-full w-auto object-contain transition-transform duration-700 group-hover:scale-105"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const p = e.currentTarget.parentElement!;
                                        p.innerHTML = '<span class="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-emerald-600 tracking-tighter">SterlingFlow</span>';
                                    }}
                                />
                            </div>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                            {isSignup ? 'Create account' : 'Welcome back'}
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">
                            {isSignup ? 'Start managing your jewelry business' : 'Sign in to access your business dashboard'}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-rose-50/80 backdrop-blur-sm text-rose-700 p-4 rounded-2xl text-sm font-semibold border border-rose-100 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">
                                Email Address
                            </label>
                            <div className="relative group">
                                <Mail size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-gray-100/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 ring-1 ring-gray-100 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">
                                    Password
                                </label>
                                {!isSignup && (
                                    <button type="button" className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-[0.15em] transition-colors">
                                        Forgot?
                                    </button>
                                )}
                            </div>
                            <div className="relative group">
                                <Lock size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-gray-100/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 ring-1 ring-gray-100 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative group overflow-hidden bg-gray-900 text-white p-4.5 rounded-2xl text-base font-bold transition-all hover:bg-black hover:shadow-2xl hover:shadow-indigo-200 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 shadow-xl shadow-gray-200 mt-6"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative flex items-center justify-center gap-2 py-0.5">
                                {loading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        {isSignup ? 'Creating...' : 'Signing in...'}
                                    </>
                                ) : (
                                    <>
                                        {isSignup ? 'Create Account' : 'Sign In Now'} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>

                    <div className="text-center pt-4 border-t border-gray-50">
                        <p className="text-sm text-gray-500 font-medium">
                            {isSignup ? 'Already use SterlingFlow?' : "New to SterlingFlow ERP?"}{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignup(!isSignup)
                                    setError('')
                                }}
                                className="text-indigo-600 font-bold hover:text-indigo-700 transition-all ml-1"
                            >
                                {isSignup ? 'Sign in' : 'Create an account'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-8 left-0 right-0 text-center z-10">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] opacity-60">
                    &copy; 2026 SterlingFlow ERP &bull; Jewel Management System
                </p>
            </div>
        </div>
    )
}
