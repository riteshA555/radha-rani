import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import { createOrder } from '../../services/orderService'
import { getAssetLedgers } from '../../services/accountingService'
import { getJobWorkItems } from '../../services/jobWorkService'
import { getProducts } from '../../services/productService'
import { getKarigars, Karigar } from '../../services/karigarService'
import { getLatestRates, MetalRate } from '../../services/rateService'
import { MaterialType, JobWorkItem, Product } from '../../types'
import { supabase } from '../../supabaseClient'
import {
    Trash2, Plus, ShoppingCart, User, Package, Hammer,
    CheckCircle2, AlertTriangle, Loader2, ArrowRight, X, ChevronLeft,
    Printer, Share2, ExternalLink, MessageCircle, Wallet
} from 'lucide-react'
import { formatIndianRupees } from '../../shared/utils/formatters'
import { useSettings } from '../../context/SettingsContext'
import { PageHeader } from '../components/ui/PageHeader'

type FormValues = {
    customer_name: string
    order_date: string
    material_type: MaterialType
    items: {
        description: string
        quantity: number
        unit: string
        rate: number
        product_id?: string
        service_id?: string
        item_type?: 'PRODUCT' | 'SERVICE'
        weight?: number
        wastage_percent?: number
        labour_cost?: number
        has_karigar?: boolean
        karigar_id?: string
        karigar_rate?: number
        karigar_quantity?: number
        // Dual Quantity
        base_quantity?: number
        base_rate?: number
        addon_service_id?: string
        addon_quantity?: number
        addon_rate?: number
    }[]
    gst_enabled: boolean
    custom_gst_rate?: number
    delivery_date?: string
    notes?: string
    discount_amount?: number
    advance_amount?: number
    payment_mode?: 'CASH' | 'ONLINE' | 'BANK'
    include_ledger_balance: boolean
}

