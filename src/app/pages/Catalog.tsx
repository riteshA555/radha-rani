import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Grid3x3, List, Gem, Eye, Edit2, Trash2, Hammer, Package, Calculator, X, Check, Loader2 } from 'lucide-react';
import { getProducts, updateProduct, deleteProduct, addProduct } from '../../services/productService';
import { getJobWorkItems, updateJobWorkItem, deleteJobWorkItem, addJobWorkItem } from '../../services/jobWorkService';
import { getLatestRates } from '../../services/rateService';
import { getSettings } from '../../services/settingsService';
import { GSTSettings, PricingSettings, InventorySettings } from '../../types/settings';
import { Product, JobWorkItem } from '../../types';
import { formatIndianRupees } from '../../shared/utils/formatters';
import { ImageUpload } from '../../components/shared/ImageUpload';
import { supabase } from '../../supabaseClient';

export function Catalog() {
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<JobWorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings State
  const [silverRate, setSilverRate] = useState(0);
  const [gstSettings, setGstSettings] = useState<GSTSettings | null>(null);
  const [invSettings, setInvSettings] = useState<InventorySettings | null>(null);

  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Products' | 'Services'>('Products');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState<any>({
    name: '',
    category: '',
    unit: 'Gram',
    default_weight: '',
    wastage_percent: '',
    labour_cost: '',
    default_rate: '',
    current_stock: '',
    gst_rate: '3',
    size: '',
    image_url: ''
  });

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [p, s, rates, gst, pricing, inv] = await Promise.all([
        getProducts(),
        getJobWorkItems(),
        getLatestRates(),
        getSettings<GSTSettings>('gst_settings'),
        getSettings<PricingSettings>('pricing_settings'),
        getSettings<InventorySettings>('inventory_settings')
      ]);
      setProducts(p || []);
      setServices(s || []);
      const silverRate = rates.find(r => r.metal_type === 'SILVER') || null;
      setSilverRate(silverRate ? silverRate.selling_rate : 0);
      setGstSettings(gst);
      setInvSettings(inv);

      if (isInitial) {
        setForm((prev: any) => ({
          ...prev,
          gst_rate: gst?.defaultGstRateSale || '3',
          labour_cost: pricing?.defaultMakingCharge || ''
        }));
      }
    } catch (err) {
      console.error('Failed to load catalog', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);

    // Live Monitoring
    const channel = supabase
      .channel('catalog_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobwork_items' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (activeTab === 'Products') {
        const payload = {
          name: form.name,
          category: form.category,
          size: form.size,
          default_weight: Number(form.default_weight || 0),
          wastage_percent: Number(form.wastage_percent || 0),
          labour_cost: Number(form.labour_cost || 0),
          current_stock: Number(form.current_stock || 0),
          gst_rate: Number(form.gst_rate || 3),
          is_active: true,
          image_url: form.image_url
        };

        if (editingId) {
          await updateProduct(editingId, payload);
        } else {
          await addProduct(payload);
        }
      } else {
        const payload = {
          name: form.name,
          unit: form.unit,
          default_rate: Number(form.default_rate || 0),
          is_active: true,
          image_url: form.image_url
        };

        if (editingId) {
          await updateJobWorkItem(editingId, payload);
        } else {
          await addJobWorkItem(payload);
        }
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      alert('Error saving item: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'Products') {
      setForm({
        name: item.name,
        category: item.category,
        unit: 'Gram', // Not used for Product but keeps type safe
        default_weight: item.default_weight,
        wastage_percent: item.wastage_percent,
        labour_cost: item.labour_cost,
        default_rate: '',
        current_stock: item.current_stock,
        gst_rate: item.gst_rate ?? 3,
        size: item.size ?? '',
        image_url: item.image_url || ''
      });
    } else {
      setForm({
        name: item.name,
        category: '',
        unit: item.unit,
        default_weight: '',
        wastage_percent: '',
        labour_cost: '',
        default_rate: item.default_rate,
        current_stock: '',
        gst_rate: '3',
        size: '',
        image_url: item.image_url || ''
      });
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      if (activeTab === 'Products') {
        await deleteProduct(id);
      } else {
        await deleteJobWorkItem(id);
      }
      loadData();
    } catch (err: any) {
      alert('Error deleting: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '', category: '', unit: 'Gram', default_weight: '',
      wastage_percent: '', labour_cost: '', default_rate: '',
      current_stock: '', gst_rate: gstSettings?.defaultGstRateSale || '3', size: '', image_url: ''
    });
  };

  const filteredItems = useMemo(() => {
    if (activeTab === 'Products') {
      return products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else {
      return services.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  }, [products, services, activeTab, searchQuery]);

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Business Catalog</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage products and service rates
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> Add New {activeTab === 'Products' ? 'Product' : 'Service'}
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('Products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'Products' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}
          >
            <Package size={14} /> Products
          </button>
          <button
            onClick={() => setActiveTab('Services')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'Services' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}
          >
            <Hammer size={14} /> Services
          </button>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 text-sm bg-gray-50/50"
            />
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
            >
              <Grid3x3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500 flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          Loading Catalog...
        </div>
      ) : (
        <>
          {/* PRODUCTS GRID/LIST */}
          {activeTab === 'Products' && (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item: any) => (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all group relative hover:border-indigo-100">
                    <div className="h-44 bg-gray-50/50 flex items-center justify-center relative border-b border-gray-50">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <Gem className="w-12 h-12 text-gray-200" />
                      )}

                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(item)} className="p-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white border border-gray-100 shadow-sm transition-all">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(item.id, item.name)} className="p-2 bg-white text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white border border-gray-100 shadow-sm transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div className='overflow-hidden'>
                          <h3 className="font-bold text-gray-900 truncate pr-2 text-sm">{item.name}</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{item.category}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap uppercase tracking-wider ${item.current_stock <= 0 ? 'bg-rose-50 text-rose-700' : item.current_stock <= (invSettings?.lowStockThreshold || 10) ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {item.current_stock <= 0 ? 'Out of Stock' : item.current_stock <= (invSettings?.lowStockThreshold || 10) ? 'Low Stock' : `${item.current_stock} pcs`}
                        </span>
                      </div>
                      <div className="space-y-1.5 mt-4 text-[11px] text-gray-600">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-bold uppercase tracking-tighter">Weight</span>
                          <span className="font-bold text-gray-900">{item.default_weight}g</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-bold uppercase tracking-tighter">Wastage</span>
                          <span className="font-bold text-gray-900">{item.wastage_percent}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-bold uppercase tracking-tighter">Making Cost</span>
                          <span className="font-bold text-gray-900">₹{item.labour_cost}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-50 mt-3">
                          <span className="text-gray-400 font-bold uppercase tracking-tight">Est. Price</span>
                          <span className="font-bold text-indigo-600 text-base">
                            ₹{formatIndianRupees(((item.default_weight * silverRate) + item.labour_cost) * (1 + (item.gst_rate / 100)))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4 text-right">Stock</th>
                      <th className="px-6 py-4 text-right">Weight</th>
                      <th className="px-6 py-4 text-right">Wastage</th>
                      <th className="px-6 py-4 text-right">Making</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <img src={item.image_url} alt="" className="w-9 h-9 rounded-lg object-contain p-1 border border-gray-100 bg-white" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300">
                                <Gem size={14} />
                              </div>
                            )}
                            <span className="font-bold text-gray-900">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-xs font-bold ${item.current_stock <= 0 ? 'text-rose-500' : item.current_stock <= (invSettings?.lowStockThreshold || 10) ? 'text-amber-500' : 'text-emerald-600'}`}>
                            {item.current_stock <= 0 ? 'Out of Stock' : `${item.current_stock} pcs`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-700">{item.default_weight}g</td>
                        <td className="px-6 py-4 text-right font-bold text-gray-700">{item.wastage_percent}%</td>
                        <td className="px-6 py-4 text-right font-bold text-gray-700">₹{item.labour_cost}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(item.id, item.name)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* SERVICES LIST */}
          {activeTab === 'Services' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item: any) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all flex items-center gap-5 group hover:border-indigo-100">
                  <div className="w-20 h-20 bg-gray-50/50 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center border border-gray-50 p-2">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                    ) : (
                      <Hammer className="w-8 h-8 text-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate mb-3">{item.name}</h3>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Service Rate</p>
                        <div className="text-base font-bold text-indigo-600">₹{item.default_rate}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase italic mt-0.5">per {item.unit}</div>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(item.id, item.name)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit' : 'Add New'} {activeTab === 'Products' ? 'Product' : 'Service'}</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Catalog management</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-6">

              <div className="flex flex-col sm:flex-row gap-6">
                {/* Left Column: Image */}
                <div className="w-full sm:w-1/3">
                  <ImageUpload
                    currentImageUrl={form.image_url}
                    onImageUploaded={(url) => setForm({ ...form, image_url: url })}
                    bucketName="product-images"
                  />
                </div>

                {/* Right Column: Basic Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder={activeTab === 'Products' ? "e.g. Silver Ring" : "e.g. Polishing"}
                    />
                  </div>

                  {activeTab === 'Products' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                          <input required type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Ring" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Size (Optional)</label>
                          <input type="text" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder='e.g. 10"' />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                        <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                          <option value="Gram">Per Gram</option>
                          <option value="Piece">Per Piece</option>
                          <option value="Fixed">Fixed Cost</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                        <input required type="number" value={form.default_rate} onChange={e => setForm({ ...form, default_rate: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {activeTab === 'Products' && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Weight (g)</label>
                      <input required type="number" step="any" value={form.default_weight} onChange={e => setForm({ ...form, default_weight: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Wastage %</label>
                      <input required type="number" step="any" value={form.wastage_percent} onChange={e => setForm({ ...form, wastage_percent: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Making Charge (₹)</label>
                      <input required type="number" value={form.labour_cost} onChange={e => setForm({ ...form, labour_cost: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
                      <input type="number" step="any" value={form.gst_rate} onChange={e => setForm({ ...form, gst_rate: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Opening Stock Qty</label>
                      <input type="number" value={form.current_stock} onChange={e => setForm({ ...form, current_stock: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>

                  {/* Price Estimator (Live) */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold">
                      <Calculator size={18} /> Price Estimator (Live)
                    </div>
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <div className="text-xs text-gray-500">Silver Value ({silverRate}/g)</div>
                        <div className="text-lg font-bold text-gray-900">₹{formatIndianRupees((Number(form.default_weight) || 0) * silverRate)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Labour</div>
                        <div className="text-lg font-bold text-gray-900">₹{formatIndianRupees(Number(form.labour_cost || 0))}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">GST ({form.gst_rate}%)</div>
                        <div className="text-lg font-bold text-gray-900">
                          ₹{formatIndianRupees(((Number(form.default_weight) || 0) * silverRate + (Number(form.labour_cost) || 0)) * (Number(form.gst_rate) || 3) / 100)}
                        </div>
                      </div>
                      <div className="pl-6 border-l-2 border-gray-300">
                        <div className="text-xs text-gray-500">Approx Selling Price</div>
                        <div className="text-2xl font-extrabold text-indigo-600">
                          ₹{formatIndianRupees(((Number(form.default_weight) || 0) * silverRate + (Number(form.labour_cost) || 0)) * (1 + (Number(form.gst_rate) || 3) / 100))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold text-xs uppercase tracking-widest rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm shadow-indigo-100">
                  {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Check size={16} />}
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
