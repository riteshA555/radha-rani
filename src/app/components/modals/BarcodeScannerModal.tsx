import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Scan, Zap, Loader2, Camera } from 'lucide-react';

interface BarcodeScannerModalProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

export const BarcodeScannerModal = ({ onScan, onClose }: BarcodeScannerModalProps) => {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        // Detect Insecure Context (HTTP instead of HTTPS)
        if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            setError("Camera usage requires a secure connection (HTTPS). Mobile browsers block camera on plain HTTP for security.");
            return;
        }

        const html5QrCode = new Html5Qrcode('reader');
        scannerRef.current = html5QrCode;

        const config = {
            fps: 15, // Slightly higher for smoother mobile experience
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                const minSide = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minSide * 0.7);
                return { width: qrboxSize, height: qrboxSize };
            },
            aspectRatio: 1.0,
            formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_13
            ]
        };

        const startScanner = async () => {
            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        html5QrCode.stop().then(() => {
                            onScan(decodedText);
                            onClose();
                        }).catch(err => console.error("Stop failed", err));
                    },
                    () => { }
                );
                setIsScanning(true);
            } catch (err: any) {
                console.error("Scanner Error:", err);
                if (err.toString().includes("Permission denied")) {
                    setError("PERMISSION_DENIED");
                } else if (err.toString().includes("NotFoundException")) {
                    setError("No camera found on this device.");
                } else {
                    setError("Could not access camera. Please check if another app is using it.");
                }
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error("Cleanup stop failed", err));
            }
        };
    }, [onScan, onClose]);

    return (
        <div className="fixed inset-0 bg-gray-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in duration-300">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Scan size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Scan Product</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">REAL-TIME CAMERA SCAN</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 bg-gray-50 flex-1 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-full max-w-[300px] aspect-square border-4 border-white rounded-2xl shadow-xl overflow-hidden bg-black relative">
                        {/* THE SCANNER TARGET (Keep empty) */}
                        <div id="reader" className="w-full h-full"></div>

                        {/* ERROR STATE */}
                        {error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-6 text-center bg-gray-900/95 backdrop-blur-md z-30 transition-all duration-500 overflow-y-auto pt-10 pb-10">
                                <Camera size={40} className="mb-4 text-rose-400 animate-pulse" />

                                {error === "PERMISSION_DENIED" ? (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-rose-400">Permission Required</h3>
                                        <p className="text-[11px] leading-relaxed opacity-80">You need to allow camera access in your browser settings to scan codes.</p>

                                        <div className="bg-white/5 rounded-2xl p-4 text-left border border-white/10">
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-3">How to enable:</p>
                                            <ul className="space-y-3 text-[10px] opacity-90">
                                                <li className="flex gap-2">
                                                    <span className="bg-indigo-500 text-white w-4 h-4 rounded-full flex items-center justify-center shrink-0">1</span>
                                                    <span>Click the <b>Lock (🔒)</b> or <b>Settings</b> icon next to the website URL.</span>
                                                </li>
                                                <li className="flex gap-2">
                                                    <span className="bg-indigo-500 text-white w-4 h-4 rounded-full flex items-center justify-center shrink-0">2</span>
                                                    <span>Find <b>Camera</b> and switch it to <b>Allow</b>.</span>
                                                </li>
                                                <li className="flex gap-2">
                                                    <span className="bg-indigo-500 text-white w-4 h-4 rounded-full flex items-center justify-center shrink-0">3</span>
                                                    <span>Refresh the page and try again.</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in duration-500">
                                        <p className="text-xs font-bold uppercase tracking-wider mb-2 text-rose-400">Camera Error</p>
                                        <p className="text-[11px] leading-relaxed opacity-90 mx-4">{error}</p>

                                        {error.includes("HTTPS") && (
                                            <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                                                <p className="text-[9px] text-amber-200 uppercase font-black mb-1">Security Warning</p>
                                                <p className="text-[10px] text-amber-100/80 leading-tight">Browsers block camera on insecure IP addresses. Please use <b>localhost</b> or deploy with <b>SSL/HTTPS</b>.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* LOADING STATE */}
                        {!isScanning && !error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-black/50 z-10 pointer-events-none">
                                <Loader2 className="w-8 h-8 animate-spin opacity-50" />
                                <span className="text-xs font-bold uppercase tracking-widest opacity-50">Opening Camera...</span>
                            </div>
                        )}

                        {/* CUSTOM HUD (Always on top) */}
                        <div className="absolute inset-0 z-20 pointer-events-none">
                            <div className="absolute inset-0 border-[40px] border-black/20"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] border-2 border-indigo-500 rounded-lg shadow-[0_0_20px_rgba(79,70,229,0.5)]">
                                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-sm"></div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-sm"></div>
                                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-sm"></div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-sm"></div>
                                {/* Scanning Line Animation */}
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500/80 shadow-[0_0_10px_#4f46e5] animate-scan-line"></div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center space-y-4 max-w-xs">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2">
                            <Zap size={14} className="text-amber-400" />
                            Align code in the square
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-gray-100 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                    >
                        Back
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all"
                    >
                        Retry Camera
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes scan-line {
                    0% { top: 0; }
                    100% { top: 100%; }
                }
                .animate-scan-line {
                    position: absolute;
                    animation: scan-line 2s linear infinite;
                }
                #reader video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 12px;
                }
            `}</style>
        </div>
    );
};
