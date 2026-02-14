import React, { useEffect, useState, useRef } from 'react';
import { X, Download, Printer, QrCode } from 'lucide-react';
// @ts-ignore
import QRCode from 'qrcode';
import { Product } from '../../types';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { triggerHaptic } from '../../utils/haptics';

interface ProductQrModalProps {
    product: Product;
    silverRate: number;
    onClose: () => void;
}

export function ProductQrModal({ product, silverRate, onClose }: ProductQrModalProps) {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Encode product ID with a prefix for easy identification
        const qrText = `nexora:product:${product.id}`;
        QRCode.toDataURL(qrText, {
            width: 400,
            margin: 2,
            color: {
                dark: '#4f46e5', // Indigo-600
                light: '#ffffff'
            }
        }, (err: any, url: string) => {
            if (err) console.error(err);
            else setQrDataUrl(url);
        });
    }, [product.id]);

    const downloadQR = () => {
        triggerHaptic('light');
        const link = document.createElement('a');
        link.download = `QR_${product.name.replace(/\s+/g, '_')}.png`;
        link.href = qrDataUrl;
        link.click();
    };

    const handlePrint = () => {
        triggerHaptic('medium');
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const estPrice = ((product.default_weight * (1 + (product.wastage_percent / 100)) * silverRate) + product.labour_cost);

        printWindow.document.write(`
      <html>
        <head>
          <title>Product Label - ${product.name}</title>
          <style>
            @page { size: 50mm 30mm; margin: 0; }
            body { 
              width: 50mm; 
              height: 30mm; 
              margin: 0; 
              padding: 2mm; 
              font-family: Arial, sans-serif; 
              box-sizing: border-box;
              display: flex;
              gap: 2mm;
              align-items: center;
            }
            .qr-code { width: 22mm; height: 22mm; }
            .details { 
              flex: 1; 
              display: flex; 
              flex-direction: column; 
              justify-content: center;
              overflow: hidden;
            }
            .name { font-size: 8pt; font-weight: bold; margin-bottom: 1mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .info { font-size: 6pt; color: #666; font-weight: bold; margin-bottom: 0.5mm; }
            .price { font-size: 9pt; font-weight: black; color: #4f46e5; margin-top: 1mm; }
            .brand { font-size: 5pt; color: #999; text-transform: uppercase; letter-spacing: 0.5pt; margin-top: auto; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <img src="${qrDataUrl}" class="qr-code" />
          <div class="details">
            <div class="name">${product.name}</div>
            <div class="info">WT: ${product.default_weight}g | WST: ${product.wastage_percent}%</div>
            <div class="info">LAB: ₹${product.labour_cost}</div>
            <div class="price">₹${Math.round(estPrice)}</div>
            <div class="brand">Nexora Digital</div>
          </div>
        </body>
      </html>
    `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <QrCode size={18} />
                        </div>
                        <h3 className="font-bold text-gray-900">Product QR Tag</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center">
                    {/* Main QR Display */}
                    <div className="relative group">
                        <div className="w-56 h-56 bg-indigo-50/30 rounded-2xl flex items-center justify-center p-4 border border-indigo-100 shadow-inner">
                            {qrDataUrl ? (
                                <img src={qrDataUrl} alt="Product QR" className="w-full h-full object-contain mix-blend-multiply" />
                            ) : (
                                <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg" />
                            )}
                        </div>

                        {/* Download Overlay */}
                        <button
                            onClick={downloadQR}
                            className="absolute -bottom-3 -right-3 bg-white text-indigo-600 p-3 rounded-xl shadow-lg border border-gray-100 hover:scale-110 active:scale-95 transition-all"
                            title="Download QR"
                        >
                            <Download size={20} />
                        </button>
                    </div>

                    <div className="mt-8 text-center space-y-1">
                        <h4 className="font-bold text-lg text-gray-900 leading-tight">{product.name}</h4>
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                            <span>{product.category}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span>{product.default_weight}g</span>
                        </div>
                    </div>

                    {/* Label Preview Card */}
                    <div className="mt-6 w-full p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex gap-3 items-center">
                        <img src={qrDataUrl} alt="" className="w-12 h-12 rounded bg-white p-1" />
                        <div className="flex-1 overflow-hidden">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">Label Preview (50x30mm)</div>
                            <div className="text-xs font-bold text-gray-800 truncate">{product.name}</div>
                            <div className="text-[10px] text-gray-500 font-medium">₹{Math.round((product.default_weight * (1 + (product.wastage_percent / 100)) * silverRate) + product.labour_cost)}</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-bold text-gray-500 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 transition-all"
                    >
                        Close
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                    >
                        <Printer size={16} /> Print Tag
                    </button>
                </div>
            </div>
        </div>
    );
}