export function CreateOrder() {
    const navigate = useNavigate()
    const location = useLocation()
    const [submissionError, setSubmissionError] = useState('')
    const [jobWorkItems, setJobWorkItems] = useState<JobWorkItem[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [karigars, setKarigars] = useState<Karigar[]>([])
    const [savedCustomers, setSavedCustomers] = useState<any[]>([])

    const { settings } = useSettings()
    const businessProfile = settings.business_profile
    const gstSettings = settings.gst_settings

    // Success Modal State
    const [successData, setSuccessData] = useState<{
        open: boolean,
        orderId: string,
        customer: string,
        total: number,
        items: any[],
        date: string
    } | null>(null)

    // Workbench State
    const [draftItem, setDraftItem] = useState<{
        description: string
        quantity: number
        unit: string
        rate: number
        product_id?: string
        service_id?: string
        item_type: 'PRODUCT' | 'SERVICE'
        weight?: number
        wastage_percent?: number
        labour_cost?: number
        has_karigar?: boolean
        karigar_id?: string
        karigar_rate?: number
        karigar_quantity?: number
        // Dual Quantity
        base_quantity: number
        base_rate: number
        has_addon: boolean
        addon_service_id?: string
        addon_quantity: number
        addon_rate: number
    }>({
        description: '', quantity: 0, unit: 'KG', rate: 0, item_type: 'PRODUCT',
        base_quantity: 0, base_rate: 0, has_addon: false, addon_quantity: 0, addon_rate: 0
    })

    const [draftError, setDraftError] = useState('')

    // Multi-Karigar State
    const [karigarSplits, setKarigarSplits] = useState<{ karigar_id: string, name: string, quantity: number }[]>([])
    const [splitKarigarId, setSplitKarigarId] = useState('')
    const [splitQty, setSplitQty] = useState<number | ''>('')

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
        defaultValues: {
            order_date: new Date().toISOString().split('T')[0],
            material_type: 'CLIENT',
            gst_enabled: false,
            include_ledger_balance: true,
            items: []
        }
    })

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: 'items'
    })

    const [silverRate, setSilverRate] = useState<MetalRate | null>(null)

    // Initial Load
    useEffect(() => {
        let mounted = true
        const loadData = async () => {
            try {
                // Ensure helper services return [] on error if needed, or handle catch block
                const [jwData, prodData, karigarData, currentRate, customerList] = await Promise.all([
                    getJobWorkItems(),
                    getProducts(),
                    getKarigars(),
                    getLatestRates(),
                    getAssetLedgers()
                ])
                if (mounted) {
                    setJobWorkItems(jwData || [])
                    setProducts(prodData || [])
                    setKarigars(karigarData || [])
                    const silverRate = currentRate.find(r => r.metal_type === 'SILVER') || null
                    setSilverRate(silverRate)
                    setSavedCustomers(customerList || [])
                }
            } catch (err: any) {
                console.error('Error fetching catalog data:', err)
            }
        }
        loadData()
        return () => { mounted = false }
    }, [])

    // REAL-TIME STOCK UPDATES (Zero Latency)
    useEffect(() => {
        const channel = supabase
            .channel('product_stock_changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'products' },
                (payload: any) => {
                    const updatedProduct = payload.new as Product
                    setProducts(prevProducts =>
                        prevProducts.map(p => p.id === updatedProduct.id ? { ...p, current_stock: updatedProduct.current_stock } : p)
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const materialType = watch('material_type')
    const items = watch('items')
    const gstEnabled = watch('gst_enabled')
    const customerName = watch('customer_name')

    // Totals
    // Totals - Sum of (base_q * base_r) + (addon_q * addon_r)
    const subtotal = items.reduce((sum, item) => {
        const base = (Number(item.base_quantity || 0) * Number(item.base_rate || 0)) || (Number(item.quantity || 0) * Number(item.rate || 0))
        const addon = (Number(item.addon_quantity || 0) * Number(item.addon_rate || 0))
        return sum + base + addon
    }, 0)

    // GST Logic - Allow override
    const defaultGstRate = materialType === 'CLIENT'
        ? (gstSettings?.defaultGstRateJobWork ?? 5)
        : (gstSettings?.defaultGstRateSale ?? 3)

    const currentGstRate = (watch('custom_gst_rate') !== undefined && !isNaN(watch('custom_gst_rate')!))
        ? watch('custom_gst_rate')!
        : defaultGstRate

    const discountAmount = watch('discount_amount') || 0
    // Subtotal after Discount
    const taxableAmount = Math.max(0, subtotal - discountAmount)

    const gstAmount = gstEnabled ? (taxableAmount * currentGstRate) / 100 : 0
    // Round off grand total for "Real Life" usage
    const rawTotal = taxableAmount + gstAmount
    const grandTotal = isNaN(rawTotal) ? 0 : Math.round(rawTotal)
    const roundOffDiff = grandTotal - rawTotal


    useEffect(() => {
        if (materialType === 'CLIENT') setValue('gst_enabled', false)
        else if (materialType === 'OWN') setValue('gst_enabled', true)

        setDraftItem({
            description: '', quantity: 0, unit: 'KG', rate: 0, item_type: 'PRODUCT' as const,
            base_quantity: 0, base_rate: 0, has_addon: false, addon_quantity: 0, addon_rate: 0
        })
        setDraftError('')
        setKarigarSplits([])
    }, [materialType, setValue])

    // Handle Prefilled State from Ledger
    useEffect(() => {
        const prefilled = (location.state as any)?.prefilled;
        if (prefilled) {
            if (prefilled.customer_name) setValue('customer_name', prefilled.customer_name);
            if (prefilled.order_date) setValue('order_date', prefilled.order_date);
            if (prefilled.material_type) setValue('material_type', prefilled.material_type);
            if (prefilled.items && prefilled.items.length > 0) {
                replace(prefilled.items);
            }
            // Clear location state to prevent re-fill on refresh if needed
            // window.history.replaceState({}, document.title);
        }
    }, [location.state, setValue, replace]);

    // --- HANDLERS ---
    const handleDraftItemChange = (field: string, value: any) => {
        setDraftItem(prev => ({ ...prev, [field]: value }))
        setDraftError('')

        // Mode Switch Reset
        if (field === 'item_type') {
            setDraftItem(prev => ({
                ...prev,
                [field]: value,
                // Reset item specific fields
                product_id: undefined,
                service_id: undefined,
                description: '',
                unit: value === 'SERVICE' ? 'Piece' : 'Piece', // Default unit
                rate: 0
            }))
            return
        }

        // Auto-fill logic
        if (field === 'description' && materialType === 'CLIENT') {
            const jw = jobWorkItems.find(j => j.name === value)
            if (jw) {
                setDraftItem(prev => ({
                    ...prev,
                    description: jw.name,
                    unit: jw.unit,
                    rate: jw.default_rate,
                    product_id: undefined,
                    item_type: 'SERVICE'
                }))
            }
        }

        // SERVICE SELECTION (In OWN Mode)
        if (field === 'service_id' && materialType === 'OWN') {
            const jw = jobWorkItems.find(j => j.id === value)
            if (jw) {
                setDraftItem(prev => ({
                    ...prev,
                    service_id: jw.id,
                    description: jw.name,
                    unit: jw.unit,
                    rate: jw.default_rate,
                    product_id: undefined,
                    item_type: 'SERVICE'
                }))
            }
        }

        if (field === 'product_id' && materialType === 'OWN') {
            const prod = products.find(p => p.id === value)
            if (prod) {
                // AUTO-ESTIMATE PRICE based on Live Silver Rate
                const currentSilverRate = silverRate ? (silverRate.selling_rate) : 0
                const weight = prod.default_weight || 0
                const wastage = prod.wastage_percent || 0
                const making = prod.labour_cost || 0

                // Formula: ((Weight + Wastage Weight) * Silver Rate) + Making Charges
                // This is the standard "Real Life" calculation used in shops.
                const totalWeightWithWastage = weight + (weight * wastage / 100)
                const silverValue = totalWeightWithWastage * currentSilverRate
                const estimatedPrice = Math.round(silverValue + making)

                setDraftItem(prev => ({
                    ...prev,
                    product_id: prod.id,
                    service_id: undefined,
                    description: prod.name,
                    unit: 'Piece',
                    rate: estimatedPrice, // Set autofetched price as default rate
                    weight: prod.default_weight,
                    wastage_percent: prod.wastage_percent,
                    labour_cost: prod.labour_cost,
                    item_type: 'PRODUCT'
                }))
            }
        }
        if (field === 'has_karigar' && !value) {
            setDraftItem(prev => ({ ...prev, has_karigar: false, karigar_id: undefined, karigar_rate: 0, karigar_quantity: 0 }))
            setKarigarSplits([])
        }
        if (field === 'karigar_id') {
            const k = karigars.find(kg => kg.id === value)
            if (k) setDraftItem(prev => ({ ...prev, karigar_id: value, karigar_rate: k.default_rate, karigar_quantity: prev.quantity }))
        }

        // DUAL QUANTITY: Sync base fields
        if (field === 'quantity') {
            setDraftItem(prev => ({ ...prev, base_quantity: value }))
        }
        if (field === 'rate') {
            setDraftItem(prev => ({ ...prev, base_rate: value }))
        }

        // ADDON SERVICE SELECTION
        if (field === 'addon_service_id') {
            const jw = jobWorkItems.find(j => j.id === value)
            if (jw) {
                setDraftItem(prev => ({
                    ...prev,
                    addon_service_id: jw.id,
                    addon_rate: jw.default_rate,
                    addon_quantity: prev.quantity // Default addon qty to base qty if it's PCS? user said (PCS)
                }))
            }
        }
    }

    // LIVE VALIDATION HELPER
    const getStockStatus = () => {
        // Skip stock check for Services
        if (materialType !== 'OWN' || !draftItem.product_id || draftItem.item_type === 'SERVICE') return null
        const prod = products.find(p => p.id === draftItem.product_id)
        if (!prod) return null

        const requested = Number(draftItem.quantity || 0)
        const available = Number(prod.current_stock)

        if (requested > available) {
            return { type: 'error', msg: `Insufficient Stock! (Max: ${available})` }
        }
        if (available <= 5) {
            return { type: 'warning', msg: `Low Stock! Only ${available} left.` }
        }
        return { type: 'success', msg: `Stock Available: ${available}` }
    }

    const stockStatus = getStockStatus()

    const addToBill = () => {
        setDraftError('')

        if (materialType === 'CLIENT' && !draftItem.description) return setDraftError('Please select a Job Work Item.')
        // In OWN mode: Check Product OR Service selection logic
        if (materialType === 'OWN') {
            if (draftItem.item_type === 'PRODUCT' && !draftItem.product_id) return setDraftError('Please select a Product.')
            if (draftItem.item_type === 'SERVICE' && !draftItem.service_id) return setDraftError('Please select a Service.')
        }

        if (Number(draftItem.quantity) <= 0) return setDraftError('Quantity must be greater than zero.')

        // Stock Check (OWN only + PRODUCT only)
        if (materialType === 'OWN' && draftItem.item_type === 'PRODUCT' && draftItem.product_id) {
            const prod = products.find(p => p.id === draftItem.product_id)
            if (prod && Number(draftItem.quantity) > prod.current_stock) {
                return setDraftError(`Insufficient Stock! Available: ${prod.current_stock}`)
            }
        }

        // Handle Karigar Assignments
        if (draftItem.has_karigar) {
            if (karigarSplits.length > 0) {
                // MULTI-SPLIT MODE
                const totalSplit = karigarSplits.reduce((acc, curr) => acc + curr.quantity, 0)
                if (Math.abs(totalSplit - Number(draftItem.quantity)) > 0.01) {
                    return setDraftError(`Split quantity (\${totalSplit}) does not match Total Quantity (\${draftItem.quantity})`)
                }

                // Add each split as a separate line item
                karigarSplits.forEach(split => {
                    const k = karigars.find(kg => kg.id === split.karigar_id)
                    append({
                        ...draftItem,
                        quantity: split.quantity,
                        karigar_id: split.karigar_id,
                        karigar_rate: k?.default_rate || 0,
                        karigar_quantity: split.quantity
                    })
                })
            } else {
                // SINGLE MODE
                if (!draftItem.karigar_id) return setDraftError('Please select a Karigar.')
                append({
                    ...draftItem,
                    // Ensure base fields are definitely populated
                    base_quantity: draftItem.base_quantity || draftItem.quantity,
                    base_rate: draftItem.base_rate || draftItem.rate,
                    addon_quantity: draftItem.has_addon ? draftItem.addon_quantity : undefined,
                    addon_rate: draftItem.has_addon ? draftItem.addon_rate : undefined,
                    addon_service_id: draftItem.has_addon ? draftItem.addon_service_id : undefined
                })
            }
        } else {
            // NO KARIGAR
            append({
                ...draftItem,
                base_quantity: draftItem.base_quantity || draftItem.quantity,
                base_rate: draftItem.base_rate || draftItem.rate,
                addon_quantity: draftItem.has_addon ? draftItem.addon_quantity : undefined,
                addon_rate: draftItem.has_addon ? draftItem.addon_rate : undefined,
                addon_service_id: draftItem.has_addon ? draftItem.addon_service_id : undefined
            })
        }

        const resetBase = materialType === 'CLIENT'
            ? {
                description: '', quantity: 0, unit: 'KG', rate: 0, item_type: 'SERVICE' as const,
                base_quantity: 0, base_rate: 0, has_addon: false, addon_quantity: 0, addon_rate: 0
            }
            : {
                description: '', quantity: 0, unit: 'Piece', rate: 0, product_id: undefined, service_id: undefined, item_type: 'PRODUCT' as const,
                base_quantity: 0, base_rate: 0, has_addon: false, addon_quantity: 0, addon_rate: 0
            }
        setDraftItem(resetBase)
        setKarigarSplits([])

        // UX: Refocus on Item Select for Rapid Entry
        // Since we don't have a direct Ref here easily due to dynamic render, we rely on user flow or add an ID.
        setTimeout(() => {
            const el = document.getElementById('item-select-input')
            if (el) el.focus()
        }, 100)
    }

    const onSubmit = async (data: FormValues) => {
        try {
            setSubmissionError('')
            if (data.items.length === 0) throw new Error("The bill is empty! Add items first.")
            if (!data.customer_name) throw new Error("Customer Name is required.")

            if (data.material_type === 'OWN') {
                for (const item of data.items) {
                    if (item.product_id) {
                        const p = products.find(prod => prod.id === item.product_id)
                        if (p && Number(item.quantity) > p.current_stock) {
                            throw new Error(`Stock changed! Insufficient stock for \${p.name}`)
                        }
                    }
                }
            }

            const cleanedItems = data.items.map(item => ({
                ...item,
                karigar_id: item.has_karigar ? item.karigar_id : undefined,
                karigar_rate: item.has_karigar ? item.karigar_rate : undefined,
                karigar_quantity: item.has_karigar ? item.karigar_quantity : undefined
            }))

            const gstRateValue = (data.custom_gst_rate !== undefined && !isNaN(data.custom_gst_rate))
                ? data.custom_gst_rate
                : (data.material_type === 'CLIENT'
                    ? (gstSettings?.defaultGstRateJobWork ?? 5)
                    : (gstSettings?.defaultGstRateSale ?? 3))

            // Capitalize Customer Name
            const finalCustomerName = data.customer_name.trim().replace(/\b\w/g, c => c.toUpperCase());

            const result = await createOrder({
                customer_name: finalCustomerName,
                order_date: data.order_date,
                material_type: data.material_type,
                status: 'Pending',
                discount_amount: data.discount_amount,
                delivery_date: data.delivery_date,
                notes: data.notes
            }, cleanedItems, data.gst_enabled, gstRateValue, data.advance_amount || 0, data.payment_mode || 'CASH', data.include_ledger_balance)

            // SHOW SUCCESS MODAL INSTEAD OF NAVIGATING
            setSuccessData({
                open: true,
                orderId: result.order_id,
                customer: data.customer_name,
                total: result.total || 0,
                // Pass items to success state for sharing
                items: data.items,
                date: data.order_date
            })

            // Clear Form
            replace([])
            reset()

        } catch (err: any) {
            console.error(err)
            let msg = err.message
            if (msg.includes('products_current_stock_check') || msg.includes('check constraint')) {
                msg = "Insufficient Stock! Current stock level prevents this order."
            }
            setSubmissionError(msg)
        }
    }


    return (
        <div className="max-w-[1400px] mx-auto p-4 min-h-[calc(100vh-100px)] relative">
            <button onClick={() => navigate('/orders')} className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-900">
                <ChevronLeft size={20} /> Back to Orders
            </button>

            {/* SUCCESS MODAL OVERLAY */}
            {successData && successData.open && (
                <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-[500px] shadow-2xl text-center animate-scale-in overflow-hidden border border-gray-100">
                        {/* Upper Section with Gradient */}
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-100 p-10 pb-8">
                            <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100">
                                <CheckCircle2 size={56} className="text-emerald-500" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Order Placed!</h2>
                            <p className="text-gray-600 text-lg font-medium">Invoice generated for <strong>{successData.customer}</strong></p>
                        </div>

                        {/* Order Summary Card */}
                        <div className="p-8">
                            <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100 shadow-inner">
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200/50">
                                    <span className="text-gray-500 font-semibold text-sm uppercase tracking-wider">Order ID</span>
                                    <span className="text-indigo-600 font-bold font-mono">#{successData.orderId.slice(0, 8).toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-left">
                                        <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Total Bill</div>
                                        <div className="text-4xl font-black text-gray-900 leading-none">₹{formatIndianRupees(successData.total)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Items</div>
                                        <div className="text-xl font-bold text-gray-700">{successData.items.length} Nos</div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <button
                                    onClick={() => {
                                        const message = `*Order Confirmation* 📝\n\nHello *${successData.customer}*,\nYour order worth *₹${formatIndianRupees(successData.total)}* has been placed successfully!\n\n📅 Date: ${new Date(successData.date).toLocaleDateString()}\n🆔 Order ID: #${successData.orderId.slice(0, 8).toUpperCase()}\n\nThank you for choosing us! 🙏`
                                        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
                                    }}
                                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-200"
                                >
                                    <MessageCircle size={20} /> Share
                                </button>
                                <button
                                    onClick={() => navigate(`/orders/${successData.orderId}`)}
                                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-200"
                                >
                                    <Printer size={20} /> Print Invoice
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    setSuccessData(null) // Close
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 p-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={20} /> Start New Order
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* TOP HEADER BAR */}
            <PageHeader
                title={
                    <div className="flex items-center gap-3">
                        Create New Order
                        {silverRate && (
                            <span className="text-sm font-semibold bg-amber-100 text-amber-800 px-2 py-1 rounded-md border border-amber-200">
                                Live Rate: ₹{((silverRate.selling_rate || 0) * 1000).toLocaleString()}/kg
                            </span>
                        )}
                    </div>
                }
                subtitle="Full Screen Workbench Mode"
                showBack={false}
                actions={
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                        <button
                            type="button"
                            onClick={() => { setValue('material_type', 'CLIENT'); remove() }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${materialType === 'CLIENT'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'bg-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Hammer size={16} /> <span className="hidden sm:inline">Job Work</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setValue('material_type', 'OWN'); remove() }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${materialType === 'OWN'
                                ? 'bg-white text-green-600 shadow-sm'
                                : 'bg-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Package size={16} /> <span className="hidden sm:inline">Sale</span>
                        </button>
                    </div>
                }
            />

            {/* MAIN SPLIT LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* LEFT: WORKBENCH */}
                <div className="flex flex-col gap-6">

                    {/* Customer Card */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="m-0 mb-4 text-base font-bold text-gray-700 flex items-center gap-2">
                            <User size={18} /> Customer Details
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Name</label>
                                <input
                                    {...register('customer_name', { required: true })}
                                    list="customer_options"
                                    className={`w-full p-2.5 rounded-lg border ${errors.customer_name ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'} transition-all text-gray-900 font-medium`}
                                    placeholder="Search or Type Customer Name"
                                    autoFocus
                                />
                                <datalist id="customer_options">
                                    {savedCustomers.map(c => <option key={c.id} value={c.name} />)}
                                </datalist>

                                {/* LIVE BALANCE DISPLAY */}
                                {customerName && savedCustomers.find(c => c.name.toLowerCase() === customerName.toLowerCase()) && (
                                    <div className="mt-2 flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <Wallet size={14} className="text-gray-400" />
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Current Balance:</span>
                                        </div>
                                        <span className={`text-sm font-black ${savedCustomers.find(c => c.name.toLowerCase() === customerName.toLowerCase())?.running_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {savedCustomers.find(c => c.name.toLowerCase() === customerName.toLowerCase())?.running_balance > 0 ? 'Receivable' : 'Advance'}: ₹{formatIndianRupees(Math.abs(savedCustomers.find(c => c.name.toLowerCase() === customerName.toLowerCase())?.running_balance || 0))}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Order Date</label>
                                <input
                                    type="date"
                                    {...register('order_date', { required: true })}
                                    className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Delivery Date</label>
                                <input
                                    type="date"
                                    {...register('delivery_date')}
                                    className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium"
                                />
                            </div>
                        </div>
                        <div className="mt-3">
                            <input
                                {...register('notes')}
                                className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                                placeholder="Add notes (e.g. 'Urgent', 'Engraving details')..."
                            />
                        </div>
                    </div>

                    {/* Add Item Card */}
                    <div className={`bg-white p-6 rounded-2xl border-2 shadow-sm flex-1 ${materialType === 'OWN' ? 'border-green-500' : 'border-gray-200'}`}>
                        <div className="mb-6 pb-4 border-b border-gray-100">
                            <h3 className={`m-0 text-lg font-bold ${materialType === 'OWN' ? 'text-green-600' : 'text-gray-800'}`}>
                                {materialType === 'OWN' ? 'OWN MATERIAL SALE' : 'CLIENT MATERIAL JOB WORK'}
                            </h3>
                            <p className="mt-1 text-gray-500 text-sm">
                                {materialType === 'OWN'
                                    ? 'Select Stocked Products to Sell. Auto-deducts stock.'
                                    : 'Select Job Work Service. No stock impact.'}
                            </p>
                        </div>

                        {draftError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-2 border border-red-100">
                                <AlertTriangle size={16} /> {draftError}
                            </div>
                        )}

                        <div className="flex flex-col gap-5">
                            {/* SELECTOR */}
                            <div>
                                <label className="block font-semibold text-sm mb-2 text-gray-600">
                                    {materialType === 'CLIENT' ? 'Select Job Work Service' : 'Select Item (Product or Service)'}
                                </label>

                                <div className="flex gap-2">
                                    {/* ITEM TYPE DROPDOWN (Only for OWN Material) */}
                                    {materialType === 'OWN' && (
                                        <select
                                            value={draftItem.item_type}
                                            onChange={(e) => handleDraftItemChange('item_type', e.target.value)}
                                            className="w-1/3 p-3.5 rounded-lg border-2 border-gray-200 text-base bg-gray-50 font-semibold text-gray-700 focus:border-indigo-500 transition-colors"
                                        >
                                            <option value="PRODUCT">Product</option>
                                            <option value="SERVICE">Service</option>
                                        </select>
                                    )}

                                    {/* ITEM DROPDOWN */}
                                    <select
                                        id="item-select-input"
                                        value={
                                            materialType === 'CLIENT' ? draftItem.description :
                                                (draftItem.item_type === 'PRODUCT' ? (draftItem.product_id || '') : (draftItem.service_id || ''))
                                        }
                                        onChange={(e) => handleDraftItemChange(
                                            materialType === 'CLIENT' ? 'description' :
                                                (draftItem.item_type === 'PRODUCT' ? 'product_id' : 'service_id'),
                                            e.target.value
                                        )}
                                        className="flex-1 p-3.5 rounded-lg border-2 border-gray-200 text-base bg-white focus:border-indigo-500 focus:ring-0 transition-colors text-gray-900 font-bold"
                                    >
                                        <option value="">-- Select Item --</option>
                                        {/* CLIENT MODE (Always Service) */}
                                        {materialType === 'CLIENT' && jobWorkItems.map(j => (
                                            <option key={j.id} value={j.name} className="text-gray-900">{j.name} (Service) - ₹{j.default_rate}</option>
                                        ))}

                                        {/* OWN MODE - PRODUCT */}
                                        {materialType === 'OWN' && draftItem.item_type === 'PRODUCT' && products.map(p => (
                                            <option key={p.id} value={p.id} disabled={p.current_stock <= 0} className="text-gray-900">{p.name} - Stock: {p.current_stock}{p.current_stock <= 0 ? ' (OUT)' : ''}</option>
                                        ))}

                                        {/* OWN MODE - SERVICE */}
                                        {materialType === 'OWN' && draftItem.item_type === 'SERVICE' && jobWorkItems.map(j => (
                                            <option key={j.id} value={j.id} className="text-gray-900">{j.name} (Service) - ₹{j.default_rate}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Qty & Rate Grid (BASE) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-sm mb-2 text-gray-600">Base Quantity ({draftItem.unit})</label>
                                    <input
                                        type="number" step="any"
                                        value={draftItem.quantity || ''}
                                        onChange={(e) => handleDraftItemChange('quantity', Number(e.target.value))}
                                        className="w-full p-3.5 rounded-lg border-2 border-gray-200 text-xl font-bold focus:border-indigo-500 focus:ring-0 transition-colors text-gray-900"
                                        placeholder="0"
                                    />
                                    {/* LIVE STOCK INDICATOR */}
                                    {materialType === 'OWN' && stockStatus && (
                                        <div className={`mt-2 text-sm font-semibold flex items-center gap-1 ${stockStatus.type === 'error' ? 'text-red-600' :
                                            stockStatus.type === 'warning' ? 'text-amber-600' : 'text-green-600'
                                            }`}>
                                            {stockStatus.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {stockStatus.msg}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block font-semibold text-sm mb-2 text-gray-600">Base Rate (₹)</label>
                                    <input
                                        type="number" step="any"
                                        value={draftItem.rate || ''}
                                        onChange={(e) => handleDraftItemChange('rate', Number(e.target.value))}
                                        className="w-full p-3.5 rounded-lg border-2 border-gray-200 text-xl font-bold focus:border-indigo-500 focus:ring-0 transition-colors text-gray-900"
                                    />
                                </div>
                            </div>

                            {/* ADDON SECTION */}
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                                <label className="flex items-center gap-3 cursor-pointer font-bold text-amber-900 select-none mb-2">
                                    <input
                                        type="checkbox"
                                        checked={draftItem.has_addon || false}
                                        onChange={(e) => handleDraftItemChange('has_addon', e.target.checked)}
                                        className="w-5 h-5 accent-amber-600 rounded"
                                    />
                                    Add Diamond Cutting / Chalai?
                                </label>

                                {draftItem.has_addon && (
                                    <div className="animate-fade-in mt-3 space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Select Addon Service</label>
                                            <select
                                                value={draftItem.addon_service_id || ''}
                                                onChange={(e) => handleDraftItemChange('addon_service_id', e.target.value)}
                                                className="w-full p-2.5 rounded-lg border border-amber-300 text-sm bg-white focus:ring-2 focus:ring-amber-500 text-amber-900 font-bold"
                                            >
                                                <option value="">-- Select Addon --</option>
                                                {jobWorkItems.map(j => (
                                                    <option key={j.id} value={j.id} className="text-gray-900">{j.name} (₹{j.default_rate}/pc)</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-amber-700 uppercase mb-1">PCS</label>
                                                <input
                                                    type="number"
                                                    value={draftItem.addon_quantity || ''}
                                                    onChange={(e) => handleDraftItemChange('addon_quantity', Number(e.target.value))}
                                                    className="w-full p-2.5 rounded-lg border border-amber-300 text-sm font-bold bg-white focus:ring-2 focus:ring-amber-500 text-amber-900"
                                                    placeholder="PCS"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Rate</label>
                                                <input
                                                    type="number"
                                                    value={draftItem.addon_rate || ''}
                                                    onChange={(e) => handleDraftItemChange('addon_rate', Number(e.target.value))}
                                                    className="w-full p-2.5 rounded-lg border border-amber-300 text-sm font-bold bg-white focus:ring-2 focus:ring-amber-500 text-amber-900"
                                                />
                                            </div>
                                        </div>
                                        <div className="text-right text-xs font-bold text-amber-800">
                                            Addon Total: ₹{((draftItem.addon_quantity || 0) * (draftItem.addon_rate || 0)).toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* KARIGAR SELECTION */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <label className="flex items-center gap-3 cursor-pointer font-semibold text-gray-700 select-none mb-2">
                                    <input
                                        type="checkbox"
                                        checked={draftItem.has_karigar || false}
                                        onChange={(e) => handleDraftItemChange('has_karigar', e.target.checked)}
                                        className="w-5 h-5 accent-indigo-600 rounded"
                                    />
                                    Assign to Karigar?
                                </label>

                                {draftItem.has_karigar && (
                                    <div className="animate-fade-in mt-3">
                                        {/* SPLIT LIST */}
                                        {karigarSplits.map((split, idx) => (
                                            <div key={idx} className="flex gap-2 mb-2 items-center">
                                                <div className="flex-1 font-medium bg-white p-2 rounded-md border border-gray-300 text-sm">
                                                    {split.name}
                                                </div>
                                                <div className="w-20 text-center font-bold text-sm bg-white p-2 rounded-md border border-gray-300">
                                                    {split.quantity} {draftItem.unit}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setKarigarSplits(prev => prev.filter((_, i) => i !== idx))}
                                                    className="bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 p-2 rounded-md transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}

                                        {/* ADDER */}
                                        {/* ADDER */}
                                        <div className="grid grid-cols-[2fr_1fr_auto] gap-2 items-center mt-2">
                                            <select
                                                value={splitKarigarId}
                                                onChange={(e) => setSplitKarigarId(e.target.value)}
                                                className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium"
                                            >
                                                <option value="">-- Karigar --</option>
                                                {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                            </select>

                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                value={splitQty}
                                                onChange={(e) => setSplitQty(Number(e.target.value) || '')}
                                                className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 font-bold"
                                            />

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const kId = splitKarigarId
                                                    const qty = Number(splitQty)

                                                    if (!kId || qty <= 0) return

                                                    const kName = karigars.find(k => k.id === kId)?.name || 'Unknown'
                                                    setKarigarSplits(prev => [...prev, { karigar_id: kId, name: kName, quantity: qty }])

                                                    // Reset
                                                    setSplitKarigarId('')
                                                    setSplitQty('')
                                                }}
                                                className="bg-blue-500 hover:bg-blue-600 text-white p-2.5 rounded-lg transition-colors"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>

                                        <div className="text-xs text-gray-500 mt-2 text-right font-medium">
                                            Assigned: {karigarSplits.reduce((a, c) => a + c.quantity, 0)} / {draftItem.quantity || 0}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ADD BUTTON */}
                            <button
                                type="button"
                                onClick={addToBill}
                                disabled={stockStatus?.type === 'error'}
                                className={`w-full p-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 mt-2 transition-all shadow-md active:scale-95 ${stockStatus?.type === 'error'
                                    ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    }`}
                            >
                                <Plus size={20} /> Add Item to Bill <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: BILL PREVIEW */}
                <div className="flex flex-col h-full min-h-[500px]">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl flex-1 flex flex-col overflow-hidden">

                        {/* Header */}
                        <div className="bg-gray-50 p-5 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-bold m-0 text-gray-900">Current Bill</h2>
                            <div className="text-sm font-semibold text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                                {fields.length} Items
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {fields.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 min-h-[300px]">
                                    <ShoppingCart size={48} className="mb-4 opacity-30" />
                                    <p className="font-medium">Bill is empty.</p>
                                </div>
                            ) : (
                                fields.map((item, index) => (
                                    <div key={item.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative group hover:border-indigo-200 transition-colors">
                                        <div className="font-bold text-gray-800 pr-8">
                                            {item.description}
                                            {item.item_type === 'SERVICE' && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Service</span>}
                                        </div>

                                        <div className="space-y-1 mt-2">
                                            {/* Base Row */}
                                            <div className="flex justify-between items-center text-sm text-gray-600">
                                                <span>Base: {item.base_quantity || item.quantity} {item.unit} x ₹{item.base_rate || item.rate}</span>
                                                <span className="font-medium text-gray-700">₹{formatIndianRupees((item.base_quantity || item.quantity) * (item.base_rate || item.rate))}</span>
                                            </div>

                                            {/* Addon Row */}
                                            {item.addon_service_id && (
                                                <div className="flex justify-between items-center text-xs text-amber-600 bg-amber-50/50 p-1 rounded">
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <CheckCircle2 size={10} />
                                                        Addon: {jobWorkItems.find(j => j.id === item.addon_service_id)?.name} - {item.addon_quantity} PCS x ₹{item.addon_rate}
                                                    </span>
                                                    <span className="font-bold">₹{formatIndianRupees((item.addon_quantity || 0) * (item.addon_rate || 0))}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total</span>
                                            <span className="font-black text-gray-900 text-lg">
                                                ₹{formatIndianRupees(
                                                    ((item.base_quantity || item.quantity) * (item.base_rate || item.rate)) +
                                                    ((item.addon_quantity || 0) * (item.addon_rate || 0))
                                                )}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => remove(index)}
                                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 bg-white hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Totals Footer */}
                        <div className="bg-white p-6 border-t border-gray-100 mt-auto">
                            <div className="flex flex-col gap-3 mb-6">
                                {/* Subtotal Row */}
                                <div className="flex justify-between items-center text-gray-800">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium hover:text-indigo-600 transition-colors">
                                        <input
                                            type="checkbox"
                                            {...register('gst_enabled')}
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                        />
                                        Apply GST?
                                    </label>
                                    <div className="text-right text-sm font-medium">Subtotal: ₹{formatIndianRupees(subtotal)}</div>
                                </div>

                                {/* Discount Field */}
                                <div className="flex justify-between items-center text-sm text-red-500">
                                    <span>Discount (-)</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-gray-400 text-xs">₹</span>
                                        <input
                                            type="number"
                                            {...register('discount_amount', { valueAsNumber: true })}
                                            className="w-24 bg-white border border-red-200 rounded px-2 py-1 text-right text-red-600 focus:border-red-500 focus:ring-1 focus:ring-red-200 text-sm placeholder-red-200"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                {/* GST Field */}
                                {gstEnabled && (
                                    <div className="flex justify-between items-center animate-fade-in pl-6">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>Rate:</span>
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="w-16 bg-white border border-gray-300 rounded px-1 text-center text-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-sm"
                                                placeholder={String(defaultGstRate)}
                                                {...register('custom_gst_rate', { valueAsNumber: true })}
                                            />
                                            <span>%</span>
                                        </div>
                                        <div className="text-sm text-amber-600 font-medium">+ GST: ₹{formatIndianRupees(gstAmount)}</div>
                                    </div>
                                )}

                                {/* Round Off */}
                                <div className="flex justify-between items-center text-xs text-gray-400 pl-6">
                                    <span>Round Off</span>
                                    <span>{roundOffDiff > 0 ? '+' : ''}{roundOffDiff.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Enhanced Professional Summary Card (Light Theme) */}
                            <div className="bg-white border-2 border-indigo-50 p-6 rounded-[2.5rem] shadow-2xl shadow-indigo-100/40 mt-6 overflow-hidden relative group transition-all hover:shadow-indigo-100/60">
                                <div className="relative z-10 flex flex-col gap-5">
                                    {/* Grand Total Row */}
                                    <div className="flex justify-between items-end border-b border-gray-100 pb-5">
                                        <div>
                                            <div className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1 px-1">Grand Total / कुल देय</div>
                                            <div className="text-4xl font-black tracking-tight text-gray-900">₹{formatIndianRupees(grandTotal)}</div>
                                        </div>
                                        <div className="flex flex-col items-end gap-3">
                                            <div className="flex items-center gap-3 bg-indigo-50/50 px-4 py-2 rounded-full border border-indigo-100/50">
                                                <input
                                                    type="checkbox"
                                                    {...register('include_ledger_balance')}
                                                    id="incl-bal"
                                                    className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                                                />
                                                <label htmlFor="incl-bal" className="text-[10px] font-black text-indigo-900 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors">
                                                    Include Balance?
                                                </label>
                                            </div>
                                            <select
                                                {...register('payment_mode')}
                                                className="bg-gray-900 border-none text-[10px] font-black rounded-full px-4 py-2 text-white focus:outline-none focus:ring-4 focus:ring-indigo-100 shadow-lg cursor-pointer transition-all hover:scale-105"
                                            >
                                                <option value="CASH">💵 CASH</option>
                                                <option value="ONLINE">📱 ONLINE</option>
                                                <option value="BANK">🏦 BANK</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Advance Payment Input Integrated */}
                                    <div className="flex items-center gap-6 py-1">
                                        <div className="flex-1">
                                            <div className="text-[11px] font-black text-indigo-400 uppercase tracking-wider mb-2 px-1 text-center sm:text-left">Advance Payment / एडवांस</div>
                                            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border-2 border-transparent focus-within:border-indigo-100 focus-within:bg-white transition-all shadow-inner">
                                                <div className="bg-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                                    <span className="text-white font-black text-xl">₹</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    {...register('advance_amount', { valueAsNumber: true })}
                                                    className="w-full bg-transparent border-none p-0 text-3xl font-black text-gray-900 focus:ring-0 placeholder-gray-200"
                                                    placeholder="0.00"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setValue('advance_amount', grandTotal)}
                                                    className="bg-white hover:bg-gray-900 text-indigo-600 hover:text-white text-[10px] font-black px-4 py-2.5 rounded-xl transition-all border border-indigo-100 hover:border-gray-900 uppercase tracking-widest shadow-sm hover:shadow-md"
                                                >
                                                    Full
                                                </button>
                                            </div>
                                        </div>

                                        {/* Status Indicators */}
                                        <div className="flex flex-col gap-3 min-w-[140px]">
                                            <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                                                <div className="text-[9px] text-gray-400 font-black uppercase mb-1">Due / बाकी</div>
                                                <div className={`text-lg font-black tracking-tight ${Math.max(0, grandTotal - (watch('advance_amount') || 0)) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    ₹{formatIndianRupees(Math.max(0, grandTotal - (watch('advance_amount') || 0)))}
                                                </div>
                                            </div>
                                            {customerName && savedCustomers.find(c => c.name.toLowerCase() === customerName.toLowerCase()) && (
                                                <div className="bg-indigo-600 p-3 rounded-2xl border border-indigo-700 shadow-lg shadow-indigo-100">
                                                    <div className="text-[9px] text-indigo-200 font-black uppercase mb-1">
                                                        {watch('include_ledger_balance') ? 'Final Balance (Inc. Old)' : 'Bill Balance (Only Today)'}
                                                    </div>
                                                    <div className="text-lg font-black text-white tracking-tight">
                                                        ₹{formatIndianRupees(
                                                            (watch('include_ledger_balance')
                                                                ? Number(savedCustomers.find(c => c.name.toLowerCase() === customerName.toLowerCase())?.running_balance || 0)
                                                                : 0) +
                                                            Number(grandTotal) -
                                                            Number(watch('advance_amount') || 0)
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Wallet className="absolute -right-12 -bottom-12 text-indigo-50/30 -rotate-12 group-hover:scale-110 transition-transform duration-700" size={240} />
                            </div>

                            {/* Error Message */}
                            {submissionError && (
                                <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                                    <AlertTriangle size={16} /> {submissionError}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="button"
                                onClick={handleSubmit(onSubmit)}
                                disabled={isSubmitting || fields.length === 0}
                                className={`w-full p-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl active:scale-95 ${(isSubmitting || fields.length === 0)
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                    : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white'
                                    }`}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
                                {isSubmitting ? 'Processing...' : 'Save & Print Order'}
                            </button>
                        </div>
                    </div>
                </div>

            </div>

        </div >
    )
}
