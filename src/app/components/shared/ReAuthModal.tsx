import { useState } from 'react';
import { Shield, Loader2, X, Lock } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

interface ReAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title?: string;
    description?: string;
}

export function ReAuthModal({ isOpen, onClose, onSuccess, title, description }: ReAuthModalProps) {
    const [password, setPassword] = useState('');
    const [validating, setValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidating(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) throw new Error('Session expired');

            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: password,
            });

            if (authError) throw authError;

            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        } finally {
            setValidating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border border-gray-100">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-600" />
                        Security Gate
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>

                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-inner">
                            <Lock size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{title || 'Confirm Identity'}</h3>
                        <p className="text-sm text-gray-500 font-medium">{description || 'Please enter your password to authorize this critical action.'}</p>
                    </div>

                    {error && (
                        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-xs font-bold mb-6 border border-rose-100 flex items-center gap-2 animate-wiggle">
                            <div className="w-1 h-1 rounded-full bg-rose-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Password</label>
                            <input
                                autoFocus
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-base font-bold outline-none ring-2 ring-gray-100 focus:ring-indigo-500 transition-all placeholder:text-gray-300"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={validating}
                            className="w-full py-4 bg-gray-900 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-gray-200 flex justify-center items-center gap-3 transition-all hover:bg-black active:scale-95 disabled:opacity-50"
                        >
                            {validating ? <Loader2 size={16} className="animate-spin" /> : 'Authorize Action'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
