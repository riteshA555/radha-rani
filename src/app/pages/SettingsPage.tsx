import { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Bell,
  Lock,
  Palette,
  Database,
  HelpCircle,
  LogOut,
  ChevronRight,
  Loader2,
  X,
  Save,
  FileText,
  Calculator,
  Package,
  Settings,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CreditCard,
  Briefcase
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { getSettings, updateSettings, factoryReset } from '../../services/settingsService';
import { BusinessProfileSettings, GSTSettings, InvoiceSettings, InventorySettings, PricingSettings, SystemSettings } from '../../types/settings';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ReAuthModal } from '../components/shared/ReAuthModal';

const TABS = [
  { id: 'business', label: 'Business Profile', icon: Building2, description: 'Manage your company details and branding' },
  { id: 'gst', label: 'Tax & GST', icon: Calculator, description: 'Configure tax rates and GST details' },
  { id: 'invoice', label: 'Invoicing', icon: FileText, description: 'Set invoice terms, prefixes, and formatting' },
  { id: 'inventory', label: 'Inventory', icon: Package, description: 'Stock warnings, valuation, and units' },
  { id: 'pricing', label: 'Pricing & Rates', icon: CreditCard, description: 'Margins, making charges, and rounding' },
  { id: 'system', label: 'System & Data', icon: Settings, description: 'Backup, reset, and application preferences' },
];

