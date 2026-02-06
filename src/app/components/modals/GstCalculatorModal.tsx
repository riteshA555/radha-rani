
import { useState } from 'react';
import { Calculator, X } from 'lucide-react';

interface GstCalculatorModalProps {
    onClose: () => void;
}

export function GstCalculatorModal({ onClose }: GstCalculatorModalProps) {
    const [amount, setAmount] = useState('');
    const [rate, setRate] = useState('3');
    const val = Number(amount) || 0;
    const r = Number(rate) || 0;
    const gst = (val * r) / 100;
    const total = val + gst;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-gray-800">
                        <Calculator className="w-5 h-5 text-indigo-600" /> GST Calculator
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Amount (₹)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full p-3 text-xl font-bold border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                            autoFocus
                            placeholder="0"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">GST Rate (%)</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[3, 5, 12, 18].map(rt => (
                                <button
                                    key={rt}
                                    onClick={() => setRate(rt.toString())}
                                    className={`py-2 rounded-lg font-bold text-sm border transition-all ${rate === rt.toString()
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {rt}%
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>GST Amount:</span>
                            <span className="font-medium">₹{gst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                            <span>Total:</span>
                            <span>₹{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
