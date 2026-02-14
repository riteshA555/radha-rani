import React, { useEffect, useState } from 'react';
import { X, ShoppingCart, Gem, ArrowRight, Sparkles, Scale, IndianRupee, Info, Plus, ChevronRight } from 'lucide-react';
import { Product } from '../../types';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { useNavigate } from 'react-router-dom';

interface ProductQuickViewProps {
    product: Product;
    silverRate: number;
    onClose: () => void;
}

export function ProductQuickView({ product, silverRate, onClose }: ProductQuickViewProps) {
    const navigate = useNavigate();

    // Calculate price factors
    const weight = product.default_weight || 0;
    const wastagePercent = product.wastage_percent || 0;
    const wastageWeight = weight * (wastagePercent / 100);
    const totalEffectiveWeight = weight + wastageWeight;
    const ratePerGm = silverRate / 1000;
    const metalValue = totalEffectiveWeight * ratePerGm;
    const laborCost = product.labour_cost || 0;
    const subtotal = metalValue + laborCost;
    const gstRate = product.gst_rate || 3;
    const gstAmount = subtotal * (gstRate / 100);
    const finalPrice = subtotal + gstAmount;

    const handleAddToOrder = () => {
        triggerHaptic('success');
        navigate('/orders/create', {
            state: {
                autoAddProduct: product,
                referringPage: 'quick-view'
            }
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-end sm:items-center justify-center backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-slate-50 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">

                {/* Visual Header */}
                <div className="relative h-56 sm:h-64 bg-white">
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-6" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                            <Gem size={80} className="text-indigo-200" />
                        </div>
                    )}

                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                        <div className="flex flex-col gap-1.5">
                            <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                PRICING BREAKDOWN
                            </span>
                            <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1.5">
                                <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                LIVE RATE
                            </span>
                        </div>
                        <button onClick={onClose} className="p-2 bg-white/90 backdrop-blur-sm shadow-xl rounded-full text-gray-500 hover:text-gray-800 transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Product Identity */}
                <div className="px-8 pt-6 pb-2">
                    <h2 className="text-2xl font-black text-gray-900 leading-tight mb-1">{product.name}</h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{product.category}</p>
                </div>

                {/* Line-by-Line Breakdown Area */}
                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-3">

                    {/* Step 1: Base Metal */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Scale size={16} />
                                </div>
                                <span className="text-xs font-black text-gray-900 uppercase tracking-tighter">1. Metal Calculation</span>
                            </div>
                            <span className="text-sm font-black text-indigo-600">₹{formatIndianRupees(metalValue)}</span>
                        </div>

                        <div className="space-y-2 pl-8 border-l-2 border-indigo-50">
                            <div className="flex justify-between text-xs font-bold text-gray-500">
                                <span>Weight :</span>
                                <span className="text-gray-800">{weight}g</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-gray-500">
                                <span>Wastage ({wastagePercent}%) :</span>
                                <span className="text-gray-800">+{wastageWeight.toFixed(2)}g</span>
                            </div>
                            <div className="flex justify-between text-xs font-black text-indigo-600 pt-1 border-t border-gray-50">
                                <span>Effective Weight :</span>
                                <span>{totalEffectiveWeight.toFixed(2)}g</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-gray-400 italic">
                                <span>Market Rate (per g) :</span>
                                <span>₹{ratePerGm.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Charges */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                                    <Sparkles size={16} />
                                </div>
                                <span className="text-xs font-black text-gray-900 uppercase tracking-tighter">2. Making & Labor</span>
                            </div>
                            <span className="text-sm font-black text-amber-600">₹{formatIndianRupees(laborCost)}</span>
                        </div>
                        <div className="pl-8 border-l-2 border-amber-50">
                            <div className="flex justify-between text-xs font-bold text-gray-500">
                                <span>Labor Charges :</span>
                                <span className="text-gray-800">₹{laborCost}</span>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Taxes */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                                    <IndianRupee size={16} />
                                </div>
                                <span className="text-xs font-black text-gray-900 uppercase tracking-tighter">3. GST ({gstRate}%)</span>
                            </div>
                            <span className="text-sm font-black text-rose-600">₹{formatIndianRupees(gstAmount)}</span>
                        </div>
                        <div className="pl-8 border-l-2 border-rose-50">
                            <div className="flex justify-between text-xs font-bold text-gray-500">
                                <span>Tax Amount :</span>
                                <span className="text-gray-800">₹{formatIndianRupees(gstAmount)}</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Final Total Area */}
                <div className="px-8 pb-8 pt-4 bg-white border-t border-gray-100 shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Grand Total (Incl. All)</p>
                            <div className="flex items-center gap-2">
                                <p className="text-4xl font-black text-indigo-600 tracking-tighter">₹{formatIndianRupees(finalPrice)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight bg-emerald-50 px-2 py-1 rounded-md">Price Locked</p>
                        </div>
                    </div>

                    <button
                        onClick={handleAddToOrder}
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                    >
                        ADD TO MY BILL
                        <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

            </div>
        </div>
    );
}
