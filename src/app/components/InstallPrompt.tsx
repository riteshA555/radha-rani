import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { canInstallPWA, installPWA, isInstalled } from '@/shared/utils/pwaInstall';

export function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (isInstalled()) {
            return;
        }

        // Check for install prompt after a delay
        const timer = setTimeout(() => {
            if (canInstallPWA()) {
                setShowPrompt(true);
            }
        }, 3000); // Show after 3 seconds

        return () => clearTimeout(timer);
    }, []);

    const handleInstall = async () => {
        setIsLoading(true);
        const success = await installPWA();
        setIsLoading(false);

        if (success) {
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Remember dismissal
        localStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    // Don't show if dismissed before
    if (localStorage.getItem('pwa-prompt-dismissed') === 'true') {
        return null;
    }

    if (!showPrompt) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5">
            <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-4 text-white">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                        <Download className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">Install App</h3>
                        <p className="text-sm text-white/90 leading-relaxed">
                            Install Radha Rani ERP on your home screen for quick access and offline support!
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleInstall}
                    disabled={isLoading}
                    className="w-full bg-white text-emerald-600 font-semibold py-2.5 px-4 rounded-xl hover:bg-white/95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                    {isLoading ? 'Installing...' : 'Install Now'}
                </button>

                <p className="text-xs text-white/70 text-center mt-2">
                    No download required • Works offline
                </p>
            </div>
        </div>
    );
}
