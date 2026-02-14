import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Zap, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { triggerHaptic } from '../../utils/haptics';

interface QrScannerModalProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

export function QrScannerModal({ onScan, onClose }: QrScannerModalProps) {
    const [error, setError] = useState<string | null>(null);
    const qrRef = useRef<Html5Qrcode | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        const html5QrCode = new Html5Qrcode("reader");
        qrRef.current = html5QrCode;

        const startScanner = async () => {
            try {
                setIsInitializing(true);
                // Request camera permissions and start scanning
                await html5QrCode.start(
                    { facingMode: "environment" }, // Prioritize back camera
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        triggerHaptic('success');
                        onScan(decodedText);
                    },
                    (errorMessage) => {
                        // Silently ignore frame-by-frame errors
                    }
                );
                setIsInitializing(false);
            } catch (err: any) {
                console.error("Scanner start error:", err);
                setIsInitializing(false);
                setError(err.message || "Could not access camera. Please check permissions.");
            }
        };

        // Small delay to ensure the "reader" element is rendered
        const timer = setTimeout(startScanner, 500);

        return () => {
            clearTimeout(timer);
            if (qrRef.current && qrRef.current.isScanning) {
                qrRef.current.stop().then(() => {
                    qrRef.current?.clear();
                }).catch(err => console.error("Scanner stop error:", err));
            }
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 bg-gray-900/95 z-[110] flex flex-col backdrop-blur-md animate-in fade-in duration-300">
            {/* Header */}
            <div className="p-6 flex justify-between items-center text-white safe-pt">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
                        <Camera size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">QR Scanner</h2>
                        <p className="text-[10px] text-gray-400 font-bold tracking-widest flex items-center gap-1 uppercase">
                            <Zap size={10} className="text-amber-400 fill-amber-400" />
                            Align in square
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { triggerHaptic('light'); onClose(); }}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Main Scanner Body */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 -mt-10">
                <div className="relative w-full max-w-[320px] aspect-square bg-black rounded-3xl overflow-hidden border-2 border-indigo-500/30 shadow-[0_0_60px_rgba(79,70,229,0.4)]">
                    {/* Transparent region for camera feed */}
                    <div id="reader" className="w-full h-full bg-black"></div>

                    {/* Loading State */}
                    {isInitializing && !error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Waking Camera...</p>
                        </div>
                    )}

                    {/* Overlay Corner Accents */}
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-indigo-400 rounded-tl-3xl pointer-events-none z-20" />
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-indigo-400 rounded-tr-3xl pointer-events-none z-20" />
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-indigo-400 rounded-bl-3xl pointer-events-none z-20" />
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-indigo-400 rounded-br-3xl pointer-events-none z-20" />

                    {/* Scan Line Animation */}
                    {!isInitializing && (
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_rgba(79,70,229,1)] animate-scan-y opacity-70 z-20" />
                    )}
                </div>

                {error && (
                    <div className="mt-8 p-5 bg-rose-500/20 border border-rose-500/50 rounded-2xl flex items-center gap-4 text-rose-200 text-sm max-w-sm backdrop-blur-md">
                        <div className="p-2 bg-rose-500 rounded-lg">
                            <AlertCircle size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold uppercase tracking-tight text-[10px] text-rose-400 mb-0.5">Camera Error</p>
                            <p className="font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {!error && (
                    <div className="mt-12 text-center text-gray-400 max-w-xs space-y-4">
                        <p className="text-sm font-medium leading-relaxed">Position the product's QR code within the central square to instantly see price details.</p>
                        <div className="pt-2 flex justify-center items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Scanner active</span>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        #reader { 
          border: none !important; 
          border-radius: 24px !important;
          overflow: hidden !important;
        }
        #reader video { 
          width: 100% !important; 
          height: 100% !important; 
          object-fit: cover !important;
          border-radius: 24px !important;
        }
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(320px); }
        }
        .animate-scan-y {
          animation: scan 2s linear infinite;
        }
      `}</style>
        </div>
    );
}
