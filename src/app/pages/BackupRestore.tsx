import { useState, useRef } from 'react';
import {
    Database,
    Download,
    Upload,
    AlertTriangle,
    CheckCircle2,
    Clock,
    ShieldAlert,
    Loader2,
    FileJson
} from 'lucide-react';
import { exportFullData, importFullData } from '../../services/settingsService';
import { useSettings } from '../../context/SettingsContext';
import { PageHeader } from '../components/ui/PageHeader';

export function BackupRestore() {
    const { settings, refreshSettings } = useSettings();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const jsonData = await exportFullData();
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
            link.href = url;
            link.download = `backup_${date}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setSuccess('Backup exported successfully! Please save it in a secure location.');
            await refreshSettings();
        } catch (err: any) {
            setError('Export failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!window.confirm('WARNING: This will overwrite existing records with matching IDs. Are you sure you want to proceed with the restore?')) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const content = event.target?.result as string;
                    await importFullData(content);
                    setSuccess('System data restored successfully! The application will refresh.');
                    await refreshSettings();
                    setTimeout(() => window.location.reload(), 2000);
                } catch (err: any) {
                    setError('Restore failed: ' + err.message);
                } finally {
                    setLoading(false);
                }
            };
            reader.readAsText(file);
        } catch (err: any) {
            setError('File reading failed: ' + err.message);
            setLoading(false);
        }
    };

    return (
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
            <PageHeader
                title="Backup & Restore"
                subtitle="Securely manage your business database snapshots"
            />

            {/* Info Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4 items-start animate-in slide-in-from-top duration-300">
                <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-amber-900 mb-1">Critical Data Safety Notice</h4>
                    <p className="text-xs text-amber-700 leading-relaxed">
                        Backups contain sensitive data including invoices, contacts, and financial records. Store them only on encrypted drives. The restore operation will merge or overwrite current records with those in the backup file.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-50 flex-1">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                            <Download className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-2 tracking-tight">Export Database</h3>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                            Generate a full snapshot of your system data including orders, inventory, expenses, and artisan records into a portable JSON format.
                        </p>

                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                            <Clock className="w-3 h-3" />
                            Last Backup: {settings.system_settings?.lastBackupAt ? new Date(settings.system_settings.lastBackupAt).toLocaleString() : 'Never'}
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50/50">
                        <button
                            onClick={handleExport}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 shadow-lg shadow-indigo-100"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                            Generate & Download
                        </button>
                    </div>
                </div>

                {/* Import Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-50 flex-1">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
                            <Upload className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-2 tracking-tight">Restore Database</h3>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                            Upload a previously exported backup file to restore your database. This will overwrite existing records with matching IDs.
                        </p>
                        <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                                <FileJson className="w-3 h-3" />
                                Accepted Format: .json only
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50/50">
                        <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            onChange={handleImport}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-emerald-600 text-emerald-600 py-3 rounded-xl font-bold hover:bg-emerald-50 transition disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            Upload & Restore
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer Status */}
            {error && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3 items-center text-rose-700 animate-in fade-in duration-300">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}
            {success && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3 items-center text-emerald-700 animate-in fade-in duration-300">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-bold">{success}</p>
                </div>
            )}

            <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    <Database className="w-3 h-3" />
                    SterlingFlow Core Data Utility
                </div>
            </div>
        </div>
    );
}
