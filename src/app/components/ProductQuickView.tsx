import React, { useEffect, useState } from 'react';
import { X, ShoppingCart, Gem, ArrowRight, Sparkles, Scale, IndianRupee } from 'lucide-react';
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

    // Calculate price with live rate
    const wastageWeight = product.default_weight * (product.wastage_percent / 100);
    const totalEffectiveWeight = product.default_weight + wastageWeight;
    const metalCost = totalEffectiveWeight * (silverRate / 1000); // Silver rate per gm (passed rate is per kg)
    const totalPrice = metalCost + product.labour_cost;
    const gstAmount = totalPrice * ((product.gst_rate || 3) / 100);
    const finalPrice = totalPrice + gstAmount;

    const handleAddToOrder = () => {
        triggerHaptic('success');
        // Navigate to order creation with product context
        navigate('/orders/create', {
            state: {
                autoAddProduct: product,
                referringPage: 'quick-view'
            }
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-900/70 z-[120] flex items-end sm:items-center justify-center backdrop-blur-sm p-0 sm:p-4 animate-in slide-in-from-bottom duration-300">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header/Image */}
                <div className="relative h-64 sm:h-72 bg-gradient-to-br from-indigo-50 to-indigo-100/50">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-contain p-8 mix-blend-multiply"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Gem size={80} className="text-indigo-200" />
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-3 bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl text-gray-500 hover:text-gray-700 transition-all hover:scale-110"
                    >
                        <X size={20} />
                    </button>

                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                        <span className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-600/20">
                            Verified Product
                        </span>
                        <span className="px-4 py-1.5 bg-white text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-600/10 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Live Rate Applied
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 sm:p-10 space-y-8">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">{product.name}</h2>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Current Value</p>
                                <p className="text-2xl font-black text-indigo-600">₹{formatIndianRupees(finalPrice)}</p>
                            </div>
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{product.category}</p>
                    </div>

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-indigo-200 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <Scale size={14} className="text-gray-400" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Weight Details</span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-gray-700">
                                    <span>Base Weight:</span>
                                    <span>{product.default_weight}g</span>
                                </div>
                                <div className="flex justify-between text-xs font-medium text-gray-500">
                                    <span>Wastage ({product.wastage_percent}%):</span>
                                    <span>+{wastageWeight.toFixed(2)}g</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-indigo-200 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={14} className="text-gray-400" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Labor & Tax</span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-gray-700">
                                    <span>Labor (Making):</span>
                                    <span>₹{product.labour_cost}</span>
                                </div>
                                <div className="flex justify-between text-xs font-medium text-gray-500">
                                    <span>GST ({product.gst_rate}%):</span>
                                    <span>₹{Math.round(gstAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white rounded-2xl text-indigo-600 shadow-sm">
                                <IndianRupee size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Metal Base Rate (per g)</p>
                                <p className="text-lg font-black text-indigo-700 leading-none">₹{(silverRate / 1000).toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Effective WT</p>
                            <p className="text-lg font-black text-indigo-700 leading-none">{totalEffectiveWeight.toFixed(2)}g</p>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleAddToOrder}
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black text-lg shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                    >
                        <ShoppingCart size={22} className="group-hover:translate-x-1 transition-transform" />
                        CREATE ORDER NOW
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
