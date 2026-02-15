import React, { useEffect, useState, useRef } from 'react';
import { X, Download, Printer, QrCode, Minus, Plus } from 'lucide-react';
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
    const [copies, setCopies] = useState<number>(1);
    const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');

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

        // Remove any existing print iframe
        const existingFrame = document.getElementById('print-iframe');
        if (existingFrame) existingFrame.remove();

        // Create a new hidden iframe
        const printFrame = document.createElement('iframe');
        printFrame.id = 'print-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);

        const estPrice = ((product.default_weight * (1 + (product.wastage_percent / 100)) * silverRate) + product.labour_cost);

        // Generate label HTML
        const labelHtml = `
      <div class="label-box">
        <img src="${qrDataUrl}" class="qr-code" />
        <div class="details">
          <div class="name">${product.name}</div>
          <div class="info">WT: ${product.default_weight}g | WST: ${product.wastage_percent}%</div>
          <div class="info">LAB: ₹${product.labour_cost}</div>
          <div class="price">₹${Math.round(estPrice)}</div>
          <div class="brand">Nexora Digital</div>
        </div>
      </div>
    `;

        // Repeat for copies
        const allLabels = Array(copies).fill(labelHtml).join('');

        const content = `
      <html>
        <head>
          <title>Label - ${product.name}</title>
          <style>
            @page { 
              size: ${printFormat === 'a4' ? 'A4' : '50mm 25mm'}; 
              margin: 0 !important; 
            }
            * { 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
              box-sizing: border-box;
            }
            html, body { 
              margin: 0 !important; 
              padding: 0 !important; 
              width: ${printFormat === 'a4' ? '100%' : '50mm'};
              background: white;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .sheet {
              display: flex;
              flex-direction: column;
              align-items: ${printFormat === 'a4' ? 'flex-start' : 'center'};
              width: 100%;
              ${printFormat === 'a4' ? 'padding: 5mm; gap: 2mm; flex-wrap: wrap; flex-direction: row;' : 'padding: 0;'}
            }
            .label-box { 
              width: 50mm; 
              height: 25mm; 
              padding: 2mm; 
              display: flex;
              gap: 2mm;
              align-items: center;
              page-break-inside: avoid;
              break-inside: avoid;
              overflow: hidden;
              ${printFormat === 'a4' ? 'border: 0.1mm solid #eee;' : 'border-bottom: 0.1mm dashed #ccc;'}
              background: white;
            }
            .qr-code { 
              width: 18mm; 
              height: 18mm; 
              flex-shrink: 0; 
              ${printFormat === 'thermal' ? 'filter: contrast(150%) brightness(90%);' : ''}
            }
            .details { 
              flex: 1; 
              display: flex; 
              flex-direction: column; 
              justify-content: center;
              overflow: hidden;
            }
            .name { 
              font-size: 8pt; 
              font-weight: 900; 
              margin-bottom: 0.5mm; 
              white-space: nowrap; 
              overflow: hidden; 
              text-overflow: ellipsis; 
              color: #000;
              line-height: 1.1;
            }
            .info { 
              font-size: 6pt; 
              color: #333; 
              font-weight: 700; 
              margin-bottom: 0.2mm; 
              white-space: nowrap;
            }
            .price { 
              font-size: 11pt; 
              font-weight: 950; 
              color: #000 !important; 
              margin-top: 1mm;
              letter-spacing: -0.2pt;
            }
            .brand { 
              font-size: 5pt; 
              color: #666; 
              text-transform: uppercase; 
              letter-spacing: 0.5pt; 
              margin-top: auto; 
              text-align: right;
              font-weight: 700;
            }
            
            @media print {
              body, html { 
                width: ${printFormat === 'a4' ? '210mm' : '50mm'} !important;
                height: auto !important;
              }
              .label-box { 
                page-break-after: always; 
                break-after: always;
              }
              /* Hide browser headers/footers */
              @page { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            ${allLabels}
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.focus();
                window.print();
                setTimeout(() => {
                   // Only remove if not cancelled
                   window.parent.document.getElementById('print-iframe').remove();
                }, 1000);
              }, 1000);
            };
          </script>
        </body>
      </html>
    `;

        const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
        if (frameDoc) {
            // @ts-ignore
            frameDoc.open();
            // @ts-ignore
            frameDoc.write(content);
            // @ts-ignore
            frameDoc.close();
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <QrCode size={18} />
                        </div>
                        <h3 className="font-bold text-gray-900">Print Product Labels</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex flex-col items-center">
                    {/* Main QR Display */}
                    <div className="relative group mb-6">
                        <div className="w-48 h-48 bg-indigo-50/30 rounded-2xl flex items-center justify-center p-4 border border-indigo-100 shadow-inner">
                            {qrDataUrl ? (
                                <img src={qrDataUrl} alt="Product QR" className="w-full h-full object-contain mix-blend-multiply" />
                            ) : (
                                <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg" />
                            )}
                        </div>

                        <button
                            onClick={downloadQR}
                            className="absolute -bottom-3 -right-3 bg-white text-indigo-600 p-2.5 rounded-xl shadow-lg border border-gray-100 hover:scale-110 active:scale-95 transition-all"
                            title="Download Image"
                        >
                            <Download size={18} />
                        </button>
                    </div>

                    {/* Copy Management */}
                    <div className="w-full space-y-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Number of Copies</span>
                                <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                                    <button
                                        onClick={() => setCopies(Math.max(1, copies - 1))}
                                        className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="font-bold text-gray-900 min-w-[20px] text-center">{copies}</span>
                                    <button
                                        onClick={() => setCopies(copies + 1)}
                                        className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setPrintFormat('thermal')}
                                    className={`p-3 rounded-xl border text-center transition-all ${printFormat === 'thermal' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
                                >
                                    <div className="text-[10px] font-black uppercase tracking-widest mb-1">Thermal</div>
                                    <div className="text-xs font-bold leading-none">50x30mm</div>
                                </button>
                                <button
                                    onClick={() => setPrintFormat('a4')}
                                    className={`p-3 rounded-xl border text-center transition-all ${printFormat === 'a4' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
                                >
                                    <div className="text-[10px] font-black uppercase tracking-widest mb-1">A4 Sheet</div>
                                    <div className="text-xs font-bold leading-none">Multiple</div>
                                </button>
                            </div>
                        </div>

                        <div className="text-center">
                            <h4 className="font-bold text-gray-900 leading-tight">{product.name}</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">₹{Math.round((product.default_weight * (1 + (product.wastage_percent / 100)) * silverRate) + product.labour_cost)} • {product.default_weight}g</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-bold text-gray-500 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                    >
                        <Printer size={16} /> Start Printing
                    </button>
                </div>
            </div>
        </div>
    );
}
