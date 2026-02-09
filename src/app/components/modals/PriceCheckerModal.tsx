import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calculator, Scan, RefreshCw, ShoppingBag, ArrowRight, ShoppingCart } from 'lucide-react';
import { Product } from '../../../types';
import { getProductByBarcode } from '../../../services/productService';
import { getLatestRates } from '../../../services/rateService';
import { formatIndianRupees } from '../../../shared/utils/formatters';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface PriceCheckerModalProps {
    onClose: () => void;
}

export const PriceCheckerModal = ({ onClose }: PriceCheckerModalProps) => {
    const navigate = useNavigate();
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState<Product | null>(null);
    const [silverRate, setSilverRate] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Fetch live rates on mount
    useEffect(() => {
        const fetchRates = async () => {
            try {
                const rates = await getLatestRates();
                const silver = rates.find(r => r.metal_type === 'SILVER');
                if (silver) setSilverRate(silver.selling_rate);
            } catch (err) {
                console.error("Failed to fetch rates", err);
            }
        };
        fetchRates();
    }, []);

    const handleScan = async (code: string) => {
        setLoading(true);
        setError(null);
        setProduct(null);
        try {
            const foundProduct = await getProductByBarcode(code);
            if (foundProduct) {
                setProduct(foundProduct);
            } else {
                setError(`Product not found for code: ${code}`);
            }
        } catch (err) {
            setError("Error fetching product details");
        } finally {
            setLoading(false);
            setIsScanning(false);
        }
    };

    const calculatePrice = (p: Product) => {
        const metalCost = (p.default_weight * silverRate);
        const making = p.labour_cost;
        const subtotal = metalCost + making;
        const gst = subtotal * ((p.gst_rate || 3) / 100);
        return {
            metalCost,
            making,
            gst,
            total: subtotal + gst
        };
    };

    const handleCreateOrder = (p: Product) => {
        const pricing = calculatePrice(p);
        const item = {
            description: p.name,
            quantity: 1, // Default to 1
            unit: 'Piece',
            rate: Math.round(pricing.total),
            product_id: p.id,
            item_type: 'PRODUCT' as const,
            weight: p.default_weight,
            wastage_percent: p.wastage_percent,
            labour_cost: p.labour_cost,
            base_quantity: 1,
            base_rate: Math.round(pricing.metalCost + pricing.making)
        };

        navigate('/orders/create', {
            state: {
                prefilled: {
                    material_type: 'OWN',
                    gst_enabled: true,
                    items: [item]
                }
            }
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-900/90 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in duration-300 max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                            <Calculator size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Price Checker</h2>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Live Customer View</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-6 flex flex-col items-center">

                    {!product && !loading && !error && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-12">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-100 mb-4 animate-bounce-slow">
                                <Scan size={40} className="text-indigo-600" />
                            </div>
                            <div className="max-w-xs">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to Scan</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    Scan a product QR code to see its live price, weighing details, and specifications.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsScanning(true)}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Scan size={18} /> Start Scanning
                            </button>
                        </div>
                    )}

                    {loading && (
                        <div className="flex-1 flex flex-col items-center justify-center py-12">
                            <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Fetching Details...</p>
                        </div>
                    )}

                    {error && (
                        <div className="w-full bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center">
                            <p className="text-rose-600 font-bold mb-4">{error}</p>
                            <button
                                onClick={() => { setError(null); setIsScanning(true); }}
                                className="px-6 py-2 bg-white border border-rose-200 text-rose-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-50 transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {product && (
                        <div className="w-full space-y-6 animate-in slide-in-from-bottom duration-500">
                            {/* Product Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="aspect-[4/3] bg-gray-100 relative">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <ShoppingBag size={48} />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                        {product.category}
                                    </div>
                                </div>
                                <div className="p-5 text-center">
                                    <h3 className="text-2xl font-black text-gray-900 mb-1">{product.name}</h3>
                                    <p className="text-sm text-gray-500 font-medium">#{product.barcode || 'NO-CODE'}</p>
                                </div>
                            </div>

                            {/* Live Pricing Breakdown */}
                            <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100 border border-indigo-50 p-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                                <div className="flex justify-between items-end mb-6">
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Live Rate (Silver)</p>
                                        <p className="text-lg font-bold text-gray-900">₹{formatIndianRupees(silverRate)}<span className="text-xs text-gray-400 font-normal">/kg</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Net Weight</p>
                                        <p className="text-2xl font-black text-indigo-600">{product.default_weight}g</p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-6 border-t border-dashed border-gray-200">
                                    <div className="flex justify-between items-center text-sm group">
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 font-medium">Metal Value</span>
                                            <span className="text-[10px] text-gray-300">({product.default_weight}g x Rate)</span>
                                        </div>
                                        <span className="font-bold text-gray-900">₹{formatIndianRupees(calculatePrice(product).metalCost)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm group">
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 font-medium">Making Charges</span>
                                            <span className="text-[10px] text-gray-300">(Labour + Wastage)</span>
                                        </div>
                                        <span className="font-bold text-gray-900">₹{formatIndianRupees(calculatePrice(product).making)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm group">
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 font-medium">GST</span>
                                            <span className="text-[10px] text-gray-300">({product.gst_rate || 3}%)</span>
                                        </div>
                                        <span className="font-bold text-gray-900">₹{formatIndianRupees(calculatePrice(product).gst)}</span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 -mx-6 -mb-6 px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Final Customer Price</span>
                                        <span className="text-xs text-gray-400 font-medium">Inclusive of all taxes</span>
                                    </div>
                                    <span className="text-3xl font-black text-gray-900 tracking-tight">₹{formatIndianRupees(calculatePrice(product).total)}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setProduct(null); setIsScanning(true); }}
                                    className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Scan size={16} /> Scan Next
                                </button>
                                <button
                                    onClick={() => handleCreateOrder(product)}
                                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <ShoppingCart size={16} /> Finalize & Create Order <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isScanning && (
                <BarcodeScannerModal
                    onScan={handleScan}
                    onClose={() => setIsScanning(false)}
                />
            )}
        </div>
    );
};
