import { useState } from 'react';
import { RotateCcw, AlertTriangle, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { factoryReset } from '../../services/systemService';
import { useNavigate } from 'react-router-dom';

export function FactoryReset() {
    const [step, setStep] = useState(1);
    const [confirmText, setConfirmText] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleReset = async () => {
        if (confirmText !== 'RESET') return;

        try {
            setError(null);
            setIsResetting(true);
            await factoryReset();
            setStep(3); // Success step
        } catch (err: any) {
            setError(err.message || 'Failed to perform reset');
            setIsResetting(false);
        }
    };

    return (
        <div className="p-4 min-h-[80vh] flex items-center justify-center">
            <div className="max-w-md w-full">
                {step === 1 && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                            <RotateCcw className="w-10 h-10 text-rose-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900">Factory Reset</h2>
                            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                                This will permanently delete all your data including orders, inventory, customers, and settings.
                                <span className="block font-bold mt-1 text-rose-600 uppercase tracking-widest text-[10px]">This action cannot be undone.</span>
                            </p>
                        </div>
                        <button
                            onClick={() => setStep(2)}
                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                        >
                            Understand & Proceed
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="bg-white rounded-3xl border-2 border-rose-100 shadow-2xl p-8 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <ShieldAlert size={120} />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-rose-600">
                                <AlertTriangle size={24} />
                                <h3 className="text-lg font-black uppercase tracking-tight">Final Confirmation</h3>
                            </div>
                            <p className="text-sm text-gray-600 font-medium">To prevent accidental deletion, please type <span className="font-black text-gray-900">RESET</span> in the box below to start the process.</p>

                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Type RESET here..."
                                disabled={isResetting}
                                className="w-full p-4 bg-rose-50/30 border-2 border-rose-100 rounded-2xl focus:ring-4 focus:ring-rose-100 outline-none font-black text-center text-rose-600 placeholder:text-rose-200 transition-all uppercase tracking-[0.2em]"
                            />

                            {error && (
                                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 flex items-center gap-2">
                                    <AlertTriangle size={14} />
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleReset}
                                disabled={confirmText !== 'RESET' || isResetting}
                                className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm shadow-lg ${confirmText === 'RESET' && !isResetting ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200' : 'bg-gray-100 text-gray-400 grayscale'}`}
                            >
                                {isResetting ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        Wiping Database...
                                    </>
                                ) : (
                                    'Erase Everything'
                                )}
                            </button>
                            <button
                                onClick={() => setStep(1)}
                                disabled={isResetting}
                                className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 text-sm uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="bg-white rounded-3xl border border-emerald-100 shadow-2xl p-10 text-center space-y-6">
                        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-emerald-900">Successfully Reset</h2>
                            <p className="text-gray-500 text-sm font-medium">Your application data has been completely wiped.</p>
                        </div>
                        <button
                            onClick={() => {
                                window.location.reload();
                            }}
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all uppercase tracking-widest text-sm shadow-lg shadow-emerald-100"
                        >
                            Restart Application
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