export function SettingsPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [business, setBusiness] = useState<BusinessProfileSettings | null>(null);
  const [gst, setGst] = useState<GSTSettings | null>(null);
  const [invoice, setInvoice] = useState<InvoiceSettings | null>(null);
  const [inventory, setInventory] = useState<InventorySettings | null>(null);
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [system, setSystem] = useState<SystemSettings | null>(null);

  useEffect(() => {
    loadTabSettings(activeTab);
  }, [activeTab]);

  const loadTabSettings = async (tab: string) => {
    setLoading(true);
    try {
      switch (tab) {
        case 'business':
          if (!business) setBusiness(await getSettings<BusinessProfileSettings>('business_profile'));
          break;
        case 'gst':
          if (!gst) setGst(await getSettings<GSTSettings>('gst_settings'));
          break;
        case 'invoice':
          if (!invoice) setInvoice(await getSettings<InvoiceSettings>('invoice_settings'));
          break;
        case 'inventory':
          if (!inventory) setInventory(await getSettings<InventorySettings>('inventory_settings'));
          break;
        case 'pricing':
          if (!pricing) setPricing(await getSettings<PricingSettings>('pricing_settings'));
          break;
        case 'system':
          if (!system) setSystem(await getSettings<SystemSettings>('system_settings'));
          break;
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (category: string, data: any) => {
    setSaving(true);
    try {
      if (category === 'business') await updateSettings('business_profile', data);
      if (category === 'gst') await updateSettings('gst_settings', data);
      if (category === 'invoice') await updateSettings('invoice_settings', data);
      if (category === 'inventory') await updateSettings('inventory_settings', data);
      if (category === 'pricing') await updateSettings('pricing_settings', data);
      if (category === 'system') await updateSettings('system_settings', data);
      // alert('Settings saved successfully!');
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const [showReAuth, setShowReAuth] = useState(false);

  const handleFactoryResetRequest = () => {
    if (window.confirm("CRITICAL WARNING: This will PERMANENTLY delete ALL your data. This cannot be undone. Are you absolutely sure?")) {
      setShowReAuth(true);
    }
  }

  const handleFinalReset = async () => {
    setShowReAuth(false);
    try {
      setLoading(true);
      await factoryReset();
      alert("System wiped successfully. You will be logged out now.");
      await signOut();
      navigate('/login');
    } catch (e: any) {
      alert("Reset failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const renderContent = () => {
    if (loading && !saving) return <div className="flex h-full items-center justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

    switch (activeTab) {
      case 'business':
        return business && (
          <form className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" onSubmit={(e) => { e.preventDefault(); saveSettings('business', business); }}>
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-600">
                  {business.logoUrl ? <img src={business.logoUrl} className="w-full h-full rounded-full object-cover" /> : <Building2 size={32} />}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Company Details</h3>
                  <p className="text-sm text-gray-500">Your specific business information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Business Name" value={business.businessName} onChange={v => setBusiness({ ...business, businessName: v })} required />
                <Input label="GSTIN" value={business.gstin} onChange={v => setBusiness({ ...business, gstin: v })} />
                <Input label="PAN" value={business.pan} onChange={v => setBusiness({ ...business, pan: v })} />
                <Input label="Phone" value={business.phone} onChange={v => setBusiness({ ...business, phone: v })} />
                <Input label="Email" value={business.email} onChange={v => setBusiness({ ...business, email: v })} />
                <Input label="Website" value={business.website} onChange={v => setBusiness({ ...business, website: v })} />
              </div>
              <div className="mt-4">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Address</label>
                <textarea className="w-full p-3 bg-gray-50 border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" rows={3} value={business.address} onChange={e => setBusiness({ ...business, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <Input label="City" value={business.city} onChange={v => setBusiness({ ...business, city: v })} />
                <Input label="State" value={business.state} onChange={v => setBusiness({ ...business, state: v })} />
                <Input label="Pincode" value={business.pincode} onChange={v => setBusiness({ ...business, pincode: v })} />
              </div>
            </div>
            <SaveButton saving={saving} />
          </form>
        );

      case 'gst':
        return gst && (
          <form className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" onSubmit={(e) => { e.preventDefault(); saveSettings('gst', gst); }}>
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <Header title="Tax Configuration" description="Manage GST rates and calculation logic" icon={<Calculator className="w-6 h-6 text-emerald-600" />} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Default GST Rate (Sales) %" type="number" value={gst.defaultGstRateSale} onChange={v => setGst({ ...gst, defaultGstRateSale: Number(v) })} />
                <Input label="Default GST Rate (Job Work) %" type="number" value={gst.defaultGstRateJobWork} onChange={v => setGst({ ...gst, defaultGstRateJobWork: Number(v) })} />
                <Select label="Tax Calculation" value={gst.taxCalculationMethod} onChange={v => setGst({ ...gst, taxCalculationMethod: v as any })}>
                  <option value="exclusive">Exclusive (Price + Tax)</option>
                  <option value="inclusive">Inclusive (Price includes Tax)</option>
                </Select>
                <Toggle label="Enable Reverse Charge" checked={gst.enableReverseCharge} onChange={v => setGst({ ...gst, enableReverseCharge: v })} />
                <Toggle label="Composition Scheme" checked={gst.compositionScheme} onChange={v => setGst({ ...gst, compositionScheme: v })} />
              </div>
            </div>
            <SaveButton saving={saving} />
          </form>
        );

      case 'invoice':
        return invoice ? (
          <form className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" onSubmit={(e) => { e.preventDefault(); saveSettings('invoice', invoice); }}>
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <Header title="Invoice Preferences" description="Customize how your invoices look" icon={<FileText className="w-6 h-6 text-blue-600" />} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Invoice Prefix" value={invoice.invoicePrefix} onChange={v => setInvoice({ ...invoice, invoicePrefix: v })} />
                <Input label="Starting Number" type="number" value={invoice.startingNumber} onChange={v => setInvoice({ ...invoice, startingNumber: Number(v) })} />
                <Input label="Default Payment Terms" value={invoice.paymentTerms} onChange={v => setInvoice({ ...invoice, paymentTerms: v })} />
                <Toggle label="Auto-generate Numbers" checked={invoice.autoGenerate} onChange={v => setInvoice({ ...invoice, autoGenerate: v })} />
              </div>
              <div className="mt-6 border-t border-gray-100 pt-6">
                <h4 className="font-bold text-sm text-gray-900 mb-4">Bank Details (Shown on Invoice)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Bank Name" value={invoice.bankName} onChange={v => setInvoice({ ...invoice, bankName: v })} />
                  <Input label="Account Number" value={invoice.accountNumber} onChange={v => setInvoice({ ...invoice, accountNumber: v })} />
                  <Input label="IFSC Code" value={invoice.ifscCode} onChange={v => setInvoice({ ...invoice, ifscCode: v })} />
                  <Input label="Branch Name" value={invoice.branchName} onChange={v => setInvoice({ ...invoice, branchName: v })} />
                </div>
              </div>
              <div className="mt-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Invoice Terms & Conditions</label>
                <textarea className="w-full p-3 bg-gray-50 border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" rows={4} value={invoice.termsAndConditions} onChange={e => setInvoice({ ...invoice, termsAndConditions: e.target.value })} />
              </div>
            </div>
            <SaveButton saving={saving} />
          </form>
        ) : null;

      case 'inventory':
        return inventory ? (
          <form className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" onSubmit={(e) => { e.preventDefault(); saveSettings('inventory', inventory); }}>
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <Header title="Inventory Configuration" description="Stock keeping and valuation" icon={<Package className="w-6 h-6 text-amber-600" />} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Low Stock Warning Limit" type="number" value={inventory.lowStockThreshold} onChange={v => setInventory({ ...inventory, lowStockThreshold: Number(v) })} />
                <Select label="Default Unit" value={inventory.defaultUnit} onChange={v => setInventory({ ...inventory, defaultUnit: v as any })}>
                  <option value="Gram">Gram (g)</option>
                  <option value="Kg">Kilogram (kg)</option>
                  <option value="Piece">Piece (pc)</option>
                  <option value="Set">Set</option>
                </Select>
                <Toggle label="Allow Negative Stock" checked={inventory.allowNegativeStock} onChange={v => setInventory({ ...inventory, allowNegativeStock: v })} />
                <Toggle label="Auto-calculate Wastage" checked={inventory.autoCalculateWastage} onChange={v => setInventory({ ...inventory, autoCalculateWastage: v })} />
              </div>
            </div>
            <SaveButton saving={saving} />
          </form>
        ) : null;

      case 'pricing':
        return pricing ? (
          <form className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" onSubmit={(e) => { e.preventDefault(); saveSettings('pricing', pricing); }}>
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <Header title="Pricing Strategy" description="Margins and making charges" icon={<CreditCard className="w-6 h-6 text-rose-600" />} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Default Profit Margin (%)" type="number" value={pricing.defaultProfitMargin} onChange={v => setPricing({ ...pricing, defaultProfitMargin: Number(v) })} />
                <Input label="Default Making Charge" type="number" value={pricing.defaultMakingCharge} onChange={v => setPricing({ ...pricing, defaultMakingCharge: Number(v) })} />
                <Select label="Labour Rate Type" value={pricing.labourRateType} onChange={v => setPricing({ ...pricing, labourRateType: v as any })}>
                  <option value="per_gram">Per Gram</option>
                  <option value="per_piece">Per Piece</option>
                  <option value="fixed">Fixed</option>
                </Select>
                <Select label="Rounding Rule" value={pricing.roundingRule} onChange={v => setPricing({ ...pricing, roundingRule: Number(v) as any })}>
                  <option value={1}>None (Round to 1)</option>
                  <option value={5}>Round to 5</option>
                  <option value={10}>Round to 10</option>
                </Select>
              </div>
            </div>
            <SaveButton saving={saving} />
          </form>
        ) : null;

      case 'system':
        return system ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <Header title="System Preferences" description="App behavior and performance" icon={<Settings className="w-6 h-6 text-gray-600" />} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Toggle label="Enable Local Cache (Fast)" checked={system.enableCache} onChange={v => { setSystem({ ...system, enableCache: v }); saveSettings('system', { ...system, enableCache: v }); }} />
                <Toggle label="Debug Mode" checked={system.enableDebugMode} onChange={v => { setSystem({ ...system, enableDebugMode: v }); saveSettings('system', { ...system, enableDebugMode: v }); }} />
              </div>
            </div>

            <div className="bg-rose-50 rounded-xl border border-rose-100 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-full text-rose-600 shadow-sm">
                  <AlertTriangle size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-rose-900 text-lg">Danger Zone</h3>
                  <p className="text-rose-700 text-sm mb-4">Wipe everything including your Business Profile and Account.</p>

                  <button
                    onClick={handleFactoryResetRequest}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm shadow-rose-200 flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Trash2 size={16} /> Factory Reset App (Wipe All)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] overflow-hidden bg-gray-50/50">
      {/* Sidebar */}
      <div className="w-full lg:w-64 bg-white border-r border-gray-200 overflow-y-auto lg:h-full lg:flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h2>
          <p className="text-xs font-medium text-gray-500 mt-1">App Control Center</p>
        </div>
        <nav className="px-3 pb-6 space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <Icon size={18} />
                <div className="text-left">
                  <div>{tab.label}</div>
                  {activeTab === tab.id && <div className="text-[10px] font-medium opacity-70 leading-tight mt-0.5">{tab.description}</div>}
                </div>
              </button>
            )
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <button onClick={() => signOut()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-red-100 transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-3xl mx-auto">
          {renderContent()}
        </div>
      </div>

      <ReAuthModal
        isOpen={showReAuth}
        onClose={() => setShowReAuth(false)}
        onSuccess={handleFinalReset}
        title="Authorize System Wipe"
        description="Verify your identity to proceed with the permanent data factory reset."
      />
    </div>
  );
}

// UI Components
const Header = ({ title, description, icon }: any) => (
  <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
    <div className="p-3 bg-gray-50 rounded-xl">{icon}</div>
    <div>
      <h3 className="font-bold text-lg text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </div>
)

const Input = ({ label, type = "text", value, onChange, required }: any) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
    <div className="relative group">
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full p-3 bg-gray-50 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all group-hover:bg-white"
      />
    </div>
  </div>
)

const Select = ({ label, value, onChange, children }: any) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full p-3 bg-gray-50 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
      >
        {children}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <ChevronRight className="rotate-90 w-4 h-4" />
      </div>
    </div>
  </div>
)

const Toggle = ({ label, checked, onChange }: any) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all group cursor-pointer" onClick={() => onChange(!checked)}>
    <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-700 transition-colors">{label}</span>
    <div className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}>
      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${checked ? 'translate-x-5' : ''}`}></div>
    </div>
  </div>
)

const SaveButton = ({ saving }: { saving: boolean }) => (
  <div className="sticky bottom-4 z-40 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-xl flex justify-end animate-in slide-in-from-bottom-2">
    <button
      type="submit"
      disabled={saving}
      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
    >
      {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={18} />}
      Save Changes
    </button>
  </div>
)
