import { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Clock, User, HardDrive, RefreshCcw } from 'lucide-react';
import { getAuditLogs, AuditLog } from '../../services/systemService';
import { format } from 'date-fns';

export function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadLogs();
    }, []);

    async function loadLogs() {
        try {
            setLoading(true);
            const data = await getAuditLogs();
            setLogs(data);
        } catch (err) {
            console.error('Failed to load logs', err);
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-indigo-600" />
                        Audit Logs
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">Track system activities and data changes</p>
                </div>
                <button
                    onClick={loadLogs}
                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                    disabled={loading}
                >
                    <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50/10">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search logs by action or type..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                        />
                    </div>
                    <button className="px-4 py-2 border border-gray-200 rounded-lg flex items-center gap-2 text-sm font-bold text-gray-600 bg-white hover:bg-gray-50">
                        <Filter size={16} />
                        Filters
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Action</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Type</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic text-sm">Loading logs...</td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic text-sm text-black">No activity logs found</td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 group transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-gray-900 font-bold text-xs uppercase tracking-tight">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                {format(new Date(log.created_at), 'dd MMM, HH:mm:ss')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">{log.action}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                                                <span className="text-xs font-bold text-gray-500 uppercase">{log.entity_type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-500 font-medium max-w-md truncate">
                                                {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
