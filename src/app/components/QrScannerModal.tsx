import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Zap, AlertCircle } from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { triggerHaptic } from '../../utils/haptics';

interface QrScannerModalProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

export function QrScannerModal({ onScan, onClose }: QrScannerModalProps) {
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            try {
                const scanner = new Html5QrcodeScanner(
                    "reader",
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
                    },
          /* verbose= */ false
                );

                scanner.render(
                    (decodedText) => {
                        triggerHaptic('success');
                        onScan(decodedText);
                        scanner.clear();
                    },
                    (errorMessage) => {
                        // Silently ignore frame errors
                    }
                );

                scannerRef.current = scanner;
            } catch (err) {
                console.error("Scanner init error:", err);
                setError("Could not access camera. Please check permissions.");
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current) {
                scannerRef.current.clear().catch(e => console.warn("Scanner clear error:", e));
            }
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 bg-gray-900/90 z-[110] flex flex-col backdrop-blur-md animate-in fade-in duration-300">
            {/* Header */}
            <div className="p-6 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
                        <Camera size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Scan Product QR</h2>
                        <p className="text-xs text-gray-400 font-medium tracking-wide flex items-center gap-1">
                            <Zap size={10} className="text-amber-400 fill-amber-400" />
                            POSITION QR WITHIN SQUARE
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
                <div className="relative w-full max-w-[320px] aspect-square bg-gray-800 rounded-3xl overflow-hidden border-2 border-indigo-500/30 shadow-[0_0_50px_rgba(79,70,229,0.3)]">
                    <div id="reader" className="w-full h-full"></div>

                    {/* Overlay Corner Accents */}
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-indigo-400 rounded-tl-2xl pointer-events-none" />
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-indigo-400 rounded-tr-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-indigo-400 rounded-bl-2xl pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-indigo-400 rounded-br-2xl pointer-events-none" />

                    {/* Scan Line Animation */}
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_rgba(79,70,229,0.8)] animate-scan-y opacity-50" />
                </div>

                {error && (
                    <div className="mt-8 p-4 bg-rose-500/20 border border-rose-500/50 rounded-2xl flex items-center gap-3 text-rose-200 text-sm max-w-sm">
                        <AlertCircle size={20} />
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                <div className="mt-12 text-center text-gray-400 max-w-xs space-y-4">
                    <p className="text-sm leading-relaxed">Place the product tag's QR code in the frame to instantly view details and add to order.</p>
                    <div className="pt-4 flex justify-center gap-4">
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Live Focus</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        #reader { border: none !important; }
        #reader video { 
          width: 100% !important; 
          height: 100% !important; 
          object-fit: cover !important;
          border-radius: 24px;
        }
        #reader__dashboard_section_csr button {
          display: none !important;
        }
        #reader__status_span { display: none !important; }
        
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
