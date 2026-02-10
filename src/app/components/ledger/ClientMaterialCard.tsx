import React from 'react';
import { User, Database, ArrowRightLeft, AlertTriangle, ChevronRight } from 'lucide-react';
import { ClientMaterialBalance } from '../../../types';

interface ClientMaterialCardProps {
    balance: ClientMaterialBalance;
    onClick: () => void;
}

export const ClientMaterialCard: React.FC<ClientMaterialCardProps> = ({ balance, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all text-left w-full relative overflow-hidden"
        >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <User className="w-6 h-6" />
                </div>
                <div className="text-right">
                    <div className={`text-sm font-black ${balance.balance > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {balance.balance.toFixed(3)} KG
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Net Balance</div>
                </div>
            </div>

            <div className="space-y-3 relative z-10">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate pr-6">
                    {balance.client_name}
                </h3>

                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50/50 p-2 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                            <Database size={10} className="text-blue-500" />
                            <span className="text-[8px] font-bold text-blue-500 uppercase tracking-tighter">In</span>
                        </div>
                        <div className="text-xs font-bold text-blue-700">{balance.received.toFixed(2)}</div>
                    </div>
                    <div className="bg-emerald-50/50 p-2 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                            <ArrowRightLeft size={10} className="text-emerald-500" />
                            <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter">Out</span>
                        </div>
                        <div className="text-xs font-bold text-emerald-700">{balance.consumed.toFixed(2)}</div>
                    </div>
                    <div className="bg-rose-50/50 p-2 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                            <AlertTriangle size={10} className="text-rose-500" />
                            <span className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter">Loss</span>
                        </div>
                        <div className="text-xs font-bold text-rose-700">{balance.loss.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-indigo-600">
                <span className="text-[10px] font-black uppercase tracking-widest">View Audit Trail</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
        </button>
    );
};
