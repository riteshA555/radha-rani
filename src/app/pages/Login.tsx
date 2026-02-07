import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Mail, Loader2, ArrowRight, User as UserIcon, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { validateEmail } from '../../shared/utils/validation'
import { supabase } from '../../supabaseClient'

type ViewMode = 'login' | 'signup' | 'forgot-password' | 'recovery'

export default function Login() {
    const [view, setView] = useState<ViewMode>('login')
    const [searchParams] = useSearchParams()
    // ... items omitted ...

    useEffect(() => {
        const type = searchParams.get('type')
        if (type === 'recovery') {
            setView('recovery')
            setSuccessMessage('Recovery session active. Please enter your new password.')
        }
    }, [searchParams])
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const navigate = useNavigate()
    const { signIn, signUp, resetPassword } = useAuth()

    const validateInputs = () => {
        if (!validateEmail(email)) {
            setError('Please enter a valid email address')
            return false
        }
        if (view === 'signup') {
            if (fullName.trim().length < 3) {
                setError('Please enter your full name')
                return false
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters')
                return false
            }
            if (password !== confirmPassword) {
                setError('Passwords do not match')
                return false
            }
        }
        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccessMessage(null)

        if (view !== 'recovery' && !validateInputs()) return

        setLoading(true)
        try {
            if (view === 'login') {
                const { error } = await signIn(email, password)
                if (error) throw error
                navigate('/', { replace: true })
            } else if (view === 'signup') {
                const { error } = await signUp(email, password, fullName)
                if (error) throw error
                setSuccessMessage('Account created! Please check your email for confirmation.')
                setView('login')
            } else if (view === 'forgot-password') {
                const { error } = await resetPassword(email)
                if (error) throw error
                setSuccessMessage('Password reset link sent! Please check your email.')
                setView('login')
            } else if (view === 'recovery') {
                if (password.length < 6) {
                    setError('Password must be at least 6 characters')
                    setLoading(false)
                    return
                }
                const { error } = await supabase.auth.updateUser({ password })
                if (error) throw error
                setSuccessMessage('Password updated successfully! Redirecting...')
                setTimeout(() => navigate('/', { replace: true }), 2000)
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    const toggleView = (newView: ViewMode) => {
        setView(newView)
        setError(null)
        setSuccessMessage(null)
        setPassword('')
        setConfirmPassword('')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 relative overflow-hidden font-inter">
            {/* Background decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] opacity-60"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-50 rounded-full blur-[120px] opacity-60"></div>

            <div className="bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-md border border-white relative z-10">
                <div className="flex flex-col gap-6">
                    <div className="text-center">
                        <div className="flex justify-center mb-2 group cursor-pointer">
                            <div className="h-24 w-60 overflow-hidden relative flex items-center justify-center transition-all duration-500 group-hover:scale-105 group-hover:drop-shadow-2xl">
                                <img
                                    src="/logo.png"
                                    alt="NEXORA DIGITAL"
                                    className="h-full w-full object-cover object-center scale-125 transition-transform duration-700 group-hover:scale-135"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.innerText = 'NEXORA DIGITAL';
                                        e.currentTarget.parentElement!.className = 'text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-emerald-600 tracking-tighter text-center';
                                    }}
                                />
                            </div>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
                            {view === 'login' ? 'Welcome back' : view === 'signup' ? 'Create account' : view === 'forgot-password' ? 'Reset password' : 'New password'}
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">
                            {view === 'login' ? 'Sign in to access your dashboard' :
                                view === 'signup' ? 'Start managing your business' :
                                    view === 'forgot-password' ? 'We will send a reset link to your email' :
                                        'Enter a strong new password to regain access'}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-rose-50/80 backdrop-blur-sm text-rose-700 p-4 rounded-2xl text-xs font-semibold border border-rose-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="bg-emerald-50/80 backdrop-blur-sm text-emerald-700 p-4 rounded-2xl text-xs font-semibold border border-emerald-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            {successMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {view === 'signup' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                <div className="relative group">
                                    <UserIcon size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-100/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 ring-1 ring-gray-100 transition-all font-medium text-gray-900"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {view !== 'recovery' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-100/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 ring-1 ring-gray-100 transition-all font-medium text-gray-900"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {(view === 'login' || view === 'signup' || view === 'recovery') && (
                            <>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Password</label>
                                        {view === 'login' && (
                                            <button
                                                type="button"
                                                onClick={() => toggleView('forgot-password')}
                                                className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                                            >
                                                Forgot?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <Lock size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-gray-100/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 ring-1 ring-gray-100 transition-all font-medium text-gray-900"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-4 text-gray-400 hover:text-indigo-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {view === 'signup' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
                                        <div className="relative group">
                                            <Lock size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-100/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 ring-1 ring-gray-100 transition-all font-medium text-gray-900"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative group overflow-hidden bg-gray-900 text-white p-4 rounded-2xl text-sm font-bold transition-all hover:bg-black hover:shadow-xl active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 mt-4"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative flex items-center justify-center gap-2">
                                {loading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <>
                                        {view === 'login' ? 'Sign In' : view === 'signup' ? 'Create Account' : view === 'forgot-password' ? 'Send Reset Link' : 'Update Password'}
                                        {view !== 'forgot-password' && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                                    </>
                                )}
                            </div>
                        </button>
                    </form>

                    {view !== 'recovery' && (
                        <div className="text-center pt-4 border-t border-gray-50">
                            <p className="text-sm text-gray-500 font-medium">
                                {view === 'login' ? (
                                    <>New here? <button onClick={() => toggleView('signup')} className="text-indigo-600 font-bold hover:underline ml-1">Create account</button></>
                                ) : (
                                    <>Already have an account? <button onClick={() => toggleView('login')} className="text-indigo-600 font-bold hover:underline ml-1">Sign in</button></>
                                )}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-8 left-0 right-0 text-center">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] opacity-60">
                    &copy; 2026 NEXORA DIGITAL ERP &bull; Premium Jewel Management
                </p>
            </div>
        </div>
    )
}
