import { useState, useEffect } from 'react';
import {
  User, Building2, Bell, Lock, Palette, Database, HelpCircle, LogOut,
  ChevronRight, Loader2, Save, FileText, Calculator, Package, Settings,
  Trash2, AlertTriangle, CreditCard, Download, Upload, Globe, Calendar,
  Clock, HardDrive, Smartphone, Share2, ShieldCheck, Mail, MessageSquare
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { t } from '../../shared/utils/i18n';
import { ReAuthModal } from '../components/shared/ReAuthModal';
import { ImageUpload } from '../../components/shared/ImageUpload';
import {
  exportFullData,
  importFullData,
  factoryReset,
  getSettings,
  updateSettings as updateSetting,
  clearSettingsCache
} from '../../services/settingsService';
import { formatIndianRupees } from '../../shared/utils/formatters';

const TABS = [
  { id: 'business_profile', label: 'Business Profile', labelKey: 'business_profile', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Company branding & contact' },
  { id: 'user_settings', label: 'User Preferences', labelKey: 'user_preferences', icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50', description: 'Language, theme & display' },
  { id: 'gst_settings', label: 'Tax & GST', labelKey: 'tax_gst', icon: Calculator, color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'GST rates & tax logic' },
  { id: 'invoice_settings', label: 'Invoicing', labelKey: 'invoice_settings', icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50', description: 'Invoice prefixes & bank info' },
  { id: 'inventory_settings', label: 'Inventory', labelKey: 'inventory_stock', icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', description: 'Stock thresholds & units' },
  { id: 'pricing_settings', label: 'Pricing & Rates', labelKey: 'pricing_rates', icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50', description: 'Margins & making charges' },
  { id: 'karigar_settings', label: 'Karigar Settings', labelKey: 'karigar_settings', icon: HardDrive, color: 'text-cyan-600', bg: 'bg-cyan-50', description: 'Karigar rates & penalties' },
  { id: 'customer_settings', label: 'Customer Settings', labelKey: 'customer_ledger', icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50', description: 'Credit limits & interest' },
  { id: 'notification_settings', label: 'Notifications', labelKey: 'notifications', icon: Bell, color: 'text-orange-600', bg: 'bg-orange-50', description: 'Email & WhatsApp alerts' },
  { id: 'advanced', label: 'Advanced & Backup', labelKey: 'advanced_backup', icon: Database, color: 'text-gray-600', bg: 'bg-gray-50', description: 'Data export & factory reset' },
];

export function SettingsPage() {
  const { signOut } = useAuth();
  const { settings, updateSetting, loading: globalLoading } = useSettings();
  const lang = settings.user_settings?.language || 'en';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('business_profile');
  const [saving, setSaving] = useState(false);
  const [showReAuth, setShowReAuth] = useState(false);
  const [importing, setImporting] = useState(false);

  // Local state for edits
  const [localData, setLocalData] = useState<any>(null);

  // Sync local data when settings or tab changes
  useEffect(() => {
    if (settings && settings[activeTab as keyof typeof settings]) {
      setLocalData({ ...settings[activeTab as keyof typeof settings] });
    } else {
      setLocalData(null);
    }
  }, [activeTab, settings]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!localData) return;
    setSaving(true);
    try {
      await updateSetting(activeTab as any, localData);
      // alert('Settings saved successfully!');
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportFullData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sterlingflow_full_system_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (err) {
      alert("Full Backup failed");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm("CRITICAL: Importing a full backup will overwrite ALL current data and settings. This cannot be undone. Continue?")) return;

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          await importFullData(event.target?.result as string);
          alert("Full System data restored successfully. Refreshing page...");
          window.location.reload();
        } catch (err: any) {
          alert("Restore failed: " + err.message);
        }
      };
      reader.readAsText(file);
    } finally {
      setImporting(false);
    }
  };

  const renderTabContent = () => {
    if (globalLoading && !saving) {
      return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-gray-400 font-bold animate-pulse uppercase tracking-widest text-[10px]">Synchronizing Cloud Logic...</p>
        </div>
      );
    }

    if (!localData && activeTab !== 'advanced') {
      return (
        <div className="p-10 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
            <Settings size={32} />
          </div>
          <div className="space-y-1">
            <p className="text-gray-500 font-bold">Section Not Initialized</p>
            <p className="text-gray-400 text-xs">Waiting for database synchronization or category defaults.</p>
          </div>
        </div>
      );
    }

    const tab = TABS.find(t => t.id === activeTab);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 mb-2">
          <div className={`p-3 rounded-2xl ${tab?.bg} ${tab?.color}`}>
            {tab && <tab.icon size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 leading-none">{t(tab?.labelKey as any, lang)}</h3>
            <p className="text-xs text-gray-400 font-medium mt-1">{tab?.description}</p>
          </div>
        </div>

        {activeTab === 'business_profile' && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Business Logo</label>
              <ImageUpload
                currentImageUrl={localData.logoUrl}
                onImageUploaded={(url: string) => setLocalData({ ...localData, logoUrl: url })}
                bucketName="logos"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
              <Input label="Business Name" value={localData.businessName} onChange={(v: string) => setLocalData({ ...localData, businessName: v })} required />
              <Input label="GSTIN" value={localData.gstin} onChange={(v: string) => setLocalData({ ...localData, gstin: v })} />
              <Input label="Email" value={localData.email} onChange={(v: string) => setLocalData({ ...localData, email: v })} />
              <Input label="Phone" value={localData.phone} onChange={(v: string) => setLocalData({ ...localData, phone: v })} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Address</label>
              <textarea
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                rows={3} value={localData.address} onChange={(e: any) => setLocalData({ ...localData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-bold">
              <Input label="City" value={localData.city} onChange={(v: string) => setLocalData({ ...localData, city: v })} />
              <Input label="State" value={localData.state} onChange={(v: string) => setLocalData({ ...localData, state: v })} />
              <Input label="Pincode" value={localData.pincode} onChange={(v: string) => setLocalData({ ...localData, pincode: v })} />
            </div>
          </div>
        )}

        {activeTab === 'user_settings' && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select label="Application Language" value={localData.language} onChange={(v: string) => setLocalData({ ...localData, language: v })}>
                <option value="en">English (default)</option>
                <option value="hi">Hindi (हिंदी)</option>
              </Select>
              <Select label="Application Theme" value={localData.theme} onChange={(v: string) => setLocalData({ ...localData, theme: v })}>
                <option value="light">Light Mode (Clean)</option>
                <option value="dark">Dark Mode (Premium)</option>
              </Select>
              <Select label="Date Format" value={localData.dateFormat} onChange={(v: string) => setLocalData({ ...localData, dateFormat: v })}>
                <option value="DD/MM/YYYY">31/12/2024</option>
                <option value="MM/DD/YYYY">12/31/2024</option>
              </Select>
              <Select label="Number Format" value={localData.numberFormat} onChange={(v: string) => setLocalData({ ...localData, numberFormat: v })}>
                <option value="indian">Indian (1,23,456.00)</option>
                <option value="international">International (123,456.00)</option>
              </Select>
              <Input label="Session Timeout (Min)" type="number" value={localData.sessionTimeout} onChange={(v: string) => setLocalData({ ...localData, sessionTimeout: Number(v) })} />
            </div>
          </div>
        )}

        {activeTab === 'gst_settings' && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Default Sales GST %" type="number" value={localData.defaultGstRateSale} onChange={(v: string) => setLocalData({ ...localData, defaultGstRateSale: Number(v) })} />
              <Input label="Default Job Work GST %" type="number" value={localData.defaultGstRateJobWork} onChange={(v: string) => setLocalData({ ...localData, defaultGstRateJobWork: Number(v) })} />
              <Select label="Tax Method" value={localData.taxCalculationMethod} onChange={(v: string) => setLocalData({ ...localData, taxCalculationMethod: v })}>
                <option value="exclusive">Exclusive (Price + Tax)</option>
                <option value="inclusive">Inclusive (MRP Basis)</option>
              </Select>
              <div className="space-y-4">
                <Toggle label="Enable Reverse Charge (RCM)" checked={localData.enableReverseCharge} onChange={(v: boolean) => setLocalData({ ...localData, enableReverseCharge: v })} />
                <Toggle label="Composition Scheme" checked={localData.compositionScheme} onChange={(v: boolean) => setLocalData({ ...localData, compositionScheme: v })} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoice_settings' && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Invoice Prefix" value={localData.invoicePrefix} onChange={(v: string) => setLocalData({ ...localData, invoicePrefix: v })} />
              <Input label="Start Number" type="number" value={localData.startingNumber} onChange={(v: string) => setLocalData({ ...localData, startingNumber: Number(v) })} />
              <Input label="Payment Terms (Days)" value={localData.paymentTerms} onChange={(v: string) => setLocalData({ ...localData, paymentTerms: v })} />
              <Toggle label="Auto Generation" checked={localData.autoGenerate} onChange={(v: boolean) => setLocalData({ ...localData, autoGenerate: v })} />
            </div>
            <div className="pt-8 border-t border-gray-50">
              <h4 className="font-bold text-[11px] text-gray-400 uppercase tracking-widest mb-6">Settlement Bank Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Bank Name" value={localData.bankName} onChange={(v: string) => setLocalData({ ...localData, bankName: v })} />
                <Input label="Account Number" value={localData.accountNumber} onChange={(v: string) => setLocalData({ ...localData, accountNumber: v })} />
                <Input label="IFSC Code" value={localData.ifscCode} onChange={(v: string) => setLocalData({ ...localData, ifscCode: v })} />
                <Input label="Branch" value={localData.branchName} onChange={(v: string) => setLocalData({ ...localData, branchName: v })} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pricing_settings' && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Default Profit Margin %" type="number" value={localData.defaultProfitMargin} onChange={(v: string) => setLocalData({ ...localData, defaultProfitMargin: Number(v) })} />
              <Select label="Rounding Rule" value={localData.roundingRule} onChange={(v: string) => setLocalData({ ...localData, roundingRule: Number(v) })}>
                <option value={1}>No Rounding (Exact)</option>
                <option value={5}>Round to nearest 5</option>
                <option value={10}>Round to nearest 10</option>
              </Select>
              <Select label="Labour Rate Type" value={localData.labourRateType} onChange={(v: string) => setLocalData({ ...localData, labourRateType: v })}>
                <option value="per_gram">Per Gram</option>
                <option value="per_piece">Per Piece</option>
                <option value="fixed">Fixed Amount</option>
              </Select>
              <Input label="Default Making Charge (₹)" type="number" value={localData.defaultMakingCharge} onChange={(v: string) => setLocalData({ ...localData, defaultMakingCharge: Number(v) })} />
            </div>
          </div>
        )}

        {activeTab === 'inventory_settings' && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Stock Warning Limit" type="number" value={localData.lowStockThreshold} onChange={(v: string) => setLocalData({ ...localData, lowStockThreshold: Number(v) })} />
              <Select label="Valuation Method" value={localData.stockValuationMethod} onChange={(v: string) => setLocalData({ ...localData, stockValuationMethod: v })}>
                <option value="FIFO">FIFO (First In First Out)</option>
                <option value="WEIGHTED_AVERAGE">Weighted Average</option>
              </Select>
              <Toggle label="Block Negative Stock" checked={!localData.allowNegativeStock} onChange={(v: boolean) => setLocalData({ ...localData, allowNegativeStock: !v })} />
              <Toggle label="Auto Calc Wastage" checked={localData.autoCalculateWastage} onChange={(v: boolean) => setLocalData({ ...localData, autoCalculateWastage: v })} />
            </div>
          </div>
        )}

        {activeTab === 'karigar_settings' && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select label="Default Rate Type" value={localData.defaultRateType} onChange={(v: string) => setLocalData({ ...localData, defaultRateType: v })}>
                <option value="per_kg">Per KG</option>
                <option value="per_piece">Per Piece</option>
              </Select>
              <Select label="Payment Cycle" value={localData.paymentCycle} onChange={(v: string) => setLocalData({ ...localData, paymentCycle: v })}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
              <Toggle label="Allow Advances" checked={localData.allowAdvancePayment} onChange={(v: boolean) => setLocalData({ ...localData, allowAdvancePayment: v })} />
              <Toggle label="Penalty on Delay" checked={localData.penaltyForDelay} onChange={(v: boolean) => setLocalData({ ...localData, penaltyForDelay: v })} />
            </div>
            {localData.penaltyForDelay && <Input label="Penalty %" type="number" value={localData.penaltyPercentage} onChange={(v: string) => setLocalData({ ...localData, penaltyPercentage: Number(v) })} />}
          </div>
        )}

        {activeTab === 'customer_settings' && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Default Credit Limit (₹)" type="number" value={localData.defaultCreditLimit} onChange={(v: string) => setLocalData({ ...localData, defaultCreditLimit: Number(v) })} />
              <Input label="Default Terms (Days)" value={localData.defaultPaymentTerms} onChange={(v: string) => setLocalData({ ...localData, defaultPaymentTerms: v })} />
              <Toggle label="Interest on Overdue" checked={localData.interestOnOverdue} onChange={(v: boolean) => setLocalData({ ...localData, interestOnOverdue: v })} />
              {localData.interestOnOverdue && <Input label="Monthly Interest %" type="number" value={localData.interestRate} onChange={(v: string) => setLocalData({ ...localData, interestRate: Number(v) })} />}
            </div>
          </div>
        )}

        {activeTab === 'notification_settings' && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Toggle label="WhatsApp Status Updates" checked={localData.whatsappIntegration} onChange={(v: boolean) => setLocalData({ ...localData, whatsappIntegration: v })} />
              <Toggle label="Email Invoice Delivery" checked={localData.emailNotifications} onChange={(v: boolean) => setLocalData({ ...localData, emailNotifications: v })} />
              <Toggle label="Payment Reminders" checked={localData.paymentReminders} onChange={(v: boolean) => setLocalData({ ...localData, paymentReminders: v })} />
              <Toggle label="Daily Business Summary" checked={localData.dailySummary} onChange={(v: boolean) => setLocalData({ ...localData, dailySummary: v })} />
            </div>
            <div className="pt-8 border-t border-gray-50 space-y-4">
              <h4 className="font-bold text-[11px] text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Mail size={14} /> EmailJS Integration (Automated Reports)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Service ID" value={localData.emailJsServiceId} onChange={(v: string) => setLocalData({ ...localData, emailJsServiceId: v })} />
                <Input label="Template ID" value={localData.emailJsTemplateId} onChange={(v: string) => setLocalData({ ...localData, emailJsTemplateId: v })} />
                <Input label="Public Key" value={localData.emailJsPublicKey} onChange={(v: string) => setLocalData({ ...localData, emailJsPublicKey: v })} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
              <h4 className="font-bold text-[11px] text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Database size={14} /> Full System Backup & Portability
              </h4>
              <p className="text-xs text-gray-400 mb-6 font-medium">Backup includes all Orders, Inventory, Contacts, Karigar ledgers, and Application Settings.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={handleExport} className="flex items-center justify-center gap-3 p-6 bg-gray-50 rounded-2xl border border-gray-200 hover:bg-white hover:border-indigo-300 transition-all font-bold group">
                  <Download size={20} className="text-gray-400 group-hover:text-indigo-600" />
                  <div className="text-left">
                    <div className="text-sm">Download Full Backup</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Complete System Image</div>
                  </div>
                </button>
                <label className="flex items-center justify-center gap-3 p-6 bg-gray-50 rounded-2xl border border-gray-200 hover:bg-white hover:border-indigo-300 transition-all font-bold group cursor-pointer">
                  <input type="file" className="hidden" accept=".json" onChange={handleImport} disabled={importing} />
                  {importing ? <Loader2 className="animate-spin text-indigo-600" /> : <Upload size={20} className="text-gray-400 group-hover:text-indigo-600" />}
                  <div className="text-left">
                    <div className="text-sm">Restore Full System</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Upload Backup File</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-rose-50 rounded-3xl border border-rose-100 p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-white rounded-2xl text-rose-600 shadow-sm">
                  <AlertTriangle size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-rose-900 text-lg">Factory Reset</h3>
                  <p className="text-rose-700 text-sm mb-6 leading-relaxed">
                    This is **irreversible**. All your business data, ledgers, inventory, and account details will be permanently erased.
                  </p>

                  <button
                    onClick={() => {
                      if (window.confirm("CRITICAL WARNING: This will PERMANENTLY delete ALL your data. Proceed to authorization?")) {
                        setShowReAuth(true);
                      }
                    }}
                    className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-rose-200 flex items-center gap-3 transition-all active:scale-95"
                  >
                    <Trash2 size={18} /> Wipe System Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'advanced' && (
          <div className="pt-8 pb-24">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save size={18} />}
              Apply & Save All Changes
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row h-full lg:overflow-hidden bg-[#fafbfc]">
      {/* Sidebar */}
      <div className="w-full lg:w-80 bg-white border-b lg:border-r border-gray-100 lg:h-full lg:flex-shrink-0 flex flex-col z-30 shadow-sm relative">
        <div className="p-8 pb-4">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight uppercase">Settings</h2>
          <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-[0.2em]">Configuration Panel v2.0</p>
        </div>

        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-y-auto custom-scrollbar px-6 lg:px-4 py-6 gap-3 lg:gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${activeTab === tab.id
                  ? 'bg-white shadow-md shadow-gray-200/50 border border-gray-100'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                  }`}
              >
                <div className={`p-2 rounded-xl scale-90 ${activeTab === tab.id ? `${tab.bg} ${tab.color}` : 'bg-gray-50'}`}>
                  <tab.icon size={18} />
                </div>
                <div className="text-left">
                  <p className={`text-xs font-bold leading-none ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-500'}`}>
                    {t(tab.labelKey as any, lang)}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-1 font-medium">{tab.description}</p>
                </div>
                {activeTab === tab.id && <ChevronRight size={14} className="ml-auto text-gray-300" />}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main Panel */}
      <div className="flex-1 p-4 sm:p-6 lg:p-12 lg:overflow-y-auto custom-scrollbar min-h-screen lg:h-screen flex flex-col overflow-x-hidden">
        <div className="max-w-4xl mx-auto w-full flex-1">
          {renderTabContent()}
        </div>
      </div>

      <ReAuthModal
        isOpen={showReAuth}
        onClose={() => setShowReAuth(false)}
        onSuccess={async () => {
          setShowReAuth(false);
          try {
            await factoryReset();
            alert("System wiped successfully.");
            signOut();
            navigate('/login');
          } catch (e: any) { alert("Reset failed: " + e.message); }
        }}
        title="Authorize Wipe"
        description="Type your password to confirm full system factory reset."
      />
    </div>
  );
}

// UI Components
const Input = ({ label, type = "text", value, onChange, required, placeholder }: any) => (
  <div className="space-y-2">
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none transition-all"
    />
  </div>
)

const Select = ({ label, value, onChange, children }: any) => (
  <div className="space-y-2">
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none appearance-none cursor-pointer transition-all"
      >
        {children}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <ChevronRight className="rotate-90 w-4 h-4" />
      </div>
    </div>
  </div>
)

const Toggle = ({ label, checked, onChange }: any) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-2xl hover:bg-white hover:border-indigo-500 transition-all group cursor-pointer" onClick={() => onChange(!checked)}>
    <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-700 transition-colors">{label}</span>
    <div className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}>
      <div className={`bg-white w-4 h-4 rounded-full shadow-lg transform duration-300 ease-in-out ${checked ? 'translate-x-6' : ''}`}></div>
    </div>
  </div>
)
