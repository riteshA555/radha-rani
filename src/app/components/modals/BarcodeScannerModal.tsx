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
    const [manualEntry, setManualEntry] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const startScanner = async () => {
        if (!scannerRef.current) return;
        setError(null);

        const config = {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                const minSide = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minSide * 0.75);
                return { width: qrboxSize, height: qrboxSize };
            },
            aspectRatio: 1.0,
            formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_13
            ]
        };

        try {
            // FORCE BROWSER PROMPT: Try to get user media directly first
            await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });

            await scannerRef.current.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    scannerRef.current?.stop().then(() => {
                        onScan(decodedText);
                        onClose();
                    }).catch(err => console.error("Stop failed", err));
                },
                () => { }
            );
            setIsScanning(true);
        } catch (err: any) {
            console.error("Scanner Error:", err);
            if (err.toString().includes("Permission denied") || err.name === "NotAllowedError") {
                setError("PERMISSION_DENIED");
            } else if (err.toString().includes("NotFoundException") || err.name === "NotFoundError") {
                setError("No camera found on this device.");
            } else {
                setError(`Scanner Error: ${err.message || "Failed to access camera"}`);
            }
        }
    };

    useEffect(() => {
        // Detect Insecure Context (HTTP instead of HTTPS)
        if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            setError("INSECURE_CONTEXT");
            return;
        }

        const html5QrCode = new Html5Qrcode('reader');
        scannerRef.current = html5QrCode;

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error("Cleanup stop failed", err));
            }
        };
    }, []);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualEntry.trim()) {
            onScan(manualEntry.trim());
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/90 z-[100] flex items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
            <div className="bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 duration-300">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Scan size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Scan Product</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-1">Barcode or QR Code</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col items-center p-6 space-y-8">
                    <div className="w-full max-w-[280px] aspect-square border-4 border-white rounded-3xl shadow-2xl overflow-hidden bg-black relative">
                        <div id="reader" className="w-full h-full"></div>

                        {/* HUD (Always on top during scan) */}
                        {isScanning && (
                            <div className="absolute inset-0 z-20 pointer-events-none">
                                <div className="absolute inset-0 border-[30px] border-black/30"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160px] h-[160px] border-2 border-indigo-500/50 rounded-2xl">
                                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-sm"></div>
                                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-sm"></div>
                                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-sm"></div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-sm"></div>
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,1)] animate-scan-line"></div>
                                </div>
                            </div>
                        )}

                        {/* ERROR OVERLAY */}
                        {error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center bg-gray-950 z-30">
                                <Camera size={32} className="mb-4 text-rose-500 opacity-80" />
                                {error === "PERMISSION_DENIED" ? (
                                    <div className="space-y-4">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-rose-400">Permission Denied</p>
                                        <p className="text-[10px] leading-relaxed opacity-70">
                                            Browser settings mein <b>Lock (🔒)</b> icon par click karke camera <b>Allow</b> karein.
                                        </p>
                                        <button onClick={startScanner} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                                            Request Permission Again
                                        </button>
                                    </div>
                                ) : error === "INSECURE_CONTEXT" ? (
                                    <div className="space-y-4">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-amber-500">HTTPS Required</p>
                                        <p className="text-[10px] leading-relaxed opacity-70">
                                            Security ki wajah se camera sirf <b>HTTPS</b> par chalta hai.
                                        </p>
                                        <button onClick={() => window.location.href = window.location.href.replace('http:', 'https:')} className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-amber-600/20 active:scale-95 transition-all">
                                            Switch to HTTPS
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Camera Error</p>
                                        <p className="text-[10px] leading-relaxed opacity-70">{error}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {!isScanning && !error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-black/50 z-10">
                                <Loader2 className="w-8 h-8 animate-spin opacity-30" />
                            </div>
                        )}
                    </div>

                    {/* MANUAL FALLBACK */}
                    <div className="w-full space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-[1px] flex-1 bg-gray-200"></div>
                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">OR ENTER MANUALLY</span>
                            <div className="h-[1px] flex-1 bg-gray-200"></div>
                        </div>

                        <form onSubmit={handleManualSubmit} className="flex gap-2">
                            <input
                                autoFocus
                                type="text"
                                value={manualEntry}
                                onChange={e => setManualEntry(e.target.value)}
                                placeholder="Enter Product Code..."
                                className="flex-1 p-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                            <button
                                type="submit"
                                className="px-6 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95"
                            >
                                <Loader2 className="animate-spin" size={20} />
                            </button>
                        </form>
                    </div>

                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Zap size={14} className="text-amber-400" />
                        Align code in the square frame
                    </p>
                </div>

                <div className="p-6 bg-white border-t border-gray-100 grid grid-cols-2 gap-4 sticky bottom-0 z-50">
                    <button onClick={onClose} className="py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Close</button>
                    <button onClick={() => window.location.reload()} className="py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Reload App</button>
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
