import React from 'react';
import { format } from 'date-fns';
import { Pencil, X, CheckCircle2 } from 'lucide-react';
import { ClientMaterialTransaction } from '../../../types';

interface CompactTransactionRowProps {
    transaction: ClientMaterialTransaction;
    isSelected: boolean;
    onToggle: (id: string) => void;
    onEdit: (t: ClientMaterialTransaction) => void;
    onDelete: (id: string) => void;
}

export const CompactTransactionRow: React.FC<CompactTransactionRowProps> = ({
    transaction,
    isSelected,
    onToggle,
    onEdit,
    onDelete
}) => {
    const isConsumption = transaction.transaction_type === 'CONSUMPTION';
    const isReceipt = transaction.transaction_type === 'RECEIPT';
    const isLoss = transaction.transaction_type === 'LOSS';

    const typeConfig = {
        RECEIPT: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Received' },
        CONSUMPTION: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Consumed' },
        LOSS: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Loss' }
    };

    const config = typeConfig[transaction.transaction_type];

    return (
        <tr className={`hover:bg-gray-50/50 transition-colors group ${isSelected ? 'bg-indigo-50/30' : ''}`}>
            <td className="px-6 py-4">
                {isConsumption && (
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                            checked={isSelected}
                            onChange={() => onToggle(transaction.id)}
                        />
                    </div>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
                    {format(new Date(transaction.transaction_date), 'dd MMM yyyy')}
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="font-bold text-gray-900 leading-tight">{transaction.client_name}</div>
                <div className="text-[10px] text-gray-400 font-medium">{transaction.material_type}</div>
            </td>
            <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${config.bg} ${config.text}`}>
                    {config.label}
                </span>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                        {(transaction.remarks || '').split(' - ')[0] || '—'}
                    </span>
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex flex-col items-end">
                    <div className="text-sm font-black text-gray-900">{Number(transaction.quantity || 0).toFixed(3)} KG</div>
                    {Number(transaction.pcs || 0) > 0 && (
                        <div className="text-[9px] font-bold text-indigo-600 leading-none mt-0.5">
                            {transaction.pcs} PCS
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 max-w-xs transition-opacity overflow-hidden">
                <div className="text-[11px] text-gray-500 italic truncate group-hover:block hidden">
                    {(transaction.remarks || '').split(' - ').slice(1).join(' - ') || transaction.reason || '—'}
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(transaction)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Edit Entry"
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        onClick={() => onDelete(transaction.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Delete Entry"
                    >
                        <X size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );
};
